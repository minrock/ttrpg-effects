import { useCallback, useState, type JSX } from "react";
import {
  ChevronDown,
  ChevronRight,
  Diamond,
  Layers,
  Map,
  Skull,
  StickyNote,
  UserRound,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import { DEFAULT_MAP_BACKGROUND_COLOR } from "../../../../domain/map/map-background";
import type { SceneMapDocument } from "../../../../domain/sessions/scene-document";
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
  updateNpc,
  updatePlayerCharacter
} from "../../../../domain/sessions/scene-aside";
import { MonsterSection } from "./MonsterSection";
import { NpcSection } from "./NpcSection";
import { NotesSection } from "./NotesSection";
import { PlayerCharacterSection } from "./PlayerCharacterSection";
import type { MapAnnotation, MapAnnotations } from "../../../../domain/annotations/map-annotations";
import { MapAnnotationsTree } from "../annotations/MapAnnotationsTree";
import type { SceneLinkValidationStatus } from "../../../../domain/annotations/scene-navigation-links";
import type { SceneObjectEntry } from "../../../../domain/sessions/scene-objects";
import { SceneObjectsTree } from "./SceneObjectsTree";
import { SceneMapsSection } from "./SceneMapsSection";

interface DmAsidePanelProps {
  readonly objects: readonly SceneObjectEntry[];
  readonly maps: readonly SceneMapDocument[];
  readonly activeMapId: string | null;
  readonly backgroundColor: string;
  readonly onBackgroundColorChange: (color: string) => void;
  readonly onSelectMap: (mapId: string) => void;
  readonly onRenameMap: (mapId: string, name: string) => void;
  readonly onReorderMaps: (mapIds: readonly string[]) => void;
  readonly onDeleteMap: (mapId: string) => void;
  readonly onAddMap: () => void;
  readonly onImportSceneAsMap: () => void;
  readonly onSelectObject: (entry: SceneObjectEntry) => void;
  readonly onLocateObject: (entry: SceneObjectEntry) => void;
  readonly onDeleteObject: (entry: SceneObjectEntry) => void;
  readonly aside: SceneAside;
  readonly monsterTemplates: readonly MonsterTemplate[];
  readonly annotations: MapAnnotations;
  readonly selectedElementId: string | null;
  readonly onChange: (aside: SceneAside) => void;
  readonly onSelectAnnotation: (annotation: MapAnnotation) => void;
  readonly onDeleteInformationArea: (areaId: string) => void;
  readonly onGoToAnnotation: (annotation: MapAnnotation) => void;
  readonly onEditAnnotation: (annotation: MapAnnotation) => void;
  readonly onToggleAnnotationLock: (annotation: MapAnnotation) => void;
  readonly onHighlightInformationArea: (areaId: string) => void;
  readonly sceneLinkStatuses?: Readonly<Record<string, SceneLinkValidationStatus>>;
  readonly hidden?: boolean;
}

type SectionKey = "objects" | "annotations" | "monsters" | "npcs" | "playerCharacters" | "notes";
type AsideTab = "scene" | "map";

