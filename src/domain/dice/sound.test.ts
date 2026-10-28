import { describe, expect, it } from "vitest";
import { defaultDiceDraft, expandDice, type D20Mode, type DicePresentation, type DiceGroup } from "./dice";
import { DICE_SOUND_GAP_MS, MAX_DICE_SOUND_CUES, planDiceSounds } from "./sound";

function presentation(dice: DiceGroup["dice"] = { d6: 1 }, d20: D20Mode | null = null, heights = [3, .7, 1, .8, .6, .8, .6, .8]): DicePresentation {
  const draft = { ...defaultDiceDraft(), includeD20: d20 !== null, groups: [{ id: "g", damageType: "none" as const, dice }] };
  const pieces = expandDice({ requestId: "r", contextToken: "c", draft, d20 });
  return { rollId: "r", contextToken: "c", sceneId: "s", mapId: "m", dice: pieces, appearance: draft.appearance,
    replay: { frames: heights.flatMap(z => pieces.flatMap(() => [0, 0, z, 0, 0, 0, 1])), frameCount: heights.length, stepMs: 100, durationMs: (heights.length - 1) * 100 },
    result: null, startedAt: 0, settledAt: (heights.length - 1) * 100 };
}

describe("dice sound planning", () => {
  it.each([{ d6: 1 }, { d4: 1 }, { d12: 1 }])("uses single-die recordings for %o", dice => {
    expect(planDiceSounds(presentation(dice)).family).toBe("single");
  });
  it.each([{ d6: 2 }, { "d%": 1 }, { d4: 1, d8: 1 }, { d6: 24 }])("uses multiple-dice recordings for physical pieces %o", dice => {
    expect(planDiceSounds(presentation(dice)).family).toBe("multiple");
  });
  it.each(["normal", "advantage", "disadvantage"] as const)("counts only the physical check dice for %s", mode => {
    expect(planDiceSounds(presentation({ d6: 24 }, mode)).family).toBe(mode === "normal" ? "single" : "multiple");
  });
  it("follows near-table bounces, never launch, airborne movement or resting dice", () => {
    const plan = planDiceSounds(presentation());
    expect(plan.cues.map(cue => cue.atMs)).toEqual([100, 600]);
    expect(planDiceSounds(presentation({ d6: 1 }, null, [4, 2, 3, 2, 4])).cues).toEqual([]);
    expect(planDiceSounds(presentation({ d6: 1 }, null, [.6, .6, .6, .6])).cues).toEqual([]);
  });
  it("is deterministic, bounded, and never creates a separate voice for each die", () => {
    const many = presentation({ d6: 24 }, null, Array.from({ length: 400 }, (_, i) => i % 2 ? .7 : 2));
    const plan = planDiceSounds(many), single = planDiceSounds(presentation({ d6: 1 }, null, Array.from({ length: 400 }, (_, i) => i % 2 ? .7 : 2)));
    expect(plan).toEqual(planDiceSounds(many));
    expect(plan.cues).toHaveLength(MAX_DICE_SOUND_CUES);
    expect(plan.cues.map(cue => cue.atMs)).toEqual(single.cues.map(cue => cue.atMs));
    for (const [i, cue] of plan.cues.entries()) {
      expect(cue.atMs).toBeLessThan(many.replay!.durationMs);
      if (i > 0) expect(cue.atMs - plan.cues[i - 1].atMs).toBeGreaterThanOrEqual(DICE_SOUND_GAP_MS);
      expect(cue.gain).toBeGreaterThan(0); expect(cue.gain).toBeLessThanOrEqual(.55);
      expect(cue.variant).toBeGreaterThanOrEqual(0); expect(cue.variant).toBeLessThan(3);
      expect(cue.rate).toBeGreaterThanOrEqual(.96); expect(cue.rate).toBeLessThan(1.04);
    }
  });
  it("ignores static, missing and malformed replays", () => {
    const value = presentation();
    expect(planDiceSounds({ ...value, replay: null }).cues).toEqual([]);
    expect(planDiceSounds({ ...value, dice: [] }).cues).toEqual([]);
    expect(planDiceSounds({ ...value, replay: { ...value.replay!, frames: [] } }).cues).toEqual([]);
    expect(planDiceSounds({ ...value, replay: { ...value.replay!, stepMs: 0 } }).cues).toEqual([]);
  });
});
