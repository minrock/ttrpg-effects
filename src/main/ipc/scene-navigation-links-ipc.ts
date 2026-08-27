import { BrowserWindow, ipcMain, type WebContents } from "electron";
import type { SceneFileStorage } from "../../application/services/scene-file-storage";
import {
  connectSceneLink,
  disconnectSceneLink,
  listSceneLinkCandidates,
  loadSceneLinkTarget,
  selectSceneLinkTargetFile,
  validateSceneLinks
} from "../../application/use-cases/scene-navigation-links";
import type {
  ConnectSceneLinkRequest,
  DisconnectSceneLinkRequest,
  LoadSceneLinkTargetRequest,
  MapSceneLinkMarker,
  ValidateSceneLinksRequest
} from "../../domain/annotations/scene-navigation-links";
import { mapSceneLinkMarkerSchema } from "../../domain/sessions/scene-schema";

interface SceneNavigationLinksIpcOptions {
  readonly getMainWindow: () => BrowserWindow | null;
  readonly onRecentScenePath?: (filePath: string) => Promise<void>;
}

export function registerSceneNavigationLinksIpc(
  storage: SceneFileStorage,
  options: SceneNavigationLinksIpcOptions
): void {
  ipcMain.handle("scene-link:select-target-file", (event) =>
    withDmSender(event.sender, options, () => selectSceneLinkTargetFile(storage))
  );
  ipcMain.handle("scene-link:list-candidates", (event, payload: unknown) =>
    withDmSender(event.sender, options, () => listSceneLinkCandidates(storage, parsePath(payload)))
  );
  ipcMain.handle("scene-link:connect", (event, payload: unknown) =>
    withDmSender(event.sender, options, () => connectSceneLink(storage, parseConnectRequest(payload)))
  );
  ipcMain.handle("scene-link:disconnect", (event, payload: unknown) =>
    withDmSender(event.sender, options, () => disconnectSceneLink(storage, parseDisconnectRequest(payload)))
  );
  ipcMain.handle("scene-link:validate", (event, payload: unknown) =>
    withDmSender(event.sender, options, () => validateSceneLinks(storage, parseValidateRequest(payload)))
  );
  ipcMain.handle("scene-link:load-target", (event, payload: unknown) =>
    withDmSender(event.sender, options, async () => {
      const result = await loadSceneLinkTarget(storage, parseLoadRequest(payload));
      if (result.ok) await options.onRecentScenePath?.(result.sceneResult.filePath);
      return result;
    })
  );
}

async function withDmSender<T>(
  sender: WebContents,
  options: SceneNavigationLinksIpcOptions,
  work: () => Promise<T>
): Promise<T | { readonly ok: false; readonly error: string }> {
  const mainWindow = options.getMainWindow();
  if (mainWindow === null || mainWindow.isDestroyed() || mainWindow.webContents !== sender) {
    return { ok: false, error: "Operacion permitida solo desde la ventana del DM." };
  }
  try {
    return await work();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Solicitud de conexion invalida." };
  }
}

function parsePath(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error("Ruta de escena invalida.");
  return value;
}

function parseConnectRequest(value: unknown): ConnectSceneLinkRequest {
  const record = asRecord(value);
  return {
    sourceScenePath: readString(record, "sourceScenePath"),
    sourceMarkerId: readString(record, "sourceMarkerId"),
    targetScenePath: readString(record, "targetScenePath"),
    targetMarkerId: readString(record, "targetMarkerId")
  };
}

function parseDisconnectRequest(value: unknown): DisconnectSceneLinkRequest {
  const record = asRecord(value);
  return { scenePath: readString(record, "scenePath"), markerId: readString(record, "markerId") };
}

function parseLoadRequest(value: unknown): LoadSceneLinkTargetRequest {
  return parseDisconnectRequest(value);
}

function parseValidateRequest(value: unknown): ValidateSceneLinksRequest {
  const record = asRecord(value);
  if (!Array.isArray(record.markers)) throw new Error("Lista de marcadores invalida.");
  return {
    scenePath: readString(record, "scenePath"),
    markers: record.markers.map((marker) => mapSceneLinkMarkerSchema.parse(marker)) as readonly MapSceneLinkMarker[]
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) throw new Error("Payload invalido.");
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${key} invalido.`);
  return value;
}
