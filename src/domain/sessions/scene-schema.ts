import { z } from "zod";
import {
  LEGACY_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  type SceneDocument,
  type SceneDocumentV1,
  type SceneMapDocument
} from "./scene-document";
import { createDefaultFogOfWar } from "../vision/vision";
import { defaultSceneLabelStyle, systemLabelFonts } from "../labels/labels";
import { createDefaultCombatTracker } from "../combat/combat-tracker";
import { sanitizeMapScale } from "../map/map-image";
import { migrateSceneDocument, syncActiveMapFromRuntimeFields, syncRuntimeFieldsFromActiveMap } from "./scene-maps";

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

const gridCellSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
  size: positiveNumber,
  layout: z.enum(["square", "hexagonal"]).optional()
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
    cells: z.array(gridCellSchema).min(1)
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

const dynamicLightEffectSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("dynamic-light"),
  position: worldPointSchema,
  brightRadiusCells: positiveNumber.default(2),
  dimRadiusCells: positiveNumber.default(4),
  apertureDegrees: finiteNumber.min(1).max(360).default(360),
  direction: finiteNumber.default(0).transform((value) => ((value % 360) + 360) % 360),
  radius: positiveNumber.optional(),
  color: hexColor,
  intensity: opacity,
  opacity,
  flicker: opacity,
  speed: finiteNumber.min(0.1).max(4),
  visible: z.boolean()
}).transform(({ radius: legacyRadius, ...effect }) => {
  void legacyRadius;
  return {
    ...effect,
    dimRadiusCells: Math.max(effect.brightRadiusCells, effect.dimRadiusCells)
  };
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

const mapInformationPinSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("room-pin"),
  position: worldPointSchema,
  title: z.string().trim().min(1).max(120),
  content: z.string().max(100_000),
  locked: z.boolean().default(false)
});

const mapInformationAreaSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("information-area"),
  areaType: z.enum(["terrain", "trap"]),
  name: z.string().trim().max(120),
  description: z.string().max(100_000),
  cells: z.array(gridCellSchema).min(1),
  locked: z.boolean().default(false)
});

const sceneLinkEndpointSchema = z.object({
  scenePath: z.string().min(1),
  markerId: z.string().min(1),
  mapId: z.string().min(1).optional()
});

const sceneLinkConnectionSchema = z.object({
  connectionId: z.string().min(1),
  role: z.enum(["origin", "destination"]),
  origin: sceneLinkEndpointSchema,
  destination: sceneLinkEndpointSchema,
  peer: sceneLinkEndpointSchema
});

export const mapSceneLinkMarkerSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("scene-link"),
  position: worldPointSchema,
  name: z.string().trim().min(1).max(120),
  locked: z.boolean().default(false),
  connection: sceneLinkConnectionSchema.nullable().default(null)
});

const combatParticipantTypeSchema = z.enum(["monster", "npc", "playerCharacter"]);

const combatParticipantSchema = z.object({
  id: z.string().min(1),
  entityType: combatParticipantTypeSchema,
  entityId: z.string().min(1),
  name: z.string().trim().min(1),
  imagePath: z.string().min(1).nullable(),
  initiative: finiteNumber,
  defeated: z.boolean(),
  enteredRound: z.number().int().min(0),
  activeFromRound: z.number().int().min(0)
});

const combatTrackerSchema = z.object({
  active: z.boolean(),
  participants: z.array(combatParticipantSchema),
  currentParticipantId: z.string().min(1).nullable(),
  round: z.number().int().min(0)
});

