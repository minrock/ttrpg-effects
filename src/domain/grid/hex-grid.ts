import type { GridBounds } from "./grid-window";
import type { WorldPoint } from "../shared/coordinates";
import { defineHex, distance, Orientation, pointToCube } from "honeycomb-grid";

// Normalize once; no per-size grid cache or materialized infinite grid is needed.
const UnitHex = defineHex({ dimensions: 1 / Math.sqrt(3), orientation: Orientation.POINTY, origin: { x: 0, y: 0 }, offset: -1 });
export const HEX_UNIT_CORNERS: readonly WorldPoint[] = new UnitHex().corners;

export function getHexAtPoint(point: WorldPoint, cellSize: number) {
  return new UnitHex(pointToCube(UnitHex.settings, { x: point.x / cellSize, y: point.y / cellSize }));
}

export function getHexCenter(point: WorldPoint, cellSize: number): WorldPoint {
  const hex = getHexAtPoint(point, cellSize);
  return { x: hex.x * cellSize, y: hex.y * cellSize };
}

export function measureHexDistance(from: WorldPoint, to: WorldPoint, cellSize: number): number {
  return distance(UnitHex.settings, getHexAtPoint(from, cellSize), getHexAtPoint(to, cellSize));
}

export const MAX_HEX_GRID_CELLS = 8192;
export type GridSegment = readonly [x1: number, y1: number, x2: number, y2: number];

function getHexGridRange(bounds: GridBounds, cellSize: number) {
  const rowHeight = cellSize * Math.sqrt(3) / 2;
  return {
    firstRow: Math.floor(bounds.top / rowHeight) - 1,
    lastRow: Math.ceil(bounds.bottom / rowHeight) + 1,
    firstColumn: Math.floor(bounds.left / cellSize) - 1,
    lastColumn: Math.ceil(bounds.right / cellSize) + 1,
    rowHeight
  };
}

export function getHexGridCellCount(bounds: GridBounds, cellSize: number): number {
  const range = getHexGridRange(bounds, cellSize);
  return (range.lastRow - range.firstRow + 1) * (range.lastColumn - range.firstColumn + 1);
}

// Pointy-top, odd-row layout. Cell size is the distance between opposite sides.
// Each cell owns only its three right edges; adjacent cells supply the left ones.
export function* getHexGridSegments(bounds: GridBounds, cellSize: number): Generator<GridSegment> {
  const range = getHexGridRange(bounds, cellSize);
  const halfWidth = cellSize / 2;
  const radius = cellSize / Math.sqrt(3);
  for (let row = range.firstRow; row <= range.lastRow; row += 1) {
    const offset = ((row % 2 + 2) % 2) * halfWidth;
    const y = row * range.rowHeight;
    for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
      const x = column * cellSize + offset;
      yield [x, y - radius, x + halfWidth, y - radius / 2];
      yield [x + halfWidth, y - radius / 2, x + halfWidth, y + radius / 2];
      yield [x + halfWidth, y + radius / 2, x, y + radius];
    }
  }
}
