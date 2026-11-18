import { z } from "zod";
import { DAMAGE_TYPES, POOL_DICE, appearanceSchema, contextSchema, groupSchema } from "../../domain/dice/dice";

const uuid = z.uuid();
const id = z.string().min(1).max(160);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.number().finite().nonnegative();

/** Identidad que puede viajar a otra persona sentada en la mesa. */
export const dicePublicAuthorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("dm") }).strict(),
  z.object({ kind: z.literal("player"), publicId: uuid, alias: z.string().min(1).max(160), discriminator: z.number().int().min(1).max(1000) }).strict()
]);
export type DicePublicAuthor = z.infer<typeof dicePublicAuthorSchema>;

/** Contexto derivado de la publicación, sin nombres ni IDs internos del editor. */
export const serviceDiceContextSchema = z.object({
  token: uuid,
  sceneId: id,
  mapId: id,
  label: z.string().max(200)
}).strict();
export type ServiceDiceContext = z.infer<typeof serviceDiceContextSchema>;

/** La selección no puede decidir privacidad ni el resumen del mapa. */
export const serviceDiceSelectionSchema = z.object({
  groups: z.array(groupSchema).max(DAMAGE_TYPES.length),
  includeD20: z.boolean(),
  d20Modifier: z.number().int().min(-9999).max(9999),
  appearance: appearanceSchema,
  force: z.number().finite().min(.5).max(1.6),
  d20: z.enum(["normal", "advantage", "disadvantage"]).nullable()
}).strict().superRefine((value, ctx) => {
  if (value.includeD20 !== (value.d20 !== null)) ctx.addIssue({ code: "custom", message: "Modo d20 inválido." });
});
export type ServiceDiceSelection = z.infer<typeof serviceDiceSelectionSchema>;

const physicalDieSchema = z.object({
  id,
  type: z.enum(["d4", "d6", "d8", "d10", "d12", "d20", "d100"]),
  damageType: z.enum(DAMAGE_TYPES),
  groupId: id.nullable(),
  logicalId: id,
  role: z.enum(["pool", "tens", "units", "check"])
}).strict();
const diceResultSchema = z.object({
  groups: z.array(z.object({
    id,
    damageType: z.enum(DAMAGE_TYPES),
    formula: z.string().max(1000),
    dice: z.array(z.object({ id, type: z.enum(POOL_DICE), value: z.number().int(), parts: z.array(z.number().int()).max(2) }).strict()).max(24),
    modifier: z.number().int().optional(),
    total: z.number().int()
  }).strict()).max(DAMAGE_TYPES.length),
  poolTotal: z.number().int(),
  d20: z.object({
    mode: z.enum(["normal", "advantage", "disadvantage"]),
    values: z.array(z.number().int().min(1).max(20)).min(1).max(2),
    selected: z.number().int().min(0).max(1),
    value: z.number().int().min(1).max(20),
    modifier: z.number().int(),
    total: z.number().int()
  }).strict().nullable()
}).strict();
export type ServiceDiceResult = z.infer<typeof diceResultSchema>;

const replaySchema = z.object({
  frames: z.array(z.number().finite()).max(24 * 361 * 7),
  frameCount: z.number().int().min(2).max(361),
  stepMs: z.number().positive(),
  durationMs: z.number().finite().nonnegative().max(12000)
}).strict();
const serviceDicePresentationFields = {
  rollId: uuid,
  author: dicePublicAuthorSchema,
  dice: z.array(physicalDieSchema).max(24),
  appearance: appearanceSchema,
  replay: replaySchema.nullable(),
  /** Pose estática de una presentación compactada; no es una trayectoria reproducible. */
  finalFrame: z.array(z.number().finite()).max(24 * 7).optional(),
  /** El resumen sobre el mapa puede ocultarse; el historial de públicas no. */
  result: diceResultSchema.nullable(),
  critical: z.object({ dieId: id }).strict().nullable().optional(),
  startedAt: timestamp,
  settledAt: timestamp
};
export const serviceDicePresentationSchema = z.object({ ...serviceDicePresentationFields, context: serviceDiceContextSchema }).strict();
export type ServiceDicePresentation = z.infer<typeof serviceDicePresentationSchema>;
/** Canal DM separado: el contexto de una tirada oculta jamás se proyecta como contexto publicado. */
export const serviceDicePrivatePresentationSchema = z.object({ ...serviceDicePresentationFields, context: contextSchema }).strict();
export type ServiceDicePrivatePresentation = z.infer<typeof serviceDicePrivatePresentationSchema>;

