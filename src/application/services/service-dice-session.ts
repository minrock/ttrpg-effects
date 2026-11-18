import {
  expandDice,
  requestSchema,
  resolveDiceRoll,
  validateSimulation,
  type DiceContext,
  type DicePresentation,
  type DiceResult,
  type DiceRollRequest
} from "../../domain/dice/dice";
import { naturalTwenty } from "../../domain/dice/critical";
import {
  serviceDiceBeginSchema,
  serviceDiceHistoryQuerySchema,
  serviceDicePublicHistoryPageSchema,
  type DicePublicAuthor,
  type ServiceDiceAck,
  type ServiceDiceBegin,
  type ServiceDiceContext,
  type ServiceDiceEntry,
  type ServiceDiceHistoryPage,
  type ServiceDiceOccupancy,
  type ServiceDicePrivateOccupancy,
  type ServiceDicePrivatePresentation,
  type ServiceDicePresentation,
  type ServiceDicePublicHistoryPage,
  type ServiceDiceSelection,
  type ServiceDiceState
} from "../../shared/contracts/service-dice";
import { createHash } from "node:crypto";

export interface ServiceDiceActor {
  /** Identidad estable interna de apertura; nunca se serializa en la proyección. */
  readonly id: string;
  readonly role: "dm" | "player";
  readonly author: DicePublicAuthor;
}

export class ServiceDiceError extends Error {
  constructor(readonly code: "DICE_OCCUPIED" | "DICE_CONTEXT_CHANGED" | "DICE_STALE_ROLL" | "DICE_HISTORY_CHANGED" | "DICE_OPERATION_CONTENT_CONFLICT" | "DICE_RATE_LIMITED" | "FORBIDDEN", message: string) { super(message); }
}

export interface ServiceDiceChange { readonly public: boolean; readonly dm: boolean; }
interface ActiveRoll {
  readonly id: string;
  readonly requestId: string;
  readonly actor: ServiceDiceActor;
  readonly visibility: "public" | "hidden";
  readonly context: ServiceDiceContext | DiceContext;
  readonly selection: ServiceDiceSelection;
  readonly request: DiceRollRequest;
  readonly createdAt: number;
  result: DiceResult | null;
  presentation: DicePresentation | null;
  settledAt: number | null;
  replayCompacted: boolean;
  finalFrame: readonly number[] | null;
  mapResultVisible: boolean;
}
interface Receipt { readonly fingerprint: string; readonly ack: ServiceDiceAck; readonly until: number; readonly role: ServiceDiceActor["role"]; }
interface ReceiptReservation { readonly actorId: string; readonly role: ServiceDiceActor["role"]; slots: number; }
interface BeginRate { tokens: number; at: number; }
interface CommandOptions {
  readonly reserve?: { readonly rollId: string; readonly slots: number };
  readonly consumeReservation?: string;
  readonly endReservation?: boolean;
  /** El cierre de una tirada puede usar la última plaza de control. */
  readonly release?: boolean;
  /** ACK de cierre de un DM sobre reserva ajena: presupuesto separado y acotado. */
  readonly moderation?: boolean;
}

const HISTORY_LIMIT = 500;
const RECEIPT_LIMIT = 64;
const RUNTIME_RECEIPT_LIMIT = 1024;
const RECEIPT_TTL = 300000;
// Máximo demostrado: 12 grupos × 2d6 con IDs escapables de 150 caracteres = 46.266 B.
const HISTORY_ENTRY_BYTES = 64 * 1024;

function sameContext(left: ServiceDiceContext | DiceContext, right: ServiceDiceContext | DiceContext): boolean { return left.token === right.token; }
function clone<T>(value: T): T { return structuredClone(value); }
function fingerprint(action: string, value: unknown): string { return createHash("sha256").update(action).update("\0").update(JSON.stringify(value)).digest("hex"); }

