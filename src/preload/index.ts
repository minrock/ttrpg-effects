import { contextBridge, ipcRenderer } from "electron";

const appInfo = {
  name: "TTRPG Effects",
  version: "0.0.0",
  status: "Bootstrap listo"
} as const;

contextBridge.exposeInMainWorld("ttrpg", {
  getAppInfo: () => appInfo,
  saveScene: (scene: unknown) => ipcRenderer.invoke("scene:save", scene),
  loadScene: () => ipcRenderer.invoke("scene:load"),
  openMapImage: () => ipcRenderer.invoke("map:open-image"),
  resolveMapUrl: (imagePath: string) => ipcRenderer.invoke("map:resolve-url", imagePath),
  openTokenImage: () => ipcRenderer.invoke("token:open-image"),
  resolveTokenUrl: (imagePath: string) => ipcRenderer.invoke("token:resolve-url", imagePath)
});
