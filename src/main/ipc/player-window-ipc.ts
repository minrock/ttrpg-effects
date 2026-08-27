import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { sanitizeInformationAreaHighlightBroadcast } from "../../domain/annotations/map-annotations";

interface PlayerWindowIpcOptions {
  readonly isDevelopment: boolean;
  readonly rendererUrl?: string;
  readonly preloadPath: string;
  readonly iconPath: string;
  readonly rendererIndexPath: string;
}

let playerWindow: BrowserWindow | null = null;
let latestSnapshot: unknown = null;
let latestCamera: unknown = null;
let isPlayerWindowReady = false;
let shouldShowPlayerWindowWhenReady = false;

export function registerPlayerWindowIpc(options: PlayerWindowIpcOptions): void {
  ipcMain.handle("player-window:open", (event: IpcMainInvokeEvent, snapshot: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede abrir la ventana de jugador." };
    }

    if (snapshot !== null) {
      latestSnapshot = snapshot;
      latestCamera = getCameraFromSnapshot(snapshot) ?? latestCamera;
    }

    openOrFocusPlayerWindow(options);
    if (latestSnapshot !== null) {
      sendToPlayerWindow("player-window:scene", latestSnapshot);
    }
    return { ok: true };
  });

  ipcMain.handle("player-window:get-state", () => ({
    snapshot: latestSnapshot,
    camera: latestCamera
  }));

  ipcMain.handle("player-window:publish-scene", (event: IpcMainInvokeEvent, snapshot: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede publicar escena." };
    }

    latestSnapshot = snapshot;
    latestCamera = getCameraFromSnapshot(snapshot) ?? latestCamera;

    if (playerWindow === null || playerWindow.isDestroyed()) {
      return { ok: true };
    }

    sendToPlayerWindow("player-window:scene", snapshot);
    return { ok: true };
  });

  ipcMain.handle("player-window:publish-camera", (event: IpcMainInvokeEvent, camera: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede publicar camara." };
    }

    if (playerWindow === null || playerWindow.isDestroyed()) {
      return { ok: true };
    }

    latestCamera = camera;
    sendToPlayerWindow("player-window:camera", camera);
    return { ok: true };
  });

  ipcMain.handle("player-window:publish-pointer", (event: IpcMainInvokeEvent, pointer: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede publicar apuntador." };
    }

    if (playerWindow === null || playerWindow.isDestroyed()) {
      return { ok: true };
    }

    sendToPlayerWindow("player-window:pointer", pointer);
    return { ok: true };
  });

  ipcMain.handle("player-window:publish-information-area-highlight", (event: IpcMainInvokeEvent, payload: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede publicar areas." };
    }

    const highlight = sanitizeInformationAreaHighlightBroadcast(payload);
    if (highlight === null) {
      return { ok: false, error: "El highlight de area no es valido." };
    }

    if (playerWindow !== null && !playerWindow.isDestroyed()) {
      sendToPlayerWindow("player-window:information-area-highlight", highlight);
    }
    return { ok: true };
  });

  ipcMain.handle("player-window:content-ready", (event: IpcMainInvokeEvent) => {
    if (!isFromPlayerWindow(event)) {
      return { ok: false, error: "Solo la ventana de jugador puede marcar contenido listo." };
    }

    return { ok: true };
  });
}

export function preloadPlayerWindow(options: PlayerWindowIpcOptions): void {
  ensurePlayerWindow(options);
}

function openOrFocusPlayerWindow(options: PlayerWindowIpcOptions): void {
  shouldShowPlayerWindowWhenReady = true;
  ensurePlayerWindow(options);

  if (isPlayerWindowReady) {
    showPlayerWindow();
  }
}

function ensurePlayerWindow(options: PlayerWindowIpcOptions): void {
  if (playerWindow !== null && !playerWindow.isDestroyed()) {
    return;
  }

  isPlayerWindowReady = false;
  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    title: "TTRPG Effects - Jugador",
    icon: options.iconPath,
    backgroundColor: "#050606",
    show: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  playerWindow.once("ready-to-show", () => {
    isPlayerWindowReady = true;
    if (shouldShowPlayerWindowWhenReady) {
      showPlayerWindow();
    }
    if (latestSnapshot !== null) {
      sendToPlayerWindow("player-window:scene", latestSnapshot);
    }
    if (latestCamera !== null) {
      sendToPlayerWindow("player-window:camera", latestCamera);
    }
  });

  playerWindow.on("closed", () => {
    playerWindow = null;
    isPlayerWindowReady = false;
    shouldShowPlayerWindowWhenReady = false;
    latestSnapshot = null;
    latestCamera = null;
    notifyDmWindows("player-window:closed");
  });

  if (options.isDevelopment && options.rendererUrl !== undefined) {
    const url = new URL(options.rendererUrl);
    url.searchParams.set("view", "player");
    void playerWindow.loadURL(url.toString());
  } else {
    void playerWindow.loadFile(options.rendererIndexPath, {
      query: { view: "player" }
    });
  }
}

function showPlayerWindow(): void {
  if (playerWindow === null || playerWindow.isDestroyed()) {
    return;
  }

  if (playerWindow.isMinimized()) {
    playerWindow.restore();
  }
  if (!playerWindow.isMaximized()) {
    playerWindow.maximize();
  }
  if (!playerWindow.isVisible()) {
    playerWindow.show();
  }
  playerWindow.focus();
}

function notifyDmWindows(channel: string): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window !== playerWindow && !window.isDestroyed()) {
      window.webContents.send(channel);
    }
  }
}

function sendToPlayerWindow(channel: string, payload: unknown): void {
  if (playerWindow === null || playerWindow.isDestroyed()) {
    return;
  }

  playerWindow.webContents.send(channel, payload);
}

function isFromDmWindow(event: IpcMainInvokeEvent): boolean {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  return senderWindow !== null && senderWindow !== playerWindow;
}

function isFromPlayerWindow(event: IpcMainInvokeEvent): boolean {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  return senderWindow !== null && senderWindow === playerWindow;
}

function getCameraFromSnapshot(snapshot: unknown): unknown {
  if (typeof snapshot !== "object" || snapshot === null || !("camera" in snapshot)) {
    return null;
  }

  return (snapshot as { readonly camera?: unknown }).camera ?? null;
}

export function getPlayerWindowRendererIndexPath(): string {
  return join(__dirname, "../renderer/index.html");
}