export const sceneDocumentV1Schema = z.object({
  version: z.literal(LEGACY_SCENE_DOCUMENT_VERSION),
  map: z.object({
    imagePath: z.string().min(1).nullable(),
    position: worldPointSchema,
    scale: positiveNumber.transform(sanitizeMapScale)
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
    lineWidth: z.union([z.literal(1), z.literal(3)]).default(1),
    layout: z.enum(["square", "hexagonal"]).default("square"),
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
  effects: z.array(
    z.union([
      fireEffectSchema,
      dynamicLightEffectSchema,
      magicalDarknessEffectSchema,
      waterEffectSchema
    ])
  ),
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
  mapAnnotations: z
    .object({
      pins: z.array(mapInformationPinSchema),
      areas: z.array(mapInformationAreaSchema),
      sceneLinks: z.array(mapSceneLinkMarkerSchema).default([])
    })
    .default(() => ({ pins: [], areas: [], sceneLinks: [] })),
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
    .default(() => ({ monsters: [], npcs: [], playerCharacters: [], notes: [] })),
  combatTracker: combatTrackerSchema.default(() => ({
    ...createDefaultCombatTracker(),
    participants: []
  }))
});

const sceneMapDocumentSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  map: sceneDocumentV1Schema.shape.map,
  camera: sceneDocumentV1Schema.shape.camera,
  grid: sceneDocumentV1Schema.shape.grid,
  darkness: sceneDocumentV1Schema.shape.darkness,
  fogOfWar: sceneDocumentV1Schema.shape.fogOfWar,
  settings: sceneDocumentV1Schema.shape.settings,
  lights: sceneDocumentV1Schema.shape.lights,
  effects: sceneDocumentV1Schema.shape.effects,
  shapes: sceneDocumentV1Schema.shape.shapes,
  tokens: sceneDocumentV1Schema.shape.tokens,
  labels: sceneDocumentV1Schema.shape.labels,
  mapAnnotations: sceneDocumentV1Schema.shape.mapAnnotations
}) satisfies z.ZodType<SceneMapDocument>;

export const sceneDocumentV2Schema = z.object({
  version: z.literal(SCENE_DOCUMENT_VERSION),
  maps: z.array(sceneMapDocumentSchema),
  activeMapId: z.string().trim().min(1).nullable(),
  id: z.string().default(""),
  name: z.string().default(""),
  sceneAside: sceneDocumentV1Schema.shape.sceneAside,
  combatTracker: sceneDocumentV1Schema.shape.combatTracker,
  map: sceneDocumentV1Schema.shape.map.optional(),
  camera: sceneDocumentV1Schema.shape.camera.optional(),
  grid: sceneDocumentV1Schema.shape.grid.optional(),
  darkness: sceneDocumentV1Schema.shape.darkness.optional(),
  fogOfWar: sceneDocumentV1Schema.shape.fogOfWar.optional(),
  settings: sceneDocumentV1Schema.shape.settings.optional(),
  lights: sceneDocumentV1Schema.shape.lights.optional(),
  effects: sceneDocumentV1Schema.shape.effects.optional(),
  shapes: sceneDocumentV1Schema.shape.shapes.optional(),
  tokens: sceneDocumentV1Schema.shape.tokens.optional(),
  labels: sceneDocumentV1Schema.shape.labels.optional(),
  mapAnnotations: sceneDocumentV1Schema.shape.mapAnnotations.optional()
}).transform((scene) => {
  const activeMapId =
    scene.activeMapId !== null && scene.maps.some((map) => map.id === scene.activeMapId)
      ? scene.activeMapId
      : scene.maps[0]?.id ?? null;
  const active = activeMapId === null ? null : scene.maps.find((map) => map.id === activeMapId) ?? null;
  const hasRuntimeFields =
    scene.map !== undefined &&
    scene.camera !== undefined &&
    scene.grid !== undefined &&
    scene.darkness !== undefined &&
    scene.fogOfWar !== undefined &&
    scene.settings !== undefined &&
    scene.lights !== undefined &&
    scene.effects !== undefined &&
    scene.shapes !== undefined &&
    scene.tokens !== undefined &&
    scene.labels !== undefined &&
    scene.mapAnnotations !== undefined;
  const parsedScene = {
    version: SCENE_DOCUMENT_VERSION,
    maps: scene.maps,
    activeMapId,
    id: active?.id ?? scene.id,
    name: active?.name ?? scene.name,
    sceneAside: scene.sceneAside,
    combatTracker: scene.combatTracker,
    ...(hasRuntimeFields ? {
      map: scene.map,
      camera: scene.camera,
      grid: scene.grid,
      darkness: scene.darkness,
      fogOfWar: scene.fogOfWar,
      settings: scene.settings,
      lights: scene.lights,
      effects: scene.effects,
      shapes: scene.shapes,
      tokens: scene.tokens,
      labels: scene.labels,
      mapAnnotations: scene.mapAnnotations
    } : active)
  } as SceneDocument;
  return hasRuntimeFields
    ? syncRuntimeFieldsFromActiveMap(syncActiveMapFromRuntimeFields(parsedScene))
    : syncRuntimeFieldsFromActiveMap(parsedScene);
}) satisfies z.ZodType<SceneDocument>;

