import { describe, expect, it } from "vitest";
import {
  formatDistance,
  measureCells,
  measureCellsAlternating,
  measureDistance,
  measurePathDistance,
  snapWorldPoint,
  snapWorldPointToCellCenter
} from "./measurement";

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

  it("sums path segment distances with the active diagonal rule", () => {
    expect(
      measurePathDistance(
        [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
          { x: 600, y: 400 }
        ],
        { grid, diagonalMode: "dnd5e-default" }
      )
    ).toMatchObject({
      cells: 7,
      value: 35,
      label: "35 ft"
    });
  });

  it("sums metric path distances", () => {
    expect(
      measurePathDistance(
        [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 }
        ],
        { grid: { ...grid, unit: "m" }, diagonalMode: "dnd5e-default" }
      ).label
    ).toBe("4.5 m");
  });

  it("snaps world points to grid intersections", () => {
    expect(snapWorldPoint({ x: 149, y: -151 }, 100)).toEqual({ x: 100, y: -200 });
  });

  it("snaps world points to the center of a grid cell", () => {
    expect(snapWorldPointToCellCenter({ x: 149, y: -151 }, 100)).toEqual({ x: 150, y: -150 });
  });

  it("formats decimal values without noisy precision", () => {
    expect(formatDistance(4.25, "m")).toBe("4.3 m");
  });

  describe("dnd5e-alternating diagonal mode", () => {
    it("1 diagonal sola cuesta 1 casilla", () => {
      expect(measureCells(1, 1, "dnd5e-alternating")).toBe(1);
    });

    it("2 diagonales cuestan 3 casillas (5+10 ft)", () => {
      expect(measureCells(2, 2, "dnd5e-alternating")).toBe(3);
    });

    it("3 diagonales cuestan 4 casillas (5+10+5 ft)", () => {
      expect(measureCells(3, 3, "dnd5e-alternating")).toBe(4);
    });

    it("4 diagonales cuestan 6 casillas (5+10+5+10 ft)", () => {
      expect(measureCells(4, 4, "dnd5e-alternating")).toBe(6);
    });

    it("measureDistance 1 diagonal → 5 ft", () => {
      expect(
        measureDistance({ x: 0, y: 0 }, { x: 100, y: 100 }, { grid, diagonalMode: "dnd5e-alternating" })
      ).toMatchObject({ cells: 1, value: 5, label: "5 ft" });
    });

    it("measureDistance 2 diagonales → 15 ft", () => {
      expect(
        measureDistance({ x: 0, y: 0 }, { x: 200, y: 200 }, { grid, diagonalMode: "dnd5e-alternating" })
      ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
    });

    it("path multi-segmento acumula el contador de diagonales entre tramos", () => {
      expect(
        measurePathDistance(
          [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 200 }],
          { grid, diagonalMode: "dnd5e-alternating" }
        )
      ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
    });

    it("path con cardinales no afecta el contador de diagonales", () => {
      expect(
        measurePathDistance(
          [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 100 }],
          { grid, diagonalMode: "dnd5e-alternating" }
        )
      ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
    });

    it("measureCellsAlternating devuelve el número de diagonales del segmento", () => {
      expect(measureCellsAlternating(2, 3, 0)).toEqual({ cells: 4, diagonals: 2 });
      expect(measureCellsAlternating(2, 3, 2)).toEqual({ cells: 4, diagonals: 2 });
    });
  });
});
