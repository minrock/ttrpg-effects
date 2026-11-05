import { measureDistance, measurePathDistance, worldLengthLabel } from "../../domain/measurement/measurement";
import type { SceneGrid, SceneSettings } from "../../domain/sessions/scene-document";
import { annotationCommandSchema, type AnnotationCommand, type AnnotationState, type SharedAnnotation } from "../../shared/contracts/shared-annotations";
export class AnnotationError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
interface Author { participant: string; alias: string; discriminator: number; expiresAt: number }
interface Entry { owner: string; item: SharedAnnotation }
interface Preview extends Entry { connection: string }
/** Capa efímera: no conoce SQL, escena persistida ni transporte. */
export class SharedAnnotations {
  private items = new Map<string, Entry>();
  private previews = new Map<string, Preview>();
  private authors = new Map<string, { id: string; credentials: Map<string, number> }>();
  private removed = new Set<string>();
  private rates = new Map<string, { at: number; tokens: number; previewAt: number }>();
  private sequence = 0;
  sceneId: string | null = null;
  private rules: { grid: SceneGrid; settings: SceneSettings } | null = null;
  configure(grid: SceneGrid, settings: SceneSettings) { this.rules = { grid, settings }; }
  private measured(item: SharedAnnotation): SharedAnnotation {
    if (!this.rules) return item;
    const { grid, settings } = this.rules, geometry = item.geometry;
    let measurementLabel: string;
    switch (geometry.type) {
      case "measurement": measurementLabel = measureDistance(geometry.points[0], geometry.points[1], { grid, diagonalMode: settings.diagonalMode }).label; break;
      case "path": measurementLabel = measurePathDistance(geometry.points, { grid, diagonalMode: settings.diagonalMode }).label; break;
      case "circle": measurementLabel = worldLengthLabel(geometry.radius, grid); break;
      case "rectangle": measurementLabel = `${worldLengthLabel(geometry.width, grid)} × ${worldLengthLabel(geometry.height, grid)}`; break;
      case "cone": measurementLabel = `${Math.round(geometry.angle)}° · ${worldLengthLabel(geometry.radius, grid)}`; break;
    }
    return { ...item, measurementLabel };
  }
  constructor(private readonly now: () => number, private readonly id: () => string, private readonly changed: () => void) {}
  private notify() { this.sequence++; this.changed(); }
  reset() { this.items.clear(); this.previews.clear(); this.authors.clear(); this.removed.clear(); this.rates.clear(); this.sequence++; }
  register(author: Author, credential: string) {
    let known = this.authors.get(author.participant);
    if (!known) { if (this.authors.size >= 1000) throw new AnnotationError(429, "RATE_LIMITED", "La mesa alcanzó su límite de autores."); known = { id: this.id(), credentials: new Map() }; this.authors.set(author.participant, known); }
    known.credentials.set(credential, author.expiresAt);
    return known.id;
  }
  expire() {
    let dirty = false;
    for (const [owner, author] of this.authors) {
      for (const [key, until] of author.credentials) if (until <= this.now()) author.credentials.delete(key);
      if (!author.credentials.size) { this.removeOwner(owner); dirty = true; }
    }
    for (const [owner, preview] of this.previews) if ((preview.item.expiresAt ?? 0) <= this.now()) { this.previews.delete(owner); dirty = true; }
    if (dirty) this.notify();
  }
  private removeOwner(owner: string) {
    this.previews.delete(owner); this.authors.delete(owner); this.rates.delete(owner);
    for (const [id, entry] of this.items) if (entry.owner === owner) { this.items.delete(id); this.tombstone(id); }
  }
  revoke(owner: string) { this.removeOwner(owner); this.notify(); }
  disconnect(connection: string) { for (const [owner, preview] of this.previews) if (preview.connection === connection) { this.previews.delete(owner); this.notify(); } }
  cancelPreviews() { if (this.previews.size) { this.previews.clear(); this.notify(); } }
  state(participant?: string): AnnotationState {
    const previews = [...this.previews.values()]; const replaced = new Set(previews.map(p => p.item.id));
    return { version: 1, serverTime: this.now(), sceneId: this.sceneId, sequence: this.sequence, self: participant ? this.authors.get(participant)?.id ?? null : null,
      items: structuredClone([...this.items.values()].filter(e => !replaced.has(e.item.id)).map(e => e.item).concat(previews.map(e => e.item)).map(item => this.measured(item))) };
  }
  private tombstone(id: string) { this.removed.add(id); /* Acotado junto al presupuesto de creación del contexto. */ }
  execute(input: AnnotationCommand, actor: Author | null, credential: string, connection: string) {
    const command = annotationCommandSchema.parse(input); this.expire();
    if (!actor && !["delete", "clear-all"].includes(command.action) || actor && command.action === "clear-all") throw new AnnotationError(403, "FORBIDDEN", "No puedes modificar ese dibujo.");
    const owner = actor?.participant ?? "dm";
    const rate = this.rates.get(owner) ?? { at: this.now(), tokens: 20, previewAt: -Infinity };
    if (command.action === "preview") {
      if (this.now() - rate.previewAt < 95) throw new AnnotationError(429, "RATE_LIMITED", "Espera antes de actualizar el dibujo.");
      rate.previewAt = this.now();
    } else {
      rate.tokens = Math.min(20, rate.tokens + (this.now() - rate.at) / 100); rate.at = this.now();
      if (rate.tokens < 1) throw new AnnotationError(429, "RATE_LIMITED", "Demasiadas operaciones de dibujo. Espera un momento.");
      rate.tokens--;
    }
    this.rates.set(owner, rate);
    const publicId = actor ? this.register(actor, credential) : null;
    const existing = "id" in command ? this.items.get(command.id) : undefined;
    const conflict = () => { throw new AnnotationError(409, "ANNOTATION_CONFLICT", "El dibujo cambió. Consulta el estado actual antes de reintentar."); };
    if ("id" in command && this.removed.has(command.id)) conflict();
    if (existing && actor && existing.owner !== owner) throw new AnnotationError(403, "FORBIDDEN", "Solo puedes editar tus dibujos.");
    if ((command.action === "update" || command.action === "delete") && !existing) conflict();
    if ("revision" in command && command.revision !== (existing?.item.revision ?? 0)) conflict();
    if (command.action === "create" && existing) conflict();
    const active = this.previews.get(owner);
    if (active && active.connection !== connection && !["clear-own", "delete"].includes(command.action)) conflict();
    if (command.action === "cancel-preview") { this.previews.delete(owner); this.notify(); return; }
    if (command.action === "delete") {
      this.items.delete(command.id); this.tombstone(command.id);
      for (const [key, preview] of this.previews) if (preview.item.id === command.id) this.previews.delete(key);
    } else if (command.action === "clear-all" || command.action === "clear-own") {
      for (const [id, entry] of this.items) if (!actor || entry.owner === owner) { this.items.delete(id); this.tombstone(id); }
      if (actor) this.previews.delete(owner); else this.previews.clear();
    } else {
      if (!existing && (this.items.size >= 256 || [...this.items.values()].filter(e => e.owner === owner).length >= 32 || this.removed.size + this.items.size >= 20000)) throw new AnnotationError(429, "ANNOTATION_LIMIT", "Límite de dibujos alcanzado. Borra o limpia tus dibujos.");
      if (!existing && [...this.previews.values()].some(p => p.owner !== owner && p.item.id === command.id)) conflict();
      const item: SharedAnnotation = { id: command.id, revision: existing ? existing.item.revision + (command.action === "preview" ? 0 : 1) : command.action === "preview" ? 0 : 1,
        author: existing?.item.author ?? { publicId: publicId!, alias: actor!.alias, discriminator: actor!.discriminator }, geometry: command.geometry, ...(command.action === "preview" && existing ? { committedGeometry: existing.item.geometry } : {}), preview: command.action === "preview", ...(command.action === "preview" ? { expiresAt: this.now() + 3000 } : {}) };
      if (new TextEncoder().encode(JSON.stringify(this.state()) + JSON.stringify(item)).length > 512 * 1024) throw new AnnotationError(429, "ANNOTATION_LIMIT", "La mesa alcanzó el límite de dibujos. Limpia figuras antes de continuar.");
      if (command.action === "preview") this.previews.set(owner, { owner, connection, item });
      else { this.items.set(command.id, { owner, item }); this.previews.delete(owner); }
    }
    this.notify();
  }
}
