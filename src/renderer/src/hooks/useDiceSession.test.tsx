// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDiceDraft, DICE_PROTOCOL_VERSION, type DiceContext, type DiceEnvelope } from "../../../domain/dice/dice";
import { useDiceSession, usePublicDice } from "./useDiceSession";

vi.mock("../../../render/three/dice/DiceOverlayRenderer", () => ({}));

describe("dice window lifecycle", () => {
  let root: Root, host: HTMLDivElement, receive: (value: DiceEnvelope) => void;
  const presentation = (mapId: string): DiceEnvelope => ({ revision: 3, presentation: { rollId: "roll", contextToken: "context", sceneId: "scene", mapId, dice: [], appearance: { color: "multi", material: "resin" }, replay: null, result: null, startedAt: 0, settledAt: 0 } });
  const initial = { protocolVersion: DICE_PROTOCOL_VERSION, draft: defaultDiceDraft(), history: [], envelope: { revision: 0, presentation: null }, publicRollId: null, publicResultVisible: false, busyUntil: 0 };
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    Object.defineProperty(window, "ttrpg", { configurable: true, value: {
      onDicePresentation: vi.fn(callback => { receive = callback; return vi.fn(); }), onDiceRenderError: vi.fn(() => vi.fn()),
      updateDiceContext: vi.fn(async () => ({ ok: true, value: initial })), updateDicePreferences: vi.fn(async () => ({ ok: true })),
      getPublicDiceState: vi.fn(async () => ({ ok: true, value: presentation("") }))
    } });
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); Reflect.deleteProperty(window, "ttrpg"); });
  function Player({ mapId = null }: { mapId?: string | null }) { const state = usePublicDice(mapId, mapId ?? "empty", true); return <output>{state.presentation?.rollId ?? "none"}</output>; }
  it("shows public rolls on the empty canvas as well as loaded maps", async () => {
    await act(async () => root.render(<Player />));
    expect(host.textContent).toBe("roll");
    await act(async () => receive({ revision: 2, presentation: null }));
    expect(host.textContent).toBe("roll");
    await act(async () => receive({ revision: 4, presentation: null }));
    expect(host.textContent).toBe("none");
  });
  it("rejects presentation from a different map", async () => {
    await act(async () => root.render(<Player mapId="next-map" />));
    expect(host.textContent).toBe("none");
    await act(async () => receive({ ...presentation("next-map"), revision: 4 }));
    expect(host.textContent).toBe("roll");
  });
  it("does not reset the session for pan, zoom or renamed map metadata", async () => {
    const context: DiceContext = { token: "same-map", sceneId: "s", mapId: "m", sceneName: "Scene", mapName: "Map" };
    function DM({ value }: { value: DiceContext }) { const session = useDiceSession(value); return <output>{String(session.ready)}</output>; }
    await act(async () => root.render(<DM value={context} />));
    await act(async () => root.render(<DM value={{ ...context, mapName: "Renamed" }} />));
    expect(window.ttrpg!.updateDiceContext).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<DM value={{ ...context, token: "next-map", mapId: "next" }} />));
    expect(window.ttrpg!.updateDiceContext).toHaveBeenCalledTimes(2);
  });
  it.each([undefined, DICE_PROTOCOL_VERSION + 1])("blocks rolls against incompatible main protocol %s instead of dropping modifiers", async protocolVersion => {
    vi.mocked(window.ttrpg!.updateDiceContext).mockResolvedValue({ ok: true, value: { ...initial, protocolVersion: protocolVersion as number } });
    const begin = vi.fn(); Object.assign(window.ttrpg!, { beginDiceRoll: begin });
    let controller: ReturnType<typeof useDiceSession>;
    function DM() { controller = useDiceSession({ token: "c", sceneId: "s", mapId: "m", sceneName: "S", mapName: "M" }); return <output>{controller.error}</output>; }
    await act(async () => root.render(<DM />));
    expect(controller!.ready).toBe(false);
    expect(host.textContent).toContain("Guarda la escena y reinicia Electron");
    await act(async () => controller!.roll(null, { ...defaultDiceDraft(), groups: [{ id: "a", damageType: "acid", dice: { d6: 3 }, modifier: 5 }] }));
    expect(begin).not.toHaveBeenCalled();
  });
  it("rechecks protocol before beginning even if main was compatible when the panel opened", async () => {
    const begin = vi.fn(); Object.assign(window.ttrpg!, { beginDiceRoll: begin });
    let controller: ReturnType<typeof useDiceSession>;
    function DM() { controller = useDiceSession({ token: "c", sceneId: "s", mapId: "m", sceneName: "S", mapName: "M" }); return <output>{controller.error}</output>; }
    await act(async () => root.render(<DM />));
    expect(controller!.ready).toBe(true);
    vi.mocked(window.ttrpg!.updateDiceContext).mockResolvedValue({ ok: true, value: { ...initial, protocolVersion: 0 } });
    await act(async () => controller!.roll(null, { ...defaultDiceDraft(), groups: [{ id: "a", damageType: "acid", dice: { d6: 3 }, modifier: 5 }] }));
    expect(begin).not.toHaveBeenCalled();
    expect(controller!.ready).toBe(false);
    expect(host.textContent).toContain("Guarda la escena y reinicia Electron");
  });
});
