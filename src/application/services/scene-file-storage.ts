export interface SceneFileStorage {
  saveSceneJson(json: string, options?: { readonly suggestedFilePath?: string | null }): Promise<string | null>;
  loadSceneJson(): Promise<{ filePath: string; json: string } | null>;
  loadSceneJsonFromPath?(filePath: string): Promise<{ filePath: string; json: string }>;
  selectSceneJsonPath?(): Promise<string | null>;
  replaceSceneJsonFiles?(files: readonly { readonly filePath: string; readonly json: string }[]): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  getMapImageUrl?(filePath: string): Promise<string>;
  getTokenImageUrl?(filePath: string): Promise<string>;
}
