import { z } from "zod";
import { sanitizePlayerWindowSnapshot } from "../../domain/player/player-window-snapshot";
import { contextSchema, draftSchema, requestSchema } from "../../domain/dice/dice";
import type { DiceEnvelope, DiceSessionState } from "../../domain/dice/dice";
import { diceSizeChangeSchema } from "../../domain/dice/size";

const id = z.string().min(1).max(160);
const finite = z.number().finite().min(-1e8).max(1e8);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const cameraSchema = z.object({ center: z.object({ x: finite, y: finite }).strict(), zoom: z.number().finite().min(.01).max(100) }).strict();
export const commandSchema = z.object({ revision, camera: cameraSchema, reason: z.enum(["open", "move", "zoom", "recenter", "scene-change"]) }).strict();
export const reportSchema = z.object({ reportRevision: revision, acknowledgedCommandRevision: revision.nullable(), camera: cameraSchema, origin: z.enum(["local-navigation", "remote-command", "initialization"]), final: z.boolean(), viewport: z.object({ width: z.number().finite().positive().max(32768), height: z.number().finite().positive().max(32768), devicePixelRatio: z.number().finite().positive().max(16), orientation: z.enum(["landscape", "portrait"]), mapId: id.optional() }).strict().optional() }).strict();
export const pointerSchema = z.object({ id, position: z.object({ x: finite, y: finite }).strict(), creatureSize: z.enum(["tiny", "small", "medium", "large", "huge", "gargantuan"]), durationMs: z.number().int().min(100).max(10000) }).strict();
export const highlightSchema = z.object({ id, areaId: id, areaType: z.enum(["terrain", "trap"]), cells: z.array(z.object({ x: finite, y: finite, size: z.number().finite().positive().max(1e6), layout: z.enum(["square", "hexagonal"]).optional() }).strict()).min(1).max(10000), durationMs: z.literal(5000) }).strict();
export const snapshotSchema = z.unknown().transform((value, ctx) => {
  const parsed = sanitizePlayerWindowSnapshot(value);
  if (!parsed) { ctx.addIssue({ code: "custom", message: "Proyección inválida." }); return z.NEVER; }
  return parsed;
});
export const mutationSchema = z.object({ requestId: z.uuid(), context: z.string().max(160).nullable(), connectionId: z.uuid().optional(), revision: revision.optional(), payload: z.unknown() }).strict();
export const tablePayloads = {
  open: z.object({ snapshot: snapshotSchema.optional() }).strict(), scene: snapshotSchema.nullable(),
  camera: cameraSchema, "camera-command": commandSchema, "camera-report": reportSchema,
  pointer: pointerSchema, "area-highlight": highlightSchema,
  ready: z.object({}).strict(), "map-image-status": z.object({ imageUrl: z.string().max(300), ok: z.boolean(), error: z.string().max(500).optional() }).strict()
};
export const dicePayloads = {
  context: contextSchema, preferences: draftSchema, begin: requestSchema,
  complete: z.object({ rollId: id, simulation: z.unknown() }).strict(),
  fail: z.object({ rollId: id }).strict(), dismiss: z.object({ rollId: id }).strict(),
  visibility: z.object({ rollId: id, visible: z.boolean() }).strict(), size: diceSizeChangeSchema,
  "clear-history": z.object({}).strict(), "render-status": z.object({ rollId: id, ok: z.boolean() }).strict()
};
export const sizesSchema = z.object({ revision, dm: z.number().min(1).max(2.5), player: z.number().min(1).max(2.5) });
// El estado proviene de la sesión autorizada; validar el sobre antes del render.
const envelopeStructure = z.object({ revision, presentation: z.object({
  rollId: id, contextToken: id, sceneId: z.string(), mapId: z.string(),
  dice: z.array(z.object({ id, type: z.enum(["d4","d6","d8","d10","d12","d20","d100"]), damageType: z.enum(["none","acid","bludgeoning","slashing","piercing","fire","cold","force","necrotic","psychic","radiant","lightning","thunder","poison"]), groupId: id.nullable(), logicalId: id, role: z.enum(["pool","tens","units","check"]) })).max(24),
  appearance: z.object({ color: z.string(), material: z.enum(["resin","matte","metal"]) }),
  replay: z.object({ frames: z.array(z.number().finite()).max(60648), frameCount: revision, stepMs: z.number().positive(), durationMs: z.number().nonnegative() }).nullable(),
  result: z.object({ groups: z.array(z.object({ id, damageType: z.enum(["none","acid","bludgeoning","slashing","piercing","fire","cold","force","necrotic","psychic","radiant","lightning","thunder","poison"]), formula: z.string(), dice: z.array(z.object({ id, type: z.enum(["d4","d6","d8","d10","d12","d%"]), value: z.number(), parts: z.array(z.number()) })), modifier: z.number().optional(), total: z.number() })), poolTotal: z.number(), d20: z.object({ mode: z.enum(["normal","advantage","disadvantage"]), values: z.array(z.number()), selected: revision, value: z.number(), modifier: z.number(), total: z.number() }).nullable() }).nullable(),
  critical: z.object({ dieId: id }).nullable().optional(), startedAt: z.number().finite(), settledAt: z.number().finite()
}).nullable() });
export const envelopeSchema: z.ZodType<DiceEnvelope> = envelopeStructure;
export const diceSessionSchema: z.ZodType<DiceSessionState> = z.object({ protocolVersion: revision, draft: draftSchema, history: z.array(z.object({ id, context: contextSchema, request: requestSchema, createdAt: z.number(), settledAt: z.number(), status: z.enum(["complete","interrupted","failed"]), result: envelopeStructure.shape.presentation.unwrap().shape.result })), envelope: envelopeSchema, publicRollId: id.nullable(), publicResultVisible: z.boolean(), busyUntil: z.number() });
export const presenceSchema = z.object({ count: revision, primaryId: z.uuid().nullable(), ready: z.boolean(), imageStatus: z.enum(["waiting","loading","ready","error"]), report: reportSchema.nullable() });
export const tableStateSchema = z.object({ protocolVersion: z.literal(1), epoch: z.uuid(), context: z.uuid().nullable(), revision, serverTime: z.number(), snapshot: snapshotSchema.nullable(), camera: cameraSchema.nullable(), cameraCommand: commandSchema.nullable(), dice: envelopeSchema, sizes: sizesSchema, presence: presenceSchema.optional(), connectionId: z.uuid().optional(), pointer: z.object({ value: pointerSchema, startedAt: z.number(), expiresAt: z.number() }).nullable(), highlight: z.object({ value: highlightSchema, startedAt: z.number(), expiresAt: z.number() }).nullable() });
export type TableState = z.infer<typeof tableStateSchema>;
export const tableEventSchema = z.object({ protocolVersion: z.literal(1), epoch: z.uuid(), context: z.uuid().nullable(), revision, serverTime: z.number(), sequence: revision, type: z.enum(["bootstrap","scene","camera","camera-command","pointer","highlight","presence","image-status","dice","sizes","render-error","heartbeat"]), state: tableStateSchema.optional(), payload: z.unknown().optional() });
export type TableEvent = z.infer<typeof tableEventSchema>;
