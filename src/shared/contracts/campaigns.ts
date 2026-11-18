import { z } from "zod";
import { gameNameSchema, ownerIdSchema } from "../../domain/games/game-metadata";
import { sceneDocumentV2Schema } from "../../domain/sessions/scene-schema";
import { definitionRefSchema, resourceBindingsSchema, systemRefSchema, type DefinitionRef } from "../../domain/systems/system-catalog";

export const CAMPAIGN_PAGE_DEFAULT_LIMIT = 50;
export const CAMPAIGN_PAGE_MAX_LIMIT = 100;

const timestampSchema = z.iso.datetime({ precision: 3 });
const revisionSchema = z.number().int().positive();
const nullableAssetIdSchema = z.uuid().nullable();
const descriptionSchema = z.string().max(4_000);
const listTextSchema = z.string().trim().max(200);
const newPreparedEntityNameSchema = z.string().trim().min(1).max(200);

function sameDefinitionRef(left: DefinitionRef, right: DefinitionRef): boolean {
  if (left.scope !== right.scope || left.templateId !== right.templateId || left.version !== right.version) return false;
  if (left.scope === "catalog" && right.scope === "catalog") return left.systemId === right.systemId;
  return left.scope === "private" && right.scope === "private" && left.ownerId === right.ownerId && left.hash === right.hash;
}

export const campaignStateSchema = z.enum(["active", "inactive"]);
export const campaignIdSchema = z.uuid();
export const arcIdSchema = z.uuid();
export const preparedEntityIdSchema = z.uuid();

export const campaignDtoSchema = z.strictObject({
  id: campaignIdSchema,
  name: gameNameSchema,
  description: descriptionSchema,
  coverAssetId: nullableAssetIdSchema,
  state: campaignStateSchema,
  systemRef: systemRefSchema,
  revision: revisionSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});
export type CampaignDto = z.infer<typeof campaignDtoSchema>;

export const arcDtoSchema = z.strictObject({
  id: arcIdSchema,
  campaignId: campaignIdSchema,
  name: gameNameSchema,
  description: descriptionSchema,
  coverAssetId: nullableAssetIdSchema,
  revision: revisionSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  sceneCount: z.number().int().nonnegative()
});
export type ArcDto = z.infer<typeof arcDtoSchema>;

/** La referencia se conserva aun cuando el asset falle; el cliente no la sustituye. */
export const sceneCoverReferenceSchema = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("custom"), assetId: z.uuid(), availability: z.enum(["ready", "missing"]) }),
  z.strictObject({ source: z.literal("map-0"), mapId: z.string().min(1).max(256), availability: z.enum(["ready", "missing"]) }),
  z.strictObject({ source: z.literal("placeholder") })
]);
export type SceneCoverReference = z.infer<typeof sceneCoverReferenceSchema>;

export const sceneWriteBlockSchema = z.discriminatedUnion("code", [
  z.strictObject({ code: z.literal("CAMPAIGN_INACTIVE"), campaignId: campaignIdSchema }),
  z.strictObject({ code: z.literal("SCENE_SHARED_INACTIVE"), campaignId: campaignIdSchema })
]);
export type SceneWriteBlock = z.infer<typeof sceneWriteBlockSchema>;

export const arcSceneDtoSchema = z.strictObject({
  sceneId: z.uuid(),
  arcId: arcIdSchema,
  campaignId: campaignIdSchema,
  name: gameNameSchema,
  revision: revisionSchema,
  coverRevision: z.number().int().nonnegative(),
  customCoverAssetId: nullableAssetIdSchema,
  mapCount: z.number().int().nonnegative(),
  map0ImagePath: z.string().max(2_048).nullable(),
  map0AssetId: nullableAssetIdSchema,
  cover: sceneCoverReferenceSchema,
  writeBlock: sceneWriteBlockSchema.nullable()
});
export type ArcSceneDto = z.infer<typeof arcSceneDtoSchema>;

export const preparedEntityKindSchema = z.enum(["monster", "npc"]);
export const preparedEntityProvenanceSchema = z.strictObject({
  sceneId: z.uuid(),
  kind: preparedEntityKindSchema,
  entityId: z.string().min(1)
});
export type PreparedEntityProvenance = z.infer<typeof preparedEntityProvenanceSchema>;

const preparedBaseSchema = z.strictObject({
  id: preparedEntityIdSchema,
  arcId: arcIdSchema,
  /** Datos retenidos de escenas históricas: no se truncan al representarlos. */
  name: z.string().min(1),
  imagePath: z.string().nullable(),
  notes: z.string(),
  revision: revisionSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  provenance: preparedEntityProvenanceSchema.nullable()
});
export const preparedEntityDtoSchema = z.discriminatedUnion("kind", [
  preparedBaseSchema.extend({ kind: z.literal("npc") }),
  preparedBaseSchema.extend({ kind: z.literal("monster"), templateId: z.string().min(1).nullable(), binding: definitionRefSchema })
]).superRefine((value, context) => {
  if (value.provenance !== null && value.provenance.kind !== value.kind) context.addIssue({ code: "custom", message: "La procedencia debe conservar la clase de la ficha.", path: ["provenance", "kind"] });
});
export type PreparedEntityDto = z.infer<typeof preparedEntityDtoSchema>;

