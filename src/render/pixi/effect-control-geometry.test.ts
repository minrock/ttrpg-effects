import { describe, expect, it } from "vitest";
import { PixiViewport } from "./PixiViewport";
import { getFireResizeTarget } from "./effect-control-geometry";
import { createAnimatedFireEffect } from "../../domain/effects/fire";
import type { SceneLight } from "../../domain/sessions/scene-document";
import type { ScreenPoint } from "../../domain/shared/coordinates";

interface HitHarness {
  hitTestLightResizeHandle(point: ScreenPoint): string | null;
  hitTestConeRotationHandle(point: ScreenPoint): string | null;
}

describe("effect controls at different zooms", () => {
  for (const zoom of [0.1, 0.25, 0.5, 1, 2]) {
    it(`keeps light handles clickable at zoom ${zoom}`, () => {
      const light: SceneLight = { id: "light-1", kind: "cone", position: { x: 0, y: 0 }, radius: 300, color: "#ffffff", intensity: 1, opacity: 1, angle: 60, direction: 0, visible: true, snapToGrid: false };
      const viewport = Object.assign(Object.create(PixiViewport.prototype) as HitHarness, {
        lights: [light], selectedElementId: light.id, camera: { center: { x: 0, y: 0 }, zoom }, app: { renderer: { width: 1000, height: 800 } }
      });
      const scale = Math.max(1, 1 / zoom);
      expect(viewport.hitTestLightResizeHandle({ x: 500 + light.radius * zoom, y: 400 + 14 * scale * zoom })).toBe(light.id);
      expect(viewport.hitTestLightResizeHandle({ x: 500 + light.radius * zoom, y: 400 + 25 * scale * zoom })).toBeNull();
      expect(viewport.hitTestConeRotationHandle({ x: 500 + 72 * scale * zoom, y: 400 })).toBe(light.id);
    });
    it(`distinguishes fire and light handles even at equal radii, zoom ${zoom}`, () => {
      const fire = { ...createAnimatedFireEffect("fire", { x: 10, y: 20 }), lightRadius: 90 };
      expect(getFireResizeTarget(fire, { x: 100, y: 20 }, zoom)).toBe("fire");
      expect(getFireResizeTarget(fire, { x: 10, y: -70 }, zoom)).toBe("light");
    });
  }
});
