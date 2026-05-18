import { clampPositive, clampUnit, normalizeHexColor } from "../lighting/lights";
import type { WorldPoint } from "../shared/coordinates";

export type EffectKind = "fire";
export type FireCircleMode = "closed" | "open";

export type FireZone =
  | {
      readonly kind: "circle";
      readonly mode: FireCircleMode;
      readonly radius: number;
      readonly innerRadiusRatio: number;
    }
  | {
      readonly kind: "freehand";
      readonly points: readonly WorldPoint[];
    };

export interface AnimatedFireEffect {
  readonly id: string;
  readonly kind: EffectKind;
  readonly position: WorldPoint;
  readonly zone: FireZone;
  readonly scale: number;
  readonly opacity: number;
  readonly color: string;
  readonly visible: boolean;
  readonly emitsLight: boolean;
  readonly lightRadius: number;
}

export interface FirePatch {
  readonly position?: WorldPoint;
  readonly zone?: FireZone;
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
    zone: createCircleFireZone(),
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
  const nextPosition = patch.position ?? effect.position;
  const zone =
    patch.zone === undefined
      ? translateFreehandZone(effect.zone, effect.position, nextPosition)
      : sanitizeFireZone(patch.zone);
  const next = {
    ...effect,
    ...patch,
    position: nextPosition,
    zone,
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

export function createCircleFireZone(
  radius = 90,
  mode: FireCircleMode = "closed"
): FireZone {
  return {
    kind: "circle",
    mode,
    radius: clampPositive(radius, 1),
    innerRadiusRatio: mode === "open" ? 0.58 : 0
  };
}

export function createFreehandFireZone(points: readonly WorldPoint[]): FireZone {
  const simplifiedPoints = simplifyFreehandPoints(points, 12);

  if (simplifiedPoints.length < 3) {
    throw new Error("Freehand fire zone needs at least three points.");
  }

  return {
    kind: "freehand",
    points: simplifiedPoints
  };
}

export function toggleCircleFireMode(effect: AnimatedFireEffect): AnimatedFireEffect {
  if (effect.zone.kind !== "circle") {
    return effect;
  }

  const nextMode: FireCircleMode = effect.zone.mode === "closed" ? "open" : "closed";

  return updateAnimatedFireEffect(effect, {
    zone: createCircleFireZone(effect.zone.radius, nextMode)
  });
}

export function getFireZoneBounds(
  effect: Pick<AnimatedFireEffect, "position" | "zone" | "scale">
): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;

    return {
      left: effect.position.x - radius,
      right: effect.position.x + radius,
      top: effect.position.y - radius,
      bottom: effect.position.y + radius
    };
  }

  const xs = effect.zone.points.map((point) => point.x);
  const ys = effect.zone.points.map((point) => point.y);

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys)
  };
}

export function calculateFireTileCenters(
  effect: Pick<AnimatedFireEffect, "position" | "zone" | "scale">,
  tileSize: number,
  maxTiles = 160
): readonly WorldPoint[] {
  const bounds = getFireZoneBounds(effect);
  const spacing = Math.max(1, tileSize * 0.82 * effect.scale);
  const centers: WorldPoint[] = [];

  for (let y = bounds.top + spacing / 2; y <= bounds.bottom; y += spacing) {
    for (let x = bounds.left + spacing / 2; x <= bounds.right; x += spacing) {
      if (centers.length >= maxTiles) {
        return centers;
      }

      centers.push({ x, y });
    }
  }

  return centers.length > 0 ? centers : [effect.position];
}

export function sanitizeFireZone(zone: FireZone): FireZone {
  if (zone.kind === "circle") {
    const radius = clampPositive(zone.radius, 1);
    const innerRadiusRatio = clampUnit(zone.innerRadiusRatio);

    return {
      kind: "circle",
      mode: zone.mode,
      radius,
      innerRadiusRatio: zone.mode === "open" ? Math.max(0.05, innerRadiusRatio) : 0
    };
  }

  return createFreehandFireZone(zone.points);
}

export function simplifyFreehandPoints(
  points: readonly WorldPoint[],
  minDistance: number
): readonly WorldPoint[] {
  const simplified: WorldPoint[] = [];

  for (const point of points) {
    assertFinitePoint(point);
    const previous = simplified.at(-1);

    if (previous === undefined || Math.hypot(point.x - previous.x, point.y - previous.y) >= minDistance) {
      simplified.push(point);
    }
  }

  return simplified;
}

function translateFreehandZone(zone: FireZone, from: WorldPoint, to: WorldPoint): FireZone {
  if (zone.kind !== "freehand" || (from.x === to.x && from.y === to.y)) {
    return zone;
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return {
    kind: "freehand",
    points: zone.points.map((point) => ({
      x: point.x + dx,
      y: point.y + dy
    }))
  };
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