const createPreparedEntityBaseSchema = z.strictObject({ name: newPreparedEntityNameSchema, imagePath: z.string().max(2_048).nullable(), notes: z.string().max(1_000_000) });
export const createPreparedEntityInputSchema = z.discriminatedUnion("kind", [
  createPreparedEntityBaseSchema.extend({ kind: z.literal("npc") }),
  createPreparedEntityBaseSchema.extend({ kind: z.literal("monster"), templateId: z.string().min(1).max(128), binding: definitionRefSchema })
]);
export type CreatePreparedEntityInput = z.infer<typeof createPreparedEntityInputSchema>;

const updateNpcPreparedEntityInputSchema = z.strictObject({ kind: z.literal("npc"), name: newPreparedEntityNameSchema.optional(), imagePath: z.string().max(2_048).nullable().optional(), notes: z.string().max(1_000_000).optional() })
  .refine(value => Object.keys(value).some(key => key !== "kind"));
const updateMonsterPreparedEntityInputSchema = z.strictObject({ kind: z.literal("monster"), name: newPreparedEntityNameSchema.optional(), imagePath: z.string().max(2_048).nullable().optional(), notes: z.string().max(1_000_000).optional(), templateId: z.string().min(1).max(128).optional(), binding: definitionRefSchema.optional() })
  .superRefine((value, context) => {
    if (!Object.keys(value).some(key => key !== "kind")) context.addIssue({ code: "custom", message: "La actualización no contiene cambios." });
    if ((value.templateId === undefined) !== (value.binding === undefined)) context.addIssue({ code: "custom", message: "La plantilla y su binding retenido se actualizan juntos." });
  });
export const updatePreparedEntityInputSchema = z.discriminatedUnion("kind", [updateNpcPreparedEntityInputSchema, updateMonsterPreparedEntityInputSchema]);
export type UpdatePreparedEntityInput = z.infer<typeof updatePreparedEntityInputSchema>;

/** Contenido portable de una instancia, sin visibilidad, combate, token ni contexto remoto. */
export const preparedEntitySnapshotSchema = z.discriminatedUnion("kind", [
  z.strictObject({ version: z.literal(2), kind: z.literal("npc"), name: z.string().min(1), imagePath: z.string().nullable(), notes: z.string() }),
  z.strictObject({ version: z.literal(2), kind: z.literal("monster"), name: z.string().min(1), imagePath: z.string().nullable(), notes: z.string(), templateId: z.string().min(1).nullable(), binding: definitionRefSchema })
]);
export type PreparedEntitySnapshot = z.infer<typeof preparedEntitySnapshotSchema>;
export const scenePreparationReservationSchema = z.strictObject({
  sceneId: z.uuid(), preparedId: preparedEntityIdSchema, entityId: z.string().min(1), snapshot: preparedEntitySnapshotSchema, binding: definitionRefSchema.nullable()
}).superRefine((value, context) => {
  if (value.snapshot.kind === "monster" && value.binding === null) context.addIssue({ code: "custom", message: "La reserva de monstruo requiere binding retenido.", path: ["binding"] });
  if (value.snapshot.kind === "npc" && value.binding !== null) context.addIssue({ code: "custom", message: "La reserva de NPC no admite binding.", path: ["binding"] });
  if (value.snapshot.kind === "monster" && value.binding !== null && !sameDefinitionRef(value.snapshot.binding, value.binding)) context.addIssue({ code: "custom", message: "El binding de la reserva debe coincidir con el snapshot retenido.", path: ["binding"] });
});
export type ScenePreparationReservationDto = z.infer<typeof scenePreparationReservationSchema>;

export const campaignSelectionSchema = z.strictObject({ campaignId: campaignIdSchema, arcId: arcIdSchema, sceneId: z.uuid() });
export type CampaignSelection = z.infer<typeof campaignSelectionSchema>;

export const campaignPageSchema = <T extends z.ZodType>(item: T) => z.strictObject({
  items: z.array(item), total: z.number().int().nonnegative(), limit: z.number().int().min(1).max(CAMPAIGN_PAGE_MAX_LIMIT), offset: z.number().int().nonnegative()
});
export interface CampaignPage<T> { readonly items: readonly T[]; readonly total: number; readonly limit: number; readonly offset: number }

