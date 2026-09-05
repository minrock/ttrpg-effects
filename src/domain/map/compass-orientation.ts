export const compassOrientations = [0, 90, 180, 270] as const;

export type CompassOrientation = (typeof compassOrientations)[number];

export const DEFAULT_COMPASS_ORIENTATION: CompassOrientation = 0;

export function isCompassOrientation(value: unknown): value is CompassOrientation {
  return typeof value === "number" && compassOrientations.includes(value as CompassOrientation);
}

export function normalizeCompassOrientation(value: unknown): CompassOrientation {
  if (isCompassOrientation(value)) {
    return value;
  }
  return DEFAULT_COMPASS_ORIENTATION;
}

export function getCompassLabel(orientation: CompassOrientation): "N" | "E" | "S" | "O" {
  switch (orientation) {
    case 90:
      return "E";
    case 180:
      return "S";
    case 270:
      return "O";
    case 0:
    default:
      return "N";
  }
}

export function getPlayerViewRotationDegrees(orientation: CompassOrientation): number {
  return -orientation;
}
