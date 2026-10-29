// @vitest-environment jsdom
import { act, StrictMode, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, LOCAL_CAPABILITIES, type ClientCapabilities, type TtrpgClient } from "../../../shared/api/client";
import type { TtrpgApi } from "../../../shared/api/ttrpg-api";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import type { PlayerWindowSnapshot } from "../../../domain/player/player-window";
import { defaultDiceDraft, DICE_PROTOCOL_VERSION, type DiceEnvelope, type DiceSessionState } from "../../../domain/dice/dice";
import { ClientProvider, useTtrpgClient } from "./ClientProvider";
import { App } from "../App";
import { PlayerApp } from "../PlayerApp";
import { ImagePicker } from "../components/aside/ImagePicker";
import { useDiceSession, usePublicDice } from "../hooks/useDiceSession";
import { useDiceSizes } from "../hooks/useDiceSizes";
import type { MapViewport, MapViewportHandle } from "../components/MapViewport";

const viewport = vi.hoisted(() => ({ mount: vi.fn(), unmount: vi.fn(), props: null as ComponentProps<typeof MapViewport> | null }));
vi.mock("../components/MapViewport", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react");
  return { MapViewport: forwardRef<MapViewportHandle, ComponentProps<typeof MapViewport>>(function Canvas(props, ref) {
    viewport.props = props;
    useImperativeHandle(ref, () => ({
      setCameraSnapshot: vi.fn(), setPathHoverPoint: vi.fn(), setWaterHoverPoint: vi.fn(),
      getRandomVisibleWorldPoint: () => ({ x: 0, y: 0 }), getNearbyVisibleWorldPoint: () => ({ x: 0, y: 0 }),
      centerOnWorldPoint: vi.fn(), setPlayerCameraControlState: vi.fn(), clearPlayerCameraControlState: vi.fn()
    }), []);
    useEffect(() => { viewport.mount(); return () => { viewport.unmount(); }; }, []);
    return <div data-canvas>{props.map?.imageUrl}{props.overlay}</div>;
  }) };
});
const none: ClientCapabilities = { scenes: false, images: false, libraries: false, player: false, dice: false, nativeMenus: false };
// Partial fixtures are intentionally confined to this test; production clients require the full API.
function fixture(api: Partial<TtrpgApi>, capabilities: Partial<ClientCapabilities>): TtrpgClient {
  return createClient(api as TtrpgApi, { ...none, ...capabilities });
}
function event<T>() {
  const listeners = new Set<(value: T) => void>();
  return { listeners, subscribe: vi.fn((handler: (value: T) => void) => { listeners.add(handler); return () => { listeners.delete(handler); }; }),
    emit: (value: T) => { for (const listener of listeners) listener(value); } };
}
function playerFixture(label: string) {
  const scene = event<PlayerWindowSnapshot>();
  const pointer = event<Parameters<Parameters<TtrpgApi["onPlayerPointer"]>[0]>[0]>();
  const snapshot: PlayerWindowSnapshot = { scene: { ...createDefaultScene(), map: { ...createDefaultScene().map, imagePath: "fixture.png" } }, showDmFogOverlay: false, mapImageUrl: label, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 1 } };
  const client = fixture({
    getPlayerWindowState: vi.fn(async () => ({ snapshot, camera: null, cameraCommand: null, isOpen: true })),
    onPlayerScene: scene.subscribe, onPlayerPointer: pointer.subscribe,
    onPlayerCameraCommand: () => () => {}, onPlayerInformationAreaHighlight: () => () => {},
    reportPlayerCamera: vi.fn(async () => ({ ok: true })), notifyPlayerContentReady: vi.fn(async () => ({ ok: true })),
    reportPlayerMapImageStatus: vi.fn(async () => {})
  }, { player: true });
  return { client, scene, pointer, snapshot };
}
function diceFixture(revision: number) {
  const presentation = event<DiceEnvelope>();
  const sizes = event<{ revision: number; dm: number; player: number }>();
  const state: DiceSessionState = { protocolVersion: DICE_PROTOCOL_VERSION, draft: defaultDiceDraft(), history: [], envelope: { revision, presentation: null }, publicRollId: null, publicResultVisible: false, busyUntil: 0 };
  const client = fixture({
    onDicePresentation: presentation.subscribe, onDiceRenderError: () => () => {}, onDiceSizes: sizes.subscribe,
    getDiceSizes: vi.fn(async () => ({ ok: true as const, value: { revision, dm: revision, player: 1 } })),
    updateDiceContext: vi.fn(async () => ({ ok: true as const, value: state })),
    getPublicDiceState: vi.fn(async () => ({ ok: true as const, value: state.envelope })),
    updateDicePreferences: vi.fn<TtrpgApi["updateDicePreferences"]>(async draft => ({ ok: true as const, value: draft }))
  }, { dice: true });
  return { client, presentation, sizes };
}

