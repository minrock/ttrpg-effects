import { describe, expect, it } from "vitest";
import {
  createAnimatedFireEffect,
  moveAnimatedFireEffect,
  toggleFireVisibility,
  updateAnimatedFireEffect
} from "./fire";

describe("fire effects", () => {
  it("creates an animated fire effect with warm defaults", () => {
    expect(createAnimatedFireEffect("fire-1", { x: 12, y: 24 })).toMatchObject({
      id: "fire-1",
      kind: "fire",
      scale: 1,
      opacity: 0.95,
      emitsLight: true,
      lightRadius: 150
    });
  });

  it("clamps editable ranges", () => {
    const updated = updateAnimatedFireEffect(createAnimatedFireEffect("fire-1", { x: 0, y: 0 }), {
      scale: -3,
      opacity: 3,
      lightRadius: -40
    });

    expect(updated.scale).toBe(0.1);
    expect(updated.opacity).toBe(1);
    expect(updated.lightRadius).toBe(1);
  });

  it("moves and toggles visibility", () => {
    const effect = createAnimatedFireEffect("fire-1", { x: 0, y: 0 });
    const moved = moveAnimatedFireEffect(effect, { x: -20, y: 8 });

    expect(moved.position).toEqual({ x: -20, y: 8 });
    expect(toggleFireVisibility(moved).visible).toBe(false);
  });

  it("rejects invalid colors", () => {
    expect(() => updateAnimatedFireEffect(createAnimatedFireEffect("fire-1", { x: 0, y: 0 }), {
      color: "red"
    })).toThrow("hex color");
  });
});
