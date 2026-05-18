import { clampPositive, clampUnit } from "../lighting/lights";
import type { SceneMagicalDarknessEffect } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export interface MagicalDarknessPatch {
  readonly position?: WorldPoint;
  readonly radius?: number;
  readonly opacity?: number;
  readonly visible?: boolean;
}

export function createMagicalDarknessEffect(
  id: string,
  position: WorldPoint
): SceneMagicalDarknessEffect {
  assertId(id);
  assertFinitePoint(position);

  return {
    id,
    kind: "magical-darkness",
    position,
    radius: 120,
    opacity: 1,
    visible: true
  };
}

export function updateMagicalDarknessEffect(
  effect: SceneMagicalDarknessEffect,
  patch: MagicalDarknessPatch
): SceneMagicalDarknessEffect {
  const next = {
    ...effect,
    ...patch,
    position: patch.position ?? effect.position,
    radius: patch.radius === undefined ? effect.radius : clampPositive(patch.radius, 1),
    opacity: patch.opacity === undefined ? effect.opacity : clampUnit(patch.opacity)
  };

  assertFinitePoint(next.position);
  return next;
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Magical darkness id cannot be empty.");
  }
}

function assertFinitePoint(position: WorldPoint): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Magical darkness position must be a finite world coordinate.");
  }
}
