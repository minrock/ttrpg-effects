import type { SceneAside } from "../sessions/scene-aside";

export type CombatParticipantType = "monster" | "npc" | "playerCharacter";

export interface CombatCandidate {
  readonly id: string;
  readonly entityType: CombatParticipantType;
  readonly entityId: string;
  readonly name: string;
  readonly imagePath: string | null;
}

export interface CombatParticipant {
  readonly id: string;
  readonly entityType: CombatParticipantType;
  readonly entityId: string;
  readonly name: string;
  readonly imagePath: string | null;
  readonly initiative: number;
  readonly defeated: boolean;
  readonly enteredRound: number;
  readonly activeFromRound: number;
}

export interface CombatTracker {
  readonly active: boolean;
  readonly participants: readonly CombatParticipant[];
  readonly currentParticipantId: string | null;
  readonly round: number;
}

export class CombatTrackerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CombatTrackerError";
  }
}

export function createDefaultCombatTracker(): CombatTracker {
  return {
    active: false,
    participants: [],
    currentParticipantId: null,
    round: 0
  };
}

export function createCombatCandidates(aside: SceneAside): readonly CombatCandidate[] {
  return [
    ...aside.monsters.map((monster) => ({
      id: `monster:${monster.id}`,
      entityType: "monster" as const,
      entityId: monster.id,
      name: monster.name,
      imagePath: monster.imagePath
    })),
    ...aside.npcs.map((npc) => ({
      id: `npc:${npc.id}`,
      entityType: "npc" as const,
      entityId: npc.id,
      name: npc.name,
      imagePath: npc.imagePath
    })),
    ...aside.playerCharacters.map((character) => ({
      id: `playerCharacter:${character.id}`,
      entityType: "playerCharacter" as const,
      entityId: character.id,
      name: character.characterName,
      imagePath: character.imagePath
    }))
  ];
}

export function createCombatParticipant(
  candidate: CombatCandidate,
  initiative: number,
  options: {
    readonly id?: string;
    readonly enteredRound?: number;
    readonly activeFromRound?: number;
    readonly defeated?: boolean;
  } = {}
): CombatParticipant {
  const enteredRound = options.enteredRound ?? 0;
  return {
    id: options.id ?? `${candidate.entityType}:${candidate.entityId}`,
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    name: candidate.name,
    imagePath: candidate.imagePath,
    initiative,
    defeated: options.defeated ?? false,
    enteredRound,
    activeFromRound: options.activeFromRound ?? enteredRound
  };
}

export function startCombat(participants: readonly CombatParticipant[]): CombatTracker {
  validateStartCombatParticipants(participants);
  const normalized = participants.map((participant) => ({
    ...participant,
    defeated: false,
    enteredRound: 0,
    activeFromRound: 0
  }));

  return {
    active: true,
    participants: normalized,
    currentParticipantId: normalized[0]?.id ?? null,
    round: 0
  };
}

export function endCombat(): CombatTracker {
  return createDefaultCombatTracker();
}

export function addParticipantDuringCombat(
  tracker: CombatTracker,
  participant: CombatParticipant
): CombatTracker {
  if (!tracker.active) {
    throw new CombatTrackerError("No hay una batalla activa.");
  }
  assertNoDuplicateParticipant([...tracker.participants, participant]);

  const delayedParticipant: CombatParticipant = {
    ...participant,
    defeated: false,
    enteredRound: tracker.round,
    activeFromRound: tracker.round + 1
  };

  return {
    ...tracker,
    participants: [...tracker.participants, delayedParticipant]
  };
}

export function advanceTurn(tracker: CombatTracker): CombatTracker {
  if (!tracker.active) return tracker;

  const activeNow = getActiveParticipantsForRound(tracker.participants, tracker.round);
  if (activeNow.length === 0) {
    return { ...tracker, currentParticipantId: null };
  }
  if (activeNow.length === 1) {
    return { ...tracker, currentParticipantId: activeNow[0].id };
  }

  const currentIndex = activeNow.findIndex((participant) => participant.id === tracker.currentParticipantId);
  const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
  if (nextIndex < activeNow.length) {
    return { ...tracker, currentParticipantId: activeNow[nextIndex].id };
  }

  const nextRound = tracker.round + 1;
  const activeNextRound = getActiveParticipantsForRound(tracker.participants, nextRound);
  return {
    ...tracker,
    round: nextRound,
    currentParticipantId: activeNextRound[0]?.id ?? null
  };
}

export function markParticipantDefeated(
  tracker: CombatTracker,
  participantId: string,
  defeated: boolean
): CombatTracker {
  const nextTracker = {
    ...tracker,
    participants: tracker.participants.map((participant) =>
      participant.id === participantId ? { ...participant, defeated } : participant
    )
  };

  if (defeated && tracker.currentParticipantId === participantId) {
    return advanceTurn(nextTracker);
  }

  return nextTracker;
}

export function getCurrentParticipant(tracker: CombatTracker): CombatParticipant | null {
  return tracker.participants.find((participant) => participant.id === tracker.currentParticipantId) ?? null;
}

export function getNextActiveParticipant(tracker: CombatTracker): CombatParticipant | null {
  const activeNow = getActiveParticipantsForRound(tracker.participants, tracker.round);
  if (activeNow.length === 0) return null;

  const currentIndex = activeNow.findIndex((participant) => participant.id === tracker.currentParticipantId);
  if (currentIndex < 0) return activeNow[0];
  return activeNow[(currentIndex + 1) % activeNow.length] ?? null;
}

export function isParticipantActiveInRound(
  participant: CombatParticipant,
  round: number
): boolean {
  return !participant.defeated && participant.activeFromRound <= round;
}

export function validateStartCombatParticipants(participants: readonly CombatParticipant[]): void {
  if (participants.length < 2) {
    throw new CombatTrackerError("La batalla necesita al menos dos participantes.");
  }
  assertNoDuplicateParticipant(participants);
  for (const participant of participants) {
    if (!Number.isFinite(participant.initiative)) {
      throw new CombatTrackerError("Cada participante necesita iniciativa valida.");
    }
  }
}

function getActiveParticipantsForRound(
  participants: readonly CombatParticipant[],
  round: number
): readonly CombatParticipant[] {
  return participants.filter((participant) => isParticipantActiveInRound(participant, round));
}

function assertNoDuplicateParticipant(participants: readonly CombatParticipant[]): void {
  const keys = new Set<string>();
  for (const participant of participants) {
    const key = `${participant.entityType}:${participant.entityId}`;
    if (keys.has(key)) {
      throw new CombatTrackerError("Cada entidad solo puede aparecer una vez en el turnero.");
    }
    keys.add(key);
  }
}
