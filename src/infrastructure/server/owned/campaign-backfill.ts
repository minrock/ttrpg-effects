import { randomUUID } from "node:crypto";
import type { SqlConnection } from "../database/driver";

/**
 * Backfill aditivo de la migración 9. No lee ni reescribe bodies, bindings,
 * borradores, invitaciones ni aperturas: solo refleja enlaces ya existentes.
 */
export async function backfillCampaignHierarchy(connection: SqlConnection): Promise<void> {
  const games = (await connection.query("SELECT id,owner_id,created_at,updated_at FROM ttrpg_games ORDER BY owner_id,id")).rows;
  for (const game of games) {
    const owner = String(game.owner_id), gameId = String(game.id), createdAt = String(game.created_at), updatedAt = String(game.updated_at);
    await connection.query("INSERT INTO campaign_details(owner_id,game_id,description,cover_asset_id) VALUES($1,$2,'',NULL) ON CONFLICT(owner_id,game_id) DO NOTHING", [owner, gameId]);
    let arc = (await connection.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND initial_game_id=$2", [owner, gameId])).rows[0];
    if (!arc) {
      const id = randomUUID();
      await connection.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,$4,'',NULL,1,$5,$6,$7) ON CONFLICT(owner_id,initial_game_id) DO NOTHING", [owner, id, gameId, "Arco inicial", createdAt, updatedAt, gameId]);
      arc = (await connection.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND initial_game_id=$2", [owner, gameId])).rows[0];
    }
    if (!arc) throw new Error("No se pudo crear el arco inicial.");
    await connection.query("INSERT INTO arc_scenes(owner_id,arc_id,kind,scene_id) SELECT owner_id,$1,'scenes',resource_id FROM game_resources WHERE owner_id=$2 AND game_id=$3 AND kind='scenes' ON CONFLICT(owner_id,arc_id,scene_id) DO NOTHING", [String(arc.id), owner, gameId]);
  }
}
