import { BrowserWindow, dialog } from "electron";
import type { OpenDialogOptions, SaveDialogOptions } from "electron";
import { access, readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import type { SceneFileStorage } from "../../application/services/scene-file-storage";

const SCENE_EXTENSION = ".ttrpgscene";

export class ElectronSceneFileStorage implements SceneFileStorage {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  async saveSceneJson(json: string): Promise<string | null> {
    const targetWindow = this.getWindow();
    const options: SaveDialogOptions = {
      title: "Guardar escena",
      defaultPath: `untitled${SCENE_EXTENSION}`,
      filters: [
        {
          name: "TTRPG Scene",
          extensions: ["ttrpgscene"]
        }
      ]
    };
    const result =
      targetWindow === null
        ? await dialog.showSaveDialog(options)
        : await dialog.showSaveDialog(targetWindow, options);

    if (result.canceled || result.filePath === undefined) {
      return null;
    }

    const filePath = ensureSceneExtension(result.filePath);
    await writeFile(filePath, json, "utf8");
    return filePath;
  }

  async loadSceneJson(): Promise<{ filePath: string; json: string } | null> {
    const targetWindow = this.getWindow();
    const options: OpenDialogOptions = {
      title: "Cargar escena",
      properties: ["openFile"],
      filters: [
        {
          name: "TTRPG Scene",
          extensions: ["ttrpgscene"]
        }
      ]
    };
    const result =
      targetWindow === null
        ? await dialog.showOpenDialog(options)
        : await dialog.showOpenDialog(targetWindow, options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    return {
      filePath,
      json: await readFile(filePath, "utf8")
    };
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMapImageUrl(filePath: string): Promise<string> {
    return pathToFileURL(filePath).toString().replace("file:", "map-asset:");
  }
}

function ensureSceneExtension(filePath: string): string {
  if (extname(filePath) === SCENE_EXTENSION) {
    return filePath;
  }

  return `${filePath}${SCENE_EXTENSION}`;
}
