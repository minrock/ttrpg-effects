import type { SceneFireEffect, SceneFireZone, SceneGrid, SceneSettings } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { measureDistance, snapWorldPoint, snapWorldPointToCellCenter, worldLengthLabel } from "../measurement/measurement";
import { isPointInGridCell } from "../grid/grid-cell";

export const FIRE_CONE_APERTURE = 60;
export const MIN_FIRE_LENGTH = 10;
export type FireShape = "line" | "cone" | "circle";
export type FireHandle = "start" | "end" | "radius" | "direction";
export const fireShapeNames = { line: "Linea", cone: "Cono", circle: "Circulo", cells: "Pintado" } as const;
type FireGeometry = Pick<SceneFireEffect, "position" | "zone" | "scale">;
const directionDegrees = (start: WorldPoint, end: WorldPoint): number =>
  ((Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI) + 360) % 360;

export function firePoint(point: WorldPoint, shape: FireShape, grid: SceneGrid, settings: SceneSettings): WorldPoint {
  if (shape === "line") return grid.layout === "hexagonal" ? snapWorldPointToCellCenter(point, grid) : point;
  return settings.snapToGrid ? snapWorldPoint(point, grid) : point;
}

export function fireZone(shape: FireShape, start: WorldPoint, end: WorldPoint, width: number): SceneFireZone | null {
  if (![start.x, start.y, end.x, end.y, width].every(Number.isFinite) || width <= 0) return null;
  const radius = Math.hypot(end.x - start.x, end.y - start.y);
  if (!Number.isFinite(radius) || radius < MIN_FIRE_LENGTH) return null;
  if (shape === "line") return { kind: "line", end, width };
  if (shape === "cone") return { kind: "cone", radius, direction: directionDegrees(start, end) };
  return { kind: "circle", mode: "closed", radius, innerRadiusRatio: 0 };
}

export function fireLength(effect: FireGeometry): number {
  return (effect.zone.kind === "line" ? Math.hypot(effect.zone.end.x - effect.position.x, effect.zone.end.y - effect.position.y) : effect.zone.radius) * effect.scale;
}

export function fireDirection(effect: FireGeometry): number {
  return effect.zone.kind === "line" ? Math.atan2(effect.zone.end.y - effect.position.y, effect.zone.end.x - effect.position.x)
    : effect.zone.kind === "cone" ? effect.zone.direction * Math.PI / 180 : 0;
}

export function fireEnd(effect: FireGeometry): WorldPoint {
  if (effect.zone.kind === "line") return {
    x: effect.position.x + (effect.zone.end.x - effect.position.x) * effect.scale,
    y: effect.position.y + (effect.zone.end.y - effect.position.y) * effect.scale
  };
  const direction = fireDirection(effect), length = fireLength(effect);
  return { x: effect.position.x + Math.cos(direction) * length, y: effect.position.y + Math.sin(direction) * length };
}

