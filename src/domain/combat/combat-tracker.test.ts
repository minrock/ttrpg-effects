import { describe, expect, it } from "vitest";
import {
  addParticipantDuringCombat,
  advanceTurn,
  createCombatParticipant,
  createDefaultCombatTracker,
  endCombat,
  markParticipantDefeated,
  startCombat,
  type CombatCandidate
} from "./combat-tracker";

const candidates: readonly CombatCandidate[] = [
  {
    id: "monster:goblin",
    entityType: "monster",
    entityId: "goblin",
    name: "Goblin",
    imagePath: null
  },
  {
    id: "npc:guard",
    entityType: "npc",
    entityId: "guard",
    name: "Guardia",
    imagePath: null
  },
  {
    id: "playerCharacter:hero",
    entityType: "playerCharacter",
    entityId: "hero",
    name: "Heroe",
    imagePath: null
  }
];

describe("combat tracker", () => {
  it("starts blank and can be ended back to blank", () => {
    expect(createDefaultCombatTracker()).toEqual({
      active: false,
      participants: [],
      currentParticipantId: null,
      round: 0
    });
    expect(endCombat()).toEqual(createDefaultCombatTracker());
  });

  it("requires at least two participants to start", () => {
    const participant = createCombatParticipant(candidates[0], 12);
    expect(() => startCombat([participant])).toThrow("al menos dos");
  });

  it("prevents duplicated scene entities", () => {
    const participant = createCombatParticipant(candidates[0], 12);
    expect(() => startCombat([participant, { ...participant, id: "duplicate" }])).toThrow("solo puede aparecer");
  });

  it("advances circularly and increments the round when wrapping", () => {
    const tracker = startCombat([
      createCombatParticipant(candidates[0], 15),
      createCombatParticipant(candidates[1], 11)
    ]);

    const second = advanceTurn(tracker);
    expect(second.currentParticipantId).toBe("npc:guard");
    expect(second.round).toBe(0);

    const wrapped = advanceTurn(second);
    expect(wrapped.currentParticipantId).toBe("monster:goblin");
    expect(wrapped.round).toBe(1);
  });

  it("skips defeated participants", () => {
    const tracker = startCombat([
      createCombatParticipant(candidates[0], 15),
      createCombatParticipant(candidates[1], 11),
      createCombatParticipant(candidates[2], 17)
    ]);

    const withDefeated = markParticipantDefeated(tracker, "npc:guard", true);
    const next = advanceTurn(withDefeated);
    expect(next.currentParticipantId).toBe("playerCharacter:hero");
  });

  it("moves away from the current participant when it is defeated", () => {
    const tracker = startCombat([
      createCombatParticipant(candidates[0], 15),
      createCombatParticipant(candidates[1], 11)
    ]);

    const next = markParticipantDefeated(tracker, "monster:goblin", true);
    expect(next.currentParticipantId).toBe("npc:guard");
  });

  it("adds late participants for the next round", () => {
    const tracker = startCombat([
      createCombatParticipant(candidates[0], 15),
      createCombatParticipant(candidates[1], 11)
    ]);

    const withLate = addParticipantDuringCombat(
      tracker,
      createCombatParticipant(candidates[2], 17)
    );

    expect(withLate.participants[2]).toMatchObject({
      enteredRound: 0,
      activeFromRound: 1
    });
    expect(advanceTurn(withLate).currentParticipantId).toBe("npc:guard");
    expect(advanceTurn(advanceTurn(withLate)).currentParticipantId).toBe("monster:goblin");
  });
});
