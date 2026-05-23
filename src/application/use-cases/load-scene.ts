import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneOperationResult, SceneWarning } from "../../domain/sessions/scene-document";
import { detectOutdatedSceneFields, parseSceneJson } from "../../domain/sessions/scene-schema";

export async function loadSceneUseCase(storage: SceneFileStorage): Promise<SceneOperationResult> {
  try {
    const loadedFile = await storage.loadSceneJson();

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

    const scene = parseSceneJson(loadedFile.json);
    const warnings: SceneWarning[] = [];

    if (scene.map.imagePath !== null && !(await storage.fileExists(scene.map.imagePath))) {
      warnings.push({
        code: "map-image-missing",
        message: "La imagen local del mapa no existe. La escena se cargo sin bloquear la app.",
        path: scene.map.imagePath
      });
    }

    for (const token of scene.tokens) {
      if (!(await storage.fileExists(token.imagePath))) {
        warnings.push({
          code: "map-image-missing",
          message: `La imagen local del token "${token.name}" no existe. La escena se cargo sin bloquear la app.`,
          path: token.imagePath
        });
      }
    }

    // Detect whether the file was saved with an older version of the schema.
    const outdatedFields = detectOutdatedSceneFields(rawJson);
    if (outdatedFields.length > 0) {
      warnings.push({
        code: "scene-format-outdated",
        message: `La escena usa un formato anterior (faltan: ${outdatedFields.join(", ")}). Guárdala de nuevo para actualizarla.`,
        path: ""
      });
    }

    const mapImageUrl =
      scene.map.imagePath !== null &&
      !warnings.some((warning) => warning.path === scene.map.imagePath) &&
      storage.getMapImageUrl !== undefined
        ? await storage.getMapImageUrl(scene.map.imagePath)
        : undefined;
    const tokenImageUrlEntries = await Promise.all(
      scene.tokens.map(async (token) => {
        if (storage.getTokenImageUrl === undefined || !(await storage.fileExists(token.imagePath))) {
          return null;
        }

        return [token.id, await storage.getTokenImageUrl(token.imagePath)] as const;
      })
    );
    const tokenImageUrls = Object.fromEntries(tokenImageUrlEntries.filter((entry): entry is readonly [string, string] => entry !== null));

    return {
      ok: true,
      scene,
      filePath: loadedFile.filePath,
      mapImageUrl,
      tokenImageUrls,
      warnings
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cargar la escena."
    };
  }
}
