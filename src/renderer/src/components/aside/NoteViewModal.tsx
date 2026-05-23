import { useMemo, type JSX } from "react";
import { marked } from "marked";
import type { SceneNote } from "../../../../domain/sessions/scene-aside";
import { getNotePath } from "../../../../domain/sessions/scene-aside";
import { ModalBackdrop } from "./ModalBackdrop";

interface NoteViewModalProps {
  readonly note: SceneNote;
  readonly allNotes: readonly SceneNote[];
  readonly onClose: () => void;
  readonly onEdit: () => void;
}

export function NoteViewModal({ note, allNotes, onClose, onEdit }: NoteViewModalProps): JSX.Element {
  const breadcrumb = useMemo(() => getNotePath(allNotes, note.id), [allNotes, note.id]);

  const html = useMemo(() => {
    const raw = marked.parse(note.content, { async: false }) as string;
    return raw;
  }, [note.content]);

  return (
    <ModalBackdrop onClose={onClose} wide>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, fontFamily: "monospace" }}>
        {breadcrumb}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#e0e0e0" }}>{note.name}</h2>
        <button onClick={onEdit} style={btnSecondary}>Editar</button>
      </div>

      <div
        style={{
          color: "#ccc",
          fontSize: 14,
          lineHeight: 1.6
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnPrimary}>Cerrar</button>
      </div>
    </ModalBackdrop>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "none",
  backgroundColor: "#3a7bd5", color: "#fff", cursor: "pointer", fontSize: 13
};
const btnSecondary: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "1px solid #333",
  backgroundColor: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13
};
