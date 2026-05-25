import { describe, expect, it } from "vitest";
import {
  createMonsterLibraryEntry,
  createSceneMonsterFromLibraryEntry,
  getMonsterLibraryPreview,
  normalizeMonsterLibrarySaveInput
} from "./monster-library";

describe("monster library domain", () => {
  it("normaliza payloads de guardado", () => {
    expect(normalizeMonsterLibrarySaveInput({
      name: "  Minotauro  ",
      system: " D&D 5.5e ",
      templateId: "",
      contentMarkdown: "# Minotauro",
      imagePath: ""
    })).toEqual({
      id: null,
      name: "Minotauro",
      system: "D&D 5.5e",
      templateId: null,
      contentMarkdown: "# Minotauro",
      imagePath: null
    });
  });

  it("crea una entrada persistente con fechas ISO", () => {
    const entry = createMonsterLibraryEntry(
      { name: "Liche", system: "D&D", contentMarkdown: "# Liche" },
      { id: "liche", now: new Date("2026-05-24T12:00:00.000Z") }
    );

    expect(entry).toMatchObject({
      id: "liche",
      name: "Liche",
      system: "D&D",
      contentMarkdown: "# Liche",
      createdAt: "2026-05-24T12:00:00.000Z",
      updatedAt: "2026-05-24T12:00:00.000Z"
    });
  });

  it("convierte una entrada a instancia portable de escena", () => {
    const monster = createSceneMonsterFromLibraryEntry({
      id: "dragon",
      name: "Dragón rojo",
      system: "D&D",
      templateId: "dnd-55e-statblock",
      contentMarkdown: "# Dragón rojo",
      imagePath: null,
      createdAt: "2026-05-24T12:00:00.000Z",
      updatedAt: "2026-05-24T12:00:00.000Z"
    }, ["dragon-rojo"]);

    expect(monster).toEqual({
      id: "dragon-rojo-2",
      name: "Dragón rojo",
      imagePath: null,
      visibleToPlayer: false,
      notes: "# Dragón rojo",
      templateId: "dnd-55e-statblock"
    });
  });

  it("extrae preview legible desde markdown", () => {
    expect(getMonsterLibraryPreview("# Goblin\n\n**CA** 15")).toBe("Goblin");
  });
});
