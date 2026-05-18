import { describe, expect, it } from "vitest";
import { formatDistance, measureCells, measureDistance, snapWorldPoint } from "./measurement";

const grid = {
  cellSizeWorld: 100,
  unit: "ft" as const,
  distancePerCell: 5,
  metricDistancePerCell: 1.5
};

describe("measurement", () => {
  it("measures D&D 5e diagonals as the largest axis", () => {
    expect(measureCells(3, 4, "dnd5e-default")).toBe(4);
  });

  it("measures manhattan diagonals as axis sum", () => {
    expect(measureCells(3, 4, "manhattan")).toBe(7);
  });

  it("measures euclidean diagonals with hypot", () => {
    expect(measureCells(3, 4, "euclidean")).toBe(5);
  });

  it("formats distance in the active grid unit", () => {
    expect(
      measureDistance(
        { x: 0, y: 0 },
        { x: 300, y: 400 },
        { grid, diagonalMode: "dnd5e-default" }
      )
    ).toMatchObject({
      cells: 4,
      value: 20,
      label: "20 ft"
    });
  });

  it("supports metric labels", () => {
    expect(
      measureDistance(
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { grid: { ...grid, unit: "m" }, diagonalMode: "dnd5e-default" }
      ).label
    ).toBe("3 m");
  });

  it("snaps world points to grid intersections", () => {
    expect(snapWorldPoint({ x: 149, y: -151 }, 100)).toEqual({ x: 100, y: -200 });
  });

  it("formats decimal values without noisy precision", () => {
    expect(formatDistance(4.25, "m")).toBe("4.3 m");
  });
});
