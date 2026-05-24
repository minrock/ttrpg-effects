import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteMonsterLibraryRepository } from "./sqlite-monster-library-repository";

describe("SqliteMonsterLibraryRepository", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  function createRepository(): SqliteMonsterLibraryRepository {
    const dir = mkdtempSync(join(tmpdir(), "ttrpg-monsters-"));
    tempDirs.push(dir);
    return new SqliteMonsterLibraryRepository(join(dir, "library.sqlite"));
  }

  it("guarda, obtiene y busca monstruos con SQLite", async () => {
    const repository = createRepository();

    await repository.save({
      id: "minotauro",
      name: "Minotauro esqueleto",
      system: "D&D 5.5e",
      templateId: "dnd-55e-statblock",
      contentMarkdown: "# Minotauro esqueleto",
      imagePath: null,
      createdAt: "2026-05-24T12:00:00.000Z",
      updatedAt: "2026-05-24T12:00:00.000Z"
    });

    expect(await repository.findById("minotauro")).toMatchObject({
      name: "Minotauro esqueleto",
      templateId: "dnd-55e-statblock"
    });
    expect(await repository.search({ text: "mino", limit: 10 })).toHaveLength(1);

    repository.close();
  });
});
