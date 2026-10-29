import { describe, expect, it } from "vitest";
import { diceReplayBounds, diceSizeChangeSchema, fitDiceView, type DiceBounds } from "./size";

describe("dice viewport sizing", () => {
  it.each([1, 1.25, 1.5, 1.75, 2, 2.25, 2.5])("accepts size %s for either window", scale => {
    for (const view of ["dm", "player"]) expect(diceSizeChangeSchema.safeParse({ view, scale }).success).toBe(true);
  });
  it.each([0, .75, 1.1, 2.6, Infinity, NaN, "2"])("rejects invalid scale %s", scale => {
    expect(diceSizeChangeSchema.safeParse({ view: "player", scale }).success).toBe(false);
  });
  it("keeps the base frame and doubles linear dimensions when there is space", () => {
    const bounds = { minX: -.8, maxX: .8, minY: -.8, maxY: .8 };
    const base = fitDiceView(1200, 700, 1, bounds), large = fitDiceView(1200, 700, 2, bounds);
    expect(base.x).toBe(0); expect(base.y).toBe(0);
    expect(large.halfWidth).toBe(base.halfWidth); expect(large.halfHeight).toBe(base.halfHeight);
    expect(large.scale / base.scale).toBe(2);
  });
  it.each([[1200, 700], [390, 620], [700, 190], [300, 120]])("fits all bounds inside %sx%s including padding without changing their relative positions", (width, height) => {
    const bounds: DiceBounds = { minX: -8.6, maxX: 8.6, minY: -4.6, maxY: 4.6 };
    const fit = fitDiceView(width, height, 2.5, bounds);
    expect(fit.scale).toBeLessThan(2.5);
    const project = (x: number, y: number) => ({ x: width / 2 + (x - fit.x) * fit.scale * width / (2 * fit.halfWidth), y: height / 2 + (y - fit.y) * fit.scale * height / (2 * fit.halfHeight) });
    const min = project(bounds.minX, bounds.minY), max = project(bounds.maxX, bounds.maxY);
    expect(min.x).toBeGreaterThanOrEqual(24 - 1e-8); expect(min.y).toBeGreaterThanOrEqual(24 - 1e-8);
    expect(max.x).toBeLessThanOrEqual(width - 24 + 1e-8); expect(max.y).toBeLessThanOrEqual(height - 24 + 1e-8);
    expect(fitDiceView(width, height, 1, bounds).scale).toBeLessThanOrEqual(1);
  });
  it("recenters an edge die instead of clipping or cancelling available magnification", () => {
    const fit = fitDiceView(1200, 700, 2.5, { minX: 7, maxX: 8.6, minY: -4.6, maxY: -3 });
    expect(fit.scale).toBe(2.5); expect(fit.x).toBeGreaterThan(0); expect(fit.y).toBeLessThan(0);
  });
  it("bounds the complete motion once and uses the final poses to regain space at rest", () => {
    const replay = { frameCount: 3, stepMs: 100, durationMs: 200, frames: [-8, -4, 4, 0, 0, 0, 1, 8, 4, 2, 0, 0, 0, 1, 0, 0, .8, 0, 0, 0, 1] };
    const saved = structuredClone(replay);
    const rolling = diceReplayBounds(replay, [.8], false)!, settled = diceReplayBounds(replay, [.8], true)!;
    expect(rolling.minX).toBe(-8.8); expect(rolling.maxX).toBe(8.8);
    expect(settled.minX).toBe(-.8); expect(settled.maxX).toBe(.8);
    expect(fitDiceView(1200, 700, 2.5, rolling).scale).toBeLessThan(2.5);
    expect(fitDiceView(1200, 700, 2.5, settled).scale).toBe(2.5);
    expect(replay).toEqual(saved);
    expect(diceReplayBounds(replay, [], false)).toBeNull();
  });
});
