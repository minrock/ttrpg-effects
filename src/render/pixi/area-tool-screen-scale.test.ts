import { describe, expect, it } from "vitest";
import { getAreaToolUiScale } from "./area-tool-screen-scale";

describe("getAreaToolUiScale", () => {
  it("keeps the existing world size at 100% zoom or closer", () => {
    expect(getAreaToolUiScale(1)).toBe(1);
    expect(getAreaToolUiScale(2)).toBe(1);
  });

  it("compensates zoom-out so editor chrome remains screen-readable", () => {
    expect(getAreaToolUiScale(0.5)).toBe(2);
    expect(getAreaToolUiScale(0.25)).toBe(4);
  });

  it("guards against invalid zero zoom values", () => {
    expect(getAreaToolUiScale(0)).toBe(1000);
  });
});