/** Estado efímero de dados de una apertura de servicio. No conoce HTTP, DB ni cookies. */
export class ServiceDiceSession {
  private published: ServiceDiceContext | null = null;
  private privateContext: DiceContext | null = null;
  private currentPublic: ActiveRoll | null = null;
  private currentPrivate: ActiveRoll | null = null;
  private publicHistory: ServiceDiceEntry[] = [];
  private hiddenHistory: ServiceDiceEntry[] = [];
  private publicHistoryRevision = 0;
  private dmHistoryRevision = 0;
  private publicSequence = 0;
  private entrySequence = 0;
  private readonly entryOrder = new Map<string, number>();
  private readonly receipts = new Map<string, Map<string, Receipt>>();
  private readonly moderationReceipts = new Map<string, Map<string, Receipt>>();
  private readonly receiptReservations = new Map<string, ReceiptReservation>();
  private readonly beginRates = new Map<string, BeginRate>();

  constructor(private readonly changed: (change: ServiceDiceChange) => void, private readonly now: () => number = Date.now, private readonly id: () => string = () => crypto.randomUUID()) {}

  private notify(change: ServiceDiceChange): void {
    if (change.public) this.publicSequence++;
    this.changed(change);
  }
  private expireReceipts(): void {
    for (const collection of [this.receipts, this.moderationReceipts]) for (const [actor, entries] of collection) {
      for (const [requestId, receipt] of entries) if (receipt.until <= this.now()) entries.delete(requestId);
      if (!entries.size) collection.delete(actor);
    }
  }
  private receiptUsage(actor: ServiceDiceActor): { own: number; audience: number } {
    let own = this.receipts.get(actor.id)?.size ?? 0;
    let audience = 0;
    for (const entries of this.receipts.values()) for (const entry of entries.values()) if (entry.role === actor.role) audience++;
    for (const reservation of this.receiptReservations.values()) {
      if (reservation.role === actor.role) audience += reservation.slots;
      if (reservation.actorId === actor.id) own += reservation.slots;
    }
    return { own, audience };
  }
  private receipt(actor: ServiceDiceActor, requestId: string, fingerprint: string): ServiceDiceAck | null {
    this.expireReceipts();
    const previous = this.receipts.get(actor.id)?.get(requestId) ?? this.moderationReceipts.get(actor.id)?.get(requestId);
    if (!previous) return null;
    if (previous.fingerprint !== fingerprint) throw new ServiceDiceError("DICE_OPERATION_CONTENT_CONFLICT", "El identificador ya se usó con otro contenido.");
    return { ...previous.ack, outcome: "already-applied" };
  }
  private canStoreReceipt(actor: ServiceDiceActor, options: CommandOptions): boolean {
    this.expireReceipts();
    if (options.moderation) return (this.moderationReceipts.get(actor.id)?.size ?? 0) < RECEIPT_LIMIT;
    const consumed = options.consumeReservation ? this.receiptReservations.get(options.consumeReservation) : undefined;
    const consumesOwnReservation = consumed?.actorId === actor.id && consumed.slots > 0;
    const added = consumesOwnReservation ? 0 : 1 + (options.reserve?.slots ?? 0);
    const usage = this.receiptUsage(actor);
    // Se conserva una plaza de control para que un DM pueda cerrar una tirada ajena.
    const ownLimit = options.reserve || options.release || consumesOwnReservation ? RECEIPT_LIMIT : RECEIPT_LIMIT - 1;
    const audienceLimit = options.reserve || options.release || consumesOwnReservation ? RUNTIME_RECEIPT_LIMIT : RUNTIME_RECEIPT_LIMIT - 1;
    return usage.own + added <= ownLimit && usage.audience + added <= audienceLimit;
  }
  private storeReceipt(actor: ServiceDiceActor, requestId: string, fingerprint: string, ack: ServiceDiceAck, options: CommandOptions): ServiceDiceAck {
    const reserved = options.consumeReservation ? this.receiptReservations.get(options.consumeReservation) : undefined;
    if (reserved?.actorId === actor.id && reserved.slots > 0) {
      reserved.slots--;
      if (reserved.slots === 0 || options.endReservation) this.receiptReservations.delete(options.consumeReservation!);
    }
    const all = options.moderation ? this.moderationReceipts : this.receipts;
    let own = all.get(actor.id);
    if (!own) { own = new Map(); all.set(actor.id, own); }
    own.set(requestId, { fingerprint, ack, until: this.now() + RECEIPT_TTL, role: actor.role });
    if (options.reserve) this.receiptReservations.set(options.reserve.rollId, { actorId: actor.id, role: actor.role, slots: options.reserve.slots });
    return ack;
  }
  private command(actor: ServiceDiceActor, requestId: string, signature: string, run: () => ServiceDiceAck, options: CommandOptions = {}): ServiceDiceAck {
    const previous = this.receipt(actor, requestId, signature);
    if (previous) return previous;
    if (!this.canStoreReceipt(actor, options)) throw new ServiceDiceError("DICE_RATE_LIMITED", "Demasiadas operaciones de dados. Intenta de nuevo más tarde.");
    const ack = run();
    return this.storeReceipt(actor, requestId, signature, ack, options);
  }
  private consumeBeginRate(actor: ServiceDiceActor): void {
    const now = this.now(), previous = this.beginRates.get(actor.id);
    const tokens = Math.min(4, (previous?.tokens ?? 4) + (previous ? (now - previous.at) / 1000 : 0));
    if (tokens < 1) throw new ServiceDiceError("DICE_RATE_LIMITED", "Demasiados inicios de tirada. Intenta de nuevo en un momento.");
    this.beginRates.set(actor.id, { tokens: tokens - 1, at: now });
  }
  private expireBeginRates(): void {
    // Tras cuatro segundos sin begin el bucket vuelve al máximo; no conserva identidad inactiva.
    for (const [actorId, bucket] of this.beginRates) if (this.now() - bucket.at >= 4000) this.beginRates.delete(actorId);
  }
  private toRequest(input: ServiceDiceBegin): DiceRollRequest {
    return requestSchema.parse({
      requestId: input.requestId,
      contextToken: input.contextToken,
      draft: {
        groups: input.selection.groups,
        includeD20: input.selection.includeD20,
        d20Modifier: input.selection.d20Modifier,
        visibility: input.visibility === "public" ? "open" : "hidden",
        showPlayerResult: true,
        appearance: input.selection.appearance,
        force: input.selection.force
      },
      d20: input.selection.d20
    });
  }
  private activeEntry(active: ActiveRoll, status: "complete" | "failed" | "interrupted", result: DiceResult | null): ServiceDiceEntry {
    const entry = {
      id: active.id,
      author: active.actor.author,
      visibility: active.visibility,
      context: clone(active.context),
      selection: clone(active.selection),
      createdAt: active.createdAt,
      settledAt: active.settledAt ?? this.now(),
      status,
      result: clone(result)
    } as ServiceDiceEntry;
    return entry;
  }
  private assertEntrySize(entry: ServiceDiceEntry): void {
    if (new TextEncoder().encode(JSON.stringify(entry)).byteLength > HISTORY_ENTRY_BYTES) throw new ServiceDiceError("DICE_RATE_LIMITED", "La tirada supera el límite de historial de la mesa.");
  }
  private append(entry: ServiceDiceEntry): void {
    this.assertEntrySize(entry);
    this.entryOrder.set(entry.id, ++this.entrySequence);
    if (entry.visibility === "public") { this.publicHistory = [entry, ...this.publicHistory].slice(0, HISTORY_LIMIT); this.publicHistoryRevision++; }
    else this.hiddenHistory = [entry, ...this.hiddenHistory].slice(0, HISTORY_LIMIT);
    const retained = new Set([...this.publicHistory, ...this.hiddenHistory].map(value => value.id));
    for (const id of this.entryOrder.keys()) if (!retained.has(id)) this.entryOrder.delete(id);
    this.dmHistoryRevision++;
  }
  private publicOccupancy(active = this.currentPublic): ServiceDiceOccupancy | null {
    if (!active) return null;
    return { rollId: active.id, author: active.actor.author, phase: active.settledAt === null ? "preparing" : this.now() < active.settledAt ? "rolling" : "settled", createdAt: active.createdAt, expiresAt: active.settledAt === null ? active.createdAt + 20000 : null };
  }
  private privateOccupancy(active = this.currentPrivate): ServiceDicePrivateOccupancy | null {
    if (!active) return null;
    return { rollId: active.id, phase: active.settledAt === null ? "preparing" : this.now() < active.settledAt ? "rolling" : "settled", context: clone(active.context as DiceContext), createdAt: active.createdAt, expiresAt: active.settledAt === null ? active.createdAt + 20000 : null };
  }
  private presentation(active: ActiveRoll, visible: boolean): ServiceDicePresentation | ServiceDicePrivatePresentation {
    const value = active.presentation;
    if (!value) throw new ServiceDiceError("DICE_STALE_ROLL", "La tirada ya no está disponible.");
    const context = clone(active.context);
    return {
      rollId: active.id,
      context,
      author: active.actor.author,
      dice: value.dice,
      appearance: value.appearance,
      replay: active.replayCompacted ? null : value.replay,
      ...(active.replayCompacted ? { finalFrame: active.finalFrame ?? [] } : {}),
      result: visible ? value.result : null,
      ...(value.critical === undefined ? {} : { critical: value.critical }),
      startedAt: value.startedAt,
      settledAt: value.settledAt
    } as ServiceDicePresentation | ServiceDicePrivatePresentation;
  }
  private publicAck(requestId: string, rollId: string | undefined, outcome: ServiceDiceAck["outcome"], status?: ServiceDiceAck["status"]): ServiceDiceAck {
    return { ok: true, version: 1, requestId, ...(rollId ? { rollId } : {}), outcome, publicSequence: this.publicSequence, ...(status ? { status } : {}) };
  }
  private assertDm(actor: ServiceDiceActor): void { if (actor.role !== "dm") throw new ServiceDiceError("FORBIDDEN", "Esta acción requiere acceso DM."); }
  private isOwner(actor: ServiceDiceActor, active: ActiveRoll): boolean { return actor.role === "dm" || actor.id === active.actor.id; }
  private expire(active: ActiveRoll): void {
    this.append(this.activeEntry(active, "failed", null));
    if (active.visibility === "public") this.currentPublic = null; else this.currentPrivate = null;
    this.receiptReservations.delete(active.id);
  }

