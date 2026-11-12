import type { SceneGrid } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { sanitizeCellSize } from "./grid";

export function calibrationHeight(grid: Pick<SceneGrid, "layout" | "cellSizeWorld">): number {
  return grid.layout === "hexagonal" ? grid.cellSizeWorld * 2 / Math.sqrt(3) : grid.cellSizeWorld;
}

/** El ancla es la esquina del bounding box de la celda elegida. */
export function calibrateGrid(grid: SceneGrid, anchor: WorldPoint, size?: number): SceneGrid {
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return grid;
  const cellSizeWorld = size === undefined ? grid.cellSizeWorld : sanitizeCellSize(size);
  const origin = grid.layout === "hexagonal"
    ? { x: anchor.x + cellSizeWorld / 2, y: anchor.y + cellSizeWorld / Math.sqrt(3) }
    : { ...anchor };
  return { ...grid, cellSizeWorld, origin };
}
