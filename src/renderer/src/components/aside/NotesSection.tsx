import { useCallback, useState, type JSX } from "react";
import type { SceneNote } from "../../../../domain/sessions/scene-aside";
import {
  getChildNotes,
  getRootNotes
} from "../../../../domain/sessions/scene-aside";
import { NoteEditModal } from "./NoteEditModal";
import { NoteViewModal } from "./NoteViewModal";

interface NotesSectionProps {
  readonly notes: readonly SceneNote[];
  readonly onAdd: (note: SceneNote) => void;
  readonly onUpdate: (note: SceneNote) => void;
  readonly onRemove: (id: string) => void;
}

type NoteModalState =
  | { kind: "closed" }
  | { kind: "edit"; note: SceneNote | null; parentId: string | null }
  | { kind: "view"; note: SceneNote };

export function NotesSection({ notes, onAdd, onUpdate, onRemove }: NotesSectionProps): JSX.Element {
  const [modal, setModal] = useState<NoteModalState>({ kind: "closed" });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; hasChildren: boolean } | null>(null);

  const rootNotes = getRootNotes(notes);

  const existingRootIds = rootNotes.map((n) => n.id);

  const handleSave = useCallback(
    (note: SceneNote) => {
      const exists = notes.some((n) => n.id === note.id);
      if (exists) onUpdate(note);
      else onAdd(note);
      setModal({ kind: "closed" });
    },
    [notes, onAdd, onUpdate]
  );

  const handleRequestDelete = useCallback(
    (id: string) => {
      const children = getChildNotes(notes, id);
      setConfirmDelete({ id, hasChildren: children.length > 0 });
    },
    [notes]
  );

  const handleConfirmDelete = useCallback(() => {
    if (confirmDelete !== null) {
      onRemove(confirmDelete.id);
      setConfirmDelete(null);
    }
  }, [confirmDelete, onRemove]);

  return (
    <div>
      {rootNotes.map((root) => {
        const children = getChildNotes(notes, root.id);
        return (
          <div key={root.id}>
            <NoteRow
              note={root}
              isChild={false}
              onView={() => setModal({ kind: "view", note: root })}
              onEdit={() => {
                const siblingIds = existingRootIds;
                setModal({ kind: "edit", note: root, parentId: null });
                void siblingIds;
              }}
              onAddChild={() => setModal({ kind: "edit", note: null, parentId: root.id })}
              onRemove={() => handleRequestDelete(root.id)}
            />
            {children.map((child) => (
              <NoteRow
                key={child.id}
                note={child}
                isChild
                onView={() => setModal({ kind: "view", note: child })}
                onEdit={() => setModal({ kind: "edit", note: child, parentId: root.id })}
                onAddChild={null}
                onRemove={() => {
                  setConfirmDelete({ id: child.id, hasChildren: false });
                }}
              />
            ))}
          </div>
        );
      })}

      <button onClick={() => setModal({ kind: "edit", note: null, parentId: null })} style={addBtnStyle}>
        + Agregar nota
      </button>

      {modal.kind === "edit" && (
        <NoteEditModal
          initial={modal.note}
          parentId={modal.parentId}
          allNotes={notes}
          existingIdsAtLevel={
            modal.parentId === null
              ? existingRootIds
              : getChildNotes(notes, modal.parentId).map((n) => n.id)
          }
          onSave={handleSave}
          onClose={() => setModal({ kind: "closed" })}
        />
      )}

      {modal.kind === "view" && (
        <NoteViewModal
          note={modal.note}
          allNotes={notes}
          onClose={() => setModal({ kind: "closed" })}
          onEdit={() => {
            const note = modal.note;
            setModal({ kind: "edit", note, parentId: note.parentId });
          }}
        />
      )}

      {confirmDelete !== null && (
        <ConfirmDelete
          message={
            confirmDelete.hasChildren
              ? "Esta nota tiene notas hijas. ¿Eliminar la nota y todas sus hijas?"
              : "¿Eliminar esta nota?"
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function NoteRow({ note, isChild, onView, onEdit, onAddChild, onRemove }: {
  note: SceneNote;
  isChild: boolean;
  onView: () => void;
  onEdit: () => void;
  onAddChild: (() => void) | null;
  onRemove: () => void;
}): JSX.Element {
  return (
    <div style={{ ...rowStyle, paddingLeft: isChild ? 20 : 2 }}>
      {isChild && <span style={{ color: "#444", fontSize: 12, marginRight: 2 }}>↳</span>}
      <span style={{ flex: 1, fontSize: 13, color: isChild ? "#aaa" : "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {note.name}
      </span>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={onView} style={iconBtn} title="Ver">📄</button>
        <button onClick={onEdit} style={iconBtn} title="Editar">✏️</button>
        {onAddChild !== null && (
          <button onClick={onAddChild} style={iconBtn} title="Agregar nota hija">➕</button>
        )}
        <button onClick={onRemove} style={iconBtn} title="Eliminar">🗑️</button>
      </div>
    </div>
  );
}

function ConfirmDelete({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}): JSX.Element {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ backgroundColor: "#1e2025", border: "1px solid #333", borderRadius: 8, padding: 20, maxWidth: 340, textAlign: "center" }}>
        <p style={{ color: "#ddd", margin: "0 0 16px", fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "6px 14px", borderRadius: 5, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "6px 14px", borderRadius: 5, border: "none", backgroundColor: "#a33", color: "#fff", cursor: "pointer", fontSize: 13 }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "5px 2px", borderBottom: "1px solid #222" };
const addBtnStyle: React.CSSProperties = { marginTop: 8, width: "100%", padding: "5px 0", borderRadius: 5, border: "1px dashed #333", backgroundColor: "transparent", color: "#666", cursor: "pointer", fontSize: 12 };
const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: "2px 3px", fontSize: 13, lineHeight: 1 };
