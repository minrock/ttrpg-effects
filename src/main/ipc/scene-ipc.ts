import { ipcMain } from "electron";
import type { SceneFileStorage } from "../../application/services/scene-file-storage";
import { importSceneMapUseCase } from "../../application/use-cases/import-scene-map";
import { loadSceneUseCase } from "../../application/use-cases/load-scene";
import { saveSceneToPathUseCase, saveSceneUseCase } from "../../application/use-cases/save-scene";
import { parseSceneDocument } from "../../domain/sessions/scene-schema";

interface SceneIpcOptions {
  readonly onRecentScenePath?: (filePath: string) => Promise<void>;
}

export function registerSceneIpc(storage: SceneFileStorage, options: SceneIpcOptions = {}): void {
  ipcMain.handle("scene:save", async (_event, payload: unknown) => {
    try {
      const parsedPayload = parseSaveScenePayload(payload);
      const scene = parseSceneDocument(parsedPayload.scene);
      const result = await saveSceneUseCase(storage, scene, {
        suggestedFilePath: parsedPayload.suggestedFilePath
      });

      if (result.ok) {
        await safeRegisterRecentScene(options, result.filePath);
      }

      return result;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Payload de escena invalido."
      };
    }
  });

  ipcMain.handle("scene:save-to-path", async (_event, payload: unknown) => {
    try {
      const parsedPayload = parseSaveSceneToPathPayload(payload);
      const scene = parseSceneDocument(parsedPayload.scene);
      return await saveSceneToPathUseCase(storage, scene, parsedPayload.filePath);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Payload de guardado directo invalido."
      };
    }
  });

  ipcMain.handle("scene:load", async () => {
    const result = await loadSceneUseCase(storage);

    if (result.ok) {
      await safeRegisterRecentScene(options, result.filePath);
    }

    return result;
  });

  ipcMain.handle("scene:import-as-map", async (_event, payload: unknown) => {
    try {
      const scene = parseSceneDocument(payload);
      return await importSceneMapUseCase(storage, scene);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Payload de importacion invalido."
      };
    }
  });
}

async function safeRegisterRecentScene(options: SceneIpcOptions, filePath: string): Promise<void> {
  try {
    await options.onRecentScenePath?.(filePath);
  } catch {
    // Recent-scene bookkeeping should never make save/load fail.
  }
}

function parseSaveScenePayload(payload: unknown): {
  readonly scene: unknown;
  readonly suggestedFilePath: string | null;
} {
  if (payload !== null && typeof payload === "object" && "scene" in payload) {
    const record = payload as { readonly scene: unknown; readonly suggestedFilePath?: unknown };
    return {
      scene: record.scene,
      suggestedFilePath:
        typeof record.suggestedFilePath === "string" && record.suggestedFilePath.length > 0
          ? record.suggestedFilePath
          : null
    };
  }

  return {
    scene: payload,
    suggestedFilePath: null
  };
}

function parseSaveSceneToPathPayload(payload: unknown): {
  readonly scene: unknown;
  readonly filePath: string;
} {
  if (payload === null || typeof payload !== "object") {
    throw new Error("Payload de guardado directo invalido.");
  }
  const record = payload as { readonly scene?: unknown; readonly filePath?: unknown };
  if (record.scene === undefined) throw new Error("Escena requerida.");
  if (
    typeof record.filePath !== "string" ||
    record.filePath.trim() === "" ||
    !record.filePath.toLowerCase().endsWith(".ttrpgscene")
  ) {
    throw new Error("Ruta de escena invalida.");
  }
  return { scene: record.scene, filePath: record.filePath };
}
