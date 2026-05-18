import { describe, expect, it } from "vitest";
import { createMagicalDarknessEffect, updateMagicalDarknessEffect } from "./magical-darkness";

describe("magical darkness effects", () => {
  it("creates magical darkness with opaque black defaults", () => {
    expect(createMagicalDarknessEffect("darkness-1", { x: 10, y: 20 })).toEqual({
      id: "darkness-1",
      kind: "magical-darkness",
      position: { x: 10, y: 20 },
      radius: 120,
      opacity: 1,
      visible: true
    });
  });

  it("clamps editable radius and opacity", () => {
    const effect = createMagicalDarknessEffect("darkness-1", { x: 0, y: 0 });
    const updated = updateMagicalDarknessEffect(effect, {
      radius: -10,
      opacity: 2
    });

    expect(updated.radius).toBe(1);
    expect(updated.opacity).toBe(1);
  });

  it("updates position and visibility without mutating other fields", () => {
    const effect = createMagicalDarknessEffect("darkness-1", { x: 0, y: 0 });
    const updated = updateMagicalDarknessEffect(effect, {
      position: { x: 12, y: -4 },
      visible: false
    });

    expect(updated).toMatchObject({
      id: "darkness-1",
      position: { x: 12, y: -4 },
      visible: false,
      radius: 120,
      opacity: 1
    });
  });

  it("rejects invalid ids and positions", () => {
    expect(() => createMagicalDarknessEffect("", { x: 0, y: 0 })).toThrow("id");
    expect(() => createMagicalDarknessEffect("darkness-1", { x: Number.NaN, y: 0 })).toThrow(
      "finite"
    );
  });
});
