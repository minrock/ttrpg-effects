import { describe, expect, it } from "vitest";
import {
  createAnimatedFireEffect,
  createCellFireZone,
  moveAnimatedFireEffect,
  toggleFireVisibility,
  toggleCircleFireMode,
  updateAnimatedFireEffect
} from "./fire";

describe("fire effects", () => {
  it("creates an animated fire effect with warm defaults", () => {
    expect(createAnimatedFireEffect("fire-1", { x: 12, y: 24 })).toMatchObject({
      id: "fire-1",
      kind: "fire",
      zone: {
        kind: "circle",
        mode: "closed",
        radius: 90
      },
      scale: 1,
      opacity: 0.68,
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

  it("toggles circular fire between closed and open modes", () => {
    const effect = createAnimatedFireEffect("fire-1", { x: 0, y: 0 });
    const open = toggleCircleFireMode(effect);

    expect(open.zone).toMatchObject({
      kind: "circle",
      mode: "open",
      radius: 90
    });
    expect(toggleCircleFireMode(open).zone).toMatchObject({
      kind: "circle",
      mode: "closed"
    });
  });

  it("creates painted cell zones and moves their cells with the effect", () => {
    const zone = createCellFireZone([
      { x: 0, y: 0, size: 40 },
      { x: 40, y: 0, size: 40 }
    ]);
    const effect = updateAnimatedFireEffect(createAnimatedFireEffect("fire-1", { x: 20, y: 20 }), {
      zone
    });
    const moved = moveAnimatedFireEffect(effect, { x: 30, y: 35 });

    expect(moved.zone).toEqual({
      kind: "cells",
      radius: 25,
      cells: [
        { x: 10, y: 15, size: 40 },
        { x: 50, y: 15, size: 40 }
      ]
    });
  });

  it("rejects empty cell zones", () => {
    expect(() => createCellFireZone([])).toThrow("at least one cell");
  });

  it("rejects invalid colors", () => {
    expect(() => updateAnimatedFireEffect(createAnimatedFireEffect("fire-1", { x: 0, y: 0 }), {
      color: "red"
    })).toThrow("hex color");
  });
});
