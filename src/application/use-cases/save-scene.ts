import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import { serializeSceneDocument } from "../../domain/sessions/scene-schema";

export async function saveSceneUseCase(
  storage: SceneFileStorage,
  scene: SceneDocument
): Promise<SceneOperationResult> {
  try {
    const json = serializeSceneDocument(scene);
    const filePath = await storage.saveSceneJson(json);

    if (filePath === null) {
      return {
        ok: false,
        error: "Guardado cancelado."
      };
    }

    return {
      ok: true,
      scene,
      filePath,
      warnings: []
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo guardar la escena."
    };
  }
}