  setPublishedContext(context: ServiceDiceContext | null): void {
    const changed = !this.published || !context || !sameContext(this.published, context);
    if (!changed) { this.published = context ? clone(context) : null; return; }
    const active = this.currentPublic;
    if (active) { if (active.settledAt === null) this.append(this.activeEntry(active, "interrupted", null)); this.receiptReservations.delete(active.id); this.currentPublic = null; }
    this.published = context ? clone(context) : null;
    this.notify({ public: true, dm: true });
  }
  setPrivateContext(actor: ServiceDiceActor, context: DiceContext): void {
    this.assertDm(actor);
    if (this.privateContext?.token !== context.token && this.currentPrivate) { if (this.currentPrivate.settledAt === null) this.append(this.activeEntry(this.currentPrivate, "interrupted", null)); this.receiptReservations.delete(this.currentPrivate.id); this.currentPrivate = null; }
    this.privateContext = clone(context);
    this.notify({ public: false, dm: true });
  }
  setPrivateContextCommand(actor: ServiceDiceActor, context: DiceContext, requestId: string): ServiceDiceAck {
    this.assertDm(actor);
    return this.command(actor, requestId, fingerprint("private-context", context), () => {
      this.setPrivateContext(actor, context);
      return this.publicAck(requestId, undefined, "accepted");
    });
  }
  begin(actor: ServiceDiceActor, raw: unknown): ServiceDiceAck {
    const input = serviceDiceBeginSchema.parse(raw), signature = fingerprint("begin", input);
    let activeId = "";
    return this.command(actor, input.requestId, signature, () => {
      if (input.visibility === "hidden") this.assertDm(actor);
      const context = input.visibility === "public" ? this.published : this.privateContext;
      if (!context || context.token !== input.contextToken) throw new ServiceDiceError("DICE_CONTEXT_CHANGED", "El contexto de la tirada cambió.");
      const current = input.visibility === "public" ? this.currentPublic : this.currentPrivate;
      if (current) {
        if (input.visibility === "public") throw new ServiceDiceError("DICE_OCCUPIED", "Espera a que se cierre la tirada pública.");
        throw new ServiceDiceError("DICE_OCCUPIED", "La tirada oculta aún está activa.");
      }
      this.consumeBeginRate(actor);
      const request = this.toRequest(input), active: ActiveRoll = { id: this.id(), requestId: input.requestId, actor, visibility: input.visibility, context: clone(context), selection: clone(input.selection), request, createdAt: this.now(), result: null, presentation: null, settledAt: null, replayCompacted: false, finalFrame: null, mapResultVisible: true };
      activeId = active.id;
      if (input.visibility === "public") this.currentPublic = active; else this.currentPrivate = active;
      this.notify({ public: input.visibility === "public", dm: true });
      return this.publicAck(input.requestId, active.id, "accepted");
    }, { reserve: { get rollId() { return activeId; }, slots: 2 } });
  }
  complete(actor: ServiceDiceActor, rollId: string, simulation: unknown, requestId: string): ServiceDiceAck {
    const signature = fingerprint("complete", { rollId, simulation });
    return this.command(actor, requestId, signature, () => {
      const active = this.currentPublic?.id === rollId ? this.currentPublic : this.currentPrivate?.id === rollId ? this.currentPrivate : null;
      if (!active || active.settledAt !== null) throw new ServiceDiceError("DICE_STALE_ROLL", "La tirada ya no está disponible.");
      if (active.actor.id !== actor.id) throw new ServiceDiceError("FORBIDDEN", "Solo quien inició la tirada puede completarla.");
      if (this.now() >= active.createdAt + 20000) { this.expire(active); this.notify({ public: active.visibility === "public", dm: true }); throw new ServiceDiceError("DICE_STALE_ROLL", "La reserva de la tirada venció."); }
      const current = active.visibility === "public" ? this.published : this.privateContext;
      if (!current || !sameContext(current, active.context)) throw new ServiceDiceError("DICE_CONTEXT_CHANGED", "El contexto de la tirada cambió.");
      const dice = expandDice(active.request), accepted = validateSimulation(simulation, dice), result = resolveDiceRoll(active.request, accepted.values);
      const startedAt = this.now() + 180, settledAt = startedAt + accepted.replay.durationMs;
      // La cota del historial se comprueba antes de cambiar reserva, presentación o recibo.
      this.assertEntrySize({ id: active.id, author: active.actor.author, visibility: active.visibility, context: clone(active.context), selection: clone(active.selection), createdAt: active.createdAt, settledAt, status: "complete", result: clone(result) } as ServiceDiceEntry);
      active.result = result; active.settledAt = settledAt;
      active.presentation = { rollId, contextToken: active.request.contextToken, sceneId: "", mapId: "", dice, appearance: active.request.draft.appearance, replay: accepted.replay, result, critical: naturalTwenty(dice, result), startedAt, settledAt };
      this.append(this.activeEntry(active, "complete", result));
      this.notify({ public: active.visibility === "public", dm: true });
      return this.publicAck(requestId, rollId, "accepted", "complete");
    }, { consumeReservation: rollId });
  }
  fail(actor: ServiceDiceActor, rollId: string, requestId: string): ServiceDiceAck {
    return this.command(actor, requestId, fingerprint("fail", { rollId }), () => {
      const active = this.currentPublic?.id === rollId ? this.currentPublic : this.currentPrivate?.id === rollId ? this.currentPrivate : null;
      if (!active || active.settledAt !== null) throw new ServiceDiceError("DICE_STALE_ROLL", "La tirada ya no está disponible.");
      if (active.actor.id !== actor.id) throw new ServiceDiceError("FORBIDDEN", "Solo quien inició la tirada puede marcarla como fallida.");
      this.append(this.activeEntry(active, "failed", null));
      if (active.visibility === "public") this.currentPublic = null; else this.currentPrivate = null;
      this.receiptReservations.delete(active.id);
      this.notify({ public: active.visibility === "public", dm: true });
      return this.publicAck(requestId, rollId, "accepted", "failed");
    }, { consumeReservation: rollId, endReservation: true, release: true });
  }
  dismiss(actor: ServiceDiceActor, rollId: string, requestId: string): ServiceDiceAck {
    const target = this.currentPublic?.id === rollId ? this.currentPublic : this.currentPrivate?.id === rollId ? this.currentPrivate : null;
    const moderation = actor.role === "dm" && !!target && target.actor.id !== actor.id;
    return this.command(actor, requestId, fingerprint("dismiss", { rollId }), () => {
      const active = this.currentPublic?.id === rollId ? this.currentPublic : this.currentPrivate?.id === rollId ? this.currentPrivate : null;
      if (!active) return this.publicAck(requestId, rollId, "obsolete");
      if (!this.isOwner(actor, active)) throw new ServiceDiceError("FORBIDDEN", "No puedes cerrar esta tirada.");
      if (active.settledAt === null) this.append(this.activeEntry(active, "interrupted", null));
      if (active.visibility === "public") this.currentPublic = null; else this.currentPrivate = null;
      this.receiptReservations.delete(active.id);
      this.notify({ public: active.visibility === "public", dm: true });
      return this.publicAck(requestId, rollId, "accepted", active.settledAt === null ? "interrupted" : undefined);
    }, { consumeReservation: rollId, endReservation: true, release: true, moderation });
  }
  setMapResultVisibility(actor: ServiceDiceActor, rollId: string, visible: boolean, requestId: string): ServiceDiceAck {
    this.assertDm(actor);
    return this.command(actor, requestId, fingerprint("visibility", { rollId, visible }), () => {
      const active = this.currentPublic;
      if (!active || active.id !== rollId) return this.publicAck(requestId, rollId, "obsolete");
      if (active.actor.role !== "dm" || active.actor.id !== actor.id) throw new ServiceDiceError("FORBIDDEN", "Solo el DM autor puede cambiar el resumen de su tirada.");
      active.mapResultVisible = visible;
      this.notify({ public: true, dm: true });
      return this.publicAck(requestId, rollId, "accepted");
    });
  }
  clearHistory(actor: ServiceDiceActor, requestId: string): ServiceDiceAck {
    this.assertDm(actor);
    return this.command(actor, requestId, fingerprint("clear-history", null), () => {
      this.publicHistory = []; this.hiddenHistory = []; this.publicHistoryRevision++; this.dmHistoryRevision++;
      this.notify({ public: true, dm: true });
      return this.publicAck(requestId, undefined, "accepted");
    });
  }
  sweep(): void {
    let changed = false, changedPublic = false;
    for (const active of [this.currentPublic, this.currentPrivate]) {
      if (!active) continue;
      if (active.settledAt === null && this.now() >= active.createdAt + 20000) {
        this.expire(active);
        if (active.visibility === "public") changedPublic = true;
        changed = true;
      } else if (active.settledAt !== null && this.now() >= active.settledAt && !active.replayCompacted) {
        const replay = active.presentation?.replay;
        active.finalFrame = replay ? replay.frames.slice((replay.frameCount - 1) * active.presentation!.dice.length * 7) : [];
        active.presentation = active.presentation ? { ...active.presentation, replay: null } : null;
        active.replayCompacted = true; changed = true; if (active.visibility === "public") changedPublic = true;
      }
    }
    this.expireReceipts();
    this.expireBeginRates();
    if (changed) this.notify({ public: changedPublic, dm: true });
  }
  revokeParticipant(actorId: string): void {
    for (const active of [this.currentPublic, this.currentPrivate]) if (active?.actor.id === actorId && active.settledAt === null) {
      this.append(this.activeEntry(active, "interrupted", null));
      if (active.visibility === "public") this.currentPublic = null; else this.currentPrivate = null;
      this.receiptReservations.delete(active.id);
      this.notify({ public: active.visibility === "public", dm: true });
    }
    this.receipts.delete(actorId); this.moderationReceipts.delete(actorId);
    for (const [rollId, reservation] of this.receiptReservations) if (reservation.actorId === actorId) this.receiptReservations.delete(rollId);
    this.beginRates.delete(actorId);
  }
  operation(actor: ServiceDiceActor, requestId: string): ServiceDiceAck | null { this.expireReceipts(); return this.receipts.get(actor.id)?.get(requestId)?.ack ?? this.moderationReceipts.get(actor.id)?.get(requestId)?.ack ?? null; }
  history(actor: ServiceDiceActor, raw: unknown): ServiceDiceHistoryPage {
    const query = serviceDiceHistoryQuerySchema.parse(raw), entries = actor.role === "dm" ? [...this.publicHistory, ...this.hiddenHistory].sort((a, b) => b.settledAt - a.settledAt || b.createdAt - a.createdAt || (this.entryOrder.get(b.id) ?? 0) - (this.entryOrder.get(a.id) ?? 0)) : this.publicHistory;
    const revision = actor.role === "dm" ? this.dmHistoryRevision : this.publicHistoryRevision;
    if (query.offset > 0 && query.revision === undefined) throw new ServiceDiceError("DICE_HISTORY_CHANGED", "Indica la revisión al cargar otra página del historial.");
    if (query.revision !== undefined && query.revision !== revision) throw new ServiceDiceError("DICE_HISTORY_CHANGED", "El historial cambió. Carga la primera página otra vez.");
    return { revision, total: entries.length, offset: query.offset, limit: query.limit, entries: clone(entries.slice(query.offset, query.offset + query.limit)) };
  }
  private publicHistoryPage(): ServiceDicePublicHistoryPage {
    return serviceDicePublicHistoryPageSchema.parse({ revision: this.publicHistoryRevision, total: this.publicHistory.length, offset: 0, limit: 10, entries: clone(this.publicHistory.slice(0, 10)) });
  }
  state(actor: ServiceDiceActor): ServiceDiceState {
    this.sweep();
    const publicActive = this.currentPublic, publicPresentation = publicActive?.presentation ? this.presentation(publicActive, actor.role === "dm" || publicActive.mapResultVisible) as ServiceDicePresentation : null;
    const publicState = { version: 1 as const, sequence: this.publicSequence, serverTime: this.now(), selfPublicId: actor.author.kind === "player" ? actor.author.publicId : null, publishedContext: clone(this.published), occupancy: this.publicOccupancy(), presentation: publicPresentation, history: this.publicHistoryPage() };
    if (actor.role === "player") return { audience: "player", public: publicState };
    const privateActive = this.currentPrivate, privatePresentation = privateActive?.presentation ? this.presentation(privateActive, true) as ServiceDicePrivatePresentation : null;
    return { audience: "dm", public: publicState, private: { context: clone(this.privateContext), occupancy: this.privateOccupancy(), presentation: privatePresentation, history: this.history(actor, { offset: 0, limit: 10 }) } };
  }
  clear(): void {
    this.published = null; this.privateContext = null; this.currentPublic = null; this.currentPrivate = null;
    this.publicHistory = []; this.hiddenHistory = []; this.receipts.clear(); this.moderationReceipts.clear(); this.receiptReservations.clear(); this.beginRates.clear(); this.entryOrder.clear(); this.publicHistoryRevision = 0; this.dmHistoryRevision = 0; this.publicSequence = 0; this.entrySequence = 0;
  }
}
