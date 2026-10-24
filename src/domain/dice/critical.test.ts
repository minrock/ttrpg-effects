import { describe, expect, it } from "vitest";
import { CRITICAL_CELEBRATION_MS, criticalIsActive, naturalTwenty } from "./critical";
import { defaultDiceDraft, expandDice, resolveDiceRoll, type D20Mode, type DicePresentation, type DiceRollRequest } from "./dice";

describe("natural twenty celebration", () => {
  it.each([
    ["normal", [20], -4, "check:0"], ["normal", [17], 3, null],
    ["advantage", [4, 20], 2, "check:1"], ["disadvantage", [20, 4], 16, null],
    ["advantage", [20, 20], 0, "check:0"], ["disadvantage", [20, 20], 0, "check:0"]
  ] as const)("uses the kept natural face for %s %s (%s modifier)", (mode, faces, modifier, expected) => {
    const request: DiceRollRequest = { requestId: "r", contextToken: "c", d20: mode as D20Mode, draft: { ...defaultDiceDraft(), includeD20: true, d20Modifier: modifier } };
    const dice = expandDice(request), result = resolveDiceRoll(request, dice.map((die, index) => ({ id: die.id, value: faces[index] })));
    expect(naturalTwenty(dice, result)?.dieId ?? null).toBe(expected);
  });
  it("does not celebrate damage totaling twenty", () => {
    expect(naturalTwenty([], { groups: [], poolTotal: 20, d20: null })).toBeNull();
  });
  it("uses the shared settlement clock without restarting for late views or a summary toggle", () => {
    const presentation: DicePresentation = { rollId: "r", contextToken: "c", sceneId: "s", mapId: "m", dice: [], appearance: { color: "multi", material: "resin" }, replay: { frameCount: 2, stepMs: 1, durationMs: 1, frames: [] }, result: null, critical: { dieId: "check:0" }, startedAt: 999, settledAt: 1000 };
    expect(criticalIsActive(presentation, 999)).toBe(false);
    expect(criticalIsActive(presentation, 1000)).toBe(true);
    expect(criticalIsActive({ ...presentation, result: null }, 2500)).toBe(true);
    expect(criticalIsActive(presentation, 1000 + CRITICAL_CELEBRATION_MS)).toBe(false);
    expect(criticalIsActive({ ...presentation, replay: null }, 1500)).toBe(false);
    expect(criticalIsActive(null, 1500)).toBe(false);
  });
});
