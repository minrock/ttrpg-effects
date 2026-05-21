export const arcanePointerCreatureSizes = [
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan"
] as const;

export type ArcanePointerCreatureSize = (typeof arcanePointerCreatureSizes)[number];

export interface ArcanePointerSizeOption {
  readonly value: ArcanePointerCreatureSize;
  readonly label: string;
  readonly footprintCells: number;
}

export const arcanePointerSizeOptions: readonly ArcanePointerSizeOption[] = [
  { value: "tiny", label: "Diminuto", footprintCells: 1 },
  { value: "small", label: "Pequeno", footprintCells: 1 },
  { value: "medium", label: "Mediano", footprintCells: 1 },
  { value: "large", label: "Grande", footprintCells: 2 },
  { value: "huge", label: "Enorme", footprintCells: 3 },
  { value: "gargantuan", label: "Gargantuesco", footprintCells: 4 }
];

const DEFAULT_CELL_SIZE_WORLD = 100;
const POINTER_DIAMETER_MULTIPLIER = 1.55;

export function getArcanePointerFootprintCells(size: ArcanePointerCreatureSize): number {
  return arcanePointerSizeOptions.find((option) => option.value === size)?.footprintCells ?? 1;
}

export function getArcanePointerDiameterWorld(
  size: ArcanePointerCreatureSize,
  cellSizeWorld: number
): number {
  const safeCellSize = Number.isFinite(cellSizeWorld) && cellSizeWorld > 0
    ? cellSizeWorld
    : DEFAULT_CELL_SIZE_WORLD;

  return getArcanePointerFootprintCells(size) * safeCellSize * POINTER_DIAMETER_MULTIPLIER;
}

export function getArcanePointerAlpha(progress: number): number {
  if (progress <= 0 || progress >= 1) {
    return 0;
  }

  if (progress < 0.18) {
    return progress / 0.18;
  }

  if (progress < 0.68) {
    return 1;
  }

  return Math.max(0, (1 - progress) / 0.32);
}
