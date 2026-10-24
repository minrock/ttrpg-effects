import { describe, expect, it } from "vitest";
import { expandDice, resolveDiceRoll, validateSimulation, defaultDiceDraft, type DiceRollRequest } from "../../domain/dice/dice";
import { DiceFactory } from "../../render/three/dice/vendor/DiceFactory.js";
import { readDieFace, simulateDice } from "./dice-simulation";

function randomSource(seed: number): () => number { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
describe("physical dice simulation", () => {
  it.each([null, "advantage"] as const)("settles every polyhedron and replays a bounded, valid trajectory (check=%s)", mode => {
    const request: DiceRollRequest = { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), includeD20: mode !== null, groups: [{ id: "fire", damageType: "fire", dice: { d4: 1, d6: 1, d8: 1, d10: 1, "d%": 1, d12: 1 } }] }, d20: mode };
    const dice = expandDice(request);
    expect(dice).toHaveLength(mode ? 2 : 7);
    const simulation = simulateDice(dice, 1, randomSource(42));
    expect(validateSimulation(simulation, dice)).toEqual(simulation);
    const result = resolveDiceRoll(request, simulation.values);
    if (mode) expect(result.d20?.values).toHaveLength(2);
    else expect(result.groups[0].dice).toHaveLength(6);
    expect(simulation.replay.frames.length * 8).toBeLessThan(1024 * 1024);
    expect(simulateDice(dice, 1, randomSource(42))).toEqual(simulation);
    const renderFactory = new DiceFactory({ baseScale: 100, bumpMapping: false });
    for (const [index, die] of dice.entries()) {
      const preset = renderFactory.get(die.type), geometry = renderFactory.createGeometry(preset.shape, preset.scale * 100);
      const offset = ((simulation.replay.frameCount - 1) * dice.length + index) * 7 + 3;
      const face = readDieFace(geometry, die.type, simulation.replay.frames.slice(offset, offset + 4));
      expect(face.value).toBe(simulation.values[index].value);
      expect(face.alignment).toBeGreaterThan(.989);
      geometry.dispose();
    }
  });
  it("settles 24 dice without browser globals", () => {
    const request: DiceRollRequest = { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), groups: [{ id: "f", damageType: "fire", dice: { d6: 24 } }] }, d20: null };
    const dice = expandDice(request), simulation = simulateDice(dice, 1.6, randomSource(9));
    expect(simulation.values).toHaveLength(24);
    expect(resolveDiceRoll(request, simulation.values).poolTotal).toBeGreaterThanOrEqual(24);
  });
  it.each([null, "normal", "advantage"] as const)("settles dice across multiple initial conditions (check=%s)", mode => {
    const request: DiceRollRequest = { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), includeD20: mode !== null, groups: [{ id: "f", damageType: "fire", dice: { d4: 1, d6: 1, d8: 1, d10: 1, "d%": 1, d12: 1 } }] }, d20: mode };
    const failed: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      try { simulateDice(expandDice(request), 1, randomSource(seed)); } catch { failed.push(seed); }
    }
    expect(failed).toEqual([]);
  }, 20000);
  it("keeps mixed maximum-size rolls usable at both force limits", () => {
    const request: DiceRollRequest = { requestId: "r", contextToken: "c", draft: { ...defaultDiceDraft(), groups: [{ id: "f", damageType: "fire", dice: { d4: 3, d6: 6, d8: 3, d10: 3, "d%": 3, d12: 3 } }] }, d20: null };
    const dice = expandDice(request);
    expect(dice).toHaveLength(24);
    for (const force of [.5, 1.6]) for (let seed = 1; seed <= 10; seed++) {
      const result = simulateDice(dice, force, randomSource(seed));
      expect(result.values).toHaveLength(24);
      expect(JSON.stringify(result).length).toBeLessThan(1024 * 1024);
    }
  }, 20000);
});
