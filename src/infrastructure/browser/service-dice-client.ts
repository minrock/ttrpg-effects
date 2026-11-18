import { z } from "zod";
import type { DiceSimulation } from "../../domain/dice/dice";
import {
  serviceDiceAckSchema,
  serviceDiceCapabilitiesSchema,
  serviceDiceHistoryPageSchema,
  serviceDiceOperationSchema,
  serviceDiceStateSchema,
  type ServiceDiceAck,
  type ServiceDiceBegin,
  type ServiceDiceHistoryPage,
  type ServiceDiceHistoryQuery,
  type ServiceDiceState
} from "../../shared/contracts/service-dice";
import type { ServiceDiceClient, ServiceDiceView } from "../../shared/api/service-dice-client";
import { HttpTransport, ServiceError } from "./http";

const ok = z.literal(true);
const stateReply = z.object({ ok, state: serviceDiceStateSchema }).strict();
const historyReply = z.object({ ok, page: serviceDiceHistoryPageSchema }).strict();

interface ServiceDiceTransportHooks { enable(): void; }
interface ServiceDiceContext { openingId: string; generation: number; }
const freezeView = (view: ServiceDiceView): ServiceDiceView => Object.freeze(view);

/** Adaptador C-61: no compone ni reintenta comandos; concilia por requestId. */
export class BrowserServiceDiceClient implements ServiceDiceClient {
  private view = freezeView({ supported: false, connected: false, audience: null, state: null, error: "" });
  private readonly listeners = new Set<() => void>();
  private negotiation: Promise<void> | null = null;
  /** Solo cubre la decisión de protocolo; la lectura del estado puede terminar después. */
  private transportNegotiation: { readonly version: number; readonly promise: Promise<void>; readonly abort: AbortController; release(): void } | null = null;
  private transportVersion = 0;
  private active = true;
  private generation = 0;
  private attempted = false;
  private retryOnReconnect = false;
  private transportSequence = -1;
  /** Un roll recuperado nunca vuelve a convertirse en una animación por un SSE atrasado. */
  private readonly bootstrapRolls = new Map<"public" | "private", string>();

