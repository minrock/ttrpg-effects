import { BrowserWindow, dialog } from "electron";
import type { OpenDialogOptions, SaveDialogOptions } from "electron";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { SceneFileStorage } from "../../application/services/scene-file-storage";

const SCENE_EXTENSION = ".ttrpgscene";

export class ElectronSceneFileStorage implements SceneFileStorage {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  async saveSceneJson(
    json: string,
    options?: { readonly suggestedFilePath?: string | null }
  ): Promise<string | null> {
    const targetWindow = this.getWindow();
    const dialogOptions: SaveDialogOptions = {
      title: "Guardar escena",
      defaultPath: options?.suggestedFilePath ?? `untitled${SCENE_EXTENSION}`,
      filters: [
        {
          name: "TTRPG Scene",
          extensions: ["ttrpgscene"]
        }
      ]
    };
    const result =
      targetWindow === null
        ? await dialog.showSaveDialog(dialogOptions)
        : await dialog.showSaveDialog(targetWindow, dialogOptions);

    if (result.canceled || result.filePath === undefined) {
      return null;
    }

    const filePath = ensureSceneExtension(result.filePath);
    await writeFile(filePath, json, "utf8");
    return filePath;
  }

  async loadSceneJson(): Promise<{ filePath: string; json: string } | null> {
    const filePath = await this.selectSceneJsonPath();
    if (filePath === null) return null;

    return {
      filePath,
      json: await readFile(filePath, "utf8")
    };
  }

  async selectSceneJsonPath(): Promise<string | null> {
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

    return result.filePaths[0] ?? null;
  }

  async loadSceneJsonFromPath(filePath: string): Promise<{ filePath: string; json: string }> {
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

  async replaceSceneJsonFiles(
    files: readonly { readonly filePath: string; readonly json: string }[]
  ): Promise<void> {
    const temporaries = files.map(({ filePath, json }) => ({
      filePath,
      json,
      tempPath: join(dirname(filePath), `.${randomUUID()}.ttrpgscene.tmp`),
      backupPath: join(dirname(filePath), `.${randomUUID()}.ttrpgscene.bak`)
    }));
    const replaced: string[] = [];
    const backedUp: string[] = [];

    try {
      await Promise.all(temporaries.map((entry) => writeFile(entry.tempPath, entry.json, "utf8")));
      for (const entry of temporaries) {
        await rename(entry.filePath, entry.backupPath);
        backedUp.push(entry.filePath);
        await rename(entry.tempPath, entry.filePath);
        replaced.push(entry.filePath);
      }
      await Promise.all(temporaries.map(async (entry) => {
        try {
          await unlink(entry.backupPath);
        } catch {
          // A stale backup is safer than failing an otherwise completed pair update.
        }
      }));
    } catch (error) {
      for (const entry of [...temporaries].reverse()) {
        if (!backedUp.includes(entry.filePath)) continue;
        try {
          if (replaced.includes(entry.filePath)) await unlink(entry.filePath);
          await rename(entry.backupPath, entry.filePath);
        } catch {
          // The use case reports the operation as failed; manual review may be required.
        }
      }
      throw error;
    } finally {
      await Promise.all(
        temporaries.map(async ({ tempPath }) => {
          try {
            await unlink(tempPath);
          } catch {
            // The file was either promoted or never created.
          }
        })
      );
    }
  }

  async getMapImageUrl(filePath: string): Promise<string> {
    return pathToFileURL(filePath).toString().replace("file:", "map-asset:");
  }

  async getTokenImageUrl(filePath: string): Promise<string> {
    return pathToFileURL(filePath).toString().replace("file:", "map-asset:");
  }
}

function ensureSceneExtension(filePath: string): string {
  if (extname(filePath) === SCENE_EXTENSION) {
    return filePath;
  }

  return `${filePath}${SCENE_EXTENSION}`;
}
