// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiceEnvelope } from "../../../../domain/dice/dice";
import { DiceOverlay } from "./DiceOverlay";

const render = vi.hoisted(() => ({ present: vi.fn(), dispose: vi.fn() }));
vi.mock("../../../../render/three/dice/DiceOverlayRenderer", () => ({ DiceOverlayRenderer: class { present = render.present; dispose = render.dispose; } }));

describe("persistent dice results", () => {
  let root: Root, host: HTMLDivElement, envelope: DiceEnvelope;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers(); vi.setSystemTime(10000); vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    envelope = { revision: 1, presentation: { rollId: "r", contextToken: "c", sceneId: "s", mapId: "m", dice: [], appearance: { color: "multi", material: "resin" }, replay: { frameCount: 2, stepMs: 1000, durationMs: 1000, frames: [] }, result: { groups: [], poolTotal: 0, d20: { mode: "normal", values: [17], value: 17, selected: 0, modifier: 0, total: 17 } }, startedAt: 10000, settledAt: 11000 } };
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("keeps dice and summary beyond the previous timeout, then clears them on dismissal", async () => {
    const mapClick = vi.fn();
    const dismiss = vi.fn(() => root.render(<div onClick={mapClick}><DiceOverlay envelope={{ revision: 2, presentation: null }} onDismiss={dismiss} /></div>));
    await act(async () => root.render(<div onClick={mapClick}><DiceOverlay envelope={envelope} onDismiss={dismiss} /></div>));
    expect(host.querySelector(".dice-overlay-summary")).toBeNull();
    await act(async () => vi.advanceTimersByTime(3600000));
    expect(host.querySelector(".dice-overlay.is-visible")).not.toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toContain("17");
    expect(render.present).toHaveBeenCalledWith(envelope.presentation);
    expect(render.present).not.toHaveBeenCalledWith(null);
    const close = host.querySelector<HTMLButtonElement>('[aria-label="Cerrar resultados y retirar dados"]')!;
    expect(close.querySelector("svg")).not.toBeNull();
    await act(async () => close.click());
    expect(dismiss).toHaveBeenCalledExactlyOnceWith("r");
    expect(mapClick).not.toHaveBeenCalled();
    expect(render.present).toHaveBeenLastCalledWith(null);
    expect(host.querySelector(".dice-overlay-summary")).toBeNull();
    expect(host.querySelector(".dice-overlay.is-visible")).toBeNull();
  });
  it("preserves the final pose until a closing envelope arrives in Player View", async () => {
    await act(async () => root.render(<DiceOverlay envelope={envelope} />));
    await act(async () => vi.advanceTimersByTime(3600000));
    expect(host.querySelector('[role="status"]')?.textContent).toContain("17");
    expect(host.querySelector("button")).toBeNull();
    await act(async () => root.render(<DiceOverlay envelope={{ revision: 2, presentation: null }} />));
    expect(render.present).toHaveBeenLastCalledWith(null);
    expect(host.querySelector(".dice-overlay-summary")).toBeNull();
  });
  it("does not reveal a summary when the DM disabled it for Player", async () => {
    envelope = { ...envelope, presentation: { ...envelope.presentation!, result: null } };
    await act(async () => root.render(<DiceOverlay envelope={envelope} />));
    await act(async () => vi.advanceTimersByTime(3600000));
    expect(host.querySelector(".dice-overlay.is-visible")).not.toBeNull();
    expect(host.querySelector(".dice-overlay-summary")).toBeNull();
    expect(render.present).toHaveBeenLastCalledWith(envelope.presentation);
  });
  it("shows Critico after settling even without public numbers, then retires only the celebration", async () => {
    envelope = { ...envelope, presentation: { ...envelope.presentation!, result: null, critical: { dieId: "check:0" } } };
    await act(async () => root.render(<DiceOverlay envelope={envelope} />));
    expect(host.querySelector(".dice-critical-announcement")).toBeNull();
    const initialPresents = render.present.mock.calls.length;
    await act(async () => vi.advanceTimersByTime(1010));
    expect(render.present.mock.calls.length).toBe(initialPresents + 1);
    expect(render.present).toHaveBeenLastCalledWith(envelope.presentation);
    expect(host.querySelector(".dice-critical-announcement")?.textContent).toBe("Cr\u00edtico");
    expect(host.querySelector(".dice-overlay-summary")).toBeNull();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(host.querySelector(".dice-critical-announcement")).toBeNull();
    expect(host.querySelector(".dice-overlay.is-visible")).not.toBeNull();
    await act(async () => root.render(<DiceOverlay envelope={{ ...envelope, revision: 2, presentation: { ...envelope.presentation!, result: { groups: [], poolTotal: 0, d20: { mode: "normal", values: [20], value: 20, modifier: 0, total: 20, selected: 0 } } } }} />));
    expect(host.querySelector(".dice-critical-announcement")).toBeNull();
    expect(host.querySelector(".dice-overlay-summary")).not.toBeNull();
  });
  it("removes an active celebration when the roll is dismissed", async () => {
    envelope = { ...envelope, presentation: { ...envelope.presentation!, critical: { dieId: "check:0" } } };
    await act(async () => root.render(<DiceOverlay envelope={envelope} />));
    await act(async () => vi.advanceTimersByTime(1010));
    expect(host.querySelector(".dice-critical-announcement")).not.toBeNull();
    await act(async () => root.render(<DiceOverlay envelope={{ revision: 2, presentation: null }} />));
    expect(host.querySelector(".dice-critical-announcement")).toBeNull();
  });
  it.each(["DM", "Player"])("retains modifiers in a compact %s toast and reserves their space", async role => {
    const result = { d20: null, poolTotal: 14, groups: ["fire", "cold", "force", "acid"].map((id, index) => ({ id, damageType: "none" as const, formula: String(index + 2), modifier: index + 2, dice: [], total: index + 2 })) };
    const onDismiss = role === "DM" ? vi.fn() : undefined;
    const presentation = { ...envelope.presentation!, result };
    await act(async () => root.render(<DiceOverlay envelope={{ ...envelope, presentation }} onDismiss={onDismiss} />));
    await act(async () => vi.advanceTimersByTime(1010));
    expect([...host.querySelectorAll('[role="status"] .dice-result-modifier')].map(node => node.textContent)).toEqual(["Modificador +2", "Modificador +3", "Modificador +4", "Modificador +5"]);
    expect(host.querySelector(".dice-result-values")).toBeNull();
    expect(host.querySelector(".dice-result-total strong")?.textContent).toBe("14");
    const withModifierSpace = parseFloat(host.querySelector<HTMLElement>(".dice-overlay-stage")!.style.bottom);
    const noModifiers = { ...presentation, result: { ...result, groups: result.groups.map(group => ({ ...group, modifier: 0 })) } };
    await act(async () => root.render(<DiceOverlay envelope={{ revision: 2, presentation: noModifiers }} onDismiss={onDismiss} />));
    expect(parseFloat(host.querySelector<HTMLElement>(".dice-overlay-stage")!.style.bottom)).toBeLessThan(withModifierSpace);
  });
});
