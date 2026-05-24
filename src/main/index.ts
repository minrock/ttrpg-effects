import { app, BrowserWindow, net, protocol, screen } from "electron";
import { join } from "node:path";
import { ElectronSceneFileStorage } from "../infrastructure/file-system/electron-scene-file-storage";
import { ElectronMapImageStorage } from "../infrastructure/file-system/electron-map-image-storage";
import { registerAsideIpc } from "./ipc/aside-ipc";
import { getRecentScenesStoragePath, installAppMenu, rebuildAppMenu, registerRecentScene } from "./app-menu";
import { registerMapIpc } from "./ipc/map-ipc";
import { getPlayerWindowRendererIndexPath, preloadPlayerWindow, registerPlayerWindowIpc } from "./ipc/player-window-ipc";
import { registerSceneIpc } from "./ipc/scene-ipc";
import { RecentScenesStore } from "./recent-scenes-store";

protocol.registerSchemesAsPrivileged([
  { scheme: "map-asset", privileges: { bypassCSP: true, corsEnabled: true, secure: true, stream: true, supportFetchAPI: true } }
]);

app.setName("TTRPG Effects");

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL);
const appIconPath = isDevelopment
  ? join(app.getAppPath(), "assets/logo/ttrpg-effects-logo.png")
  : join(process.resourcesPath, "assets/logo/ttrpg-effects-logo.png");

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 820,
    minHeight: 520,
    title: "TTRPG Effects",
    icon: appIconPath,
    backgroundColor: "#111315",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (isDevelopment) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL as string);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  app.dock?.setIcon(appIconPath);

  protocol.handle("map-asset", (request) => {
    const fileUrl = request.url.replace("map-asset:", "file:");
    return net.fetch(fileUrl);
  });

  const mapImageStorage = new ElectronMapImageStorage(() => mainWindow);
  const sceneFileStorage = new ElectronSceneFileStorage(() => mainWindow);
  const recentScenes = new RecentScenesStore(getRecentScenesStoragePath());
  const menuOptions = {
    storage: sceneFileStorage,
    recentScenes,
    getMainWindow: () => mainWindow
  };
  await installAppMenu(menuOptions);
  registerSceneIpc(sceneFileStorage, {
    onRecentScenePath: async (filePath) => {
      await registerRecentScene(recentScenes, filePath);
      await rebuildAppMenu(menuOptions);
    }
  });
  registerMapIpc(mapImageStorage);
  registerAsideIpc(mapImageStorage);
  const playerWindowOptions = {
    isDevelopment,
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    preloadPath: join(__dirname, "../preload/index.cjs"),
    iconPath: appIconPath,
    rendererIndexPath: getPlayerWindowRendererIndexPath()
  };
  registerPlayerWindowIpc(playerWindowOptions);
  createMainWindow();
  preloadPlayerWindow(playerWindowOptions);
});

app.on("window-all-closed", () => {
  app.quit();
});
