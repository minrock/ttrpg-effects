import { describe, expect, it } from "vitest";
import {
  getArcanePointerAlpha,
  getArcanePointerDiameterWorld,
  getArcanePointerFootprintCells
} from "./arcane-pointer";

describe("arcane pointer", () => {
  it("maps creature sizes to square grid footprints", () => {
    expect(getArcanePointerFootprintCells("tiny")).toBe(1);
    expect(getArcanePointerFootprintCells("small")).toBe(1);
    expect(getArcanePointerFootprintCells("medium")).toBe(1);
    expect(getArcanePointerFootprintCells("large")).toBe(2);
    expect(getArcanePointerFootprintCells("huge")).toBe(3);
    expect(getArcanePointerFootprintCells("gargantuan")).toBe(4);
  });

  it("scales the animated circle from the active grid cell size", () => {
    expect(getArcanePointerDiameterWorld("medium", 100)).toBeCloseTo(155);
    expect(getArcanePointerDiameterWorld("gargantuan", 50)).toBeCloseTo(310);
  });

  it("fades in, holds, and fades out over normalized time", () => {
    expect(getArcanePointerAlpha(0)).toBe(0);
    expect(getArcanePointerAlpha(0.09)).toBeCloseTo(0.5);
    expect(getArcanePointerAlpha(0.3)).toBe(1);
    expect(getArcanePointerAlpha(0.84)).toBeCloseTo(0.5);
    expect(getArcanePointerAlpha(1)).toBe(0);
  });
});
