import type { SceneMonster } from "../sessions/scene-aside";
import { ensureUniqueSlug, slugify } from "../sessions/scene-aside";

export interface MonsterLibraryEntry {
  readonly id: string;
  readonly name: string;
  readonly system: string;
  readonly templateId: string | null;
  readonly contentMarkdown: string;
  readonly imagePath: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MonsterLibrarySearchQuery {
  readonly text: string;
  readonly limit?: number;
}

export interface MonsterLibrarySaveInput {
  readonly id?: string | null;
  readonly name: string;
  readonly system: string;
  readonly templateId?: string | null;
  readonly contentMarkdown: string;
  readonly imagePath?: string | null;
}

export function normalizeMonsterLibrarySaveInput(input: unknown): MonsterLibrarySaveInput {
  if (typeof input !== "object" || input === null) {
    throw new MonsterLibraryError("Payload de monstruo invalido.");
  }

  const record = input as Record<string, unknown>;
  const name = normalizeRequiredString(record["name"], "El nombre del monstruo es requerido.");
  const system = normalizeRequiredString(record["system"], "El sistema del monstruo es requerido.");
  const contentMarkdown = typeof record["contentMarkdown"] === "string" ? record["contentMarkdown"] : "";
  const id = normalizeOptionalString(record["id"]);
  const templateId = normalizeOptionalString(record["templateId"]);
  const imagePath = normalizeOptionalString(record["imagePath"]);

  return { id, name, system, templateId, contentMarkdown, imagePath };
}

export function normalizeMonsterLibrarySearchQuery(input: unknown): MonsterLibrarySearchQuery {
  if (typeof input !== "object" || input === null) {
    return { text: "", limit: 50 };
  }

  const record = input as Record<string, unknown>;
  const text = typeof record["text"] === "string" ? record["text"].trim() : "";
  const rawLimit = record["limit"];
  const limit = typeof rawLimit === "number" && Number.isInteger(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 100))
    : 50;

  return { text, limit };
}

export function createMonsterLibraryEntry(
  input: MonsterLibrarySaveInput,
  options: { readonly id: string; readonly now: Date }
): MonsterLibraryEntry {
  const name = normalizeRequiredString(input.name, "El nombre del monstruo es requerido.");
  const system = normalizeRequiredString(input.system, "El sistema del monstruo es requerido.");
  const nowIso = options.now.toISOString();

  return {
    id: normalizeRequiredString(options.id, "El id del monstruo es requerido."),
    name,
    system,
    templateId: normalizeOptionalString(input.templateId),
    contentMarkdown: input.contentMarkdown,
    imagePath: normalizeOptionalString(input.imagePath),
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

export function updateMonsterLibraryEntry(
  current: MonsterLibraryEntry | null,
  input: MonsterLibrarySaveInput,
  options: { readonly id: string; readonly now: Date }
): MonsterLibraryEntry {
  const next = createMonsterLibraryEntry(input, options);

  return {
    ...next,
    createdAt: current?.createdAt ?? next.createdAt
  };
}

export function createSceneMonsterFromLibraryEntry(
  entry: MonsterLibraryEntry,
  existingIds: readonly string[]
): SceneMonster {
  const base = slugify(entry.name) || "monster";
  const id = ensureUniqueSlug(base, existingIds);

  return {
    id,
    name: entry.name,
    imagePath: entry.imagePath,
    visibleToPlayer: false,
    notes: entry.contentMarkdown,
    templateId: entry.templateId
  };
}

export function getMonsterLibraryPreview(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/[#*_`>|-]/g, "").trim())
    .find((line) => line.length > 0)
    ?.slice(0, 140) ?? "";
}

export class MonsterLibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonsterLibraryError";
  }
}

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new MonsterLibraryError(message);
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new MonsterLibraryError(message);
  }
  return trimmed;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