export function hasValidFireGeometry(effect: FireGeometry): boolean {
  if (effect.zone.kind !== "line" && effect.zone.kind !== "cone") return true;
  const length = fireLength(effect), end = fireEnd(effect);
  return length >= 1 && Number.isFinite(length) && Number.isFinite(end.x) && Number.isFinite(end.y) &&
    (effect.zone.kind !== "line" || (effect.zone.width > 0 && Number.isFinite(effect.zone.width * effect.scale))) &&
    fireOutline(effect).every(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

export function fireCenter(effect: FireGeometry): WorldPoint {
  if (effect.zone.kind !== "line" && effect.zone.kind !== "cone") return effect.position;
  const end = fireEnd(effect);
  return { x: (effect.position.x + end.x) / 2, y: (effect.position.y + end.y) / 2 };
}

/** Finite world-space footprint shared by raster fuel, selection and lighting. */
export function fireOutline(effect: FireGeometry, padding = 0): WorldPoint[] {
  if (padding > 0) return expandConvexOutline(fireOutline(effect), padding);
  const { x, y } = effect.position, length = fireLength(effect), direction = fireDirection(effect);
  if (effect.zone.kind === "line") {
    const end = fireEnd(effect), half = effect.zone.width * effect.scale / 2;
    const dx = -Math.sin(direction) * half, dy = Math.cos(direction) * half;
    return [{ x: x + dx, y: y + dy }, { x: x - dx, y: y - dy }, { x: end.x - dx, y: end.y - dy }, { x: end.x + dx, y: end.y + dy }];
  }
  if (effect.zone.kind !== "cone") return [];
  const half = FIRE_CONE_APERTURE * Math.PI / 360;
  return [{ x, y }, ...Array.from({ length: 33 }, (_, i) => {
    const angle = direction - half + 2 * half * i / 32;
    return { x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length };
  })];
}

function expandConvexOutline(points: readonly WorldPoint[], padding: number): WorldPoint[] {
  return points.flatMap((point, index) => {
    const before = points[(index + points.length - 1) % points.length]!, after = points[(index + 1) % points.length]!;
    const start = Math.atan2(before.x - point.x, point.y - before.y);
    const end = Math.atan2(point.x - after.x, after.y - point.y);
    const turn = (end - start + Math.PI * 2) % (Math.PI * 2);
    const steps = Math.max(1, Math.ceil(turn / (Math.PI / 24)));
    return Array.from({ length: steps + 1 }, (_, i) => ({
      x: point.x + Math.cos(start + turn * i / steps) * padding,
      y: point.y + Math.sin(start + turn * i / steps) * padding
    }));
  });
}

export function hitTestFire(effect: FireGeometry, point: WorldPoint): boolean {
  if (effect.zone.kind === "cells") return effect.zone.cells.some(cell => isPointInGridCell(point, cell));
  const dx = point.x - effect.position.x, dy = point.y - effect.position.y;
  const length = fireLength(effect), distance = Math.hypot(dx, dy);
  if (effect.zone.kind === "circle") return distance <= length && (effect.zone.mode === "closed" || distance >= length * effect.zone.innerRadiusRatio);
  const direction = fireDirection(effect), x = dx * Math.cos(direction) + dy * Math.sin(direction), y = -dx * Math.sin(direction) + dy * Math.cos(direction);
  if (effect.zone.kind === "line") return x >= 0 && x <= length && Math.abs(y) <= effect.zone.width * effect.scale / 2;
  return distance <= length && (distance < 1e-8 || Math.abs(Math.atan2(y, x)) <= FIRE_CONE_APERTURE * Math.PI / 360);
}

export function fireMeasure(effect: FireGeometry, grid: SceneGrid, settings: SceneSettings): string {
  if (effect.zone.kind === "line") return `Largo: ${measureDistance(effect.position, fireEnd(effect), { grid, diagonalMode: settings.diagonalMode }).label}`;
  return `${effect.zone.kind === "cone" ? "Largo" : "Radio"}: ${worldLengthLabel(fireLength(effect), grid)}`;
}

export function editFireHandle(effect: SceneFireEffect, handle: FireHandle, point: WorldPoint, grid: SceneGrid, settings: SceneSettings): SceneFireEffect {
  if (effect.zone.kind === "cells" || ![point.x, point.y].every(Number.isFinite)) return effect;
  const target = handle === "direction" ? point : firePoint(point, effect.zone.kind, grid, settings);
  if (effect.zone.kind === "line") {
    const start = handle === "start" ? target : effect.position, end = handle === "end" ? target : fireEnd(effect);
    if (Math.hypot(end.x - start.x, end.y - start.y) < MIN_FIRE_LENGTH) return effect;
    return { ...effect, position: start, zone: { ...effect.zone, end: { x: start.x + (end.x - start.x) / effect.scale, y: start.y + (end.y - start.y) / effect.scale } } };
  }
  if (handle === "direction" && effect.zone.kind === "cone") return { ...effect, zone: { ...effect.zone, direction: directionDegrees(effect.position, target) } };
  return { ...effect, zone: { ...effect.zone, radius: Math.max(MIN_FIRE_LENGTH, Math.hypot(target.x - effect.position.x, target.y - effect.position.y)) / effect.scale } };
}
