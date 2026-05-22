import { describe, expect, it } from "vitest";
import {
  createLightSource,
  moveLightSource,
  normalizeDirection,
  toggleLightVisibility,
  updateLightSource
} from "./lights";

describe("lights", () => {
  it("creates point and cone lights with serializable defaults", () => {
    expect(createLightSource("light-1", "point", { x: 10, y: 20 })).toMatchObject({
      id: "light-1",
      kind: "point",
      radius: 90,
      angle: 360,
      visible: true
    });

    expect(createLightSource("light-2", "cone", { x: -10, y: 40 })).toMatchObject({
      id: "light-2",
      kind: "cone",
      radius: 140,
      angle: 60,
      visible: true
    });
  });

  it("clamps editable ranges and normalizes direction", () => {
    const updated = updateLightSource(createLightSource("light-1", "cone", { x: 0, y: 0 }), {
      radius: -10,
      intensity: 2,
      opacity: -1,
      angle: 999,
      direction: -90
    });

    expect(updated).toMatchObject({
      radius: 1,
      intensity: 1,
      opacity: 0,
      angle: 60,
      direction: 270
    });
  });

  it("moves and toggles visibility without mutating the original", () => {
    const light = createLightSource("light-1", "point", { x: 0, y: 0 });
    const moved = moveLightSource(light, { x: 30, y: -15 });
    const hidden = toggleLightVisibility(moved);

    expect(light.position).toEqual({ x: 0, y: 0 });
    expect(moved.position).toEqual({ x: 30, y: -15 });
    expect(hidden.visible).toBe(false);
  });

  it("rejects invalid colors", () => {
    expect(() => updateLightSource(createLightSource("light-1", "point", { x: 0, y: 0 }), {
      color: "orange"
    })).toThrow("hex color");
  });

  it("normalizes directions into a 0 to 360 range", () => {
    expect(normalizeDirection(725)).toBe(5);
  });
});
