import type { SceneGrid, SceneLightningEffect, SceneSettings } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { measureDistance, snapWorldPoint, snapWorldPointToCellCenter, worldLengthLabel } from "../measurement/measurement";

export const LIGHTNING_CONE_APERTURE_DEGREES = 60;
export const MIN_LIGHTNING_LENGTH = 10;
export type LightningShape = SceneLightningEffect["zone"]["kind"];
export type LightningHandle = "start" | "end" | "radius" | "direction";
export type LightningPatch = Partial<Pick<SceneLightningEffect, "intensity" | "speed" | "opacity" | "sparks" | "visible" | "showGuide">> & { radius?: number; direction?: number };
export const lightningShapeNames: Record<LightningShape, string> = { line: "Linea", cone: "Cono", circle: "Circulo" };
export const normalizeLightningDirection = (angle: number): number => ((angle % 360) + 360) % 360;

export function lightningSeed(id: string): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function lightningPhase(effect: SceneLightningEffect, nowMs: number): number {
  return effect.clockOffsetSeconds + Math.max(0, nowMs - effect.clockOriginMs) / 1000 * effect.speed;
}

export function lightningPoint(point: WorldPoint, shape: LightningShape, grid: SceneGrid, settings: SceneSettings): WorldPoint {
  if (shape === "line") return grid.layout === "hexagonal" ? snapWorldPointToCellCenter(point, grid) : point;
  return settings.snapToGrid ? snapWorldPoint(point, grid) : point;
}

export function lightningZone(shape: LightningShape, start: WorldPoint, end: WorldPoint): SceneLightningEffect["zone"] | null {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return null;
  const radius = Math.hypot(end.x - start.x, end.y - start.y);
  if (!Number.isFinite(radius) || radius < MIN_LIGHTNING_LENGTH) return null;
  if (shape === "line") return { kind: "line", end };
  if (shape === "circle") return { kind: "circle", radius };
  return { kind: "cone", radius, direction: normalizeLightningDirection(Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI) };
}

export function createLightningEffect(id: string, shape: LightningShape, start: WorldPoint, end: WorldPoint, nowMs: number): SceneLightningEffect {
  const zone = lightningZone(shape, start, end);
  if (!id.trim() || !zone || !Number.isFinite(nowMs) || nowMs < 0) throw new Error("Relampago invalido.");
  return { id, kind: "lightning", position: start, zone, intensity: 1.2, speed: 0.7, opacity: 1,
    sparks: true, visible: true, showGuide: shape !== "line", seed: lightningSeed(id), clockOriginMs: nowMs, clockOffsetSeconds: 0 };
}

export function moveLightningEffect(effect: SceneLightningEffect, position: WorldPoint): SceneLightningEffect {
  if (![position.x, position.y].every(Number.isFinite)) return effect;
  return { ...effect, position, zone: effect.zone.kind === "line"
    ? { ...effect.zone, end: { x: effect.zone.end.x + position.x - effect.position.x, y: effect.zone.end.y + position.y - effect.position.y } }
    : effect.zone };
}

export function updateLightningEffect(effect: SceneLightningEffect, patch: LightningPatch, nowMs: number): SceneLightningEffect {
  const clamp = (value: number | undefined, old: number, min: number, max: number): number => value !== undefined && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : old;
  const speed = clamp(patch.speed, effect.speed, 0.2, 1.5);
  const zone = effect.zone.kind === "line" ? effect.zone : {
    ...effect.zone, radius: clamp(patch.radius, effect.zone.radius, MIN_LIGHTNING_LENGTH, Number.MAX_SAFE_INTEGER),
    ...(effect.zone.kind === "cone" && patch.direction !== undefined && Number.isFinite(patch.direction)
      ? { direction: normalizeLightningDirection(patch.direction) } : {})
  };
  const rebase = speed !== effect.speed && Number.isFinite(nowMs) && nowMs >= 0;
  return { ...effect, zone, speed: rebase ? speed : effect.speed,
    clockOffsetSeconds: rebase ? lightningPhase(effect, nowMs) : effect.clockOffsetSeconds,
    clockOriginMs: rebase ? nowMs : effect.clockOriginMs,
    intensity: clamp(patch.intensity, effect.intensity, 0.4, 2), opacity: clamp(patch.opacity, effect.opacity, 0, 1),
    sparks: patch.sparks ?? effect.sparks, visible: patch.visible ?? effect.visible,
    showGuide: zone.kind !== "line" && (patch.showGuide ?? effect.showGuide) };
}

