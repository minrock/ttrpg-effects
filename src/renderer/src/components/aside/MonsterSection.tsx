import { useCallback, useEffect, useState, type JSX } from "react";
import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
import { MonsterDetailModal } from "./MonsterDetailModal";
import { MonsterModal } from "./MonsterModal";

interface MonsterSectionProps {
  readonly monsters: readonly SceneMonster[];
  readonly templates: readonly MonsterTemplate[];
  readonly onAdd: (m: SceneMonster) => void;
  readonly onUpdate: (m: SceneMonster) => void;
  readonly onRemove: (id: string) => void;
  readonly onToggleVisibility: (id: string) => void;
}

export function MonsterSection({
  monsters,
  templates,
  onAdd,
  onUpdate,
  onRemove,
  onToggleVisibility
}: MonsterSectionProps): JSX.Element {
  const [detailMonster, setDetailMonster] = useState<SceneMonster | null>(null);
  const [editingMonster, setEditingMonster] = useState<SceneMonster | null | "new">(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSave = useCallback(
    (m: SceneMonster) => {
      if (editingMonster === "new") onAdd(m);
      else onUpdate(m);
      setEditingMonster(null);
    },
    [editingMonster, onAdd, onUpdate]
  );

  // Keep detailMonster in sync when the underlying data changes (e.g. visibility toggled)
  const syncedDetail = detailMonster !== null
    ? (monsters.find((m) => m.id === detailMonster.id) ?? null)
    : null;

  /** Closing the detail always hides the entity from the player view. */
  const closeDetail = useCallback(() => {
    if (syncedDetail !== null && syncedDetail.visibleToPlayer) {
      onToggleVisibility(syncedDetail.id);
    }
    setDetailMonster(null);
  }, [syncedDetail, onToggleVisibility]);

  const handleEditFromDetail = useCallback((m: SceneMonster) => {
    closeDetail();
    setEditingMonster(m);
  }, [closeDetail]);

  const existingIds = monsters.map((m) => m.id);

  return (
    <div>
      {monsters.map((m) => (
        <MonsterRow
          key={m.id}
          monster={m}
          onDetail={() => setDetailMonster(m)}
          onRemove={() => setConfirmDeleteId(m.id)}
          onToggle={() => onToggleVisibility(m.id)}
        />
      ))}

      <button onClick={() => setEditingMonster("new")} style={addBtnStyle}>
        + Agregar monstruo
      </button>

      {/* Detail modal */}
      {syncedDetail !== null && (
        <MonsterDetailModal
          monster={syncedDetail}
          templates={templates}
          onClose={closeDetail}
          onToggleVisibility={() => onToggleVisibility(syncedDetail.id)}
          onEdit={() => handleEditFromDetail(syncedDetail)}
        />
      )}

      {/* Edit modal */}
      {editingMonster !== null && (
        <MonsterModal
          initial={editingMonster === "new" ? null : editingMonster}
          existingIds={existingIds}
          templates={templates}
          onSave={handleSave}
          onClose={() => setEditingMonster(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDeleteId !== null && (
        <ConfirmDelete
          message="¿Eliminar este monstruo?"
          onConfirm={() => { onRemove(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

interface MonsterRowProps {
  readonly monster: SceneMonster;
  readonly onDetail: () => void;
  readonly onRemove: () => void;
  readonly onToggle: () => void;
}

function MonsterRow({ monster, onDetail, onRemove, onToggle }: MonsterRowProps): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (monster.imagePath === null) { setImageUrl(null); return; }
    void window.ttrpg?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
  }, [monster.imagePath]);

  return (
    <div style={rowStyle}>
      {/* Clickable area: thumb + name → opens detail */}
      <button
        style={rowClickableStyle}
        onClick={onDetail}
        title="Ver detalle"
      >
        <div style={thumbStyle}>
          {imageUrl !== null
            ? <img src={imageUrl} alt={monster.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 18 }}>🐉</span>}
        </div>
        <span style={{ flex: 1, fontSize: 13, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
          {monster.name}
        </span>
      </button>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
        <button
          title={monster.visibleToPlayer ? "Visible en jugador" : "Oculto en jugador"}
          onClick={onToggle}
          style={{ ...iconBtn, color: monster.visibleToPlayer ? "#3a7bd5" : "#555" }}
        >
          {monster.visibleToPlayer ? "👁" : "🚫"}
        </button>
        <button onClick={onRemove} style={iconBtn} title="Eliminar">🗑️</button>
      </div>
    </div>
  );
}

function ConfirmDelete({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}): JSX.Element {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100
    }}>
      <div style={{
        backgroundColor: "#1e2025", border: "1px solid #333", borderRadius: 8,
        padding: 20, maxWidth: 320, textAlign: "center"
      }}>
        <p style={{ color: "#ddd", margin: "0 0 16px", fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "6px 14px", borderRadius: 5, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "6px 14px", borderRadius: 5, border: "none", backgroundColor: "#a33", color: "#fff", cursor: "pointer", fontSize: 13 }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 2px",
  borderBottom: "1px solid #222"
};

const rowClickableStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: 4,
  color: "inherit"
};

const thumbStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 4,
  overflow: "hidden",
  flexShrink: 0,
  backgroundColor: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const addBtnStyle: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  padding: "5px 0",
  borderRadius: 5,
  border: "1px dashed #333",
  backgroundColor: "transparent",
  color: "#666",
  cursor: "pointer",
  fontSize: 12
};

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 4px",
  fontSize: 14,
  lineHeight: 1
};
