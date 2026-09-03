import { SCENE_DOCUMENT_VERSION, type SceneDocument } from "./scene-document";
import { createDefaultFogOfWar } from "../vision/vision";
import { createDefaultSceneAside } from "./scene-aside";
import { createDefaultCombatTracker } from "../combat/combat-tracker";
import { createDefaultMapAnnotations } from "../annotations/map-annotations";

export function createDefaultScene(): SceneDocument {
  return {
    version: SCENE_DOCUMENT_VERSION,
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
      locked: true,
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
    mapAnnotations: createDefaultMapAnnotations(),
    sceneAside: createDefaultSceneAside(),
    combatTracker: createDefaultCombatTracker()
  };
}
