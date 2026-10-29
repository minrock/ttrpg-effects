import { createAnimatedFireEffect, createCircleFireZone, updateAnimatedFireEffect } from "../../../domain/effects/fire";
import { createLightSource, updateLightSource } from "../../../domain/lighting/lights";
import type { SceneDocument } from "../../../domain/sessions/scene-document";
import { createDefaultSceneMap, createSceneWithMap } from "../../../domain/sessions/scene-maps";
import { createTacticalShape, updateShape } from "../../../domain/shapes/shapes";

/** Stable IDs for the lab shell's object list and inspector. */
export const LAB_SCENE_IDS = {
  map: "map-cloister",
  fireBrazier: "fire-brazier",
  fireCourtyard: "fire-courtyard",
  lightArch: "light-arch",
  lightRiver: "light-river",
  areaCourtyard: "area-courtyard",
  pinGate: "pin-gate"
} as const;

/** Fresh, in-memory scene. Pixi centers the 1536 x 1024 image at world (0, 0). */
export function createLabScene(): SceneDocument {
  const defaults = createDefaultSceneMap();
  const grid = { ...defaults.grid, cellSizeWorld: 64, opacity: 0.2 };
  return createSceneWithMap(createDefaultSceneMap({
    id: LAB_SCENE_IDS.map,
    name: "Claustro del rio",
    backgroundColor: "#182526",
    compassOrientation: 0,
    map: {
      imagePath: null,
      imageSize: { width: 1536, height: 1024 },
      position: { x: 0, y: 0 },
      scale: 1
    },
    grid,
    darkness: { ...defaults.darkness, enabled: false },
    mapAnnotations: {
      ...defaults.mapAnnotations,
      pins: [{ id: LAB_SCENE_IDS.pinGate, kind: "room-pin", position: { x: -512, y: 256 },
        title: "Puerta del claustro", content: "", locked: false }]
    },
    effects: [
      updateAnimatedFireEffect(createAnimatedFireEffect(LAB_SCENE_IDS.fireBrazier, { x: -320, y: -128 }), {
        zone: createCircleFireZone(28), lightRadius: 150
      }),
      updateAnimatedFireEffect(createAnimatedFireEffect(LAB_SCENE_IDS.fireCourtyard, { x: 256, y: 192 }), {
        zone: createCircleFireZone(36), lightRadius: 180
      })
    ],
    lights: [
      updateLightSource(createLightSource(LAB_SCENE_IDS.lightArch, "cone", { x: -448, y: 64 }), {
        radius: 256, direction: 0, opacity: 0.55
      }),
      updateLightSource(createLightSource(LAB_SCENE_IDS.lightRiver, "point", { x: 448, y: -128 }), {
        radius: 160, color: "#9ddfe5", opacity: 0.45
      })
    ],
    shapes: [updateShape(createTacticalShape({
      id: LAB_SCENE_IDS.areaCourtyard,
      kind: "circle",
      position: { x: 0, y: 64 },
      grid,
      settings: defaults.settings
    }), { radius: 128 })]
  }));
}
