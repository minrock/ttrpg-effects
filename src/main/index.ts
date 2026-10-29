import { app, dialog, protocol } from "electron";
import { readElectronConfig } from "./electron-config";

app.setName("TTRPG Effects");

async function start(): Promise<void> {
  // Resolver antes de importar infraestructura local o registrar su protocolo/IPC.
  const config = readElectronConfig();
  if (config.mode === "local") {
    protocol.registerSchemesAsPrivileged([
      { scheme: "map-asset", privileges: { bypassCSP: true, corsEnabled: true, secure: true, stream: true, supportFetchAPI: true } }
    ]);
    const { startLocal } = await import("./local-app");
    await app.whenReady();
    await startLocal();
  } else {
    const { startService } = await import("./service-app");
    await app.whenReady();
    startService(config.origin);
  }
}
void start().catch(async () => {
  await app.whenReady();
  dialog.showErrorBox("No se pudo iniciar TTRPG Effects", "Comprueba TTRPG_ELECTRON_MODE (local o service), TTRPG_SERVICE_URL (origen HTTPS; HTTP solo en loopback) y el acceso al almacenamiento. No se cambió de modo.");
  app.quit();
});
app.on("window-all-closed", () => app.quit());
