import { MAP_SCALE_MAX, MAP_SCALE_MIN, isMapImageDimensions, type MapImageDimensions } from "./map-image";

export type MapImageReplacementPolicy = "preserve-world-size" | "keep-scale";

export const MAP_IMAGE_ASPECT_RATIO_TOLERANCE = 1e-6;

export interface MapImageReplacementGeometry {
  readonly scale: number;
  readonly imageSize?: MapImageDimensions;
}

/** Validates the selected policy without clamping or changing it implicitly. */
export function computeReplacementScale(
  previous: MapImageReplacementGeometry,
  nextSize: MapImageDimensions,
  policy: MapImageReplacementPolicy
): number {
  if (!isMapImageDimensions(nextSize)) {
    throw new Error("Las dimensiones de la imagen nueva deben ser enteros positivos validos.");
  }
  if (!isValidScale(previous.scale)) {
    throw new Error("La escala actual del mapa debe estar entre 0.25 y 4.");
  }
  if (policy === "keep-scale") return previous.scale;
  if (policy !== "preserve-world-size") {
    throw new Error("La politica de tamano de imagen no es valida.");
  }
  const previousSize = previous.imageSize;
  if (!isMapImageDimensions(previousSize)) {
    throw new Error("No se conocen dimensiones anteriores validas. Selecciona Mantener escala actual.");
  }

  const widthRatio = previousSize.width / nextSize.width;
  const heightRatio = previousSize.height / nextSize.height;
  if (Math.abs(widthRatio - heightRatio) > MAP_IMAGE_ASPECT_RATIO_TOLERANCE * Math.max(widthRatio, heightRatio)) {
    throw new Error("La proporcion de la imagen cambio. Selecciona Mantener escala actual.");
  }

  // Identical dimensions must retain even scales with full floating-point precision.
  const nextScale = previousSize.width === nextSize.width
    ? previous.scale
    : previous.scale * previousSize.width / nextSize.width;
  if (!isValidScale(nextScale)) {
    throw new Error("Conservar el tamano requiere una escala fuera de 0.25 a 4. Selecciona Mantener escala actual.");
  }
  return nextScale;
}

export const calculateReplacementMapScale = computeReplacementScale;

function isValidScale(scale: number): boolean {
  return Number.isFinite(scale) && scale >= MAP_SCALE_MIN && scale <= MAP_SCALE_MAX;
}
