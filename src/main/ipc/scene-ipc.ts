import { ipcMain } from "electron";
import type { SceneFileStorage } from "../../application/services/scene-file-storage";
import { loadSceneUseCase } from "../../application/use-cases/load-scene";
import { saveSceneUseCase } from "../../application/use-cases/save-scene";
import { parseSceneDocument } from "../../domain/sessions/scene-schema";

export function registerSceneIpc(storage: SceneFileStorage): void {
  ipcMain.handle("scene:save", async (_event, payload: unknown) => {
    try {
      const scene = parseSceneDocument(payload);
      return await saveSceneUseCase(storage, scene);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Payload de escena invalido."
      };
    }
  });

  ipcMain.handle("scene:load", async () => {
    return loadSceneUseCase(storage);
  });
}
