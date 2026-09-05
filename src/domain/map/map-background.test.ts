import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_BACKGROUND_COLOR,
  isMapBackgroundColor,
  normalizeMapBackgroundColor
} from "./map-background";

describe("map background color", () => {
  it("accepts six-digit hex colors", () => {
    expect(isMapBackgroundColor("#15181a")).toBe(true);
    expect(isMapBackgroundColor("#AABBCC")).toBe(true);
    expect(isMapBackgroundColor("15181a")).toBe(false);
    expect(isMapBackgroundColor("#abc")).toBe(false);
    expect(isMapBackgroundColor("#12345g")).toBe(false);
  });

  it("keeps a normalized lower-case default", () => {
    expect(DEFAULT_MAP_BACKGROUND_COLOR).toBe("#15181a");
    expect(normalizeMapBackgroundColor("#AABBCC")).toBe("#aabbcc");
  });
});