export function DmAsidePanel({
  objects,
  maps,
  activeMapId,
  backgroundColor,
  onBackgroundColorChange,
  onSelectMap,
  onRenameMap,
  onReorderMaps,
  onDeleteMap,
  onAddMap,
  onImportSceneAsMap,
  onSelectObject,
  onLocateObject,
  onDeleteObject,
  aside,
  monsterTemplates,
  annotations,
  selectedElementId,
  onChange,
  onSelectAnnotation,
  onDeleteInformationArea,
  onGoToAnnotation,
  onEditAnnotation,
  onToggleAnnotationLock,
  onHighlightInformationArea,
  sceneLinkStatuses = {},
  hidden
}: DmAsidePanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<AsideTab>("scene");
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set<SectionKey>(["objects", "annotations", "monsters", "npcs", "playerCharacters", "notes"])
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
  const handleUpdatePlayerCharacter = useCallback(
    (character: ScenePlayerCharacter) => onChange(updatePlayerCharacter(aside, character)),
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
      <div className="dm-aside-tabs" role="tablist" aria-label="Contenido del panel izquierdo">
        <button type="button" role="tab" aria-selected={activeTab === "scene"} className={activeTab === "scene" ? "is-active" : ""} onClick={() => setActiveTab("scene")}>
          <Layers aria-hidden="true" />
          Escena
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "map"} className={activeTab === "map" ? "is-active" : ""} onClick={() => setActiveTab("map")}>
          <Map aria-hidden="true" />
          Mapa
        </button>
      </div>

      <div className="dm-aside-content">
        {activeTab === "scene" ? (
          <>
            <AccordionSection title="Mapas" icon={Map} tone="annotation" sectionKey="objects" open={openSections.has("objects")} badge={maps.length} onToggle={toggleSection}>
              <SceneMapsSection
                maps={maps}
                activeMapId={activeMapId}
                onSelect={onSelectMap}
                onRename={onRenameMap}
                onReorder={onReorderMaps}
                onDelete={onDeleteMap}
                onAddMap={onAddMap}
                onImportScene={onImportSceneAsMap}
              />
            </AccordionSection>
            <AccordionSection
              title="Monstruos"
              icon={Skull}
              tone="monster"
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
            <AccordionSection title="NPCs" icon={UserRound} tone="npc" sectionKey="npcs" open={openSections.has("npcs")} badge={aside.npcs.length} onToggle={toggleSection}>
              <NpcSection
                npcs={aside.npcs}
                onAdd={handleAddNpc}
                onUpdate={handleUpdateNpc}
                onRemove={handleRemoveNpc}
                onToggleVisibility={handleToggleNpcVisibility}
              />
            </AccordionSection>
            <AccordionSection
              title="Personajes"
              icon={UsersRound}
              tone="player"
              sectionKey="playerCharacters"
              open={openSections.has("playerCharacters")}
              badge={aside.playerCharacters.length}
              onToggle={toggleSection}
            >
              <PlayerCharacterSection
                characters={aside.playerCharacters}
                onAdd={handleAddPlayerCharacter}
                onUpdate={handleUpdatePlayerCharacter}
                onRemove={handleRemovePlayerCharacter}
              />
            </AccordionSection>
            <AccordionSection title="Notas" icon={StickyNote} tone="note" sectionKey="notes" open={openSections.has("notes")} badge={aside.notes.length} onToggle={toggleSection}>
              <NotesSection
                notes={aside.notes}
                onAdd={handleAddNote}
                onUpdate={handleUpdateNote}
                onRemove={handleRemoveNote}
              />
            </AccordionSection>
          </>
        ) : (
          <>
            <section className="map-settings-panel" aria-label="Ajustes de mapa">
              <div className="map-settings-panel__header">
                <Map aria-hidden="true" />
                <span>Mapa</span>
              </div>
              <label className="map-background-control">
                <span>Fondo</span>
                <span className="map-background-picker">
                  <span
                    className="map-background-picker__swatch"
                    style={{ backgroundColor }}
                    aria-hidden="true"
                  />
                  <span className="map-background-picker__value">{backgroundColor}</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    disabled={activeMapId === null}
                    onChange={(event) => onBackgroundColorChange(event.currentTarget.value)}
                    aria-label="Color de fondo infinito"
                  />
                </span>
              </label>
              <button
                type="button"
                className="map-background-reset"
                disabled={activeMapId === null || backgroundColor === DEFAULT_MAP_BACKGROUND_COLOR}
                onClick={() => onBackgroundColorChange(DEFAULT_MAP_BACKGROUND_COLOR)}
              >
                Reset
              </button>
            </section>
            <AccordionSection title="Objetos" icon={Diamond} tone="annotation" sectionKey="objects" open={openSections.has("objects")} badge={objects.length} onToggle={toggleSection}>
              <SceneObjectsTree objects={objects} selectedElementId={selectedElementId} onSelect={onSelectObject} onLocate={onLocateObject} onDelete={onDeleteObject} />
            </AccordionSection>
            <AccordionSection
              title="Anotaciones"
              icon={Diamond}
              tone="annotation"
              sectionKey="annotations"
              open={openSections.has("annotations")}
              badge={annotations.pins.length + annotations.areas.length + annotations.sceneLinks.length}
              onToggle={toggleSection}
            >
              <MapAnnotationsTree
                annotations={annotations}
                selectedElementId={selectedElementId}
                onSelect={onSelectAnnotation}
                onDeleteArea={onDeleteInformationArea}
                onGoTo={onGoToAnnotation}
                onEdit={onEditAnnotation}
                onToggleLock={onToggleAnnotationLock}
                onHighlightArea={onHighlightInformationArea}
                sceneLinkStatuses={sceneLinkStatuses}
              />
            </AccordionSection>
          </>
        )}
      </div>
    </aside>
  );
}

function AccordionSection({ title, icon: Icon, tone, sectionKey, open, badge, onToggle, children }: {
  title: string;
  icon: LucideIcon;
  tone: "annotation" | "monster" | "npc" | "player" | "note";
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
          <span className="dm-aside-accordion-icon" data-tone={tone} aria-hidden="true">
            <Icon size={14} />
          </span>
          {title}
          <span className="dm-aside-accordion-badge">{badge}</span>
        </span>
        <span className="dm-aside-accordion-arrow" aria-hidden="true">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>
      {open && (
        <div className="dm-aside-accordion-body">
          {children}
        </div>
      )}
    </div>
  );
}
