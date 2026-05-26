import { lazy, Suspense, useCallback, useEffect, useRef, useState, type JSX } from "react";
import {
  createScenePlayerCharacterFromLibraryEntry,
  type PlayerCharacterLibraryEntry,
  type PlayerCharacterLibrarySaveInput
} from "../../../../domain/entity-library/entity-library";
import type { AbilityScores, ScenePlayerCharacter } from "../../../../domain/sessions/scene-aside";
import { FeedbackAlert, type Feedback } from "./FeedbackAlert";
import { ImagePicker } from "./ImagePicker";
import { ModalBackdrop } from "./ModalBackdrop";
import { PlayerCharacterDetailModal } from "./PlayerCharacterDetailModal";

const NoteEditor = lazy(async () => {
  const mod = await import("./NoteEditor");
  return { default: mod.NoteEditor };
});

interface PlayerCharacterLibraryModalProps {
  readonly existingIds: readonly string[];
  readonly onAddCharacter: (character: ScenePlayerCharacter) => void;
  readonly onClose: () => void;
}

type PlayerDraft = Omit<PlayerCharacterLibrarySaveInput, "id"> & {
  readonly imageUrl: string | null;
  readonly stats: AbilityScores;
};

const emptyStats: AbilityScores = {
  strength: "",
  constitution: "",
  dexterity: "",
  intelligence: "",
  wisdom: "",
  charisma: ""
};

