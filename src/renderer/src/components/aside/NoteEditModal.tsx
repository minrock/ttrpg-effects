import { lazy, Suspense, useCallback, useMemo, useState, type JSX } from "react";
import type { SceneNote } from "../../../../domain/sessions/scene-aside";
import { ensureUniqueSlug, getNotePath, slugify } from "../../../../domain/sessions/scene-aside";
import { ModalBackdrop } from "./ModalBackdrop";

const NoteEditor = lazy(async () => {
  const mod = await import("./NoteEditor");
  return { default: mod.NoteEditor };
});

interface NoteEditModalProps {
  readonly initial: SceneNote | null;
  readonly parentId: string | null;
  readonly allNotes: readonly SceneNote[];
  readonly existingIdsAtLevel: readonly string[];
  readonly onSave: (note: SceneNote) => void;
  readonly onClose: () => void;
}

export function NoteEditModal({
  initial,
  parentId,
  allNotes,
  existingIdsAtLevel,
  onSave,
  onClose
}: NoteEditModalProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const slug = useMemo(() => slugify(name), [name]);

  const breadcrumb = useMemo(() => {
    if (initial !== null) return getNotePath(allNotes, initial.id);
    if (parentId === null) return "/";
    const parent = allNotes.find((note) => note.id === parentId);
    return parent !== undefined ? `/ ${parent.id} / ...` : "/";
  }, [initial, parentId, allNotes]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed === "" || slug === "") return;
    const otherIds = initial !== null
      ? existingIdsAtLevel.filter((id) => id !== initial.id)
      : existingIdsAtLevel;
    const id = initial?.id ?? ensureUniqueSlug(slug, otherIds);
    onSave({ id, parentId: initial?.parentId ?? parentId, name: trimmed, content });
  }, [name, slug, content, initial, parentId, existingIdsAtLevel, onSave]);

  return (
    <ModalBackdrop onClose={onClose} documentLayout>
      <div className="document-modal">
        <header className="document-modal__context">
          <div>
            <small>{initial !== null ? "Editar nota" : parentId !== null ? "Nueva nota hija" : "Nueva nota"}</small>
            <span>{breadcrumb}</span>
          </div>
          <span className="document-modal__slug">{slug === "" ? "Define un titulo" : `/${slug}`}</span>
        </header>

        <main className="document-modal__body">
          <Suspense fallback={<div className="document-modal__loading">Cargando editor...</div>}>
            <NoteEditor
              initialContent={content}
              onChange={setContent}
              variant="document"
              placeholder="Escribe la informacion de la nota aqui..."
              titleField={(
                <input
                  autoFocus
                  className="note-editor__title"
                  aria-label="Nombre de la nota"
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  placeholder="Titulo de la nota"
                />
              )}
            />
          </Suspense>
        </main>

        <footer className="document-modal__footer">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="button" className="is-primary" onClick={handleSave} disabled={name.trim() === "" || slug === ""}>
            Guardar
          </button>
        </footer>
      </div>
    </ModalBackdrop>
  );
}
