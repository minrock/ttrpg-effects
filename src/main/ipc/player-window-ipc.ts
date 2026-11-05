import { randomUUID } from "node:crypto";
import { attentionFrame, attentionFocusRequestSchema } from "../../domain/player/attention-focus";
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { installNavigationPolicy, localRendererPolicy } from "../window-policy";
import { sanitizeInformationAreaHighlightBroadcast } from "../../domain/annotations/map-annotations";
import { sanitizePlayerWindowSnapshot } from "../../domain/player/player-window-snapshot";
import { sanitizePlayerMapImageStatus } from "../../domain/player/map-image-report";
import {
  sanitizePlayerCameraReport,
  type PlayerCameraCommand
} from "../../domain/player/player-camera-control";

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
let latestCameraCommand: PlayerCameraCommand | null = null;
let isPlayerWindowReady = false;
let contentReady = false;
let focusTokens = 4, focusAt = 0;
const focusRequests = new Map<string, { fingerprint: string; until: number }>();
function acceptSnapshot(snapshot: NonNullable<ReturnType<typeof sanitizePlayerWindowSnapshot>>) {
  const old = sanitizePlayerWindowSnapshot(latestSnapshot);
  if (!old || old.scene.id !== snapshot.scene.id || attentionFrame(old) !== attentionFrame(snapshot) || old.mapImageUrl !== snapshot.mapImageUrl) contentReady = false;
  latestSnapshot = snapshot;
}
let shouldShowPlayerWindowWhenReady = false;

export function getPlayerWindow(): BrowserWindow | null { return playerWindow; }