export function PlayerCharacterLibraryModal({
  existingIds,
  onAddCharacter,
  onClose
}: PlayerCharacterLibraryModalProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<readonly PlayerCharacterLibraryEntry[]>([]);
  const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<PlayerCharacterLibraryEntry | null>(null);
  const [draft, setDraft] = useState<PlayerDraft>(() => createEmptyDraft());

  const gridRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (text: string): Promise<void> => {
    if (window.ttrpg === undefined) {
      setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.ttrpg.searchPlayerCharacterLibrary({ text, limit: 60 });
      if (!result.ok) {
        setFeedback({ message: result.error, kind: "error" });
        return;
      }
      setEntries(result.entries);
      setFeedback(null);
      const resolved = await Promise.all(
        result.entries
          .filter((entry) => entry.imagePath !== null)
          .map(async (entry) => {
            const url = await window.ttrpg?.resolveAsideUrl(entry.imagePath!);
            return [entry.id, url] as const;
          })
      );
      setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh(query);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, refresh]);

  function addEntryToScene(entry: PlayerCharacterLibraryEntry): void {
    onAddCharacter(createScenePlayerCharacterFromLibraryEntry(entry, existingIds));
    onClose();
  }

  function openNewCharacterForm(): void {
    setDraft(createEmptyDraft());
    setEditingEntryId(null);
    setFeedback(null);
    setIsCreating(true);
  }

  function openEditCharacterForm(entry: PlayerCharacterLibraryEntry): void {
    setDraft(createDraftFromEntry(entry, imageUrls.get(entry.id) ?? null));
    setEditingEntryId(entry.id);
    setPreviewEntry(null);
    setFeedback(null);
    setIsCreating(true);
  }

  function closeForm(): void {
    setIsCreating(false);
    setEditingEntryId(null);
    setFeedback(null);
  }

  async function saveCharacterDraft(): Promise<void> {
    if (window.ttrpg === undefined) {
      setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
      return;
    }
    if ((draft.characterName ?? "").trim() === "") {
      setFeedback({ message: "El nombre del personaje es requerido.", kind: "error" });
      return;
    }

    const result = await window.ttrpg.savePlayerCharacterLibraryEntry({
      id: editingEntryId,
      characterName: draft.characterName,
      playerName: draft.playerName,
      level: draft.level,
      species: draft.species,
      classes: draft.classes,
      imagePath: draft.imagePath,
      stats: draft.stats,
      initiative: draft.initiative,
      armorClass: draft.armorClass,
      passivePerception: draft.passivePerception,
      hitPoints: draft.hitPoints,
      spellSaveDc: draft.spellSaveDc,
      speeds: draft.speeds,
      notes: draft.notes
    });

    if (!result.ok) {
      setFeedback({ message: result.error, kind: "error" });
      return;
    }

    if (editingEntryId !== null) {
      setEntries((current) => upsertEntry(current, result.entry));
      setImageUrls((current) => {
        const next = new Map(current);
        if (draft.imageUrl !== null) next.set(result.entry.id, draft.imageUrl);
        else next.delete(result.entry.id);
        return next;
      });
      setPreviewEntry(result.entry);
      setIsCreating(false);
      setEditingEntryId(null);
      setFeedback({ message: "Personaje actualizado en biblioteca.", kind: "success" });
      return;
    }

    addEntryToScene(result.entry);
  }

  return (
    <ModalBackdrop onClose={onClose} large>
      {/* Modal de lista — siempre montado, nunca se desmonta por el formulario */}
      <div className="monster-library-modal player-character-library-modal">
        <header className="monster-library-modal__header">
          <div>
            <h2>Biblioteca de personajes</h2>
            <p>Guarda personajes jugadores para agregarlos rapidamente a una escena.</p>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </header>

        <div className="monster-library-modal__actions">
          <input
            autoFocus
            type="search"
            placeholder="Buscar personaje o jugador"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <button type="button" onClick={openNewCharacterForm}>Nuevo personaje</button>
        </div>

        {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}

        <div className="monster-library-modal__grid" aria-busy={isLoading} ref={gridRef}>
          {entries.length === 0 ? (
            <div className="monster-library-modal__empty">
              <strong>{isLoading ? "Buscando..." : "Sin personajes en biblioteca"}</strong>
              <span>Crea uno nuevo para reutilizarlo en futuras escenas.</span>
              <button type="button" onClick={openNewCharacterForm}>Crear personaje nuevo</button>
            </div>
          ) : entries.map((entry) => (
            <article key={entry.id} className="monster-library-card">
              {imageUrls.get(entry.id) !== undefined
                ? <img className="monster-library-card__image" src={imageUrls.get(entry.id)} alt="" />
                : <div className="monster-library-card__image monster-library-card__image--placeholder" />}
              <div className="monster-library-card__body">
                <strong>{entry.characterName}</strong>
                <span>{[entry.playerName, entry.level && `Nivel ${entry.level}`, entry.species, entry.classes].filter(Boolean).join(" · ") || "Sin datos"}</span>
                <div className="monster-library-card__actions">
                  <button type="button" onClick={() => setPreviewEntry(entry)}>Ver / editar</button>
                  <button type="button" onClick={() => addEntryToScene(entry)}>Agregar a escena</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Modal de detalle — portal independiente, sin afectar el scroll de la lista */}
      {previewEntry !== null ? (
        <PlayerCharacterDetailModal
          character={createPreviewCharacter(previewEntry)}
          onClose={() => setPreviewEntry(null)}
          onEdit={() => openEditCharacterForm(previewEntry)}
          onAddToScene={() => addEntryToScene(previewEntry)}
        />
      ) : null}

      {/* Modal de formulario — portal independiente, no altera el scroll de la lista */}
      {isCreating ? (
        <ModalBackdrop onClose={closeForm} large>
          <div className="monster-library-modal player-character-library-modal">
            <header className="monster-library-modal__header">
              <h2>{editingEntryId === null ? "Nuevo personaje" : "Editar personaje"}</h2>
              <button type="button" onClick={closeForm}>Cerrar</button>
            </header>

            <section className="monster-library-modal__creator">
              <div className="player-character-form-grid">
                <ImagePicker
                  imageUrl={draft.imageUrl}
                  onImageSelected={(imagePath, imageUrl) => setDraft((current) => ({ ...current, imagePath, imageUrl }))}
                  onImageRemoved={() => setDraft((current) => ({ ...current, imagePath: null, imageUrl: null }))}
                />
                <div className="player-character-fields">
                  <Field label="Nombre del Personaje" value={draft.characterName ?? ""} onChange={(value) => updateDraft("characterName", value)} />
                  <Field label="Nombre del Jugador" value={draft.playerName ?? ""} onChange={(value) => updateDraft("playerName", value)} />
                  <Field label="Nivel" value={draft.level ?? ""} onChange={(value) => updateDraft("level", value)} />
                  <Field label="Especie" value={draft.species ?? ""} onChange={(value) => updateDraft("species", value)} />
                  <Field label="Clase(s)" value={draft.classes ?? ""} onChange={(value) => updateDraft("classes", value)} />
                  <Field label="Iniciativa" value={draft.initiative ?? ""} onChange={(value) => updateDraft("initiative", value)} />
                  <Field label="CA" value={draft.armorClass ?? ""} onChange={(value) => updateDraft("armorClass", value)} placeholder="15 o 15/18" />
                  <Field label="Percepcion Pasiva" value={draft.passivePerception ?? ""} onChange={(value) => updateDraft("passivePerception", value)} />
                  <Field label="Puntos de golpe" value={draft.hitPoints ?? ""} onChange={(value) => updateDraft("hitPoints", value)} />
                  <Field label="CD Salvacion de hechizos" value={draft.spellSaveDc ?? ""} onChange={(value) => updateDraft("spellSaveDc", value)} />
                  <Field label="Velocidad(es)" value={draft.speeds ?? ""} onChange={(value) => updateDraft("speeds", value)} />
                </div>
              </div>

              <div className="player-character-abilities">
                {[
                  ["Fuerza", "strength"],
                  ["Constitucion", "constitution"],
                  ["Destreza", "dexterity"],
                  ["Inteligencia", "intelligence"],
                  ["Sabiduria", "wisdom"],
                  ["Carisma", "charisma"]
                ].map(([label, key]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="text"
                      value={draft.stats[key as keyof AbilityScores]}
                      placeholder="+2"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setDraft((current) => ({
                          ...current,
                          stats: { ...current.stats, [key]: value }
                        }));
                      }}
                    />
                  </label>
                ))}
              </div>

              <label className="monster-library-modal__markdown">
                Notas
                <Suspense fallback={
                  <div className="player-character-notes-editor__loading">
                    Cargando editor...
                  </div>
                }>
                  <NoteEditor
                    initialContent={draft.notes ?? ""}
                    onChange={(value) => updateDraft("notes", value)}
                  />
                </Suspense>
              </label>

              {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}
              <div className="monster-library-modal__footer">
                <button type="button" onClick={closeForm}>Volver</button>
                <button
                  type="button"
                  onClick={() => {
                    saveCharacterDraft().catch((error: unknown) => {
                      setFeedback({ message: error instanceof Error ? error.message : "Error inesperado al guardar.", kind: "error" });
                    });
                  }}
                >
                  {editingEntryId === null ? "Guardar y agregar" : "Guardar cambios"}
                </button>
              </div>
            </section>
          </div>
        </ModalBackdrop>
      ) : null}
    </ModalBackdrop>
  );

  function updateDraft<K extends keyof PlayerDraft>(key: K, value: PlayerDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }
}

