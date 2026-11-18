import type { SceneCounter } from "../../../domain/counters/scene-counters";
import type { DiceResult } from "../../../domain/dice/dice";
import type { SceneFireEffect, SceneGrid, SceneLightningEffect, SceneSettings } from "../../../domain/sessions/scene-document";

export const storyGrid: SceneGrid = {
  enabled: true,
  locked: false,
  cellSizeWorld: 50,
  opacity: 0.5,
  lineWidth: 1,
  layout: "square",
  unit: "ft",
  distancePerCell: 5,
  metricDistancePerCell: 1.5
};

export const storySettings: SceneSettings = { diagonalMode: "dnd5e-default", snapToGrid: true };

export const storyFire: SceneFireEffect = {
  id: "story-fire",
  kind: "fire",
  position: { x: 100, y: 100 },
  zone: { kind: "circle", mode: "closed", radius: 100, innerRadiusRatio: 0 },
  scale: 1,
  opacity: 0.7,
  color: "#ff6030",
  visible: true,
  emitsLight: true,
  lightRadius: 150
};

export const storyLightning: SceneLightningEffect = {
  id: "story-lightning",
  kind: "lightning",
  position: { x: 100, y: 100 },
  zone: { kind: "cone", radius: 150, direction: 45 },
  intensity: 1.2,
  speed: 0.7,
  opacity: 0.9,
  sparks: true,
  visible: true,
  showGuide: true,
  seed: 1,
  clockOriginMs: 0,
  clockOffsetSeconds: 0
};

export const storyCounters: readonly SceneCounter[] = [
  { id: "turns", label: "Turnos de la ronda", mode: "countdown", kind: "fixed", value: 3, capacity: 6, isVisibleToPlayers: false, isLabelVisibleToPlayers: false },
  { id: "threat", label: "Amenaza", mode: "progress", kind: "dynamic", value: 12, isVisibleToPlayers: true, isLabelVisibleToPlayers: true }
];

export const storyDiceResult: DiceResult = {
  d20: { mode: "advantage", values: [8, 17], selected: 1, value: 17, modifier: 4, total: 21 },
  groups: [
    { id: "fire", damageType: "fire", formula: "2d6 + 3", dice: [{ id: "fire-1", type: "d6", value: 6, parts: [6] }, { id: "fire-2", type: "d6", value: 4, parts: [4] }], modifier: 3, total: 13 }
  ],
  poolTotal: 13
};
