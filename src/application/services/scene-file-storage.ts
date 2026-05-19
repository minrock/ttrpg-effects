export interface SceneFileStorage {
  saveSceneJson(json: string, options?: { readonly suggestedFilePath?: string | null }): Promise<string | null>;
  loadSceneJson(): Promise<{ filePath: string; json: string } | null>;
  fileExists(filePath: string): Promise<boolean>;
  getMapImageUrl?(filePath: string): Promise<string>;
  getTokenImageUrl?(filePath: string): Promise<string>;
}
