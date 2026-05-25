import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { MonsterLibraryRepository } from "../../application/services/monster-library-repository";
import type {
  MonsterLibraryEntry,
  MonsterLibrarySearchQuery
} from "../../domain/monster-library/monster-library";

interface MonsterLibraryRow {
  readonly id: string;
  readonly name: string;
  readonly system: string;
  readonly template_id: string | null;
  readonly content_markdown: string;
  readonly image_path: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export class SqliteMonsterLibraryRepository implements MonsterLibraryRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.migrate();
  }

  async search(query: MonsterLibrarySearchQuery): Promise<readonly MonsterLibraryEntry[]> {
    const text = query.text.trim();
    const limit = query.limit ?? 50;
    const rows = text === ""
      ? this.db.prepare(`
          SELECT * FROM monster_library_entries
          ORDER BY updated_at DESC, name COLLATE NOCASE ASC
          LIMIT ?
        `).all(limit) as unknown as MonsterLibraryRow[]
      : this.db.prepare(`
          SELECT * FROM monster_library_entries
          WHERE name LIKE ? ESCAPE '\\'
             OR system LIKE ? ESCAPE '\\'
          ORDER BY name COLLATE NOCASE ASC
          LIMIT ?
        `).all(toLikePattern(text), toLikePattern(text), limit) as unknown as MonsterLibraryRow[];

    return rows.map(rowToEntry);
  }

  async findById(id: string): Promise<MonsterLibraryEntry | null> {
    const row = this.db.prepare("SELECT * FROM monster_library_entries WHERE id = ?").get(id) as unknown as MonsterLibraryRow | undefined;
    return row === undefined ? null : rowToEntry(row);
  }

  async save(entry: MonsterLibraryEntry): Promise<MonsterLibraryEntry> {
    this.db.prepare(`
      INSERT INTO monster_library_entries (
        id, name, system, template_id, content_markdown, image_path, created_at, updated_at
      ) VALUES (
        @id, @name, @system, @templateId, @contentMarkdown, @imagePath, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        system = excluded.system,
        template_id = excluded.template_id,
        content_markdown = excluded.content_markdown,
        image_path = excluded.image_path,
        updated_at = excluded.updated_at
    `).run({
      id: entry.id,
      name: entry.name,
      system: entry.system,
      templateId: entry.templateId,
      contentMarkdown: entry.contentMarkdown,
      imagePath: entry.imagePath,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    });

    return entry;
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    const currentVersion = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;

    if (currentVersion < 1) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS monster_library_entries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          system TEXT NOT NULL,
          template_id TEXT,
          content_markdown TEXT NOT NULL,
          image_path TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS monster_library_entries_name_idx
          ON monster_library_entries (name);

        CREATE INDEX IF NOT EXISTS monster_library_entries_system_idx
          ON monster_library_entries (system);

        PRAGMA user_version = 1;
      `);
    }
  }
}

function rowToEntry(row: MonsterLibraryRow): MonsterLibraryEntry {
  return {
    id: row.id,
    name: row.name,
    system: row.system,
    templateId: row.template_id,
    contentMarkdown: row.content_markdown,
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toLikePattern(input: string): string {
  const escaped = input.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}
