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
  openMapImage: () => ipcRenderer.invoke("map:open-image")
});
