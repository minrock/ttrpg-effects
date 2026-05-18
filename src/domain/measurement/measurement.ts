import type { DiagonalMode, DistanceUnit, SceneGrid } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export interface MeasurementSettings {
  readonly grid: Pick<
    SceneGrid,
    "cellSizeWorld" | "unit" | "distancePerCell" | "metricDistancePerCell"
  >;
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
  const cells = measureCells(dxCells, dyCells, settings.diagonalMode);
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

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];

    if (from === undefined || to === undefined) {
      continue;
    }

    cells += measureDistance(from, to, settings).cells;
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

export function measureCells(dxCells: number, dyCells: number, diagonalMode: DiagonalMode): number {
  if (!Number.isFinite(dxCells) || !Number.isFinite(dyCells)) {
    throw new Error("Measurement cell deltas must be finite numbers.");
  }

  switch (diagonalMode) {
    case "dnd5e-default":
      return Math.max(dxCells, dyCells);
    case "manhattan":
      return dxCells + dyCells;
    case "euclidean":
      return Math.hypot(dxCells, dyCells);
  }
}

export function snapWorldPoint(point: WorldPoint, cellSizeWorld: number, origin?: WorldPoint): WorldPoint {
  assertFinitePoint(point);

  if (!Number.isFinite(cellSizeWorld) || cellSizeWorld <= 0) {
    throw new Error("Cell size must be a positive number.");
  }

  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;

  return {
    x: Math.round((point.x - ox) / cellSizeWorld) * cellSizeWorld + ox,
    y: Math.round((point.y - oy) / cellSizeWorld) * cellSizeWorld + oy
  };
}

export function snapWorldPointToCellCenter(
  point: WorldPoint,
  cellSizeWorld: number,
  origin?: WorldPoint
): WorldPoint {
  assertFinitePoint(point);

  if (!Number.isFinite(cellSizeWorld) || cellSizeWorld <= 0) {
    throw new Error("Cell size must be a positive number.");
  }

  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;

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
