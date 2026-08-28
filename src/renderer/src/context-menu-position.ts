export interface ContextMenuPoint {
  readonly x: number;
  readonly y: number;
}

export interface ContextMenuSize {
  readonly width: number;
  readonly height: number;
}

export interface ContextMenuPosition {
  readonly left: number;
  readonly top: number;
  readonly opensUpward: boolean;
  readonly opensLeftward: boolean;
}

const DEFAULT_VIEWPORT_MARGIN = 8;
const DEFAULT_SUBMENU_WIDTH = 176;

export function resolveContextMenuPosition(
  anchor: ContextMenuPoint,
  menuSize: ContextMenuSize,
  viewportSize: ContextMenuSize,
  margin = DEFAULT_VIEWPORT_MARGIN
): ContextMenuPosition {
  const maximumLeft = Math.max(margin, viewportSize.width - menuSize.width - margin);
  const maximumTop = Math.max(margin, viewportSize.height - menuSize.height - margin);
  const opensUpward = anchor.y + menuSize.height + margin > viewportSize.height;
  const opensLeftward =
    anchor.x + menuSize.width + DEFAULT_SUBMENU_WIDTH + margin > viewportSize.width;

  return {
    left: clamp(anchor.x, margin, maximumLeft),
    top: clamp(opensUpward ? anchor.y - menuSize.height : anchor.y, margin, maximumTop),
    opensUpward,
    opensLeftward
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
