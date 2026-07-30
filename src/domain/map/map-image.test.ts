import { describe, expect, it } from "vitest";
import {
  MAP_SCALE_DEFAULT,
  MAP_SCALE_MAX,
  MAP_SCALE_MIN,
  createMapImageState,
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
    expect(sanitizeMapScale(1.237)).toBe(1.24);
    expect(sanitizeMapScale(0.1)).toBe(MAP_SCALE_MIN);
    expect(sanitizeMapScale(8)).toBe(MAP_SCALE_MAX);
    expect(sanitizeMapScale(Number.NaN)).toBe(MAP_SCALE_DEFAULT);
  });
});
