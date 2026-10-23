import { BrowserWindow, dialog } from "electron";
import type { OpenDialogOptions } from "electron";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import type { MapImageReplacementResult, MapImageStorage } from "../../application/services/map-image-storage";
import { createMapAssetUrl } from "./map-asset-url";
import { isSupportedMapImageExtension, type MapOpenResult } from "../../domain/map/map-image";
import { isSupportedTokenImageExtension, type TokenOpenResult } from "../../domain/tokens/token-image";

export class ElectronMapImageStorage implements MapImageStorage {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  async openMapImage(): Promise<MapOpenResult> {
    const result = await this.selectMapImage("Cargar mapa");
    if (result.status === "ready") {
      return { ok: true, imagePath: result.imagePath, imageUrl: result.imageUrl };
    }
    return { ok: false, error: result.status === "cancelled" ? "Carga de mapa cancelada." : result.error };
  }

  async selectReplacementMapImage(): Promise<MapImageReplacementResult> {
    return this.selectMapImage("Actualizar imagen del mapa");
  }

  private async selectMapImage(title: string): Promise<MapImageReplacementResult> {
    try {
      return await this.showMapImageDialog(title);
    } catch {
      return { status: "error", error: "No se pudo leer la imagen seleccionada." };
    }
  }

  private async showMapImageDialog(title: string): Promise<MapImageReplacementResult> {
    const targetWindow = this.getWindow();
    const options: OpenDialogOptions = {
      title,
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
      return { status: "cancelled" };
    }

    const imagePath = result.filePaths[0];
    const extension = extname(imagePath).slice(1).toLowerCase();

    if (!isSupportedMapImageExtension(extension)) {
      return { status: "error", error: "Formato de imagen no soportado." };
    }

    await this.assertReadableMapFile(imagePath);
    return { status: "ready", imagePath, imageUrl: createMapAssetUrl(imagePath) };
  }

  async resolveMapUrl(imagePath: string): Promise<string | null> {
    try {
      await this.assertReadableMapFile(imagePath);
      return createMapAssetUrl(imagePath);
    } catch {
      return null;
    }
  }

  async openTokenImage(): Promise<TokenOpenResult> {
    const targetWindow = this.getWindow();
    const options: OpenDialogOptions = {
      title: "Cargar token",
      properties: ["openFile"],
      filters: [
        {
          name: "Token Images",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"]
        }
      ]
    };
    const result =
      targetWindow === null
        ? await dialog.showOpenDialog(options)
        : await dialog.showOpenDialog(targetWindow, options);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, error: "Carga de token cancelada." };
    }

    const imagePath = result.filePaths[0];
    const extension = extname(imagePath).slice(1).toLowerCase();

    if (!isSupportedTokenImageExtension(extension)) {
      return { ok: false, error: "Formato de imagen de token no soportado." };
    }

    try {
      await access(imagePath);
      return { ok: true, imagePath, imageUrl: this.toAssetUrl(imagePath) };
    } catch {
      return { ok: false, error: "No se pudo leer la imagen de token seleccionada." };
    }
  }

  async resolveTokenUrl(imagePath: string): Promise<string | null> {
    try {
      await access(imagePath);
      return this.toAssetUrl(imagePath);
    } catch {
      return null;
    }
  }

  private toAssetUrl(imagePath: string): string {
    return pathToFileURL(imagePath).toString().replace("file:", "map-asset:");
  }

  private async assertReadableMapFile(imagePath: string): Promise<void> {
    await access(imagePath, constants.R_OK);
    if (!(await stat(imagePath)).isFile()) {
      throw new Error("La imagen seleccionada no es un archivo regular.");
    }
  }
}
