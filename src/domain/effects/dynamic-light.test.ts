import { describe, expect, it } from "vitest";
import {
  cloneDynamicLightEffect,
  createDynamicLightEffect,
  createDynamicLightSavePayload,
  updateDynamicLightEffect
} from "./dynamic-light";

describe("dynamic light effects", () => {
  it("creates a warm animated light with safe defaults", () => {
    expect(createDynamicLightEffect("dynamic-light-1", { x: 20, y: 40 })).toEqual({
      id: "dynamic-light-1",
      kind: "dynamic-light",
      position: { x: 20, y: 40 },
      brightRadiusCells: 2,
      dimRadiusCells: 4,
      apertureDegrees: 360,
      direction: 0,
      color: "#ff9f43",
      intensity: 0.9,
      opacity: 0.85,
      flicker: 0.55,
      speed: 1,
      visible: true
    });
  });

  it("clones every visual property with a new identity and position", () => {
    const source = updateDynamicLightEffect(
      createDynamicLightEffect("dynamic-light-1", { x: 20, y: 40 }),
      {
        brightRadiusCells: 3,
        dimRadiusCells: 7,
        apertureDegrees: 120,
        direction: 215,
        color: "#22aaff",
        intensity: 0.6,
        opacity: 0.7,
        flicker: 0.2,
        speed: 2.5,
        visible: false
      }
    );

    expect(cloneDynamicLightEffect(source, "dynamic-light-2", { x: 180, y: 240 })).toEqual({
      ...source,
      id: "dynamic-light-2",
      position: { x: 180, y: 240 }
    });
  });

  it("sanitizes editable animation values", () => {
    const effect = createDynamicLightEffect("dynamic-light-1", { x: 0, y: 0 });
    const updated = updateDynamicLightEffect(effect, {
      brightRadiusCells: 3,
      dimRadiusCells: 1,
      color: "#ABCDEF",
      intensity: 4,
      opacity: -1,
      flicker: 2,
      speed: 20,
      apertureDegrees: 720,
      direction: -90
    });

    expect(updated).toMatchObject({
      brightRadiusCells: 3,
      dimRadiusCells: 3,
      color: "#abcdef",
      intensity: 1,
      opacity: 0,
      flicker: 1,
      speed: 4,
      apertureDegrees: 360,
      direction: 270
    });
  });

  it("supports full, half and custom directional apertures", () => {
    const effect = createDynamicLightEffect("dynamic-light-1", { x: 0, y: 0 });

    expect(updateDynamicLightEffect(effect, { apertureDegrees: 180, direction: 45 })).toMatchObject({
      apertureDegrees: 180,
      direction: 45
    });
    expect(updateDynamicLightEffect(effect, { apertureDegrees: 90, direction: 450 })).toMatchObject({
      apertureDegrees: 90,
      direction: 90
    });
  });

  it("adds the legacy world radius only to the IPC save payload", () => {
    const effect = createDynamicLightEffect("dynamic-light-1", { x: 0, y: 0 });

    expect(createDynamicLightSavePayload(effect, 75)).toEqual({
      ...effect,
      radius: 300
    });
  });
});
