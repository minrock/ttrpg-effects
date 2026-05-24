import { ipcMain } from "electron";
import type { SceneFileStorage } from "../../application/services/scene-file-storage";
import { loadSceneUseCase } from "../../application/use-cases/load-scene";
import { saveSceneUseCase } from "../../application/use-cases/save-scene";
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

  ipcMain.handle("scene:load", async () => {
    const result = await loadSceneUseCase(storage);

    if (result.ok) {
      await safeRegisterRecentScene(options, result.filePath);
    }

    return result;
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
