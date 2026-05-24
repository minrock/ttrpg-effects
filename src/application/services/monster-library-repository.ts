import type {
  MonsterLibraryEntry,
  MonsterLibrarySearchQuery
} from "../../domain/monster-library/monster-library";

export interface MonsterLibraryRepository {
  search(query: MonsterLibrarySearchQuery): Promise<readonly MonsterLibraryEntry[]>;
  findById(id: string): Promise<MonsterLibraryEntry | null>;
  save(entry: MonsterLibraryEntry): Promise<MonsterLibraryEntry>;
}
