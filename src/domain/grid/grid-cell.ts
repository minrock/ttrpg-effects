import type { GridLayout, SceneGrid } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { getHexCenter, HEX_UNIT_CORNERS } from "./hex-grid";

export type GridGeometry = Pick<SceneGrid, "cellSizeWorld"> & { readonly layout?: GridLayout };
export type GridGeometryInput = number | GridGeometry;

// x/y remain the bounding-box origin in world space, including after free dragging.
// Missing layout is a legacy square cell, independent of the scene's current grid.
export interface GridCell {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly layout?: GridLayout;
}

export function resolveGridGeometry(grid: GridGeometryInput): GridGeometry {
  return typeof grid === "number" ? { cellSizeWorld: grid } : grid;
}

export function getGridCellAtPoint(point: WorldPoint, input: GridGeometryInput): GridCell {
  const grid = resolveGridGeometry(input);
  const size = grid.cellSizeWorld;
  if (grid.layout === "hexagonal") {
    const center = getHexCenter(point, size);
    return { x: center.x - size / 2, y: center.y - size / Math.sqrt(3), size, layout: "hexagonal" };
  }
  return { x: Math.floor(point.x / size) * size, y: Math.floor(point.y / size) * size, size };
}

export function getGridCellHeight(cell: GridCell): number {
  return cell.layout === "hexagonal" ? cell.size * 2 / Math.sqrt(3) : cell.size;
}

export function getGridCellCenter(cell: GridCell): WorldPoint {
  return { x: cell.x + cell.size / 2, y: cell.y + getGridCellHeight(cell) / 2 };
}

export function getGridCellVertices(cell: GridCell): readonly WorldPoint[] {
  if (cell.layout === "hexagonal") {
    const center = getGridCellCenter(cell);
    return HEX_UNIT_CORNERS.map((corner) => ({ x: center.x + corner.x * cell.size, y: center.y + corner.y * cell.size }));
  }
  return [{ x: cell.x, y: cell.y }, { x: cell.x + cell.size, y: cell.y },
    { x: cell.x + cell.size, y: cell.y + cell.size }, { x: cell.x, y: cell.y + cell.size }];
}

export function isPointInGridCell(point: WorldPoint, cell: GridCell): boolean {
  const center = getGridCellCenter(cell);
  const dx = Math.abs(point.x - center.x);
  const dy = Math.abs(point.y - center.y);
  if (cell.layout === "hexagonal") {
    return dx <= cell.size / 2 + 1e-7 && dy + dx / Math.sqrt(3) <= cell.size / Math.sqrt(3) + 1e-7;
  }
  return dx <= cell.size / 2 && dy <= cell.size / 2;
}

export function getGridCellKey(cell: GridCell): string {
  // Equivalent hex vertices/neighbors can differ by floating-point roundoff.
  return `${cell.layout ?? "square"}:${coordinateKey(cell.x)}:${coordinateKey(cell.y)}:${coordinateKey(cell.size)}`;
}

export function getGridCellNeighbors(cell: GridCell): readonly GridCell[] {
  const offsets = cell.layout === "hexagonal"
    ? [[1, 0], [-1, 0], [0.5, Math.sqrt(3) / 2], [-0.5, Math.sqrt(3) / 2], [0.5, -Math.sqrt(3) / 2], [-0.5, -Math.sqrt(3) / 2]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  return offsets.map(([dx, dy]) => ({ ...cell, x: cell.x + dx * cell.size, y: cell.y + dy * cell.size }));
}

export function getGridCellRings(cells: readonly GridCell[]): { bright: GridCell[]; dim: GridCell[] } {
  const occupied = new Set(cells.map(getGridCellKey));
  const bright = new Map<string, GridCell>();
  for (const cell of cells) {
    for (const neighbor of getGridCellNeighbors(cell)) {
      const key = getGridCellKey(neighbor);
      if (!occupied.has(key)) bright.set(key, neighbor);
    }
  }
  const dim = new Map<string, GridCell>();
  for (const cell of bright.values()) {
    for (const neighbor of getGridCellNeighbors(cell)) {
      const key = getGridCellKey(neighbor);
      if (!occupied.has(key) && !bright.has(key)) dim.set(key, neighbor);
    }
  }
  return { bright: [...bright.values()], dim: [...dim.values()] };
}

export function getGridCellsInBrush(point: WorldPoint, radius: number, input: GridGeometryInput): readonly GridCell[] {
  const grid = resolveGridGeometry(input);
  const size = grid.cellSizeWorld;
  const hexagonal = grid.layout === "hexagonal";
  const rowStep = hexagonal ? size * Math.sqrt(3) / 2 : size;
  const cells: GridCell[] = [];
  for (let row = Math.floor((point.y - radius) / rowStep) - 1; row <= Math.ceil((point.y + radius) / rowStep) + 1; row++) {
    const offset = hexagonal ? ((row % 2 + 2) % 2) * size / 2 : size / 2;
    const y = row * rowStep + (hexagonal ? 0 : size / 2);
    for (let column = Math.floor((point.x - radius) / size) - 1; column <= Math.ceil((point.x + radius) / size) + 1; column++) {
      const x = column * size + offset;
      if (Math.hypot(x - point.x, y - point.y) <= radius) {
        cells.push(getGridCellAtPoint({ x, y }, grid));
      }
    }
  }
  return cells.length ? cells : [getGridCellAtPoint(point, grid)];
}

export function getGridCellBoundary(cells: readonly GridCell[]): readonly (readonly [WorldPoint, WorldPoint])[] {
  const edges = new Map<string, readonly [WorldPoint, WorldPoint]>();
  for (const cell of cells) {
    const vertices = getGridCellVertices(cell);
    for (let index = 0; index < vertices.length; index++) {
      const from = vertices[index];
      const to = vertices[(index + 1) % vertices.length];
      const key = [from, to].map((point) => `${coordinateKey(point.x)},${coordinateKey(point.y)}`).sort().join(":");
      if (edges.has(key)) edges.delete(key);
      else edges.set(key, [from, to]);
    }
  }
  return [...edges.values()];
}

function coordinateKey(value: number): string {
  return `${Math.round(value * 1e6) / 1e6}`;
}