  constructor(private readonly http: HttpTransport, private readonly hooks: ServiceDiceTransportHooks, private readonly context: ServiceDiceContext) {}
  getSnapshot = (): ServiceDiceView => { if (this.active && !this.attempted) { this.attempted = true; void this.negotiate(); } return this.view; };
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(patch: Partial<ServiceDiceView>) {
    const next = freezeView({ ...this.view, ...patch });
    if (next.supported === this.view.supported && next.connected === this.view.connected && next.audience === this.view.audience && next.state === this.view.state && next.error === this.view.error) return;
    this.view = next;
    for (const listener of this.listeners) listener();
  }
  private async negotiate(): Promise<void> {
    if (this.negotiation) return this.negotiation;
    const generation = this.generation;
    const transport = this.beginTransportNegotiation();
    this.negotiation = (async () => {
      try {
        const capabilities = await this.http.request("/dice/capabilities", serviceDiceCapabilitiesSchema, { signal: transport.abort.signal });
        if (!this.active || generation !== this.generation || transport.version !== this.transportVersion) return;
        if (capabilities.version !== 1) { this.update({ error: "La versión de dados del servicio no es compatible." }); return; }
        this.retryOnReconnect = false;
        this.http.negotiateServiceDice(true); this.hooks.enable(); this.finishTransportNegotiation(transport.version);
        const response = await this.http.request("/dice/v1/state", stateReply);
        if (!this.active || generation !== this.generation || transport.version !== this.transportVersion) return;
        this.apply(response.state, undefined, true);
      } catch (error) {
        if (!this.active || generation !== this.generation || transport.version !== this.transportVersion) return;
        if (error instanceof ServiceError && (error.status === 404 || error.code === "INVALID_RESPONSE")) {
          this.update({ supported: false, connected: false, audience: null, state: null, error: "Dados de jugadores no disponibles en este servicio." }); return;
        }
        this.retryOnReconnect = true; this.negotiation = null;
        this.update({ error: error instanceof Error ? error.message : "No se pudo negociar los dados de jugadores." });
      } finally { this.finishTransportNegotiation(transport.version); }
    })();
    return this.negotiation;
  }
  /** Espera solamente a decidir la versión SSE si una vista ya inició la negociación. */
  awaitTransportNegotiation(timeoutMs: number): Promise<void> {
    const transport = this.transportNegotiation;
    if (!transport) return Promise.resolve();
    return new Promise(resolve => {
      const timeout = setTimeout(() => { this.cancelTransportNegotiation(); resolve(); }, timeoutMs);
      void transport.promise.then(() => { clearTimeout(timeout); resolve(); });
    });
  }
  private beginTransportNegotiation() {
    const version = ++this.transportVersion;
    let release!: () => void;
    const promise = new Promise<void>(resolve => { release = resolve; });
    const transport = { version, promise, abort: new AbortController(), release };
    this.transportNegotiation = transport;
    return transport;
  }
  private finishTransportNegotiation(version: number) {
    if (this.transportNegotiation?.version === version) this.transportNegotiation.release();
  }
  /** El SSE base puede continuar si capabilities no responde; una respuesta tardía ya no cambia su protocolo. */
  private cancelTransportNegotiation(report = true) {
    const transport = this.transportNegotiation;
    if (!transport) return;
    this.transportVersion++;
    this.transportNegotiation = null;
    this.negotiation = null;
    this.retryOnReconnect = false;
    transport.abort.abort();
    transport.release();
    if (report) this.update({ error: "La negociación de dados tardó demasiado. La mesa continúa sin dados." });
  }
  /** Estado autorizado recibido por bootstrap o SSE; el estado player no contiene canal privado. */
  apply(state: ServiceDiceState, transportSequence?: number, bootstrap = false): void {
    if (!this.active) return;
    if (transportSequence === undefined && this.transportSequence >= 0) return;
    if (transportSequence !== undefined) {
      if (transportSequence <= this.transportSequence) return;
      this.transportSequence = transportSequence;
    }
    this.update({ supported: true, audience: state.audience, state: this.localState(state, bootstrap), error: "" });
  }
  /** Convierte únicamente referencias temporales del servidor al reloj del receptor. */
  private localState(state: ServiceDiceState, bootstrap: boolean): ServiceDiceState {
    const receivedAt = Date.now();
    const shift = receivedAt - state.public.serverTime;
    const timestamp = (value: number) => value + shift;
    const presentation = <T extends { rollId: string; dice: readonly unknown[]; replay: { readonly frames: readonly number[] } | null; finalFrame?: readonly number[]; startedAt: number; settledAt: number }>(value: T | null, channel: "public" | "private"): T | null => {
      if (!value) { this.bootstrapRolls.delete(channel); return null; }
      const recoveredRollId = this.bootstrapRolls.get(channel);
      if (bootstrap) this.bootstrapRolls.set(channel, value.rollId);
      else if (recoveredRollId && recoveredRollId !== value.rollId) this.bootstrapRolls.delete(channel);
      const recovered = bootstrap || recoveredRollId === value.rollId;
      const compact = recovered
        ? {
            replay: null,
            ...(value.replay ? { finalFrame: value.finalFrame ?? value.replay.frames.slice(Math.max(0, value.replay.frames.length - value.dice.length * 7)) } : {}),
            // Un bootstrap muestra su pose y resumen actual, nunca reinicia la celebración crítica.
            critical: null
          }
        : {};
      return { ...value, ...compact, startedAt: timestamp(value.startedAt), settledAt: recovered ? receivedAt : timestamp(value.settledAt) } as T;
    };
    const occupancy = <T extends { createdAt: number; expiresAt: number | null }>(value: T | null): T | null => value && {
      ...value,
      createdAt: timestamp(value.createdAt),
      expiresAt: value.expiresAt === null ? null : timestamp(value.expiresAt)
    } as T;
    const history = <T extends { entries: readonly { createdAt: number; settledAt: number }[] }>(value: T): T => ({
      ...value,
      entries: value.entries.map(entry => ({ ...entry, createdAt: timestamp(entry.createdAt), settledAt: timestamp(entry.settledAt) }))
    } as T);
    const publicState = {
      ...state.public,
      serverTime: receivedAt,
      occupancy: occupancy(state.public.occupancy),
      presentation: presentation(state.public.presentation, "public"),
      history: history(state.public.history)
    };
    if (state.audience === "player") return { audience: "player", public: publicState };
    return {
      audience: "dm",
      public: publicState,
      private: {
        ...state.private,
        occupancy: occupancy(state.private.occupancy),
        presentation: presentation(state.private.presentation, "private"),
        history: history(state.private.history)
      }
    };
  }
  setConnected(connected: boolean, error = ""): void {
    if (!this.active) return;
    const reconnected = connected && !this.view.connected;
    this.update({ connected, ...(error ? { error } : {}) });
    if (reconnected && this.retryOnReconnect && !this.negotiation) { this.attempted = true; void this.negotiate(); }
  }
  /** Un bootstrap de otra epoch vuelve a fijar el orden del transporte, no la composición local. */
  resetTransportOrder(): void { this.transportSequence = -1; }
  clear(): void {
    this.active = false; this.generation++; this.cancelTransportNegotiation(false); this.negotiation = null; this.attempted = false; this.retryOnReconnect = false; this.transportSequence = -1; this.bootstrapRolls.clear();
    this.view = freezeView({ supported: false, connected: false, audience: null, state: null, error: "" });
    for (const listener of this.listeners) listener();
  }
  resume(): void { if (this.active) return; this.active = true; }
  private async command(path: string, requestId: string, value: Record<string, unknown>): Promise<ServiceDiceAck> {
    if (!this.active) throw new ServiceError("DICE_UNSUPPORTED", "Dados de jugadores no disponibles.");
    this.attempted = true; await this.negotiate();
    if (!this.view.supported) throw new ServiceError("DICE_UNSUPPORTED", this.view.error || "Dados de jugadores no disponibles.");
    return this.http.json(path, serviceDiceAckSchema, "POST", { openingId: this.context.openingId, generation: this.context.generation, command: { ...value, requestId } });
  }
  begin(input: Omit<ServiceDiceBegin, "requestId">, requestId: string) { return this.command("/dice/v1/begin", requestId, input); }
  complete(rollId: string, simulation: DiceSimulation, requestId: string) { return this.command("/dice/v1/complete", requestId, { rollId, simulation }); }
  fail(rollId: string, requestId: string) { return this.command("/dice/v1/fail", requestId, { rollId }); }
  dismiss(rollId: string, requestId: string) { return this.command("/dice/v1/dismiss", requestId, { rollId }); }
  async history(query: ServiceDiceHistoryQuery): Promise<ServiceDiceHistoryPage> {
    if (!this.active) throw new ServiceError("DICE_UNSUPPORTED", "Dados de jugadores no disponibles.");
    this.attempted = true; await this.negotiate(); if (!this.view.supported) throw new ServiceError("DICE_UNSUPPORTED", this.view.error || "Dados de jugadores no disponibles.");
    const params = new URLSearchParams({ offset: String(query.offset), limit: String(query.limit) }); if (query.revision !== undefined) params.set("revision", String(query.revision));
    return (await this.http.request(`/dice/v1/history?${params}`, historyReply)).page;
  }
  async operation(requestId: string): Promise<ServiceDiceAck | null> {
    if (!this.active) throw new ServiceError("DICE_UNSUPPORTED", "Dados de jugadores no disponibles.");
    this.attempted = true; await this.negotiate(); if (!this.view.supported) throw new ServiceError("DICE_UNSUPPORTED", this.view.error || "Dados de jugadores no disponibles.");
    return (await this.http.request(`/dice/v1/operations/${encodeURIComponent(requestId)}`, serviceDiceOperationSchema)).operation;
  }
  private readonly dmActions = {
    setPrivateContext: (context: import("../../domain/dice/dice").DiceContext, requestId: string) => this.command("/dice/v1/private-context", requestId, { context }),
    setMapResultVisibility: (rollId: string, visible: boolean, requestId: string) => this.command("/dice/v1/visibility", requestId, { rollId, visible }),
    clearHistory: (requestId: string) => this.command("/dice/v1/clear-history", requestId, {})
  };
  get dm(): ServiceDiceClient["dm"] { return this.view.audience === "dm" ? this.dmActions : undefined; }
}
