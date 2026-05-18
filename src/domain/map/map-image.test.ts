import { describe, expect, it } from "vitest";
import { createMapImageState, isSupportedMapImageExtension } from "./map-image";

describe("map image rules", () => {
  it("accepts expected image extensions", () => {
    expect(isSupportedMapImageExtension("png")).toBe(true);
    expect(isSupportedMapImageExtension("jpg")).toBe(true);
    expect(isSupportedMapImageExtension("jpeg")).toBe(true);
    expect(isSupportedMapImageExtension("webp")).toBe(true);
    expect(isSupportedMapImageExtension("heic")).toBe(true);
    expect(isSupportedMapImageExtension("gif")).toBe(false);
  });

  it("creates centered map image state", () => {
    expect(createMapImageState("/map.png", "map-asset:///map.png")).toEqual({
      imagePath: "/map.png",
      imageUrl: "map-asset:///map.png",
      position: { x: 0, y: 0 },
      scale: 1
    });
  });
});
