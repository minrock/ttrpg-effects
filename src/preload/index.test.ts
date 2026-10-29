import { describe, expect, it, vi } from "vitest";
import { version } from "../../package.json";
import type { TtrpgApi } from "../shared/api/ttrpg-api";
import type { TtrpgApi as LegacyApi } from "./ttrpg-api";
import type { DiceApi as LegacyDiceApi } from "./dice-api";

const bridge = vi.hoisted(() => ({ exposeInMainWorld: vi.fn(), invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() }));
vi.mock("electron", () => ({ contextBridge: { exposeInMainWorld: bridge.exposeInMainWorld }, ipcRenderer: bridge }));

describe("sandboxed preload contract", () => {
  it("derives synchronous app info from the package and retains specific IPC with unsubscribe", async () => {
    await import("./index");
    const [name, exposed] = bridge.exposeInMainWorld.mock.calls[0] as [string, TtrpgApi];
    const compatible: LegacyApi & LegacyDiceApi = exposed;
    expect(name).toBe("ttrpg");
    expect(compatible.getAppInfo()).toEqual({ name: "TTRPG Effects", version, status: "Bootstrap listo" });
    compatible.getPublicDiceState(); expect(bridge.invoke).toHaveBeenLastCalledWith("dice:public-state");
    const handler = vi.fn(), off = compatible.onPlayerWindowClosed(handler);
    const [channel, listener] = bridge.on.mock.calls.at(-1)!;
    expect(channel).toBe("player-window:closed"); listener(); expect(handler).toHaveBeenCalledOnce();
    off(); expect(bridge.removeListener).toHaveBeenCalledWith(channel, listener);
    expect(exposed).not.toHaveProperty("ipcRenderer");
  });
});
