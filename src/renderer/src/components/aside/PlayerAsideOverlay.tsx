import { useEffect, useState, type JSX } from "react";
import type { SceneMonster, SceneNpc } from "../../../../domain/sessions/scene-aside";
import {
  getPlayerVisibleMonsters,
  getPlayerVisibleNpcs,
  type SceneAside
} from "../../../../domain/sessions/scene-aside";

interface PlayerAsideOverlayProps {
  readonly aside: SceneAside;
}

export function PlayerAsideOverlay({ aside }: PlayerAsideOverlayProps): JSX.Element | null {
  const visibleMonsters = getPlayerVisibleMonsters(aside);
  const visibleNpcs = getPlayerVisibleNpcs(aside);

  if (visibleMonsters.length === 0 && visibleNpcs.length === 0) return null;

  return (
    <div style={overlayStyle}>
      <div style={cardsWrapperStyle}>
        {visibleMonsters.map((m) => (
          <MonsterCard key={m.id} monster={m} />
        ))}
        {visibleNpcs.map((n) => (
          <NpcCard key={n.id} npc={n} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monster card — image only, click to zoom
// ---------------------------------------------------------------------------

function MonsterCard({ monster }: { monster: SceneMonster }): JSX.Element | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (monster.imagePath === null) return;
    void window.ttrpg?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
  }, [monster.imagePath]);

  if (imageUrl === null) return null;

  const imgSize = zoomed ? "min(72vw, 72vh)" : "440px";

  return (
    <div style={cardStyle}>
      <button
        style={{ ...zoomBtnWrap, cursor: zoomed ? "zoom-out" : "zoom-in" }}
        title={zoomed ? "Reducir imagen" : "Ampliar imagen"}
        onClick={() => setZoomed((z) => !z)}
      >
        <img
          src={imageUrl}
          alt={monster.name}
          style={{
            ...cardImgBase,
            width: imgSize,
            height: imgSize,
            transition: "width 0.25s ease, height 0.25s ease"
          }}
        />
        <span style={zoomIconStyle}>{zoomed ? "🔍−" : "🔍+"}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPC card — name top-left, image below, click to zoom
// ---------------------------------------------------------------------------

function NpcCard({ npc }: { npc: SceneNpc }): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (npc.imagePath === null) return;
    void window.ttrpg?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
  }, [npc.imagePath]);

  const imgSize = zoomed ? "min(72vw, 72vh)" : "440px";

  return (
    <div style={{ ...cardStyle, alignItems: "flex-start" }}>
      {/* Name — top left */}
      <div style={npcNameStyle}>{npc.name}</div>

      {/* Image with zoom toggle */}
      {imageUrl !== null && (
        <button
          style={{ ...zoomBtnWrap, cursor: zoomed ? "zoom-out" : "zoom-in" }}
          title={zoomed ? "Reducir imagen" : "Ampliar imagen"}
          onClick={() => setZoomed((z) => !z)}
        >
          <img
            src={imageUrl}
            alt={npc.name}
            style={{
              ...cardImgBase,
              width: imgSize,
              height: imgSize,
              transition: "width 0.25s ease, height 0.25s ease"
            }}
          />
          <span style={zoomIconStyle}>{zoomed ? "🔍−" : "🔍+"}</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/** Full-area overlay — darkens + blurs the map, centers cards */
const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  backdropFilter: "blur(3px)",
  overflowY: "auto"
};

/** Flex row of cards, centered, with decorative container */
const cardsWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 40,
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "32px 48px",
  backgroundColor: "rgba(0,0,0,0.5)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 20px 80px rgba(0,0,0,0.8)",
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto"
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14
};

/** Wrapper that acts as the zoom button without default button chrome */
const zoomBtnWrap: React.CSSProperties = {
  position: "relative",
  background: "none",
  border: "none",
  padding: 0,
  lineHeight: 0,
  display: "block"
};

const cardImgBase: React.CSSProperties = {
  objectFit: "cover",
  borderRadius: 14,
  boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
  border: "2px solid rgba(255,255,255,0.13)",
  display: "block"
};

const zoomIconStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 10,
  right: 10,
  fontSize: 13,
  backgroundColor: "rgba(0,0,0,0.6)",
  borderRadius: 6,
  padding: "3px 6px",
  color: "#ddd",
  lineHeight: 1,
  userSelect: "none"
};

const npcNameStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#f0ead6",
  textShadow: "0 2px 12px rgba(0,0,0,0.95)",
  letterSpacing: "0.03em",
  textAlign: "left",
  maxWidth: "440px",
  lineHeight: 1.2
};
