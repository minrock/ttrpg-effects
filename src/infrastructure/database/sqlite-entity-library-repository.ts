import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  EntityLibrarySearchQuery,
  NpcLibraryEntry,
  PlayerCharacterLibraryEntry
} from "../../domain/entity-library/entity-library";

interface NpcLibraryRow {
  readonly id: string;
  readonly name: string;
  readonly image_path: string | null;
  readonly notes: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface PlayerCharacterLibraryRow {
  readonly id: string;
  readonly character_name: string;
  readonly player_name: string;
  readonly level: string;
  readonly species: string;
  readonly classes: string;
  readonly image_path: string | null;
  readonly strength: string | number | null;
  readonly constitution: string | number | null;
  readonly dexterity: string | number | null;
  readonly intelligence: string | number | null;
  readonly wisdom: string | number | null;
  readonly charisma: string | number | null;
  readonly initiative: string;
  readonly armor_class: string;
  readonly passive_perception: string;
  readonly hit_points: string;
  readonly spell_save_dc: string;
  readonly speeds: string;
  readonly notes: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface TableInfoRow {
  readonly name: string;
  readonly type: string;
}

export class SqliteEntityLibraryRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.migrate();
  }

  async search(query: EntityLibrarySearchQuery): Promise<readonly NpcLibraryEntry[]> {
    return this.searchNpcs(query);
  }

  async findById(id: string): Promise<NpcLibraryEntry | null> {
    return this.findNpcById(id);
  }

  async save(entry: NpcLibraryEntry): Promise<NpcLibraryEntry> {
    return this.saveNpc(entry);
  }

  async searchNpcs(query: EntityLibrarySearchQuery): Promise<readonly NpcLibraryEntry[]> {
    const text = query.text.trim();
    const limit = query.limit ?? 50;
    const rows = text === ""
      ? this.db.prepare(`
          SELECT * FROM npc_library_entries
          ORDER BY updated_at DESC, name COLLATE NOCASE ASC
          LIMIT ?
        `).all(limit) as unknown as NpcLibraryRow[]
      : this.db.prepare(`
          SELECT * FROM npc_library_entries
          WHERE name LIKE ? ESCAPE '\\'
             OR notes LIKE ? ESCAPE '\\'
          ORDER BY name COLLATE NOCASE ASC
          LIMIT ?
        `).all(toLikePattern(text), toLikePattern(text), limit) as unknown as NpcLibraryRow[];

    return rows.map(rowToNpcEntry);
  }

  async findNpcById(id: string): Promise<NpcLibraryEntry | null> {
    const row = this.db.prepare("SELECT * FROM npc_library_entries WHERE id = ?").get(id) as unknown as NpcLibraryRow | undefined;
    return row === undefined ? null : rowToNpcEntry(row);
  }

