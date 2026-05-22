import type { SceneDocument, SceneOperationResult } from "../domain/sessions/scene-document";
import type { MapOpenResult } from "../domain/map/map-image";
import type { TokenOpenResult } from "../domain/tokens/token-image";
import type {
  ArcanePointerBroadcast,
  PlayerWindowSnapshot,
  ViewportCameraSnapshot
} from "../domain/player/player-window";

export interface TtrpgAppInfo {
  name: "TTRPG Effects";
  version: "0.0.0";
  status: "Bootstrap listo";
}

export interface TtrpgApi {
  getAppInfo: () => TtrpgAppInfo;
  saveScene: (
    scene: SceneDocument,
    options?: { readonly suggestedFilePath?: string | null }
  ) => Promise<SceneOperationResult>;
  loadScene: () => Promise<SceneOperationResult>;
  openMapImage: () => Promise<MapOpenResult>;
  resolveMapUrl: (imagePath: string) => Promise<string | null>;
  openTokenImage: () => Promise<TokenOpenResult>;
  resolveTokenUrl: (imagePath: string) => Promise<string | null>;
  openPlayerWindow: () => Promise<{ readonly ok: boolean; readonly error?: string }>;
  getPlayerWindowState: () => Promise<{
    readonly snapshot: PlayerWindowSnapshot | null;
    readonly camera: ViewportCameraSnapshot | null;
  }>;
  publishPlayerScene: (snapshot: PlayerWindowSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  publishPlayerCamera: (camera: ViewportCameraSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  publishPlayerPointer: (pointer: ArcanePointerBroadcast) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  onPlayerScene: (handler: (snapshot: PlayerWindowSnapshot) => void) => () => void;
  onPlayerCamera: (handler: (camera: ViewportCameraSnapshot) => void) => () => void;
  onPlayerPointer: (handler: (pointer: ArcanePointerBroadcast) => void) => () => void;
  onPlayerWindowClosed: (handler: () => void) => () => void;
}

declare global {
  interface Window {
    ttrpg?: TtrpgApi;
  }
}
