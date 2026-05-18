export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export function screenPoint(x: number, y: number): ScreenPoint {
  return { x, y };
}

export function worldPoint(x: number, y: number): WorldPoint {
  return { x, y };
}