describe("root client composition", () => {
  const roots: Root[] = [], hosts: HTMLDivElement[] = [];
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks(); sessionStorage.clear();
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    Reflect.deleteProperty(window, "ttrpg");
  });
  afterEach(async () => {
    await act(async () => { for (const root of roots.splice(0)) root.unmount(); });
    for (const host of hosts.splice(0)) host.remove();
    Reflect.deleteProperty(window, "ttrpg"); sessionStorage.clear(); vi.unstubAllGlobals();
  });
  function mount() { const host = document.createElement("div"); document.body.append(host); hosts.push(host); const root = createRoot(host); roots.push(root); return { root, host }; }
  async function render(root: Root, client: TtrpgClient | null, content: ReactNode) {
    await act(async () => root.render(<StrictMode><ClientProvider client={client}>{content}</ClientProvider></StrictMode>));
  }
  it("keeps explicit absence and capability absence independent of the bridge", async () => {
    const api = { getAppInfo: vi.fn(() => ({ name: "TTRPG Effects" as const, version: "test", status: "Bootstrap listo" as const })) };
    Object.defineProperty(window, "ttrpg", { configurable: true, value: api });
    function Probe() { const client = useTtrpgClient(); return <output>{client?.api.getAppInfo().version ?? "absent"}</output>; }
    const { root, host } = mount();
    await render(root, null, <Probe />); expect(host.textContent).toBe("absent"); expect(api.getAppInfo).not.toHaveBeenCalled();
    await act(async () => root.render(<Probe />)); expect(host.textContent).toBe("test");
  });
  it("routes real App save actions to the injected client and retains the canvas on ordinary renders", async () => {
    const saveScene = vi.fn<TtrpgApi["saveScene"]>(async () => ({ ok: false, error: "Guardado cancelado de prueba" }));
    const bridgeSave = vi.fn(); Object.defineProperty(window, "ttrpg", { configurable: true, value: { saveScene: bridgeSave } });
    const client = fixture({ saveScene }, { scenes: true }); const { root, host } = mount();
    await render(root, client, <App />); const mounts = viewport.mount.mock.calls.length;
    await render(root, client, <App />); expect(viewport.mount).toHaveBeenCalledTimes(mounts);
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Guardar escena"]')!.click());
    expect(saveScene).toHaveBeenCalledOnce(); expect(bridgeSave).not.toHaveBeenCalled(); expect(host.textContent).toContain("Guardado cancelado de prueba");
  });
  it("injects nested image actions and suppresses disabled capabilities without reporting success", async () => {
    const selected = vi.fn(), openAsideImage = vi.fn<TtrpgApi["openAsideImage"]>(async () => ({ ok: true, imagePath: "opaque", imageUrl: "image" }));
    const resolveAsideUrl = vi.fn(async () => "image"); const { root, host } = mount();
    const content = <ImagePicker imageUrl={null} onImageSelected={selected} onImageRemoved={() => {}} />;
    await render(root, fixture({ openAsideImage, resolveAsideUrl }, { images: true }), content);
    await act(async () => host.querySelector<HTMLSpanElement>("span")!.click());
    expect(selected).toHaveBeenCalledWith("opaque", "image");
    await render(root, fixture({ openAsideImage, resolveAsideUrl }, { images: false }), content);
    await act(async () => host.querySelector<HTMLSpanElement>("span")!.click()); expect(openAsideImage).toHaveBeenCalledOnce();
  });
  it("isolates two Player roots and cleans old listeners under StrictMode and client replacement", async () => {
    const a = playerFixture("client-a"), b = playerFixture("client-b"), c = playerFixture("client-c");
    const bridge = playerFixture("bridge"); Object.defineProperty(window, "ttrpg", { configurable: true, value: bridge.client.api });
    const one = mount(), two = mount(); await render(one.root, a.client, <PlayerApp />); await render(two.root, b.client, <PlayerApp />);
    expect(a.scene.listeners.size).toBe(1); expect(b.scene.listeners.size).toBe(1); expect(bridge.client.api.getPlayerWindowState).not.toHaveBeenCalled();
    await act(async () => a.scene.emit({ ...a.snapshot, mapImageUrl: "a-updated" }));
    expect(one.host.textContent).toContain("a-updated"); expect(two.host.textContent).toContain("client-b");
    await render(one.root, c.client, <PlayerApp />); expect(a.scene.listeners.size).toBe(0); expect(a.pointer.listeners.size).toBe(0); expect(c.scene.listeners.size).toBe(1);
    await act(async () => a.scene.emit({ ...a.snapshot, mapImageUrl: "stale" })); expect(one.host.textContent).toContain("client-c");
    await act(async () => one.root.render(null)); expect(c.scene.listeners.size).toBe(0); expect(b.scene.listeners.size).toBe(1);
  });
  it("does not let an in-flight camera report from A block or consume B's queue", async () => {
    const a = playerFixture("a"), b = playerFixture("b");
    let resolveA!: (value: { ok: boolean }) => void;
    const pendingA = new Promise<{ ok: boolean }>(resolve => { resolveA = resolve; });
    const reportA = vi.fn<TtrpgApi["reportPlayerCamera"]>(() => pendingA);
    const clientA = fixture({ ...a.client.api, reportPlayerCamera: reportA }, { player: true });
    const { root } = mount();
    await render(root, clientA, <PlayerApp />);
    await act(async () => viewport.props!.onCameraInteractionEnd?.({ center: { x: 1, y: 0 }, zoom: 1 }));
    expect(reportA).toHaveBeenCalled();
    await render(root, b.client, <PlayerApp />);
    await act(async () => viewport.props!.onCameraInteractionEnd?.({ center: { x: 99, y: 0 }, zoom: 1 }));
    expect(b.client.api.reportPlayerCamera).toHaveBeenCalledWith(expect.objectContaining({ camera: { center: { x: 99, y: 0 }, zoom: 1 } }));
    const oldCalls = reportA.mock.calls.length;
    await act(async () => { resolveA({ ok: true }); await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(reportA).toHaveBeenCalledTimes(oldCalls);
    expect(reportA.mock.calls.every(([report]) => report.camera.center.x !== 99)).toBe(true);
  });
  it("resets dice revisions on client replacement, isolates events and releases subscriptions", async () => {
    const a = diceFixture(9), b = diceFixture(1); const { root, host } = mount();
    function Dice() { const dm = useDiceSession({ token: "s", sceneId: "s", mapId: "", sceneName: "s", mapName: "" }); const publicState = usePublicDice(null, "s", true); const sizes = useDiceSizes(); return <output>{`${dm.state.envelope.revision}/${publicState.revision}/${sizes.sizes.dm}`}</output>; }
    await render(root, a.client, <Dice />); expect(host.textContent).toBe("9/9/9"); expect(a.presentation.listeners.size).toBe(2);
    const updates = vi.mocked(a.client.api.updateDiceContext).mock.calls.length;
    await render(root, a.client, <Dice />); expect(a.client.api.updateDiceContext).toHaveBeenCalledTimes(updates);
    await render(root, b.client, <Dice />); expect(a.presentation.listeners.size).toBe(0); expect(a.sizes.listeners.size).toBe(0); expect(host.textContent).toBe("1/1/1");
    await act(async () => b.presentation.emit({ revision: 2, presentation: null })); expect(host.textContent).toBe("2/2/1");
    await render(root, null, <Dice />); expect(b.presentation.listeners.size).toBe(0); expect(host.textContent).toBe("-1/-1/1");
  });
  it("copies capabilities so external mutation cannot silently change operation availability", () => {
    const caps = { ...LOCAL_CAPABILITIES }; const client = fixture({}, caps); caps.images = false;
    expect(client.capabilities.images).toBe(true); expect(Object.isFrozen(client.capabilities)).toBe(true);
  });
});