export const campaignPageQuerySchema = z.strictObject({
  limit: z.number().int().min(1).max(CAMPAIGN_PAGE_MAX_LIMIT).default(CAMPAIGN_PAGE_DEFAULT_LIMIT),
  offset: z.number().int().nonnegative().default(0),
  text: listTextSchema.optional()
});
export const campaignListQuerySchema = campaignPageQuerySchema.extend({ state: campaignStateSchema.optional() });
export type CampaignPageQuery = z.input<typeof campaignPageQuerySchema>;
export type CampaignListQuery = z.input<typeof campaignListQuerySchema>;
/** Filtro del catálogo de preparación. Se aplica antes de contar y paginar. */
export const preparedEntityListQuerySchema = campaignPageQuerySchema.extend({ kind: preparedEntityKindSchema.optional() });
export type PreparedEntityListQuery = z.input<typeof preparedEntityListQuerySchema>;

export const createCampaignInputSchema = z.strictObject({ name: gameNameSchema, description: descriptionSchema.default(""), coverAssetId: nullableAssetIdSchema.default(null), systemRef: systemRefSchema });
export const updateCampaignInputSchema = z.strictObject({ name: gameNameSchema.optional(), description: descriptionSchema.optional(), coverAssetId: nullableAssetIdSchema.optional() }).refine(value => Object.keys(value).length > 0);
export const setCampaignStateInputSchema = z.strictObject({ state: campaignStateSchema });
/** PATCH de campaña cambia metadatos o estado; combinarlos rompería la regla de solo consulta. */
export const campaignPatchInputSchema = z.union([updateCampaignInputSchema, setCampaignStateInputSchema]);
export const createArcInputSchema = z.strictObject({ name: gameNameSchema, description: descriptionSchema.default(""), coverAssetId: nullableAssetIdSchema.default(null) });
export const updateArcInputSchema = z.strictObject({ name: gameNameSchema.optional(), description: descriptionSchema.optional(), coverAssetId: nullableAssetIdSchema.optional() }).refine(value => Object.keys(value).length > 0);
export const updateSceneCoverInputSchema = z.strictObject({ customCoverAssetId: nullableAssetIdSchema });
/** Destino de una escena creada fuera del panel de administración. */
export const sceneDestinationSchema = z.strictObject({ campaignId: campaignIdSchema, arcId: arcIdSchema.optional() });
export const attachSceneInputSchema = z.strictObject({ sceneId: z.uuid() });
export const createArcSceneInputSchema = z.strictObject({ name: gameNameSchema, scene: sceneDocumentV2Schema, bindings: resourceBindingsSchema });

export const idempotencyKeySchema = z.uuid();
export const expectedRevisionSchema = revisionSchema;
/** La primera portada de una escena parte de revisión cero. */
export const expectedCoverRevisionSchema = z.number().int().nonnegative();
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;
export type SetCampaignStateInput = z.infer<typeof setCampaignStateInputSchema>;
export type CreateArcInput = z.infer<typeof createArcInputSchema>;
export type UpdateArcInput = z.infer<typeof updateArcInputSchema>;
export type UpdateSceneCoverInput = z.infer<typeof updateSceneCoverInputSchema>;
export type AttachSceneInput = z.infer<typeof attachSceneInputSchema>;
export type CreateArcSceneInput = z.infer<typeof createArcSceneInputSchema>;

export const campaignErrorCodeSchema = z.enum(["CAMPAIGN_INACTIVE", "CAMPAIGN_OPEN", "SCENE_SHARED_INACTIVE"]);
export type CampaignErrorCode = z.infer<typeof campaignErrorCodeSchema>;

/** T-03 implementa lector/escritor; T-01 congela versión y formas sin alterar transfer v1–v3. */
export const OPERATIVE_TRANSFER_VERSION = 5;
export const CAMPAIGN_HIERARCHY_TRANSFER_VERSION = 4;
export const supportedOperativeTransferVersions = [1, 2, 3, 4, OPERATIVE_TRANSFER_VERSION] as const;
export const campaignTransferRecordSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("campaign"), owner: ownerIdSchema, value: campaignDtoSchema }),
  z.strictObject({ type: z.literal("arc"), owner: ownerIdSchema, value: arcDtoSchema }),
  z.strictObject({ type: z.literal("arc-scene"), owner: ownerIdSchema, campaignId: campaignIdSchema, arcId: arcIdSchema, sceneId: z.uuid() }),
  z.strictObject({ type: z.literal("scene-cover"), owner: ownerIdSchema, sceneId: z.uuid(), customCoverAssetId: nullableAssetIdSchema, revision: z.number().int().nonnegative() }),
  /** Marca operativa: no se publica dentro de PreparedEntityDto. */
  z.strictObject({ type: z.literal("prepared-entity"), owner: ownerIdSchema, value: preparedEntityDtoSchema, deletedAt: timestampSchema.nullable() }),
  z.strictObject({ type: z.literal("scene-preparation-instance"), owner: ownerIdSchema, value: scenePreparationReservationSchema })
]);
export type CampaignTransferRecord = z.infer<typeof campaignTransferRecordSchema>;
