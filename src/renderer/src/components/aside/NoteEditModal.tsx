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
    const parent = allNotes.find((n) => n.id === parentId);
    return parent !== undefined ? `/ ${parent.id} / …` : "/";
  }, [initial, parentId, allNotes]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed === "" || slug === "") return;

    const othersIds = initial !== null
      ? existingIdsAtLevel.filter((id) => id !== initial.id)
      : existingIdsAtLevel;
    const id = initial?.id ?? ensureUniqueSlug(slug, othersIds);

    onSave({ id, parentId: initial?.parentId ?? parentId, name: trimmed, content });
  }, [name, slug, content, initial, parentId, existingIdsAtLevel, onSave]);

  return (
    <ModalBackdrop onClose={onClose} wide>
      {/* Breadcrumb */}
      <div style={{ fontSize: 11, color: "#666", marginBottom: 12, fontFamily: "monospace" }}>
        {breadcrumb}
      </div>

      <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", color: "#e0e0e0" }}>
        {initial !== null ? "Editar nota" : parentId !== null ? "Nueva nota hija" : "Nueva nota"}
      </h2>

      {/* Nombre + slug */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Nombre</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder="Nombre de la nota"
        />
        <div style={{ fontSize: 11, color: "#555", marginTop: 4, fontFamily: "monospace" }}>
          slug: {slug !== "" ? slug : <span style={{ color: "#833" }}>nombre inválido</span>}
        </div>
      </div>

      {/* Editor WYSIWYG */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Contenido</label>
        <Suspense fallback={
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13 }}>
            Cargando editor…
          </div>
        }>
          <NoteEditor initialContent={content} onChange={setContent} />
        </Suspense>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={handleSave} disabled={name.trim() === "" || slug === ""} style={btnPrimary}>
          Guardar
        </button>
      </div>
    </ModalBackdrop>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, color: "#888", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #333",
  backgroundColor: "#1a1c1e", color: "#e0e0e0", fontSize: 13, boxSizing: "border-box"
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "none",
  backgroundColor: "#3a7bd5", color: "#fff", cursor: "pointer", fontSize: 13
};
const btnSecondary: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "1px solid #333",
  backgroundColor: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13
};
