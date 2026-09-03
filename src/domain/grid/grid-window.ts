import type { CameraState } from "../map/camera";
import type { ViewportSize } from "../shared/coordinates";

export interface GridBounds { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
export interface GridWindow { readonly bounds: GridBounds; readonly step: number }
export const MAX_GRID_LINES = 2048;

export function getGridWindow(camera: CameraState, viewport: ViewportSize, cellSize: number): GridWindow {
  const halfWidth = viewport.width / Math.max(camera.zoom, 0.001) / 2;
  const halfHeight = viewport.height / Math.max(camera.zoom, 0.001) / 2;
  const bounds = {
    left: camera.center.x - halfWidth * 2,
    right: camera.center.x + halfWidth * 2,
    top: camera.center.y - halfHeight * 2,
    bottom: camera.center.y + halfHeight * 2
  };
  const span = Math.max(0, bounds.right - bounds.left) + Math.max(0, bounds.bottom - bounds.top);
  // At extreme zoom-out, show major grid lines instead of thousands of subpixels.
  const stride = 2 ** Math.ceil(Math.log2(Math.max(1, span / cellSize / (MAX_GRID_LINES - 4))));
  return { bounds, step: cellSize * stride };
}

export function gridWindowCoversView(window: GridWindow, camera: CameraState, viewport: ViewportSize): boolean {
  const halfWidth = viewport.width / Math.max(camera.zoom, 0.001) / 2;
  const halfHeight = viewport.height / Math.max(camera.zoom, 0.001) / 2;
  return window.bounds.left <= camera.center.x - halfWidth
    && window.bounds.right >= camera.center.x + halfWidth
    && window.bounds.top <= camera.center.y - halfHeight
    && window.bounds.bottom >= camera.center.y + halfHeight;
}
