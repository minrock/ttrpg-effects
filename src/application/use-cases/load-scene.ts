import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneOperationResult, SceneWarning } from "../../domain/sessions/scene-document";
import { parseSceneJson } from "../../domain/sessions/scene-schema";

export async function loadSceneUseCase(storage: SceneFileStorage): Promise<SceneOperationResult> {
  try {
    const loadedFile = await storage.loadSceneJson();

    if (loadedFile === null) {
      return {
        ok: false,
        error: "Carga cancelada."
      };
    }

    const scene = parseSceneJson(loadedFile.json);
    const warnings: SceneWarning[] = [];

    if (scene.map.imagePath !== null && !(await storage.fileExists(scene.map.imagePath))) {
      warnings.push({
        code: "map-image-missing",
        message: "La imagen local del mapa no existe. La escena se cargo sin bloquear la app.",
        path: scene.map.imagePath
      });
    }

    const mapImageUrl =
      scene.map.imagePath !== null && warnings.length === 0 && storage.getMapImageUrl !== undefined
        ? await storage.getMapImageUrl(scene.map.imagePath)
        : undefined;

    return {
      ok: true,
      scene,
      filePath: loadedFile.filePath,
      mapImageUrl,
      warnings
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cargar la escena."
    };
  }
}
