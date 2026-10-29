import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ quit: vi.fn(), confirm: vi.fn(), options: [] as Electron.BrowserWindowConstructorOptions[], handlers: new Map<string, (...args: unknown[]) => void>(), loadURL: vi.fn(), getURL: vi.fn(), fromPartition: vi.fn(), setMenu: vi.fn(), requests: vi.fn(), permission: vi.fn(), check: vi.fn(), open: vi.fn() }));
vi.mock("electron", () => ({
  app: { quit: mocks.quit },
  dialog: { showMessageBoxSync: mocks.confirm },
  session: { fromPartition: mocks.fromPartition },
  BrowserWindow: class {
    constructor(options: Electron.BrowserWindowConstructorOptions) { mocks.options.push(options); }
    webContents = { id: 1, once: vi.fn(), on: (event: string, handler: (...args: unknown[]) => void) => mocks.handlers.set(event, handler), getURL: mocks.getURL, setWindowOpenHandler: mocks.open,
      session: { webRequest: { onBeforeRequest: mocks.requests }, setPermissionRequestHandler: mocks.permission, setPermissionCheckHandler: mocks.check } };
    on = vi.fn(); isDestroyed = () => false; loadURL = mocks.loadURL;
  },
  Menu: { buildFromTemplate: (value: unknown) => value, setApplicationMenu: mocks.setMenu }
}));
import { startService } from "./service-app";
beforeEach(() => { vi.clearAllMocks(); mocks.options.length = 0; mocks.handlers.clear(); mocks.loadURL.mockResolvedValue(undefined); });
it("compone una ventana aislada con sandbox y menú sin acciones locales", () => {
  startService("https://mesa.example");
  const options = mocks.options[0];
  expect(options.webPreferences).toMatchObject({ sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInSubFrames: false, nodeIntegrationInWorker: false, webviewTag: false });
  expect(options.webPreferences).not.toHaveProperty("preload");
  expect(mocks.fromPartition.mock.calls[0][0]).toMatch(/^service-/);
  expect(mocks.fromPartition.mock.calls[0][0]).not.toContain("persist:");
  expect(JSON.stringify(mocks.setMenu.mock.calls)).not.toMatch(/recent|scene:|map:/);
  expect(mocks.open.mock.calls[0][0]()).toEqual({ action: "deny" });
  expect(mocks.check.mock.calls[0][0]()).toBe(false);
  const callback = vi.fn(); mocks.permission.mock.calls[0][0]({}, "media", callback); expect(callback).toHaveBeenCalledWith(false);
  const request = mocks.requests.mock.calls[0][0];
  request({ webContentsId: 1, resourceType: "mainFrame", url: "file:///tmp/a" }, callback); expect(callback).toHaveBeenLastCalledWith({ cancel: true });
  request({ webContentsId: 1, resourceType: "mainFrame", url: "https://evil.example" }, callback); expect(callback).toHaveBeenLastCalledWith({ cancel: true });
  request({ webContentsId: 1, resourceType: "mainFrame", url: "https://mesa.example/" }, callback); expect(callback).toHaveBeenLastCalledWith({ cancel: false });
});
it("recupera conexión fallida sin bridge y reintenta solo la URL configurada", async () => {
  mocks.loadURL.mockRejectedValueOnce(new Error("ERR_CONNECTION_REFUSED"));
  startService("http://127.0.0.1:8787");
  await vi.waitFor(() => expect(mocks.loadURL).toHaveBeenCalledTimes(2));
  const recovery = mocks.loadURL.mock.calls[1][0] as string;
  expect(decodeURIComponent(recovery)).toContain("Reintentar");
  expect(decodeURIComponent(recovery)).not.toContain("<script");
  mocks.getURL.mockReturnValue(recovery);
  mocks.handlers.get("will-navigate")?.({ preventDefault: vi.fn() }, "http://127.0.0.1:8787/");
  await vi.waitFor(() => expect(mocks.loadURL).toHaveBeenCalledTimes(3));
  expect(mocks.loadURL).toHaveBeenLastCalledWith("http://127.0.0.1:8787/");
});

it("permite salir desde recuperación y no interpreta el enlace desde el servicio", async () => {
  mocks.loadURL.mockRejectedValueOnce(new Error("ERR_CERT_AUTHORITY_INVALID"));
  startService("https://mesa.example");
  await vi.waitFor(() => expect(mocks.loadURL).toHaveBeenCalledTimes(2));
  const recovery = mocks.loadURL.mock.calls[1][0] as string;
  const navigate = mocks.handlers.get("will-navigate")!;
  mocks.getURL.mockReturnValue("https://mesa.example/");
  navigate({ preventDefault: vi.fn() }, "https://mesa.example/#ttrpg-recovery-quit");
  expect(mocks.quit).not.toHaveBeenCalled();
  mocks.getURL.mockReturnValue(recovery);
  navigate({ preventDefault: vi.fn() }, "https://mesa.example/#ttrpg-recovery-quit");
  expect(mocks.quit).toHaveBeenCalledOnce();
});

it("mantiene el veto al cancelar y pide consentimiento de nuevo antes de descartar", () => {
  const window = startService("https://mesa.example");
  expect(mocks.confirm).not.toHaveBeenCalled();
  const preventDefault = vi.fn();
  const unload = mocks.handlers.get("will-prevent-unload")!;
  mocks.confirm.mockReturnValueOnce(0).mockReturnValueOnce(1);
  unload({ preventDefault });
  expect(preventDefault).not.toHaveBeenCalled();
  expect(mocks.confirm).toHaveBeenCalledWith(window, expect.objectContaining({
    title: "Cambios sin guardar", buttons: ["Seguir editando", "Descartar y salir"],
    defaultId: 0, cancelId: 0, noLink: true,
    detail: expect.stringContaining("guarda la escena antes de salir")
  }));
  expect(mocks.quit).not.toHaveBeenCalled();
  expect(mocks.loadURL).toHaveBeenCalledTimes(1);
  unload({ preventDefault });
  expect(mocks.confirm).toHaveBeenCalledTimes(2);
  expect(preventDefault).toHaveBeenCalledOnce();
});

it.each([-1, 0, 2, undefined])("no descarta ante una respuesta distinta de consentimiento: %s", choice => {
  startService("https://mesa.example");
  mocks.confirm.mockReturnValue(choice);
  const preventDefault = vi.fn();
  mocks.handlers.get("will-prevent-unload")!({ preventDefault });
  expect(preventDefault).not.toHaveBeenCalled();
});
