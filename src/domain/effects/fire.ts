import { clampPositive, clampUnit, normalizeHexColor } from "../lighting/lights";
import type { WorldPoint } from "../shared/coordinates";

export type EffectKind = "fire";

export interface AnimatedFireEffect {
  readonly id: string;
  readonly kind: EffectKind;
  readonly position: WorldPoint;
  readonly scale: number;
  readonly opacity: number;
  readonly color: string;
  readonly visible: boolean;
  readonly emitsLight: boolean;
  readonly lightRadius: number;
}

export interface FirePatch {
  readonly position?: WorldPoint;
  readonly scale?: number;
  readonly opacity?: number;
  readonly color?: string;
  readonly visible?: boolean;
  readonly emitsLight?: boolean;
  readonly lightRadius?: number;
}

export function createAnimatedFireEffect(id: string, position: WorldPoint): AnimatedFireEffect {
  assertId(id);
  assertFinitePoint(position);

  return {
    id,
    kind: "fire",
    position,
    scale: 1,
    opacity: 0.95,
    color: "#ff7a38",
    visible: true,
    emitsLight: true,
    lightRadius: 150
  };
}

export function updateAnimatedFireEffect(
  effect: AnimatedFireEffect,
  patch: FirePatch
): AnimatedFireEffect {
  const next = {
    ...effect,
    ...patch,
    position: patch.position ?? effect.position,
    scale: patch.scale === undefined ? effect.scale : clampPositive(patch.scale, 0.1),
    opacity: patch.opacity === undefined ? effect.opacity : clampUnit(patch.opacity),
    color: patch.color === undefined ? effect.color : normalizeHexColor(patch.color),
    lightRadius:
      patch.lightRadius === undefined ? effect.lightRadius : clampPositive(patch.lightRadius, 1)
  };

  assertFinitePoint(next.position);

  return next;
}

export function moveAnimatedFireEffect(
  effect: AnimatedFireEffect,
  position: WorldPoint
): AnimatedFireEffect {
  return updateAnimatedFireEffect(effect, { position });
}

export function toggleFireVisibility(effect: AnimatedFireEffect): AnimatedFireEffect {
  return updateAnimatedFireEffect(effect, { visible: !effect.visible });
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Fire effect id cannot be empty.");
  }
}

function assertFinitePoint(position: WorldPoint): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Fire effect position must be a finite world coordinate.");
  }
}
