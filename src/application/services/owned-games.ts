import type { OwnedTransaction, OwnedGameCatalog } from "./owned-store";
import { OwnedError } from "./owned-store";
import { CatalogError } from "./game-catalog";
/** Solo contexto derivado por el servidor; las rutas no reciben ownerId del cliente. */
export function ownedGames(owner: string, tx: OwnedTransaction): OwnedGameCatalog {
  return {
    create: (name, systemRef) => tx.games.create(owner, name, systemRef), find: id => tx.games.find(owner, id), list: page => tx.games.list(owner, page),
    async update(id, patch, revision) {
      const current = await tx.games.find(owner, id);
      if (!current) throw new OwnedError("NOT_FOUND");
      // Una revisión obsoleta prevalece sobre los guardas de estado: conserva el
      // contrato optimista de los clientes heredados antes de evaluar la mutación.
      if (current.revision !== revision) throw new CatalogError("REVISION_CONFLICT");
      // Una campaña inactiva sólo acepta su reactivación explícita. No se permite
      // aprovechar el PATCH heredado para cambiar nombre y estado a la vez.
      if (current.state === "archived") {
        if (patch.state !== "ready" || Object.keys(patch).length !== 1) throw new OwnedError("CAMPAIGN_INACTIVE");
      }
      // D-05: archivar equivale a inactivar y exige cierre explícito, nunca invalidación implícita.
      if (patch.state === "archived" && (await tx.openings.current(id))?.state === "open") throw new OwnedError("CAMPAIGN_OPEN");
      const game = await tx.games.update(owner, id, patch, revision); if (!game) throw new OwnedError("NOT_FOUND"); return game;
    },
    async delete(id, revision) {
      const current = await tx.games.find(owner, id);
      if (!current) throw new OwnedError("NOT_FOUND");
      if (current.state === "archived") throw new OwnedError("CAMPAIGN_INACTIVE");
      if ((await tx.openings.current(id))?.state === "open") throw new OwnedError("CAMPAIGN_OPEN");
      if (!await tx.games.delete(owner, id, revision)) throw new OwnedError("NOT_FOUND");
    }
  };
}