export function editLightningHandle(effect: SceneLightningEffect, handle: LightningHandle, point: WorldPoint, grid: SceneGrid, settings: SceneSettings): SceneLightningEffect {
  if (![point.x, point.y].every(Number.isFinite)) return effect;
  const end = handle === "direction" ? point : lightningPoint(point, effect.zone.kind, grid, settings);
  if (effect.zone.kind === "line") {
    const start = handle === "start" ? end : effect.position;
    const target = handle === "end" ? end : effect.zone.end;
    const zone = lightningZone("line", start, target);
    return zone ? { ...effect, position: start, zone } : effect;
  }
  if (handle === "direction" && effect.zone.kind === "cone") {
    const direction = Math.atan2(end.y - effect.position.y, end.x - effect.position.x) * 180 / Math.PI;
    return updateLightningEffect(effect, { direction }, effect.clockOriginMs);
  }
  return updateLightningEffect(effect, { radius: Math.hypot(end.x - effect.position.x, end.y - effect.position.y) }, effect.clockOriginMs);
}

export function lightningLength(effect: SceneLightningEffect): number {
  return effect.zone.kind === "line" ? Math.hypot(effect.zone.end.x - effect.position.x, effect.zone.end.y - effect.position.y) : effect.zone.radius;
}

export function lightningDirection(effect: SceneLightningEffect): number {
  return effect.zone.kind === "line" ? Math.atan2(effect.zone.end.y - effect.position.y, effect.zone.end.x - effect.position.x)
    : effect.zone.kind === "cone" ? effect.zone.direction * Math.PI / 180 : 0;
}

export function lightningCenter(effect: SceneLightningEffect): WorldPoint {
  if (effect.zone.kind === "line") return { x: (effect.position.x + effect.zone.end.x) / 2, y: (effect.position.y + effect.zone.end.y) / 2 };
  const distance = effect.zone.kind === "circle" ? 0 : lightningLength(effect) / 2;
  const direction = lightningDirection(effect);
  return { x: effect.position.x + Math.cos(direction) * distance, y: effect.position.y + Math.sin(direction) * distance };
}

export function lightningMeasure(effect: SceneLightningEffect, grid: SceneGrid, settings: SceneSettings): string {
  if (effect.zone.kind === "line") return `Largo: ${measureDistance(effect.position, effect.zone.end, { grid, diagonalMode: settings.diagonalMode }).label}`;
  return `${effect.zone.kind === "circle" ? "Radio" : "Largo"}: ${worldLengthLabel(effect.zone.radius, grid)}`;
}

export function hitTestLightning(effect: SceneLightningEffect, point: WorldPoint, tolerance = 0): boolean {
  const dx = point.x - effect.position.x, dy = point.y - effect.position.y;
  const length = lightningLength(effect);
  if (effect.zone.kind === "line") {
    const direction = lightningDirection(effect), x = dx * Math.cos(direction) + dy * Math.sin(direction);
    const y = -dx * Math.sin(direction) + dy * Math.cos(direction);
    return Math.hypot(x - Math.max(0, Math.min(length, x)), y) <= tolerance;
  }
  if (Math.hypot(dx, dy) > length) return false;
  if (effect.zone.kind === "circle" || Math.hypot(dx, dy) < 1e-8) return true;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const diff = Math.abs(((angle - effect.zone.direction + 540) % 360) - 180);
  return diff <= LIGHTNING_CONE_APERTURE_DEGREES / 2;
}
