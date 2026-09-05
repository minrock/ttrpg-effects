import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneOperationResult, SceneWarning } from "../../domain/sessions/scene-document";
import { detectOutdatedSceneFields } from "../../domain/sessions/scene-schema";
import { loadLinkedLegacySceneGraph } from "./linked-legacy-scenes";
import { setActiveSceneMap } from "../../domain/sessions/scene-maps";

export async function loadSceneUseCase(
  storage: SceneFileStorage,
  options?: { readonly filePath?: string }
): Promise<SceneOperationResult> {
  try {
    const loadedFile =
      options?.filePath === undefined
        ? await storage.loadSceneJson()
        : storage.loadSceneJsonFromPath === undefined
          ? null
          : await storage.loadSceneJsonFromPath(options.filePath);

    if (loadedFile === null) {
      return {
        ok: false,
        error: "Carga cancelada."
      };
    }

    // Parse the raw JSON first so we can run the outdated-format check on it.
    // parseSceneJson also calls JSON.parse internally, but this second parse is
    // cheap compared to file I/O and keeps the detection logic clean.
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(loadedFile.json);
    } catch {
      rawJson = null;
    }

    const loadedScene = await loadLinkedLegacySceneGraph(storage, loadedFile);
    const openedScene =
      loadedScene.scene.maps[0] === undefined
        ? loadedScene.scene
        : setActiveSceneMap(loadedScene.scene, loadedScene.scene.maps[0].id);
    const warnings: SceneWarning[] = [...loadedScene.warnings];

    // Detect whether the file was saved with an older version of the schema.
    const outdatedFields = detectOutdatedSceneFields(rawJson);
    if (outdatedFields.length > 0) {
      warnings.push({
        code: "scene-format-outdated",
        message: `La escena usa un formato anterior (faltan: ${outdatedFields.join(", ")}). Guárdala de nuevo para actualizarla.`,
        path: ""
      });
    }

    return {
      ok: true,
      scene: openedScene,
      filePath: loadedFile.filePath,
      mapImageUrl: loadedScene.mapImageUrls[openedScene.id],
      mapImageUrls: loadedScene.mapImageUrls,
      tokenImageUrls: loadedScene.tokenImageUrls,
      warnings
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cargar la escena."
    };
  }
}
