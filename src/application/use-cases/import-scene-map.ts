import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import { composeImportedSceneMap } from "./compose-imported-scene-map";
import { loadLinkedLegacySceneGraph } from "./linked-legacy-scenes";

export async function importSceneMapUseCase(
  storage: SceneFileStorage,
  currentScene: SceneDocument
): Promise<SceneOperationResult> {
  if (storage.selectSceneJsonPath === undefined || storage.loadSceneJsonFromPath === undefined) {
    return { ok: false, error: "La importacion de escenas no esta disponible." };
  }

  const filePath = await storage.selectSceneJsonPath();
  if (filePath === null) return { ok: false, error: "Importacion cancelada." };

  try {
    const loaded = await storage.loadSceneJsonFromPath(filePath);
    const imported = await loadLinkedLegacySceneGraph(storage, loaded);
    if (imported.scene.maps.length === 0 || imported.scene.maps.every((map) => map.map.imagePath === null)) {
      return { ok: false, error: "El archivo importado no contiene un mapa valido." };
    }

    return composeImportedSceneMap(currentScene, imported, filePath);

  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo importar la escena como mapa."
    };
  }
}
