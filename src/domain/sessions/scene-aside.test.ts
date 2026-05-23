import { beforeEach, describe, expect, it } from "vitest";
import {
  addMonster,
  addNote,
  addNpc,
  createDefaultSceneAside,
  ensureUniqueSlug,
  getChildNotes,
  getNotePath,
  getPlayerVisibleMonsters,
  getPlayerVisibleNpcs,
  getRootNotes,
  removeMonster,
  removeNote,
  removeNpc,
  SceneAsideError,
  slugify,
  updateMonster,
  updateNote,
  updateNpc,
  type SceneAside
} from "./scene-aside";

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe("slugify", () => {
  it("convierte a minúsculas", () => {
    expect(slugify("Goblin")).toBe("goblin");
  });

  it("reemplaza espacios por guiones", () => {
    expect(slugify("Goblin Jefe")).toBe("goblin-jefe");
  });

  it("colapsa guiones múltiples", () => {
    expect(slugify("goblin  jefe")).toBe("goblin-jefe");
  });

  it("elimina caracteres especiales", () => {
    expect(slugify("¡Dragón!")).toBe("dragon");
  });

  it("elimina acentos", () => {
    expect(slugify("Ogré Níquel")).toBe("ogre-niquel");
  });

  it("elimina guiones al inicio y al fin", () => {
    expect(slugify("  - goblin - ")).toBe("goblin");
  });

  it("devuelve cadena vacía para entrada sin caracteres válidos", () => {
    expect(slugify("¡¿!")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// ensureUniqueSlug
// ---------------------------------------------------------------------------

describe("ensureUniqueSlug", () => {
  it("devuelve la base si no hay colisión", () => {
    expect(ensureUniqueSlug("goblin", ["ogro", "liche"])).toBe("goblin");
  });

  it("agrega sufijo -2 en la primera colisión", () => {
    expect(ensureUniqueSlug("goblin", ["goblin", "ogro"])).toBe("goblin-2");
  });

  it("incrementa el sufijo si hay colisiones sucesivas", () => {
    expect(ensureUniqueSlug("goblin", ["goblin", "goblin-2", "goblin-3"])).toBe("goblin-4");
  });

  it("no modifica la base si la lista está vacía", () => {
    expect(ensureUniqueSlug("nota", [])).toBe("nota");
  });
});

// ---------------------------------------------------------------------------
// Monstruos
// ---------------------------------------------------------------------------

describe("addMonster / updateMonster / removeMonster", () => {
  const aside = createDefaultSceneAside();
  const monster = { id: "goblin", name: "Goblin", imagePath: null, visibleToPlayer: false, notes: "" };

  it("agrega un monstruo", () => {
    const result = addMonster(aside, monster);
    expect(result.monsters).toHaveLength(1);
    expect(result.monsters[0]).toEqual(monster);
  });

  it("actualiza un monstruo existente", () => {
    const withMonster = addMonster(aside, monster);
    const updated = { ...monster, name: "Goblin Jefe" };
    const result = updateMonster(withMonster, updated);
    expect(result.monsters[0]?.name).toBe("Goblin Jefe");
  });

  it("no modifica otros monstruos al actualizar", () => {
    const m2 = { id: "ogro", name: "Ogro", imagePath: null, visibleToPlayer: false, notes: "" };
    const withTwo = addMonster(addMonster(aside, monster), m2);
    const result = updateMonster(withTwo, { ...monster, name: "Nuevo" });
    expect(result.monsters[1]?.name).toBe("Ogro");
  });

  it("elimina un monstruo por id", () => {
    const withMonster = addMonster(aside, monster);
    const result = removeMonster(withMonster, "goblin");
    expect(result.monsters).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------

describe("addNpc / updateNpc / removeNpc", () => {
  const aside = createDefaultSceneAside();
  const npc = { id: "herrero", name: "Herrero", imagePath: "/img/herrero.png", visibleToPlayer: true, notes: "" };

  it("agrega un NPC", () => {
    const result = addNpc(aside, npc);
    expect(result.npcs).toHaveLength(1);
  });

  it("actualiza un NPC existente", () => {
    const withNpc = addNpc(aside, npc);
    const result = updateNpc(withNpc, { ...npc, name: "Herrero Mayor" });
    expect(result.npcs[0]?.name).toBe("Herrero Mayor");
  });

  it("elimina un NPC por id", () => {
    const withNpc = addNpc(aside, npc);
    const result = removeNpc(withNpc, "herrero");
    expect(result.npcs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Notas — invariante de dos niveles
// ---------------------------------------------------------------------------

describe("addNote", () => {
  let aside: SceneAside = createDefaultSceneAside();

  it("agrega una nota raíz", () => {
    const note = { id: "situacion", parentId: null, name: "Situación", content: "# Intro" };
    aside = addNote(aside, note);
    expect(aside.notes).toHaveLength(1);
  });

  it("agrega una nota hija de una nota raíz", () => {
    const child = { id: "habitacion-1", parentId: "situacion", name: "Habitación 1", content: "" };
    aside = addNote(aside, child);
    expect(aside.notes).toHaveLength(2);
  });

  it("rechaza agregar nota hija de una nota hija", () => {
    const grandchild = { id: "trampas", parentId: "habitacion-1", name: "Trampas", content: "" };
    expect(() => addNote(aside, grandchild)).toThrow(SceneAsideError);
    expect(() => addNote(aside, grandchild)).toThrow("Las notas solo admiten dos niveles.");
  });

  it("rechaza agregar nota hija con parentId que no existe", () => {
    const orphan = { id: "perdida", parentId: "inexistente", name: "Perdida", content: "" };
    expect(() => addNote(aside, orphan)).toThrow(SceneAsideError);
  });
});

// ---------------------------------------------------------------------------
// removeNote en cascada
// ---------------------------------------------------------------------------

describe("removeNote", () => {
  it("elimina la nota raíz y sus hijos", () => {
    let aside = createDefaultSceneAside();
    const root = { id: "root", parentId: null, name: "Raíz", content: "" };
    const child = { id: "hijo", parentId: "root", name: "Hijo", content: "" };
    const other = { id: "otra", parentId: null, name: "Otra", content: "" };
    aside = addNote(addNote(addNote(aside, root), child), other);
    const result = removeNote(aside, "root");
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.id).toBe("otra");
  });

  it("elimina solo la nota hija sin tocar el padre ni otras notas", () => {
    let aside = createDefaultSceneAside();
    const root = { id: "root", parentId: null, name: "Raíz", content: "" };
    const child = { id: "hijo", parentId: "root", name: "Hijo", content: "" };
    aside = addNote(addNote(aside, root), child);
    const result = removeNote(aside, "hijo");
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.id).toBe("root");
  });
});

// ---------------------------------------------------------------------------
// updateNote
// ---------------------------------------------------------------------------

describe("updateNote", () => {
  it("actualiza el contenido de una nota", () => {
    let aside = createDefaultSceneAside();
    const note = { id: "nota-1", parentId: null, name: "Nota 1", content: "original" };
    aside = addNote(aside, note);
    const result = updateNote(aside, { ...note, content: "actualizado" });
    expect(result.notes[0]?.content).toBe("actualizado");
  });
});

// ---------------------------------------------------------------------------
// getNotePath
// ---------------------------------------------------------------------------

describe("getNotePath", () => {
  let aside: SceneAside = createDefaultSceneAside();
  const root = { id: "escena", parentId: null, name: "Escena", content: "" };
  const child = { id: "entrada", parentId: "escena", name: "Entrada", content: "" };

  beforeEach(() => {
    aside = createDefaultSceneAside();
    aside = addNote(addNote(aside, root), child);
  });

  it('devuelve "/" para nota raíz', () => {
    expect(getNotePath(aside.notes, "escena")).toBe("/");
  });

  it("devuelve la ruta completa para nota hija", () => {
    expect(getNotePath(aside.notes, "entrada")).toBe("/ escena / entrada");
  });

  it('devuelve "/" para id que no existe', () => {
    expect(getNotePath(aside.notes, "inexistente")).toBe("/");
  });
});

// ---------------------------------------------------------------------------
// getRootNotes / getChildNotes
// ---------------------------------------------------------------------------

describe("getRootNotes / getChildNotes", () => {
  it("filtra correctamente raíces e hijos", () => {
    let aside = createDefaultSceneAside();
    aside = addNote(aside, { id: "a", parentId: null, name: "A", content: "" });
    aside = addNote(aside, { id: "b", parentId: null, name: "B", content: "" });
    aside = addNote(aside, { id: "a1", parentId: "a", name: "A1", content: "" });

    expect(getRootNotes(aside.notes)).toHaveLength(2);
    expect(getChildNotes(aside.notes, "a")).toHaveLength(1);
    expect(getChildNotes(aside.notes, "b")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Filtros de visibilidad de jugador
// ---------------------------------------------------------------------------

describe("getPlayerVisibleMonsters", () => {
  it("devuelve solo monstruos visibles con imagen", () => {
    const aside: SceneAside = {
      monsters: [
        { id: "a", name: "A", imagePath: "/img/a.png", visibleToPlayer: true, notes: "" },
        { id: "b", name: "B", imagePath: null, visibleToPlayer: true, notes: "" },
        { id: "c", name: "C", imagePath: "/img/c.png", visibleToPlayer: false, notes: "" }
      ],
      npcs: [],
      notes: []
    };
    const result = getPlayerVisibleMonsters(aside);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a");
  });
});

describe("getPlayerVisibleNpcs", () => {
  it("devuelve NPCs visibles (con o sin imagen)", () => {
    const aside: SceneAside = {
      monsters: [],
      npcs: [
        { id: "x", name: "X", imagePath: null, visibleToPlayer: true, notes: "" },
        { id: "y", name: "Y", imagePath: "/img/y.png", visibleToPlayer: false, notes: "" }
      ],
      notes: []
    };
    const result = getPlayerVisibleNpcs(aside);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("x");
  });
});
