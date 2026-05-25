import type { WorldPoint } from "../shared/coordinates";

export type LightKind = "point" | "cone";
export const CONE_LIGHT_ANGLE = 60;
export const DEFAULT_POINT_LIGHT_RADIUS = 90;
export const DEFAULT_CONE_LIGHT_RADIUS = 140;

export interface LightSource {
  readonly id: string;
  readonly kind: LightKind;
  readonly position: WorldPoint;
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
  readonly opacity: number;
  readonly angle: number;
  readonly direction: number;
  readonly visible: boolean;
  readonly snapToGrid: boolean;
}

export interface LightPatch {
  readonly position?: WorldPoint;
  readonly radius?: number;
  readonly color?: string;
  readonly intensity?: number;
  readonly opacity?: number;
  readonly angle?: number;
  readonly direction?: number;
  readonly visible?: boolean;
  readonly snapToGrid?: boolean;
}

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export function createLightSource(id: string, kind: LightKind, position: WorldPoint): LightSource {
  assertId(id);
  assertFinitePoint(position);

  return {
    id,
    kind,
    position,
    radius: kind === "point" ? DEFAULT_POINT_LIGHT_RADIUS : DEFAULT_CONE_LIGHT_RADIUS,
    color: kind === "point" ? "#ffd28a" : "#fff1b8",
    intensity: 1,
    opacity: 0.85,
    angle: kind === "point" ? 360 : CONE_LIGHT_ANGLE,
    direction: 0,
    visible: true,
    snapToGrid: false
  };
}

export function updateLightSource(light: LightSource, patch: LightPatch): LightSource {
  const next = {
    ...light,
    ...patch,
    position: patch.position ?? light.position,
    radius: patch.radius === undefined ? light.radius : clampPositive(patch.radius, 1),
    color: patch.color === undefined ? light.color : normalizeHexColor(patch.color),
    intensity: patch.intensity === undefined ? light.intensity : clampUnit(patch.intensity),
    opacity: patch.opacity === undefined ? light.opacity : clampUnit(patch.opacity),
    angle:
      light.kind === "cone"
        ? CONE_LIGHT_ANGLE
        : patch.angle === undefined
          ? light.angle
          : clampAngle(patch.angle),
    direction: patch.direction === undefined ? light.direction : normalizeDirection(patch.direction)
  };

  assertFinitePoint(next.position);

  return next;
}

export function moveLightSource(light: LightSource, position: WorldPoint): LightSource {
  return updateLightSource(light, { position });
}

export function toggleLightVisibility(light: LightSource): LightSource {
  return updateLightSource(light, { visible: !light.visible });
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function clampPositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

export function clampAngle(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(360, Math.max(1, value));
}

export function normalizeDirection(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((value % 360) + 360) % 360;
}

export function normalizeHexColor(color: string): string {
  if (!hexColorPattern.test(color)) {
    throw new Error("Light color must be a hex color like #ffd28a.");
  }

  return color.toLowerCase();
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Light id cannot be empty.");
  }
}

function assertFinitePoint(position: WorldPoint): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Light position must be a finite world coordinate.");
  }
}
