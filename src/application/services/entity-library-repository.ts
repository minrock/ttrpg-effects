import type {
  EntityLibrarySearchQuery,
  NpcLibraryEntry,
  PlayerCharacterLibraryEntry
} from "../../domain/entity-library/entity-library";

export interface NpcLibraryRepository {
  search(query: EntityLibrarySearchQuery): Promise<readonly NpcLibraryEntry[]>;
  findById(id: string): Promise<NpcLibraryEntry | null>;
  save(entry: NpcLibraryEntry): Promise<NpcLibraryEntry>;
}

export interface PlayerCharacterLibraryRepository {
  search(query: EntityLibrarySearchQuery): Promise<readonly PlayerCharacterLibraryEntry[]>;
  findById(id: string): Promise<PlayerCharacterLibraryEntry | null>;
  save(entry: PlayerCharacterLibraryEntry): Promise<PlayerCharacterLibraryEntry>;
}
