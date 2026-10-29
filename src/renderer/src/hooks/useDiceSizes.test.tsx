// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiceSizes } from "../../../domain/dice/size";
import { useDiceSizes } from "./useDiceSizes";

describe("dice size synchronization", () => {
  let root: Root, host: HTMLDivElement, receive: (value: DiceSizes) => void, controller: ReturnType<typeof useDiceSizes>;
  const off = vi.fn();
  function View() { controller = useDiceSizes(); return <output>{JSON.stringify(controller.sizes)}</output>; }
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    Object.defineProperty(window, "ttrpg", { configurable: true, value: {
      getDiceSizes: vi.fn(async () => ({ ok: true, value: { revision: 0, dm: 1, player: 1 } })),
      setDiceSize: vi.fn(async () => ({ ok: true, value: { revision: 2, dm: 1, player: 2 } })),
      onDiceSizes: vi.fn(callback => { receive = callback; return off; })
    } });
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); Reflect.deleteProperty(window, "ttrpg"); });
  it("hydrates on reopen, keeps newer events and does not overwrite the other view", async () => {
    await act(async () => root.render(<View />));
    expect(controller!.ready).toBe(true);
    await act(async () => controller!.setSize({ view: "player", scale: 2 }));
    expect(window.ttrpg!.setDiceSize).toHaveBeenCalledExactlyOnceWith({ view: "player", scale: 2 });
    expect(controller!.sizes).toEqual({ revision: 2, dm: 1, player: 2 });
    await act(async () => receive({ revision: 1, dm: 2, player: 1 }));
    expect(controller!.sizes.player).toBe(2);
    await act(async () => root.render(null)); expect(off).toHaveBeenCalledOnce();
    vi.mocked(window.ttrpg!.getDiceSizes).mockResolvedValue({ ok: true, value: { revision: 3, dm: 1.25, player: 2.5 } });
    await act(async () => root.render(<View />));
    expect(controller!.sizes).toEqual({ revision: 3, dm: 1.25, player: 2.5 });
  });
  it("does not replace a live event with an older hydration response", async () => {
    let complete!: (value: Awaited<ReturnType<NonNullable<typeof window.ttrpg>["getDiceSizes"]>>) => void;
    vi.mocked(window.ttrpg!.getDiceSizes).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    await act(async () => root.render(<View />));
    await act(async () => receive({ revision: 3, dm: 2, player: 2.5 }));
    await act(async () => complete({ ok: true, value: { revision: 0, dm: 1, player: 1 } }));
    expect(controller!.sizes).toEqual({ revision: 3, dm: 2, player: 2.5 });
  });
  it("retains the confirmed sizes on rejected changes", async () => {
    await act(async () => root.render(<View />));
    vi.mocked(window.ttrpg!.setDiceSize).mockResolvedValue({ ok: false, error: "Espera a que termine la tirada." });
    await act(async () => controller!.setSize({ view: "dm", scale: 2 }));
    expect(controller!.sizes.dm).toBe(1);
    expect(controller!.error).toContain("Espera");
  });
});
