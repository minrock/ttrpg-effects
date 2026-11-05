import { z } from "zod";
const point = z.object({ x: z.number().finite().min(-1e7).max(1e7), y: z.number().finite().min(-1e7).max(1e7) }).strict();
const length = z.number().finite().positive().max(1e6);
const base = { points: z.array(point).min(1).max(256), emoji: z.string().max(64).optional() };
export const annotationGeometrySchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("measurement"), points: z.array(point).length(2) }).strict(),
  z.object({ ...base, type: z.literal("path"), points: z.array(point).min(2).max(256) }).strict(),
  z.object({ ...base, type: z.literal("circle"), points: z.array(point).length(1), radius: length }).strict(),
  z.object({ ...base, type: z.literal("cone"), points: z.array(point).length(1), radius: length, angle: z.number().finite().min(1).max(360), direction: z.number().finite().min(-360).max(360) }).strict(),
  z.object({ ...base, type: z.literal("rectangle"), points: z.array(point).length(1), width: length, height: length }).strict()
]);
export type AnnotationGeometry = z.infer<typeof annotationGeometrySchema>;
const id = z.uuid();
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const annotationAuthorSchema = z.object({ publicId: id, alias: z.string().max(160), discriminator: z.number().int().min(1).max(1000) }).strict();
export const sharedAnnotationSchema = z.object({ id, revision, author: annotationAuthorSchema, geometry: annotationGeometrySchema, measurementLabel: z.string().max(160).optional(), committedGeometry: annotationGeometrySchema.optional(), preview: z.boolean(), expiresAt: z.number().finite().optional() }).strict();
export type SharedAnnotation = z.infer<typeof sharedAnnotationSchema>;
export const annotationStateSchema = z.object({ version: z.literal(1), serverTime: z.number().finite(), sceneId: z.string().nullable(), sequence: revision, self: id.nullable(), items: z.array(sharedAnnotationSchema).max(320) }).strict();
export type AnnotationState = z.infer<typeof annotationStateSchema>;
export const annotationCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), id, geometry: annotationGeometrySchema }).strict(),
  z.object({ action: z.literal("update"), id, revision, geometry: annotationGeometrySchema }).strict(),
  z.object({ action: z.literal("delete"), id, revision }).strict(),
  z.object({ action: z.literal("clear-own") }).strict(),
  z.object({ action: z.literal("clear-all") }).strict(),
  z.object({ action: z.literal("preview"), id, revision, geometry: annotationGeometrySchema }).strict(),
  z.object({ action: z.literal("cancel-preview") }).strict()
]);
export type AnnotationCommand = z.infer<typeof annotationCommandSchema>;
export interface AnnotationView {
  readonly supported: boolean; readonly connected: boolean; readonly state: AnnotationState | null;
  readonly snapshot: import("../../domain/player/player-window").PlayerWindowSnapshot | null;
  readonly context: string | null; readonly error: string;
}
export interface SharedAnnotationsClient {
  getSnapshot(): AnnotationView;
  subscribe(listener: () => void): () => void;
  command(command: AnnotationCommand): Promise<void>;
}

/** Adapta la figura local sin transportar campos auxiliares del editor. */
export function shapeAnnotationGeometry(shape: import("../../domain/sessions/scene-document").SceneShape): AnnotationGeometry {
  const common = { type: shape.type, points: shape.points, ...(shape.emoji === undefined ? {} : { emoji: shape.emoji }) };
  return annotationGeometrySchema.parse({ ...common,
    ...(shape.type === "circle" || shape.type === "cone" ? { radius: shape.radius } : {}),
    ...(shape.type === "cone" ? { angle: shape.angle, direction: shape.direction } : {}),
    ...(shape.type === "rectangle" ? { width: shape.width, height: shape.height } : {})
  });
}
