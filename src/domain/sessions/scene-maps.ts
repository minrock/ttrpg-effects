import type { MapAnnotations } from "../annotations/map-annotations";
import { createDefaultMapAnnotations } from "../annotations/map-annotations";
import { createDefaultCombatTracker } from "../combat/combat-tracker";
import { DEFAULT_COMPASS_ORIENTATION, type CompassOrientation } from "../map/compass-orientation";
import { createDefaultFogOfWar } from "../vision/vision";
import { createDefaultSceneAside } from "./scene-aside";
import {
  LEGACY_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  type AnySceneDocument,
  type SceneCamera,
  type SceneDarkness,
  type SceneDocument,
  type SceneDocumentV1,
  type SceneEffect,
  type SceneFogOfWar,
  type SceneGrid,
  type SceneLabel,
  type SceneLight,
  type SceneMap,
  type SceneMapDocument,
  type SceneSettings,
  type SceneShape,
  type SceneToken
} from "./scene-document";

export interface ActiveMapPayload {
  readonly map: SceneMap;
  readonly camera: SceneCamera;
  readonly grid: SceneGrid;
  readonly darkness: SceneDarkness;
  readonly fogOfWar: SceneFogOfWar;
  readonly settings: SceneSettings;
  readonly lights: readonly SceneLight[];
  readonly effects: readonly SceneEffect[];
  readonly shapes: readonly SceneShape[];
  readonly tokens: readonly SceneToken[];
  readonly labels: readonly SceneLabel[];
  readonly mapAnnotations: MapAnnotations;
}

export function createDefaultMapPayload(): ActiveMapPayload {
  return {
    map: {
      imagePath: null,
      position: { x: 0, y: 0 },
      scale: 1
    },
    camera: {
      x: 0,
      y: 0,
      zoom: 1
    },
    grid: {
      enabled: true,
      locked: false,
      cellSizeWorld: 100,
      opacity: 0.35,
      lineWidth: 1,
      layout: "square",
      unit: "ft",
      distancePerCell: 5,
      metricDistancePerCell: 1.5
    },
    darkness: {
      enabled: true,
      opacity: 0.65,
      color: "#000000",
      darkvisionEnabled: false
    },
    fogOfWar: createDefaultFogOfWar(),
    settings: {
      diagonalMode: "dnd5e-default",
      snapToGrid: true
    },
    lights: [],
    effects: [],
    shapes: [],
    tokens: [],
    labels: [],
    mapAnnotations: createDefaultMapAnnotations()
  };
}

export function createDefaultSceneMap(
  input: Partial<Pick<SceneMapDocument, "id" | "name" | "compassOrientation">> & Partial<ActiveMapPayload> = {}
): SceneMapDocument {
  const payload = { ...createDefaultMapPayload(), ...input };
  return {
    id: input.id ?? "map-1",
    name: input.name ?? "Mapa 1",
    compassOrientation: input.compassOrientation ?? DEFAULT_COMPASS_ORIENTATION,
    map: payload.map,
    camera: payload.camera,
    grid: payload.grid,
    darkness: payload.darkness,
    fogOfWar: payload.fogOfWar,
    settings: payload.settings,
    lights: payload.lights,
    effects: payload.effects,
    shapes: payload.shapes,
    tokens: payload.tokens,
    labels: payload.labels,
    mapAnnotations: payload.mapAnnotations
  };
}

export function createEmptyScene(): SceneDocument {
  const payload = createDefaultMapPayload();
  return {
    version: SCENE_DOCUMENT_VERSION,
    maps: [],
    activeMapId: null,
    id: "",
    name: "",
    compassOrientation: DEFAULT_COMPASS_ORIENTATION,
    sceneAside: createDefaultSceneAside(),
    combatTracker: createDefaultCombatTracker(),
    ...payload
  };
}

export function createSceneWithMap(map: SceneMapDocument): SceneDocument {
  return syncRuntimeFieldsFromActiveMap({
    ...createEmptyScene(),
    maps: [map],
    activeMapId: map.id
  });
}

export function createSceneMapFromLegacyScene(scene: SceneDocumentV1, id = "map-1", name = "Mapa 1"): SceneMapDocument {
  return {
    id,
    name,
    compassOrientation: DEFAULT_COMPASS_ORIENTATION,
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
  };
}

export function setActiveMapCompassOrientation(
  scene: SceneDocument,
  orientation: CompassOrientation
): SceneDocument {
  if (scene.activeMapId === null) return scene;
  const synced = syncActiveMapFromRuntimeFields(scene);
  return syncRuntimeFieldsFromActiveMap({
    ...synced,
    maps: synced.maps.map((map) =>
      map.id === synced.activeMapId ? { ...map, compassOrientation: orientation } : map
    ),
    compassOrientation: orientation
  });
}

export function migrateSceneDocument(scene: AnySceneDocument): SceneDocument {
  if (scene.version === SCENE_DOCUMENT_VERSION) {
    return syncRuntimeFieldsFromActiveMap(syncActiveMapFromRuntimeFields(scene));
  }

  if (scene.version !== LEGACY_SCENE_DOCUMENT_VERSION) {
    throw new Error("Version de escena no soportada.");
  }

  const map = createSceneMapFromLegacyScene(scene);
  return syncRuntimeFieldsFromActiveMap({
    version: SCENE_DOCUMENT_VERSION,
    maps: [map],
    activeMapId: map.id,
    sceneAside: scene.sceneAside ?? createDefaultSceneAside(),
    combatTracker: scene.combatTracker,
    ...map
  });
}