export const serviceDiceEntryStatusSchema = z.enum(["complete", "failed", "interrupted"]);
export type ServiceDiceEntryStatus = z.infer<typeof serviceDiceEntryStatusSchema>;
const serviceDiceEntryFields = {
  id: uuid,
  author: dicePublicAuthorSchema,
  selection: serviceDiceSelectionSchema,
  createdAt: timestamp,
  settledAt: timestamp,
  status: serviceDiceEntryStatusSchema,
  result: diceResultSchema.nullable()
};
function validEntry<T extends z.ZodType>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    const entry = value as { status: ServiceDiceEntryStatus; result: ServiceDiceResult | null };
    if (entry.status === "complete" && entry.result === null) ctx.addIssue({ code: "custom", message: "Una tirada completa requiere resultado." });
    if (entry.status !== "complete" && entry.result !== null) ctx.addIssue({ code: "custom", message: "Una tirada interrumpida no tiene resultado." });
  }) as T;
}
export const serviceDicePublicEntrySchema = validEntry(z.object({ ...serviceDiceEntryFields, visibility: z.literal("public"), context: serviceDiceContextSchema }).strict());
export type ServiceDicePublicEntry = z.infer<typeof serviceDicePublicEntrySchema>;
export const serviceDiceHiddenEntrySchema = validEntry(z.object({ ...serviceDiceEntryFields, visibility: z.literal("hidden"), context: contextSchema }).strict());
export type ServiceDiceHiddenEntry = z.infer<typeof serviceDiceHiddenEntrySchema>;
export const serviceDiceEntrySchema = z.discriminatedUnion("visibility", [serviceDicePublicEntrySchema, serviceDiceHiddenEntrySchema]);
export type ServiceDiceEntry = z.infer<typeof serviceDiceEntrySchema>;

export const serviceDiceOccupancySchema = z.object({
  rollId: uuid,
  author: dicePublicAuthorSchema,
  phase: z.enum(["preparing", "rolling", "settled"]),
  createdAt: timestamp,
  expiresAt: timestamp.nullable()
}).strict();
export type ServiceDiceOccupancy = z.infer<typeof serviceDiceOccupancySchema>;
export const serviceDicePrivateOccupancySchema = z.object({
  rollId: uuid,
  phase: z.enum(["preparing", "rolling", "settled"]),
  context: contextSchema,
  createdAt: timestamp,
  expiresAt: timestamp.nullable()
}).strict();
export type ServiceDicePrivateOccupancy = z.infer<typeof serviceDicePrivateOccupancySchema>;

export const serviceDiceHistoryPageSchema = z.object({
  revision,
  total: z.number().int().min(0).max(1000),
  offset: z.number().int().min(0).max(1000),
  limit: z.number().int().min(1).max(50),
  entries: z.array(serviceDiceEntrySchema).max(50)
}).strict().superRefine((value, ctx) => {
  if (value.offset + value.entries.length > value.total) ctx.addIssue({ code: "custom", message: "Página de historial inválida." });
});
export type ServiceDiceHistoryPage = z.infer<typeof serviceDiceHistoryPageSchema>;
export const serviceDicePublicHistoryPageSchema = z.object({
  revision,
  total: z.number().int().min(0).max(500),
  offset: z.number().int().min(0).max(500),
  limit: z.number().int().min(1).max(50),
  entries: z.array(serviceDicePublicEntrySchema).max(50)
}).strict().superRefine((value, ctx) => {
  if (value.offset + value.entries.length > value.total) ctx.addIssue({ code: "custom", message: "Página de historial pública inválida." });
});
export type ServiceDicePublicHistoryPage = z.infer<typeof serviceDicePublicHistoryPageSchema>;

