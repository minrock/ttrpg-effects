import { afterEach, expect, it, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";
import { registerPlayerWindowIpc, getPlayerWindow } from "./player-window-ipc";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { attentionFrame } from "../../domain/player/attention-focus";
const mocks = vi.hoisted(() => ({ handlers: new Map<string, (event: IpcMainInvokeEvent, value?: unknown) => unknown>(), windows: [] as FakeWindow[] }));
class FakeWindow {
  webContents = { mainFrame: {}, send: vi.fn() };
  listeners = new Map<string, () => void>();
  constructor() { mocks.windows.push(this); }
  isDestroyed = () => false;
  isVisible = () => true;
  isMinimized = () => false;
  isMaximized = () => true;
  maximize = vi.fn(); restore = vi.fn(); show = vi.fn(); focus = vi.fn();
  once = (name: string, fn: () => void) => { this.listeners.set(name, fn); };
  on = this.once;
  loadFile = vi.fn(async () => {});
  loadURL = vi.fn(async () => {});
}
vi.mock("electron", () => ({ ipcMain: { handle: (name: string, fn: (event: IpcMainInvokeEvent, value?: unknown) => unknown) => mocks.handlers.set(name, fn) }, BrowserWindow: Object.assign(function () { return new FakeWindow(); }, {
  fromWebContents: (contents: FakeWindow["webContents"]) => mocks.windows.find(w => w.webContents === contents) ?? null,
  getAllWindows: () => mocks.windows
}) }));
vi.mock("../window-policy", () => ({ installNavigationPolicy: vi.fn(), localRendererPolicy: vi.fn() }));
afterEach(() => { (getPlayerWindow() as unknown as FakeWindow | null)?.listeners.get("closed")?.(); mocks.windows.length = 0; mocks.handlers.clear(); });
it("IPC valida DM/frame/publicación/ready; entrega foco sin zoom ni replay", () => {
  registerPlayerWindowIpc({ isDevelopment: false, preloadPath: "preload.js", iconPath: "icon.png", rendererIndexPath: "index.html" });
  const dm = new FakeWindow();
  const call = (channel: string, window: FakeWindow, payload?: unknown, child = false) => mocks.handlers.get(`player-window:${channel}`)!({ sender: window.webContents, senderFrame: child ? {} : window.webContents.mainFrame } as unknown as IpcMainInvokeEvent, payload);
  const snapshot = { scene: createDefaultScene(), camera: { center: { x: 800, y: 700 }, zoom: 4 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false };
  call("open", dm, snapshot); const player = getPlayerWindow() as unknown as FakeWindow;
  const input = { requestId: crypto.randomUUID(), sceneId: snapshot.scene.id, frame: attentionFrame(snapshot), position: { x: 12.34, y: -56.78 } };
  expect(call("focus", dm, input)).toMatchObject({ ok: false });
  expect(call("content-ready", player, { frame: "old" })).toMatchObject({ ok: false });
  expect(call("content-ready", player, { frame: input.frame })).toMatchObject({ ok: true });
  for (const [window, child] of [[player, false], [dm, true]] as const) expect(call("focus", window, input, child)).toMatchObject({ ok: false });
  expect(call("focus", dm, { ...input, zoom: 1 })).toMatchObject({ ok: false });
  expect(call("focus", dm, input)).toEqual({ ok: true, delivered: 1, incompatible: 0, notReady: 0 });
  expect(call("focus", dm, input)).toMatchObject({ ok: true });
  expect(call("focus", dm, { ...input, position: { x: 0, y: 0 } })).toMatchObject({ ok: false });
  const focusCalls = () => player.webContents.send.mock.calls.filter(([channel]) => channel === "player-window:focus");
  expect(focusCalls()).toHaveLength(1); expect(focusCalls()[0][1]).toMatchObject({ position: input.position }); expect(focusCalls()[0][1]).not.toHaveProperty("zoom");
  player.listeners.get("ready-to-show")?.(); expect(focusCalls()).toHaveLength(1);
  expect(player.webContents.send.mock.calls.some(([channel]) => channel === "player-window:camera-command" || channel === "player-window:camera")).toBe(false);
  expect(call("camera-command", dm, {})).toMatchObject({ ok: false });
  call("publish-scene", dm, { ...snapshot, cameraSyncKey: 1 });
  expect(call("focus", dm, { ...input, requestId: crypto.randomUUID() })).toMatchObject({ ok: false });
});
