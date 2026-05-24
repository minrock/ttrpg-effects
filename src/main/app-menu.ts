import { BrowserWindow, Menu, app, type MenuItemConstructorOptions } from "electron";
import { basename } from "node:path";
import type { SceneFileStorage } from "../application/services/scene-file-storage";
import { loadSceneUseCase } from "../application/use-cases/load-scene";
import type { SceneOperationResult } from "../domain/sessions/scene-document";
import type { RecentScenesStore } from "./recent-scenes-store";

interface AppMenuOptions {
  readonly storage: SceneFileStorage;
  readonly recentScenes: RecentScenesStore;
  readonly getMainWindow: () => BrowserWindow | null;
}

export async function installAppMenu(options: AppMenuOptions): Promise<void> {
  await rebuildAppMenu(options);
}

export async function registerRecentScene(
  recentScenes: RecentScenesStore,
  filePath: string
): Promise<void> {
  await recentScenes.add(filePath);
}

export async function rebuildAppMenu(options: AppMenuOptions): Promise<void> {
  const recentScenes = await options.recentScenes.list();
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Abrir recientes",
          submenu:
            recentScenes.length === 0
              ? [{ label: "Sin escenas recientes", enabled: false }]
              : recentScenes.map((filePath) => ({
                  label: basename(filePath),
                  sublabel: filePath,
                  click: () => {
                    void openRecentScene(options, filePath);
                  }
                }))
        },
        {
          label: "Administrar templates de monstruos",
          click: () => {
            const mainWindow = options.getMainWindow();
            if (mainWindow !== null && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("monster-template:open-manager");
            }
          }
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" }
      ]
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openRecentScene(options: AppMenuOptions, filePath: string): Promise<void> {
  const result = await loadSceneUseCase(options.storage, { filePath });

  if (result.ok) {
    await options.recentScenes.add(result.filePath);
  } else {
    await options.recentScenes.remove(filePath);
  }

  await rebuildAppMenu(options);
  sendToDmWindows(options.getMainWindow(), "scene:recent-opened", result);
}

function sendToDmWindows(mainWindow: BrowserWindow | null, channel: string, result: SceneOperationResult): void {
  const windows = mainWindow === null || mainWindow.isDestroyed() ? BrowserWindow.getAllWindows() : [mainWindow];

  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, result);
    }
  }
}

export function getRecentScenesStoragePath(): string {
  return `${app.getPath("userData")}/recent-scenes.json`;
}
