import { beforeEach, describe, expect, it } from "vitest";
import { DiceRollSession } from "./dice-roll-session";
import { defaultDiceDraft, type DiceContext, type DiceEnvelope, type DiceRollRequest } from "../../domain/dice/dice";

const context: DiceContext = { token: "context-a", sceneId: "scene", mapId: "map-a", sceneName: "Private scene name", mapName: "Private map name" };
const request = (id = "req", visibility: "hidden" | "open" = "hidden"): DiceRollRequest => ({ requestId: id, contextToken: context.token, draft: { ...defaultDiceDraft(), visibility, groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, d20: null });
const simulation = { values: [{ id: "f:d6:0", value: 4 }], replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, .5, 0, 0, 0, 1] } };

describe("dice session privacy and lifecycle", () => {
  let now: number, sequence: number, session: DiceRollSession, events: { role: string; envelope: DiceEnvelope }[];
  beforeEach(() => { now = 10000; sequence = 0; events = []; session = new DiceRollSession((role, envelope) => events.push({ role, envelope }), () => now, () => `roll-${sequence++}`); session.setContext(context); events = []; });
  function roll(req = request()): string { const { rollId } = session.begin(req); session.complete(rollId, simulation); return rollId; }
  it("does not send or cache ANY hidden roll in Player", () => {
    roll(); expect(events.map(e => e.role)).toEqual(["dm"]);
    expect(session.getPublicState()).toEqual({ revision: 1, presentation: null });
    expect(JSON.stringify(session.getPublicState())).not.toContain("f:d6");
    expect(session.getDmState().history[0].result?.poolTotal).toBe(4);
  });
  it("shares identical physical replay without summary or private context names", () => {
    roll(request("r", "open"));
    const dm = session.getDmState().envelope.presentation!, player = session.getPublicState().presentation!;
    expect(player.replay).toBe(dm.replay); expect(player.result).toBeNull();
    expect(JSON.stringify(player)).not.toContain("Private");
    expect(JSON.stringify(player)).not.toContain("history");
  });
  it("preserves public dice while a subsequent hidden roll happens", () => {
    const open = roll(request("public", "open")); now += 300;
    events = []; roll(request("secret", "hidden"));
    expect(session.getPublicState().presentation?.rollId).toBe(open);
    expect(events.every(e => e.role === "dm")).toBe(true);
  });
  it("can show/hide the last open result without rerolling, including after dismissal", () => {
    const id = roll(request("r", "open")); now += 7000;
    session.dismiss(id);
    expect(session.getPublicState().presentation).toBeNull();
    session.setResultVisibility(id, true);
    expect(session.getPublicState().presentation).toMatchObject({ replay: null, result: { poolTotal: 4 } });
    expect(session.getDmState().history).toHaveLength(1);
    session.setResultVisibility(id, false); expect(session.getPublicState().presentation).toBeNull();
  });
  it("never reveals a hidden roll using the summary action", () => { const id = roll(); now += 1000; expect(() => session.setResultVisibility(id, true)).toThrow(); });
  it("validates privacy from the authorized request, not completion payload", () => {
    const { rollId } = session.begin(request()); session.complete(rollId, { ...simulation, visibility: "open" });
    expect(session.getPublicState().presentation).toBeNull();
  });
  it("derives damage colors and modifiers from the authorized draft for both views", () => {
    const req = request("color", "open"); req.draft.groups[0].modifier = 2; req.draft.showPlayerResult = true;
    const { rollId } = session.begin(req);
    session.complete(rollId, { ...simulation, modifier: 9999, damageType: "cold" });
    expect(session.getPublicState().presentation?.dice[0].damageType).toBe("fire");
    expect(session.getPublicState().presentation?.result).toMatchObject({ poolTotal: 6, groups: [{ modifier: 2, total: 6 }] });
    expect(session.getDmState().history[0].result?.poolTotal).toBe(6);
  });
  it.each(["open", "hidden"] as const)("resolves a %s check alone with its captured modifier and preserves the prepared damage", visibility => {
    const req = request("check", visibility); req.d20 = "advantage"; req.draft.includeD20 = true; req.draft.d20Modifier = -2; req.draft.showPlayerResult = true; req.draft.groups[0].modifier = 8;
    const { rollId } = session.begin(req);
    session.setDraft({ ...req.draft, d20Modifier: 90 });
    const checkSimulation = { values: [{ id: "check:0", value: 5 }, { id: "check:1", value: 17 }], replay: { ...simulation.replay, frames: Array.from({ length: 4 }, () => [0, 0, 1, 0, 0, 0, 1]).flat() } };
    const state = session.complete(rollId, checkSimulation);
    const result = { groups: [], poolTotal: 0, d20: { mode: "advantage", values: [5, 17], value: 17, selected: 1, modifier: -2, total: 15 } };
    expect(state.history[0].result).toEqual(result);
    expect(state.envelope.presentation?.result).toEqual(result);
    expect(state.envelope.presentation?.dice.map(die => die.type)).toEqual(["d20", "d20"]);
    expect(state.draft.groups).toEqual(req.draft.groups);
    if (visibility === "open") expect(session.getPublicState().presentation?.result).toEqual(result);
    else expect(session.getPublicState().presentation).toBeNull();
    now += 300;
    const damage = { ...req, requestId: "damage", d20: null, draft: { ...req.draft, includeD20: false } };
    const next = session.begin(damage); session.complete(next.rollId, simulation);
    expect(session.getDmState().envelope.presentation?.result).toMatchObject({ groups: [{ total: 12, modifier: 8 }], poolTotal: 12, d20: null });
  });
  it("rejects double clicks and repeated completion without duplicating history", () => {
    const req = request(), first = session.begin(req);
    expect(session.begin(req)).toEqual(first);
    expect(() => session.begin(request("second"))).toThrow();
    session.complete(first.rollId, simulation);
    expect(() => session.complete(first.rollId, simulation)).toThrow();
    now += 1000; expect(() => session.begin(req)).toThrow(); expect(session.getDmState().history).toHaveLength(1);
  });
  it.each(["open", "hidden"] as const)("shares a natural-twenty celebration only with the %s roll audience, even without numeric results", visibility => {
    const req = request("critical", visibility); req.d20 = "normal"; req.draft.includeD20 = true; req.draft.d20Modifier = -4; req.draft.showPlayerResult = false;
    const { rollId } = session.begin(req);
    session.complete(rollId, { ...simulation, values: [{ id: "check:0", value: 20 }] });
    const dm = session.getDmState().envelope.presentation!, player = session.getPublicState().presentation;
    expect(dm.critical).toEqual({ dieId: "check:0" });
    expect(dm.result?.d20).toMatchObject({ value: 20, modifier: -4, total: 16 });
    if (visibility === "open") {
      expect(player).toMatchObject({ result: null, critical: dm.critical, settledAt: dm.settledAt });
      now += 500;
      session.setResultVisibility(rollId, true);
      expect(session.getPublicState().presentation).toMatchObject({ critical: dm.critical, settledAt: dm.settledAt });
      session.dismiss(rollId);
      session.setResultVisibility(rollId, true);
      expect(session.getPublicState().presentation?.critical).toBeFalsy();
    } else expect(player).toBeNull();
  });
  it("interrupts on context change, preserves history and rejects late completion", () => {
    roll(request("past", "open")); now += 1000;
    const pending = session.begin(request("pending"));
    session.setContext({ ...context, token: "new-opening", mapId: "map-b" });
    expect(session.getDmState().history.map(e => e.status)).toEqual(["interrupted", "complete"]);
    expect(() => session.complete(pending.rollId, simulation)).toThrow();
    expect(session.getPublicState().presentation).toBeNull();
  });
  it("retains settled dice indefinitely until the DM dismisses the result", () => {
    const id = roll(request("r", "open")); now += 3600000; session.sweep();
    expect(session.getDmState().envelope.presentation?.replay).toEqual(simulation.replay);
    expect(session.getPublicState().presentation?.replay).toBe(session.getDmState().envelope.presentation?.replay);
    session.dismiss(id);
    expect(session.getDmState().envelope.presentation).toBeNull();
    expect(session.getPublicState().presentation).toBeNull();
    expect(session.getDmState().publicResultVisible).toBe(false);
    expect(session.getDmState().history).toHaveLength(1);
    expect(JSON.stringify(session.getDmState().history)).not.toContain("frames");
    roll(request("next")); expect(session.getDmState().history).toHaveLength(2);
  });
  it("closes a published summary and its dice in both windows without deleting the log", () => {
    const id = roll(request("r", "open")); now += 1000;
    session.setResultVisibility(id, true);
    events = [];
    session.dismiss(id);
    expect(events.map(e => [e.role, e.envelope.presentation])).toEqual([["dm", null], ["player", null]]);
    expect(session.getDmState()).toMatchObject({ publicResultVisible: false, history: [{ id }] });
    events = []; session.dismiss(id); expect(events).toEqual([]);
  });
  it("closing a hidden roll leaves an older public roll untouched", () => {
    const open = roll(request("public", "open")); now += 1000;
    session.setResultVisibility(open, true);
    const hidden = roll(request("secret")); now += 1000; events = [];
    session.dismiss(hidden);
    expect(session.getDmState().envelope.presentation).toBeNull();
    expect(session.getPublicState().presentation?.rollId).toBe(open);
    expect(session.getDmState().publicResultVisible).toBe(true);
    expect(events.map(e => e.role)).toEqual(["dm"]);
  });
  it("ignores a stale close without removing a newer roll", () => {
    const old = roll(request("old", "open")); now += 1000;
    const current = roll(request("current", "open")); events = [];
    session.dismiss(old);
    expect(session.getDmState().envelope.presentation?.rollId).toBe(current);
    expect(session.getPublicState().presentation?.rollId).toBe(current);
    expect(events).toEqual([]);
  });
  it("handles worker death and timeout without fabricating a result", () => {
    session.begin(request()); now += 21000;
    expect(session.getDmState().history[0]).toMatchObject({ status: "failed", result: null });
    roll(request("retry")); expect(session.getDmState().history).toHaveLength(2);
  });
  it("caps history and has no persistence across new sessions", () => {
    for (let i = 0; i < 510; i++) { roll(request(`r${i}`)); now += 7000; }
    expect(session.getDmState().history).toHaveLength(500);
    expect(new DiceRollSession(() => {}).getDmState().history).toEqual([]);
    session.clearHistory(); expect(session.getDmState().history).toEqual([]);
  });
  it("keeps independent sizes across contexts, without changing history or publishing hidden rolls", () => {
    session.setSize({ view: "player", scale: 2 });
    session.setSize({ view: "dm", scale: 1.5 });
    const id = roll(); now += 1000;
    const before = session.getDmState(), publicBefore = session.getPublicState(); events = [];
    session.setSize({ view: "player", scale: 2.5 });
    expect(session.getDmState()).toEqual(before); expect(session.getPublicState()).toBe(publicBefore);
    expect(events).toEqual([]); expect(session.getDmState().history[0].id).toBe(id);
    session.setContext({ ...context, token: "b", mapId: "b" });
    expect(session.getSizes()).toEqual({ revision: 3, dm: 1.5, player: 2.5 });
    session.setSize({ view: "dm", scale: 1.5 });
    expect(session.getSizes().revision).toBe(3);
    expect(new DiceRollSession(() => {}).getSizes()).toEqual({ revision: 0, dm: 1, player: 1 });
  });
  it("rejects size changes while preparing or animating and accepts them after resting", () => {
    const { rollId } = session.begin(request());
    expect(() => session.setSize({ view: "dm", scale: 2 })).toThrow("Espera");
    session.complete(rollId, simulation);
    expect(() => session.setSize({ view: "player", scale: 2 })).toThrow("Espera");
    now += 1000; expect(session.setSize({ view: "player", scale: 2 }).player).toBe(2);
    expect(() => session.setSize({ view: "player", scale: 5 })).toThrow();
    expect(session.getSizes().player).toBe(2);
  });
});