export function registerPlayerWindowIpc(options: PlayerWindowIpcOptions): void {
  ipcMain.handle("player-window:map-image-status", (event: IpcMainInvokeEvent, value: unknown) => {
    if (!isFromPlayerWindow(event)) return;
    const report = sanitizePlayerMapImageStatus(value);
    const snapshot = sanitizePlayerWindowSnapshot(latestSnapshot);
    if (report !== null && report.imageUrl === snapshot?.mapImageUrl) {
      notifyDmWindows("player-window:map-image-status", report);
    }
  });
  ipcMain.handle("player-window:open", (event: IpcMainInvokeEvent, snapshot: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede abrir la ventana de jugador." };
    }

    if (snapshot !== null) {
      const validated = sanitizePlayerWindowSnapshot(snapshot);
      if (validated === null) return { ok: false, error: "La escena de jugador no es valida." };
      acceptSnapshot(validated);
      latestCamera = validated.camera;
    }

    openOrFocusPlayerWindow(options);
    if (latestSnapshot !== null) {
      sendToPlayerWindow("player-window:scene", latestSnapshot);
    }
    return { ok: true };
  });

  ipcMain.handle("player-window:get-state", () => ({
    snapshot: latestSnapshot,
    camera: latestCamera,
    cameraCommand: latestCameraCommand,
    isOpen: playerWindow !== null && !playerWindow.isDestroyed() && playerWindow.isVisible()
  }));

  ipcMain.handle("player-window:publish-scene", (event: IpcMainInvokeEvent, snapshot: unknown) => {
    if (!isFromDmWindow(event)) {
      return { ok: false, error: "Solo la ventana del DM puede publicar escena." };
    }

    const validated = sanitizePlayerWindowSnapshot(snapshot);
    if (validated === null) return { ok: false, error: "La escena de jugador no es valida." };
    acceptSnapshot(validated);
    latestCamera = validated.camera;

    if (playerWindow === null || playerWindow.isDestroyed()) {
      return { ok: true };
    }

    sendToPlayerWindow("player-window:scene", validated);
    return { ok: true };
  });

  for (const channel of ["player-window:publish-camera", "player-window:camera-command"]) {
    ipcMain.handle(channel, () => ({ ok: false, error: "El control remoto de cámara se retiró. Usa foco de atención." }));
  }
  ipcMain.handle("player-window:focus", (event: IpcMainInvokeEvent, payload: unknown) => {
    if (!isFromDmWindow(event)) return { ok: false, error: "Solo el DM puede enfocar a los jugadores." };
    const parsed = attentionFocusRequestSchema.safeParse(payload), snapshot = sanitizePlayerWindowSnapshot(latestSnapshot);
    if (!parsed.success || !snapshot) return { ok: false, error: "El foco no es válido o no hay mapa publicado." };
    const request = parsed.data, now = Date.now(), fingerprint = JSON.stringify(request);
    if (request.sceneId !== snapshot.scene.id || request.frame !== attentionFrame(snapshot)) return { ok: false, error: "Publica el mapa actual antes de enfocar." };
    for (const [id, entry] of focusRequests) if (entry.until <= now) focusRequests.delete(id);
    const old = focusRequests.get(request.requestId);
    if (old) return old.fingerprint === fingerprint ? { ok: true, delivered: 1, incompatible: 0, notReady: 0 } : { ok: false, error: "El identificador ya tiene otro contenido." };
    if (!contentReady || !playerWindow || playerWindow.isDestroyed() || !playerWindow.isVisible()) return { ok: false, error: "Espera a que la ventana del jugador esté lista." };
    focusTokens = Math.min(4, focusTokens + Math.max(0, now - focusAt) / 500); focusAt = now;
    if (focusTokens < 1 || focusRequests.size >= 1000) return { ok: false, error: "Espera antes de enviar otro foco." };
    focusTokens--;
    focusRequests.set(request.requestId, { fingerprint, until: now + 300000 });
    sendToPlayerWindow("player-window:focus", { id: randomUUID(), frame: request.frame, position: request.position, issuedAt: now, expiresAt: now + 5000 });
    return { ok: true, delivered: 1, incompatible: 0, notReady: 0 };
  });

  ipcMain.handle("player-window:camera-report", (event: IpcMainInvokeEvent, payload: unknown) => {
    if (!isFromPlayerWindow(event)) {
      return { ok: false, error: "Solo la ventana de jugador puede reportar su camara." };
    }

    const report = sanitizePlayerCameraReport(payload);
    if (report === null) {
      return { ok: false, error: "El reporte de camara no es valido." };
    }

    notifyDmWindows("player-window:camera-report", report);
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

  ipcMain.handle("player-window:content-ready", (event: IpcMainInvokeEvent, context?: { frame?: unknown }) => {
    if (!isFromPlayerWindow(event)) {
      return { ok: false, error: "Solo la ventana de jugador puede marcar contenido listo." };
    }

    const snapshot = sanitizePlayerWindowSnapshot(latestSnapshot);
    if (!snapshot || context?.frame !== attentionFrame(snapshot)) return { ok: false, error: "La publicación cambió." };
    contentReady = true;
    notifyDmWindows("player-window:ready");
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

  installNavigationPolicy(playerWindow.webContents, localRendererPolicy(options.rendererUrl, options.rendererIndexPath));

  playerWindow.once("ready-to-show", () => {
    isPlayerWindowReady = true;
    if (shouldShowPlayerWindowWhenReady) {
      showPlayerWindow();
    }
    if (latestSnapshot !== null) {
      sendToPlayerWindow("player-window:scene", latestSnapshot);
    }

  });

  playerWindow.on("closed", () => {
    contentReady = false; focusRequests.clear();
    playerWindow = null;
    isPlayerWindowReady = false;
    shouldShowPlayerWindowWhenReady = false;
    latestSnapshot = null;
    latestCamera = null;
    latestCameraCommand = null;
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

function notifyDmWindows(channel: string, payload?: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window !== playerWindow && !window.isDestroyed()) {
      window.webContents.send(channel, payload);
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
  return event.senderFrame === event.sender.mainFrame && senderWindow !== null && senderWindow !== playerWindow;
}

function isFromPlayerWindow(event: IpcMainInvokeEvent): boolean {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  return event.senderFrame === event.sender.mainFrame && senderWindow !== null && senderWindow === playerWindow;
}

export function getPlayerWindowRendererIndexPath(): string {
  return join(__dirname, "../renderer/index.html");
}
