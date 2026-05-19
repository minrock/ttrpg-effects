import type { SceneDocument, SceneOperationResult } from "../domain/sessions/scene-document";
import type { MapOpenResult } from "../domain/map/map-image";
import type { TokenOpenResult } from "../domain/tokens/token-image";

export interface TtrpgAppInfo {
  name: "TTRPG Effects";
  version: "0.0.0";
  status: "Bootstrap listo";
}

export interface TtrpgApi {
  getAppInfo: () => TtrpgAppInfo;
  saveScene: (scene: SceneDocument) => Promise<SceneOperationResult>;
  loadScene: () => Promise<SceneOperationResult>;
  openMapImage: () => Promise<MapOpenResult>;
  resolveMapUrl: (imagePath: string) => Promise<string | null>;
  openTokenImage: () => Promise<TokenOpenResult>;
  resolveTokenUrl: (imagePath: string) => Promise<string | null>;
}

declare global {
  interface Window {
    ttrpg?: TtrpgApi;
  }
}
