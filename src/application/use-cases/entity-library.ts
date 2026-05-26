import type {
  NpcLibraryRepository,
  PlayerCharacterLibraryRepository
} from "../services/entity-library-repository";
import {
  createNpcLibraryEntry,
  createPlayerCharacterLibraryEntry,
  normalizeEntityLibrarySearchQuery,
  normalizeNpcLibrarySaveInput,
  normalizePlayerCharacterLibrarySaveInput,
  updateNpcLibraryEntry,
  updatePlayerCharacterLibraryEntry,
  type NpcLibraryEntry,
  type PlayerCharacterLibraryEntry
} from "../../domain/entity-library/entity-library";

interface SaveOptions {
  readonly createId: () => string;
  readonly now: () => Date;
}

export async function searchNpcLibraryUseCase(
  repository: NpcLibraryRepository,
  payload: unknown
): Promise<readonly NpcLibraryEntry[]> {
  return repository.search(normalizeEntityLibrarySearchQuery(payload));
}

export async function getNpcLibraryEntryUseCase(
  repository: NpcLibraryRepository,
  id: string
): Promise<NpcLibraryEntry | null> {
  return repository.findById(id);
}

export async function saveNpcLibraryEntryUseCase(
  repository: NpcLibraryRepository,
  payload: unknown,
  options: SaveOptions
): Promise<NpcLibraryEntry> {
  const input = normalizeNpcLibrarySaveInput(payload);
  const id = input.id ?? options.createId();
  const current = await repository.findById(id);
  const entry = current === null
    ? createNpcLibraryEntry(input, { id, now: options.now() })
    : updateNpcLibraryEntry(current, input, { id, now: options.now() });
  return repository.save(entry);
}

export async function searchPlayerCharacterLibraryUseCase(
  repository: PlayerCharacterLibraryRepository,
  payload: unknown
): Promise<readonly PlayerCharacterLibraryEntry[]> {
  return repository.search(normalizeEntityLibrarySearchQuery(payload));
}

export async function getPlayerCharacterLibraryEntryUseCase(
  repository: PlayerCharacterLibraryRepository,
  id: string
): Promise<PlayerCharacterLibraryEntry | null> {
  return repository.findById(id);
}

export async function savePlayerCharacterLibraryEntryUseCase(
  repository: PlayerCharacterLibraryRepository,
  payload: unknown,
  options: SaveOptions
): Promise<PlayerCharacterLibraryEntry> {
  const input = normalizePlayerCharacterLibrarySaveInput(payload);
  const id = input.id ?? options.createId();
  const current = await repository.findById(id);
  const entry = current === null
    ? createPlayerCharacterLibraryEntry(input, { id, now: options.now() })
    : updatePlayerCharacterLibraryEntry(current, input, { id, now: options.now() });
  return repository.save(entry);
}
