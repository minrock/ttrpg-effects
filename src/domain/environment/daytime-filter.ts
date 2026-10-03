import { getGridCellKey, type GridCell } from "../grid/grid-cell";
import type { WorldPoint } from "../shared/coordinates";

export const daytimePresets = ["day", "sunset", "night"] as const;
export const daytimeCoverages = ["scene", "painted"] as const;
export const daytimeBrushTopologies = ["topology", "circular"] as const;
export const daytimeMaskStrokeModes = ["paint", "erase"] as const;

export type DaytimePreset = (typeof daytimePresets)[number];
export type DaytimeCoverage = (typeof daytimeCoverages)[number];
export type DaytimeBrushTopology = (typeof daytimeBrushTopologies)[number];
export type DaytimeMaskStrokeMode = (typeof daytimeMaskStrokeModes)[number];

export interface SceneDaytimeFilter {
  readonly enabled: boolean;
  readonly preset: DaytimePreset;
  readonly coverage: DaytimeCoverage;
}

export type DaytimeMaskStroke =
  | {
      readonly id: string;
      readonly topology: "topology";
      readonly mode: DaytimeMaskStrokeMode;
      readonly cells: readonly GridCell[];
    }
  | {
      readonly id: string;
      readonly topology: "circular";
      readonly mode: DaytimeMaskStrokeMode;
      readonly points: readonly WorldPoint[];
      readonly radius: number;
    };

export interface SceneDaytimeMask {
  readonly strokes: readonly DaytimeMaskStroke[];
}

export function createDefaultDaytimeFilter(): SceneDaytimeFilter {
  return { enabled: false, preset: "day", coverage: "scene" };
}

export function createDefaultDaytimeMask(): SceneDaytimeMask {
  return { strokes: [] };
}

export function updateDaytimeFilter(
  filter: SceneDaytimeFilter,
  patch: Partial<SceneDaytimeFilter>
): SceneDaytimeFilter {
  return {
    enabled: patch.enabled ?? filter.enabled,
    preset: patch.preset !== undefined && daytimePresets.includes(patch.preset) ? patch.preset : filter.preset,
    coverage:
      patch.coverage !== undefined && daytimeCoverages.includes(patch.coverage)
        ? patch.coverage
        : filter.coverage
  };
}

export function createTopologyDaytimeMaskStroke(
  id: string,
  mode: DaytimeMaskStrokeMode,
  cells: readonly GridCell[]
): DaytimeMaskStroke | null {
  assertId(id);
  const unique = new Map<string, GridCell>();
  for (const cell of cells) {
    if (!isGridCell(cell)) continue;
    unique.set(getGridCellKey(cell), cell);
  }
  return unique.size === 0 ? null : { id, topology: "topology", mode: sanitizeMode(mode), cells: [...unique.values()] };
}

export function createCircularDaytimeMaskStroke(
  id: string,
  mode: DaytimeMaskStrokeMode,
  points: readonly WorldPoint[],
  radius: number
): DaytimeMaskStroke | null {
  assertId(id);
  const validPoints = points.filter(isWorldPoint);
  if (validPoints.length === 0) return null;
  return {
    id,
    topology: "circular",
    mode: sanitizeMode(mode),
    points: simplifyPoints(validPoints, Math.max(1, sanitizeRadius(radius) * 0.35)),
    radius: sanitizeRadius(radius)
  };
}

export function appendDaytimeMaskStroke(mask: SceneDaytimeMask, stroke: DaytimeMaskStroke): SceneDaytimeMask {
  return { strokes: [...mask.strokes, stroke] };
}

export function clearDaytimeMask(): SceneDaytimeMask {
  return createDefaultDaytimeMask();
}

export function getDaytimeMaskSummary(mask: SceneDaytimeMask): {
  readonly strokeCount: number;
  readonly cellCount: number;
  readonly circularStrokeCount: number;
} {
  return mask.strokes.reduce(
    (summary, stroke) => ({
      strokeCount: summary.strokeCount + 1,
      cellCount: summary.cellCount + (stroke.topology === "topology" ? stroke.cells.length : 0),
      circularStrokeCount: summary.circularStrokeCount + (stroke.topology === "circular" ? 1 : 0)
    }),
    { strokeCount: 0, cellCount: 0, circularStrokeCount: 0 }
  );
}

function sanitizeMode(mode: DaytimeMaskStrokeMode): DaytimeMaskStrokeMode {
  return daytimeMaskStrokeModes.includes(mode) ? mode : "paint";
}

function sanitizeRadius(radius: number): number {
  return Number.isFinite(radius) && radius > 0 ? Math.max(1, Math.min(5000, radius)) : 1;
}

function simplifyPoints(points: readonly WorldPoint[], minDistance: number): readonly WorldPoint[] {
  if (points.length <= 2) return points;
  const result: WorldPoint[] = [points[0]];
  for (const point of points.slice(1, -1)) {
    const previous = result[result.length - 1]!;
    if (Math.hypot(point.x - previous.x, point.y - previous.y) >= minDistance) result.push(point);
  }
  const last = points[points.length - 1]!;
  const previous = result[result.length - 1]!;
  if (Math.hypot(last.x - previous.x, last.y - previous.y) >= 1) result.push(last);
  return result;
}

function isGridCell(value: GridCell): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.size) && value.size > 0;
}

function isWorldPoint(value: WorldPoint): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

function assertId(id: string): void {
  if (id.trim() === "") throw new Error("Daytime mask stroke needs an id.");
}
