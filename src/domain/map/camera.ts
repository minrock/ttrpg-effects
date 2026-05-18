import type { ScreenPoint, ViewportSize, WorldPoint } from "../shared/coordinates";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export interface CameraState {
  readonly center: WorldPoint;
  readonly zoom: number;
}

export interface PanDelta {
  readonly x: number;
  readonly y: number;
}

export function createCameraState(center: WorldPoint = { x: 0, y: 0 }, zoom = 1): CameraState {
  return {
    center,
    zoom: clampZoom(zoom)
  };
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    return 1;
  }

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function screenToWorld(
  screen: ScreenPoint,
  camera: CameraState,
  viewport: ViewportSize
): WorldPoint {
  return {
    x: camera.center.x + (screen.x - viewport.width / 2) / camera.zoom,
    y: camera.center.y + (screen.y - viewport.height / 2) / camera.zoom
  };
}

export function worldToScreen(
  world: WorldPoint,
  camera: CameraState,
  viewport: ViewportSize
): ScreenPoint {
  return {
    x: (world.x - camera.center.x) * camera.zoom + viewport.width / 2,
    y: (world.y - camera.center.y) * camera.zoom + viewport.height / 2
  };
}

export function panCamera(camera: CameraState, delta: PanDelta): CameraState {
  return {
    ...camera,
    center: {
      x: camera.center.x - delta.x / camera.zoom,
      y: camera.center.y - delta.y / camera.zoom
    }
  };
}

export function zoomCameraAtScreenPoint(
  camera: CameraState,
  viewport: ViewportSize,
  anchor: ScreenPoint,
  requestedZoom: number
): CameraState {
  const nextZoom = clampZoom(requestedZoom);
  const anchoredWorldPoint = screenToWorld(anchor, camera, viewport);

  return {
    center: {
      x: anchoredWorldPoint.x - (anchor.x - viewport.width / 2) / nextZoom,
      y: anchoredWorldPoint.y - (anchor.y - viewport.height / 2) / nextZoom
    },
    zoom: nextZoom
  };
}
