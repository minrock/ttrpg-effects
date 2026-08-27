import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";

const appInfo = {
  name: "TTRPG Effects",
  version: "0.0.0",
  status: "Bootstrap listo"
} as const;

contextBridge.exposeInMainWorld("ttrpg", {
  getAppInfo: () => appInfo,
  saveScene: (scene: unknown, options?: { readonly suggestedFilePath?: string | null }) =>
    ipcRenderer.invoke("scene:save", { scene, suggestedFilePath: options?.suggestedFilePath ?? null }),
  loadScene: () => ipcRenderer.invoke("scene:load"),
  onRecentSceneOpen: (handler: (result: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, result: unknown): void => handler(result);
    ipcRenderer.on("scene:recent-opened", listener);
    return () => ipcRenderer.removeListener("scene:recent-opened", listener);
  },
  listMonsterTemplates: () => ipcRenderer.invoke("monster-template:list"),
  saveMonsterTemplate: (template: unknown) => ipcRenderer.invoke("monster-template:save", template),
  deleteMonsterTemplate: (id: string) => ipcRenderer.invoke("monster-template:delete", id),
  onOpenMonsterTemplateManager: (handler: () => void) => {
    const listener = (): void => handler();
    ipcRenderer.on("monster-template:open-manager", listener);
    return () => ipcRenderer.removeListener("monster-template:open-manager", listener);
  },
  searchMonsterLibrary: (query: unknown) => ipcRenderer.invoke("monster-library:search", query),
  getMonsterLibraryEntry: (id: string) => ipcRenderer.invoke("monster-library:get", id),
  saveMonsterLibraryEntry: (entry: unknown) => ipcRenderer.invoke("monster-library:save", entry),
  searchNpcLibrary: (query: unknown) => ipcRenderer.invoke("npc-library:search", query),
  getNpcLibraryEntry: (id: string) => ipcRenderer.invoke("npc-library:get", id),
  saveNpcLibraryEntry: (entry: unknown) => ipcRenderer.invoke("npc-library:save", entry),
  searchPlayerCharacterLibrary: (query: unknown) => ipcRenderer.invoke("player-character-library:search", query),
  getPlayerCharacterLibraryEntry: (id: string) => ipcRenderer.invoke("player-character-library:get", id),
  savePlayerCharacterLibraryEntry: (entry: unknown) => ipcRenderer.invoke("player-character-library:save", entry),
  openMapImage: () => ipcRenderer.invoke("map:open-image"),
  resolveMapUrl: (imagePath: string) => ipcRenderer.invoke("map:resolve-url", imagePath),
  openTokenImage: () => ipcRenderer.invoke("token:open-image"),
  resolveTokenUrl: (imagePath: string) => ipcRenderer.invoke("token:resolve-url", imagePath),
  openAsideImage: () => ipcRenderer.invoke("aside:open-image"),
  resolveAsideUrl: (imagePath: string) => ipcRenderer.invoke("aside:resolve-url", imagePath),
  openPlayerWindow: (snapshot?: unknown) => ipcRenderer.invoke("player-window:open", snapshot ?? null),
  getPlayerWindowState: () => ipcRenderer.invoke("player-window:get-state"),
  publishPlayerScene: (snapshot: unknown) => ipcRenderer.invoke("player-window:publish-scene", snapshot),
  publishPlayerCamera: (camera: unknown) => ipcRenderer.invoke("player-window:publish-camera", camera),
  publishPlayerPointer: (pointer: unknown) => ipcRenderer.invoke("player-window:publish-pointer", pointer),
  publishPlayerInformationAreaHighlight: (highlight: unknown) =>
    ipcRenderer.invoke("player-window:publish-information-area-highlight", highlight),
  notifyPlayerContentReady: () => ipcRenderer.invoke("player-window:content-ready"),
  onPlayerScene: (handler: (snapshot: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, snapshot: unknown): void => handler(snapshot);
    ipcRenderer.on("player-window:scene", listener);
    return () => ipcRenderer.removeListener("player-window:scene", listener);
  },
  onPlayerCamera: (handler: (camera: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, camera: unknown): void => handler(camera);
    ipcRenderer.on("player-window:camera", listener);
    return () => ipcRenderer.removeListener("player-window:camera", listener);
  },
  onPlayerPointer: (handler: (pointer: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, pointer: unknown): void => handler(pointer);
    ipcRenderer.on("player-window:pointer", listener);
    return () => ipcRenderer.removeListener("player-window:pointer", listener);
  },
  onPlayerInformationAreaHighlight: (handler: (highlight: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, highlight: unknown): void => handler(highlight);
    ipcRenderer.on("player-window:information-area-highlight", listener);
    return () => ipcRenderer.removeListener("player-window:information-area-highlight", listener);
  },
  onPlayerWindowClosed: (handler: () => void) => {
    const listener = (): void => handler();
    ipcRenderer.on("player-window:closed", listener);
    return () => ipcRenderer.removeListener("player-window:closed", listener);
  }
});
