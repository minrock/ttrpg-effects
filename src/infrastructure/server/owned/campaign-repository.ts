import { z } from "zod";
import type { CampaignRepository } from "../../../application/services/campaigns";
import { OwnedError } from "../../../application/services/owned-store";
import type { CatalogClock, Execute } from "../database/catalog-repository";
import type { Row } from "../database/driver";
import { record } from "./repository";
import {
  arcDtoSchema, arcIdSchema, arcSceneDtoSchema, attachSceneInputSchema, campaignDtoSchema, campaignIdSchema, campaignListQuerySchema, campaignPageQuerySchema,
  createArcInputSchema, createArcSceneInputSchema, createCampaignInputSchema, setCampaignStateInputSchema, updateArcInputSchema, updateCampaignInputSchema, updateSceneCoverInputSchema,
  type ArcDto, type ArcSceneDto, type CampaignDto, type CampaignPage, type SceneCoverReference
} from "../../../shared/contracts/campaigns";
import { gameMetadataSchema } from "../../../domain/games/game-metadata";
import type { GameMetadata } from "../../../domain/games/game-metadata";

type Arc = ArcDto;
export interface CampaignMaintenance {
  ensureInitial(game: GameMetadata): Promise<void>;
  reflectLegacySceneLink(gameId: string, sceneId: string): Promise<void>;
  linkScene(campaignId: string, arcId: string, sceneId: string): Promise<ArcSceneDto>;
  assertSceneWritable(sceneId: string): Promise<void>;
  assertCampaignWritable(campaignId: string): Promise<void>;
}

const page = <T>(items: readonly T[], total: number, limit: number, offset: number): CampaignPage<T> => ({ items, total, limit, offset });
const sceneId = z.uuid();
const assetId = z.uuid();
const assetReference = /^asset:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function valid<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new OwnedError("VALIDATION");
  return result.data;
}

function game(row: Row): GameMetadata {
  try {
    return gameMetadataSchema.parse({ id: row.id, ownerId: row.owner_id, name: row.name, state: row.state, systemRef: { systemId: row.system_id, version: Number(row.system_version) }, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at });
  } catch { throw new OwnedError("CORRUPT"); }
}

