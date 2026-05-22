import { app, BrowserWindow, net, protocol, screen } from "electron";
import { join } from "node:path";
import { ElectronSceneFileStorage } from "../infrastructure/file-system/electron-scene-file-storage";
import { ElectronMapImageStorage } from "../infrastructure/file-system/electron-map-image-storage";
import { registerMapIpc } from "./ipc/map-ipc";
import { registerSceneIpc } from "./ipc/scene-ipc";

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

app.whenReady().then(() => {
  app.dock?.setIcon(appIconPath);

  protocol.handle("map-asset", (request) => {
    const fileUrl = request.url.replace("map-asset:", "file:");
    return net.fetch(fileUrl);
  });

  registerSceneIpc(new ElectronSceneFileStorage(() => mainWindow));
  registerMapIpc(new ElectronMapImageStorage(() => mainWindow));
  createMainWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