export const serviceDicePublicStateSchema = z.object({
  version: z.literal(1),
  sequence: revision,
  serverTime: timestamp,
  selfPublicId: uuid.nullable(),
  publishedContext: serviceDiceContextSchema.nullable(),
  occupancy: serviceDiceOccupancySchema.nullable(),
  presentation: serviceDicePresentationSchema.nullable(),
  history: serviceDicePublicHistoryPageSchema
}).strict();
export type ServiceDicePublicState = z.infer<typeof serviceDicePublicStateSchema>;

const serviceDicePrivateStateSchema = z.object({
  context: contextSchema.nullable(),
  occupancy: serviceDicePrivateOccupancySchema.nullable(),
  presentation: serviceDicePrivatePresentationSchema.nullable(),
  history: serviceDiceHistoryPageSchema
}).strict();
export const serviceDiceStateSchema = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal("player"), public: serviceDicePublicStateSchema }).strict(),
  z.object({ audience: z.literal("dm"), public: serviceDicePublicStateSchema, private: serviceDicePrivateStateSchema }).strict()
]);
export type ServiceDiceState = z.infer<typeof serviceDiceStateSchema>;

export const serviceDiceHistoryQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(1000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  revision: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional()
}).strict();
export type ServiceDiceHistoryQuery = z.infer<typeof serviceDiceHistoryQuerySchema>;

export const serviceDiceBeginSchema = z.object({
  requestId: uuid,
  /** Un jugador aporta el token publicado UUID; el DM puede aportar el contexto privado autorizado. */
  contextToken: id,
  visibility: z.enum(["public", "hidden"]),
  selection: serviceDiceSelectionSchema
}).strict();
export const serviceDicePlayerBeginSchema = serviceDiceBeginSchema.extend({ visibility: z.literal("public") });
export type ServiceDiceBegin = z.infer<typeof serviceDiceBeginSchema>;
export const serviceDiceCompleteSchema = z.object({ requestId: uuid, rollId: uuid, simulation: z.unknown() }).strict();
export const serviceDiceFailSchema = z.object({ requestId: uuid, rollId: uuid }).strict();
export const serviceDiceDismissSchema = z.object({ requestId: uuid, rollId: uuid }).strict();
export const serviceDicePrivateContextSchema = z.object({ requestId: uuid, context: contextSchema }).strict();
export const serviceDiceVisibilitySchema = z.object({ requestId: uuid, rollId: uuid, visible: z.boolean() }).strict();
export const serviceDiceClearHistorySchema = z.object({ requestId: uuid }).strict();

export const serviceDiceAckSchema = z.object({
  ok: z.literal(true),
  version: z.literal(1),
  requestId: uuid,
  rollId: uuid.optional(),
  outcome: z.enum(["accepted", "already-applied", "obsolete"]),
  publicSequence: revision,
  status: serviceDiceEntryStatusSchema.optional()
}).strict();
export type ServiceDiceAck = z.infer<typeof serviceDiceAckSchema>;
export const serviceDiceOperationSchema = z.object({ ok: z.literal(true), operation: serviceDiceAckSchema.nullable() }).strict();
export const serviceDiceStateReplySchema = z.object({ ok: z.literal(true), state: serviceDiceStateSchema }).strict();
export const serviceDiceHistoryReplySchema = z.object({ ok: z.literal(true), page: serviceDiceHistoryPageSchema }).strict();

export const serviceDiceCapabilitiesSchema = z.object({
  ok: z.literal(true),
  version: z.literal(1),
  limits: z.object({ reservationMs: z.literal(20000), historyDefault: z.literal(10), historyMax: z.literal(50), publicHistory: z.literal(500), dmHistory: z.literal(1000) }).strict()
}).strict();
export type ServiceDiceCapabilities = z.infer<typeof serviceDiceCapabilitiesSchema>;
