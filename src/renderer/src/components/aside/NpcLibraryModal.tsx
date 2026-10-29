import { useTtrpgApi } from "../../client/ClientProvider";
import { lazy, Suspense, useEffect, useRef, useState, type JSX } from "react";
import {
  createSceneNpcFromLibraryEntry,
  type NpcLibraryEntry
} from "../../../../domain/entity-library/entity-library";
import type { SceneNpc } from "../../../../domain/sessions/scene-aside";
import { FeedbackAlert, type Feedback } from "./FeedbackAlert";
import { ImagePicker } from "./ImagePicker";
import { ModalBackdrop } from "./ModalBackdrop";

const NoteEditor = lazy(async () => {
  const mod = await import("./NoteEditor");
  return { default: mod.NoteEditor };
});

interface NpcLibraryModalProps {
  readonly existingIds: readonly string[];
  readonly onAddNpc: (npc: SceneNpc) => void;
  readonly onClose: () => void;
}

interface NewNpcDraft {
  readonly name: string;
  readonly imagePath: string | null;
  readonly imageUrl: string | null;
  readonly notes: string;
}

export function NpcLibraryModal({ existingIds, onAddNpc, onClose }: NpcLibraryModalProps): JSX.Element {
  const librariesApi = useTtrpgApi("libraries");
  const imagesApi = useTtrpgApi("images");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<readonly NpcLibraryEntry[]>([]);
  const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<NewNpcDraft>({ name: "", imagePath: null, imageUrl: null, notes: "" });

  const libraryGeneration = useRef(0);
  useEffect(() => {
    libraryGeneration.current++;
    setIsCreating(false);
    setDraft({ name: "", imagePath: null, imageUrl: null, notes: "" });
    return () => { libraryGeneration.current++; };
  }, [librariesApi, imagesApi]);

  useEffect(() => {
    let cancelled = false;
    setEntries([]);
    setImageUrls(new Map());
    setFeedback(null);
    setIsLoading(librariesApi !== undefined);
    if (librariesApi === undefined) {
      setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
      return;
    }
    async function refresh(): Promise<void> {
      try {
        const result = await librariesApi!.searchNpcLibrary({ text: query, limit: 60 });
        if (cancelled) return;
        if (!result.ok) {
          setFeedback({ message: result.error, kind: "error" });
          return;
        }
        setEntries(result.entries);
        const resolved = await Promise.all(result.entries
          .filter((entry) => entry.imagePath !== null)
          .map(async (entry) => [entry.id, await imagesApi?.resolveAsideUrl(entry.imagePath!)] as const));
        if (cancelled) return;
        setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
      } catch (error) {
        if (!cancelled) setFeedback({ message: error instanceof Error ? error.message : "No se pudo consultar la biblioteca.", kind: "error" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    const handle = window.setTimeout(() => { void refresh(); }, 180);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [query, librariesApi, imagesApi]);

  function addEntryToScene(entry: NpcLibraryEntry): void {
    onAddNpc(createSceneNpcFromLibraryEntry(entry, existingIds));
    onClose();
  }

  async function saveNewNpc(): Promise<void> {
    if (librariesApi === undefined) {
      setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
      return;
    }
    if (draft.name.trim() === "") {
      setFeedback({ message: "El nombre del NPC es requerido.", kind: "error" });
      return;
    }

    const generation = libraryGeneration.current;
    const result = await librariesApi.saveNpcLibraryEntry({
      name: draft.name,
      imagePath: draft.imagePath,
      notes: draft.notes
    });
    if (generation !== libraryGeneration.current) return;

    if (!result.ok) {
      setFeedback({ message: result.error, kind: "error" });
      return;
    }

    addEntryToScene(result.entry);
  }

  return (
    <ModalBackdrop onClose={onClose} large>
      <div className="monster-library-modal">
        <header className="monster-library-modal__header">
          <div>
            <h2>Biblioteca de NPCs</h2>
            <p>Busca un NPC existente o crea uno nuevo para reutilizarlo.</p>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </header>

        {!isCreating ? (
          <>
            <div className="monster-library-modal__actions">
              <input
                autoFocus
                type="search"
                placeholder="Buscar NPC"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              <button type="button" onClick={() => setIsCreating(true)}>Nuevo NPC</button>
            </div>

            {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}

            <div className="monster-library-modal__grid" aria-busy={isLoading}>
              {entries.length === 0 ? (
                <div className="monster-library-modal__empty">
                  <strong>{isLoading ? "Buscando..." : "Sin NPCs en biblioteca"}</strong>
                  <span>Crea uno nuevo para reutilizarlo en futuras escenas.</span>
                  <button type="button" onClick={() => setIsCreating(true)}>Crear NPC nuevo</button>
                </div>
              ) : entries.map((entry) => (
                <article key={entry.id} className="monster-library-card">
                  {imageUrls.get(entry.id) !== undefined
                    ? <img className="monster-library-card__image" src={imageUrls.get(entry.id)} alt="" />
                    : <div className="monster-library-card__image monster-library-card__image--placeholder" />}
                  <div className="monster-library-card__body">
                    <strong>{entry.name}</strong>
                    <span>{entry.notes.trim() === "" ? "Sin notas" : entry.notes.replace(/[#*_`>|-]/g, "").slice(0, 80)}</span>
                    <button type="button" onClick={() => addEntryToScene(entry)}>Agregar a escena</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <section className="monster-library-modal__creator">
            <div className="monster-library-modal__creator-grid">
              <ImagePicker
                imageUrl={draft.imageUrl}
                onImageSelected={(imagePath, imageUrl) => setDraft((current) => ({ ...current, imagePath, imageUrl }))}
                onImageRemoved={() => setDraft((current) => ({ ...current, imagePath: null, imageUrl: null }))}
              />
              <div className="monster-library-modal__fields monster-library-modal__fields--single">
                <label>
                  Nombre
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => { const value = event.currentTarget.value; setDraft((current) => ({ ...current, name: value })); }}
                  />
                </label>
              </div>
            </div>
            <label className="monster-library-modal__markdown">
              Notas
              <Suspense fallback={<div className="document-modal__loading">Cargando editor...</div>}>
                <NoteEditor
                  initialContent={draft.notes}
                  onChange={(notes) => setDraft((current) => ({ ...current, notes }))}
                />
              </Suspense>
            </label>
            {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}
            <div className="monster-library-modal__footer">
              <button type="button" onClick={() => setIsCreating(false)}>Volver</button>
              <button type="button" onClick={() => void saveNewNpc()}>Guardar y agregar</button>
            </div>
          </section>
        )}
      </div>
    </ModalBackdrop>
  );
}
