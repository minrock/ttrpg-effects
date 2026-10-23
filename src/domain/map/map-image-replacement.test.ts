import { describe, expect, it } from "vitest";
import { computeReplacementScale, type MapImageReplacementPolicy } from "./map-image-replacement";

const previous = { scale: 1, imageSize: { width: 2000, height: 1000 } };

describe("replacement image geometry", () => {
  it("preserves both world dimensions and reverses a resolution change", () => {
    const imageSize = { width: 3000, height: 1500 };
    const scale = computeReplacementScale(previous, imageSize, "preserve-world-size");
    expect(scale).toBe(2 / 3);
    expect(imageSize.width * scale).toBe(2000);
    expect(imageSize.height * scale).toBe(1000);
    expect(computeReplacementScale({ scale, imageSize }, previous.imageSize, "preserve-world-size")).toBe(1);
  });

  it("retains the exact scale for identical dimensions", () => {
    const scale = 1.23789123456789;
    expect(computeReplacementScale({ ...previous, scale }, previous.imageSize, "preserve-world-size")).toBe(scale);
  });

  it("checks relative aspect tolerance in both directions", () => {
    const large = { scale: 1, imageSize: { width: 2_000_000, height: 1_000_000 } };
    expect(computeReplacementScale(large, { width: 2_000_001, height: 1_000_000 }, "preserve-world-size")).toBe(2_000_000 / 2_000_001);
    for (const width of [1_999_997, 2_000_003]) {
      expect(() => computeReplacementScale(large, { width, height: 1_000_000 }, "preserve-world-size")).toThrow("proporcion");
    }
    expect(() => computeReplacementScale(previous, { width: 2000, height: 1500 }, "preserve-world-size")).toThrow("proporcion");
  });

  it("accepts inclusive scale limits but rejects compensation beyond them", () => {
    expect(computeReplacementScale(previous, { width: 8000, height: 4000 }, "preserve-world-size")).toBe(0.25);
    expect(computeReplacementScale(previous, { width: 500, height: 250 }, "preserve-world-size")).toBe(4);
    for (const width of [400, 10_000]) {
      expect(() => computeReplacementScale(previous, { width, height: width / 2 }, "preserve-world-size")).toThrow("fuera");
    }
  });

  it("requires old dimensions only for world-size preservation", () => {
    expect(() => computeReplacementScale({ scale: 1.2345 }, previous.imageSize, "preserve-world-size")).toThrow("anteriores");
    expect(computeReplacementScale({ scale: 1.2345 }, { width: 50, height: 300 }, "keep-scale")).toBe(1.2345);
    expect(computeReplacementScale(previous, { width: 50, height: 300 }, "keep-scale")).toBe(1);
  });

  it.each(["keep-scale", "preserve-world-size"] as const)("validates dimensions and current scale for %s", (policy) => {
    for (const width of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => computeReplacementScale(previous, { width, height: 1000 }, policy)).toThrow("dimensiones");
      expect(() => computeReplacementScale(previous, { width: 2000, height: width }, policy)).toThrow("dimensiones");
    }
    for (const scale of [0, -1, 0.249999, 4.000001, NaN, Infinity]) {
      expect(() => computeReplacementScale({ ...previous, scale }, previous.imageSize, policy)).toThrow("escala actual");
    }
  });

  it("rejects an unknown policy without implicitly keeping scale", () => {
    expect(() => computeReplacementScale(previous, previous.imageSize, "other" as MapImageReplacementPolicy)).toThrow("politica");
  });
});
