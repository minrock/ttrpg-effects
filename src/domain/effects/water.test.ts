import { describe, expect, it } from "vitest";
import {
  createWaterEffect,
  getWaterLoopThreshold,
  isWaterLoop,
  mergeConsecutiveRiverEffects,
  type RiverWaterEffect,
  updateWaterEffect
} from "./water";

describe("water effects", () => {
  it("creates rivers from open polylines", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 160, y: 80 }
      ],
      gridCellSizeWorld: 100,
      width: 64
    });

    expect(effect).toMatchObject({
      id: "water-1",
      kind: "water",
      variant: "river",
      width: 64,
      lineRotation: 0,
      patternRotation: 0,
      hue: 0,
      saturation: 1,
      visible: true
    });
  });

  it("updates river pattern rotation", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      gridCellSizeWorld: 100
    });

    const updated = updateWaterEffect(effect, { patternRotation: -45 });

    expect(updated).toMatchObject({
      variant: "river",
      patternRotation: 315
    });
  });

  it("rotates river geometry independently from the water pattern", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      gridCellSizeWorld: 100
    });

    const updated = updateWaterEffect(effect, { lineRotation: 90, patternRotation: 45 });

    expect(updated).toMatchObject({
      variant: "river",
      lineRotation: 90,
      patternRotation: 45
    });
    expect(updated.points[0]?.x).toBeCloseTo(50);
    expect(updated.points[0]?.y).toBeCloseTo(-50);
    expect(updated.points[1]?.x).toBeCloseTo(50);
    expect(updated.points[1]?.y).toBeCloseTo(50);
  });

  it("updates water hue and saturation", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      gridCellSizeWorld: 100
    });

    expect(updateWaterEffect(effect, { hue: 370, saturation: 0.4 })).toMatchObject({
      hue: 10,
      saturation: 0.4
    });
  });

  it("creates closed water bodies when the last point returns near the first point", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
        { x: 120, y: 120 },
        { x: 12, y: 8 }
      ],
      gridCellSizeWorld: 100
    });

    expect(effect.variant).toBe("water-body");
    expect(effect).toMatchObject({
      lineRotation: 0,
      patternRotation: 0
    });
    expect(effect.points[effect.points.length - 1]).toEqual(effect.points[0]);
  });

  it("rotates water body geometry independently from the water pattern", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 0 }
      ],
      gridCellSizeWorld: 100
    });

    const updated = updateWaterEffect(effect, { lineRotation: 90, patternRotation: 45 });

    expect(updated).toMatchObject({
      variant: "water-body",
      lineRotation: 90,
      patternRotation: 45
    });
    expect(updated.points[0]?.x).toBeCloseTo(75);
    expect(updated.points[0]?.y).toBeCloseTo(-25);
    expect(updated.points[1]?.x).toBeCloseTo(75);
    expect(updated.points[1]?.y).toBeCloseTo(75);
    expect(updated.points[2]?.x).toBeCloseTo(-25);
    expect(updated.points[2]?.y).toBeCloseTo(75);
  });

  it("moves all points when the position changes", () => {
    const effect = createWaterEffect({
      id: "water-1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      gridCellSizeWorld: 100
    });

    const moved = updateWaterEffect(effect, { position: { x: effect.position.x + 25, y: effect.position.y + 40 } });

    expect(moved.points).toEqual([
      { x: 25, y: 40 },
      { x: 125, y: 40 }
    ]);
  });

  it("merges consecutive rivers when endpoints are within one grid cell", () => {
    const existing = createWaterEffect({
      id: "water-existing",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      gridCellSizeWorld: 100
    }) as RiverWaterEffect;
    const incoming = createWaterEffect({
      id: "water-new",
      points: [
        { x: 190, y: 0 },
        { x: 290, y: 0 }
      ],
      gridCellSizeWorld: 100
    }) as RiverWaterEffect;

    const result = mergeConsecutiveRiverEffects({
      rivers: [existing],
      incoming,
      maxEndpointDistance: 100
    });

    expect(result.didMerge).toBe(true);
    expect(result.effect.id).toBe("water-existing");
    expect(result.mergedIds).toEqual(["water-existing"]);
    expect(result.effect.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 190, y: 0 },
      { x: 290, y: 0 }
    ]);
  });

  it("uses a new river as a bridge between multiple existing rivers", () => {
    const left = createWaterEffect({
      id: "water-left",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      gridCellSizeWorld: 100
    }) as RiverWaterEffect;
    const right = createWaterEffect({
      id: "water-right",
      points: [
        { x: 300, y: 0 },
        { x: 400, y: 0 }
      ],
      gridCellSizeWorld: 100
    }) as RiverWaterEffect;
    const bridge = createWaterEffect({
      id: "water-bridge",
      points: [
        { x: 190, y: 0 },
        { x: 250, y: 0 }
      ],
      gridCellSizeWorld: 100
    }) as RiverWaterEffect;

    const result = mergeConsecutiveRiverEffects({
      rivers: [left, right],
      incoming: bridge,
      maxEndpointDistance: 100
    });

    expect(result.didMerge).toBe(true);
    expect(result.effect.id).toBe("water-left");
    expect(result.mergedIds).toEqual(["water-left", "water-right"]);
    expect(result.effect.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 190, y: 0 },
      { x: 250, y: 0 },
      { x: 300, y: 0 },
      { x: 400, y: 0 }
    ]);
  });

  it("detects loops using a grid-based threshold", () => {
    expect(
      isWaterLoop(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 35, y: 20 }
        ],
        getWaterLoopThreshold(100)
      )
    ).toBe(true);
  });
});
