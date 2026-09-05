export const DEFAULT_MAP_BACKGROUND_COLOR = "#15181a";

export type MapBackgroundColor = string;

const MAP_BACKGROUND_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isMapBackgroundColor(value: unknown): value is MapBackgroundColor {
  return typeof value === "string" && MAP_BACKGROUND_COLOR_PATTERN.test(value);
}

export function normalizeMapBackgroundColor(value: MapBackgroundColor): MapBackgroundColor {
  return value.toLocaleLowerCase();
}
