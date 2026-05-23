import { ipcMain } from "electron";
import type { ElectronMapImageStorage } from "../../infrastructure/file-system/electron-map-image-storage";

export function registerAsideIpc(storage: ElectronMapImageStorage): void {
  ipcMain.handle("aside:open-image", async () => storage.openTokenImage());
  ipcMain.handle("aside:resolve-url", async (_event, imagePath: string) =>
    storage.resolveTokenUrl(imagePath)
  );
}