function createPreviewCharacter(entry: PlayerCharacterLibraryEntry): ScenePlayerCharacter {
  return {
    id: entry.id,
    characterName: entry.characterName,
    playerName: entry.playerName,
    level: entry.level,
    species: entry.species,
    classes: entry.classes,
    imagePath: entry.imagePath,
    stats: entry.stats,
    initiative: entry.initiative,
    armorClass: entry.armorClass,
    passivePerception: entry.passivePerception,
    hitPoints: entry.hitPoints,
    spellSaveDc: entry.spellSaveDc,
    speeds: entry.speeds,
    notes: entry.notes
  };
}

function upsertEntry(
  entries: readonly PlayerCharacterLibraryEntry[],
  nextEntry: PlayerCharacterLibraryEntry
): readonly PlayerCharacterLibraryEntry[] {
  const exists = entries.some((entry) => entry.id === nextEntry.id);
  if (!exists) return [nextEntry, ...entries];
  return entries.map((entry) => entry.id === nextEntry.id ? nextEntry : entry);
}

function createDraftFromEntry(entry: PlayerCharacterLibraryEntry, imageUrl: string | null): PlayerDraft {
  return {
    characterName: entry.characterName,
    playerName: entry.playerName,
    level: entry.level,
    species: entry.species,
    classes: entry.classes,
    imagePath: entry.imagePath,
    imageUrl,
    stats: entry.stats,
    initiative: entry.initiative,
    armorClass: entry.armorClass,
    passivePerception: entry.passivePerception,
    hitPoints: entry.hitPoints,
    spellSaveDc: entry.spellSaveDc,
    speeds: entry.speeds,
    notes: entry.notes
  };
}

function Field({ label, value, onChange, placeholder }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}): JSX.Element {
  return (
    <label>
      {label}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function createEmptyDraft(): PlayerDraft {
  return {
    characterName: "",
    playerName: "",
    level: "",
    species: "",
    classes: "",
    imagePath: null,
    imageUrl: null,
    stats: emptyStats,
    initiative: "",
    armorClass: "",
    passivePerception: "",
    hitPoints: "",
    spellSaveDc: "",
    speeds: "",
    notes: ""
  };
}
