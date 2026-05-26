import { describe, expect, it } from "vitest";
import {
  createNpcLibraryEntry,
  createPlayerCharacterLibraryEntry,
  createSceneNpcFromLibraryEntry,
  createScenePlayerCharacterFromLibraryEntry,
  normalizePlayerCharacterLibrarySaveInput
} from "./entity-library";

describe("entity library domain", () => {
  it("convierte una entrada de NPC a instancia portable de escena", () => {
    const npc = createSceneNpcFromLibraryEntry({
      id: "npc-1",
      name: "Herrero",
      imagePath: "/tmp/herrero.png",
      notes: "Aliado",
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:00:00.000Z"
    }, ["herrero"]);

    expect(npc).toEqual({
      id: "herrero-2",
      name: "Herrero",
      imagePath: "/tmp/herrero.png",
      visibleToPlayer: false,
      notes: "Aliado"
    });
  });

  it("crea una entrada persistente de NPC", () => {
    expect(createNpcLibraryEntry(
      { name: "  Tabernera  ", imagePath: "", notes: "Rumores" },
      { id: "npc-id", now: new Date("2026-05-25T12:00:00.000Z") }
    )).toMatchObject({
      id: "npc-id",
      name: "Tabernera",
      imagePath: null,
      notes: "Rumores"
    });
  });

  it("normaliza personajes jugadores y acepta CA con slash", () => {
    expect(normalizePlayerCharacterLibrarySaveInput({
      characterName: "  Goodel  ",
      armorClass: "15/18",
      stats: { strength: "10", constitution: "", dexterity: "+2" }
    })).toMatchObject({
      characterName: "Goodel",
      armorClass: "15/18",
      stats: {
        strength: "10",
        constitution: "",
        dexterity: "+2"
      }
    });
  });

  it("rechaza CA invalida", () => {
    expect(() => normalizePlayerCharacterLibrarySaveInput({
      characterName: "Goodel",
      armorClass: "15 + escudo"
    })).toThrow("La CA debe ser un numero o dos numeros separados por slash.");
  });

  it("convierte un personaje jugador a instancia portable de escena", () => {
    const entry = createPlayerCharacterLibraryEntry({
      characterName: "Goodel",
      playerName: "Luis",
      level: "5",
      species: "Goblin",
      classes: "Druida",
      armorClass: "15",
      stats: { strength: "+2", constitution: "+2", dexterity: "+3", intelligence: "+0", wisdom: "+4", charisma: "+1" }
    }, { id: "pc-id", now: new Date("2026-05-25T12:00:00.000Z") });

    expect(createScenePlayerCharacterFromLibraryEntry(entry, ["goodel"])).toMatchObject({
      id: "goodel-2",
      characterName: "Goodel",
      playerName: "Luis",
      armorClass: "15",
      classes: "Druida",
      stats: { wisdom: "+4" }
    });
  });
});
