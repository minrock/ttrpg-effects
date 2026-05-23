import { useMemo, useEffect, useState, type JSX } from "react";
import { marked } from "marked";
import type { SceneNpc } from "../../../../domain/sessions/scene-aside";
import { ModalBackdrop } from "./ModalBackdrop";

interface NpcDetailModalProps {
  readonly npc: SceneNpc;
  readonly onClose: () => void;
  readonly onToggleVisibility: () => void;
  readonly onEdit: () => void;
}

export function NpcDetailModal({
  npc,
  onClose,
  onToggleVisibility,
  onEdit
}: NpcDetailModalProps): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (npc.imagePath === null) { setImageUrl(null); return; }
    void window.ttrpg?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
  }, [npc.imagePath]);

  const notesHtml = useMemo(() => {
    if (npc.notes.trim() === "") return "";
    return marked.parse(npc.notes, { async: false }) as string;
  }, [npc.notes]);

  return (
    <ModalBackdrop onClose={onClose} large>
      {/* Header: image + name */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
        <div style={imgContainerStyle}>
          {imageUrl !== null
            ? <img src={imageUrl} alt={npc.name} style={imgStyle} />
            : <span style={{ fontSize: 44 }}>🧑</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={labelStyle}>NPC</div>
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#e0e0e0", lineHeight: 1.3, wordBreak: "break-word" }}>
            {npc.name}
          </h2>
          <div style={{ marginTop: 8 }}>
            <VisibilityBadge visible={npc.visibleToPlayer} />
          </div>
        </div>
      </div>

      {/* Notes */}
      {notesHtml !== "" && (
        <div style={notesSectionStyle}>
          <div style={labelStyle}>Notas</div>
          <div
            style={{ color: "#ccc", fontSize: 13, lineHeight: 1.65 }}
            dangerouslySetInnerHTML={{ __html: notesHtml }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={onToggleVisibility}
          style={npc.visibleToPlayer ? btnHide : btnShow}
        >
          {npc.visibleToPlayer ? "🚫 Ocultar de jugadores" : "👁 Mostrar a jugadores"}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onEdit} style={btnSecondary}>✏️ Editar</button>
        <button onClick={onClose} style={btnSecondary}>Cerrar</button>
      </div>
    </ModalBackdrop>
  );
}

function VisibilityBadge({ visible }: { visible: boolean }): JSX.Element {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 12,
      backgroundColor: visible ? "rgba(58,123,213,0.18)" : "rgba(255,255,255,0.05)",
      color: visible ? "#5a9bf5" : "#666",
      border: `1px solid ${visible ? "rgba(58,123,213,0.35)" : "#333"}`
    }}>
      {visible ? "👁 Visible en jugadores" : "🚫 Oculto"}
    </span>
  );
}

const imgContainerStyle: React.CSSProperties = {
  width: 100,
  height: 100,
  borderRadius: 8,
  overflow: "hidden",
  flexShrink: 0,
  backgroundColor: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #2a2a2a"
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const notesSectionStyle: React.CSSProperties = {
  backgroundColor: "#16181b",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  padding: "10px 12px",
  marginBottom: 4
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#555",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 4,
  fontWeight: 600
};

const btnShow: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 6,
  border: "none",
  backgroundColor: "#3a7bd5",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};

const btnHide: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 6,
  border: "1px solid #444",
  backgroundColor: "transparent",
  color: "#888",
  cursor: "pointer",
  fontSize: 13
};

const btnSecondary: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 5,
  border: "1px solid #333",
  backgroundColor: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: 13
};
