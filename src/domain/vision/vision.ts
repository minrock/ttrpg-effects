import type { SceneFogOfWar, SceneFogObstacle, SceneLight } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export type RevealAreaKind = "circle";

export interface CreateRevealAreaOptions {
  readonly id: string;
  readonly center: WorldPoint;
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

export function addRevealedArea(
  fogOfWar: SceneFogOfWar,
  area: SceneFogOfWar["revealedAreas"][number]
): SceneFogOfWar {
  return {
    ...fogOfWar,
    revealedAreas: [...fogOfWar.revealedAreas, area]
  };
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
