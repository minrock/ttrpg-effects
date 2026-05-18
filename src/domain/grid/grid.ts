import type { DistanceUnit, SceneGrid } from "../sessions/scene-document";

export interface GridPreset {
  readonly id: string;
  readonly label: string;
  readonly cellSizeWorld: number;
  readonly unit: DistanceUnit;
  readonly distancePerCell: number;
  readonly metricDistancePerCell: number;
}

export const gridPresets = [
  {
    id: "one-inch",
    label: "1 inch/casilla",
    cellSizeWorld: 96,
    unit: "ft",
    distancePerCell: 5,
    metricDistancePerCell: 1.5
  },
  {
    id: "two-point-five-cm",
    label: "2.5 cm/casilla",
    cellSizeWorld: 95,
    unit: "m",
    distancePerCell: 5,
    metricDistancePerCell: 1.5
  },
  {
    id: "five-feet",
    label: "5 ft/casilla",
    cellSizeWorld: 100,
    unit: "ft",
    distancePerCell: 5,
    metricDistancePerCell: 1.5
  },
  {
    id: "one-point-five-meters",
    label: "1.5 m/casilla",
    cellSizeWorld: 100,
    unit: "m",
    distancePerCell: 5,
    metricDistancePerCell: 1.5
  }
] as const satisfies readonly GridPreset[];

export function clampGridOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) {
    return 0.35;
  }

  return Math.min(1, Math.max(0, opacity));
}

export function setGridCellSize(grid: SceneGrid, cellSizeWorld: number): SceneGrid {
  return {
    ...grid,
    cellSizeWorld: sanitizeCellSize(cellSizeWorld)
  };
}

export function setGridOpacity(grid: SceneGrid, opacity: number): SceneGrid {
  return {
    ...grid,
    opacity: clampGridOpacity(opacity)
  };
}

export function applyGridPreset(grid: SceneGrid, preset: GridPreset): SceneGrid {
  return {
    ...grid,
    cellSizeWorld: preset.cellSizeWorld,
    unit: preset.unit,
    distancePerCell: preset.distancePerCell,
    metricDistancePerCell: preset.metricDistancePerCell
  };
}

export function sanitizeCellSize(cellSizeWorld: number): number {
  if (!Number.isFinite(cellSizeWorld) || cellSizeWorld <= 0) {
    return 100;
  }

  return Math.max(8, Math.min(1000, Math.round(cellSizeWorld)));
}
