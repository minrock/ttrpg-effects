import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPASS_ORIENTATION,
  getCompassLabel,
  getPlayerViewRotationDegrees,
  isCompassOrientation,
  normalizeCompassOrientation
} from "./compass-orientation";

describe("compass orientation", () => {
  it("accepts only cardinal quarter turns", () => {
    expect(isCompassOrientation(0)).toBe(true);
    expect(isCompassOrientation(90)).toBe(true);
    expect(isCompassOrientation(180)).toBe(true);
    expect(isCompassOrientation(270)).toBe(true);
    expect(isCompassOrientation(45)).toBe(false);
    expect(isCompassOrientation("90")).toBe(false);
  });

  it("normalizes invalid values to north up", () => {
    expect(normalizeCompassOrientation(undefined)).toBe(DEFAULT_COMPASS_ORIENTATION);
    expect(normalizeCompassOrientation(45)).toBe(DEFAULT_COMPASS_ORIENTATION);
    expect(normalizeCompassOrientation(90)).toBe(90);
  });

  it("labels and derives player rotations", () => {
    expect(getCompassLabel(0)).toBe("N");
    expect(getCompassLabel(90)).toBe("E");
    expect(getCompassLabel(180)).toBe("S");
    expect(getCompassLabel(270)).toBe("O");
    expect(getPlayerViewRotationDegrees(90)).toBe(-90);
  });
});
