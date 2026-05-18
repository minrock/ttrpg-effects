import { BrowserWindow, dialog } from "electron";
import type { OpenDialogOptions } from "electron";
import { access } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { isSupportedMapImageExtension, type MapOpenResult } from "../../domain/map/map-image";

export class ElectronMapImageStorage {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  async getMapImageUrl(imagePath: string): Promise<MapOpenResult> {
    const extension = extname(imagePath).slice(1).toLowerCase();

    if (!isSupportedMapImageExtension(extension)) {
      return { ok: false, error: "Formato de imagen no soportado." };
    }

    try {
      await access(imagePath);
      return {
        ok: true,
        imagePath,
        imageUrl: pathToFileURL(imagePath).toString().replace("file:", "map-asset:")
      };
    } catch {
      return { ok: false, error: "No se pudo leer la imagen seleccionada." };
    }
  }

  async openMapImage(): Promise<MapOpenResult> {
    const targetWindow = this.getWindow();
    const options: OpenDialogOptions = {
      title: "Cargar mapa",
      properties: ["openFile"],
      filters: [
        {
          name: "Map Images",
          extensions: ["png", "jpg", "jpeg", "webp", "heic"]
        }
      ]
    };
    const result =
      targetWindow === null
        ? await dialog.showOpenDialog(options)
        : await dialog.showOpenDialog(targetWindow, options);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, error: "Carga de mapa cancelada." };
    }

    const imagePath = result.filePaths[0];
    const extension = extname(imagePath).slice(1).toLowerCase();

    if (!isSupportedMapImageExtension(extension)) {
      return { ok: false, error: "Formato de imagen no soportado." };
    }

    return this.getMapImageUrl(imagePath);
  }
}
