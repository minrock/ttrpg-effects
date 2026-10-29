import { describe, expect, it } from "vitest";
import { composeFormulaDraft, parseDamageFormula } from "./formula";
import { changeGroupType, defaultDiceDraft, expandDice, groupFormula, requestSchema, resolveDiceRoll, setGroupComposition, updateGroupModifier } from "./dice";

describe("damage formula composition", () => {
  it.each([
    ["2d6 + 3d4 + 2", { d6: 2, d4: 3 }, 2],
    [" D8 + 3 - 1 ", { d8: 1 }, 2],
    ["2d6 + d6 - 2", { d6: 3 }, -2],
    ["d% + d100 + 1", { "d%": 2 }, 1],
    ["1d10+2d12+4", { d10: 1, d12: 2 }, 4],
    ["-2", {}, -2], ["0", {}, 0]
  ])("parses %s without rolling", (formula, dice, modifier) => {
    expect(parseDamageFormula(formula as string)).toEqual({ dice, modifier });
  });
  it.each(["", " ", "1d6+", "2d6oops", "1d6+alert(1)", "1d6*2", "1d6/2", "1d6^2", "(1d6)", "1d6-1d4", "1d20", "2d20kh1", "2d6!", "dF", "1d7", "0d6", "1.5d6", "1d6+1.5", "1d6+Infinity", "1d6;process.exit()", "999999999d6", "1d6+10000", "d6+9999+1", "25d6", "13d%", "1d6 1d4", "1d6".repeat(100)])("rejects unsupported or unsafe formula %s", formula => {
    expect(() => parseDamageFormula(formula)).toThrow();
  });
  it("keeps modifiers in group totals, formula and history data, separate from d20", () => {
    const draft = defaultDiceDraft();
    draft.groups = setGroupComposition([], "fire", parseDamageFormula("2d6 + 3d4 + 2"));
    draft.groups = setGroupComposition(draft.groups, "cold", parseDamageFormula("1d8 - 1"));
    draft.d20Modifier = 7;
    const request = requestSchema.parse({ requestId: "r", contextToken: "c", draft, d20: null });
    const dice = expandDice(request);
    const result = resolveDiceRoll(request, dice.map(die => ({ id: die.id, value: 2 })));
    expect(result.groups.map(g => [g.damageType, g.modifier, g.total])).toEqual([["fire", 2, 12], ["cold", -1, 1]]);
    expect(result.poolTotal).toBe(13); expect(result.d20).toBeNull();
    expect(result.groups[0].formula).toBe("3d4 + 2d6 + 2");
    expect(dice.filter(d => d.damageType === "fire")).toHaveLength(5);
  });
  it("roundtrips either mode and merges modifiers without losing stable IDs", () => {
    let groups = setGroupComposition([], "fire", parseDamageFormula("2d6 + 2"));
    groups = setGroupComposition(groups, "cold", parseDamageFormula("1d4 - 1"));
    groups = changeGroupType(groups, "cold", "fire");
    expect(parseDamageFormula(groupFormula(groups[0]))).toEqual({ dice: { d4: 1, d6: 2 }, modifier: 1 });
    expect(groups[0].id).toBe("fire");
    groups = changeGroupType(groups, "fire", "cold");
    groups = setGroupComposition(groups, "fire", parseDamageFormula("1d8 + 3"));
    expect(groups.map(g => g.id)).toEqual(["fire", "fire-1"]);
    expect(groups.map(g => g.damageType)).toEqual(["cold", "fire"]);
  });
  it("preserves a modifier with no dice and permits fixed damage alongside another roll", () => {
    const draft = defaultDiceDraft(); draft.groups = updateGroupModifier([], "fire", 2);
    expect(groupFormula(draft.groups[0])).toBe("2");
    expect(requestSchema.safeParse({ requestId: "r", contextToken: "c", draft, d20: null }).success).toBe(false);
    draft.groups = setGroupComposition(draft.groups, "cold", parseDamageFormula("1d4"));
    const request = requestSchema.parse({ requestId: "r", contextToken: "c", draft, d20: null });
    expect(resolveDiceRoll(request, [{ id: "cold:d4:0", value: 3 }])).toMatchObject({ poolTotal: 5, groups: [{ modifier: 2, total: 2, dice: [] }, { total: 3 }] });
    const check = requestSchema.parse({ ...request, draft: { ...draft, includeD20: true }, d20: "normal" });
    expect(resolveDiceRoll(check, [{ id: "check:0", value: 10 }])).toMatchObject({ poolTotal: 0, groups: [], d20: { total: 10 } });
  });
  it("enforces the combined physical limit and preserves errors for inactive groups", () => {
    const draft = defaultDiceDraft();
    const invalid = composeFormulaDraft(draft, { fire: "12d%", cold: "1d6" });
    expect(invalid.error).not.toBeNull();
    expect(composeFormulaDraft(draft, { fire: "12d%", cold: "" }).error).toBeNull();
    expect(composeFormulaDraft({ ...draft, includeD20: true }, { fire: "12d%" }).error).toBeNull();
    expect(composeFormulaDraft(draft, { fire: "1d6+", cold: "1d8" }).errors.fire).toBeTruthy();
  });
  it.each([1.5, NaN, Infinity, 10000, -10000])("rejects invalid manual modifier %s at the request boundary", modifier => {
    expect(requestSchema.safeParse({ requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), groups: [{ id: "f", damageType: "fire", dice: { d6: 1 }, modifier }] }, d20: null }).success).toBe(false);
  });
});
