import { contextualEventSchema, contextualStateSchema } from "../../shared/contracts/moderation";
import { z } from "zod";
import type { TtrpgApi } from "../../shared/api/ttrpg-api";
import type { DiceContext, DiceEnvelope, DiceSessionState } from "../../domain/dice/dice";
import { draftSchema } from "../../domain/dice/dice";
import type { ServiceRole } from "../../shared/contracts/http-api";
import { cameraSchema, commandSchema, diceSessionSchema, envelopeSchema, highlightSchema, pointerSchema, presenceSchema, sizesSchema, tableEventSchema, tableStateSchema, type TableEvent, type TableState } from "../../shared/contracts/table";
import { HttpTransport, ServiceError, result } from "./http";

const ok = z.literal(true);

const diceReply = <T>(value: z.ZodType<T>) => z.object({ ok, value });
type RealtimeKey = "openPlayerWindow" | "getPlayerWindowState" | "publishPlayerScene" | "publishPlayerCamera" | "commandPlayerCamera" | "reportPlayerCamera" | "publishPlayerPointer" | "publishPlayerInformationAreaHighlight" | "notifyPlayerContentReady" | "reportPlayerMapImageStatus" | "onPlayerScene" | "onPlayerCamera" | "onPlayerCameraCommand" | "onPlayerCameraReport" | "onPlayerPointer" | "onPlayerInformationAreaHighlight" | "onPlayerWindowClosed" | "onPlayerWindowReady" | "onPlayerMapImageStatus" | keyof import("../../shared/api/dice-api").DiceApi;
export interface TableConnectionStatus { phase: "connecting" | "connected" | "disconnected"; published: boolean; error: string; playerUrl: string; presence: TableState["presence"] }
export class BrowserTableClient {
  private handlers = new Map<string, Set<(value: unknown) => void>>();
  private statusHandlers = new Set<() => void>();
  private status: TableConnectionStatus = { phase: "connecting", published: false, error: "", playerUrl: "", presence: undefined };
  private current: TableState | null = null;
  private connectionId: string | undefined;
  private sequence = -1;
  private epoch = "";
  private diceOffset = 0;
  private lastDiceRevision = 0;
  private sizeOffset = 0;
  private lastSizeRevision = 0;
  private cursor = "";
  private role: ServiceRole = "dm";
  private controller: AbortController | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private chain: Promise<unknown> = Promise.resolve();
  private diceContext: DiceContext | null = null;
  private generation = 0;
  private applied = new Set<string>();
  constructor(private readonly http: HttpTransport, private readonly contextual?: { gameId: string; openingId: string; generation: number; audience: ServiceRole; terminal: (reason: "access-ended" | "replaced" | "unavailable") => void; roster?: () => void }) {}
  private get reply() { return z.object({ ok, state: this.contextual ? contextualStateSchema.transform(value => { if (value.gameId !== this.contextual!.gameId || value.openingId !== this.contextual!.openingId || value.generation !== this.contextual!.generation || value.audience !== this.contextual!.audience) { this.terminal("access-ended"); throw new Error("Contexto de mesa inválido."); } return tableStateSchema.parse({ ...value, protocolVersion: 1 }); }) : tableStateSchema, playerUrl: z.string().optional() }); }
  private ended = false;
  accessEnded() { this.terminal("access-ended"); }
  private terminal(reason: "access-ended" | "replaced" | "unavailable") { if (this.ended) return; this.ended = true; this.http.invalidate(); this.clear(); this.emit("closed"); this.contextual?.terminal(reason); }

