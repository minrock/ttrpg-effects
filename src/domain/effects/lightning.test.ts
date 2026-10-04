import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import { measureDistance, snapWorldPointToCellCenter, worldLengthFromValue, worldLengthValue } from "../measurement/measurement";
import { createLightningEffect, editLightningHandle, hitTestLightning, lightningCenter, lightningLength, lightningMeasure, lightningPhase, lightningPoint, lightningZone, moveLightningEffect, updateLightningEffect } from "./lightning";

const { grid, settings } = createDefaultScene();
const origin = { x: 0, y: 0 };
const end = { x: 300, y: 400 };
const create = (shape: "line" | "cone" | "circle") => createLightningEffect(`lightning-${shape}`, shape, origin, end, 1000);

describe("lightning domain", () => {
  it.each(["line", "cone", "circle"] as const)("creates and translates %s without changing identity, geometry or clock", shape => {
    const effect = create(shape);
    const moved = moveLightningEffect(effect, { x: 30, y: -20 });
    expect(lightningLength(moved)).toBe(500);
    expect(moved.seed).toBe(effect.seed);
    expect(lightningPhase(moved, 4000)).toBe(lightningPhase(effect, 4000));
    expect(lightningCenter(moved).x - lightningCenter(effect).x).toBeCloseTo(30);
    expect(lightningCenter(moved).y - lightningCenter(effect).y).toBeCloseTo(-20);
    if (moved.zone.kind === "line") expect(moved.zone.end).toEqual({ x: 330, y: 380 });
  });

  it("rejects coincident, tiny or nonfinite geometry", () => {
    for (const target of [origin, { x: 9, y: 0 }, { x: NaN, y: 1 }, { x: Infinity, y: 0 }]) {
      expect(lightningZone("cone", origin, target)).toBeNull();
      expect(() => createLightningEffect("x", "line", origin, target, 0)).toThrow();
    }
    expect(lightningZone("line", { x: -Number.MAX_VALUE, y: 0 }, { x: Number.MAX_VALUE, y: 0 })).toBeNull();
  });

  it.each([0, 90, 180, 270, 360, -90, 450])("rotates direction %s without changing length or aperture", direction => {
    const rotated = updateLightningEffect(create("cone"), { direction }, 1000);
    const radians = direction * Math.PI / 180;
    const point = (angle: number) => ({ x: Math.cos(radians + angle) * 400, y: Math.sin(radians + angle) * 400 });
    expect(lightningLength(rotated)).toBe(500);
    expect(rotated.zone).not.toHaveProperty("aperture");
    expect(hitTestLightning(rotated, point(29 * Math.PI / 180))).toBe(true);
    expect(hitTestLightning(rotated, point(31 * Math.PI / 180))).toBe(false);
    expect(lightningMeasure(rotated, grid, settings)).toBe("Largo: 25 ft");
  });

  it("edits endpoints independently and preserves radius while rotating", () => {
    const line = editLightningHandle(create("line"), "start", { x: 30, y: 45 }, grid, settings);
    expect(line.position).toEqual({ x: 30, y: 45 });
    expect(line.zone).toEqual({ kind: "line", end });
    const cone = editLightningHandle(create("cone"), "direction", { x: 0, y: -50 }, grid, settings);
    expect(cone.zone).toEqual({ kind: "cone", radius: 500, direction: 270 });
    const circle = editLightningHandle(create("circle"), "radius", { x: 100, y: 0 }, grid, settings);
    expect(circle.zone).toEqual({ kind: "circle", radius: 100 });
  });

  it("uses tactical line measurement but geometric radii in ft/m, even with hidden grids", () => {
    for (const unit of ["ft", "m"] as const) {
      for (const diagonalMode of ["dnd5e-default", "dnd5e-alternating", "manhattan", "euclidean"] as const) {
        const metricGrid = { ...grid, unit, enabled: false };
        expect(lightningMeasure(create("line"), metricGrid, { ...settings, diagonalMode }))
          .toBe(`Largo: ${measureDistance(origin, end, { grid: metricGrid, diagonalMode }).label}`);
        expect(lightningMeasure(create("circle"), metricGrid, { ...settings, diagonalMode }))
          .toBe(unit === "ft" ? "Radio: 25 ft" : "Radio: 7.5 m");
        expect(worldLengthFromValue(worldLengthValue(500, metricGrid), metricGrid)).toBe(500);
      }
    }
    expect(lightningMeasure(create("circle"), { ...grid, cellSizeWorld: 50 }, settings)).toBe("Radio: 50 ft");
  });

  it("snaps line endpoints to hex centers and keeps square lines free", () => {
    const point = { x: 143, y: 27 }, hexGrid = { ...grid, layout: "hexagonal" as const };
    expect(lightningPoint(point, "line", grid, settings)).toEqual(point);
    expect(lightningPoint(point, "line", hexGrid, { ...settings, snapToGrid: false })).toEqual(snapWorldPointToCellCenter(point, hexGrid));
    const line = editLightningHandle(create("line"), "end", point, hexGrid, settings);
    expect(line.zone).toEqual({ kind: "line", end: snapWorldPointToCellCenter(point, hexGrid) });
    expect(lightningMeasure(line, hexGrid, settings)).toBe(`Largo: ${measureDistance(line.position, snapWorldPointToCellCenter(point, hexGrid), { grid: hexGrid, diagonalMode: settings.diagonalMode }).label}`);
  });

  it("rejoins a shared phase after suspension and changes speed continuously", () => {
    const effect = create("line");
    const now = 1791000000000;
    const phase = lightningPhase(effect, now);
    const changed = updateLightningEffect(effect, { speed: 1.5 }, now);
    expect(lightningPhase(changed, now)).toBe(phase);
    expect(lightningPhase(changed, now + 2000)).toBe(phase + 3);
    expect(lightningPhase(JSON.parse(JSON.stringify(changed)), now + 2000)).toBe(phase + 3);
    expect(lightningPhase(effect, 0)).toBe(0);
    expect(updateLightningEffect(effect, { intensity: NaN, speed: NaN, radius: NaN }, now)).toEqual(effect);
  });

  it("selects geometry, not decorative sparks", () => {
    const line = createLightningEffect("l", "line", origin, { x: 100, y: 0 }, 0);
    expect(hitTestLightning(line, { x: 50, y: 8 }, 10)).toBe(true);
    expect(hitTestLightning(line, { x: 50, y: 11 }, 10)).toBe(false);
    expect(hitTestLightning(line, { x: 111, y: 0 }, 10)).toBe(false);
    expect(hitTestLightning(create("circle"), { x: 501, y: 0 }, 100)).toBe(false);
  });
});