/** Repositorio ligado a la transacción/propietario: ninguna operación recibe ownerId del cliente. */
export function campaignRepository(run: Execute, owner: string, clock: CatalogClock, saveScene?: (campaignId: string, arcId: string, input: import("../../../shared/contracts/campaigns").CreateArcSceneInput) => Promise<ArcSceneDto>): CampaignRepository & CampaignMaintenance {
  const execute: Execute = work => run(work);
  const findGame = async (campaignId: string): Promise<GameMetadata | null> => {
    valid(campaignIdSchema, campaignId);
    return execute(async c => {
      const row = (await c.query("SELECT * FROM ttrpg_games WHERE owner_id=$1 AND id=$2 AND deleted_at IS NULL", [owner, campaignId])).rows[0];
      return row ? game(row) : null;
    });
  };
  const detail = async (campaignId: string) => execute(async c => {
    const row = (await c.query("SELECT description,cover_asset_id FROM campaign_details WHERE owner_id=$1 AND game_id=$2", [owner, campaignId])).rows[0];
    if (!row) throw new OwnedError("CORRUPT");
    return { description: String(row.description), coverAssetId: row.cover_asset_id === null ? null : String(row.cover_asset_id) };
  });
  const campaign = async (campaignId: string): Promise<CampaignDto | null> => {
    const current = await findGame(campaignId); if (!current) return null;
    const details = await detail(campaignId);
    const { id, name, systemRef, revision, createdAt, updatedAt } = current;
    try { return campaignDtoSchema.parse({ id, name, systemRef, revision, createdAt, updatedAt, ...details, state: current.state === "ready" ? "active" : "inactive" }); }
    catch { throw new OwnedError("CORRUPT"); }
  };
  const assetExists = async (id: string | null) => {
    if (id === null) return true;
    valid(assetId, id);
    return execute(async c => (await c.query("SELECT id FROM owned_assets WHERE owner_id=$1 AND id=$2", [owner, id])).rows.length === 1);
  };
  const ensureAsset = async (id: string | null) => { if (!await assetExists(id)) throw new OwnedError("NOT_FOUND"); };
  const requireCampaign = async (id: string) => { const value = await campaign(id); if (!value) throw new OwnedError("NOT_FOUND"); return value; };
  const assertCampaignWritable = async (campaignId: string) => {
    const current = await requireCampaign(campaignId);
    if (current.state !== "active") throw new OwnedError("CAMPAIGN_INACTIVE");
  };
  const ensureInitial = async (current: GameMetadata) => execute(async c => {
    await c.query("INSERT INTO campaign_details(owner_id,game_id,description,cover_asset_id) VALUES($1,$2,'',NULL) ON CONFLICT(owner_id,game_id) DO NOTHING", [owner, current.id]);
    let row = (await c.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND initial_game_id=$2", [owner, current.id])).rows[0];
    if (!row) {
      const id = clock.id();
      await c.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,$4,'',NULL,1,$5,$6,$7) ON CONFLICT(owner_id,initial_game_id) DO NOTHING", [owner, id, current.id, "Arco inicial", current.createdAt, current.updatedAt, current.id]);
      row = (await c.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND initial_game_id=$2", [owner, current.id])).rows[0];
    }
    if (!row) throw new OwnedError("UNAVAILABLE");
  });
  const initialArc = async (gameId: string) => execute(async c => {
    const row = (await c.query("SELECT id FROM campaign_arcs WHERE owner_id=$1 AND initial_game_id=$2", [owner, gameId])).rows[0];
    if (!row) throw new OwnedError("CORRUPT"); return String(row.id);
  });
  const reflectLegacySceneLink = async (gameId: string, resourceId: string) => {
    valid(campaignIdSchema, gameId); valid(sceneId, resourceId);
    const existing = await findGame(gameId); if (!existing) throw new OwnedError("NOT_FOUND");
    await execute(async c => {
      // Publicar/guardar una escena existente nunca le inventa un padre. Los
      // recursos legados completamente huérfanos siguen siendo recuperables y
      // exportables, pero sólo una creación contextual puede pertenecer a un
      // arco.
      const linked = (await c.query("SELECT a.campaign_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id WHERE s.owner_id=$1 AND s.scene_id=$2", [owner, resourceId])).rows[0];
      if (!linked || linked.campaign_id !== gameId) throw new OwnedError("CONFLICT");
    });
  };
  const inactiveForScene = async (id: string): Promise<string | null> => execute(async c => {
    const row = (await c.query("SELECT a.campaign_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id JOIN ttrpg_games g ON g.owner_id=a.owner_id AND g.id=a.campaign_id WHERE s.owner_id=$1 AND s.scene_id=$2 AND g.deleted_at IS NULL AND g.state='archived' ORDER BY a.campaign_id LIMIT 1", [owner, id])).rows[0];
    return row ? String(row.campaign_id) : null;
  });
  const assertSceneWritable = async (id: string) => { valid(sceneId, id); const blockedBy = await inactiveForScene(id); if (blockedBy) throw new OwnedError("SCENE_SHARED_INACTIVE", undefined, blockedBy); };
  const assertSceneParent = async (id: string, campaignId?: string, arcId?: string) => {
    valid(sceneId, id);
    await execute(async c => {
      const parent = (await c.query("SELECT a.campaign_id,s.arc_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id WHERE s.owner_id=$1 AND s.scene_id=$2", [owner, id])).rows[0];
      const link = (await c.query("SELECT game_id FROM game_resources WHERE owner_id=$1 AND kind='scenes' AND resource_id=$2", [owner, id])).rows[0];
      if (!parent || !link || parent.campaign_id !== link.game_id || campaignId !== undefined && parent.campaign_id !== campaignId || arcId !== undefined && parent.arc_id !== arcId) throw new OwnedError("CONFLICT");
    });
  };
  const arc = async (campaignId: string, arcId: string): Promise<Arc | null> => {
    valid(campaignIdSchema, campaignId); valid(arcIdSchema, arcId);
    return execute(async c => {
      const row = (await c.query("SELECT a.*,COUNT(s.scene_id) AS scene_count FROM campaign_arcs a LEFT JOIN arc_scenes s ON s.owner_id=a.owner_id AND s.arc_id=a.id WHERE a.owner_id=$1 AND a.campaign_id=$2 AND a.id=$3 GROUP BY a.owner_id,a.id,a.campaign_id,a.name,a.description,a.cover_asset_id,a.revision,a.created_at,a.updated_at,a.initial_game_id", [owner, campaignId, arcId])).rows[0];
      if (!row) return null;
      try { return arcDtoSchema.parse({ id: row.id, campaignId: row.campaign_id, name: row.name, description: row.description, coverAssetId: row.cover_asset_id, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, sceneCount: Number(row.scene_count) }); }
      catch { throw new OwnedError("CORRUPT"); }
    });
  };
  const requireArc = async (campaignId: string, id: string) => { const value = await arc(campaignId, id); if (!value) throw new OwnedError("NOT_FOUND"); return value; };
  const sceneDto = async (campaignId: string, arcId: string, id: string): Promise<ArcSceneDto> => execute(async c => {
    const row = (await c.query("SELECT r.*,s.arc_id,c.custom_cover_asset_id,c.revision AS cover_revision FROM arc_scenes s JOIN owned_resources r ON r.owner_id=s.owner_id AND r.kind=s.kind AND r.id=s.scene_id LEFT JOIN scene_covers c ON c.owner_id=s.owner_id AND c.kind='scenes' AND c.scene_id=s.scene_id WHERE s.owner_id=$1 AND s.arc_id=$2 AND s.scene_id=$3 AND s.kind='scenes'", [owner, arcId, id])).rows[0];
    if (!row) throw new OwnedError("NOT_FOUND");
    const resource = record("scenes", row), map = resource.value.scene.maps[0], imagePath = map?.map.imagePath ?? null, match = imagePath ? assetReference.exec(imagePath) : null, map0AssetId = match?.[1] ?? null;
    const customCoverAssetId = row.custom_cover_asset_id === null || row.custom_cover_asset_id === undefined ? null : String(row.custom_cover_asset_id);
    const coverRevision = row.cover_revision === null || row.cover_revision === undefined ? 0 : Number(row.cover_revision);
    let cover: SceneCoverReference;
    if (customCoverAssetId) cover = { source: "custom", assetId: customCoverAssetId, availability: await assetExists(customCoverAssetId) ? "ready" : "missing" };
    else if (map && imagePath !== null) cover = { source: "map-0", mapId: map.id, availability: map0AssetId && !await assetExists(map0AssetId) ? "missing" : "ready" };
    else cover = { source: "placeholder" };
    const own = await requireCampaign(campaignId), shared = await inactiveForScene(id);
    const writeBlock = own.state !== "active" ? { code: "CAMPAIGN_INACTIVE" as const, campaignId } : shared ? { code: "SCENE_SHARED_INACTIVE" as const, campaignId: shared } : null;
    try { return arcSceneDtoSchema.parse({ sceneId: id, arcId, campaignId, name: resource.value.name, revision: resource.revision, coverRevision, customCoverAssetId, mapCount: resource.value.scene.maps.length, map0ImagePath: imagePath, map0AssetId, cover, writeBlock }); }
    catch { throw new OwnedError("CORRUPT"); }
  });
  const linkScene = async (campaignId: string, id: string, scene: string): Promise<ArcSceneDto> => {
    valid(campaignIdSchema, campaignId); valid(arcIdSchema, id); valid(sceneId, scene);
    await assertCampaignWritable(campaignId); await requireArc(campaignId, id);
    return execute(async c => {
      const resource = (await c.query("SELECT id FROM owned_resources WHERE owner_id=$1 AND kind='scenes' AND id=$2", [owner, scene])).rows[0];
      if (!resource) throw new OwnedError("NOT_FOUND");
      const existingArc = (await c.query("SELECT s.arc_id,a.campaign_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id WHERE s.owner_id=$1 AND s.scene_id=$2", [owner, scene])).rows[0];
      if (existingArc && (existingArc.arc_id !== id || existingArc.campaign_id !== campaignId)) throw new OwnedError("CONFLICT");
      const existingCampaign = (await c.query("SELECT game_id FROM game_resources WHERE owner_id=$1 AND kind='scenes' AND resource_id=$2", [owner, scene])).rows[0];
      if (existingCampaign && existingCampaign.game_id !== campaignId) throw new OwnedError("CONFLICT");
      if (!existingArc) await c.query("INSERT INTO arc_scenes(owner_id,arc_id,kind,scene_id) VALUES($1,$2,'scenes',$3)", [owner, id, scene]);
      if (!existingCampaign) await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,'scenes',$3)", [owner, campaignId, scene]);
      return sceneDto(campaignId, id, scene);
    });
  };
  const result: CampaignRepository & CampaignMaintenance = {
    ensureInitial, reflectLegacySceneLink, linkScene, assertSceneWritable, assertSceneParent, assertCampaignWritable,
    async list(query) {
      const parsed = valid(campaignListQuerySchema, query), state = parsed.state === undefined ? null : parsed.state === "active" ? "ready" : "archived", text = (parsed.text ?? "").trim().normalize("NFC").toLowerCase(), pattern = `%${text.replace(/[\\%_]/g, character => `\\${character}`)}%`;
      return execute(async c => {
        const where = state === null ? "g.owner_id=$1 AND g.deleted_at IS NULL AND lower(g.name) LIKE $2 ESCAPE '\\'" : "g.owner_id=$1 AND g.deleted_at IS NULL AND g.state=$2 AND lower(g.name) LIKE $3 ESCAPE '\\'";
        const args = state === null ? [owner, pattern] : [owner, state, pattern];
        const limit = args.length + 1, offset = args.length + 2;
        const rows = await c.query(`SELECT g.* FROM ttrpg_games g WHERE ${where} ORDER BY g.updated_at DESC,g.id ASC LIMIT $${limit} OFFSET $${offset}`, [...args, parsed.limit, parsed.offset]);
        const total = Number((await c.query(`SELECT COUNT(*) AS total FROM ttrpg_games g WHERE ${where}`, args)).rows[0].total);
        const items = await Promise.all(rows.rows.map(value => campaign(String(value.id))));
        return page(items.filter((value): value is CampaignDto => value !== null), total, parsed.limit, parsed.offset);
      });
    },
    get: campaign,
    async create(input, _key) {
      void _key;
      const value = valid(createCampaignInputSchema, input);
      return execute(async c => {
        const version = (await c.query("SELECT state,availability FROM system_versions WHERE system_id=$1 AND version=$2", [value.systemRef.systemId, value.systemRef.version])).rows[0];
        if (!version) throw new OwnedError("VALIDATION"); if (version.state !== "published" || version.availability !== "enabled") throw new OwnedError("CONFLICT");
        await ensureAsset(value.coverAssetId); const now = clock.now().toISOString(), id = clock.id();
        const inserted = await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision,deleted_at,system_id,system_version) VALUES($1,$2,$3,'ready',$4,$5,1,NULL,$6,$7) ON CONFLICT(id) DO NOTHING", [id, owner, value.name, now, now, value.systemRef.systemId, value.systemRef.version]);
        if (!inserted.changes) throw new OwnedError("CONFLICT");
        await c.query("INSERT INTO campaign_details(owner_id,game_id,description,cover_asset_id) VALUES($1,$2,$3,$4)", [owner, id, value.description, value.coverAssetId]);
        await ensureInitial({ id, ownerId: owner, name: value.name, state: "ready", systemRef: value.systemRef, revision: 1, createdAt: now, updatedAt: now });
        return (await campaign(id))!;
      });
    },
    async update(campaignId, input, revision, _key) {
      void _key;
      const value = valid(updateCampaignInputSchema, input); valid(campaignIdSchema, campaignId); if (!Number.isSafeInteger(revision) || revision < 1) throw new OwnedError("VALIDATION");
      await assertCampaignWritable(campaignId); if (value.coverAssetId !== undefined) await ensureAsset(value.coverAssetId);
      return execute(async c => {
        const current = await requireCampaign(campaignId); if (current.revision !== revision) throw new OwnedError("CONFLICT");
        const now = clock.now().toISOString(), name = value.name ?? current.name, details = await detail(campaignId), description = value.description ?? details.description, cover = value.coverAssetId === undefined ? details.coverAssetId : value.coverAssetId;
        const changed = await c.query("UPDATE ttrpg_games SET name=$1,updated_at=$2,revision=revision+1 WHERE owner_id=$3 AND id=$4 AND revision=$5 AND state='ready'", [name, now, owner, campaignId, revision]);
        if (!changed.changes) throw new OwnedError("CONFLICT"); await c.query("UPDATE campaign_details SET description=$1,cover_asset_id=$2 WHERE owner_id=$3 AND game_id=$4", [description, cover, owner, campaignId]);
        return (await campaign(campaignId))!;
      });
    },
    async setState(campaignId, input, revision, _key) {
      void _key;
      const value = valid(setCampaignStateInputSchema, input); valid(campaignIdSchema, campaignId); if (!Number.isSafeInteger(revision) || revision < 1) throw new OwnedError("VALIDATION");
      return execute(async c => {
        const current = await requireCampaign(campaignId); if (current.revision !== revision) throw new OwnedError("CONFLICT");
        const desired = value.state === "active" ? "ready" : "archived";
        if (current.state === value.state) return current;
        if (desired === "archived") { const opening = (await c.query("SELECT id FROM game_openings WHERE game_id=$1 AND state='open' LIMIT 1", [campaignId])).rows[0]; if (opening) throw new OwnedError("CAMPAIGN_OPEN"); }
        const changed = await c.query("UPDATE ttrpg_games SET state=$1,updated_at=$2,revision=revision+1 WHERE owner_id=$3 AND id=$4 AND revision=$5", [desired, clock.now().toISOString(), owner, campaignId, revision]);
        if (!changed.changes) throw new OwnedError("CONFLICT"); return (await campaign(campaignId))!;
      });
    },
    async listArcs(campaignId, query) {
      await requireCampaign(campaignId); const parsed = valid(campaignPageQuerySchema, query), text = (parsed.text ?? "").trim().normalize("NFC").toLowerCase(), pattern = `%${text.replace(/[\\%_]/g, character => `\\${character}`)}%`;
      return execute(async c => {
        const where = "a.owner_id=$1 AND a.campaign_id=$2 AND lower(a.name) LIKE $3 ESCAPE '\\'", args = [owner, campaignId, pattern];
        const rows = await c.query(`SELECT a.id FROM campaign_arcs a WHERE ${where} ORDER BY a.updated_at DESC,a.id ASC LIMIT $4 OFFSET $5`, [...args, parsed.limit, parsed.offset]);
        const total = Number((await c.query(`SELECT COUNT(*) AS total FROM campaign_arcs a WHERE ${where}`, args)).rows[0].total);
        return page((await Promise.all(rows.rows.map(row => arc(campaignId, String(row.id))))).filter((value): value is Arc => value !== null), total, parsed.limit, parsed.offset);
      });
    },
    async getArc(campaignId, id) { if (!await campaign(campaignId)) return null; return arc(campaignId, id); },
    async createArc(campaignId, input, _key) {
      void _key;
      const value = valid(createArcInputSchema, input); await assertCampaignWritable(campaignId); await ensureAsset(value.coverAssetId);
      return execute(async c => { const now = clock.now().toISOString(), id = clock.id(); await c.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,$4,$5,$6,1,$7,$8,NULL)", [owner, id, campaignId, value.name, value.description, value.coverAssetId, now, now]); return (await arc(campaignId, id))!; });
    },
    async updateArc(campaignId, id, input, revision, _key) {
      void _key;
      const value = valid(updateArcInputSchema, input); await assertCampaignWritable(campaignId); await ensureAsset(value.coverAssetId === undefined ? null : value.coverAssetId);
      return execute(async c => { const current = await requireArc(campaignId, id); if (current.revision !== revision) throw new OwnedError("CONFLICT"); const changed = await c.query("UPDATE campaign_arcs SET name=$1,description=$2,cover_asset_id=$3,updated_at=$4,revision=revision+1 WHERE owner_id=$5 AND campaign_id=$6 AND id=$7 AND revision=$8", [value.name ?? current.name, value.description ?? current.description, value.coverAssetId === undefined ? current.coverAssetId : value.coverAssetId, clock.now().toISOString(), owner, campaignId, id, revision]); if (!changed.changes) throw new OwnedError("CONFLICT"); return (await arc(campaignId, id))!; });
    },
    async listScenes(campaignId, id, query) {
      await requireCampaign(campaignId); await requireArc(campaignId, id); const parsed = valid(campaignPageQuerySchema, query), text = (parsed.text ?? "").trim().normalize("NFC").toLowerCase(), pattern = `%${text.replace(/[\\%_]/g, character => `\\${character}`)}%`;
      return execute(async c => { const where = "s.owner_id=$1 AND s.arc_id=$2 AND lower(r.name) LIKE $3 ESCAPE '\\'", args = [owner, id, pattern]; const rows = await c.query(`SELECT s.scene_id FROM arc_scenes s JOIN owned_resources r ON r.owner_id=s.owner_id AND r.kind=s.kind AND r.id=s.scene_id WHERE ${where} ORDER BY r.updated_at DESC,r.sort_id ASC LIMIT $4 OFFSET $5`, [...args, parsed.limit, parsed.offset]); const total = Number((await c.query(`SELECT COUNT(*) AS total FROM arc_scenes s JOIN owned_resources r ON r.owner_id=s.owner_id AND r.kind=s.kind AND r.id=s.scene_id WHERE ${where}`, args)).rows[0].total); return page(await Promise.all(rows.rows.map(row => sceneDto(campaignId, id, String(row.scene_id)))), total, parsed.limit, parsed.offset); });
    },
    async resolveSceneArc(campaignId, requestedArcId) {
      await requireCampaign(campaignId);
      if (requestedArcId !== undefined) {
        const selected = await requireArc(campaignId, requestedArcId);
        return selected;
      }
      const initial = await initialArc(campaignId);
      const selected = await arc(campaignId, initial);
      if (!selected) throw new OwnedError("CORRUPT");
      return selected;
    },
    async findSceneArc(campaignId, scene) {
      valid(campaignIdSchema, campaignId); valid(sceneId, scene);
      const parent = await execute(async c => (await c.query("SELECT s.arc_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id WHERE s.owner_id=$1 AND s.scene_id=$2 AND a.campaign_id=$3", [owner, scene, campaignId])).rows[0]);
      if (!parent) throw new OwnedError("CONFLICT");
      const selected = await arc(campaignId, String(parent.arc_id));
      if (!selected) throw new OwnedError("CORRUPT");
      return selected;
    },
    async createScene(campaignId, id, input, _key) {
      void _key;
      const value = valid(createArcSceneInputSchema, input);
      await assertCampaignWritable(campaignId); await requireArc(campaignId, id);
      if (!saveScene) throw new OwnedError("UNAVAILABLE");
      return saveScene(campaignId, id, value);
    },
    async attachScene(campaignId, id, input, _key) {
      void _key;
      valid(attachSceneInputSchema, input); valid(campaignIdSchema, campaignId); valid(arcIdSchema, id);
      // La asociación de una escena existente quedó retirada de la API pública.
      throw new OwnedError("CONFLICT");
    },
    async updateSceneCover(campaignId, id, scene, input, revision, _key) {
      void _key;
      const value = valid(updateSceneCoverInputSchema, input); await assertCampaignWritable(campaignId); await assertSceneWritable(scene); await ensureAsset(value.customCoverAssetId);
      return execute(async c => { await requireArc(campaignId, id); const association = (await c.query("SELECT scene_id FROM arc_scenes WHERE owner_id=$1 AND arc_id=$2 AND scene_id=$3", [owner, id, scene])).rows[0]; if (!association) throw new OwnedError("NOT_FOUND"); const current = (await c.query("SELECT revision FROM scene_covers WHERE owner_id=$1 AND kind='scenes' AND scene_id=$2", [owner, scene])).rows[0], actual = current ? Number(current.revision) : 0; if (actual !== revision) throw new OwnedError("CONFLICT"); if (current) { const changed = await c.query("UPDATE scene_covers SET custom_cover_asset_id=$1,revision=revision+1 WHERE owner_id=$2 AND kind='scenes' AND scene_id=$3 AND revision=$4", [value.customCoverAssetId, owner, scene, revision]); if (!changed.changes) throw new OwnedError("CONFLICT"); } else { await c.query("INSERT INTO scene_covers(owner_id,kind,scene_id,custom_cover_asset_id,revision) VALUES($1,'scenes',$2,$3,1)", [owner, scene, value.customCoverAssetId]); } return sceneDto(campaignId, id, scene); });
    }
  };
  return result;
}
