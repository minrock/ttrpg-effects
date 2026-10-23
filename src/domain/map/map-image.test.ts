import { describe, expect, it } from "vitest";
import {
  MAP_SCALE_DEFAULT,
  MAP_SCALE_MAX,
  MAP_SCALE_MIN,
  createMapImageState,
  isMapImageDimensions,
  isSupportedMapImageExtension,
  sanitizeMapScale
} from "./map-image";

describe("map image rules", () => {
  it("accepts expected image extensions", () => {
    expect(isSupportedMapImageExtension("png")).toBe(true);
    expect(isSupportedMapImageExtension("jpg")).toBe(true);
    expect(isSupportedMapImageExtension("jpeg")).toBe(true);
    expect(isSupportedMapImageExtension("webp")).toBe(true);
    expect(isSupportedMapImageExtension("heic")).toBe(true);
    expect(isSupportedMapImageExtension("gif")).toBe(false);
  });

  it("creates map image state at 100 percent scale", () => {
    expect(createMapImageState("/maps/dungeon.png", "map-asset://dungeon.png").scale).toBe(MAP_SCALE_DEFAULT);
  });

  it("sanitizes map scale percent values", () => {
    expect(sanitizeMapScale(1.237)).toBe(1.237);
    expect(sanitizeMapScale(2 / 3)).toBe(2 / 3);
    expect(sanitizeMapScale(0.1)).toBe(MAP_SCALE_MIN);
    expect(sanitizeMapScale(8)).toBe(MAP_SCALE_MAX);
    expect(sanitizeMapScale(Number.NaN)).toBe(MAP_SCALE_DEFAULT);
  });

  it("validates decoded image dimensions", () => {
    expect(isMapImageDimensions({ width: 2000, height: 1000 })).toBe(true);
    for (const invalid of [undefined, null, {}, { width: 0, height: 1 }, { width: 1, height: -1 },
      { width: 1.5, height: 1 }, { width: Infinity, height: 1 }, { width: 1, height: NaN },
      { width: "2000", height: 1000 }, { width: Number.MAX_SAFE_INTEGER + 1, height: 1 }]) {
      expect(isMapImageDimensions(invalid)).toBe(false);
    }
  });
});
