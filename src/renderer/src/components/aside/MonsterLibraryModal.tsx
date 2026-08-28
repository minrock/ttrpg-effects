import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import {
  createSceneMonsterFromLibraryEntry,
  type MonsterLibraryEntry
} from "../../../../domain/monster-library/monster-library";
import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
import { FeedbackAlert, type Feedback } from "./FeedbackAlert";
import { ImagePicker } from "./ImagePicker";
import { ModalBackdrop } from "./ModalBackdrop";

interface MonsterLibraryModalProps {
  readonly templates: readonly MonsterTemplate[];
  readonly existingIds: readonly string[];
  readonly onAddMonster: (monster: SceneMonster) => void;
  readonly onClose: () => void;
}

interface NewMonsterDraft {
  readonly name: string;
  readonly system: string;
  readonly templateId: string | null;
  readonly contentMarkdown: string;
  readonly imagePath: string | null;
  readonly imageUrl: string | null;
}

export function MonsterLibraryModal({
  templates,
  existingIds,
  onAddMonster,
  onClose
}: MonsterLibraryModalProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<readonly MonsterLibraryEntry[]>([]);
  const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<NewMonsterDraft>(() => createEmptyDraft(templates));

  const refresh = useCallback(async (text: string): Promise<void> => {
    if (window.ttrpg === undefined) {
      setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.ttrpg.searchMonsterLibrary({ text, limit: 60 });
      if (result.ok) {
        setEntries(result.entries);
        setFeedback(null);
        const resolved = await Promise.all(
          result.entries
            .filter((e) => e.imagePath !== null)
            .map(async (e) => {
              const url = await window.ttrpg?.resolveAsideUrl(e.imagePath!);
              return [e.id, url] as const;
            })
        );
        setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
      } else {
        setFeedback({ message: result.error, kind: "error" });
      }
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

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  function addEntryToScene(entry: MonsterLibraryEntry): void {
    onAddMonster(createSceneMonsterFromLibraryEntry(entry, existingIds));
    onClose();
  }

  function handleTemplateChange(templateId: string): void {
    if (templateId === "") {
      setDraft((current) => ({ ...current, templateId: null }));
      return;
    }

    const template = templateById.get(templateId);
    setDraft((current) => ({
      ...current,
      templateId,
      system: template?.system ?? current.system,
      contentMarkdown: current.contentMarkdown.trim() === "" ? template?.markdown ?? "" : current.contentMarkdown
    }));
  }

  async function saveNewMonster(): Promise<void> {
    if (window.ttrpg === undefined) {
      setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
      return;
    }

    if (draft.name.trim() === "") {
      setFeedback({ message: "El nombre del monstruo es requerido.", kind: "error" });
      return;
    }

    const result = await window.ttrpg.saveMonsterLibraryEntry({
      name: draft.name,
      system: draft.system.trim() === "" ? "Sin sistema" : draft.system,
      templateId: draft.templateId,
      contentMarkdown: draft.contentMarkdown,
      imagePath: draft.imagePath
    });

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
            <h2>Biblioteca de monstruos</h2>
            <p>Busca un monstruo existente o crea uno nuevo para guardarlo en la biblioteca.</p>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </header>

        {!isCreating ? (
          <>
            <div className="monster-library-modal__actions">
              <input
                autoFocus
                type="search"
                placeholder="Buscar por nombre o sistema"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              <button type="button" onClick={() => setIsCreating(true)}>
                Nuevo monstruo
              </button>
            </div>

            {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}

            <div className="monster-library-modal__grid" aria-busy={isLoading}>
              {entries.length === 0 ? (
                <div className="monster-library-modal__empty">
                  <strong>{isLoading ? "Buscando..." : "Sin monstruos en biblioteca"}</strong>
                  <span>Crea uno nuevo para reutilizarlo en futuras escenas.</span>
                  <button type="button" onClick={() => setIsCreating(true)}>Crear monstruo nuevo</button>
                </div>
              ) : entries.map((entry) => (
                <article key={entry.id} className="monster-library-card">
                  {imageUrls.get(entry.id) !== undefined
                    ? <img className="monster-library-card__image" src={imageUrls.get(entry.id)} alt="" />
                    : <div className="monster-library-card__image monster-library-card__image--placeholder" />}
                  <div className="monster-library-card__body">
                    <strong>{entry.name}</strong>
                    <span>{entry.system}{entry.templateId !== null ? ` · ${templateById.get(entry.templateId)?.name ?? entry.templateId}` : ""}</span>
                    <button type="button" onClick={() => addEntryToScene(entry)}>
                      Agregar a escena
                    </button>
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
              <div className="monster-library-modal__fields">
                <label>
                  Nombre
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => { const value = event.currentTarget.value; setDraft((current) => ({ ...current, name: value })); }}
                  />
                </label>
                <label>
                  Template
                  <select
                    value={draft.templateId ?? ""}
                    onChange={(event) => handleTemplateChange(event.currentTarget.value)}
                  >
                    <option value="">Sin template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.system})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sistema
                  <input
                    type="text"
                    value={draft.system}
                    onChange={(event) => { const value = event.currentTarget.value; setDraft((current) => ({ ...current, system: value })); }}
                  />
                </label>
              </div>
            </div>
            <label className="monster-library-modal__markdown">
              Markdown
              <textarea
                value={draft.contentMarkdown}
                onChange={(event) => { const value = event.currentTarget.value; setDraft((current) => ({ ...current, contentMarkdown: value })); }}
                spellCheck={false}
              />
            </label>
            {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}
            <div className="monster-library-modal__footer">
              <button type="button" onClick={() => setIsCreating(false)}>Volver</button>
              <button type="button" onClick={() => void saveNewMonster()}>Guardar y agregar</button>
            </div>
          </section>
        )}
      </div>
    </ModalBackdrop>
  );
}

function createEmptyDraft(templates: readonly MonsterTemplate[]): NewMonsterDraft {
  const defaultTemplate = templates[0] ?? null;

  return {
    name: "",
    system: defaultTemplate?.system ?? "Sin sistema",
    templateId: null,
    contentMarkdown: "",
    imagePath: null,
    imageUrl: null
  };
}
