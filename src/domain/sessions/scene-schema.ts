import { z } from "zod";
import { SCENE_DOCUMENT_VERSION, type SceneDocument } from "./scene-document";
import { createDefaultFogOfWar } from "../vision/vision";

const finiteNumber = z.number().finite();
const positiveNumber = finiteNumber.positive();
const opacity = finiteNumber.min(0).max(1);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected hex color like #000000");

const worldPointSchema = z.object({
  x: finiteNumber,
  y: finiteNumber
});

const linearShapeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["measurement", "line"]),
  points: z.array(worldPointSchema).min(2)
});

const circleShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("circle"),
  points: z.array(worldPointSchema).min(1),
  radius: positiveNumber
});

const coneShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cone"),
  points: z.array(worldPointSchema).min(1),
  radius: positiveNumber,
  angle: finiteNumber.min(1).max(360),
  direction: finiteNumber.min(0).max(360)
});

const rectangleShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("rectangle"),
  points: z.array(worldPointSchema).min(1),
  width: positiveNumber,
  height: positiveNumber
});

const fogRevealAreaSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("circle"),
  center: worldPointSchema,
  radius: positiveNumber
});

const fogObstacleSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("wall"),
  points: z.array(worldPointSchema).min(2)
});

const fogOfWarSchema = z.object({
  enabled: z.boolean(),
  opacity,
  color: hexColor,
  revealRadius: positiveNumber,
  revealedAreas: z.array(fogRevealAreaSchema),
  obstacles: z.array(fogObstacleSchema)
});

export const sceneDocumentV1Schema = z.object({
  version: z.literal(SCENE_DOCUMENT_VERSION),
  map: z.object({
    imagePath: z.string().min(1).nullable(),
    position: worldPointSchema,
    scale: positiveNumber
  }),
  camera: z.object({
    x: finiteNumber,
    y: finiteNumber,
    zoom: positiveNumber
  }),
  grid: z.object({
    enabled: z.boolean(),
    locked: z.boolean(),
    cellSizeWorld: positiveNumber,
    opacity,
    unit: z.enum(["ft", "m"]),
    distancePerCell: positiveNumber,
    metricDistancePerCell: positiveNumber
  }),
  darkness: z.object({
    enabled: z.boolean(),
    opacity,
    color: hexColor
  }),
  fogOfWar: fogOfWarSchema.default(() => ({
    ...createDefaultFogOfWar(),
    revealedAreas: [],
    obstacles: []
  })),
  settings: z.object({
    diagonalMode: z.enum(["dnd5e-default", "manhattan", "euclidean"]),
    snapToGrid: z.boolean()
  }),
  lights: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum(["point", "cone"]),
      position: worldPointSchema,
      radius: positiveNumber,
      color: hexColor,
      intensity: opacity,
      opacity,
      angle: finiteNumber.min(1).max(360),
      direction: finiteNumber.min(0).max(360),
      visible: z.boolean(),
      snapToGrid: z.boolean()
    })
  ),
  effects: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.literal("fire"),
      position: worldPointSchema,
      scale: positiveNumber,
      opacity,
      color: hexColor,
      visible: z.boolean(),
      emitsLight: z.boolean(),
      lightRadius: positiveNumber
    })
  ),
  shapes: z.array(
    z.discriminatedUnion("type", [
      linearShapeSchema,
      circleShapeSchema,
      coneShapeSchema,
      rectangleShapeSchema
    ])
  )
});

export function parseSceneDocument(input: unknown): SceneDocument {
  return sceneDocumentV1Schema.parse(input);
}

export function parseSceneJson(json: string): SceneDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("El archivo no contiene JSON valido.");
  }

  try {
    return parseSceneDocument(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const path = firstIssue?.path.length ? firstIssue.path.join(".") : "scene";
      throw new Error(`La escena no tiene un formato valido en ${path}.`);
    }

    throw error;
  }
}

export function serializeSceneDocument(scene: SceneDocument): string {
  const validScene = parseSceneDocument(scene);
  return `${JSON.stringify(validScene, null, 2)}\n`;
}
