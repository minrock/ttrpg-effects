// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DicePresentation } from "../../../domain/dice/dice";
import { CriticalDiceLightning } from "./CriticalDiceLightning";

describe("bounded critical lightning", () => {
  let host: HTMLDivElement, effect: CriticalDiceLightning;
  const context = { setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), rect: vi.fn(), clip: vi.fn() };
  const value: DicePresentation = { rollId: "r", contextToken: "c", sceneId: "s", mapId: "m", dice: [], appearance: { color: "multi", material: "resin" }, replay: { frameCount: 2, stepMs: 1, durationMs: 1, frames: [] }, result: null, critical: { dieId: "check:0" }, startedAt: 999, settledAt: 1000 };
  const bounds = { x: 100, y: 120, w: 50, h: 60 };
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(1000); vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => context) as unknown as HTMLCanvasElement["getContext"]);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    host = document.createElement("div"); document.body.append(host); effect = new CriticalDiceLightning(host);
  });
  afterEach(() => { effect.dispose(); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("protects only the number with a small responsive cutout and stops after three seconds", () => {
    effect.present(value, bounds, false);
    const canvas = host.querySelector("canvas")!;
    expect(canvas.hidden).toBe(false); expect(parseFloat(canvas.style.width)).toBeLessThanOrEqual(360);
    vi.advanceTimersByTime(1500);
    expect(context.arc).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), 9, 0, Math.PI * 2);
    expect(context.clip).toHaveBeenCalledWith("evenodd");
    expect(context.stroke.mock.calls.length).toBeGreaterThan(4);
    expect(context.stroke.mock.calls.length).toBeLessThanOrEqual(92);
    effect.present(value, { ...bounds, x: 180, w: 100, h: 120 }, false);
    expect(parseFloat(canvas.style.left) + parseFloat(canvas.style.width) / 2).toBe(230);
    expect(context.arc).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), 18, 0, Math.PI * 2);
    vi.advanceTimersByTime(1500);
    expect(canvas.hidden).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it("renders one static frame for reduced motion and still retires it", () => {
    effect.present(value, bounds, true);
    expect(context.clip).toHaveBeenCalledWith("evenodd");
    expect(context.arc).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), 9, 0, Math.PI * 2);
    const calls = context.stroke.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(context.stroke).toHaveBeenCalledTimes(calls);
    vi.advanceTimersByTime(1000);
    expect(host.querySelector("canvas")?.hidden).toBe(true);
  });
  it("cleans up on dismissal and never restarts an expired celebration", () => {
    effect.present(value, bounds, false); effect.clear();
    expect(vi.getTimerCount()).toBe(0); expect(host.querySelector("canvas")?.hidden).toBe(true);
    vi.setSystemTime(5000); effect.present(value, bounds, false);
    expect(vi.getTimerCount()).toBe(0);
    effect.dispose(); expect(host.querySelector("canvas")).toBeNull();
  });
});
