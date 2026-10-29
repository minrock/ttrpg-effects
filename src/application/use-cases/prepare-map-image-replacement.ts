import {
  browserMapImageReplacementResultSchema,
  type MapImageReplacementResult,
  type MapImageStorage
} from "../services/map-image-storage";

export async function prepareMapImageReplacementUseCase(
  storage: MapImageStorage
): Promise<MapImageReplacementResult> {
  try {
    return browserMapImageReplacementResultSchema.parse(await storage.selectReplacementMapImage());
  } catch {
    return { status: "error", error: "No se pudo preparar la imagen del mapa." };
  }
}
