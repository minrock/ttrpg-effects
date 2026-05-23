import { lazy, Suspense, useCallback, useEffect, useState, type JSX } from "react";
import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
import { ensureUniqueSlug, slugify } from "../../../../domain/sessions/scene-aside";
import { ImagePicker } from "./ImagePicker";
import { ModalBackdrop } from "./ModalBackdrop";

const NoteEditor = lazy(async () => {
  const mod = await import("./NoteEditor");
  return { default: mod.NoteEditor };
});

interface MonsterModalProps {
  readonly initial: SceneMonster | null;
  readonly existingIds: readonly string[];
  readonly onSave: (monster: SceneMonster) => void;
  readonly onClose: () => void;
}

export function MonsterModal({ initial, existingIds, onSave, onClose }: MonsterModalProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [imagePath, setImagePath] = useState<string | null>(initial?.imagePath ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initial?.imagePath !== undefined && initial.imagePath !== null) {
      void window.ttrpg?.resolveAsideUrl(initial.imagePath).then((url) => {
        setImageUrl(url ?? null);
      });
    }
  }, [initial?.imagePath]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    const base = slugify(trimmed);
    if (base === "") return;

    const othersIds = initial !== null
      ? existingIds.filter((id) => id !== initial.id)
      : existingIds;
    const id = initial?.id ?? ensureUniqueSlug(base, othersIds);

    onSave({ id, name: trimmed, imagePath, notes, visibleToPlayer: initial?.visibleToPlayer ?? false });
  }, [name, imagePath, notes, initial, existingIds, onSave]);

  return (
    <ModalBackdrop onClose={onClose} wide>
      <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", color: "#e0e0e0" }}>
        {initial !== null ? "Editar monstruo" : "Nuevo monstruo"}
      </h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <ImagePicker
          imageUrl={imageUrl}
          onImageSelected={(path, url) => { setImagePath(path); setImageUrl(url); }}
          onImageRemoved={() => { setImagePath(null); setImageUrl(null); }}
        />
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Nombre</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Nombre del monstruo"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Notas</label>
        <Suspense fallback={
          <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13 }}>
            Cargando editor…
          </div>
        }>
          <NoteEditor initialContent={notes} onChange={setNotes} />
        </Suspense>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={handleSave} disabled={name.trim() === ""} style={btnPrimary}>
          Guardar
        </button>
      </div>
    </ModalBackdrop>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#888", marginBottom: 4
};
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
