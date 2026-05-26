import { z } from "zod";
import { SCENE_DOCUMENT_VERSION, type SceneDocument } from "./scene-document";
import { createDefaultFogOfWar } from "../vision/vision";
import { defaultSceneLabelStyle, systemLabelFonts } from "../labels/labels";

const finiteNumber = z.number().finite();
const positiveNumber = finiteNumber.positive();
const opacity = finiteNumber.min(0).max(1);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected hex color like #000000");

const worldPointSchema = z.object({
  x: finiteNumber,
  y: finiteNumber
});

const emojiSchema = z.string().trim().min(1).max(32).optional();
const tokenSizeSchema = z.enum(["tiny", "small", "medium", "large", "huge", "gargantuan"]);
const tokenFootprintSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const labelFontSchema = z.enum(systemLabelFonts);

const linearShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("measurement"),
  emoji: emojiSchema,
  points: z.array(worldPointSchema).min(2)
});

const pathShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("path"),
  points: z.array(worldPointSchema).min(2)
});

const legacyLineShapeSchema = z
  .object({ type: z.literal("line") })
  .passthrough()
  .transform(() => null);

const circleShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("circle"),
  emoji: emojiSchema,
  points: z.array(worldPointSchema).min(1),
  radius: positiveNumber
});

const coneShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cone"),
  emoji: emojiSchema,
  points: z.array(worldPointSchema).min(1),
  radius: positiveNumber,
  angle: finiteNumber.min(1).max(360),
  direction: finiteNumber.min(0).max(360)
});

const rectangleShapeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("rectangle"),
  emoji: emojiSchema,
  points: z.array(worldPointSchema).min(1),
  width: positiveNumber,
  height: positiveNumber
});

const circleFogRevealAreaSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("circle"),
  center: worldPointSchema,
  radius: positiveNumber
});

const strokeFogRevealAreaSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("stroke"),
  points: z.array(worldPointSchema).min(1),
  radius: positiveNumber
});

const fogRevealAreaSchema = z.discriminatedUnion("kind", [
  circleFogRevealAreaSchema,
  strokeFogRevealAreaSchema
]);

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

const fireZoneSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("circle"),
    mode: z.enum(["closed", "open"]),
    radius: positiveNumber,
    innerRadiusRatio: opacity
  }),
  z.object({
    kind: z.literal("cells"),
    radius: positiveNumber.default(50),
    cells: z.array(
      z.object({
        x: finiteNumber,
        y: finiteNumber,
        size: positiveNumber
      })
    ).min(1)
  })
]);

const fireEffectSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("fire"),
  position: worldPointSchema,
  zone: fireZoneSchema.default({
    kind: "circle",
    mode: "closed",
    radius: 90,
    innerRadiusRatio: 0
  }),
  scale: positiveNumber,
  opacity,
  color: hexColor,
  visible: z.boolean(),
  emitsLight: z.boolean(),
  lightRadius: positiveNumber
});

const magicalDarknessEffectSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("magical-darkness"),
  position: worldPointSchema,
  radius: positiveNumber,
  opacity,
  visible: z.boolean()
});

const riverWaterEffectSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("water"),
  variant: z.literal("river"),
  position: worldPointSchema,
  points: z.array(worldPointSchema).min(2),
  width: positiveNumber,
  lineRotation: finiteNumber.default(0),
  patternRotation: finiteNumber.default(0),
  hue: finiteNumber.default(0),
  saturation: finiteNumber.min(0).default(1),
  opacity,
  visible: z.boolean()
});

const closedWaterEffectSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("water"),
  variant: z.literal("water-body"),
  position: worldPointSchema,
  points: z.array(worldPointSchema).min(3),
  lineRotation: finiteNumber.default(0),
  patternRotation: finiteNumber.default(0),
  hue: finiteNumber.default(0),
  saturation: finiteNumber.min(0).default(1),
  opacity,
  visible: z.boolean()
});

const waterEffectSchema = z.discriminatedUnion("variant", [
  riverWaterEffectSchema,
  closedWaterEffectSchema
]);

const tokenSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  imagePath: z.string().min(1),
  position: worldPointSchema,
  size: tokenSizeSchema,
  footprintCells: tokenFootprintSchema,
  selectionColor: hexColor,
  badgeNumber: z.number().int().positive(),
  order: z.number().int().positive(),
  visible: z.boolean().default(true)
});

