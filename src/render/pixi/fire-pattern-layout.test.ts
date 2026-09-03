import { describe, expect, it } from "vitest";
import { createAnimatedFireEffect, moveAnimatedFireEffect } from "../../domain/effects/fire";
import type { SceneFireEffect } from "../../domain/sessions/scene-document";
import { createFireFlameLayout, getFireFlameBudget, MAX_FIRE_FLAMES_PER_VIEWPORT } from "./fire-pattern-layout";

const fire = createAnimatedFireEffect("fire-1", { x: 100, y: 200 });

describe("organic fire layout", () => {
  it("varies position, dimensions, orientation and animation phase deterministically", () => {
    const layout = createFireFlameLayout(fire, 100);
    expect(layout).toEqual(createFireFlameLayout(fire, 100));
    expect(layout).not.toEqual(createFireFlameLayout({ ...fire, id: "fire-2" }, 100));
    for (const key of ["x", "y", "width", "phase", "rotation", "mirror"] as const) {
      expect(new Set(layout.map((flame) => flame[key])).size).toBeGreaterThan(1);
    }
  });

  it("moves without shuffling flames or their phases", () => {
    for (const effect of [fire, { ...fire, zone: { kind: "cells" as const, radius: 50, cells: [
      { x: 0, y: 0, size: 100 }, { x: 100, y: 0, size: 100 }
    ] } }]) {
      const first = createFireFlameLayout(effect, 100);
      const moved = createFireFlameLayout(moveAnimatedFireEffect(effect, { x: 160, y: 250 }), 100);
      first.forEach((flame, i) => {
        expect(moved[i]!.x).toBeCloseTo(flame.x + 60);
        expect(moved[i]!.y).toBeCloseTo(flame.y + 50);
        expect(moved[i]!.width).toBe(flame.width);
        expect(moved[i]!.phase).toBe(flame.phase);
      });
    }
  });

  it("anchors flames in a circle or ring while allowing complete edge overhang", () => {
    for (const mode of ["closed", "open"] as const) {
      const effect: SceneFireEffect = { ...fire, zone: { kind: "circle", mode, radius: 200, innerRadiusRatio: 0.58 } };
      const layout = createFireFlameLayout(effect, 100);
      const inner = mode === "open" ? 116 : 0;
      let overhang = false;
      for (const flame of layout) {
        const distance = Math.hypot(flame.x - fire.position.x, flame.y - fire.position.y);
        expect(distance).toBeLessThanOrEqual(200);
        expect(distance).toBeGreaterThanOrEqual(inner);
        overhang ||= distance + flame.width / 2 > 200;
      }
      expect(overhang).toBe(true);
    }
  });

  it("places flames in every small disconnected painted cell, not the empty gap", () => {
    const cells = [{ x: 0, y: 0, size: 100 }, { x: 100000, y: 100000, size: 100 }];
    const layout = createFireFlameLayout({ ...fire, zone: { kind: "cells", radius: 50, cells } }, 100);
    for (const cell of cells) {
      expect(layout.some((flame) => flame.x >= cell.x && flame.x <= cell.x + cell.size && flame.y >= cell.y && flame.y <= cell.y + cell.size)).toBe(true);
    }
    expect(layout).toHaveLength(8);
  });

  it("caps large circles and sparse cell sets under the same viewport budget", () => {
    const large: SceneFireEffect = { ...fire, zone: { kind: "circle", mode: "closed", radius: 100000, innerRadiusRatio: 0 } };
    const sparse: SceneFireEffect = { ...fire, zone: { kind: "cells", radius: 50, cells: Array.from({ length: 2000 }, (_, i) => ({ x: i * 10000, y: i * 40000, size: 100 })) } };
    for (const count of [1, 8, 9, 16, 20, 100, 2048]) {
      const budget = getFireFlameBudget(count);
      expect(createFireFlameLayout(large, 100, budget).length * count).toBeLessThanOrEqual(MAX_FIRE_FLAMES_PER_VIEWPORT);
      expect(createFireFlameLayout(sparse, 100, budget).length).toBeLessThanOrEqual(budget);
    }
  });
});
