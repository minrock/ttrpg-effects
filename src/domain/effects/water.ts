import { clampPositive, clampUnit } from "../lighting/lights";
import type { SceneWaterEffect } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export type WaterEffect = SceneWaterEffect;
export type WaterEffectKind = "river" | "water-body";
export type RiverWaterEffect = Extract<SceneWaterEffect, { readonly variant: "river" }>;

export interface WaterPatch {
  readonly position?: WorldPoint;
  readonly points?: readonly WorldPoint[];
  readonly width?: number;
  readonly lineRotation?: number;
  readonly patternRotation?: number;
  readonly hue?: number;
  readonly saturation?: number;
  readonly opacity?: number;
  readonly visible?: boolean;
}

export interface RiverMergeResult {
  readonly effect: RiverWaterEffect;
  readonly mergedIds: readonly string[];
  readonly didMerge: boolean;
}

export function createWaterEffect(params: {
  readonly id: string;
  readonly points: readonly WorldPoint[];
  readonly gridCellSizeWorld: number;
  readonly width?: number;
}): WaterEffect {
  assertId(params.id);
  const points = normalizeWaterPoints(params.points);
  const threshold = getWaterLoopThreshold(params.gridCellSizeWorld);

  if (isWaterLoop(points, threshold)) {
    if (points.length < 3) {
      throw new Error("Closed water needs at least three points.");
    }

    const closedPoints = closeWaterLoop(points);

    return {
      id: params.id,
      kind: "water",
      variant: "water-body",
      position: getWaterCentroid(closedPoints),
      points: closedPoints,
      lineRotation: 0,
      patternRotation: 0,
      hue: 0,
      saturation: 1,
      opacity: 0.86,
      visible: true
    };
  }

  if (points.length < 2) {
    throw new Error("River water needs at least two points.");
  }

  return {
    id: params.id,
    kind: "water",
    variant: "river",
    position: getWaterCentroid(points),
    points,
    width: clampPositive(params.width ?? params.gridCellSizeWorld, 1),
    lineRotation: 0,
    patternRotation: 0,
    hue: 0,
    saturation: 1,
    opacity: 0.86,
    visible: true
  };
}

export function updateWaterEffect(effect: WaterEffect, patch: WaterPatch): WaterEffect {
  const basePoints =
    patch.points !== undefined
      ? normalizeWaterPoints(patch.points)
      : patch.position !== undefined
        ? translatePoints(effect.points, {
            x: patch.position.x - effect.position.x,
            y: patch.position.y - effect.position.y
          })
        : effect.points;
  const targetLineRotation =
    patch.lineRotation !== undefined ? normalizeDegrees(patch.lineRotation) : effect.lineRotation;
  const nextPoints =
    targetLineRotation !== effect.lineRotation
      ? rotatePoints(basePoints, patch.position ?? effect.position, targetLineRotation - effect.lineRotation)
      : basePoints;

  const shared = {
    ...effect,
    ...patch,
    points: nextPoints,
    position: patch.position ?? getWaterCentroid(nextPoints),
    opacity: patch.opacity === undefined ? effect.opacity : clampUnit(patch.opacity),
    hue: normalizeDegrees(patch.hue ?? effect.hue),
    saturation: clampPositive(patch.saturation ?? effect.saturation, 0),
    visible: patch.visible ?? effect.visible
  };
  const next: WaterEffect =
    effect.variant === "river"
      ? {
          ...shared,
          variant: "river",
          width: clampPositive(patch.width ?? effect.width, 1),
          lineRotation: targetLineRotation,
          patternRotation: normalizeDegrees(patch.patternRotation ?? effect.patternRotation)
        }
      : {
          ...shared,
          variant: "water-body",
          lineRotation: targetLineRotation,
          patternRotation: normalizeDegrees(patch.patternRotation ?? effect.patternRotation)
        };

  validateWaterEffect(next);
  return next;
}