const labelSchema = z.object({
  id: z.string().min(1),
  type: z.literal("label").default("label"),
  text: z.string().trim().min(1).max(120).default(defaultSceneLabelStyle.text),
  position: worldPointSchema,
  fontFamily: labelFontSchema.default(defaultSceneLabelStyle.fontFamily),
  color: hexColor.default(defaultSceneLabelStyle.color),
  opacity: opacity.default(defaultSceneLabelStyle.opacity),
  shadow: z
    .object({
      enabled: z.boolean().default(defaultSceneLabelStyle.shadow.enabled),
      color: hexColor.default(defaultSceneLabelStyle.shadow.color),
      blur: finiteNumber.min(0).max(64).default(defaultSceneLabelStyle.shadow.blur)
    })
    .default(() => ({ ...defaultSceneLabelStyle.shadow }))
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
    color: hexColor,
    darkvisionEnabled: z.boolean().default(false)
  }),
  fogOfWar: fogOfWarSchema.default(() => ({
    ...createDefaultFogOfWar(),
    revealedAreas: [],
    obstacles: []
  })),
  settings: z.object({
    diagonalMode: z.enum(["dnd5e-default", "dnd5e-alternating", "manhattan", "euclidean"]),
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
  effects: z.array(z.union([fireEffectSchema, magicalDarknessEffectSchema, waterEffectSchema])),
  shapes: z
    .array(
      z.union([
        legacyLineShapeSchema,
        z.discriminatedUnion("type", [
          linearShapeSchema,
          pathShapeSchema,
          circleShapeSchema,
          coneShapeSchema,
          rectangleShapeSchema
        ])
      ])
    )
    .transform((arr) => arr.filter((s): s is NonNullable<typeof s> => s !== null)),
  tokens: z.array(tokenSchema).default([]),
  labels: z.array(labelSchema).default([]),
  sceneAside: z
    .object({
      monsters: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          imagePath: z.string().nullable(),
          visibleToPlayer: z.boolean(),
          notes: z.string().default(""),
          templateId: z.string().min(1).nullable().optional().default(null)
        })
      ),
      npcs: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          imagePath: z.string().nullable(),
          visibleToPlayer: z.boolean(),
          notes: z.string().default("")
        })
      ),
      playerCharacters: z.array(
        z.object({
          id: z.string().min(1),
          characterName: z.string().min(1),
          playerName: z.string().default(""),
          level: z.string().default(""),
          species: z.string().default(""),
          classes: z.string().default(""),
          imagePath: z.string().nullable(),
          stats: z.object({
            strength: z.union([z.string(), z.number().int(), z.null()]).default("").transform(stringifyAbilityScore),
            constitution: z.union([z.string(), z.number().int(), z.null()]).default("").transform(stringifyAbilityScore),
            dexterity: z.union([z.string(), z.number().int(), z.null()]).default("").transform(stringifyAbilityScore),
            intelligence: z.union([z.string(), z.number().int(), z.null()]).default("").transform(stringifyAbilityScore),
            wisdom: z.union([z.string(), z.number().int(), z.null()]).default("").transform(stringifyAbilityScore),
            charisma: z.union([z.string(), z.number().int(), z.null()]).default("").transform(stringifyAbilityScore)
          }),
          initiative: z.string().default(""),
          armorClass: z.string().default(""),
          passivePerception: z.string().default(""),
          hitPoints: z.string().default(""),
          spellSaveDc: z.string().default(""),
          speeds: z.string().default(""),
          notes: z.string().default("")
        })
      ).default([]),
      notes: z.array(
        z.object({
          id: z.string().min(1),
          parentId: z.string().nullable(),
          name: z.string().min(1),
          content: z.string()
        })
      )
    })
    .optional()
    .default(() => ({ monsters: [], npcs: [], playerCharacters: [], notes: [] }))
});

function stringifyAbilityScore(value: string | number | null): string {
  if (value === null) return "";
  return String(value).trim();
}

export function parseSceneDocument(input: unknown): SceneDocument {
  return sceneDocumentV1Schema.parse(input);
}

/**
 * Returns the names of top-level fields that are absent in `rawJson` but would
 * be supplied as defaults by the *current* schema.
 *
 * A non-empty result means the file was saved with an older version of the app
 * and should be re-saved so it includes all current fields.
 *
 * Add a new entry here whenever a new optional-with-default field is added to
 * the schema, keeping this function in sync with the active save format.
 */
export function detectOutdatedSceneFields(rawJson: unknown): readonly string[] {
  if (typeof rawJson !== "object" || rawJson === null) return [];
  const obj = rawJson as Record<string, unknown>;
  const missing: string[] = [];
  // Added in spec 26 (DM aside panel)
  if (!("sceneAside" in obj)) missing.push("sceneAside");
  else {
    const sceneAside = obj["sceneAside"];
    if (
      typeof sceneAside === "object" &&
      sceneAside !== null &&
      !("playerCharacters" in sceneAside)
    ) {
      missing.push("sceneAside.playerCharacters");
    }
  }
  // Added in spec 28 (DM-only map labels)
  if (!("labels" in obj)) missing.push("labels");
  return missing;
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
