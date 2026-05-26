import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteEntityLibraryRepository } from "./sqlite-entity-library-repository";

describe("SqliteEntityLibraryRepository", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  function createRepository(): SqliteEntityLibraryRepository {
    const dir = mkdtempSync(join(tmpdir(), "ttrpg-entities-"));
    tempDirs.push(dir);
    return new SqliteEntityLibraryRepository(join(dir, "library.sqlite"));
  }

  function createDatabasePath(): string {
    const dir = mkdtempSync(join(tmpdir(), "ttrpg-entities-"));
    tempDirs.push(dir);
    return join(dir, "library.sqlite");
  }

  it("guarda, obtiene y busca NPCs", async () => {
    const repository = createRepository();

    await repository.saveNpc({
      id: "herrero",
      name: "Herrero",
      imagePath: null,
      notes: "Forja llaves",
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:00:00.000Z"
    });

    expect(await repository.findNpcById("herrero")).toMatchObject({ name: "Herrero" });
    expect(await repository.searchNpcs({ text: "forja", limit: 10 })).toHaveLength(1);
    repository.close();
  });

  it("guarda, obtiene y busca personajes jugadores", async () => {
    const repository = createRepository();

    await repository.savePlayerCharacter({
      id: "goodel",
      characterName: "Goodel",
      playerName: "Luis",
      level: "5",
      species: "Goblin",
      classes: "Druida",
      imagePath: null,
      stats: {
        strength: "+2",
        constitution: "+2",
        dexterity: "+3",
        intelligence: "+0",
        wisdom: "+4",
        charisma: "+1"
      },
      initiative: "+3",
      armorClass: "15/18",
      passivePerception: "18",
      hitPoints: "42",
      spellSaveDc: "16",
      speeds: "30 ft",
      notes: "",
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:00:00.000Z"
    });

    expect(await repository.findPlayerCharacterById("goodel")).toMatchObject({
      characterName: "Goodel",
      stats: { wisdom: "+4" }
    });
    expect(await repository.searchPlayerCharacters({ text: "luis", limit: 10 })).toHaveLength(1);
    repository.close();
  });

  it("migra personajes creados antes de separar especie y clase", async () => {
    const databasePath = createDatabasePath();
    const db = new DatabaseSync(databasePath);
    db.exec(`
      CREATE TABLE npc_library_entries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image_path TEXT,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE player_character_library_entries (
        id TEXT PRIMARY KEY,
        character_name TEXT NOT NULL,
        player_name TEXT NOT NULL,
        level TEXT NOT NULL,
        ancestry_and_classes TEXT NOT NULL,
        image_path TEXT,
        strength INTEGER,
        constitution INTEGER,
        dexterity INTEGER,
        intelligence INTEGER,
        wisdom INTEGER,
        charisma INTEGER,
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

      INSERT INTO player_character_library_entries (
        id, character_name, player_name, level, ancestry_and_classes, image_path,
        strength, constitution, dexterity, intelligence, wisdom, charisma,
        initiative, armor_class, passive_perception, hit_points, spell_save_dc, speeds,
        notes, created_at, updated_at
      ) VALUES (
        'legacy-pj', 'Legacy PJ', 'Ana', '4', 'Elfo Guerrero', NULL,
        10, 12, 14, 8, 13, 11,
        '+2', '16', '13', '31', '12', '30 ft',
        '| Stat | Valor |', '2026-05-25T12:00:00.000Z', '2026-05-25T12:00:00.000Z'
      );

      PRAGMA user_version = 2;
    `);
    db.close();

    const repository = new SqliteEntityLibraryRepository(databasePath);

    expect(await repository.findPlayerCharacterById("legacy-pj")).toMatchObject({
      characterName: "Legacy PJ",
      species: "Elfo Guerrero",
      classes: ""
    });

    await repository.savePlayerCharacter({
      id: "legacy-pj",
      characterName: "Legacy PJ",
      playerName: "Ana",
      level: "4",
      species: "Elfo",
      classes: "Guerrero",
      imagePath: null,
      stats: {
        strength: "+0",
        constitution: "+1",
        dexterity: "+2",
        intelligence: "-1",
        wisdom: "+1",
        charisma: "+0"
      },
      initiative: "+2",
      armorClass: "16",
      passivePerception: "13",
      hitPoints: "31",
      spellSaveDc: "12",
      speeds: "30 ft",
      notes: "| Stat | Valor |",
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:10:00.000Z"
    });

    expect(await repository.searchPlayerCharacters({ text: "Guerrero", limit: 10 })).toHaveLength(1);
    repository.close();
  });
});