export function mergeConsecutiveRiverEffects(params: {
  readonly rivers: readonly RiverWaterEffect[];
  readonly incoming: RiverWaterEffect;
  readonly maxEndpointDistance: number;
}): RiverMergeResult {
  const maxEndpointDistance = clampPositive(params.maxEndpointDistance, 1);
  let merged = params.incoming;
  const remaining = [...params.rivers];
  const mergedIds: string[] = [];
  let didMerge = false;
  let mergedIntoExisting = false;

  for (let index = 0; index < remaining.length; ) {
    const candidate = remaining[index];
    if (candidate === undefined) {
      index += 1;
      continue;
    }

    const nextPoints = joinConsecutiveRiverPoints(candidate.points, merged.points, maxEndpointDistance);
    if (nextPoints === null) {
      index += 1;
      continue;
    }

    mergedIds.push(candidate.id);
    didMerge = true;
    remaining.splice(index, 1);

    if (!mergedIntoExisting) {
      merged = updateWaterEffect(candidate, {
        points: nextPoints,
        width: candidate.width,
        lineRotation: candidate.lineRotation,
        patternRotation: candidate.patternRotation,
        hue: candidate.hue,
        saturation: candidate.saturation,
        opacity: candidate.opacity,
        visible: candidate.visible
      }) as RiverWaterEffect;
      mergedIntoExisting = true;
      continue;
    }

    merged = updateWaterEffect(merged, { points: nextPoints }) as RiverWaterEffect;
  }

  return {
    effect: merged,
    mergedIds,
    didMerge
  };
}

export function isWaterLoop(points: readonly WorldPoint[], threshold: number): boolean {
  if (points.length < 3) {
    return false;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (first === undefined || last === undefined) {
    return false;
  }

  return Math.hypot(last.x - first.x, last.y - first.y) <= clampPositive(threshold, 1);
}

export function normalizeWaterPoints(points: readonly WorldPoint[]): readonly WorldPoint[] {
  const normalized: WorldPoint[] = [];

  for (const point of points) {
    assertFinitePoint(point);
    const previous = normalized[normalized.length - 1];

    if (previous !== undefined && Math.hypot(point.x - previous.x, point.y - previous.y) < 1) {
      continue;
    }

    normalized.push({ x: point.x, y: point.y });
  }

  return normalized;
}

export function getWaterLoopThreshold(gridCellSizeWorld: number): number {
  return Math.max(12, clampPositive(gridCellSizeWorld, 1) * 0.5);
}

export function getWaterCentroid(points: readonly WorldPoint[]): WorldPoint {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

function closeWaterLoop(points: readonly WorldPoint[]): readonly WorldPoint[] {
  const first = points[0];

  if (first === undefined) {
    return points;
  }

  return points.slice(0, -1).concat(first);
}

function joinConsecutiveRiverPoints(
  existingPoints: readonly WorldPoint[],
  incomingPoints: readonly WorldPoint[],
  maxEndpointDistance: number
): readonly WorldPoint[] | null {
  const existingStart = existingPoints[0];
  const existingEnd = existingPoints[existingPoints.length - 1];
  const incomingStart = incomingPoints[0];
  const incomingEnd = incomingPoints[incomingPoints.length - 1];

  if (
    existingStart === undefined ||
    existingEnd === undefined ||
    incomingStart === undefined ||
    incomingEnd === undefined
  ) {
    return null;
  }

  if (arePointsNear(existingEnd, incomingStart, maxEndpointDistance)) {
    return normalizeWaterPoints(existingPoints.concat(incomingPoints));
  }

  if (arePointsNear(existingStart, incomingEnd, maxEndpointDistance)) {
    return normalizeWaterPoints(incomingPoints.concat(existingPoints));
  }

  if (arePointsNear(existingStart, incomingStart, maxEndpointDistance)) {
    return normalizeWaterPoints([...incomingPoints].reverse().concat(existingPoints));
  }

  if (arePointsNear(existingEnd, incomingEnd, maxEndpointDistance)) {
    return normalizeWaterPoints(existingPoints.concat([...incomingPoints].reverse()));
  }

  return null;
}

function arePointsNear(a: WorldPoint, b: WorldPoint, maxDistance: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= maxDistance;
}

function translatePoints(points: readonly WorldPoint[], delta: WorldPoint): readonly WorldPoint[] {
  return points.map((point) => ({
    x: point.x + delta.x,
    y: point.y + delta.y
  }));
}

function rotatePoints(points: readonly WorldPoint[], center: WorldPoint, angleDegrees: number): readonly WorldPoint[] {
  const angle = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };
  });
}

function validateWaterEffect(effect: WaterEffect): void {
  assertId(effect.id);
  for (const point of effect.points) {
    assertFinitePoint(point);
  }
  assertFinitePoint(effect.position);

  if (effect.variant === "river" && effect.points.length < 2) {
    throw new Error("River water needs at least two points.");
  }

  if (effect.variant === "water-body" && effect.points.length < 3) {
    throw new Error("Closed water needs at least three points.");
  }
}

function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((value % 360) + 360) % 360;
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Water effect id cannot be empty.");
  }
}

function assertFinitePoint(position: WorldPoint): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Water effect point must be a finite world coordinate.");
  }
}