  async saveNpc(entry: NpcLibraryEntry): Promise<NpcLibraryEntry> {
    this.db.prepare(`
      INSERT INTO npc_library_entries (
        id, name, image_path, notes, created_at, updated_at
      ) VALUES (
        @id, @name, @imagePath, @notes, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        image_path = excluded.image_path,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run({
      id: entry.id,
      name: entry.name,
      imagePath: entry.imagePath,
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    });

    return entry;
  }

  async searchPlayerCharacters(query: EntityLibrarySearchQuery): Promise<readonly PlayerCharacterLibraryEntry[]> {
    const text = query.text.trim();
    const limit = query.limit ?? 50;
    const rows = text === ""
      ? this.db.prepare(`
          SELECT * FROM player_character_library_entries
          ORDER BY updated_at DESC, character_name COLLATE NOCASE ASC
          LIMIT ?
        `).all(limit) as unknown as PlayerCharacterLibraryRow[]
      : this.db.prepare(`
          SELECT * FROM player_character_library_entries
          WHERE character_name LIKE ? ESCAPE '\\'
             OR player_name LIKE ? ESCAPE '\\'
             OR species LIKE ? ESCAPE '\\'
             OR classes LIKE ? ESCAPE '\\'
          ORDER BY character_name COLLATE NOCASE ASC
          LIMIT ?
        `).all(toLikePattern(text), toLikePattern(text), toLikePattern(text), toLikePattern(text), limit) as unknown as PlayerCharacterLibraryRow[];

    return rows.map(rowToPlayerCharacterEntry);
  }

  async findPlayerCharacterById(id: string): Promise<PlayerCharacterLibraryEntry | null> {
    const row = this.db.prepare("SELECT * FROM player_character_library_entries WHERE id = ?").get(id) as unknown as PlayerCharacterLibraryRow | undefined;
    return row === undefined ? null : rowToPlayerCharacterEntry(row);
  }

  async savePlayerCharacter(entry: PlayerCharacterLibraryEntry): Promise<PlayerCharacterLibraryEntry> {
    this.db.prepare(`
      INSERT INTO player_character_library_entries (
        id, character_name, player_name, level, species, classes, image_path,
        strength, constitution, dexterity, intelligence, wisdom, charisma,
        initiative, armor_class, passive_perception, hit_points, spell_save_dc, speeds,
        notes, created_at, updated_at
      ) VALUES (
        @id, @characterName, @playerName, @level, @species, @classes, @imagePath,
        @strength, @constitution, @dexterity, @intelligence, @wisdom, @charisma,
        @initiative, @armorClass, @passivePerception, @hitPoints, @spellSaveDc, @speeds,
        @notes, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        character_name = excluded.character_name,
        player_name = excluded.player_name,
        level = excluded.level,
        species = excluded.species,
        classes = excluded.classes,
        image_path = excluded.image_path,
        strength = excluded.strength,
        constitution = excluded.constitution,
        dexterity = excluded.dexterity,
        intelligence = excluded.intelligence,
        wisdom = excluded.wisdom,
        charisma = excluded.charisma,
        initiative = excluded.initiative,
        armor_class = excluded.armor_class,
        passive_perception = excluded.passive_perception,
        hit_points = excluded.hit_points,
        spell_save_dc = excluded.spell_save_dc,
        speeds = excluded.speeds,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run({
      id: entry.id,
      characterName: entry.characterName,
      playerName: entry.playerName,
      level: entry.level,
      species: entry.species,
      classes: entry.classes,
      imagePath: entry.imagePath,
      strength: entry.stats.strength,
      constitution: entry.stats.constitution,
      dexterity: entry.stats.dexterity,
      intelligence: entry.stats.intelligence,
      wisdom: entry.stats.wisdom,
      charisma: entry.stats.charisma,
      initiative: entry.initiative,
      armorClass: entry.armorClass,
      passivePerception: entry.passivePerception,
      hitPoints: entry.hitPoints,
      spellSaveDc: entry.spellSaveDc,
      speeds: entry.speeds,
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    });

    return entry;
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    let currentVersion = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (currentVersion < 2) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS npc_library_entries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          image_path TEXT,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS npc_library_entries_name_idx
          ON npc_library_entries (name);

        CREATE TABLE IF NOT EXISTS player_character_library_entries (
          id TEXT PRIMARY KEY,
          character_name TEXT NOT NULL,
          player_name TEXT NOT NULL,
          level TEXT NOT NULL,
          species TEXT NOT NULL,
          classes TEXT NOT NULL,
          image_path TEXT,
          strength TEXT NOT NULL DEFAULT '',
          constitution TEXT NOT NULL DEFAULT '',
          dexterity TEXT NOT NULL DEFAULT '',
          intelligence TEXT NOT NULL DEFAULT '',
          wisdom TEXT NOT NULL DEFAULT '',
          charisma TEXT NOT NULL DEFAULT '',
          initiative TEXT NOT NULL,
          armor_class TEXT NOT NULL,
          passive_perception TEXT NOT NULL,
          hit_points TEXT NOT NULL,
          spell_save_dc TEXT NOT NULL,
          speeds TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS player_character_library_entries_character_name_idx
          ON player_character_library_entries (character_name);

        CREATE INDEX IF NOT EXISTS player_character_library_entries_player_name_idx
          ON player_character_library_entries (player_name);

        PRAGMA user_version = 3;
      `);
      currentVersion = 3;
    }

    this.ensurePlayerCharacterSplitFields();

    currentVersion = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (currentVersion < 3) {
      this.db.exec("PRAGMA user_version = 3");
    }
  }

  private ensurePlayerCharacterSplitFields(): void {
    const columns = this.getTableColumns("player_character_library_entries");
    if (columns.size === 0) return;

    if (!columns.has("species")) {
      this.db.exec("ALTER TABLE player_character_library_entries ADD COLUMN species TEXT NOT NULL DEFAULT ''");
      columns.add("species");
    }

    if (!columns.has("classes")) {
      this.db.exec("ALTER TABLE player_character_library_entries ADD COLUMN classes TEXT NOT NULL DEFAULT ''");
      columns.add("classes");
    }

    if (columns.has("ancestry_and_classes")) {
      this.db.exec(`
        UPDATE player_character_library_entries
        SET species = ancestry_and_classes
        WHERE species = ''
          AND ancestry_and_classes IS NOT NULL
          AND ancestry_and_classes != ''
      `);
      this.rebuildLegacyPlayerCharacterTable();
      return;
    }

    // Si las columnas de stats tienen affinity INTEGER (schema antiguo),
    // SQLite convierte "+2" al entero 2 al guardar. Rebuild a TEXT los corrige.
    const statColumns = ["strength", "constitution", "dexterity", "intelligence", "wisdom", "charisma"];
    const columnTypes = this.getTableColumnTypeMap("player_character_library_entries");
    const hasIntegerStats = statColumns.some((col) => {
      const type = (columnTypes.get(col) ?? "").toUpperCase();
      return type !== "TEXT";
    });
    if (hasIntegerStats) {
      this.rebuildLegacyPlayerCharacterTable();
    }
  }

  private getTableColumnTypeMap(tableName: string): Map<string, string> {
    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as unknown as TableInfoRow[];
    return new Map(rows.map((row) => [row.name, row.type]));
  }

  private getTableColumns(tableName: string): Set<string> {
    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as unknown as TableInfoRow[];
    return new Set(rows.map((row) => row.name));
  }

  private rebuildLegacyPlayerCharacterTable(): void {
    this.db.exec(`
      CREATE TABLE player_character_library_entries_new (
        id TEXT PRIMARY KEY,
        character_name TEXT NOT NULL,
        player_name TEXT NOT NULL,
        level TEXT NOT NULL,
        species TEXT NOT NULL,
        classes TEXT NOT NULL,
        image_path TEXT,
        strength TEXT NOT NULL DEFAULT '',
        constitution TEXT NOT NULL DEFAULT '',
        dexterity TEXT NOT NULL DEFAULT '',
        intelligence TEXT NOT NULL DEFAULT '',
        wisdom TEXT NOT NULL DEFAULT '',
        charisma TEXT NOT NULL DEFAULT '',
        initiative TEXT NOT NULL,
        armor_class TEXT NOT NULL,
        passive_perception TEXT NOT NULL,
        hit_points TEXT NOT NULL,
        spell_save_dc TEXT NOT NULL,
        speeds TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO player_character_library_entries_new (
        id, character_name, player_name, level, species, classes, image_path,
        strength, constitution, dexterity, intelligence, wisdom, charisma,
        initiative, armor_class, passive_perception, hit_points, spell_save_dc, speeds,
        notes, created_at, updated_at
      )
      SELECT
        id, character_name, player_name, level, species, classes, image_path,
        strength, constitution, dexterity, intelligence, wisdom, charisma,
        initiative, armor_class, passive_perception, hit_points, spell_save_dc, speeds,
        notes, created_at, updated_at
      FROM player_character_library_entries;

      DROP TABLE player_character_library_entries;
      ALTER TABLE player_character_library_entries_new RENAME TO player_character_library_entries;

      CREATE INDEX IF NOT EXISTS player_character_library_entries_character_name_idx
        ON player_character_library_entries (character_name);

      CREATE INDEX IF NOT EXISTS player_character_library_entries_player_name_idx
        ON player_character_library_entries (player_name);
    `);
  }
}

function rowToNpcEntry(row: NpcLibraryRow): NpcLibraryEntry {
  return {
    id: row.id,
    name: row.name,
    imagePath: row.image_path,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToPlayerCharacterEntry(row: PlayerCharacterLibraryRow): PlayerCharacterLibraryEntry {
  return {
    id: row.id,
    characterName: row.character_name,
    playerName: row.player_name,
    level: row.level,
    species: row.species,
    classes: row.classes,
    imagePath: row.image_path,
    stats: {
      strength: stringifyDbText(row.strength),
      constitution: stringifyDbText(row.constitution),
      dexterity: stringifyDbText(row.dexterity),
      intelligence: stringifyDbText(row.intelligence),
      wisdom: stringifyDbText(row.wisdom),
      charisma: stringifyDbText(row.charisma)
    },
    initiative: row.initiative,
    armorClass: row.armor_class,
    passivePerception: row.passive_perception,
    hitPoints: row.hit_points,
    spellSaveDc: row.spell_save_dc,
    speeds: row.speeds,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toLikePattern(input: string): string {
  const escaped = input.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

function stringifyDbText(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return value >= 0 ? `+${value}` : String(value);
  return value;
}
