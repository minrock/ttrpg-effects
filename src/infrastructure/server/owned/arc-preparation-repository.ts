import { z } from "zod";
import type { ArcPreparationRepository } from "../../../application/services/arc-preparation";
import { OwnedError } from "../../../application/services/owned-store";
import type { DefinitionRef } from "../../../domain/systems/system-catalog";
import { snapshotPreparedEntity } from "../../../domain/campaigns/arc-preparation";
import { stable } from "./system-data";
import type { CatalogClock, Execute } from "../database/catalog-repository";
import type { Row } from "../database/driver";
import {
  campaignIdSchema, arcIdSchema, preparedEntityDtoSchema, preparedEntityIdSchema, preparedEntityListQuerySchema,
  createPreparedEntityInputSchema, updatePreparedEntityInputSchema, scenePreparationReservationSchema,
  type CampaignPage, type PreparedEntityDto, type ScenePreparationReservationDto
} from "../../../shared/contracts/campaigns";
import { sceneDocumentV2Schema } from "../../../domain/sessions/scene-schema";

const sceneIdSchema = z.uuid();
const page = <T>(items: readonly T[], total: number, limit: number, offset: number): CampaignPage<T> => ({ items, total, limit, offset });
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => { const result = schema.safeParse(value); if (!result.success) throw new OwnedError("VALIDATION"); return result.data; };

export interface ArcPreparationDependencies { readonly validateNewMonster: (campaignId: string, templateId: string, binding: DefinitionRef) => Promise<void>; readonly assertSceneWritable: (sceneId: string) => Promise<void>; }

