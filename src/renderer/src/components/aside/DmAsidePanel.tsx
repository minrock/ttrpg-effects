import { useCallback, useId, useRef, useState, type JSX, type KeyboardEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  Diamond,
  Layers,
  Map,
  RotateCcw,
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
import "./interface-explorer.css";

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
  readonly onReplaceMapImage: (mapId: string) => void;
  readonly isReplacingImage?: boolean;
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
  readonly activeAnnotationTool: string;
  readonly onStartRoomPin: () => void;
  readonly onStartInformationArea: () => void;
  readonly onStartSceneLink: () => void;
  readonly sceneLinkStatuses?: Readonly<Record<string, SceneLinkValidationStatus>>;
  readonly hidden?: boolean;
}

type SectionKey = "maps" | "objects" | "annotations" | "monsters" | "npcs" | "playerCharacters" | "notes";
type AsideTab = "scene" | "map";
const ASIDE_TABS = [
  { id: "scene", label: "Escena", icon: Layers },
  { id: "map", label: "Mapa", icon: Map }
] as const;

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
  onReplaceMapImage,
  isReplacingImage = false,
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
  activeAnnotationTool,
  onStartRoomPin,
  onStartInformationArea,
  onStartSceneLink,
  sceneLinkStatuses = {},
  hidden
}: DmAsidePanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<AsideTab>("scene");
  const panelId = useId();
  const tabRefs = useRef<Partial<Record<AsideTab, HTMLButtonElement | null>>>({});
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set<SectionKey>(["maps", "objects", "annotations", "monsters", "npcs", "playerCharacters", "notes"])
  );

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: AsideTab): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = ASIDE_TABS.findIndex((item) => item.id === tab);
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight": nextIndex = (index + 1) % ASIDE_TABS.length; break;
      case "ArrowLeft": nextIndex = (index + ASIDE_TABS.length - 1) % ASIDE_TABS.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = ASIDE_TABS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextTab = ASIDE_TABS[nextIndex].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

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
        <span className="dm-aside-title">Explorador</span>
      </div>
      <div className="dm-aside-tabs" role="tablist" aria-label="Contenido del panel izquierdo">
        {ASIDE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            ref={(element) => { tabRefs.current[id] = element; }}
            type="button"
            role="tab"
            id={`${panelId}-${id}-tab`}
            aria-controls={`${panelId}-${id}-panel`}
            aria-selected={activeTab === id}
            tabIndex={activeTab === id ? 0 : -1}
            className={activeTab === id ? "is-active" : ""}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, id)}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="dm-aside-content">
        <div
          className="dm-aside-tabpanel"
          role="tabpanel"
          id={`${panelId}-scene-panel`}
          aria-labelledby={`${panelId}-scene-tab`}
          hidden={activeTab !== "scene"}
        >
          <AccordionSection title="Mapas" icon={Map} tone="annotation" sectionKey="maps" open={openSections.has("maps")} badge={maps.length} onToggle={toggleSection}>
            <SceneMapsSection
              maps={maps}
              activeMapId={activeMapId}
              onSelect={onSelectMap}
              onRename={onRenameMap}
              onReorder={onReorderMaps}
              onDelete={onDeleteMap}
              onAddMap={onAddMap}
              onImportScene={onImportSceneAsMap}
              onReplaceMapImage={onReplaceMapImage}
              isReplacingImage={isReplacingImage}
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
        </div>
        <div
          className="dm-aside-tabpanel"
          role="tabpanel"
          id={`${panelId}-map-panel`}
          aria-labelledby={`${panelId}-map-tab`}
          hidden={activeTab !== "map"}
        >
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
              title="Restablecer fondo"
              aria-label="Restablecer fondo"
              data-tooltip="Restablecer fondo"
              disabled={activeMapId === null || backgroundColor === DEFAULT_MAP_BACKGROUND_COLOR}
              onClick={() => onBackgroundColorChange(DEFAULT_MAP_BACKGROUND_COLOR)}
            >
              <RotateCcw size={14} aria-hidden="true" />
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
              activeTool={activeAnnotationTool}
              onStartPin={onStartRoomPin}
              onStartArea={onStartInformationArea}
              onStartSceneLink={onStartSceneLink}
              sceneLinkStatuses={sceneLinkStatuses}
            />
          </AccordionSection>
        </div>
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
  const sectionId = useId();
  return (
    <div className="dm-aside-accordion">
      <button
        type="button"
        id={`${sectionId}-heading`}
        className="dm-aside-accordion-header"
        aria-expanded={open}
        aria-controls={`${sectionId}-body`}
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
      <div
        id={`${sectionId}-body`}
        className="dm-aside-accordion-body"
        role="group"
        aria-labelledby={`${sectionId}-heading`}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
