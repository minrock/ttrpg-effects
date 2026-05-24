import { useCallback, useEffect, useState, type JSX } from "react";
import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
import { ensureUniqueSlug, slugify } from "../../../../domain/sessions/scene-aside";
import { ImagePicker } from "./ImagePicker";
import { ModalBackdrop } from "./ModalBackdrop";

interface MonsterModalProps {
  readonly initial: SceneMonster | null;
  readonly existingIds: readonly string[];
  readonly templates: readonly MonsterTemplate[];
  readonly onSave: (monster: SceneMonster) => void;
  readonly onClose: () => void;
}

export function MonsterModal({ initial, existingIds, templates, onSave, onClose }: MonsterModalProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [templateId, setTemplateId] = useState<string | null>(initial?.templateId ?? null);
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

    onSave({ id, name: trimmed, imagePath, notes, templateId, visibleToPlayer: initial?.visibleToPlayer ?? false });
  }, [name, imagePath, notes, templateId, initial, existingIds, onSave]);

  const handleTemplateChange = useCallback((nextTemplateId: string): void => {
    if (nextTemplateId === "") {
      setTemplateId(null);
      return;
    }

    const template = templates.find((candidate) => candidate.id === nextTemplateId);
    if (template === undefined) return;

    const shouldReplace =
      notes.trim() === "" ||
      window.confirm("Las notas actuales tienen contenido. ¿Quieres reemplazarlas por el template seleccionado?");

    if (!shouldReplace) return;
    setTemplateId(template.id);
    setNotes(template.markdown);
  }, [notes, templates]);

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
        <label style={labelStyle}>Template</label>
        <select
          value={templateId ?? ""}
          onChange={(e) => handleTemplateChange(e.currentTarget.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        >
          <option value="">Sin template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.system})
            </option>
          ))}
        </select>
        <label style={labelStyle}>Notas</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
          spellCheck={false}
          style={notesTextareaStyle}
          placeholder="Markdown del monstruo"
        />
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
const notesTextareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 260,
  resize: "vertical",
  fontFamily: "\"SFMono-Regular\", Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.45
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "none",
  backgroundColor: "#3a7bd5", color: "#fff", cursor: "pointer", fontSize: 13
};
const btnSecondary: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "1px solid #333",
  backgroundColor: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13
};