/** Persistencia privada: conserva snapshots de reserva independientes de ediciones posteriores. */
export function arcPreparationRepository(run: Execute, owner: string, clock: CatalogClock, dependencies: ArcPreparationDependencies): ArcPreparationRepository {
  const execute: Execute = work => run(work);
  const writableArc = async (campaignId: string, arcId: string) => execute(async c => {
    parse(campaignIdSchema, campaignId); parse(arcIdSchema, arcId);
    const campaign = (await c.query("SELECT state FROM ttrpg_games WHERE owner_id=$1 AND id=$2 AND deleted_at IS NULL", [owner, campaignId])).rows[0];
    if (!campaign) throw new OwnedError("NOT_FOUND");
    if (campaign.state !== "ready") throw new OwnedError("CAMPAIGN_INACTIVE");
    const arc = (await c.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND campaign_id=$2 AND id=$3", [owner, campaignId, arcId])).rows[0];
    if (!arc) throw new OwnedError("NOT_FOUND");
  });
  const readableArc = async (campaignId: string, arcId: string) => execute(async c => {
    parse(campaignIdSchema, campaignId); parse(arcIdSchema, arcId);
    const campaign = (await c.query("SELECT id FROM ttrpg_games WHERE owner_id=$1 AND id=$2 AND deleted_at IS NULL", [owner, campaignId])).rows[0];
    if (!campaign || !(await c.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND campaign_id=$2 AND id=$3", [owner, campaignId, arcId])).rows[0]) throw new OwnedError("NOT_FOUND");
  });
  const dto = (row: Row): PreparedEntityDto => {
    try {
      const base = { id: row.id, arcId: row.arc_id, kind: row.kind, name: row.name, imagePath: row.image_path, notes: row.notes, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at,
        provenance: row.source_scene_id === null ? null : { sceneId: row.source_scene_id, kind: row.source_kind, entityId: row.source_entity_id } };
      return preparedEntityDtoSchema.parse(row.kind === "monster" ? { ...base, templateId: row.template_id, binding: JSON.parse(String(row.binding)) } : base);
    } catch { throw new OwnedError("CORRUPT"); }
  };
  const getRow = async (arcId: string, id: string): Promise<Row | null> => execute(async c => {
    parse(preparedEntityIdSchema, id);
    return (await c.query("SELECT * FROM arc_preparations WHERE owner_id=$1 AND arc_id=$2 AND id=$3 AND deleted_at IS NULL", [owner, arcId, id])).rows[0] ?? null;
  });
  const reservation = (row: Row): ScenePreparationReservationDto => {
    try { return scenePreparationReservationSchema.parse({ sceneId: row.scene_id, preparedId: row.prepared_id, entityId: row.entity_id, snapshot: JSON.parse(String(row.snapshot)), binding: row.binding === null ? null : JSON.parse(String(row.binding)) }); }
    catch { throw new OwnedError("CORRUPT"); }
  };
  return {
    async list(campaignId, arcId, query) {
      await readableArc(campaignId, arcId); const input = parse(preparedEntityListQuerySchema, query), text = (input.text ?? "").trim().normalize("NFC").toLowerCase(), pattern = `%${text.replace(/[\\%_]/g, char => `\\${char}`)}%`;
      return execute(async c => {
        const values = input.kind === undefined ? [owner, arcId, pattern] : [owner, arcId, pattern, input.kind];
        const predicate = input.kind === undefined
          ? "owner_id=$1 AND arc_id=$2 AND lower(name) LIKE $3 ESCAPE '\\' AND deleted_at IS NULL"
          : "owner_id=$1 AND arc_id=$2 AND lower(name) LIKE $3 ESCAPE '\\' AND kind=$4 AND deleted_at IS NULL";
        const rows = await c.query(`SELECT * FROM arc_preparations WHERE ${predicate} ORDER BY updated_at DESC,id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, input.limit, input.offset]);
        const total = Number((await c.query(`SELECT COUNT(*) AS total FROM arc_preparations WHERE ${predicate}`, values)).rows[0].total);
        return page(rows.rows.map(dto), total, input.limit, input.offset);
      });
    },
    async get(campaignId, arcId, id) { await readableArc(campaignId, arcId); const row = await getRow(arcId, id); return row ? dto(row) : null; },
    async create(campaignId, arcId, input, _key) {
      void _key; const value = parse(createPreparedEntityInputSchema, input); await writableArc(campaignId, arcId);
      if (value.kind === "monster") await dependencies.validateNewMonster(campaignId, value.templateId, value.binding);
      return execute(async c => {
        const now = clock.now().toISOString(), id = clock.id();
        await c.query("INSERT INTO arc_preparations(owner_id,id,arc_id,kind,name,image_path,notes,template_id,binding,source_scene_id,source_kind,source_entity_id,revision,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,NULL,NULL,1,$10,$11)", [owner, id, arcId, value.kind, value.name, value.imagePath, value.notes, value.kind === "monster" ? value.templateId : null, value.kind === "monster" ? JSON.stringify(value.binding) : null, now, now]);
        return dto((await c.query("SELECT * FROM arc_preparations WHERE owner_id=$1 AND id=$2", [owner, id])).rows[0]);
      });
    },
    async update(campaignId, arcId, id, input, revision, _key) {
      void _key; const value = parse(updatePreparedEntityInputSchema, input); if (!Number.isSafeInteger(revision) || revision < 1) throw new OwnedError("VALIDATION"); await writableArc(campaignId, arcId);
      const row = await getRow(arcId, id); if (!row) throw new OwnedError("NOT_FOUND"); const current = dto(row);
      if (current.kind !== value.kind || current.revision !== revision) throw new OwnedError("CONFLICT");
      if (value.kind === "monster" && current.kind === "monster" && value.templateId !== undefined && value.binding !== undefined && (value.templateId !== current.templateId || stable(value.binding) !== stable(current.binding))) await dependencies.validateNewMonster(campaignId, value.templateId, value.binding);
      return execute(async c => {
        const next = current.kind === "monster" && value.kind === "monster"
          ? { ...current, ...value, templateId: value.templateId ?? current.templateId, binding: value.binding ?? current.binding }
          : { ...current, ...value };
        const changed = await c.query("UPDATE arc_preparations SET name=$1,image_path=$2,notes=$3,template_id=$4,binding=$5,updated_at=$6,revision=revision+1 WHERE owner_id=$7 AND arc_id=$8 AND id=$9 AND revision=$10", [next.name, next.imagePath, next.notes, next.kind === "monster" ? next.templateId ?? null : null, next.kind === "monster" ? JSON.stringify(next.binding) : null, clock.now().toISOString(), owner, arcId, id, revision]);
        if (!changed.changes) throw new OwnedError("CONFLICT"); return dto((await c.query("SELECT * FROM arc_preparations WHERE owner_id=$1 AND id=$2", [owner, id])).rows[0]);
      });
    },
    async remove(campaignId, arcId, id, revision, _key) {
      void _key;
      parse(preparedEntityIdSchema, id);
      if (!Number.isSafeInteger(revision) || revision < 1) throw new OwnedError("VALIDATION");
      await writableArc(campaignId, arcId);
      return execute(async c => {
        const deletedAt = clock.now().toISOString();
        const changed = await c.query(
          "UPDATE arc_preparations SET deleted_at=$1,updated_at=$2,revision=revision+1 WHERE owner_id=$3 AND arc_id=$4 AND id=$5 AND revision=$6 AND deleted_at IS NULL",
          [deletedAt, deletedAt, owner, arcId, id, revision]
        );
        if (changed.changes) return;
        const exists = (await c.query("SELECT revision,deleted_at FROM arc_preparations WHERE owner_id=$1 AND arc_id=$2 AND id=$3", [owner, arcId, id])).rows[0];
        if (!exists || exists.deleted_at !== null) throw new OwnedError("NOT_FOUND");
        throw new OwnedError("CONFLICT");
      });
    },
    async reserveInstance(campaignId, arcId, preparedId, sceneId, _key) {
      void _key; parse(sceneIdSchema, sceneId); await writableArc(campaignId, arcId); await dependencies.assertSceneWritable(sceneId);
      return execute(async c => {
        const linked = (await c.query("SELECT scene_id FROM arc_scenes WHERE owner_id=$1 AND arc_id=$2 AND scene_id=$3", [owner, arcId, sceneId])).rows[0];
        if (!linked) throw new OwnedError("NOT_FOUND");
        const row = await getRow(arcId, preparedId); if (!row) throw new OwnedError("NOT_FOUND"); const prepared = dto(row), snapshot = snapshotPreparedEntity(prepared);
        const prior = (await c.query("SELECT * FROM scene_preparation_instances WHERE owner_id=$1 AND scene_id=$2 AND prepared_id=$3", [owner, sceneId, preparedId])).rows[0];
        if (prior) return reservation(prior);
        const sceneRow = (await c.query("SELECT body FROM owned_resources WHERE owner_id=$1 AND kind='scenes' AND id=$2", [owner, sceneId])).rows[0];
        if (!sceneRow) throw new OwnedError("NOT_FOUND");
        let document: ReturnType<typeof sceneDocumentV2Schema.parse>; try { document = sceneDocumentV2Schema.parse(JSON.parse(String(sceneRow.body)).scene); } catch { throw new OwnedError("CORRUPT"); }
        const existing = new Set((prepared.kind === "monster" ? document.sceneAside.monsters : document.sceneAside.npcs).map(value => value.id));
        for (const entry of (await c.query("SELECT entity_id FROM scene_preparation_instances WHERE owner_id=$1 AND scene_id=$2 AND kind=$3", [owner, sceneId, prepared.kind])).rows) existing.add(String(entry.entity_id));
        let entityId = clock.id(), attempts = 0; while (existing.has(entityId)) { if (++attempts > 100) throw new OwnedError("UNAVAILABLE"); entityId = clock.id(); }
        const result: ScenePreparationReservationDto = { sceneId, preparedId, entityId, snapshot, binding: prepared.kind === "monster" ? prepared.binding : null };
        await c.query("INSERT INTO scene_preparation_instances(owner_id,scene_kind,scene_id,prepared_id,kind,entity_id,snapshot,binding) VALUES($1,'scenes',$2,$3,$4,$5,$6,$7)", [owner, sceneId, preparedId, prepared.kind, entityId, JSON.stringify(snapshot), result.binding === null ? null : JSON.stringify(result.binding)]);
        return result;
      });
    }
  };
}
