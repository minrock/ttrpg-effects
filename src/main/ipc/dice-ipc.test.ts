import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { defaultDiceDraft, DICE_PROTOCOL_VERSION, expandDice, type DiceRollRequest } from "../../domain/dice/dice";
import { registerDiceIpc } from "./dice-ipc";

const handlers = vi.hoisted(() => new Map<string, (event: IpcMainInvokeEvent, value?: unknown) => unknown>());
vi.mock("electron", () => ({ ipcMain: { handle: (channel: string, handler: (event: IpcMainInvokeEvent, value?: unknown) => unknown) => handlers.set(channel, handler) } }));

function fakeWindow() { return { isDestroyed: () => false, webContents: { send: vi.fn(), on: vi.fn(), mainFrame: {} } }; }
describe("dice IPC authorization", () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); handlers.clear(); });
  function setup() {
    const dm = fakeWindow(), player = fakeWindow(), outsider = fakeWindow();
    cleanup = registerDiceIpc({ getDmWindow: () => dm as unknown as BrowserWindow, getPlayerWindow: () => player as unknown as BrowserWindow });
    const event = (window: typeof dm): IpcMainInvokeEvent => ({ sender: window.webContents, senderFrame: window.webContents.mainFrame } as unknown as IpcMainInvokeEvent);
    const call = (channel: string, window: typeof dm, value?: unknown): { ok: boolean; value?: unknown } => handlers.get(channel)!(event(window), value) as { ok: boolean; value?: unknown };
    return { dm, player, outsider, event, call };
  }
  it("rejects players and unrelated windows for every private operation", () => {
    const { call, dm, player, outsider } = setup();
    for (const channel of ["context", "preferences", "begin", "complete", "fail", "dm-state", "clear-history", "result-visibility", "dismiss"]) {
      expect(call(`dice:${channel}`, player, {})).toMatchObject({ ok: false });
      expect(call(`dice:${channel}`, outsider, {})).toMatchObject({ ok: false });
    }
    expect(call("dice:public-state", dm)).toMatchObject({ ok: false });
    expect(call("dice:public-state", player)).toMatchObject({ ok: true });
  });
  it("rejects an iframe inside the DM window", () => {
    const { dm, event } = setup();
    expect(handlers.get("dice:dm-state")!({ ...event(dm), senderFrame: {} } as IpcMainInvokeEvent)).toMatchObject({ ok: false });
  });
  it("never broadcasts a hidden roll, even to a preloaded player", () => {
    const { dm, player, call } = setup();
    expect(call("dice:context", dm, { token: "c", sceneId: "s", mapId: "m", sceneName: "Secret", mapName: "Secret" }).ok).toBe(true);
    player.webContents.send.mockClear();
    const begin = call("dice:begin", dm, { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, d20: null });
    const rollId = (begin.value as { rollId: string }).rollId;
    expect(call("dice:complete", dm, { rollId, simulation: { values: [{ id: "f:d6:0", value: 4 }], replay: { frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1], frameCount: 2, durationMs: 1000 / 30, stepMs: 1000 / 30 } } }).ok).toBe(true);
    expect(player.webContents.send).not.toHaveBeenCalled();
    expect(call("dice:public-state", player)).toMatchObject({ ok: true, value: { presentation: null } });
  });
  it("rejects malformed payloads without exceptions or public side effects", () => {
    const { call, dm, player } = setup();
    for (const channel of ["context", "preferences", "begin", "complete", "fail", "result-visibility", "dismiss"]) expect(call(`dice:${channel}`, dm, { invalid: true })).toMatchObject({ ok: false });
    expect(player.webContents.send).not.toHaveBeenCalled();
  });
  it.each([5, -3, 0])("includes modifier %s once in each damage total through IPC, history and both boards", modifier => {
    const { call, dm, player } = setup();
    expect(call("dice:context", dm, { token: "c", sceneId: "s", mapId: "m", sceneName: "Scene", mapName: "Map" })).toMatchObject({ ok: true, value: { protocolVersion: DICE_PROTOCOL_VERSION } });
    const request: DiceRollRequest = { requestId: "r", contextToken: "c", d20: null, draft: {
      ...defaultDiceDraft(), d20Modifier: 9, visibility: "open", showPlayerResult: true,
      groups: [{ id: "acid", damageType: "acid", dice: { d6: 3 }, modifier }, { id: "cold", damageType: "cold", dice: { d4: 2 }, modifier: -1 }]
    } };
    expect(call("dice:preferences", dm, structuredClone(request.draft))).toMatchObject({ ok: true, value: { groups: [{ modifier }, { modifier: -1 }] } });
    const begin = call("dice:begin", dm, structuredClone(request));
    expect(begin.ok).toBe(true);
    const rollId = (begin.value as { rollId: string }).rollId;
    const dice = expandDice(request), faces = [4, 3, 5, 2, 4];
    const completed = call("dice:complete", dm, { rollId, simulation: {
      values: dice.map((die, index) => ({ id: die.id, value: faces[index] })),
      replay: { frames: Array.from({ length: dice.length * 2 }, () => [0, 0, 1, 0, 0, 0, 1]).flat(), frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30 }
    } });
    const result = { poolTotal: 17 + modifier, groups: [{ damageType: "acid", modifier, total: 12 + modifier }, { damageType: "cold", modifier: -1, total: 5 }], d20: null };
    expect(completed).toMatchObject({ ok: true, value: { envelope: { presentation: { result } }, history: [{ request: { draft: { groups: [{ modifier }, { modifier: -1 }] } }, result }] } });
    expect(call("dice:public-state", player)).toMatchObject({ ok: true, value: { presentation: { result } } });
    for (const window of [dm, player]) expect(window.webContents.send.mock.lastCall).toMatchObject(["dice:presentation", { presentation: { result } }]);
  });
  it("allows the DM to dismiss both boards by roll ID without exposing the log to Player", () => {
    const { call, dm, player } = setup();
    call("dice:context", dm, { token: "c", sceneId: "s", mapId: "m", sceneName: "Secret", mapName: "Secret" });
    const begin = call("dice:begin", dm, { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), visibility: "open", showPlayerResult: true, groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, d20: null });
    const rollId = (begin.value as { rollId: string }).rollId;
    call("dice:complete", dm, { rollId, simulation: { values: [{ id: "f:d6:0", value: 4 }], replay: { frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1], frameCount: 2, durationMs: 1000 / 30, stepMs: 1000 / 30 } } });
    player.webContents.send.mockClear();
    expect(call("dice:dismiss", player, rollId).ok).toBe(false);
    expect(call("dice:dismiss", dm, rollId)).toMatchObject({ ok: true, value: { envelope: { presentation: null }, history: [{ id: rollId }] } });
    expect(player.webContents.send).toHaveBeenCalledExactlyOnceWith("dice:presentation", { revision: 3, presentation: null });
    expect(call("dice:public-state", player)).toMatchObject({ ok: true, value: { presentation: null } });
  });
});
