import { randomUUID } from "node:crypto";
import { sceneDocumentV2Schema } from "../../../domain/sessions/scene-schema";
import { resourceBindingsSchema } from "../../../domain/systems/system-catalog";
import { preparedEntitySnapshotSchema, type PreparedEntitySnapshot } from "../../../shared/contracts/campaigns";
import type { SqlConnection } from "../database/driver";

/** Copia conservadora de fichas ya materializadas: no altera la escena ni sus bindings. */
export async function backfillArcPreparations(connection: SqlConnection, ids: () => string = randomUUID): Promise<void> {
  const rows = (await connection.query("SELECT s.owner_id,s.arc_id,s.scene_id,r.body,r.bindings,r.created_at,r.updated_at FROM arc_scenes s JOIN owned_resources r ON r.owner_id=s.owner_id AND r.kind=s.kind AND r.id=s.scene_id ORDER BY s.owner_id,s.arc_id,s.scene_id")).rows;
  for (const row of rows) {
    let scene: ReturnType<typeof sceneDocumentV2Schema.parse>, bindings: ReturnType<typeof resourceBindingsSchema.parse>;
    try { scene = sceneDocumentV2Schema.parse(JSON.parse(String(row.body)).scene); bindings = resourceBindingsSchema.parse(JSON.parse(String(row.bindings))); }
    catch { throw new Error("La escena histórica no tiene un documento o bindings válidos."); }
    const owner = String(row.owner_id), arcId = String(row.arc_id), sceneId = String(row.scene_id);
    const entities: Array<{ kind: "npc" | "monster"; id: string; name: string; imagePath: string | null; notes: string; templateId?: string | null }> = [
      ...scene.sceneAside.npcs.map(value => ({ kind: "npc" as const, ...value })),
      ...scene.sceneAside.monsters.map(value => ({ kind: "monster" as const, ...value }))
    ];
    for (const entity of entities) {
      const binding = entity.kind === "monster" ? bindings.monsters[entity.id] : null;
      if (entity.kind === "monster" && !binding) throw new Error("El monstruo histórico no conserva su binding.");
      const snapshot: PreparedEntitySnapshot = entity.kind === "npc"
        ? { version: 2, kind: "npc", name: entity.name, imagePath: entity.imagePath, notes: entity.notes }
        : { version: 2, kind: "monster", name: entity.name, imagePath: entity.imagePath, notes: entity.notes, templateId: entity.templateId ?? null, binding: binding! };
      preparedEntitySnapshotSchema.parse(snapshot);
      let prepared = (await connection.query("SELECT id FROM arc_preparations WHERE owner_id=$1 AND arc_id=$2 AND source_scene_id=$3 AND kind=$4 AND source_entity_id=$5", [owner, arcId, sceneId, entity.kind, entity.id])).rows[0];
      if (!prepared) {
        const id = ids(), createdAt = String(row.created_at), updatedAt = String(row.updated_at);
        await connection.query("INSERT INTO arc_preparations(owner_id,id,arc_id,kind,name,image_path,notes,template_id,binding,source_scene_id,source_kind,source_entity_id,revision,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,$13,$14)", [owner, id, arcId, entity.kind, entity.name, entity.imagePath, entity.notes, entity.kind === "monster" ? entity.templateId ?? null : null, binding ? JSON.stringify(binding) : null, sceneId, entity.kind, entity.id, createdAt, updatedAt]);
        prepared = { id };
      }
      const aliases = (await connection.query("SELECT i.snapshot,i.binding,p.source_scene_id,p.source_kind,p.source_entity_id FROM scene_preparation_instances i JOIN arc_preparations p ON p.owner_id=i.owner_id AND p.id=i.prepared_id WHERE i.owner_id=$1 AND i.scene_id=$2 AND i.kind=$3 AND i.entity_id=$4", [owner, sceneId, entity.kind, entity.id])).rows;
      for (const alias of aliases) {
        if (alias.source_scene_id !== sceneId || alias.source_kind !== entity.kind || alias.source_entity_id !== entity.id || String(alias.snapshot) !== JSON.stringify(snapshot) || (alias.binding === null ? null : String(alias.binding)) !== (binding ? JSON.stringify(binding) : null)) throw new Error("Alias histórico de preparación contradictorio.");
      }
      await connection.query("INSERT INTO scene_preparation_instances(owner_id,scene_kind,scene_id,prepared_id,kind,entity_id,snapshot,binding) VALUES($1,'scenes',$2,$3,$4,$5,$6,$7) ON CONFLICT(owner_id,scene_id,prepared_id) DO NOTHING", [owner, sceneId, String(prepared.id), entity.kind, entity.id, JSON.stringify(snapshot), binding ? JSON.stringify(binding) : null]);
    }
  }
}
