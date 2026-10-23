import { ipcMain, type BrowserWindow } from "electron";
import { prepareMapImageReplacementUseCase } from "../../application/use-cases/prepare-map-image-replacement";
import type { MapImageReplacementResult } from "../../application/services/map-image-storage";
import { ElectronMapImageStorage } from "../../infrastructure/file-system/electron-map-image-storage";

export function registerMapIpc(
  storage: ElectronMapImageStorage,
  options: { readonly getMainWindow: () => BrowserWindow | null }
): void {
  ipcMain.handle("map:select-replacement-image", async (event, ...args: unknown[]): Promise<MapImageReplacementResult> => {
    const mainWindow = options.getMainWindow();
    if (
      mainWindow === null || mainWindow.isDestroyed() ||
      mainWindow.webContents !== event.sender ||
      event.senderFrame === null || event.senderFrame !== mainWindow.webContents.mainFrame
    ) {
      return { status: "error", error: "Operacion permitida solo desde la ventana del DM." };
    }
    if (args.length !== 0) {
      return { status: "error", error: "Solicitud de imagen de reemplazo invalida." };
    }
    return prepareMapImageReplacementUseCase(storage);
  });
  ipcMain.handle("map:open-image", async () => storage.openMapImage());
  ipcMain.handle("map:resolve-url", async (_event, imagePath: string) => storage.resolveMapUrl(imagePath));
  ipcMain.handle("token:open-image", async () => storage.openTokenImage());
  ipcMain.handle("token:resolve-url", async (_event, imagePath: string) => storage.resolveTokenUrl(imagePath));
}
