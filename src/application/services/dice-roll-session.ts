import { contextSchema, defaultDiceDraft, DICE_PROTOCOL_VERSION, draftSchema, expandDice, HISTORY_LIMIT, requestSchema, resolveDiceRoll, validateSimulation, type DiceContext, type DiceDraft, type DiceEnvelope, type DiceHistoryEntry, type DicePresentation, type DiceRollRequest, type DiceSessionState } from "../../domain/dice/dice";
import { naturalTwenty } from "../../domain/dice/critical";
import { defaultDiceSizes, diceSizeChangeSchema, type DiceSizes } from "../../domain/dice/size";

type Role = "dm" | "player";
interface PendingRoll { readonly id: string; readonly request: DiceRollRequest; readonly context: DiceContext; readonly createdAt: number }

export class DiceRollSession {
  private context: DiceContext | null = null;
  private draft = defaultDiceDraft();
  private history: DiceHistoryEntry[] = [];
  private pending: PendingRoll | null = null;
  private latestPublic: DiceHistoryEntry | null = null;
  private publicResultVisible = false;
  private busyUntil = 0;
  private sizes = defaultDiceSizes();
  private readonly requests = new Map<string, string>();
  private envelopes: Record<Role, DiceEnvelope> = { dm: { revision: 0, presentation: null }, player: { revision: 0, presentation: null } };

  constructor(private readonly emit: (role: Role, value: DiceEnvelope) => void, private readonly now: () => number = Date.now, private readonly id: () => string = () => crypto.randomUUID()) {}

  private publish(role: Role, presentation: DicePresentation | null): void {
    const envelope = { revision: this.envelopes[role].revision + 1, presentation };
    this.envelopes[role] = envelope;
    this.emit(role, envelope);
  }
  private append(entry: DiceHistoryEntry): void { this.history = [entry, ...this.history].slice(0, HISTORY_LIMIT); }
  setContext(value: unknown): void {
    const context = contextSchema.parse(value);
    if (this.context?.token !== context.token) {
      this.failPending("interrupted");
      this.context = context;
      this.latestPublic = null;
      this.publicResultVisible = false;
      this.busyUntil = 0;
      this.publish("dm", null);
      this.publish("player", null);
    } else this.context = context;
  }
  setDraft(value: unknown): DiceDraft { this.draft = draftSchema.parse(value); return this.draft; }
  getSizes(): DiceSizes { return this.sizes; }
  setSize(value: unknown): DiceSizes {
    this.sweep();
    const { view, scale } = diceSizeChangeSchema.parse(value);
    if (this.pending || this.now() < this.busyUntil) throw new Error("Espera a que termine la tirada para cambiar el tamano.");
    if (this.sizes[view] !== scale) this.sizes = { ...this.sizes, [view]: scale, revision: this.sizes.revision + 1 };
    return this.sizes;
  }
  begin(value: unknown): { rollId: string } {
    this.sweep();
    const request = requestSchema.parse(value);
    if (this.context === null || request.contextToken !== this.context.token) throw new Error("La escena cambio. Intenta de nuevo.");
    const known = this.requests.get(request.requestId);
    if (known) {
      if (this.pending?.id === known) return { rollId: known };
      throw new Error("Esta solicitud ya fue procesada.");
    }
    if (this.pending || this.now() < this.busyUntil) throw new Error("Espera a que termine la tirada.");
    const rollId = this.id();
    this.pending = { id: rollId, request, context: { ...this.context }, createdAt: this.now() };
    this.requests.set(request.requestId, rollId);
    if (this.requests.size > HISTORY_LIMIT * 2) this.requests.delete(this.requests.keys().next().value!);
    this.draft = request.draft;
    return { rollId };
  }
  complete(rollId: string, value: unknown): DiceSessionState {
    this.sweep();
    const pending = this.pending;
    if (!pending || pending.id !== rollId || pending.context.token !== this.context?.token) throw new Error("Tirada obsoleta o interrumpida.");
    const dice = expandDice(pending.request), simulation = validateSimulation(value, dice);
    const result = resolveDiceRoll(pending.request, simulation.values);
    const startedAt = this.now() + 180, settledAt = startedAt + simulation.replay.durationMs;
    const entry: DiceHistoryEntry = { ...pending, status: "complete", result, settledAt };
    this.pending = null;
    this.busyUntil = settledAt;
    this.append(entry);
    const presentation: DicePresentation = { rollId, contextToken: pending.context.token, sceneId: pending.context.sceneId, mapId: pending.context.mapId, dice, appearance: pending.request.draft.appearance, replay: simulation.replay, result, critical: naturalTwenty(dice, result), startedAt, settledAt };
    this.publish("dm", presentation);
    if (pending.request.draft.visibility === "open") {
      this.latestPublic = entry;
      this.publicResultVisible = pending.request.draft.showPlayerResult;
      this.publish("player", { ...presentation, result: this.publicResultVisible ? result : null });
    }
    return this.getDmState();
  }
  fail(rollId: string): void { if (this.pending?.id === rollId) this.failPending("failed"); }
  interrupt(): void { this.failPending("interrupted"); }
  private failPending(status: "failed" | "interrupted"): void {
    if (!this.pending) return;
    this.append({ ...this.pending, status, result: null, settledAt: this.now() });
    this.pending = null;
  }
  setResultVisibility(rollId: string, visible: boolean): void {
    this.sweep();
    const entry = this.latestPublic;
    if (!entry || entry.id !== rollId || entry.context.token !== this.context?.token || this.now() < entry.settledAt) throw new Error("Solo se puede mostrar el ultimo resultado abierto del mapa actual.");
    this.publicResultVisible = visible;
    const existing = this.envelopes.player.presentation;
    if (existing?.replay) {
      this.publish("player", { ...existing, result: visible ? entry.result : null });
    } else this.publish("player", visible ? { rollId, contextToken: entry.context.token, sceneId: entry.context.sceneId, mapId: entry.context.mapId, dice: [], appearance: entry.request.draft.appearance, replay: null, result: entry.result, startedAt: this.now(), settledAt: this.now() } : null);
  }
  dismiss(rollId: string): void {
    // Dismiss only this roll: an older public roll can coexist with a hidden DM roll.
    if (this.envelopes.dm.presentation?.rollId === rollId) this.publish("dm", null);
    if (this.envelopes.player.presentation?.rollId === rollId) {
      this.publicResultVisible = false;
      this.publish("player", null);
    }
  }
  clearHistory(): void { this.history = []; }
  sweep(): void {
    if (this.pending && this.now() - this.pending.createdAt > 20000) this.failPending("failed");
  }
  getPublicState(): DiceEnvelope { this.sweep(); return this.envelopes.player; }
  getDmState(): DiceSessionState {
    this.sweep();
    return { protocolVersion: DICE_PROTOCOL_VERSION, draft: this.draft, history: this.history, envelope: this.envelopes.dm, publicRollId: this.latestPublic?.id ?? null, publicResultVisible: this.publicResultVisible, busyUntil: this.pending ? this.pending.createdAt + 20000 : this.busyUntil };
  }
}
