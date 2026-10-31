import { DiceRollSession } from "./dice-roll-session";
import { publicTableProjection } from "./public-table-projection";
import type { PlayerWindowSnapshot, ViewportCameraSnapshot } from "../../domain/player/player-window";
import type { PlayerCameraCommand, PlayerCameraReport } from "../../domain/player/player-camera-control";
import type { TableEvent, TableState } from "../../shared/contracts/table";
import type { ServiceRole } from "../../shared/contracts/http-api";

export class TableConflict extends Error {}
interface Connection { id: string; owner: string; role: ServiceRole; participant?: string; emit: (event: TableEvent) => void; report: PlayerCameraReport | null; ready: boolean; imageStatus: "waiting" | "loading" | "ready" | "error"; lastReport: number }
/** Transiciones síncronas: snapshot y permisos se actualizan juntos. */
export class TableSession {
  readonly epoch: string;
  readonly dice: DiceRollSession;
  context: string | null = null;
  revision = 0;
  private snapshot: PlayerWindowSnapshot | null = null;
  private assets = new Set<string>();
  private identity = "";
  private camera: ViewportCameraSnapshot | null = null;
  private command: PlayerCameraCommand | null = null;
  private pointer: TableState["pointer"] = null;
  private highlight: TableState["highlight"] = null;
  private connections = new Map<string, Connection>();
  private sequence = { dm: 0, player: 0 };
  private dedup = new Map<string, { fingerprint: string; result: unknown; until: number; bytes: number; role: ServiceRole }>();
  private dedupBudgets = { dm: { count: 0, bytes: 0 }, player: { count: 0, bytes: 0 } };
  constructor(readonly now: () => number, private readonly id: () => string, private readonly assetUrl?: (reference: string) => string | null) {
    this.epoch = id();
    this.dice = new DiceRollSession((role, payload) => this.emit("dice", payload, role), now, id);
  }
  get connectionCount() { return this.connections.size; }
  get primary() { return [...this.connections.values()].find(c => c.role === "player") ?? null; }
  allows(reference: string): boolean { return this.assets.has(reference); }
  presence(): NonNullable<TableState["presence"]> {
    const p = this.primary;
    return { count: new Set([...this.connections.values()].filter(c => c.role === "player").map(c => c.participant ?? c.owner)).size, primaryId: p?.id ?? null, ready: p?.ready ?? false, imageStatus: p?.imageStatus ?? "waiting", report: p?.report ?? null };
  }
  state(role: ServiceRole, connectionId?: string): TableState {
    return { protocolVersion: 1, epoch: this.epoch, context: this.context, revision: this.revision, serverTime: this.now(), snapshot: this.snapshot, camera: this.camera, cameraCommand: this.command,
      dice: role === "dm" ? this.dice.getDmState().envelope : this.dice.getPublicState(), sizes: this.sizes(role),
      ...(role === "dm" ? { presence: this.presence() } : {}), ...(connectionId ? { connectionId } : {}),
      pointer: this.pointer && this.pointer.expiresAt > this.now() ? this.pointer : null,
      highlight: this.highlight && this.highlight.expiresAt > this.now() ? this.highlight : null };
  }
  sizes(role: ServiceRole) { const sizes = this.dice.getSizes(); return role === "dm" ? sizes : { revision: sizes.revision, dm: 1, player: sizes.player }; }
  transportSequence(role: ServiceRole) { return ++this.sequence[role]; }
  private event(type: TableEvent["type"], role: ServiceRole, payload?: unknown): TableEvent {
    return { protocolVersion: 1, epoch: this.epoch, context: this.context, revision: this.revision, serverTime: this.now(), sequence: this.transportSequence(role), type, ...(payload === undefined ? {} : { payload }) };
  }
  emit(type: TableEvent["type"], payload: unknown, role?: ServiceRole): void {
    for (const audience of role ? [role] : ["dm", "player"] as const) {
      const event = this.event(type, audience, payload);
      for (const c of this.connections.values()) if (c.role === audience) c.emit(event);
    }
  }
  connect(owner: string, role: ServiceRole, emit: Connection["emit"], participant?: string): { id: string; close: () => void } {
    // HTTP reemplaza el stream anterior de esta sesión antes de conectar.
    const id = this.id();
    this.connections.set(id, { id, owner, role, participant, emit, report: null, ready: false, imageStatus: this.snapshot ? "loading" : "waiting", lastReport: -Infinity });
    emit({ ...this.event("bootstrap", role), state: this.state(role, id) });
    this.emit("presence", this.presence(), "dm");
    return { id, close: () => {
      const wasPrimary = this.primary?.id === id;
      if (!this.connections.delete(id)) return;
      const promoted = wasPrimary ? this.primary : null;
      if (promoted) { promoted.report = null; promoted.ready = false; }
      this.emit("presence", this.presence(), "dm");
      // Solicitar confirmación actual sin una nueva orden ni cambiar navegación local.
      if (promoted) promoted.emit({ ...this.event("bootstrap", "player"), state: this.state("player", promoted.id) });
    } };
  }
  publish(snapshot: PlayerWindowSnapshot | null): void {
    const identity = snapshot ? JSON.stringify([snapshot.scene.id, snapshot.scene.activeMapId, snapshot.cameraSyncKey ?? 0]) : "";
    const changed = this.context === null || identity !== this.identity;
    const projected = snapshot ? publicTableProjection(snapshot, this.assetUrl) : null;
    const changedImage = this.snapshot?.mapImageUrl !== projected?.snapshot.mapImageUrl;
    if (changed) {
      this.context = this.id(); this.command = null; this.pointer = null; this.highlight = null;
      for (const c of this.connections.values()) { c.report = null; c.ready = false; c.lastReport = -Infinity; }
      // Invalidar la finalización pendiente antes de recibir el contexto de dados nuevo.
      this.dice.setContext({ token: this.context, sceneId: "", mapId: "", sceneName: "", mapName: "" });
    }
    this.identity = identity; this.snapshot = projected?.snapshot ?? null; this.assets = projected?.assets ?? new Set(); this.camera = snapshot?.camera ?? null; this.revision++;
    if (changed || changedImage) for (const c of this.connections.values()) { c.ready = false; c.imageStatus = this.snapshot ? "loading" : "waiting"; }
    for (const role of ["dm", "player"] as const) this.emit("scene", this.state(role), role);
  }
  check(context: string | null) { if (context !== this.context) throw new TableConflict("El contexto cambió. Espera la publicación actual."); }
  connection(owner: string, id: string | undefined): Connection {
    const c = id ? this.connections.get(id) : undefined;
    if (!c || c.owner !== owner || c.role !== "player") throw new TableConflict("La conexión ya no está activa.");
    return c;
  }
  setCamera(camera: ViewportCameraSnapshot) { this.camera = camera; this.emit("camera", camera); }
  setCommand(command: PlayerCameraCommand) {
    if (this.command && command.revision <= this.command.revision) throw new TableConflict("Orden de cámara obsoleta.");
    this.command = command; this.camera = command.camera; this.emit("camera-command", command);
  }
  report(owner: string, id: string | undefined, value: PlayerCameraReport) {
    const c = this.connection(owner, id);
    if ((value.viewport?.mapId !== undefined && value.viewport.mapId !== this.snapshot?.scene.activeMapId) || (value.acknowledgedCommandRevision !== null && value.acknowledgedCommandRevision !== this.command?.revision)) throw new TableConflict("Reporte de cámara obsoleto.");
    if (value.reportRevision <= (c.report?.reportRevision ?? -1)) throw new TableConflict("Reporte fuera de orden.");
    if (!value.final && this.now() - c.lastReport < 100) throw new TableConflict("Espera antes de enviar otro reporte.");
    c.lastReport = this.now(); c.report = value;
    if (c.id === this.primary?.id) this.emit("presence", this.presence(), "dm");
  }
  ready(owner: string, id: string | undefined, revision: number | undefined) {
    const c = this.connection(owner, id);
    if (revision !== this.revision || !this.snapshot || (this.snapshot.mapImageUrl && c.imageStatus !== "ready")) throw new TableConflict("La proyección actual aún está cargando.");
    c.ready = true; c.imageStatus = "ready"; this.emit("presence", this.presence(), "dm");
  }
  imageStatus(owner: string, id: string | undefined, revision: number | undefined, report: { imageUrl: string; ok: boolean }) {
    const c = this.connection(owner, id);
    if (revision !== this.revision || report.imageUrl !== this.snapshot?.mapImageUrl) throw new TableConflict("La imagen ya no pertenece a la proyección.");
    c.imageStatus = report.ok ? "ready" : "error"; c.ready = false;
    if (c.id === this.primary?.id) { this.emit("image-status", { imageUrl: report.imageUrl, ok: report.ok, ...(report.ok ? {} : { error: "El jugador no pudo cargar la imagen. Reemplázala o reintenta." }) }, "dm"); this.emit("presence", this.presence(), "dm"); }
  }
  setPointer(value: NonNullable<TableState["pointer"]>["value"]) { this.pointer = { value, startedAt: this.now(), expiresAt: this.now() + value.durationMs }; this.emit("pointer", this.pointer); }
  setHighlight(value: NonNullable<TableState["highlight"]>["value"]) { this.highlight = { value, startedAt: this.now(), expiresAt: this.now() + 5000 }; this.emit("highlight", this.highlight); }
  checkOnce(owner: string, requestId: string, fingerprint: string): boolean {
    const old = this.dedup.get(`${owner}:${requestId}`);
    if (!old || old.until <= this.now()) return false;
    if (old.fingerprint !== fingerprint) throw new TableConflict("El identificador ya se usó con otro contenido.");
    return true;
  }
  once(owner: string, requestId: string, fingerprint: string, run: () => unknown, role: ServiceRole = "dm"): unknown {
    for (const [key, entry] of this.dedup) if (entry.until <= this.now()) {
      this.dedup.delete(key); this.dedupBudgets[entry.role].bytes -= entry.bytes; this.dedupBudgets[entry.role].count--;
    }
    const key = `${owner}:${requestId}`, old = this.dedup.get(key);
    if (old) { if (old.fingerprint !== fingerprint) throw new TableConflict("El identificador ya se usó con otro contenido."); return old.result; }
    // Los reportes públicos no pueden consumir la reserva de órdenes del DM.
    const budget = this.dedupBudgets[role];
    const byteLimit = (role === "dm" ? 64 : 8) * 1024 * 1024;
    if (budget.count >= 20000 || budget.bytes >= byteLimit) throw new TableConflict("Demasiadas operaciones pendientes de deduplicación. Espera cinco minutos.");
    const result = run(); const bytes = new TextEncoder().encode(JSON.stringify(result)).length;
    budget.bytes += bytes; budget.count++;
    this.dedup.set(key, { fingerprint, result, until: this.now() + 300000, bytes, role }); return result;
  }
}
