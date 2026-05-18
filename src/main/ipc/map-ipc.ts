import { ipcMain } from "electron";
import { ElectronMapImageStorage } from "../../infrastructure/file-system/electron-map-image-storage";

export function registerMapIpc(storage: ElectronMapImageStorage): void {
  ipcMain.handle("map:open-image", async () => storage.openMapImage());
}
