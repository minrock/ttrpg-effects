import { describe, expect, it } from "vitest";
import { createAnimatedFireEffect, createDrawnFireEffect, getFireZoneBounds, moveAnimatedFireEffect, updateAnimatedFireEffect } from "./fire";
import { editFireHandle, fireCenter, fireEnd, fireLength, fireMeasure, fireOutline, firePoint, fireZone, hitTestFire } from "./fire-shapes";
import { createDefaultScene } from "../sessions/default-scene";
import { snapWorldPointToCellCenter } from "../measurement/measurement";

const scene = createDefaultScene(), grid = { ...scene.grid, cellSizeWorld: 100 }, settings = { ...scene.settings, snapToGrid: false };
const line = createDrawnFireEffect("line", "line", { x: 0, y: 0 }, { x: 300, y: 0 }, 100);

describe("measured fire shapes", () => {
  it.each(["line", "cone", "circle"] as const)("creates %s without changing legacy properties", shape => {
    const effect = createDrawnFireEffect("fire", shape, { x: 10, y: 20 }, { x: 310, y: 420 }, 100);
    expect(effect.zone.kind).toBe(shape); expect(fireLength(effect)).toBe(500);
    expect(effect.opacity).toBe(createAnimatedFireEffect("old", { x: 0, y: 0 }).opacity);
    expect(effect.emitsLight).toBe(true);
  });
  it("rejects zero-length and nonfinite drawing gestures", () => {
    for (const end of [{ x: 0, y: 0 }, { x: NaN, y: 40 }, { x: Infinity, y: 20 }]) {
      expect(fireZone("line", { x: 0, y: 0 }, end, 100)).toBeNull();
      expect(() => createDrawnFireEffect("bad", "cone", { x: 0, y: 0 }, end, 100)).toThrow();
    }
  });
  it("moves both line endpoints and preserves dimensions, width and identity", () => {
    const moved = moveAnimatedFireEffect(line, { x: 50, y: -75 });
    expect(fireEnd(moved)).toEqual({ x: 350, y: -75 }); expect(fireLength(moved)).toBe(300);
    expect(moved.id).toBe(line.id); expect(moved.zone).toMatchObject({ width: 100 });
    expect(fireCenter(moved)).toEqual({ x: 200, y: -75 });
  });
  it("scales the line footprint around its origin and edits physical endpoints", () => {
    const scaled = updateAnimatedFireEffect(line, { scale: 2 });
    expect(getFireZoneBounds(scaled)).toEqual({ left: 0, right: 600, top: -100, bottom: 100 });
    const edited = editFireHandle(scaled, "start", { x: 100, y: 0 }, grid, settings);
    expect(fireEnd(edited)).toEqual({ x: 600, y: 0 }); expect(edited.position).toEqual({ x: 100, y: 0 });
    expect(fireLength(editFireHandle(edited, "end", { x: 900, y: 0 }, grid, settings))).toBe(800);
  });
  it("selects the real band, not its bounding circle or decorative flames", () => {
    expect(hitTestFire(line, { x: 299, y: 49 })).toBe(true);
    for (const point of [{ x: -1, y: 0 }, { x: 301, y: 0 }, { x: 150, y: 51 }]) expect(hitTestFire(line, point)).toBe(false);
  });
  it("expands the light footprint without folded thick strokes, even for very wide halos", () => {
    const outline = fireOutline(line, 1000);
    expect(Math.min(...outline.map(p => p.x))).toBeCloseTo(-1000);
    expect(Math.max(...outline.map(p => p.x))).toBeCloseTo(1300);
    expect(Math.min(...outline.map(p => p.y))).toBeCloseTo(-1050);
    expect(Math.max(...outline.map(p => p.y))).toBeCloseTo(1050);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!, b = outline[(i + 1) % outline.length]!, c = outline[(i + 2) % outline.length]!;
      expect((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)).toBeGreaterThanOrEqual(-1e-8);
    }
  });
  it.each([0, 90, 180, 270])("rotates the full cone footprint at %s degrees, without changing its aperture", direction => {
    const cone = updateAnimatedFireEffect(createDrawnFireEffect("c", "cone", { x: 0, y: 0 }, { x: 200, y: 0 }, 100), { zone: { kind: "cone", radius: 200, direction } });
    const angle = direction * Math.PI / 180;
    expect(hitTestFire(cone, { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 })).toBe(true);
    expect(hitTestFire(cone, { x: Math.cos(angle + Math.PI / 4) * 100, y: Math.sin(angle + Math.PI / 4) * 100 })).toBe(false);
    expect(fireOutline(cone)).toHaveLength(34);
    const rotated = editFireHandle(cone, "direction", { x: 0, y: -100 }, grid, settings);
    expect(rotated.zone).toEqual({ kind: "cone", radius: 200, direction: 270 });
  });
  it("keeps circle/ring semantics and uses only radius editing for circles", () => {
    const circle = createDrawnFireEffect("c", "circle", { x: 0, y: 0 }, { x: 100, y: 0 }, 100);
    const ring = updateAnimatedFireEffect(circle, { zone: { kind: "circle", mode: "open", radius: 100, innerRadiusRatio: 0.58 } });
    expect(hitTestFire(ring, { x: 0, y: 0 })).toBe(false); expect(hitTestFire(ring, { x: 90, y: 0 })).toBe(true);
    expect(fireLength(editFireHandle(circle, "radius", { x: 0, y: 220 }, grid, settings))).toBe(220);
  });
  it("uses tactical line measures and hex cell centers consistently", () => {
    expect(fireMeasure(line, grid, settings)).toBe("Largo: 15 ft");
    const hex = { ...grid, layout: "hexagonal" as const }, point = { x: 80, y: 70 };
    expect(firePoint(point, "line", grid, settings)).toBe(point);
    expect(firePoint(point, "line", hex, settings)).toEqual(snapWorldPointToCellCenter(point, hex));
    expect(firePoint(point, "cone", grid, { ...settings, snapToGrid: true })).not.toEqual(point);
  });
});
