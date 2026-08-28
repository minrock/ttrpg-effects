import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import { serializeSceneDocument } from "../../domain/sessions/scene-schema";

export async function saveSceneUseCase(
  storage: SceneFileStorage,
  scene: SceneDocument,
  options?: { readonly suggestedFilePath?: string | null }
): Promise<SceneOperationResult> {
  try {
    const json = serializeSceneDocument(scene);
    const filePath = await storage.saveSceneJson(json, options);

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

export async function saveSceneToPathUseCase(
  storage: SceneFileStorage,
  scene: SceneDocument,
  filePath: string
): Promise<SceneOperationResult> {
  if (storage.replaceSceneJsonFiles === undefined) {
    return { ok: false, error: "El guardado directo de escenas no esta disponible." };
  }

  try {
    await storage.replaceSceneJsonFiles([
      { filePath, json: serializeSceneDocument(scene) }
    ]);
    return { ok: true, scene, filePath, warnings: [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo guardar la escena en segundo plano."
    };
  }
}
