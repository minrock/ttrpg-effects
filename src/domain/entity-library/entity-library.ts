import type { SceneNpc, ScenePlayerCharacter } from "../sessions/scene-aside";
import { ensureUniqueSlug, slugify, type AbilityScores } from "../sessions/scene-aside";

export interface NpcLibraryEntry {
  readonly id: string;
  readonly name: string;
  readonly imagePath: string | null;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NpcLibrarySaveInput {
  readonly id?: string | null;
  readonly name: string;
  readonly imagePath?: string | null;
  readonly notes?: string;
}

export interface PlayerCharacterLibraryEntry {
  readonly id: string;
  readonly characterName: string;
  readonly playerName: string;
  readonly level: string;
  readonly species: string;
  readonly classes: string;
  readonly imagePath: string | null;
  readonly stats: AbilityScores;
  readonly initiative: string;
  readonly armorClass: string;
  readonly passivePerception: string;
  readonly hitPoints: string;
  readonly spellSaveDc: string;
  readonly speeds: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlayerCharacterLibrarySaveInput {
  readonly id?: string | null;
  readonly characterName: string;
  readonly playerName?: string;
  readonly level?: string;
  readonly species?: string;
  readonly classes?: string;
  readonly imagePath?: string | null;
  readonly stats?: Partial<AbilityScores>;
  readonly initiative?: string;
  readonly armorClass?: string;
  readonly passivePerception?: string;
  readonly hitPoints?: string;
  readonly spellSaveDc?: string;
  readonly speeds?: string;
  readonly notes?: string;
}

export interface EntityLibrarySearchQuery {
  readonly text: string;
  readonly limit?: number;
}

export class EntityLibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityLibraryError";
  }
}

export function normalizeEntityLibrarySearchQuery(input: unknown): EntityLibrarySearchQuery {
  if (typeof input !== "object" || input === null) return { text: "", limit: 50 };
  const record = input as Record<string, unknown>;
  const text = typeof record["text"] === "string" ? record["text"].trim() : "";
  const rawLimit = record["limit"];
  const limit = typeof rawLimit === "number" && Number.isInteger(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 100))
    : 50;
  return { text, limit };
}

export function normalizeNpcLibrarySaveInput(input: unknown): NpcLibrarySaveInput {
  if (typeof input !== "object" || input === null) {
    throw new EntityLibraryError("Payload de NPC invalido.");
  }
  const record = input as Record<string, unknown>;
  return {
    id: normalizeOptionalString(record["id"]),
    name: normalizeRequiredString(record["name"], "El nombre del NPC es requerido."),
    imagePath: normalizeOptionalString(record["imagePath"]),
    notes: typeof record["notes"] === "string" ? record["notes"] : ""
  };
}

