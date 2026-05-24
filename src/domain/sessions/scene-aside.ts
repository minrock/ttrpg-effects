// -----------------------------------------------------------------------------
// Tipos de dominio del aside del DM (Monstruos, NPCs, Notas)
// -----------------------------------------------------------------------------

export interface SceneMonster {
  readonly id: string;
  readonly name: string;
  readonly imagePath: string | null;
  readonly visibleToPlayer: boolean;
  readonly notes: string;
  readonly templateId?: string | null;
}

export interface SceneNpc {
  readonly id: string;
  readonly name: string;
  readonly imagePath: string | null;
  readonly visibleToPlayer: boolean;
  readonly notes: string;
}

export interface SceneNote {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly content: string;
}

export interface SceneAside {
  readonly monsters: readonly SceneMonster[];
  readonly npcs: readonly SceneNpc[];
  readonly notes: readonly SceneNote[];
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createDefaultSceneAside(): SceneAside {
  return { monsters: [], npcs: [], notes: [] };
}

// -----------------------------------------------------------------------------
// Slugificación
// -----------------------------------------------------------------------------

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
}

export function ensureUniqueSlug(base: string, existing: readonly string[]): string {
  if (!existing.includes(base)) return base;
  let counter = 2;
  while (existing.includes(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

// -----------------------------------------------------------------------------
// Monstruos
// -----------------------------------------------------------------------------

export function addMonster(aside: SceneAside, monster: SceneMonster): SceneAside {
  return { ...aside, monsters: [...aside.monsters, monster] };
}

export function updateMonster(aside: SceneAside, updated: SceneMonster): SceneAside {
  return {
    ...aside,
    monsters: aside.monsters.map((m) => (m.id === updated.id ? updated : m))
  };
}

export function removeMonster(aside: SceneAside, id: string): SceneAside {
  return { ...aside, monsters: aside.monsters.filter((m) => m.id !== id) };
}

// -----------------------------------------------------------------------------
// NPCs
// -----------------------------------------------------------------------------

export function addNpc(aside: SceneAside, npc: SceneNpc): SceneAside {
  return { ...aside, npcs: [...aside.npcs, npc] };
}

export function updateNpc(aside: SceneAside, updated: SceneNpc): SceneAside {
  return {
    ...aside,
    npcs: aside.npcs.map((n) => (n.id === updated.id ? updated : n))
  };
}

export function removeNpc(aside: SceneAside, id: string): SceneAside {
  return { ...aside, npcs: aside.npcs.filter((n) => n.id !== id) };
}

// -----------------------------------------------------------------------------
// Notas
// -----------------------------------------------------------------------------

export class SceneAsideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneAsideError";
  }
}

export function addNote(aside: SceneAside, note: SceneNote): SceneAside {
  if (note.parentId !== null) {
    const parent = aside.notes.find((n) => n.id === note.parentId);
    if (parent === undefined) {
      throw new SceneAsideError(`La nota padre "${note.parentId}" no existe.`);
    }
    if (parent.parentId !== null) {
      throw new SceneAsideError("Las notas solo admiten dos niveles.");
    }
  }
  return { ...aside, notes: [...aside.notes, note] };
}

export function updateNote(aside: SceneAside, updated: SceneNote): SceneAside {
  return {
    ...aside,
    notes: aside.notes.map((n) => (n.id === updated.id ? updated : n))
  };
}

export function removeNote(aside: SceneAside, id: string): SceneAside {
  return {
    ...aside,
    notes: aside.notes.filter((n) => n.id !== id && n.parentId !== id)
  };
}

// -----------------------------------------------------------------------------
// Utilidades de notas
// -----------------------------------------------------------------------------

export function getNotePath(notes: readonly SceneNote[], noteId: string): string {
  const note = notes.find((n) => n.id === noteId);
  if (note === undefined) return "/";
  if (note.parentId === null) return "/";
  const parent = notes.find((n) => n.id === note.parentId);
  if (parent === undefined) return "/";
  return `/ ${parent.id} / ${note.id}`;
}

export function getRootNotes(notes: readonly SceneNote[]): readonly SceneNote[] {
  return notes.filter((n) => n.parentId === null);
}

export function getChildNotes(notes: readonly SceneNote[], parentId: string): readonly SceneNote[] {
  return notes.filter((n) => n.parentId === parentId);
}

// -----------------------------------------------------------------------------
// Filtros de visibilidad para jugador
// -----------------------------------------------------------------------------

export function getPlayerVisibleMonsters(aside: SceneAside): readonly SceneMonster[] {
  return aside.monsters.filter((m) => m.visibleToPlayer && m.imagePath !== null);
}

export function getPlayerVisibleNpcs(aside: SceneAside): readonly SceneNpc[] {
  return aside.npcs.filter((n) => n.visibleToPlayer);
}
