import { useMemo, type JSX } from "react";
import { Edit3 } from "lucide-react";
import type { SceneNote } from "../../../../domain/sessions/scene-aside";
import { getNotePath } from "../../../../domain/sessions/scene-aside";
import { ModalBackdrop } from "./ModalBackdrop";
import { renderMarkdown } from "./markdown";

interface NoteViewModalProps {
  readonly note: SceneNote;
  readonly allNotes: readonly SceneNote[];
  readonly onClose: () => void;
  readonly onEdit: () => void;
}

export function NoteViewModal({ note, allNotes, onClose, onEdit }: NoteViewModalProps): JSX.Element {
  const breadcrumb = useMemo(() => getNotePath(allNotes, note.id), [allNotes, note.id]);
  const html = useMemo(() => renderMarkdown(note.content), [note.content]);

  return (
    <ModalBackdrop onClose={onClose} documentLayout>
      <div className="document-modal document-modal--preview">
        <header className="document-modal__context">
          <div>
            <small>Nota</small>
            <span>{breadcrumb}</span>
          </div>
          <button type="button" className="document-modal__icon-action" onClick={onEdit} title="Editar nota">
            <Edit3 aria-hidden="true" />
            <span>Editar</span>
          </button>
        </header>

        <main className="document-preview">
          <h1>{note.name}</h1>
          <div className="markdown-content document-preview__content" dangerouslySetInnerHTML={{ __html: html }} />
        </main>

        <footer className="document-modal__footer">
          <span />
          <button type="button" className="is-primary" onClick={onClose}>Cerrar</button>
        </footer>
      </div>
    </ModalBackdrop>
  );
}
