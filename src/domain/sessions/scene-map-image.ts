import { isMapImageDimensions, type MapImageDimensions } from "../map/map-image";
import { calculateReplacementMapScale, type MapImageReplacementPolicy } from "../map/map-image-replacement";
import type { SceneDocument } from "./scene-document";
import { syncActiveMapFromRuntimeFields } from "./scene-maps";

export interface SceneMapImageReplacement {
  readonly imagePath: string;
  readonly imageSize: MapImageDimensions;
  readonly policy: MapImageReplacementPolicy;
}

/** Records a successful decode only while its target path is still current. */
export function recordMapImageDimensions(
  scene: SceneDocument,
  mapId: string,
  imagePath: string,
  imageSize: MapImageDimensions
): SceneDocument {
  const synced = syncActiveMapFromRuntimeFields(scene);
  const target = synced.maps.find((map) => map.id === mapId);
  if (target === undefined || target.map.imagePath !== imagePath || target.map.imageSize !== undefined) {
    return scene;
  }
  return seedSceneMapImageSize(scene, mapId, imageSize);
}

/** Seeds decoded metadata only when absent, retaining the previous image baseline. */
export function seedSceneMapImageSize(
  scene: SceneDocument,
  mapId: string,
  imageSize: MapImageDimensions
): SceneDocument {
  if (!isMapImageDimensions(imageSize)) {
    throw new Error("Las dimensiones de la imagen deben ser enteros positivos validos.");
  }
  const synced = syncActiveMapFromRuntimeFields(scene);
  const target = synced.maps.find((map) => map.id === mapId);
  if (target === undefined) throw new Error("El mapa seleccionado ya no existe.");
  if (target.map.imageSize !== undefined) return scene;
  const map = { ...target.map, imageSize: { width: imageSize.width, height: imageSize.height } };
  return {
    ...synced,
    maps: synced.maps.map((candidate) => candidate.id === mapId ? { ...candidate, map } : candidate),
    ...(synced.activeMapId === mapId ? { map } : {})
  };
}

export function replaceSceneMapImage(
  scene: SceneDocument,
  mapId: string,
  replacement: SceneMapImageReplacement
): SceneDocument {
  const synced = syncActiveMapFromRuntimeFields(scene);
  const target = synced.maps.find((map) => map.id === mapId);
  if (target === undefined) throw new Error("El mapa seleccionado ya no existe.");
  if (typeof replacement.imagePath !== "string" || replacement.imagePath.trim() === "") {
    throw new Error("La ruta de la imagen nueva no es valida.");
  }
  const scale = calculateReplacementMapScale(target.map, replacement.imageSize, replacement.policy);
  const map = {
    ...target.map,
    imagePath: replacement.imagePath,
    imageSize: { width: replacement.imageSize.width, height: replacement.imageSize.height },
    scale
  };
  // Only the image projection changes; other runtime fields retain their exact values.
  return {
    ...synced,
    maps: synced.maps.map((candidate) => candidate.id === mapId ? { ...candidate, map } : candidate),
    ...(synced.activeMapId === mapId ? { map } : {})
  };
}
