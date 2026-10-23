import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ElectronMapImageStorage } from "../../infrastructure/file-system/electron-map-image-storage";
import { registerMapIpc } from "./map-ipc";

const mocks = vi.hoisted(() => ({ handle: vi.fn() }));
vi.mock("electron", () => ({ ipcMain: { handle: mocks.handle } }));

beforeEach(() => vi.clearAllMocks());

function setup() {
  const mainFrame = {};
  const webContents = { mainFrame };
  const window = { webContents, isDestroyed: vi.fn().mockReturnValue(false) };
  const getMainWindow = vi.fn().mockReturnValue(window);
  const storage = {
    selectReplacementMapImage: vi.fn().mockResolvedValue({ status: "cancelled" }),
    openMapImage: vi.fn(), resolveMapUrl: vi.fn(), openTokenImage: vi.fn(), resolveTokenUrl: vi.fn()
  };
  registerMapIpc(storage as unknown as ElectronMapImageStorage, { getMainWindow: getMainWindow as () => BrowserWindow | null });
  const handler = mocks.handle.mock.calls.find(([channel]) => channel === "map:select-replacement-image")?.[1] as
    (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>;
  const event = { sender: webContents, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
  return { handler, event, storage, getMainWindow, window };
}

describe("replacement map IPC", () => {
  it("permits the DM main frame and propagates cancellation", async () => {
    const { handler, event, storage } = setup();
    expect(await handler(event)).toEqual({ status: "cancelled" });
    expect(storage.selectReplacementMapImage).toHaveBeenCalledExactlyOnceWith();
  });

  it.each(["player", "subframe", "detached", "closed", "missing"])("rejects %s senders before opening a dialog", async (sender) => {
    const { handler, event, storage, getMainWindow, window } = setup();
    const request = { ...event };
    if (sender === "player") request.sender = {} as IpcMainInvokeEvent["sender"];
    if (sender === "subframe") request.senderFrame = {} as IpcMainInvokeEvent["senderFrame"];
    if (sender === "detached") request.senderFrame = null;
    if (sender === "closed") window.isDestroyed.mockReturnValue(true);
    if (sender === "missing") getMainWindow.mockReturnValue(null);
    expect(await handler(request)).toEqual({ status: "error", error: "Operacion permitida solo desde la ventana del DM." });
    expect(storage.selectReplacementMapImage).not.toHaveBeenCalled();
  });

  it.each([null, "/arbitrary/path.png", { imagePath: "/arbitrary/path.png" }])("rejects unexpected payload %j", async (payload) => {
    const { handler, event, storage } = setup();
    expect(await handler(event, payload)).toMatchObject({ status: "error" });
    expect(storage.selectReplacementMapImage).not.toHaveBeenCalled();
  });

  it("returns only the validated reference contract", async () => {
    const { handler, event, storage } = setup();
    const ready = { status: "ready", imagePath: "/map.png", imageUrl: "map-asset:///map.png?revision=1" };
    storage.selectReplacementMapImage.mockResolvedValue({ ...ready, bytes: new Uint8Array([1]) });
    expect(await handler(event)).toEqual(ready);
  });

  it("serializes selection errors", async () => {
    const { handler, event, storage } = setup();
    storage.selectReplacementMapImage.mockRejectedValue(new Error("native failure"));
    expect(await handler(event)).toMatchObject({ status: "error", error: expect.any(String) });
  });

  it("keeps all legacy map and token channels registered", () => {
    setup();
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(expect.arrayContaining([
      "map:open-image", "map:resolve-url", "token:open-image", "token:resolve-url"
    ]));
  });
});
