import type { SceneDocument, SceneOperationResult } from "../domain/sessions/scene-document";
import type { MapOpenResult } from "../domain/map/map-image";

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
}

declare global {
  interface Window {
    ttrpg?: TtrpgApi;
  }
}
