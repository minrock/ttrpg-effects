import type { MonsterLibraryRepository } from "../services/monster-library-repository";
import {
  createMonsterLibraryEntry,
  normalizeMonsterLibrarySaveInput,
  normalizeMonsterLibrarySearchQuery,
  updateMonsterLibraryEntry,
  type MonsterLibraryEntry
} from "../../domain/monster-library/monster-library";

export async function searchMonsterLibraryUseCase(
  repository: MonsterLibraryRepository,
  payload: unknown
): Promise<readonly MonsterLibraryEntry[]> {
  return repository.search(normalizeMonsterLibrarySearchQuery(payload));
}

export async function getMonsterLibraryEntryUseCase(
  repository: MonsterLibraryRepository,
  id: string
): Promise<MonsterLibraryEntry | null> {
  return repository.findById(id);
}

export async function saveMonsterLibraryEntryUseCase(
  repository: MonsterLibraryRepository,
  payload: unknown,
  options: {
    readonly createId: () => string;
    readonly now: () => Date;
  }
): Promise<MonsterLibraryEntry> {
  const input = normalizeMonsterLibrarySaveInput(payload);
  const id = input.id ?? options.createId();
  const current = await repository.findById(id);
  const entry = current === null
    ? createMonsterLibraryEntry(input, { id, now: options.now() })
    : updateMonsterLibraryEntry(current, input, { id, now: options.now() });

  return repository.save(entry);
}
