import type { DiagonalMode, DistanceUnit, SceneGrid } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { getGridCellAtPoint, getGridCellCenter, resolveGridGeometry, type GridGeometryInput } from "../grid/grid-cell";
import { getHexCenter, measureHexDistance } from "../grid/hex-grid";

export interface MeasurementSettings {
  readonly grid: Pick<
    SceneGrid,
    "cellSizeWorld" | "unit" | "distancePerCell" | "metricDistancePerCell"
  > & Partial<Pick<SceneGrid, "layout">>;
  readonly diagonalMode: DiagonalMode;
}

export interface DistanceResult {
  readonly cells: number;
  readonly value: number;
  readonly unit: DistanceUnit;
  readonly label: string;
}

export function measureDistance(
  from: WorldPoint,
  to: WorldPoint,
  settings: MeasurementSettings
): DistanceResult {
  assertFinitePoint(from);
  assertFinitePoint(to);

  const dxCells = Math.abs(to.x - from.x) / settings.grid.cellSizeWorld;
  const dyCells = Math.abs(to.y - from.y) / settings.grid.cellSizeWorld;
  const cells = settings.grid.layout === "hexagonal"
    ? measureHexDistance(from, to, settings.grid.cellSizeWorld)
    : measureCells(dxCells, dyCells, settings.diagonalMode);
  const value =
    settings.grid.unit === "ft"
      ? cells * settings.grid.distancePerCell
      : cells * settings.grid.metricDistancePerCell;

  return {
    cells,
    value,
    unit: settings.grid.unit,
    label: formatDistance(value, settings.grid.unit)
  };
}

export function measurePathDistance(
  points: readonly WorldPoint[],
  settings: MeasurementSettings
): DistanceResult {
  if (points.length < 2) {
    return {
      cells: 0,
      value: 0,
      unit: settings.grid.unit,
      label: formatDistance(0, settings.grid.unit)
    };
  }

  let cells = 0;

  if (settings.grid.layout !== "hexagonal" && settings.diagonalMode === "dnd5e-alternating") {
    let diagonalsBefore = 0;
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      if (from === undefined || to === undefined) continue;
      const dxCells = Math.abs(to.x - from.x) / settings.grid.cellSizeWorld;
      const dyCells = Math.abs(to.y - from.y) / settings.grid.cellSizeWorld;
      const result = measureCellsAlternating(dxCells, dyCells, diagonalsBefore);
      cells += result.cells;
      diagonalsBefore += result.diagonals;
    }
  } else {
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      if (from === undefined || to === undefined) continue;
      cells += measureDistance(from, to, settings).cells;
    }
  }

  const value =
    settings.grid.unit === "ft"
      ? cells * settings.grid.distancePerCell
      : cells * settings.grid.metricDistancePerCell;

  return {
    cells,
    value,
    unit: settings.grid.unit,
    label: formatDistance(value, settings.grid.unit)
  };
}

export function measureCellsAlternating(
  dxCells: number,
  dyCells: number,
  diagonalsBefore: number
): { cells: number; diagonals: number } {
  const D = Math.min(dxCells, dyCells);
  const S = Math.max(dxCells, dyCells) - D;
  const diagonalCost =
    D + Math.floor((D + diagonalsBefore) / 2) - Math.floor(diagonalsBefore / 2);
  return { cells: S + diagonalCost, diagonals: D };
}

export function measureCells(dxCells: number, dyCells: number, diagonalMode: DiagonalMode): number {
  if (!Number.isFinite(dxCells) || !Number.isFinite(dyCells)) {
    throw new Error("Measurement cell deltas must be finite numbers.");
  }

  switch (diagonalMode) {
    case "dnd5e-default":
      return Math.max(dxCells, dyCells);
    case "dnd5e-alternating":
      return measureCellsAlternating(dxCells, dyCells, 0).cells;
    case "manhattan":
      return dxCells + dyCells;
    case "euclidean":
      return Math.hypot(dxCells, dyCells);
  }
}

export function snapWorldPoint(point: WorldPoint, input: GridGeometryInput, origin?: WorldPoint): WorldPoint {
  assertFinitePoint(point);
  const grid = resolveGridGeometry(input);
  const cellSizeWorld = grid.cellSizeWorld;

  if (!Number.isFinite(cellSizeWorld) || cellSizeWorld <= 0) {
    throw new Error("Cell size must be a positive number.");
  }

  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;

  if (grid.layout === "hexagonal") {
    const local = { x: point.x - ox, y: point.y - oy };
    const dx = cellSizeWorld / 2;
    const dy = cellSizeWorld / (2 * Math.sqrt(3));
    // Preserve exact vertices when preview and commit both apply snap.
    const shifted = getHexCenter({ x: local.x + dx, y: local.y + dy }, cellSizeWorld);
    if (Math.hypot(shifted.x - dx - local.x, shifted.y - dy - local.y) < 1e-6) return point;
    const center = getHexCenter(local, cellSizeWorld);
    return { x: center.x - dx + ox, y: center.y - dy + oy };
  }

  return {
    x: Math.round((point.x - ox) / cellSizeWorld) * cellSizeWorld + ox,
    y: Math.round((point.y - oy) / cellSizeWorld) * cellSizeWorld + oy
  };
}

export function snapWorldPointToCellCenter(
  point: WorldPoint,
  input: GridGeometryInput,
  origin?: WorldPoint
): WorldPoint {
  assertFinitePoint(point);
  const grid = resolveGridGeometry(input);
  const cellSizeWorld = grid.cellSizeWorld;

  if (!Number.isFinite(cellSizeWorld) || cellSizeWorld <= 0) {
    throw new Error("Cell size must be a positive number.");
  }

  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;

  if (grid.layout === "hexagonal") {
    const center = getGridCellCenter(getGridCellAtPoint({ x: point.x - ox, y: point.y - oy }, grid));
    return { x: center.x + ox, y: center.y + oy };
  }

  return {
    x: Math.floor((point.x - ox) / cellSizeWorld) * cellSizeWorld + ox + cellSizeWorld / 2,
    y: Math.floor((point.y - oy) / cellSizeWorld) * cellSizeWorld + oy + cellSizeWorld / 2
  };
}

export function formatDistance(value: number, unit: DistanceUnit): string {
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);

  return `${display} ${unit}`;
}

function assertFinitePoint(point: WorldPoint): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Measurement point must be a finite world coordinate.");
  }
}
