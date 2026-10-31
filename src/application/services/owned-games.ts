import type { OwnedTransaction, OwnedGameCatalog } from "./owned-store";
import { OwnedError } from "./owned-store";
/** Solo contexto derivado por el servidor; las rutas no reciben ownerId del cliente. */
export function ownedGames(owner: string, tx: OwnedTransaction): OwnedGameCatalog {
  return {
    create: (name, systemRef) => tx.games.create(owner, name, systemRef), find: id => tx.games.find(owner, id), list: page => tx.games.list(owner, page),
    async update(id, patch, revision) {
      if (patch.state === "archived") await tx.openings.invalidate(id);
      const game = await tx.games.update(owner, id, patch, revision); if (!game) throw new OwnedError("NOT_FOUND"); return game;
    },
    async delete(id, revision) {
      await tx.openings.invalidate(id);
      if (!await tx.games.delete(owner, id, revision)) throw new OwnedError("NOT_FOUND");
    }
  };
}
