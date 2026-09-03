import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import {
  applyGridPreset,
  clampGridOpacity,
  gridPresets,
  setGridCellSize,
  setGridOpacity
} from "./grid";

describe("grid rules", () => {
  it("clamps opacity to a visible range", () => {
    expect(clampGridOpacity(-1)).toBe(0);
    expect(clampGridOpacity(2)).toBe(1);
    expect(clampGridOpacity(Number.NaN)).toBe(0.35);
  });

  it("sanitizes numeric cell size changes", () => {
    const grid = createDefaultScene().grid;

    expect(setGridCellSize(grid, 140).cellSizeWorld).toBe(140);
    expect(setGridCellSize(grid, -10).cellSizeWorld).toBe(100);
    expect(setGridCellSize(grid, 2).cellSizeWorld).toBe(8);
  });

  it("updates opacity without mutating the rest of the grid", () => {
    const grid = createDefaultScene().grid;

    expect(setGridOpacity(grid, 0.75)).toEqual({
      ...grid,
      opacity: 0.75
    });
  });

  it("applies presets to scene grid values", () => {
    const grid = createDefaultScene().grid;
    const preset = gridPresets[3];

    expect(applyGridPreset(grid, preset)).toMatchObject({
      cellSizeWorld: preset.cellSizeWorld,
      unit: preset.unit,
      distancePerCell: preset.distancePerCell,
      metricDistancePerCell: preset.metricDistancePerCell
    });
    expect(applyGridPreset({ ...grid, lineWidth: 3 }, preset).lineWidth).toBe(3);
    expect(applyGridPreset({ ...grid, layout: "hexagonal" }, preset).layout).toBe("hexagonal");
  });
});
