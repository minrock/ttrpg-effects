import { describe, expect, it } from "vitest";
import { getHexCenter, getHexGridCellCount, getHexGridSegments, MAX_HEX_GRID_CELLS, measureHexDistance } from "./hex-grid";
import { getGridWindow, gridWindowCoversView } from "./grid-window";
import { getGridCellAtPoint, getGridCellBoundary, getGridCellCenter, getGridCellKey, getGridCellNeighbors, getGridCellRings, getGridCellsInBrush, getGridCellVertices, isPointInGridCell } from "./grid-cell";
import { snapWorldPoint, snapWorldPointToCellCenter } from "../measurement/measurement";

const grid = { cellSizeWorld: 100, layout: "hexagonal" as const };

describe("hexagonal grid geometry", () => {
  it("uses regular pointy hexes with the calibrated distance across opposite sides", () => {
    const cell = getGridCellAtPoint({ x: 4, y: 3 }, grid);
    const points = getGridCellVertices(cell);
    expect(getGridCellCenter(cell)).toEqual({ x: 0, y: 0 });
    expect(points).toHaveLength(6);
    expect(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))).toBeCloseTo(100);
    for (let i = 0; i < 6; i++) {
      expect(Math.hypot(points[i].x - points[(i + 1) % 6].x, points[i].y - points[(i + 1) % 6].y)).toBeCloseTo(100 / Math.sqrt(3));
    }
  });

  it("snaps to the actual upper-left vertex, not the bounding-box corner, and is idempotent", () => {
    for (const point of [{ x: 0, y: 0 }, { x: -152, y: -86 }, { x: 104, y: 6 }]) {
      const center = getHexCenter(point, 100);
      const snapped = snapWorldPoint(point, grid);
      expect(snapped.x).toBeCloseTo(center.x - 50);
      expect(snapped.y).toBeCloseTo(center.y - 100 / (2 * Math.sqrt(3)));
      expect(snapWorldPoint(snapped, grid)).toEqual(snapped);
      expect(snapWorldPointToCellCenter(point, grid)).toEqual(center);
    }
  });

  it("finds all six neighbors and measures one cell in every direction, also after translation", () => {
    const cell = getGridCellAtPoint({ x: -200, y: 0 }, grid);
    const neighbors = getGridCellNeighbors(cell);
    expect(neighbors).toHaveLength(6);
    for (const neighbor of neighbors) {
      const center = getGridCellCenter(neighbor);
      expect(getGridCellKey(getGridCellAtPoint(center, grid))).toBe(getGridCellKey(neighbor));
      expect(measureHexDistance(getGridCellCenter(cell), center, 100)).toBe(1);
      expect(getGridCellBoundary([cell, neighbor])).toHaveLength(10);
    }
    const moved = { ...cell, x: cell.x + 13.7, y: cell.y - 29.8 };
    const rings = getGridCellRings([moved]);
    expect(rings.bright).toHaveLength(6);
    expect(rings.dim).toHaveLength(12);
    expect(new Set([moved, ...rings.bright, ...rings.dim].map(getGridCellKey)).size).toBe(19);
  });

  it("paints the hex under a small brush and excludes empty bounding-box corners from hit tests", () => {
    const point = { x: -50, y: -80 };
    const cells = getGridCellsInBrush(point, 1, grid);
    expect(cells).toHaveLength(1);
    expect(isPointInGridCell(point, cells[0])).toBe(true);
    expect(isPointInGridCell({ x: cells[0].x + 1, y: cells[0].y + 1 }, cells[0])).toBe(false);
    expect(getGridCellsInBrush({ x: 0, y: 0 }, 101, grid)).toHaveLength(7);
  });

  it("does not change historical square-cell geometry or four-neighbor lighting", () => {
    const square = { x: 0, y: 0, size: 100 };
    expect(getGridCellVertices(square)).toHaveLength(4);
    expect(getGridCellRings([square]).bright).toHaveLength(4);
    expect(getGridCellRings([square]).dim).toHaveLength(8);
    expect(getGridCellKey({ ...square, layout: "hexagonal" })).not.toBe(getGridCellKey(square));
  });

  it("draws every visible edge exactly once and matches the geometry used for painting", () => {
    const bounds = { left: -500, right: 500, top: -500, bottom: 500 };
    const segments = [...getHexGridSegments(bounds, 100)];
    const key = (v: readonly number[]) => [v.slice(0, 2), v.slice(2)].map(p => p.map(n => Math.round(n * 1e6) / 1e6).join(",")).sort().join(":");
    const keys = new Set(segments.map(key));
    expect(keys.size).toBe(segments.length);
    expect(segments).toHaveLength(getHexGridCellCount(bounds, 100) * 3);
    for (const point of [{ x: 0, y: 0 }, { x: -310, y: 220 }, { x: 410, y: -220 }]) {
      for (const [a, b] of getGridCellBoundary([getGridCellAtPoint(point, grid)])) {
        expect(keys.has(key([a.x, a.y, b.x, b.y]))).toBe(true);
      }
    }
  });

  it("bounds geometry for extreme zoom and large screens without changing logical cell size", () => {
    for (const zoom of [4, 1, 0.25, 0.001]) {
      const camera = { center: { x: 50000, y: -30000 }, zoom };
      const viewport = { width: 7680, height: 4320 };
      const window = getGridWindow(camera, viewport, 8, "hexagonal");
      expect(gridWindowCoversView(window, camera, viewport)).toBe(true);
      expect(getHexGridCellCount(window.bounds, window.step)).toBeLessThanOrEqual(MAX_HEX_GRID_CELLS);
      expect([...getHexGridSegments(window.bounds, window.step)].length).toBeLessThanOrEqual(MAX_HEX_GRID_CELLS * 3);
      expect(window.step % 8).toBe(0);
    }
  });
});
