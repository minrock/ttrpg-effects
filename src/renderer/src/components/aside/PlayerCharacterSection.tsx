import { useEffect, useState, type JSX } from "react";
import type { ScenePlayerCharacter } from "../../../../domain/sessions/scene-aside";
import { PlayerCharacterDetailModal } from "./PlayerCharacterDetailModal";
import { PlayerCharacterLibraryModal } from "./PlayerCharacterLibraryModal";

interface PlayerCharacterSectionProps {
  readonly characters: readonly ScenePlayerCharacter[];
  readonly onAdd: (character: ScenePlayerCharacter) => void;
  readonly onRemove: (id: string) => void;
}

export function PlayerCharacterSection({ characters, onAdd, onRemove }: PlayerCharacterSectionProps): JSX.Element {
  const [detailCharacter, setDetailCharacter] = useState<ScenePlayerCharacter | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const existingIds = characters.map((character) => character.id);
  const syncedDetail = detailCharacter === null
    ? null
    : characters.find((character) => character.id === detailCharacter.id) ?? null;

  return (
    <div>
      {characters.map((character) => (
        <PlayerCharacterRow
          key={character.id}
          character={character}
          onDetail={() => setDetailCharacter(character)}
          onRemove={() => setConfirmDeleteId(character.id)}
        />
      ))}

      <button onClick={() => setIsLibraryOpen(true)} style={addBtnStyle}>
        + Agregar personaje
      </button>

      {syncedDetail !== null ? (
        <PlayerCharacterDetailModal
          character={syncedDetail}
          onClose={() => setDetailCharacter(null)}
        />
      ) : null}

      {isLibraryOpen ? (
        <PlayerCharacterLibraryModal
          existingIds={existingIds}
          onAddCharacter={(character) => {
            onAdd(character);
            setIsLibraryOpen(false);
          }}
          onClose={() => setIsLibraryOpen(false)}
        />
      ) : null}

      {confirmDeleteId !== null ? (
        <ConfirmDelete
          message="¿Eliminar este personaje de la escena?"
          onConfirm={() => { onRemove(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      ) : null}
    </div>
  );
}

function PlayerCharacterRow({ character, onDetail, onRemove }: {
  readonly character: ScenePlayerCharacter;
  readonly onDetail: () => void;
  readonly onRemove: () => void;
}): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (character.imagePath === null) { setImageUrl(null); return; }
    void window.ttrpg?.resolveAsideUrl(character.imagePath).then((url) => setImageUrl(url ?? null));
  }, [character.imagePath]);

  return (
    <div style={rowStyle}>
      <button style={rowClickableStyle} onClick={onDetail} title="Ver detalle">
        <div style={thumbStyle}>
          {imageUrl !== null
            ? <img src={imageUrl} alt={character.characterName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 18 }}>🧙</span>}
        </div>
        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <strong style={{ display: "block", color: "#ddd", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {character.characterName}
          </strong>
          <small style={{ display: "block", color: "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {character.playerName || "Sin jugador"}
          </small>
        </span>
      </button>
      <button onClick={onRemove} style={iconBtn} title="Eliminar">🗑️</button>
    </div>
  );
}

function ConfirmDelete({ message, onConfirm, onCancel }: {
  readonly message: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): JSX.Element {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100
    }}>
      <div style={{ backgroundColor: "#1e2025", border: "1px solid #333", borderRadius: 8, padding: 20, maxWidth: 320, textAlign: "center" }}>
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
