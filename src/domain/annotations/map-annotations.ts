import type { SceneDocument } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export const INFORMATION_AREA_HIGHLIGHT_DURATION_MS = 5_000 as const;
export const TERRAIN_INFORMATION_AREA_COLOR = "#6b7d32";
export const TRAP_INFORMATION_AREA_COLOR = "#b3262e";

export type InformationAreaType = "terrain" | "trap";

export interface MapInformationPin {
  readonly id: string;
  readonly kind: "room-pin";
  readonly position: WorldPoint;
  readonly title: string;
  readonly content: string;
  readonly locked: boolean;
}

export interface InformationAreaCell {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface MapInformationArea {
  readonly id: string;
  readonly kind: "information-area";
  readonly areaType: InformationAreaType;
  readonly name: string;
  readonly description: string;
  readonly cells: readonly InformationAreaCell[];
  readonly locked: boolean;
}

export type MapAnnotation = MapInformationPin | MapInformationArea;

export interface MapAnnotations {
  readonly pins: readonly MapInformationPin[];
  readonly areas: readonly MapInformationArea[];
}

export interface InformationAreaHighlightBroadcast {
  readonly id: string;
  readonly areaId: string;
  readonly areaType: InformationAreaType;
  readonly cells: readonly InformationAreaCell[];
  readonly durationMs: typeof INFORMATION_AREA_HIGHLIGHT_DURATION_MS;
}

export function createDefaultMapAnnotations(): MapAnnotations {
  return { pins: [], areas: [] };
}

export function getInformationAreaColor(type: InformationAreaType): string {
  return type === "terrain" ? TERRAIN_INFORMATION_AREA_COLOR : TRAP_INFORMATION_AREA_COLOR;
}

export function deduplicateInformationAreaCells(
  cells: readonly InformationAreaCell[]
): readonly InformationAreaCell[] {
  const uniqueCells = new Map<string, InformationAreaCell>();

  for (const cell of cells) {
    if (!isFiniteCell(cell)) continue;
    uniqueCells.set(getInformationAreaCellKey(cell), cell);
  }

  return [...uniqueCells.values()];
}

export function rasterizeInformationAreaStroke(
  points: readonly WorldPoint[],
  cellSizeWorld: number
): readonly InformationAreaCell[] {
  if (!Number.isFinite(cellSizeWorld) || cellSizeWorld <= 0 || points.length === 0) {
    return [];
  }

  const cells: InformationAreaCell[] = [];
  const addPoint = (point: WorldPoint): void => {
    if (!isFinitePoint(point)) return;
    const column = Math.floor(point.x / cellSizeWorld);
    const row = Math.floor(point.y / cellSizeWorld);
    cells.push({
      x: column * cellSizeWorld,
      y: row * cellSizeWorld,
      size: cellSizeWorld
    });
  };

  const firstPoint = points[0];
  if (firstPoint !== undefined) addPoint(firstPoint);

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined || !isFinitePoint(from) || !isFinitePoint(to)) continue;

    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / (cellSizeWorld * 0.35)));

    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      addPoint({
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      });
    }
  }

  return deduplicateInformationAreaCells(cells);
}

export function translateInformationArea(
  area: MapInformationArea,
  delta: WorldPoint
): MapInformationArea {
  if (!isFinitePoint(delta) || (delta.x === 0 && delta.y === 0)) return area;

  return {
    ...area,
    cells: area.cells.map((cell) => ({
      ...cell,
      x: cell.x + delta.x,
      y: cell.y + delta.y
    }))
  };
}

export function getMapAnnotationCenter(annotation: MapAnnotation): WorldPoint {
  if (annotation.kind === "room-pin") return annotation.position;
  if (annotation.cells.length === 0) return { x: 0, y: 0 };

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const cell of annotation.cells) {
    left = Math.min(left, cell.x);
    right = Math.max(right, cell.x + cell.size);
    top = Math.min(top, cell.y);
    bottom = Math.max(bottom, cell.y + cell.size);
  }

  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

export function searchMapAnnotations(
  annotations: MapAnnotations,
  query: string
): readonly MapAnnotation[] {
  const normalizedQuery = normalizeSearchText(query);
  const allAnnotations: readonly MapAnnotation[] = [...annotations.pins, ...annotations.areas];

  if (normalizedQuery === "") return allAnnotations;

  return allAnnotations.filter((annotation) => {
    const searchable =
      annotation.kind === "room-pin"
        ? [annotation.title, "habitacion", annotation.content]
        : [
            annotation.name,
            annotation.areaType === "terrain" ? "terreno" : "trampa",
            annotation.description
          ];

    return searchable.some((value) => normalizeSearchText(value).includes(normalizedQuery));
  });
}

export function canTransformMapAnnotation(annotation: MapAnnotation): boolean {
  return !annotation.locked;
}

export function canDeleteMapAnnotation(annotation: MapAnnotation): boolean {
  return !annotation.locked;
}

export function createInformationAreaHighlightBroadcast(
  area: MapInformationArea,
  id = `information-area-highlight-${Date.now()}`
): InformationAreaHighlightBroadcast {
  return {
    id,
    areaId: area.id,
    areaType: area.areaType,
    cells: area.cells.map((cell) => ({ ...cell })),
    durationMs: INFORMATION_AREA_HIGHLIGHT_DURATION_MS
  };
}

export function stripPrivateMapAnnotationsForPlayer(scene: SceneDocument): SceneDocument {
  return {
    ...scene,
    mapAnnotations: createDefaultMapAnnotations()
  };
}

export function isInformationAreaHighlightBroadcast(
  value: unknown
): value is InformationAreaHighlightBroadcast {
  return sanitizeInformationAreaHighlightBroadcast(value) !== null;
}

export function sanitizeInformationAreaHighlightBroadcast(
  value: unknown
): InformationAreaHighlightBroadcast | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<InformationAreaHighlightBroadcast>;

  if (
    typeof candidate.id !== "string" ||
    candidate.id.trim() === "" ||
    typeof candidate.areaId !== "string" ||
    candidate.areaId.trim() === "" ||
    (candidate.areaType !== "terrain" && candidate.areaType !== "trap") ||
    candidate.durationMs !== INFORMATION_AREA_HIGHLIGHT_DURATION_MS ||
    !Array.isArray(candidate.cells) ||
    candidate.cells.length === 0 ||
    !candidate.cells.every(isFiniteCell)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    areaId: candidate.areaId,
    areaType: candidate.areaType,
    cells: candidate.cells.map((cell) => ({ x: cell.x, y: cell.y, size: cell.size })),
    durationMs: INFORMATION_AREA_HIGHLIGHT_DURATION_MS
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function getInformationAreaCellKey(cell: InformationAreaCell): string {
  return `${cell.x}:${cell.y}:${cell.size}`;
}

function isFinitePoint(point: WorldPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isFiniteCell(value: unknown): value is InformationAreaCell {
  if (typeof value !== "object" || value === null) return false;
  const cell = value as Partial<InformationAreaCell>;
  return (
    typeof cell.x === "number" &&
    Number.isFinite(cell.x) &&
    typeof cell.y === "number" &&
    Number.isFinite(cell.y) &&
    typeof cell.size === "number" &&
    Number.isFinite(cell.size) &&
    cell.size > 0
  );
}