function stringifyAbilityScore(value: string | number | null): string {
  if (value === null) return "";
  return String(value).trim();
}

export function parseSceneDocument(input: unknown): SceneDocument {
  const record = typeof input === "object" && input !== null ? input as { readonly version?: unknown } : null;
  if (record?.version === SCENE_DOCUMENT_VERSION) {
    return sceneDocumentV2Schema.parse(input);
  }
  return migrateSceneDocument(sceneDocumentV1Schema.parse(input) as SceneDocumentV1);
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
  const isCurrentMultiMapFormat = obj["version"] === SCENE_DOCUMENT_VERSION && Array.isArray(obj["maps"]);
  if (!isCurrentMultiMapFormat) missing.push("maps");
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
  if (isCurrentMultiMapFormat) {
    const maps = obj["maps"] as readonly unknown[];
    if (maps.some((map) => typeof map === "object" && map !== null && !("labels" in map))) {
      missing.push("maps.labels");
    }
  } else if (!("labels" in obj)) missing.push("labels");
  // Added in spec 20 (combat turn tracker)
  if (!("combatTracker" in obj)) missing.push("combatTracker");
  // Added in spec 22 (map information pins and areas)
  const topLevelMapAnnotations = obj["mapAnnotations"];
  if (isCurrentMultiMapFormat) {
    const maps = obj["maps"] as readonly unknown[];
    const hasMissingMapAnnotations = maps.some((map) => typeof map === "object" && map !== null && !("mapAnnotations" in map));
    const hasMissingSceneLinks = maps.some((map) => {
      if (typeof map !== "object" || map === null || !("mapAnnotations" in map)) return false;
      const mapAnnotations = (map as Record<string, unknown>)["mapAnnotations"];
      return typeof mapAnnotations === "object" && mapAnnotations !== null && !("sceneLinks" in mapAnnotations);
    });
    if (hasMissingMapAnnotations) missing.push("maps.mapAnnotations");
    if (hasMissingSceneLinks) missing.push("maps.mapAnnotations.sceneLinks");
  } else if (!("mapAnnotations" in obj)) missing.push("mapAnnotations");
  else {
    const mapAnnotations = topLevelMapAnnotations;
    if (
      typeof mapAnnotations === "object" &&
      mapAnnotations !== null &&
      !("sceneLinks" in mapAnnotations)
    ) {
      missing.push("mapAnnotations.sceneLinks");
    }
  }
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
  const syncedScene = syncActiveMapFromRuntimeFields(parseSceneDocument(scene));
  if (syncedScene.maps.length === 0) {
    throw new Error("Agrega al menos un mapa antes de guardar la escena.");
  }
  const { map, camera, grid, darkness, fogOfWar, settings, lights, effects, shapes, tokens, labels, mapAnnotations, ...persistedScene } = syncedScene;
  void map;
  void camera;
  void grid;
  void darkness;
  void fogOfWar;
  void settings;
  void lights;
  void effects;
  void shapes;
  void tokens;
  void labels;
  void mapAnnotations;
  return `${JSON.stringify(persistedScene, null, 2)}\n`;
}
