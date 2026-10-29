import { app, BrowserWindow, dialog, Menu, session } from "electron";
import { randomUUID } from "node:crypto";
import { installNavigationPolicy, originPolicy } from "./window-policy";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export function recoveryDocument(origin: string): string {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action ${escapeHtml(origin)}; base-uri 'none'"><title>Servicio no disponible</title><style>
  *{box-sizing:border-box}body{margin:0;background:#111315;color:#ebedef;font:18px system-ui;display:grid;min-height:100vh;place-items:center;padding:24px}main{width:min(100%,620px)}h1{font-size:28px}p{line-height:1.6;overflow-wrap:anywhere}a{display:inline-block;margin:12px 12px 0 0;padding:12px 18px;border:1px solid #758397;border-radius:8px;background:#303438;color:#ebedef;text-decoration:none}a:focus-visible{outline:3px solid #8cc7ff;outline-offset:4px}</style><main><p>TTRPG Effects · Modo servicio</p><h1>No se pudo conectar al servicio</h1><p>${escapeHtml(origin)}</p><p>Comprueba que el servicio esté encendido y que la conexión y el certificado HTTPS sean válidos. Después, reintenta.</p><a href="${escapeHtml(origin)}/">Reintentar</a><a href="${escapeHtml(origin)}/#ttrpg-recovery-quit">Salir</a></main></html>`;
}
export function startService(origin: string): BrowserWindow {
  // Solo memoria, única por proceso/ventana; no comparte cookies del perfil local.
  const serviceSession = session.fromPartition(`service-${randomUUID()}`);
  const window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 820, minHeight: 520, show: true,
    title: `TTRPG Effects · Servicio · ${origin}`, backgroundColor: "#111315",
    webPreferences: { session: serviceSession, contextIsolation: true, nodeIntegration: false,
      nodeIntegrationInSubFrames: false, nodeIntegrationInWorker: false, sandbox: true, webviewTag: false }
  });
  const recoveryUrl = `data:text/html;charset=utf-8,${encodeURIComponent(recoveryDocument(origin))}`;
  const allowedOrigin = originPolicy(origin);
  installNavigationPolicy(window.webContents, url => allowedOrigin(url) || url === recoveryUrl);
  window.webContents.on("will-prevent-unload", event => {
    // Electron necesita resolver este veto síncronamente; solo el descarte explícito lo levanta.
    const choice = dialog.showMessageBoxSync(window, {
      type: "warning", title: "Cambios sin guardar", message: "Hay cambios sin guardar.",
      detail: "Para conservarlos, elige Seguir editando y guarda la escena antes de salir. Si descartas, perderás los cambios pendientes.",
      buttons: ["Seguir editando", "Descartar y salir"], defaultId: 0, cancelId: 0, noLink: true
    });
    if (choice === 1) event.preventDefault();
  });
  let loading = false;
  async function connect(): Promise<void> {
    if (loading || window.isDestroyed()) return;
    loading = true;
    try { await window.loadURL(`${origin}/`); }
    catch {
      if (!window.isDestroyed()) await window.loadURL(recoveryUrl).catch(() => undefined);
    } finally { loading = false; }
  }
  window.webContents.on("will-navigate", (event, url) => {
    if (window.webContents.getURL() !== recoveryUrl) return;
    event.preventDefault();
    if (url === `${origin}/#ttrpg-recovery-quit`) app.quit();
    else if (url === `${origin}/`) void connect();
  });
  window.on("page-title-updated", event => event.preventDefault());
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: "TTRPG Effects", submenu: [{ role: "about" }, { type: "separator" }, { role: "quit", label: "Salir" }] },
    { label: "Editar", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "Servicio", submenu: [{ label: "Reintentar conexión", click: () => {
      // Solo recuperación: no descartar silenciosamente una escena sin guardar.
      if (window.webContents.getURL() === recoveryUrl) void connect();
    } }, { role: "toggleDevTools" }] },
    { label: "Ventana", submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  void connect();
  return window;
}
