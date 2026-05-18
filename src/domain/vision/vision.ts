import type { SceneFogOfWar, SceneFogObstacle, SceneLight } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export type RevealAreaKind = "circle";

export interface CreateRevealAreaOptions {
  readonly id: string;
  readonly center: WorldPoint;
  readonly radius: number;
}

export interface CreateRevealStrokeOptions {
  readonly id: string;
  readonly points: readonly WorldPoint[];
  readonly radius: number;
}

export function createDefaultFogOfWar(): SceneFogOfWar {
  return {
    enabled: false,
    opacity: 0.92,
    color: "#000000",
    revealRadius: 50,
    revealedAreas: [],
    obstacles: []
  };
}

export function createCircleRevealArea({
  id,
  center,
  radius
}: CreateRevealAreaOptions): SceneFogOfWar["revealedAreas"][number] {
  assertId(id);
  assertFinitePoint(center);

  return {
    id,
    kind: "circle",
    center,
    radius: sanitizePositive(radius)
  };
}

export function createStrokeRevealArea({
  id,
  points,
  radius
}: CreateRevealStrokeOptions): SceneFogOfWar["revealedAreas"][number] {
  assertId(id);

  if (points.length === 0) {
    throw new Error("Vision stroke must include at least one point.");
  }

  for (const point of points) {
    assertFinitePoint(point);
  }

  return {
    id,
    kind: "stroke",
    points: simplifyStrokePoints(points, sanitizePositive(radius)),
    radius: sanitizePositive(radius)
  };
}

export function addRevealedArea(
  fogOfWar: SceneFogOfWar,
  area: SceneFogOfWar["revealedAreas"][number]
): SceneFogOfWar {
  return {
    ...fogOfWar,
    revealedAreas: [...fogOfWar.revealedAreas, area]
  };
}

export function simplifyStrokePoints(
  points: readonly WorldPoint[],
  radius: number
): readonly WorldPoint[] {
  if (points.length <= 1) {
    return points;
  }

  const minDistance = Math.max(8, sanitizePositive(radius) * 0.35);
  const simplified: WorldPoint[] = [points[0]];

  for (const point of points.slice(1, -1)) {
    const previous = simplified[simplified.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) >= minDistance) {
      simplified.push(point);
    }
  }

  const last = points[points.length - 1];
  const previous = simplified[simplified.length - 1];

  if (Math.hypot(last.x - previous.x, last.y - previous.y) >= 1) {
    simplified.push(last);
  }

  return simplified;
}

export function clearRevealedAreas(fogOfWar: SceneFogOfWar): SceneFogOfWar {
  return {
    ...fogOfWar,
    revealedAreas: []
  };
}

export function updateFogOfWar(
  fogOfWar: SceneFogOfWar,
  patch: Partial<Pick<SceneFogOfWar, "enabled" | "opacity" | "color" | "revealRadius">>
): SceneFogOfWar {
  return {
    ...fogOfWar,
    ...patch,
    opacity: patch.opacity === undefined ? fogOfWar.opacity : clampUnit(patch.opacity),
    revealRadius:
      patch.revealRadius === undefined ? fogOfWar.revealRadius : sanitizePositive(patch.revealRadius)
  };
}

export function createWallObstacle(
  id: string,
  from: WorldPoint,
  to: WorldPoint
): SceneFogObstacle {
  assertId(id);
  assertFinitePoint(from);
  assertFinitePoint(to);

  return {
    id,
    kind: "wall",
    points: [from, to]
  };
}

export function getVisibleAreasFromLights(
  lights: readonly SceneLight[]
): readonly SceneFogOfWar["revealedAreas"][number][] {
  return lights
    .filter((light) => light.visible)
    .map((light) => ({
      id: `vision-${light.id}`,
      kind: "circle" as const,
      center: light.position,
      radius: sanitizePositive(light.radius)
    }));
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function sanitizePositive(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Vision id cannot be empty.");
  }
}

function assertFinitePoint(point: WorldPoint): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Vision point must be a finite world coordinate.");
  }
}
