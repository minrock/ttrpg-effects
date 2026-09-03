import { describe, expect, it } from "vitest";
import { getGridWindow, gridWindowCoversView, MAX_GRID_LINES } from "./grid-window";
import { createDefaultScene } from "../sessions/default-scene";
import { sceneDocumentV1Schema } from "../sessions/scene-schema";
import { hasSceneContent } from "../sessions/scene-content";
const viewport = { width: 1400, height: 900 };
const camera = { center: { x: 0, y: 0 }, zoom: 1 };

describe("extended grid", () => {
  it("covers distant viewport coordinates without changing the cell size", () => {
    const far = { ...camera, center: { x: 50000, y: -30000 } };
    const window = getGridWindow(far, viewport, 100);
    expect(window.step).toBe(100);
    expect(gridWindowCoversView(window, far, viewport)).toBe(true);
    expect(window.bounds.left).toBeGreaterThan(40000);
  });
  it("reuses overscan during short pans and refreshes after leaving it", () => {
    const window = getGridWindow(camera, viewport, 100);
    expect(gridWindowCoversView(window, { ...camera, center: { x: 200, y: 200 } }, viewport)).toBe(true);
    expect(gridWindowCoversView(window, { ...camera, center: { x: 2000, y: 2000 } }, viewport)).toBe(false);
  });
  it("always covers the whole viewport at startup", () => {
    const window = getGridWindow(camera, { width: 4000, height: 3000 }, 100);
    expect(window.bounds).toEqual({ left: -4000, right: 4000, top: -3000, bottom: 3000 });
  });
  it("caps lines at extreme zoom-out while retaining multiples of the logical grid", () => {
    const window = getGridWindow({ ...camera, zoom: 0.001 }, { width: 7680, height: 4320 }, 8);
    const count = (window.bounds.right - window.bounds.left + window.bounds.bottom - window.bounds.top) / window.step + 4;
    expect(count).toBeLessThanOrEqual(MAX_GRID_LINES);
    expect(window.step % 8).toBe(0);
  });
  it("loads old scenes and ignores the obsolete extension toggle", () => {
    const scene = createDefaultScene();
    for (const grid of [scene.grid, { ...scene.grid, extendToViewport: false }, { ...scene.grid, extendToViewport: true }]) {
      const restored = sceneDocumentV1Schema.parse(JSON.parse(JSON.stringify({ ...scene, grid })));
      expect(restored.grid).toEqual(scene.grid);
      expect(restored.grid).not.toHaveProperty("extendToViewport");
      expect(hasSceneContent(restored)).toBe(false);
    }
  });
});