export function getActiveSceneMap(scene: SceneDocument): SceneMapDocument | null {
  if (scene.activeMapId === null) return null;
  return scene.maps.find((map) => map.id === scene.activeMapId) ?? null;
}

export function syncActiveMapFromRuntimeFields(scene: SceneDocument): SceneDocument {
  if (scene.activeMapId === null) return scene;
  const active = getActiveSceneMap(scene);
  if (active === null) return scene;

  const synced: SceneMapDocument = {
    ...active,
    compassOrientation: scene.compassOrientation,
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
  };

  return {
    ...scene,
    maps: scene.maps.map((map) => (map.id === synced.id ? synced : map))
  };
}

export function syncRuntimeFieldsFromActiveMap(scene: SceneDocument): SceneDocument {
  const active = getActiveSceneMap(scene);
  if (active === null) return scene;
  return { ...scene, ...active };
}

export function setActiveSceneMap(scene: SceneDocument, mapId: string): SceneDocument {
  if (!scene.maps.some((map) => map.id === mapId)) {
    throw new Error("El mapa seleccionado no existe.");
  }
  return syncRuntimeFieldsFromActiveMap({
    ...syncActiveMapFromRuntimeFields(scene),
    activeMapId: mapId
  });
}

export function upsertSceneMap(scene: SceneDocument, map: SceneMapDocument): SceneDocument {
  const exists = scene.maps.some((candidate) => candidate.id === map.id);
  const maps = exists
    ? scene.maps.map((candidate) => (candidate.id === map.id ? map : candidate))
    : [...scene.maps, map];
  return syncRuntimeFieldsFromActiveMap({
    ...scene,
    maps,
    activeMapId: scene.activeMapId ?? map.id
  });
}

export function addSceneMap(scene: SceneDocument, map: SceneMapDocument, makeActive = true): SceneDocument {
  return syncRuntimeFieldsFromActiveMap({
    ...syncActiveMapFromRuntimeFields(scene),
    maps: [...scene.maps, map],
    activeMapId: makeActive ? map.id : scene.activeMapId ?? map.id
  });
}

export function renameSceneMap(scene: SceneDocument, mapId: string, name: string): SceneDocument {
  const trimmed = name.trim();
  if (trimmed === "") return scene;
  return syncRuntimeFieldsFromActiveMap({
    ...syncActiveMapFromRuntimeFields(scene),
    maps: scene.maps.map((map) => (map.id === mapId ? { ...map, name: trimmed } : map))
  });
}

export function reorderSceneMaps(scene: SceneDocument, mapIds: readonly string[]): SceneDocument {
  const byId = new Map(scene.maps.map((map) => [map.id, map]));
  const ordered = mapIds.flatMap((id) => {
    const map = byId.get(id);
    if (map === undefined) return [];
    byId.delete(id);
    return [map];
  });
  return syncRuntimeFieldsFromActiveMap({
    ...syncActiveMapFromRuntimeFields(scene),
    maps: [...ordered, ...byId.values()]
  });
}

export function removeSceneMap(scene: SceneDocument, mapId: string): SceneDocument {
  const synced = syncActiveMapFromRuntimeFields(scene);
  if (!synced.maps.some((map) => map.id === mapId)) return synced;

  const maps = synced.maps.filter((map) => map.id !== mapId);
  const activeMapId = synced.activeMapId === mapId ? maps[0]?.id ?? null : synced.activeMapId;
  return syncRuntimeFieldsFromActiveMap({ ...synced, maps, activeMapId });
}

export function canSaveScene(scene: SceneDocument): boolean {
  return syncActiveMapFromRuntimeFields(scene).maps.length > 0;
}

export function hasSceneMapContent(map: SceneMapDocument): boolean {
  const defaults = createDefaultSceneMap({ id: map.id, name: map.name });
  return (
    map.map.imagePath !== null ||
    map.lights.length > 0 ||
    map.effects.length > 0 ||
    map.shapes.length > 0 ||
    map.tokens.length > 0 ||
    map.labels.length > 0 ||
    map.mapAnnotations.pins.length > 0 ||
    map.mapAnnotations.areas.length > 0 ||
    map.mapAnnotations.sceneLinks.length > 0 ||
    map.fogOfWar.revealedAreas.length > 0 ||
    map.fogOfWar.obstacles.length > 0 ||
    JSON.stringify(map.grid) !== JSON.stringify(defaults.grid) ||
    JSON.stringify(map.darkness) !== JSON.stringify(defaults.darkness) ||
    JSON.stringify(map.fogOfWar) !== JSON.stringify(defaults.fogOfWar) ||
    JSON.stringify(map.settings) !== JSON.stringify(defaults.settings)
  );
}

export function getNextSceneMapId(scene: SceneDocument): string {
  let next = scene.maps.length + 1;
  const used = new Set(scene.maps.map((map) => map.id));
  while (used.has(`map-${next}`)) next += 1;
  return `map-${next}`;
}

export function getNextSceneMapName(scene: SceneDocument): string {
  let next = scene.maps.length + 1;
  const used = new Set(scene.maps.map((map) => map.name.toLocaleLowerCase()));
  while (used.has(`mapa ${next}`)) next += 1;
  return `Mapa ${next}`;
}
