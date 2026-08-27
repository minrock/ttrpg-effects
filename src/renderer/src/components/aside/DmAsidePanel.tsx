import { useCallback, useState, type JSX } from "react";
import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import type { SceneAside, SceneMonster, SceneNpc, SceneNote, ScenePlayerCharacter } from "../../../../domain/sessions/scene-aside";
import {
  addPlayerCharacter,
  addMonster,
  addNote,
  addNpc,
  removePlayerCharacter,
  removeMonster,
  removeNote,
  removeNpc,
  updateMonster,
  updateNote,
  updateNpc
} from "../../../../domain/sessions/scene-aside";
import { MonsterSection } from "./MonsterSection";
import { NpcSection } from "./NpcSection";
import { NotesSection } from "./NotesSection";
import { PlayerCharacterSection } from "./PlayerCharacterSection";
import type { MapAnnotation, MapAnnotations } from "../../../../domain/annotations/map-annotations";
import { MapAnnotationsTree } from "../annotations/MapAnnotationsTree";

interface DmAsidePanelProps {
  readonly aside: SceneAside;
  readonly monsterTemplates: readonly MonsterTemplate[];
  readonly annotations: MapAnnotations;
  readonly selectedElementId: string | null;
  readonly onChange: (aside: SceneAside) => void;
  readonly onSelectAnnotation: (annotation: MapAnnotation) => void;
  readonly onGoToAnnotation: (annotation: MapAnnotation) => void;
  readonly onEditAnnotation: (annotation: MapAnnotation) => void;
  readonly onToggleAnnotationLock: (annotation: MapAnnotation) => void;
  readonly onHighlightInformationArea: (areaId: string) => void;
  readonly hidden?: boolean;
}

type SectionKey = "annotations" | "monsters" | "npcs" | "playerCharacters" | "notes";

export function DmAsidePanel({
  aside,
  monsterTemplates,
  annotations,
  selectedElementId,
  onChange,
  onSelectAnnotation,
  onGoToAnnotation,
  onEditAnnotation,
  onToggleAnnotationLock,
  onHighlightInformationArea,
  hidden
}: DmAsidePanelProps): JSX.Element {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set<SectionKey>(["annotations", "monsters", "npcs", "playerCharacters", "notes"])
  );

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Monster handlers
  const handleAddMonster = useCallback((m: SceneMonster) => onChange(addMonster(aside, m)), [aside, onChange]);
  const handleUpdateMonster = useCallback((m: SceneMonster) => onChange(updateMonster(aside, m)), [aside, onChange]);
  const handleRemoveMonster = useCallback((id: string) => onChange(removeMonster(aside, id)), [aside, onChange]);
  const handleToggleMonsterVisibility = useCallback(
    (id: string) => {
      const m = aside.monsters.find((x) => x.id === id);
      if (m === undefined) return;
      onChange(updateMonster(aside, { ...m, visibleToPlayer: !m.visibleToPlayer }));
    },
    [aside, onChange]
  );

  // NPC handlers
  const handleAddNpc = useCallback((n: SceneNpc) => onChange(addNpc(aside, n)), [aside, onChange]);
  const handleUpdateNpc = useCallback((n: SceneNpc) => onChange(updateNpc(aside, n)), [aside, onChange]);
  const handleRemoveNpc = useCallback((id: string) => onChange(removeNpc(aside, id)), [aside, onChange]);
  const handleToggleNpcVisibility = useCallback(
    (id: string) => {
      const n = aside.npcs.find((x) => x.id === id);
      if (n === undefined) return;
      onChange(updateNpc(aside, { ...n, visibleToPlayer: !n.visibleToPlayer }));
    },
    [aside, onChange]
  );

  const handleAddPlayerCharacter = useCallback(
    (character: ScenePlayerCharacter) => onChange(addPlayerCharacter(aside, character)),
    [aside, onChange]
  );
  const handleRemovePlayerCharacter = useCallback(
    (id: string) => onChange(removePlayerCharacter(aside, id)),
    [aside, onChange]
  );

  // Note handlers
  const handleAddNote = useCallback((note: SceneNote) => onChange(addNote(aside, note)), [aside, onChange]);
  const handleUpdateNote = useCallback((note: SceneNote) => onChange(updateNote(aside, note)), [aside, onChange]);
  const handleRemoveNote = useCallback((id: string) => onChange(removeNote(aside, id)), [aside, onChange]);

  return (
    <aside className="dm-aside-panel" aria-label="Panel de escena" hidden={hidden}>
      <div className="dm-aside-header">
        <span className="dm-aside-title">Escena</span>
      </div>

      <div className="dm-aside-content">
        <AccordionSection
          title="◆ Anotaciones"
          sectionKey="annotations"
          open={openSections.has("annotations")}
          badge={annotations.pins.length + annotations.areas.length}
          onToggle={toggleSection}
        >
          <MapAnnotationsTree
            annotations={annotations}
            selectedElementId={selectedElementId}
            onSelect={onSelectAnnotation}
            onGoTo={onGoToAnnotation}
            onEdit={onEditAnnotation}
            onToggleLock={onToggleAnnotationLock}
            onHighlightArea={onHighlightInformationArea}
          />
        </AccordionSection>

        <AccordionSection
          title="🐉 Monstruos"
          sectionKey="monsters"
          open={openSections.has("monsters")}
          badge={aside.monsters.length}
          onToggle={toggleSection}
        >
          <MonsterSection
            monsters={aside.monsters}
            templates={monsterTemplates}
            onAdd={handleAddMonster}
            onUpdate={handleUpdateMonster}
            onRemove={handleRemoveMonster}
            onToggleVisibility={handleToggleMonsterVisibility}
          />
        </AccordionSection>

        <AccordionSection
          title="🧑 NPCs"
          sectionKey="npcs"
          open={openSections.has("npcs")}
          badge={aside.npcs.length}
          onToggle={toggleSection}
        >
          <NpcSection
            npcs={aside.npcs}
            onAdd={handleAddNpc}
            onUpdate={handleUpdateNpc}
            onRemove={handleRemoveNpc}
            onToggleVisibility={handleToggleNpcVisibility}
          />
        </AccordionSection>

        <AccordionSection
          title="🧙 Personajes"
          sectionKey="playerCharacters"
          open={openSections.has("playerCharacters")}
          badge={aside.playerCharacters.length}
          onToggle={toggleSection}
        >
          <PlayerCharacterSection
            characters={aside.playerCharacters}
            onAdd={handleAddPlayerCharacter}
            onRemove={handleRemovePlayerCharacter}
          />
        </AccordionSection>

        <AccordionSection
          title="📝 Notas"
          sectionKey="notes"
          open={openSections.has("notes")}
          badge={aside.notes.length}
          onToggle={toggleSection}
        >
          <NotesSection
            notes={aside.notes}
            onAdd={handleAddNote}
            onUpdate={handleUpdateNote}
            onRemove={handleRemoveNote}
          />
        </AccordionSection>
      </div>
    </aside>
  );
}

function AccordionSection({ title, sectionKey, open, badge, onToggle, children }: {
  title: string;
  sectionKey: SectionKey;
  open: boolean;
  badge: number;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="dm-aside-accordion">
      <button
        className="dm-aside-accordion-header"
        onClick={() => onToggle(sectionKey)}
      >
        <span className="dm-aside-accordion-title">
          {title}
          {badge > 0 && <span className="dm-aside-accordion-badge">({badge})</span>}
        </span>
        <span className="dm-aside-accordion-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="dm-aside-accordion-body">
          {children}
        </div>
      )}
    </div>
  );
}
