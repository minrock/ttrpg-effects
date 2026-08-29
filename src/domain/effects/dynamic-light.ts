import {
  clampAngle,
  clampPositive,
  clampUnit,
  normalizeDirection,
  normalizeHexColor
} from "../lighting/lights";
import type { SceneDynamicLightEffect } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export interface DynamicLightPatch {
  readonly position?: WorldPoint;
  readonly brightRadiusCells?: number;
  readonly dimRadiusCells?: number;
  readonly apertureDegrees?: number;
  readonly direction?: number;
  readonly color?: string;
  readonly intensity?: number;
  readonly opacity?: number;
  readonly flicker?: number;
  readonly speed?: number;
  readonly visible?: boolean;
}

export type DynamicLightSavePayload = SceneDynamicLightEffect & {
  /** Compatibility bridge for renderer sessions still using the prototype main schema. */
  readonly radius: number;
};

export function createDynamicLightEffect(
  id: string,
  position: WorldPoint
): SceneDynamicLightEffect {
  assertId(id);
  assertFinitePoint(position);

  return {
    id,
    kind: "dynamic-light",
    position,
    brightRadiusCells: 2,
    dimRadiusCells: 4,
    apertureDegrees: 360,
    direction: 0,
    color: "#ff9f43",
    intensity: 0.9,
    opacity: 0.85,
    flicker: 0.55,
    speed: 1,
    visible: true
  };
}

export function updateDynamicLightEffect(
  effect: SceneDynamicLightEffect,
  patch: DynamicLightPatch
): SceneDynamicLightEffect {
  const next = {
    ...effect,
    ...patch,
    position: patch.position ?? effect.position,
    brightRadiusCells:
      patch.brightRadiusCells === undefined
        ? effect.brightRadiusCells
        : clampPositive(patch.brightRadiusCells, 0.5),
    dimRadiusCells:
      patch.dimRadiusCells === undefined
        ? effect.dimRadiusCells
        : clampPositive(patch.dimRadiusCells, 0.5),
    apertureDegrees:
      patch.apertureDegrees === undefined
        ? effect.apertureDegrees
        : clampAngle(patch.apertureDegrees),
    direction:
      patch.direction === undefined
        ? effect.direction
        : normalizeDirection(patch.direction),
    color: patch.color === undefined ? effect.color : normalizeHexColor(patch.color),
    intensity: patch.intensity === undefined ? effect.intensity : clampUnit(patch.intensity),
    opacity: patch.opacity === undefined ? effect.opacity : clampUnit(patch.opacity),
    flicker: patch.flicker === undefined ? effect.flicker : clampUnit(patch.flicker),
    speed: patch.speed === undefined ? effect.speed : Math.min(4, clampPositive(patch.speed, 0.1))
  };

  const normalized = {
    ...next,
    dimRadiusCells: Math.max(next.brightRadiusCells, next.dimRadiusCells)
  };

  assertFinitePoint(normalized.position);
  return normalized;
}

export function createDynamicLightSavePayload(
  effect: SceneDynamicLightEffect,
  cellSizeWorld: number
): DynamicLightSavePayload {
  return {
    ...effect,
    radius: effect.dimRadiusCells * clampPositive(cellSizeWorld, 100)
  };
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Dynamic light id cannot be empty.");
  }
}

function assertFinitePoint(position: WorldPoint): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Dynamic light position must be a finite world coordinate.");
  }
}
