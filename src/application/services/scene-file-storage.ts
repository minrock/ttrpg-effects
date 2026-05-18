export interface SceneFileStorage {
  saveSceneJson(json: string): Promise<string | null>;
  loadSceneJson(): Promise<{ filePath: string; json: string } | null>;
  fileExists(filePath: string): Promise<boolean>;
  getMapImageUrl?(filePath: string): Promise<string>;
}
