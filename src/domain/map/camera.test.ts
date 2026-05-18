import { describe, expect, it } from "vitest";
import {
  clampZoom,
  createCameraState,
  panCamera,
  screenToWorld,
  worldToScreen,
  zoomCameraAtScreenPoint
} from "./camera";

const viewport = { width: 1000, height: 800 };

describe("camera coordinate transforms", () => {
  it("converts between screen and world coordinates around the camera center", () => {
    const camera = createCameraState({ x: 100, y: 50 }, 2);

    expect(screenToWorld({ x: 500, y: 400 }, camera, viewport)).toEqual({ x: 100, y: 50 });
    expect(worldToScreen({ x: 150, y: 75 }, camera, viewport)).toEqual({ x: 600, y: 450 });
  });

  it("round-trips world coordinates through screen coordinates", () => {
    const camera = createCameraState({ x: -20, y: 30 }, 1.5);
    const world = { x: 220, y: -80 };

    const screen = worldToScreen(world, camera, viewport);
    expect(screenToWorld(screen, camera, viewport)).toEqual(world);
  });

  it("pans the camera opposite the pointer drag in world units", () => {
    const camera = createCameraState({ x: 0, y: 0 }, 2);

    expect(panCamera(camera, { x: 50, y: -30 })).toEqual({
      center: { x: -25, y: 15 },
      zoom: 2
    });
  });

  it("keeps the anchored world point under the cursor while zooming", () => {
    const camera = createCameraState({ x: 100, y: 50 }, 1);
    const anchor = { x: 750, y: 300 };
    const anchoredBefore = screenToWorld(anchor, camera, viewport);

    const nextCamera = zoomCameraAtScreenPoint(camera, viewport, anchor, 2);

    expect(screenToWorld(anchor, nextCamera, viewport)).toEqual(anchoredBefore);
    expect(nextCamera.zoom).toBe(2);
  });

  it("clamps invalid and extreme zoom values", () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(0.01)).toBe(0.25);
    expect(clampZoom(99)).toBe(4);
  });
});