export function createNpcLibraryEntry(
  input: NpcLibrarySaveInput,
  options: { readonly id: string; readonly now: Date }
): NpcLibraryEntry {
  const nowIso = options.now.toISOString();
  return {
    id: normalizeRequiredString(options.id, "El id del NPC es requerido."),
    name: normalizeRequiredString(input.name, "El nombre del NPC es requerido."),
    imagePath: normalizeOptionalString(input.imagePath),
    notes: input.notes ?? "",
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

export function updateNpcLibraryEntry(
  current: NpcLibraryEntry | null,
  input: NpcLibrarySaveInput,
  options: { readonly id: string; readonly now: Date }
): NpcLibraryEntry {
  const next = createNpcLibraryEntry(input, options);
  return { ...next, createdAt: current?.createdAt ?? next.createdAt };
}

export function createSceneNpcFromLibraryEntry(
  entry: NpcLibraryEntry,
  existingIds: readonly string[]
): SceneNpc {
  const base = slugify(entry.name) || "npc";
  return {
    id: ensureUniqueSlug(base, existingIds),
    name: entry.name,
    imagePath: entry.imagePath,
    visibleToPlayer: false,
    notes: entry.notes
  };
}

export function normalizePlayerCharacterLibrarySaveInput(input: unknown): PlayerCharacterLibrarySaveInput {
  if (typeof input !== "object" || input === null) {
    throw new EntityLibraryError("Payload de personaje jugador invalido.");
  }
  const record = input as Record<string, unknown>;
  const armorClass = normalizePlainString(record["armorClass"]);
  if (armorClass !== "" && !/^\d+(?:\s*\/\s*\d+)?$/.test(armorClass)) {
    throw new EntityLibraryError("La CA debe ser un numero o dos numeros separados por slash.");
  }

  return {
    id: normalizeOptionalString(record["id"]),
    characterName: normalizeRequiredString(record["characterName"], "El nombre del personaje es requerido."),
    playerName: normalizePlainString(record["playerName"]),
    level: normalizePlainString(record["level"]),
    species: normalizePlainString(record["species"]),
    classes: normalizePlainString(record["classes"]),
    imagePath: normalizeOptionalString(record["imagePath"]),
    stats: normalizeAbilityScores(record["stats"]),
    initiative: normalizePlainString(record["initiative"]),
    armorClass,
    passivePerception: normalizePlainString(record["passivePerception"]),
    hitPoints: normalizePlainString(record["hitPoints"]),
    spellSaveDc: normalizePlainString(record["spellSaveDc"]),
    speeds: normalizePlainString(record["speeds"]),
    notes: normalizePlainString(record["notes"])
  };
}

export function createPlayerCharacterLibraryEntry(
  input: PlayerCharacterLibrarySaveInput,
  options: { readonly id: string; readonly now: Date }
): PlayerCharacterLibraryEntry {
  const nowIso = options.now.toISOString();
  return {
    id: normalizeRequiredString(options.id, "El id del personaje es requerido."),
    characterName: normalizeRequiredString(input.characterName, "El nombre del personaje es requerido."),
    playerName: input.playerName ?? "",
    level: input.level ?? "",
    species: input.species ?? "",
    classes: input.classes ?? "",
    imagePath: normalizeOptionalString(input.imagePath),
    stats: normalizeAbilityScores(input.stats),
    initiative: input.initiative ?? "",
    armorClass: input.armorClass ?? "",
    passivePerception: input.passivePerception ?? "",
    hitPoints: input.hitPoints ?? "",
    spellSaveDc: input.spellSaveDc ?? "",
    speeds: input.speeds ?? "",
    notes: input.notes ?? "",
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

export function updatePlayerCharacterLibraryEntry(
  current: PlayerCharacterLibraryEntry | null,
  input: PlayerCharacterLibrarySaveInput,
  options: { readonly id: string; readonly now: Date }
): PlayerCharacterLibraryEntry {
  const next = createPlayerCharacterLibraryEntry(input, options);
  return { ...next, createdAt: current?.createdAt ?? next.createdAt };
}

export function createScenePlayerCharacterFromLibraryEntry(
  entry: PlayerCharacterLibraryEntry,
  existingIds: readonly string[]
): ScenePlayerCharacter {
  const base = slugify(entry.characterName) || "personaje";
  return {
    id: ensureUniqueSlug(base, existingIds),
    characterName: entry.characterName,
    playerName: entry.playerName,
    level: entry.level,
    species: entry.species,
    classes: entry.classes,
    imagePath: entry.imagePath,
    stats: entry.stats,
    initiative: entry.initiative,
    armorClass: entry.armorClass,
    passivePerception: entry.passivePerception,
    hitPoints: entry.hitPoints,
    spellSaveDc: entry.spellSaveDc,
    speeds: entry.speeds,
    notes: entry.notes
  };
}

export function formatAbilityScore(value: string): string {
  return value.trim() === "" ? "-" : value.trim();
}

function normalizeAbilityScores(input: unknown): AbilityScores {
  const record = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  return {
    strength: normalizeAbilityText(record["strength"]),
    constitution: normalizeAbilityText(record["constitution"]),
    dexterity: normalizeAbilityText(record["dexterity"]),
    intelligence: normalizeAbilityText(record["intelligence"]),
    wisdom: normalizeAbilityText(record["wisdom"]),
    charisma: normalizeAbilityText(record["charisma"])
  };
}

function normalizeAbilityText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") {
    throw new EntityLibraryError("Las caracteristicas deben ser texto.");
  }
  return value.trim();
}

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") throw new EntityLibraryError(message);
  const trimmed = value.trim();
  if (trimmed === "") throw new EntityLibraryError(message);
  return trimmed;
}

function normalizePlainString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
