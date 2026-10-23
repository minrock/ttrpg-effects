export const supportedMapImageExtensions = ["png", "jpg", "jpeg", "webp", "heic"] as const;

export type SupportedMapImageExtension = (typeof supportedMapImageExtensions)[number];

export interface MapImageDimensions {
  readonly width: number;
  readonly height: number;
}

export interface MapImageState {
  readonly mapId?: string;
  readonly imagePath: string | null;
  readonly imageUrl: string | null;
  readonly imageSize?: MapImageDimensions;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly scale: number;
}

export interface MapOpenSuccess {
  readonly ok: true;
  readonly imagePath: string;
  readonly imageUrl: string;
}

export interface MapOpenFailure {
  readonly ok: false;
  readonly error: string;
}

export type MapOpenResult = MapOpenSuccess | MapOpenFailure;

export const MAP_SCALE_MIN = 0.25;
export const MAP_SCALE_MAX = 4;
export const MAP_SCALE_DEFAULT = 1;

export function isSupportedMapImageExtension(extension: string): extension is SupportedMapImageExtension {
  return supportedMapImageExtensions.includes(extension.toLowerCase() as SupportedMapImageExtension);
}

export function createMapImageState(imagePath: string, imageUrl: string): MapImageState {
  return {
    imagePath,
    imageUrl,
    position: { x: 0, y: 0 },
    scale: MAP_SCALE_DEFAULT
  };
}

export function sanitizeMapScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) {
    return MAP_SCALE_DEFAULT;
  }

  return Math.min(MAP_SCALE_MAX, Math.max(MAP_SCALE_MIN, scale));
}

export function isMapImageDimensions(value: unknown): value is MapImageDimensions {
  if (typeof value !== "object" || value === null) return false;
  const dimensions = value as Partial<MapImageDimensions>;
  return (
    typeof dimensions.width === "number" && Number.isSafeInteger(dimensions.width) && dimensions.width > 0 &&
    typeof dimensions.height === "number" && Number.isSafeInteger(dimensions.height) && dimensions.height > 0
  );
}
