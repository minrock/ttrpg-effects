const MIN_CAMERA_ZOOM = 0.001;

/**
 * Keeps editor chrome at least as large as it is at 100% zoom while leaving
 * the underlying world-space geometry untouched.
 */
export function getAreaToolUiScale(cameraZoom: number): number {
  return Math.max(1, 1 / Math.max(cameraZoom, MIN_CAMERA_ZOOM));
}