  getStatus = () => this.status;
  subscribeStatus = (handler: () => void) => { this.statusHandlers.add(handler); return () => { this.statusHandlers.delete(handler); }; };
  private setStatus(patch: Partial<TableConnectionStatus>) { this.status = { ...this.status, ...patch }; for (const handler of this.statusHandlers) handler(); }
  private emit(name: string, value?: unknown) { for (const handler of this.handlers.get(name) ?? []) handler(value); }
  private on<T>(name: string, handler: (value: T) => void) {
    const wrapped = (value: unknown) => handler(value as T);
    const handlers = this.handlers.get(name) ?? new Set(); handlers.add(wrapped); this.handlers.set(name, handlers);
    return () => { handlers.delete(wrapped); if (!handlers.size) this.handlers.delete(name); };
  }
  start(role: ServiceRole): () => void {
    this.stop(); this.ended = false; if (this.contextual) this.http.resume(); this.role = this.contextual?.audience ?? role;
    const generation = this.generation, session = this.http.sessionSignal;
    const connect = async (attempt: number): Promise<void> => {
      if (generation !== this.generation || session.aborted) return;
      const controller = new AbortController(); this.controller = controller;
      const abort = () => controller.abort(); session.addEventListener("abort", abort, { once: true });
      this.setStatus({ phase: attempt ? "disconnected" : "connecting" });
      let count = attempt;
      try {
        const response = await this.http.stream("/table/events", controller.signal, this.cursor || undefined);
        const reader = response.body?.getReader(); if (!reader) throw new Error("Stream sin contenido.");
        const decoder = new TextDecoder(); let buffer = "";
        while (generation === this.generation && !controller.signal.aborted) {
          clearTimeout(this.watchdog); this.watchdog = setTimeout(() => controller.abort(), 15000);
          const chunk = await reader.read(); if (generation !== this.generation || session.aborted || controller.signal.aborted) { await reader.cancel(); return; } if (chunk.done) throw new Error("Conexión interrumpida.");
          buffer += decoder.decode(chunk.value, { stream: true });
          if (buffer.length > 12 * 1024 * 1024) throw new Error("Evento demasiado grande.");
          let end: number;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
            const data = block.split("\n").filter(line => line.startsWith("data: ")).map(line => line.slice(6)).join("\n");
            if (!data) continue;
            const raw: unknown = JSON.parse(data);
            let event: TableEvent;
            if (this.contextual) {
              const scoped = contextualEventSchema.parse(raw), context = this.contextual;
              if (scoped.gameId !== context.gameId || scoped.openingId !== context.openingId || scoped.generation !== context.generation || scoped.audience !== context.audience) { this.terminal("access-ended"); return; }
              if (scoped.type === "terminal") { this.terminal(scoped.terminal ?? "access-ended"); return; }
              if (scoped.type === "roster") { context.roster?.(); continue; }
              event = tableEventSchema.parse({ ...scoped, protocolVersion: 1 });
            } else event = tableEventSchema.parse(raw);
            if (generation !== this.generation || session.aborted) return;
            this.accept(event); count = 0;
            const cursor = block.split("\n").find(line => line.startsWith("id: "))?.slice(4); if (cursor) this.cursor = cursor;
          }
        }
      } catch (error) {
        if (generation !== this.generation || session.aborted) return;
        this.setStatus({ phase: "disconnected", error: "Mesa desconectada. La vista está desactualizada; reconectando…" });
        if (error instanceof ServiceError && [401, 403, 404].includes(error.status)) { if (this.contextual) this.terminal("access-ended"); return; }
        this.retry = setTimeout(() => { void connect(count + 1); }, Math.min(30000, 500 * 2 ** Math.min(count, 6)));
      } finally { clearTimeout(this.watchdog); controller.abort(); session.removeEventListener("abort", abort); }
    };
    void connect(0);
    return () => this.stop();
  }
  stop() { this.generation++; clearTimeout(this.retry); clearTimeout(this.watchdog); this.controller?.abort(); this.controller = null; this.connectionId = undefined; this.setStatus({ phase: "disconnected" }); }
  clear() { if (this.contextual) this.http.invalidate(); this.stop(); this.current = null; this.epoch = ""; this.sequence = -1; this.cursor = ""; this.applied.clear(); this.diceContext = null; this.chain = Promise.resolve(); this.setStatus({ phase: "disconnected", published: false, error: "", playerUrl: "", presence: undefined }); }
  private timed(name: "pointer" | "highlight", value: TableState["pointer"] | TableState["highlight"], serverTime: number) {
    if (!value || value.expiresAt <= serverTime || this.applied.has(value.value.id)) return;
    this.applied.add(value.value.id); if (this.applied.size > 1000) this.applied.delete(this.applied.values().next().value!);
    this.emit(name, { ...value.value, durationMs: Math.max(1, value.expiresAt - serverTime) });
  }
  private dice(value: DiceEnvelope, serverTime: number): DiceEnvelope {
    const shift = Date.now() - serverTime;
    this.lastDiceRevision = Math.max(this.lastDiceRevision, value.revision + this.diceOffset);
    return { revision: value.revision + this.diceOffset, presentation: value.presentation ? { ...value.presentation, startedAt: value.presentation.startedAt + shift, settledAt: value.presentation.settledAt + shift } : null };
  }
  private sizes(value: z.infer<typeof sizesSchema>) {
    this.lastSizeRevision = Math.max(this.lastSizeRevision, value.revision + this.sizeOffset);
    return { ...value, revision: value.revision + this.sizeOffset };
  }
  private responseSchema<T>(schema: z.ZodType<T>) {
    return z.object({ ok, value: schema, serverTime: z.number().optional() }).transform(response => {
      if (Object.is(schema, diceSessionSchema)) {
        const value = response.value as DiceSessionState, time = response.serverTime ?? Date.now(), shift = Date.now() - time;
        return { ok: true as const, value: { ...value, envelope: this.dice(value.envelope, time), busyUntil: value.busyUntil + shift, history: value.history.map(entry => ({ ...entry, createdAt: entry.createdAt + shift, settledAt: entry.settledAt + shift })) } as T };
      }
      if (Object.is(schema, sizesSchema)) return { ok: true as const, value: this.sizes(response.value as z.infer<typeof sizesSchema>) as T };
      return { ok: true as const, value: response.value };
    });
  }
  private presence(value: TableState["presence"]) {
    if (!value) return;
    const previous = this.status.presence;
    this.setStatus({ presence: value });
    if (previous?.primaryId !== value.primaryId) {
      this.emit("closed");
      if (value.primaryId) this.emit("ready");
    }
    if (value.report) this.emit("report", value.report);
  }
  private applyState(state: TableState, bootstrap = false) {
    if (this.current && state.epoch === this.current.epoch && state.revision < this.current.revision) return;
    const changed = this.current?.context !== state.context || this.current?.epoch !== state.epoch;
    const sceneChanged = changed || !this.current || state.revision > this.current.revision;
    this.current = state;
    if (state.connectionId) this.connectionId = state.connectionId;
    this.setStatus({ phase: "connected", published: !!state.snapshot, error: "" });
    if (state.snapshot && (sceneChanged || bootstrap)) this.emit("scene", state.snapshot);
    this.presence(state.presence);
    if (bootstrap || changed) {
      if (state.cameraCommand) this.emit("command", state.cameraCommand);
      this.emit("dice", this.dice(state.dice, state.serverTime)); this.emit("sizes", this.sizes(state.sizes));
      this.timed("pointer", state.pointer, state.serverTime); this.timed("highlight", state.highlight, state.serverTime);
    }
  }
  private accept(event: TableEvent) {
    if (event.epoch !== this.epoch) { if (event.type !== "bootstrap") return; if (this.epoch) { this.diceOffset = this.lastDiceRevision + 1; this.sizeOffset = this.lastSizeRevision + 1; } this.epoch = event.epoch; this.sequence = -1; this.current = null; this.applied.clear(); }
    if (event.sequence <= this.sequence) return;
    this.sequence = event.sequence;
    if (event.type === "bootstrap" && event.state) { this.applyState(event.state, true); return; }
    if (event.type === "scene") { this.applyState(tableStateSchema.parse(event.payload)); return; }
    if (!this.current || event.context !== this.current.context || event.revision < this.current.revision) return;
    switch (event.type) {
      case "camera": { const camera = cameraSchema.parse(event.payload); if (this.current) this.current.camera = camera; this.emit("camera", camera); break; }
      case "camera-command": { const command = commandSchema.parse(event.payload); if (this.current) this.current.cameraCommand = command; this.emit("command", command); break; }
      case "presence": this.presence(presenceSchema.parse(event.payload)); break;
      case "image-status": this.emit("image", z.object({ imageUrl:z.string(),ok:z.boolean(),error:z.string().optional() }).parse(event.payload)); break;
      case "dice": this.emit("dice", this.dice(envelopeSchema.parse(event.payload), event.serverTime)); break;
      case "sizes": this.emit("sizes", this.sizes(sizesSchema.parse(event.payload))); break;
      case "render-error": { const error = z.string().max(500).parse(event.payload); this.setStatus({ error }); this.emit("renderError", error); break; }
      case "pointer": this.timed("pointer", z.object({value:pointerSchema,startedAt:z.number(),expiresAt:z.number()}).parse(event.payload), event.serverTime); break;
      case "highlight": this.timed("highlight", z.object({value:highlightSchema,startedAt:z.number(),expiresAt:z.number()}).parse(event.payload), event.serverTime); break;
    }
  }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const signal = this.http.sessionSignal;
    const next = this.chain.catch(() => {}).then(() => { if (signal.aborted) throw new Error("La sesión cambió."); return work(); });
    this.chain = next.catch(() => {}); return next;
  }
  private async rpc<T>(path: string, payload: unknown, schema: z.ZodType<T>, captured?: { context: string | null; connectionId?: string; revision?: number }): Promise<T> {
    const body = { requestId: crypto.randomUUID(), context: this.current?.context ?? null, connectionId: this.connectionId, revision: this.current?.revision, ...captured, payload };
    const startedAt = Date.now();
    // Un único reintento con el mismo ID, dentro de la ventana de cinco minutos.
    try { return await this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body } : body); }
    catch (error) { if (!(error instanceof ServiceError) || error.code !== "NETWORK" || Date.now() - startedAt >= 300000) throw error; return this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body } : body); }
  }
  private mutation(action: string, payload: unknown) {
    const expectedContext = this.current?.context;
    const captured = { context: expectedContext ?? null, connectionId: this.connectionId, revision: this.current?.revision };
    return result(() => this.enqueue(async () => {
      if (["camera-report", "ready", "map-image-status"].includes(action) && (this.status.phase !== "connected" || expectedContext !== this.current?.context)) throw new Error("Reporte descartado: la mesa cambió o está desconectada.");
      const context = this.current?.context;
      let playerUrl: string | undefined;
      if (["open", "scene"].includes(action)) {
        const response = await this.rpc(`/table/${action}`, payload, this.reply);
        this.applyState(response.state); playerUrl = response.playerUrl;
        if (playerUrl) this.setStatus({ playerUrl });
        if (context !== response.state.context && this.diceContext) await this.rpc("/dice/context", this.diceContext, diceReply(diceSessionSchema));
      } else await this.rpc(`/table/${action}`, payload, z.object({ ok }), ["camera-report", "ready", "map-image-status"].includes(action) ? captured : undefined);
      this.setStatus({ error: "" });
      return { ok: true as const, playerUrl, isOpen: (this.status.presence?.count ?? 0) > 0 };
    })).then(value => { if (!value.ok) this.setStatus({ error: value.error }); return value; });
  }
  private diceMutation<T>(action: string, payload: unknown, schema: z.ZodType<T>) { return result(() => this.enqueue(() => this.rpc(`/dice/${action}`, payload, this.responseSchema(schema)))); }
  readonly api: Pick<TtrpgApi, RealtimeKey> = {
    openPlayerWindow: snapshot => this.contextual ? this.mutation("scene", snapshot ?? null) : this.mutation("open", snapshot ? { snapshot } : {}),
    publishPlayerScene: snapshot => this.mutation("scene", snapshot), publishPlayerCamera: camera => this.mutation("camera", camera), commandPlayerCamera: command => this.mutation("camera-command", command),
    reportPlayerCamera: report => this.mutation("camera-report", report), publishPlayerPointer: value => this.mutation("pointer", value), publishPlayerInformationAreaHighlight: value => this.mutation("area-highlight", value),
    notifyPlayerContentReady: () => this.mutation("ready", {}), reportPlayerMapImageStatus: async value => { await this.mutation("map-image-status", value); },
    getPlayerWindowState: async () => {
      try { if (!this.current) this.applyState((await this.http.request("/table/state", this.reply)).state); }
      catch (error) { this.setStatus({ error: error instanceof Error ? error.message : "No se pudo cargar la mesa." }); }
      return { snapshot:this.current?.snapshot ?? null,camera:this.current?.camera ?? null,cameraCommand:this.current?.cameraCommand ?? null,isOpen:(this.status.presence?.count ?? 0)>0 };
    },
    onPlayerScene: h => this.on("scene", h),onPlayerCamera: h => this.on("camera", h),onPlayerCameraCommand: h => this.on("command", h),onPlayerCameraReport: h => this.on("report", h),onPlayerPointer: h => this.on("pointer", h),onPlayerInformationAreaHighlight: h => this.on("highlight", h),onPlayerWindowClosed: h => this.on("closed", h),onPlayerWindowReady: h => this.on("ready", h),onPlayerMapImageStatus: h => this.on("image", h),
    getDiceSizes: () => result(() => this.http.request("/dice/sizes",this.responseSchema(sizesSchema))),setDiceSize: value => this.diceMutation("size",value,sizesSchema),onDiceSizes: h=>this.on("sizes",h),
    updateDiceContext: value => { this.diceContext=value;return this.diceMutation("context",value,diceSessionSchema); },updateDicePreferences: value=>this.diceMutation("preferences",value,draftSchema),
    beginDiceRoll: value=>this.diceMutation("begin",value,z.object({rollId:z.string()})),completeDiceRoll:(rollId,simulation)=>this.diceMutation("complete",{rollId,simulation},diceSessionSchema),failDiceRoll:rollId=>this.diceMutation("fail",{rollId},diceSessionSchema),
    getDmDiceSession:()=>result(()=>this.http.request("/dice/session",this.responseSchema(diceSessionSchema))),clearDiceHistory:()=>this.diceMutation("clear-history",{},diceSessionSchema),dismissDiceRoll:rollId=>this.diceMutation("dismiss",{rollId},diceSessionSchema),setDiceResultVisibility:(rollId,visible)=>this.diceMutation("visibility",{rollId,visible},diceSessionSchema),
    getPublicDiceState:()=>result(async()=>{const response=await this.http.request("/table/state",this.reply);return {ok:true as const,value:this.dice(response.state.dice,response.state.serverTime)};}),reportDiceRenderStatus:(rollId,ok)=>result(()=>this.enqueue(()=>this.rpc("/dice/render-status",{rollId,ok},z.object({ok:z.literal(true)})))),onDicePresentation:h=>this.on("dice",h),onDiceRenderError:h=>this.on("renderError",h)
  };
}
