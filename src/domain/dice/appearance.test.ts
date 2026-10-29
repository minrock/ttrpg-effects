import { describe, expect, it } from "vitest";
import { DAMAGE_COLORS, physicalDieColor } from "./appearance";
import { DAMAGE_TYPES, defaultDiceDraft, expandDice, type DiceRollRequest } from "./dice";

describe("damage color identity", () => {
  const request: DiceRollRequest = { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), appearance: { color: "blue", material: "metal" }, groups: DAMAGE_TYPES.map(type => ({ id: type, damageType: type, dice: { d6: 1, "d%": 1 } })) }, d20: null };
  it("uses the same color for all pieces of a damage type, including percentiles", () => {
    for (const die of expandDice(request).filter(d => d.damageType !== "none")) expect(physicalDieColor(die, request.draft.appearance)).toBe(DAMAGE_COLORS[die.damageType]);
    expect(new Set(Object.values(DAMAGE_COLORS)).size).toBe(DAMAGE_TYPES.length);
  });
  it("reserves manual color for untyped dice and d20 checks", () => {
    for (const die of expandDice(request).filter(d => d.damageType === "none")) expect(physicalDieColor(die, request.draft.appearance)).toBe("#397fba");
    const checks = expandDice({ ...request, d20: "advantage", draft: { ...request.draft, includeD20: true } });
    expect(checks).toHaveLength(2);
    for (const die of checks) expect(physicalDieColor(die, request.draft.appearance)).toBe("#397fba");
  });
});
