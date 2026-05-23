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
  onPlayerWindowClosed: (handler: () => void) => {
    const listener = (): void => handler();
    ipcRenderer.on("player-window:closed", listener);
    return () => ipcRenderer.removeListener("player-window:closed", listener);
  }
});
