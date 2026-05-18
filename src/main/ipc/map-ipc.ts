import { ipcMain } from "electron";
import { ElectronMapImageStorage } from "../../infrastructure/file-system/electron-map-image-storage";

export function registerMapIpc(storage: ElectronMapImageStorage): void {
  ipcMain.handle("map:open-image", async () => storage.openMapImage());
  ipcMain.handle("map:get-image-url", async (_event, imagePath: unknown) => {
    if (typeof imagePath !== "string" || imagePath.length === 0) {
      return { ok: false, error: "Ruta de mapa invalida." };
    }

    return storage.getMapImageUrl(imagePath);
  });
}
