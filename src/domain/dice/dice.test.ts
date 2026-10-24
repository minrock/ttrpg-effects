import { describe, expect, it } from "vitest";
import { changeGroupType, countPhysicalDice, defaultDiceDraft, draftSchema, expandDice, requestSchema, resolveDiceRoll, updateGroupQuantity, validateSimulation, type D20Mode, type DiceRollRequest } from "./dice";

const request = (d20: D20Mode | null = null): DiceRollRequest => ({ requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), includeD20: d20 !== null, groups: [{ id: "fire", damageType: "fire", dice: { d6: 2 } }, { id: "cold", damageType: "cold", dice: { d8: 1 } }] }, d20 });
describe("dice arithmetic and composition", () => {
  it.each(["normal", "advantage", "disadvantage"] as const)("rolls only %s d20 and applies its modifier after choosing the face", mode => {
    for (const modifier of [-7, 0, 4]) {
      const req = request(mode); req.draft.d20Modifier = modifier; req.draft.groups[0].modifier = 99;
      const dice = expandDice(req), rolls = [5, 17];
      expect(dice).toHaveLength(mode === "normal" ? 1 : 2);
      expect(dice.every(die => die.role === "check" && die.type === "d20")).toBe(true);
      const result = resolveDiceRoll(req, dice.map((die, i) => ({ id: die.id, value: rolls[i] })));
      expect(result.groups).toEqual([]); expect(result.poolTotal).toBe(0);
      const value = mode === "advantage" ? 17 : 5;
      expect(result.d20).toMatchObject({ value, modifier, total: value + modifier });
      expect(req.draft.groups[0].modifier).toBe(99);
    }
  });
  it("restores prepared damage without the d20 modifier when the check is disabled", () => {
    const req = request(); req.draft.d20Modifier = 9; req.draft.groups[0].modifier = 2;
    const dice = expandDice(req);
    expect(dice.every(die => die.role === "pool")).toBe(true);
    const result = resolveDiceRoll(req, dice.map(die => ({ id: die.id, value: 4 })));
    expect(result.groups.map(g => g.total)).toEqual([10, 4]);
    expect(result.poolTotal).toBe(14); expect(result.d20).toBeNull();
  });
  it("breaks a tied d20 pair by stable index", () => {
    const req = request("advantage");
    expect(resolveDiceRoll(req, expandDice(req).map(d => ({ id: d.id, value: 4 }))).d20?.selected).toBe(0);
  });
  it.each([[100, 10, 100], [100, 7, 7], [90, 10, 90], [60, 4, 64]])("pairs percentile %s + %s", (tens, units, expected) => {
    const req: DiceRollRequest = { ...request(), draft: { ...defaultDiceDraft(), groups: [{ id: "g", damageType: "none", dice: { "d%": 2, d10: 1 } }] } };
    const dice = expandDice(req), values = dice.map(d => ({ id: d.id, value: d.role === "tens" ? tens : d.role === "units" ? units : 10 })).reverse();
    const result = resolveDiceRoll(req, values);
    expect(result.groups[0].dice.map(d => d.value)).toEqual([10, expected, expected]);
    expect(result.poolTotal).toBe(10 + expected * 2);
  });
  it("edits one group without reassigning others and merges group types", () => {
    const groups = request().draft.groups;
    const updated = updateGroupQuantity(groups, "cold", "d6", 1);
    expect(updated.find(g => g.id === "fire")?.dice.d6).toBe(2);
    const merged = changeGroupType(updated, "cold", "fire");
    expect(merged).toHaveLength(1);
    expect(merged[0].dice).toMatchObject({ d6: 3, d8: 1 });
    expect(groups[1].dice).toEqual({ d8: 1 });
  });
  it("counts checks independently of the saved damage pool and keeps the pool budget bounded", () => {
    const req = request("advantage"); req.draft.groups = [{ id: "g", damageType: "none", dice: { "d%": 12 } }];
    expect(countPhysicalDice(req.draft.groups, req.d20)).toBe(2);
    expect(countPhysicalDice(req.draft.groups, null)).toBe(24);
    expect(draftSchema.safeParse(req.draft).success).toBe(true);
    expect(requestSchema.safeParse(req).success).toBe(true);
    req.draft.groups[0].dice.d6 = 1;
    expect(requestSchema.safeParse(req).success).toBe(false);
  });
  it.each([-10000, 10000, 1.5, NaN, Infinity])("rejects invalid d20 modifier %s", modifier => {
    const req = request("normal"); req.draft.d20Modifier = modifier;
    expect(requestSchema.safeParse(req).success).toBe(false);
  });
  it("defaults older drafts to a zero d20 modifier", () => {
    const draft: Partial<ReturnType<typeof defaultDiceDraft>> = defaultDiceDraft(); delete draft.d20Modifier;
    expect(draftSchema.parse(draft).d20Modifier).toBe(0);
  });
  it.each([-1, 1.5, NaN, Infinity, 25])("rejects invalid quantity %s", n => {
    const req = request(); req.draft.groups[0].dice.d6 = n;
    expect(requestSchema.safeParse(req).success).toBe(false);
  });
  it("rejects duplicate groups, empty requests and inconsistent d20", () => {
    const req = request(); req.draft.groups.push(req.draft.groups[0]);
    expect(requestSchema.safeParse(req).success).toBe(false);
    expect(requestSchema.safeParse({ ...request(), draft: defaultDiceDraft() }).success).toBe(false);
    expect(requestSchema.safeParse({ ...request(), d20: "normal" }).success).toBe(false);
  });
  it("rejects missing, extra, duplicate and out of range faces", () => {
    const req = request(), values = expandDice(req).map(d => ({ id: d.id, value: 4 }));
    for (const bad of [values.slice(1), [...values, values[0]], [values[0], values[0], values[2]], values.map(v => ({ ...v, value: 100 }))]) expect(() => resolveDiceRoll(req, bad)).toThrow();
  });
  it("rejects malformed quaternions, durations and frame sizes", () => {
    const dice = expandDice(request());
    expect(() => validateSimulation({ values: [], replay: { frames: [], frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30 } }, dice)).toThrow();
    const frames = Array(2 * dice.length * 7).fill(0);
    expect(() => validateSimulation({ values: [], replay: { frames, frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30 } }, dice)).toThrow();
  });
  it("enforces the encoded 1 MiB replay budget even with excessive numeric precision", () => {
    const req = request(); req.draft.groups = [{ id: "f", damageType: "fire", dice: { d6: 24 } }];
    const frames = Array.from({ length: 361 * 24 }, () => [.12345678901234568, .12345678901234568, .12345678901234568, .5000000000000001, .5000000000000001, .5000000000000001, .5000000000000001]).flat();
    expect(() => validateSimulation({ values: [], replay: { frames, frameCount: 361, stepMs: 1000 / 30, durationMs: 12000 } }, expandDice(req))).toThrow("Trayectoria demasiado grande");
  });
});
