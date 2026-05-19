import type { SceneGrid, SceneToken } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";

export const tokenSizes = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;

export type TokenSize = (typeof tokenSizes)[number];
export type TokenFootprintCells = 1 | 2 | 3 | 4;

export const tokenSizeLabels: Record<TokenSize, string> = {
  tiny: "Diminuto",
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  huge: "Enorme",
  gargantuan: "Gargantuesco"
};

export function getTokenFootprintCells(size: TokenSize): TokenFootprintCells {
  switch (size) {
    case "tiny":
    case "small":
    case "medium":
      return 1;
    case "large":
      return 2;
    case "huge":
      return 3;
    case "gargantuan":
      return 4;
  }
}

export function createSceneToken(params: {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly imagePath: string;
  readonly position: WorldPoint;
  readonly size: TokenSize;
  readonly selectionColor?: string;
  readonly tokens: readonly SceneToken[];
}): SceneToken {
  return {
    id: params.id,
    name: params.name.trim() || "Token",
    type: params.type.trim() || params.name.trim() || "Token",
    imagePath: params.imagePath,
    position: params.position,
    size: params.size,
    footprintCells: getTokenFootprintCells(params.size),
    selectionColor: params.selectionColor ?? "#fff0a8",
    badgeNumber: getNextTokenBadgeNumber(params.tokens, params.name.trim() || "Token"),
    order: getNextTokenOrder(params.tokens),
    visible: true
  };
}

export function getNextTokenBadgeNumber(tokens: readonly SceneToken[], tokenName: string): number {
  const normalizedName = normalizeTokenName(tokenName);
  const sameNameBadges = tokens
    .filter((token) => normalizeTokenName(token.name) === normalizedName)
    .map((token) => token.badgeNumber)
    .filter((badge): badge is number => Number.isFinite(badge));

  if (sameNameBadges.length === 0) {
    return 1;
  }

  return Math.max(...sameNameBadges) + 1;
}

export function getNextTokenOrder(tokens: readonly SceneToken[]): number {
  if (tokens.length === 0) {
    return 1;
  }

  return Math.max(...tokens.map((token) => token.order)) + 1;
}

export function sortTokensByOrder(tokens: readonly SceneToken[]): readonly SceneToken[] {
  return [...tokens].sort((a, b) => a.order - b.order);
}

export function snapTokenToGrid(
  point: WorldPoint,
  grid: SceneGrid,
  footprintCells: TokenFootprintCells
): WorldPoint {
  const cellSize = grid.cellSizeWorld;
  const topLeftColumn = Math.floor(point.x / cellSize);
  const topLeftRow = Math.floor(point.y / cellSize);
  const offset = (footprintCells * cellSize) / 2;

  return {
    x: topLeftColumn * cellSize + offset,
    y: topLeftRow * cellSize + offset
  };
}

export function updateTokenSize(token: SceneToken, size: TokenSize): SceneToken {
  return {
    ...token,
    size,
    footprintCells: getTokenFootprintCells(size)
  };
}

function normalizeTokenName(tokenName: string): string {
  return tokenName.trim().toLocaleLowerCase();
}
