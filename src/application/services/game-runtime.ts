import type { PlayerWindowSnapshot } from "../../domain/player/player-window";
import type { OwnedTransaction } from "./owned-store";
import { OwnedError } from "./owned-store";
import { TableSession } from "./table-session";
import { publicTableProjection } from "./public-table-projection";
export interface GameContext { readonly ownerId: string; readonly gameId: string; readonly openingId: string; readonly generation: number; readonly leaseExpiresAt?: string }
/** Primitivas para009/010; ninguna ruta invitada montada en008. Un registro por proceso API. */
export class GameRuntimeRegistry {
  private readonly contexts = new Map<string, GameContext>();
  private readonly streams = new Map<string, { context: GameContext; credential: string; participant?: string; role: "dm" | "player"; close: (reason: "access-ended" | "replaced" | "unavailable") => void }>();
  private readonly transfers = new Set<{ context: GameContext; participant: string; close: () => void }>();
  private readonly requests = new Set<{ context: GameContext; principal: string; role: "dm" | "player"; participant?: string; expiresAt?: string; close(): void }>();
  get pendingRequests() { return this.requests.size; }
  request(context: GameContext, principal: string, role: "dm" | "player", close: () => void, participant?: string, expiresAt?: string) {
    const all = [...this.requests], local = all.filter(r => this.key(r.context) === this.key(context));
    const principalCount = all.filter(r => r.role === role && (role === "dm" ? r.context.ownerId === context.ownerId : r.principal === principal)).length;
    // Hasta48 solicitudes autorizadas;16 reservadas aDM y espacio para autenticar dentro de la cota HTTP64.
    if (all.length >= 48 || principalCount >= (role === "dm" ? 8 : 4) || local.filter(r => r.role === role).length >= (role === "dm" ? 8 : 12) || role === "player" && all.filter(r => r.role === "player").length >= 32) throw new OwnedError("OPERATION_BUDGET");
    const entry = { context, principal, role, participant, expiresAt, close }; this.requests.add(entry);
    return () => { this.requests.delete(entry); };
  }
  private cancelRequests(predicate: (r: { context: GameContext; principal: string; role: "dm" | "player"; participant?: string; expiresAt?: string }) => boolean) { for (const request of [...this.requests]) if (predicate(request)) { this.requests.delete(request); request.close(); } }
  track(context: GameContext, participant: string, close: () => void) { const entry = { context, participant, close }; this.transfers.add(entry); return () => { this.transfers.delete(entry); }; }
  private readonly presenceRevisions = new Map<string, number>();
  private presenceChanged(context: GameContext) { const key = this.key(context); this.presenceRevisions.set(key, (this.presenceRevisions.get(key) ?? 0) + 1); }
  private readonly entries = new Map<string, TableSession>();
  constructor(private readonly now: () => number, private readonly id: () => string) {}
  private key(context: GameContext) { return JSON.stringify([context.ownerId, context.gameId, context.openingId, context.generation]); }
  async context(tx: OwnedTransaction, owner: string, gameId: string): Promise<GameContext> {
    const game = await tx.games.find(owner, gameId), opening = game ? await tx.openings.current(gameId) : null;
    if (!game || game.state !== "ready" || !opening || opening.state !== "open" || Date.parse(opening.leaseExpiresAt) <= this.now()) throw new OwnedError("NOT_FOUND");
    return Object.freeze({ ownerId: owner, gameId, openingId: opening.id, generation: opening.generation, leaseExpiresAt: opening.leaseExpiresAt });
  }
  renew(opening: import("./owned-store").Opening) { for (const r of this.requests) if (r.context.openingId === opening.id && r.context.gameId === opening.gameId) r.context = { ...r.context, leaseExpiresAt: opening.leaseExpiresAt }; for (const [key, context] of this.contexts) if (context.openingId === opening.id && context.gameId === opening.gameId) this.contexts.set(key, { ...context, leaseExpiresAt: opening.leaseExpiresAt }); }
  expire() { this.cancelRequests(r => !!(r.expiresAt && Date.parse(r.expiresAt) <= this.now() || r.context.leaseExpiresAt && Date.parse(r.context.leaseExpiresAt) <= this.now())); for (const context of [...this.contexts.values()]) if (context.leaseExpiresAt && Date.parse(context.leaseExpiresAt) <= this.now()) this.discard(context); }
  runtime(context: GameContext): TableSession {
    this.expire();
    const key = this.key(context);
    for (const [other, value] of this.contexts) if (value.gameId === context.gameId && other !== key) this.discard(value);
    let value = this.entries.get(key);
    if (!value) {
      if (this.entries.size >= 32) throw new OwnedError("OPERATION_BUDGET");
      value = new TableSession(this.now, this.id, reference => /^asset:[a-f0-9-]{36}$/.test(reference) ? `/api/v1/games/${context.gameId}/assets/${reference.slice(6)}` : null);
      this.entries.set(key, value); this.contexts.set(key, Object.freeze({ ...context }));
    }
    this.contexts.set(key, Object.freeze({ ...context }));
    return value;
  }
  register(context: GameContext, key: string, role: "dm" | "player", close: (reason: "access-ended" | "replaced" | "unavailable") => void, participant?: string) {
    const scoped = this.key(context) + key;
    this.streams.get(scoped)?.close("replaced");
    const local = [...this.streams.values()].filter(s => this.key(s.context) === this.key(context));
    if (this.streams.size >= 64 || local.length >= 32 || role === "player" && ([...this.streams.values()].filter(s => s.role === "player").length >= 56 || local.filter(s => s.role === "player").length >= 28)) throw new OwnedError("OPERATION_BUDGET");
    const entry = { context, credential: key, participant, role, close }; this.streams.set(scoped, entry); if (role === "player") this.presenceChanged(context);
    return () => { if (this.streams.get(scoped) === entry) { this.streams.delete(scoped); if (role === "player") this.presenceChanged(context); } };
  }
  connected(context: GameContext, participant: string) { return [...this.streams.values()].some(s => this.key(s.context) === this.key(context) && s.participant === participant); }
  presenceSequence(context: GameContext) { return this.presenceRevisions.get(this.key(context)) ?? 0; }
  discardOwner(owner: string) { this.cancelRequests(r => r.context.ownerId === owner); for (const context of [...this.contexts.values()]) if (context.ownerId === owner) this.discard(context); }
  revokeHost(owner: string, session?: string) { this.cancelRequests(r => r.context.ownerId === owner && r.role === "dm" && (!session || r.principal === session)); for (const s of [...this.streams.values()]) if (s.context.ownerId === owner && s.role === "dm" && (!session || s.credential === session)) s.close("access-ended"); }
  discardGame(game: string) { this.cancelRequests(r => r.context.gameId === game); for (const context of [...this.contexts.values()]) if (context.gameId === game) this.discard(context); }
  leave(game: string, participant: string) { this.cancelRequests(r => r.context.gameId === game && r.participant === participant); for (const t of [...this.transfers]) if (t.context.gameId === game && t.participant === participant) t.close(); for (const s of [...this.streams.values()]) if (s.context.gameId === game && s.participant === participant) s.close("access-ended"); }
  revoke(context: GameContext, participant: string) { this.cancelRequests(r => this.key(r.context) === this.key(context) && r.participant === participant); for (const t of [...this.transfers]) if (this.key(t.context) === this.key(context) && t.participant === participant) t.close(); for (const s of [...this.streams.values()]) if (this.key(s.context) === this.key(context) && s.participant === participant) s.close("access-ended"); }
  /** Ejecutar dentro de identity.authorized: la revalidación comparte exclusión con archivo/borrado. */
  async publish(tx: OwnedTransaction, context: GameContext, snapshot: PlayerWindowSnapshot | null, sceneResourceId?: string, operation?: { owner: string; id: string; fingerprint: string }): Promise<void> {
    const current = await this.context(tx, context.ownerId, context.gameId);
    if (this.key(current) !== this.key(context)) throw new OwnedError("CONFLICT");
    if (operation) {
      try { if (this.entries.get(this.key(context))?.checkOnce(operation.owner, operation.id, operation.fingerprint)) return; }
      catch { throw new OwnedError("OPERATION_CONTENT_CONFLICT"); }
    }
    const prepared = structuredClone(snapshot);
    if (prepared) for (const asset of publicTableProjection(prepared).assets) if (!await tx.assets.has(asset.slice(6))) throw new OwnedError("NOT_FOUND");
    if (prepared?.scene.sceneAside.monsters.length && !sceneResourceId) throw new OwnedError("VALIDATION");
    if (sceneResourceId && prepared) {
      const resource = await tx.resources.get("scenes",sceneResourceId); if (!resource) throw new OwnedError("NOT_FOUND");
      const references = (scene: PlayerWindowSnapshot["scene"]) => JSON.stringify(scene.sceneAside.monsters.map(m=>[m.id,m.templateId]).sort());
      if (references(resource.value.scene) !== references(prepared.scene)) throw new OwnedError("VALIDATION");
      await tx.links.link(context.gameId,"scenes",sceneResourceId);
      tx.effects.beforeCommit(async () => {
        const final = await tx.resources.get("scenes",sceneResourceId);
        if (!final || references(final.value.scene) !== references(prepared.scene)) throw new OwnedError("CONFLICT");
        await tx.links.validate(context.gameId,"scenes",sceneResourceId);
      });
    }
    const key = this.key(context);
    // Revalidar también si el mismo callback cerró/archivó después de preparar la publicación.
    tx.effects.beforeCommit(async () => {
      if (this.key(await this.context(tx, context.ownerId, context.gameId)) !== key) throw new OwnedError("CONFLICT");
    });
    tx.effects.afterCommit(() => {
      const table = this.runtime(context);
      if (operation) table.once(operation.owner, operation.id, operation.fingerprint, () => { table.publish(prepared); return { ok: true }; });
      else table.publish(prepared);
    }, () => { this.discard(context); });
  }
  /** Esta comprobación sola no autoriza invitados:009/010 deben validar credencial, lease y generación. */
  allows(context: GameContext, reference: string): boolean { return this.entries.get(this.key(context))?.allows(reference) ?? false; }
  state(context: GameContext) { return this.entries.get(this.key(context))?.state("dm") ?? null; }
  discard(context: GameContext): void { this.cancelRequests(r => this.key(r.context) === this.key(context)); for (const t of [...this.transfers]) if (this.key(t.context) === this.key(context)) t.close(); const key = this.key(context); for (const s of [...this.streams.values()]) if (this.key(s.context) === key) s.close("access-ended"); this.entries.delete(key); this.contexts.delete(key); this.presenceRevisions.delete(key); }
  clear(): void { this.cancelRequests(() => true); for (const t of [...this.transfers]) t.close(); for (const s of [...this.streams.values()]) s.close("unavailable"); this.entries.clear(); this.contexts.clear(); this.presenceRevisions.clear(); }
}
