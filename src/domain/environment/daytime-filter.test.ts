import { describe, expect, it } from "vitest";
import {
  appendDaytimeMaskStroke,
  createCircularDaytimeMaskStroke,
  createDefaultDaytimeFilter,
  createDefaultDaytimeMask,
  createTopologyDaytimeMaskStroke,
  getDaytimeMaskSummary,
  updateDaytimeFilter
} from "./daytime-filter";

describe("daytime filter", () => {
  it("creates disabled scene defaults", () => {
    expect(createDefaultDaytimeFilter()).toEqual({ enabled: false, preset: "day", coverage: "scene" });
    expect(createDefaultDaytimeMask()).toEqual({ strokes: [] });
  });

  it("keeps only supported scene filter values", () => {
    expect(updateDaytimeFilter(createDefaultDaytimeFilter(), { enabled: true, preset: "night", coverage: "painted" }))
      .toEqual({ enabled: true, preset: "night", coverage: "painted" });
  });

  it("deduplicates topology cells and simplifies circular strokes", () => {
    const topology = createTopologyDaytimeMaskStroke("mask-1", "paint", [
      { x: 0, y: 0, size: 100 },
      { x: 0, y: 0, size: 100 }
    ]);
    const circular = createCircularDaytimeMaskStroke("mask-2", "erase", [
      { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 100, y: 0 }
    ], 50);
    if (topology === null || circular === null || circular.topology !== "circular") throw new Error("Expected strokes");

    const mask = appendDaytimeMaskStroke(appendDaytimeMaskStroke(createDefaultDaytimeMask(), topology), circular);
    expect(getDaytimeMaskSummary(mask)).toEqual({ strokeCount: 2, cellCount: 1, circularStrokeCount: 1 });
    expect(circular.points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
  });
});
