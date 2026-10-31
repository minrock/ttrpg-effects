import type { PlayerWindowSnapshot } from "../../domain/player/player-window";
import type { OwnedTransaction } from "./owned-store";
import { OwnedError } from "./owned-store";
import { TableSession } from "./table-session";
import { publicTableProjection } from "./public-table-projection";
export interface GameContext { readonly ownerId: string; readonly gameId: string; readonly openingId: string; readonly generation: number }
/** Primitivas para009/010; ninguna ruta invitada montada en008. Un registro por proceso API. */
export class GameRuntimeRegistry {
  private readonly entries = new Map<string, TableSession>();
  constructor(private readonly now: () => number, private readonly id: () => string) {}
  private key(context: GameContext) { return JSON.stringify([context.ownerId, context.gameId, context.openingId, context.generation]); }
  async context(tx: OwnedTransaction, owner: string, gameId: string): Promise<GameContext> {
    const game = await tx.games.find(owner, gameId), opening = game ? await tx.openings.current(gameId) : null;
    if (!game || game.state !== "ready" || !opening || opening.state !== "open" || Date.parse(opening.leaseExpiresAt) <= this.now()) throw new OwnedError("NOT_FOUND");
    return Object.freeze({ ownerId: owner, gameId, openingId: opening.id, generation: opening.generation });
  }
  /** Ejecutar dentro de identity.authorized: la revalidación comparte exclusión con archivo/borrado. */
  async publish(tx: OwnedTransaction, context: GameContext, snapshot: PlayerWindowSnapshot | null, sceneResourceId?: string): Promise<void> {
    const current = await this.context(tx, context.ownerId, context.gameId);
    if (this.key(current) !== this.key(context)) throw new OwnedError("CONFLICT");
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
      let runtime = this.entries.get(key);
      if (!runtime) { runtime = new TableSession(this.now, this.id); this.entries.set(key, runtime); }
      runtime.publish(prepared);
    }, () => { this.entries.delete(key); });
  }
  /** Esta comprobación sola no autoriza invitados:009/010 deben validar credencial, lease y generación. */
  allows(context: GameContext, reference: string): boolean { return this.entries.get(this.key(context))?.allows(reference) ?? false; }
  state(context: GameContext) { return this.entries.get(this.key(context))?.state("dm") ?? null; }
  discard(context: GameContext): void { const key = this.key(context); this.entries.get(key)?.publish(null); this.entries.delete(key); }
  clear(): void { for (const runtime of this.entries.values()) runtime.publish(null); this.entries.clear(); }
}
