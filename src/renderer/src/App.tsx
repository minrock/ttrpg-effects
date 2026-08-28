import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type SetStateAction
} from "react";
import {
  resolveContextMenuPosition,
  type ContextMenuPosition
} from "./context-menu-position";
import { parseSceneJson } from "../../domain/sessions/scene-schema";
import * as Switch from "@radix-ui/react-switch";
import {
  CircleDot,
  Camera,
  CloudFog,
  Crosshair,
  FilePlus,
  FolderOpen,
  Grid3X3,
  Lock,
  Map as MapIcon,
  MapPin,
  Monitor,
  Moon,
  Save,
  Shapes,
  Sparkles,
  Swords,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Unlock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import {
  cancelInteraction,
  closeContextMenu,
  createInitialInteractionState,
  deleteSelectedElement,
  openContextMenu,
  selectElement,
  setActiveTool,
  setMapAdjustMode,
  setZoomLocked
} from "../../domain/interaction/interaction-state";
import { applyGridPreset, gridPresets, setGridCellSize, setGridOpacity } from "../../domain/grid/grid";
import {
  createAnimatedFireEffect,
  createCellFireZone,
  createCircleFireZone,
  toggleCircleFireMode,
  updateAnimatedFireEffect,
  type FireCell
} from "../../domain/effects/fire";
import {
  createMagicalDarknessEffect,
  updateMagicalDarknessEffect,
  type MagicalDarknessPatch
} from "../../domain/effects/magical-darkness";
import {
  createDynamicLightSavePayload,
  createDynamicLightEffect,
  updateDynamicLightEffect,
  type DynamicLightPatch
} from "../../domain/effects/dynamic-light";
import {
  createWaterEffect,
  mergeConsecutiveRiverEffects,
  updateWaterEffect,
  type RiverWaterEffect,
  type WaterPatch
} from "../../domain/effects/water";
import {
  createSceneLabel,
  systemLabelFonts,
  updateSceneLabel,
  type SceneLabelPatch
} from "../../domain/labels/labels";
import {
  createLightSource,
  moveLightSource,
  updateLightSource,
  type LightKind,
  type LightPatch
} from "../../domain/lighting/lights";
import {
  MAP_SCALE_DEFAULT,
  MAP_SCALE_MAX,
  MAP_SCALE_MIN,
  createMapImageState,
  sanitizeMapScale,
  type MapImageState
} from "../../domain/map/map-image";
import { formatDistance, measureDistance, measurePathDistance } from "../../domain/measurement/measurement";
import { hasSceneContent } from "../../domain/sessions/scene-content";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type {
  SceneDocument,
  SceneFireEffect,
  SceneOperationResult,
  SceneToken
} from "../../domain/sessions/scene-document";
import {
  createTacticalShape,
  createPathShape,
  movePathPoint,
  moveShape,
  rotateLinearShape,
  setLinearShapeEnd,
  setShapeRadius,
  updateShape,
  type ShapePatch,
  type TacticalShapeKind
} from "../../domain/shapes/shapes";
import type { WorldPoint } from "../../domain/shared/coordinates";
import {
  arcanePointerSizeOptions,
  type ArcanePointerCreatureSize
} from "../../domain/pointer/arcane-pointer";
import {
  createPlayerSceneSnapshot,
  deriveFogPresentation,
  deriveHiddenTokenPolicy,
  normalizeCameraSnapshot,
  type ArcanePointerBroadcast,
  type PlayerWindowSnapshot,
  type ViewportCameraSnapshot
} from "../../domain/player/player-window";
import {
  derivePlayerCameraSyncStatus,
  shouldApplyPlayerCameraReport,
  zoomPlayerCamera,
  type PlayerCameraCommandReason,
  type PlayerCameraSyncStatus
} from "../../domain/player/player-camera-control";
import {
  ALLOWED_SHAPE_EMOJIS,
  getSelectedShapeEmojis
} from "../../domain/shapes/shape-emojis";
import {
  addRevealedArea,
  clearRevealedAreas,
  createStrokeRevealArea,
  updateFogOfWar
} from "../../domain/vision/vision";
import type { FirePatch } from "../../domain/effects/fire";
import {
  createSceneToken,
  snapTokenToGrid,
  sortTokensByOrder,
  tokenSizeLabels,
  type TokenSize
} from "../../domain/tokens/tokens";
import type { TacticalElementKind } from "../../domain/tools/tactical-elements";
import { MapViewport, type MapViewportHandle } from "./components/MapViewport";
import type { PixiContextMenuRequest } from "../../render/pixi/PixiViewport";
import { DmAsidePanel } from "./components/aside/DmAsidePanel";
import { DmDarknessStatusBadge } from "./components/DmDarknessStatusBadge";
import type { SceneAside } from "../../domain/sessions/scene-aside";
import { createDefaultSceneAside } from "../../domain/sessions/scene-aside";
import { MonsterTemplateManagerModal } from "./components/aside/MonsterTemplateManagerModal";
import {
  advanceTurn,
  createDefaultCombatTracker,
  markParticipantDefeated,
  type CombatTracker
} from "../../domain/combat/combat-tracker";
import { CombatSetupModal } from "./components/combat/CombatSetupModal";
import { CombatTurnBar } from "./components/combat/CombatTurnBar";
import {
  canDeleteMapAnnotation,
  createInformationAreaHighlightBroadcast,
  getMapAnnotationCenter,
  translateInformationArea,
  type InformationAreaCell,
  type MapAnnotation,
  type MapInformationArea,
  type MapInformationPin
} from "../../domain/annotations/map-annotations";
import {
  MapAnnotationModal,
  type MapAnnotationModalDraft
} from "./components/annotations/MapAnnotationModal";
import { MapAnnotationsSection } from "./components/annotations/MapAnnotationsSection";
import { SceneLinkModal } from "./components/annotations/SceneLinkModal";
import {
  renameSceneLinkMarker,
  type MapSceneLinkMarker,
  type SceneLinkValidationStatus
} from "../../domain/annotations/scene-navigation-links";

const logoUrl = "logo/ttrpg-effects-logo.png";
const fallbackAppInfo = {
  name: "TTRPG Effects",
  version: "0.0.0"
} as const;

type SidebarSectionId = "grid" | "figures" | "effects" | "tokens" | "darkness" | "fog" | "annotations";

type SidebarOpenState = Record<SidebarSectionId, boolean>;

interface PathDraftState {
  readonly points: readonly WorldPoint[];
  readonly hoverPoint: WorldPoint | null;
}

interface WaterDraftState {
  readonly points: readonly WorldPoint[];
  readonly hoverPoint: WorldPoint | null;
}

interface NewTokenDraftState {
  readonly imagePath: string | null;
  readonly imageUrl: string | null;
  readonly name: string;
  readonly size: TokenSize;
  readonly position: WorldPoint;
}

const SESSION_AUTOSAVE_DELAY_MS = 1000;
const PLAYER_SCENE_PUBLISH_DELAY_MS = 250;

export function App(): JSX.Element {
  const appInfo = window.ttrpg?.getAppInfo() ?? fallbackAppInfo;
  const [scene, setSceneState] = useState<SceneDocument>(() => {
    try {
      const snapshot = sessionStorage.getItem("ttrpg:session-scene");
      if (snapshot !== null) {
        return parseSceneJson(snapshot);
      }
    } catch {
      sessionStorage.removeItem("ttrpg:session-scene");
    }
    return createDefaultScene();
  });
  const sceneRef = useRef(scene);
  const setScene = useCallback((nextScene: SetStateAction<SceneDocument>): void => {
    const resolvedScene =
      typeof nextScene === "function"
        ? (nextScene as (currentScene: SceneDocument) => SceneDocument)(sceneRef.current)
        : nextScene;
    sceneRef.current = resolvedScene;
    setSceneState(resolvedScene);
  }, []);
  const [sceneAside, setSceneAside] = useState<SceneAside>(() =>
    (scene.sceneAside) ?? createDefaultSceneAside()
  );
  const [monsterTemplates, setMonsterTemplates] = useState<readonly MonsterTemplate[]>([]);
  const [isMonsterTemplateManagerOpen, setIsMonsterTemplateManagerOpen] = useState(false);
  const [isCombatSetupOpen, setIsCombatSetupOpen] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [tokenImageUrls, setTokenImageUrls] = useState<Readonly<Record<string, string>>>({});
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Escena default en memoria");
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [needsResave, setNeedsResave] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [interaction, setInteraction] = useState(() => createInitialInteractionState());
  const contextMenuRef = useRef<HTMLElement | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isAsidePanelVisible, setIsAsidePanelVisible] = useState(true);
  const [isSelectedPropertiesOpen, setIsSelectedPropertiesOpen] = useState(true);
  const [isSpaceDragActive, setIsSpaceDragActive] = useState(false);
  const [isGridAdjustMode, setIsGridAdjustMode] = useState(false);
  const [arcanePointerCreatureSize, setArcanePointerCreatureSize] =
    useState<ArcanePointerCreatureSize>("medium");
  const [arcanePointerResetKey, setArcanePointerResetKey] = useState(0);
  const [informationAreaHighlightResetKey, setInformationAreaHighlightResetKey] = useState(0);
  const [showDmFogOverlay, setShowDmFogOverlay] = useState(false);
  const [showMapAnnotations, setShowMapAnnotations] = useState(true);
  const [mapAnnotationModal, setMapAnnotationModal] = useState<MapAnnotationModalDraft | null>(null);
  const [sceneLinkModalId, setSceneLinkModalId] = useState<string | null>(null);
  const [sceneLinkStatuses, setSceneLinkStatuses] = useState<Readonly<Record<string, SceneLinkValidationStatus>>>({});
  const sceneLinkStatusesRef = useRef(sceneLinkStatuses);
  sceneLinkStatusesRef.current = sceneLinkStatuses;
  const navigateSceneLinkRef = useRef<(marker: MapSceneLinkMarker) => Promise<void>>(async () => {});
  const [isPlayerWindowOpen, setIsPlayerWindowOpen] = useState(false);
  const isPlayerWindowOpenRef = useRef(isPlayerWindowOpen);
  isPlayerWindowOpenRef.current = isPlayerWindowOpen;
  const playerCameraRef = useRef<ViewportCameraSnapshot>(
    normalizeCameraSnapshot({ center: { x: scene.camera.x, y: scene.camera.y }, zoom: scene.camera.zoom })
  );
  const dmCameraRef = useRef<ViewportCameraSnapshot>(playerCameraRef.current);
  const effectivePlayerCameraRef = useRef<ViewportCameraSnapshot | null>(null);
  const playerCameraCommandRevisionRef = useRef(0);
  const pendingPlayerCameraCommandRevisionRef = useRef<number | null>(null);
  const acknowledgedPlayerCameraCommandRevisionRef = useRef<number | null>(null);
  const lastPlayerCameraReportRevisionRef = useRef(-1);
  const [playerCameraSyncStatus, setPlayerCameraSyncStatus] =
    useState<PlayerCameraSyncStatus>("closed");
  const [playerCameraSyncKey, setPlayerCameraSyncKey] = useState(0);
  const playerCameraSyncKeyRef = useRef(playerCameraSyncKey);
  playerCameraSyncKeyRef.current = playerCameraSyncKey;
  const [isNewSceneDialogOpen, setIsNewSceneDialogOpen] = useState(false);
  const [newTokenDraft, setNewTokenDraft] = useState<NewTokenDraftState | null>(null);
  const [pathDraft, setPathDraft] = useState<PathDraftState>({
    points: [],
    hoverPoint: null
  });
  const [waterDraft, setWaterDraft] = useState<WaterDraftState>({
    points: [],
    hoverPoint: null
  });
  const [openSidebarSections, setOpenSidebarSections] = useState<SidebarOpenState>({
    grid: true,
    figures: false,
    effects: false,
    tokens: false,
    darkness: false,
    fog: false,
    annotations: false
  });
  const nextShapeId = useRef(1);
  const nextLightId = useRef(1);
  const nextEffectId = useRef(1);
  const nextTokenId = useRef(1);
  const nextLabelId = useRef(1);
  const nextRevealId = useRef(1);
  const nextPinId = useRef(1);
  const nextInformationAreaId = useRef(1);
  const nextSceneLinkId = useRef(1);
  const sceneLinkValidationRequestId = useRef(0);
  const lastSavedSceneJsonRef = useRef<string | null>(null);
  const syncSceneEntityCounters = useCallback((targetScene: SceneDocument): void => {
    nextShapeId.current = getNextNumericIdForPrefixes(
      targetScene.shapes.map((shape) => shape.id),
      ["measurement-", "circle-", "cone-", "rectangle-", "path-"]
    );
    nextLightId.current = getNextNumericIdForPrefixes(
      targetScene.lights.map((light) => light.id),
      ["point-light-", "cone-light-"]
    );
    nextEffectId.current = getNextNumericIdForPrefixes(
      targetScene.effects.map((effect) => effect.id),
      ["fire-", "magical-darkness-", "water-"]
    );
    nextTokenId.current = getNextNumericId(targetScene.tokens.map((token) => token.id), "token-");
    nextLabelId.current = getNextNumericId(targetScene.labels.map((label) => label.id), "label-");
    nextRevealId.current = getNextNumericId(targetScene.fogOfWar.revealedAreas.map((area) => area.id), "reveal-");
    nextPinId.current = getNextNumericId(targetScene.mapAnnotations.pins.map((pin) => pin.id), "room-pin-");
    nextInformationAreaId.current = getNextNumericId(
      targetScene.mapAnnotations.areas.map((area) => area.id),
      "information-area-"
    );
    nextSceneLinkId.current = getNextNumericId(
      targetScene.mapAnnotations.sceneLinks.map((marker) => marker.id),
      "scene-link-"
    );
  }, []);
  const viewportHandleRef = useRef<MapViewportHandle | null>(null);
  const isSpaceDragActiveRef = useRef(isSpaceDragActive);
  isSpaceDragActiveRef.current = isSpaceDragActive;
  const pathDraftRef = useRef(pathDraft);
  pathDraftRef.current = pathDraft;
  const waterDraftRef = useRef(waterDraft);
  waterDraftRef.current = waterDraft;
  const selectedElementIdRef = useRef(interaction.selectedElementId);
  selectedElementIdRef.current = interaction.selectedElementId;
  sceneRef.current = scene;

  useEffect(() => {
    syncSceneEntityCounters(sceneRef.current);
  }, [syncSceneEntityCounters]);

  useEffect(() => {
    const markers = scene.mapAnnotations.sceneLinks;
    const requestId = sceneLinkValidationRequestId.current + 1;
    sceneLinkValidationRequestId.current = requestId;
    setSceneLinkStatuses(Object.fromEntries(markers.map((marker) => [
      marker.id,
      marker.connection === null
        ? { state: "unlinked" as const }
        : { state: "validating" as const }
    ])));

    if (currentFilePath === null || markers.length === 0 || window.ttrpg === undefined) return;
    void window.ttrpg.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
      if (sceneLinkValidationRequestId.current !== requestId) return;
      if (result.ok) {
        setSceneLinkStatuses(result.statuses);
      } else {
        setFeedback(result.error);
      }
    });
  }, [currentFilePath, scene.mapAnnotations.sceneLinks]);

  // Phase 1: Reconstruct the runtime map URL on mount if the scene has a map but no URL yet.
  // This covers renderer remounts where scene was restored from sessionStorage but mapImageUrl was lost.
  useEffect(() => {
    if (scene.map.imagePath === null || mapImageUrl !== null || window.ttrpg === undefined) {
      return;
    }
    window.ttrpg.resolveMapUrl(scene.map.imagePath).then((url) => {
      if (url !== null) {
        setMapImageUrl(url);
      }
    });
  }, []);

  useEffect(() => {
    if (window.ttrpg === undefined || scene.tokens.length === 0) {
      return;
    }

    const missingTokens = scene.tokens.filter((token) => tokenImageUrls[token.id] === undefined);

    if (missingTokens.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.all(
      missingTokens.map(async (token) => [token.id, await window.ttrpg?.resolveTokenUrl(token.imagePath)] as const)
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      setTokenImageUrls((current) => {
        const next = { ...current };

        for (const [tokenId, url] of entries) {
          if (typeof url === "string") {
            next[tokenId] = url;
          }
        }

        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [scene.tokens, tokenImageUrls]);

  // Phase 2: Autosave scene to sessionStorage on every change (debounced).
  // sessionStorage survives renderer reloads within the same Electron window session
  // but is cleared automatically when the window is closed, preventing cross-session leakage.
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(scene));
      } catch {
        // Storage full or unavailable — skip silently
      }
    }, SESSION_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(handle);
  }, [scene]);

  const handleContextMenuRequest = useCallback((request: PixiContextMenuRequest) => {
    setInteraction((current) => openContextMenu(current, request));
  }, []);

  useLayoutEffect(() => {
    if (interaction.contextMenu === null) {
      setContextMenuPosition(null);
      return;
    }

    const menu = contextMenuRef.current;
    const backdrop = menu?.parentElement;
    if (menu === null || backdrop === null || backdrop === undefined) {
      return;
    }

    const backdropBounds = backdrop.getBoundingClientRect();
    setContextMenuPosition(
      resolveContextMenuPosition(
        {
          x: interaction.contextMenu.screen.x - backdropBounds.left,
          y: interaction.contextMenu.screen.y - backdropBounds.top
        },
        { width: menu.offsetWidth, height: menu.offsetHeight },
        { width: backdropBounds.width, height: backdropBounds.height }
      )
    );
  }, [interaction.contextMenu]);

  const handleElementSelect = useCallback((elementId: string | null) => {
    setInteraction((current) => selectElement(current, elementId));
  }, []);

  const refreshPlayerCameraControl = useCallback((statusOverride?: PlayerCameraSyncStatus): void => {
    const status =
      statusOverride ??
      derivePlayerCameraSyncStatus({
        isPlayerWindowOpen: isPlayerWindowOpenRef.current,
        primaryCamera: playerCameraRef.current,
        effectiveCamera: effectivePlayerCameraRef.current,
        pendingCommandRevision: pendingPlayerCameraCommandRevisionRef.current,
        acknowledgedCommandRevision: acknowledgedPlayerCameraCommandRevisionRef.current
      });
    setPlayerCameraSyncStatus((current) => (current === status ? current : status));
    viewportHandleRef.current?.setPlayerCameraControlState({
      primaryCamera: playerCameraRef.current,
      effectiveCamera: effectivePlayerCameraRef.current,
      status
    });
  }, []);

  const sendPlayerCameraCommand = useCallback(
    (reason: PlayerCameraCommandReason): void => {
      if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
        refreshPlayerCameraControl("closed");
        return;
      }

      const revision = playerCameraCommandRevisionRef.current + 1;
      playerCameraCommandRevisionRef.current = revision;
      pendingPlayerCameraCommandRevisionRef.current = revision;
      refreshPlayerCameraControl("pending");
      void window.ttrpg.commandPlayerCamera({
        revision,
        camera: playerCameraRef.current,
        reason
      });
    },
    [refreshPlayerCameraControl]
  );

  const handleCameraChange = useCallback((camera: ViewportCameraSnapshot): void => {
    dmCameraRef.current = normalizeCameraSnapshot(camera);
  }, []);

  const handlePlayerCameraControlMove = useCallback(
    (position: WorldPoint): void => {
      playerCameraRef.current = normalizeCameraSnapshot({
        ...playerCameraRef.current,
        center: position
      });
      refreshPlayerCameraControl();
      sendPlayerCameraCommand("move");
    },
    [refreshPlayerCameraControl, sendPlayerCameraCommand]
  );

  const handlePlayerCameraZoom = useCallback(
    (direction: "in" | "out"): void => {
      playerCameraRef.current = zoomPlayerCamera(playerCameraRef.current, direction);
      refreshPlayerCameraControl();
      sendPlayerCameraCommand("zoom");
    },
    [refreshPlayerCameraControl, sendPlayerCameraCommand]
  );

  const handleRecenterPlayerCamera = useCallback((): void => {
    sendPlayerCameraCommand("recenter");
  }, [sendPlayerCameraCommand]);

  const handleArcanePointerTrigger = useCallback((pointer: ArcanePointerBroadcast): void => {
    if (isPlayerWindowOpenRef.current) {
      void window.ttrpg?.publishPlayerPointer(pointer);
    }
  }, []);

  const handleRoomPinPlace = useCallback((position: WorldPoint): void => {
    const id = getNextAvailableSceneId(sceneRef.current, ["room-pin-"], nextPinId);
    setMapAnnotationModal({ kind: "room-pin", id, position });
    setInteraction((current) => setActiveTool(current, "select"));
  }, []);

  const handleSceneLinkPlace = useCallback((position: WorldPoint): void => {
    const id = getNextAvailableSceneId(sceneRef.current, ["scene-link-"], nextSceneLinkId);
    const marker: MapSceneLinkMarker = {
      id,
      kind: "scene-link",
      position,
      name: `Conexion ${nextSceneLinkId.current - 1}`,
      locked: false,
      connection: null
    };
    setScene((current) => ({
      ...current,
      mapAnnotations: {
        ...current.mapAnnotations,
        sceneLinks: [...current.mapAnnotations.sceneLinks, marker]
      }
    }));
    setSceneLinkModalId(id);
    setInteraction((current) => selectElement(setActiveTool(current, "select"), id));
  }, []);

  const handleInformationAreaPaint = useCallback((cells: readonly InformationAreaCell[]): void => {
    if (cells.length === 0) return;
    const id = getNextAvailableSceneId(sceneRef.current, ["information-area-"], nextInformationAreaId);
    setMapAnnotationModal({ kind: "information-area", id, cells });
    setInteraction((current) => setActiveTool(current, "select"));
  }, []);

  const handleInformationAreaHighlight = useCallback((areaId: string): void => {
    const area = sceneRef.current.mapAnnotations.areas.find((candidate) => candidate.id === areaId);
    if (area === undefined) return;
    void window.ttrpg?.publishPlayerInformationAreaHighlight(
      createInformationAreaHighlightBroadcast(area)
    );
    setFeedback(`Area resaltada para jugadores durante 5 segundos.`);
  }, []);

  const setGridAdjustMode = useCallback((enabled: boolean): void => {
    setIsGridAdjustMode(enabled);

    if (enabled) {
      setIsSidebarVisible(true);
      setOpenSidebarSections((current) => ({ ...current, grid: true }));
      setInteraction((current) => setMapAdjustMode(setActiveTool(current, "select"), false));
    }
  }, []);

  const handleCreateElement = (kind: TacticalElementKind): void => {
    if (kind === "pointLight" || kind === "coneLight") {
      handleCreateLight(kind === "pointLight" ? "point" : "cone");
      return;
    }

    if (kind === "fire") {
      handleCreateFire();
      return;
    }

    handleCreateShape(kind);
  };

  const handleStartPathDrawing = (): void => {
    setPathDraft({ points: [], hoverPoint: null });
    setInteraction((current) => selectElement(setActiveTool(closeContextMenu(current), "path"), null));
  };

  const handleStartWaterDrawing = (): void => {
    setWaterDraft({ points: [], hoverPoint: null });
    setOpenSidebarSections((current) => ({ ...current, effects: true }));
    setInteraction((current) => selectElement(setActiveTool(closeContextMenu(current), "water"), null));
  };

  const handleStartRoomPin = useCallback((): void => {
    setMapAnnotationModal(null);
    setSceneLinkModalId(null);
    setSceneLinkStatuses({});
    setIsSidebarVisible(true);
    setOpenSidebarSections((current) => ({ ...current, annotations: true }));
    setInteraction((current) => selectElement(setActiveTool(closeContextMenu(current), "room-pin"), null));
  }, []);

  const handleStartSceneLink = useCallback((): void => {
    setMapAnnotationModal(null);
    setSceneLinkModalId(null);
    setIsSidebarVisible(true);
    setOpenSidebarSections((current) => ({ ...current, annotations: true }));
    setInteraction((current) => selectElement(setActiveTool(closeContextMenu(current), "scene-link"), null));
  }, []);

  const handleStartInformationArea = useCallback((): void => {
    setMapAnnotationModal(null);
    setIsSidebarVisible(true);
    setOpenSidebarSections((current) => ({ ...current, annotations: true }));
    setInteraction((current) => selectElement(setActiveTool(closeContextMenu(current), "information-area"), null));
  }, []);

  const handleSaveMapInformationPin = useCallback((pin: MapInformationPin): void => {
    setScene((current) => ({
      ...current,
      mapAnnotations: {
        ...current.mapAnnotations,
        pins: current.mapAnnotations.pins.some((candidate) => candidate.id === pin.id)
          ? current.mapAnnotations.pins.map((candidate) => candidate.id === pin.id ? pin : candidate)
          : [...current.mapAnnotations.pins, pin]
      }
    }));
    setMapAnnotationModal(null);
    setInteraction((current) => selectElement(setActiveTool(current, "select"), pin.id));
  }, []);

  const handleSaveMapInformationArea = useCallback((area: MapInformationArea): void => {
    setScene((current) => ({
      ...current,
      mapAnnotations: {
        ...current.mapAnnotations,
        areas: current.mapAnnotations.areas.some((candidate) => candidate.id === area.id)
          ? current.mapAnnotations.areas.map((candidate) => candidate.id === area.id ? area : candidate)
          : [...current.mapAnnotations.areas, area]
      }
    }));
    setMapAnnotationModal(null);
    setInteraction((current) => selectElement(setActiveTool(current, "select"), area.id));
  }, []);

  const handleEditMapAnnotation = useCallback((annotation: MapAnnotation): void => {
    if (annotation.kind === "scene-link") {
      setSceneLinkModalId(annotation.id);
      return;
    }
    setMapAnnotationModal(
      annotation.kind === "room-pin"
        ? { kind: "room-pin", id: annotation.id, position: annotation.position, initial: annotation, initialMode: "edit" }
        : { kind: "information-area", id: annotation.id, cells: annotation.cells, initial: annotation, initialMode: "edit" }
    );
  }, []);

  const handleMapAnnotationPreviewById = useCallback((annotationId: string): void => {
    const sceneLink = sceneRef.current.mapAnnotations.sceneLinks.find((candidate) => candidate.id === annotationId);
    if (sceneLink !== undefined) {
      if (sceneLink.connection === null || sceneLinkStatusesRef.current[sceneLink.id]?.state === "broken") {
        setSceneLinkModalId(sceneLink.id);
      } else {
        void navigateSceneLinkRef.current(sceneLink);
      }
      return;
    }
    const pin = sceneRef.current.mapAnnotations.pins.find((candidate) => candidate.id === annotationId);
    if (pin === undefined) return;
    setMapAnnotationModal({
      kind: "room-pin",
      id: pin.id,
      position: pin.position,
      initial: pin,
      initialMode: "preview"
    });
  }, []);

  const handleToggleMapAnnotationLock = useCallback((annotation: MapAnnotation): void => {
    setScene((current) => ({
      ...current,
      mapAnnotations: {
        ...current.mapAnnotations,
        pins: current.mapAnnotations.pins.map((pin) =>
          pin.id === annotation.id ? { ...pin, locked: !pin.locked } : pin
        ),
        areas: current.mapAnnotations.areas.map((area) =>
          area.id === annotation.id ? { ...area, locked: !area.locked } : area
        ),
        sceneLinks: current.mapAnnotations.sceneLinks.map((marker) =>
          marker.id === annotation.id ? { ...marker, locked: !marker.locked } : marker
        )
      }
    }));
  }, []);

  const handleSelectMapAnnotation = useCallback((annotation: MapAnnotation): void => {
    setInteraction((current) => selectElement(setActiveTool(current, "select"), annotation.id));
  }, []);

  const handleGoToMapAnnotation = useCallback((annotation: MapAnnotation): void => {
    viewportHandleRef.current?.centerOnWorldPoint(getMapAnnotationCenter(annotation));
    setInteraction((current) => selectElement(setActiveTool(current, "select"), annotation.id));
  }, []);

  const handleRenameSceneLink = useCallback(async (markerId: string, name: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (trimmedName === "") return false;

    const currentScene = sceneRef.current;
    const marker = currentScene.mapAnnotations.sceneLinks.find((candidate) => candidate.id === markerId);
    if (marker === undefined) {
      setFeedback("El punto de conexion ya no existe.");
      return false;
    }

    const nextScene: SceneDocument = {
      ...currentScene,
      mapAnnotations: {
        ...currentScene.mapAnnotations,
        sceneLinks: currentScene.mapAnnotations.sceneLinks.map((candidate) =>
          candidate.id === markerId ? renameSceneLinkMarker(candidate, trimmedName) : candidate
        )
      }
    };

    if (currentFilePath === null) {
      setScene((current) => ({
        ...current,
        mapAnnotations: {
          ...current.mapAnnotations,
          sceneLinks: current.mapAnnotations.sceneLinks.map((candidate) =>
            candidate.id === markerId ? renameSceneLinkMarker(candidate, trimmedName) : candidate
          )
        }
      }));
      setFeedback("Nombre actualizado; se guardara al establecer la ruta de la escena.");
      return true;
    }
    if (window.ttrpg === undefined) {
      setFeedback("La API de preload no esta disponible.");
      return false;
    }

    setIsBusy(true);
    try {
      const saved = await window.ttrpg.saveSceneToPath(
        createSceneSavePayload(nextScene, sceneAside),
        currentFilePath
      );
      if (!saved.ok) {
        setFeedback(saved.error);
        return false;
      }
      setScene((current) => ({
        ...current,
        mapAnnotations: {
          ...current.mapAnnotations,
          sceneLinks: current.mapAnnotations.sceneLinks.map((candidate) =>
            candidate.id === markerId ? renameSceneLinkMarker(candidate, trimmedName) : candidate
          )
        }
      }));
      lastSavedSceneJsonRef.current = JSON.stringify({ ...saved.scene, sceneAside });
      setFeedback("Nombre del punto guardado.");
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar el nombre del punto.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [currentFilePath, sceneAside]);

  async function persistCurrentSceneForSceneLink(): Promise<string | null> {
    const currentSnapshot = JSON.stringify({ ...sceneRef.current, sceneAside });
    if (currentFilePath !== null && lastSavedSceneJsonRef.current === currentSnapshot) {
      return currentFilePath;
    }

    let saved: SceneOperationResult | undefined;
    try {
      saved = currentFilePath === null
        ? await saveCurrentScene()
        : await window.ttrpg?.saveSceneToPath(
            createSceneSavePayload(sceneRef.current, sceneAside),
            currentFilePath
          );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la escena en segundo plano.");
      return null;
    }
    if (saved === undefined) {
      setFeedback("La API de preload no esta disponible.");
      return null;
    }
    if (!saved.ok) {
      setFeedback(saved.error);
      return null;
    }
    setCurrentFilePath(saved.filePath);
    lastSavedSceneJsonRef.current = JSON.stringify({ ...saved.scene, sceneAside });
    return saved.filePath;
  }

  async function handleConnectSceneLink(
    marker: MapSceneLinkMarker,
    targetScenePath: string,
    targetMarkerId: string
  ): Promise<boolean> {
    if (window.ttrpg === undefined) return false;
    const sourceScenePath = await persistCurrentSceneForSceneLink();
    if (sourceScenePath === null) return false;

    setIsBusy(true);
    try {
      const result = await window.ttrpg.connectSceneLink({
        sourceScenePath,
        sourceMarkerId: marker.id,
        targetScenePath,
        targetMarkerId
      });
      if (!result.ok) {
        setFeedback(result.error);
        return false;
      }
      setScene((current) => ({ ...current, mapAnnotations: result.mapAnnotations }));
      lastSavedSceneJsonRef.current = JSON.stringify({
        ...sceneRef.current,
        mapAnnotations: result.mapAnnotations,
        sceneAside
      });
      setFeedback(result.warning ?? "Conexion reciproca guardada.");
      return true;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisconnectSceneLink(marker: MapSceneLinkMarker): Promise<boolean> {
    if (window.ttrpg === undefined) return false;
    const scenePath = await persistCurrentSceneForSceneLink();
    if (scenePath === null) return false;
    setIsBusy(true);
    try {
      const result = await window.ttrpg.disconnectSceneLink({ scenePath, markerId: marker.id });
      if (!result.ok) {
        setFeedback(result.error);
        return false;
      }
      setScene((current) => ({ ...current, mapAnnotations: result.mapAnnotations }));
      lastSavedSceneJsonRef.current = JSON.stringify({
        ...sceneRef.current,
        mapAnnotations: result.mapAnnotations,
        sceneAside
      });
      setFeedback(result.warning ?? "Conexion desligada.");
      return true;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleNavigateSceneLink(marker: MapSceneLinkMarker): Promise<void> {
    if (window.ttrpg === undefined) {
      setSceneLinkModalId(marker.id);
      return;
    }
    const scenePath = await persistCurrentSceneForSceneLink();
    if (scenePath === null) return;
    setIsBusy(true);
    try {
      const result = await window.ttrpg.loadSceneLinkTarget({
        scenePath,
        markerId: marker.id
      });
      if (!result.ok) {
        setFeedback(result.error);
        setSceneLinkModalId(marker.id);
        return;
      }
      await runSceneOperation("cargada", async () => result.sceneResult, {
        playerEntryPoint: result.entryPoint
      });
    } finally {
      setIsBusy(false);
    }
  }
  navigateSceneLinkRef.current = handleNavigateSceneLink;

  const handleCreateShape = (kind: TacticalShapeKind): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, [`${kind}-`], nextShapeId);
    const shape = createTacticalShape({
      id,
      kind,
      position: interaction.contextMenu.world,
      grid: scene.grid,
      settings: scene.settings
    });

    setScene((current) => ({
      ...current,
      shapes: [...current.shapes, shape]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateLight = (kind: LightKind): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, [`${kind}-light-`], nextLightId);
    const light = createLightSource(id, kind, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      lights: [...current.lights, light]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateFire = (): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["fire-"], nextEffectId);
    const effect = createAnimatedFireEffect(id, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      effects: [...current.effects, effect]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateMagicalDarkness = (): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["magical-darkness-"], nextEffectId);
    const effect = createMagicalDarknessEffect(id, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      effects: [...current.effects, effect]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateDynamicLight = (): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["dynamic-light-"], nextEffectId);
    const effect = createDynamicLightEffect(id, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      effects: [...current.effects, effect]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateLabel = (): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["label-"], nextLabelId);
    const label = createSceneLabel(id, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      labels: [...current.labels, label]
    }));
    setIsSidebarVisible(true);
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleDeleteSelectedElement = useCallback(() => {
    const selectedId = selectedElementIdRef.current;
    const selectedAnnotation =
      sceneRef.current.mapAnnotations.pins.find((pin) => pin.id === selectedId) ??
      sceneRef.current.mapAnnotations.areas.find((area) => area.id === selectedId) ??
      sceneRef.current.mapAnnotations.sceneLinks.find((marker) => marker.id === selectedId);
    if (selectedAnnotation !== undefined && !canDeleteMapAnnotation(selectedAnnotation)) {
      setFeedback("Desbloquea la anotacion antes de eliminarla.");
      return;
    }

    if (selectedAnnotation?.kind === "scene-link" && selectedAnnotation.connection !== null) {
      void handleDisconnectSceneLink(selectedAnnotation).then((disconnected) => {
        if (!disconnected) return;
        setScene((current) => ({
          ...current,
          mapAnnotations: {
            ...current.mapAnnotations,
            sceneLinks: current.mapAnnotations.sceneLinks.filter((marker) => marker.id !== selectedAnnotation.id)
          }
        }));
        setInteraction((current) => selectElement(current, null));
      });
      return;
    }

    setScene((current) => {
      if (interaction.selectedElementId === null) {
        return current;
      }

      return {
        ...current,
        lights: current.lights.filter((light) => light.id !== interaction.selectedElementId),
        effects: current.effects.filter((effect) => effect.id !== interaction.selectedElementId),
        shapes: current.shapes.filter((shape) => shape.id !== interaction.selectedElementId),
        tokens: current.tokens.filter((token) => token.id !== interaction.selectedElementId),
        labels: current.labels.filter((label) => label.id !== interaction.selectedElementId),
        mapAnnotations: {
          ...current.mapAnnotations,
          pins: current.mapAnnotations.pins.filter((pin) => pin.id !== interaction.selectedElementId),
          areas: current.mapAnnotations.areas.filter((area) => area.id !== interaction.selectedElementId),
          sceneLinks: current.mapAnnotations.sceneLinks.filter((marker) => marker.id !== interaction.selectedElementId)
        }
      };
    });
    setTokenImageUrls((current) => {
      if (interaction.selectedElementId === null) {
        return current;
      }

      const next = { ...current };
      delete next[interaction.selectedElementId];
      return next;
    });
    setInteraction((current) => deleteSelectedElement(current));
  }, [interaction.selectedElementId]);

  const handleCloseContextMenu = (): void => {
    setInteraction((current) => closeContextMenu(current));
  };

  const handleToggleZoomLock = (): void => {
    setInteraction((current) => setZoomLocked(current, !current.isZoomLocked));
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        locked: !current.grid.locked
      }
    }));
  };

  const mapState = useMemo<MapImageState | null>(
    () =>
      scene.map.imagePath !== null && mapImageUrl !== null
        ? {
            imagePath: scene.map.imagePath,
            imageUrl: mapImageUrl,
            position: scene.map.position,
            scale: scene.map.scale
          }
        : null,
    [scene.map.imagePath, scene.map.position, scene.map.scale, mapImageUrl]
  );

  const canCreateNewScene = useMemo(
    () => hasSceneContent(scene, interaction.elements.length),
    [scene, interaction.elements.length]
  );

  const sceneWithAside = useMemo(() => ({ ...scene, sceneAside }), [scene, sceneAside]);
  const playerSceneSnapshot = useMemo(() => createPlayerSceneSnapshot(sceneWithAside), [sceneWithAside]);

  const playerWindowSnapshot = useMemo<PlayerWindowSnapshot>(
    () => ({
      scene: playerSceneSnapshot,
      mapImageUrl,
      tokenImageUrls,
      camera: playerCameraRef.current,
      cameraSyncKey: playerCameraSyncKey,
      showDmFogOverlay,
      informationAreaHighlightResetKey
    }),
    [playerSceneSnapshot, mapImageUrl, tokenImageUrls, playerCameraSyncKey, showDmFogOverlay, informationAreaHighlightResetKey]
  );

  useEffect(() => {
    if (!isPlayerWindowOpen) {
      return undefined;
    }

    const handle = window.setTimeout(() => {
      void window.ttrpg?.publishPlayerScene(playerWindowSnapshot);
    }, PLAYER_SCENE_PUBLISH_DELAY_MS);

    return () => window.clearTimeout(handle);
  }, [isPlayerWindowOpen, playerWindowSnapshot]);

  useEffect(() => {
    const unsubscribeClosed = window.ttrpg?.onPlayerWindowClosed(() => {
      isPlayerWindowOpenRef.current = false;
      setIsPlayerWindowOpen(false);
      effectivePlayerCameraRef.current = null;
      pendingPlayerCameraCommandRevisionRef.current = null;
      acknowledgedPlayerCameraCommandRevisionRef.current = null;
      refreshPlayerCameraControl("closed");
    });
    const unsubscribeCameraReport = window.ttrpg?.onPlayerCameraReport((report) => {
      if (!shouldApplyPlayerCameraReport(lastPlayerCameraReportRevisionRef.current, report)) {
        return;
      }

      lastPlayerCameraReportRevisionRef.current = report.reportRevision;
      effectivePlayerCameraRef.current = normalizeCameraSnapshot(report.camera);
      if (report.acknowledgedCommandRevision !== null) {
        acknowledgedPlayerCameraCommandRevisionRef.current = Math.max(
          acknowledgedPlayerCameraCommandRevisionRef.current ?? -1,
          report.acknowledgedCommandRevision
        );
      }
      refreshPlayerCameraControl();
    });
    const unsubscribePlayerReady = window.ttrpg?.onPlayerWindowReady(() => {
      lastPlayerCameraReportRevisionRef.current = -1;
      effectivePlayerCameraRef.current = null;
      acknowledgedPlayerCameraCommandRevisionRef.current = null;
      if (isPlayerWindowOpenRef.current) {
        sendPlayerCameraCommand("open");
      } else {
        refreshPlayerCameraControl("closed");
      }
    });

    void window.ttrpg?.getPlayerWindowState().then((state) => {
      if (state.cameraCommand !== null) {
        playerCameraCommandRevisionRef.current = Math.max(
          playerCameraCommandRevisionRef.current,
          state.cameraCommand.revision
        );
        playerCameraRef.current = normalizeCameraSnapshot(state.cameraCommand.camera);
      }
      if (state.isOpen) {
        isPlayerWindowOpenRef.current = true;
        setIsPlayerWindowOpen(true);
        sendPlayerCameraCommand("open");
      }
    });

    return () => {
      unsubscribeClosed?.();
      unsubscribeCameraReport?.();
      unsubscribePlayerReady?.();
    };
  }, [refreshPlayerCameraControl, sendPlayerCameraCommand]);

  useEffect(() => {
    refreshPlayerCameraControl();
  }, [refreshPlayerCameraControl]);

  useEffect(() => {
    void refreshMonsterTemplates();

    const unsubscribe = window.ttrpg?.onOpenMonsterTemplateManager(() => {
      setIsMonsterTemplateManagerOpen(true);
      void refreshMonsterTemplates();
    });

    return () => unsubscribe?.();
  }, []);

  async function refreshMonsterTemplates(): Promise<void> {
    if (window.ttrpg === undefined) return;
    const result = await window.ttrpg.listMonsterTemplates();
    if (result.ok) {
      setMonsterTemplates(result.templates);
    } else {
      setFeedback(result.error);
    }
  }

  async function handleSaveMonsterTemplate(template: MonsterTemplate): Promise<void> {
    if (window.ttrpg === undefined) {
      setFeedback("La API de preload no esta disponible.");
      return;
    }
    const result = await window.ttrpg.saveMonsterTemplate(template);
    if (result.ok) {
      setMonsterTemplates(result.templates);
    } else {
      setFeedback(result.error);
    }
  }

  async function handleDeleteMonsterTemplate(id: string): Promise<void> {
    if (window.ttrpg === undefined) {
      setFeedback("La API de preload no esta disponible.");
      return;
    }
    const result = await window.ttrpg.deleteMonsterTemplate(id);
    if (result.ok) {
      setMonsterTemplates(result.templates);
    } else {
      setFeedback(result.error);
    }
  }

  const resetToNewScene = useCallback((): void => {
    const defaultScene = createDefaultScene();
    sessionStorage.removeItem("ttrpg:session-scene");
    setScene(defaultScene);
    setSceneAside(createDefaultSceneAside());
    playerCameraRef.current = normalizeCameraSnapshot({
      center: { x: defaultScene.camera.x, y: defaultScene.camera.y },
      zoom: defaultScene.camera.zoom
    });
    dmCameraRef.current = playerCameraRef.current;
    effectivePlayerCameraRef.current = null;
    acknowledgedPlayerCameraCommandRevisionRef.current = null;
    setPlayerCameraSyncKey((current) => current + 1);
    setMapImageUrl(null);
    setTokenImageUrls({});
    setCurrentFilePath(null);
    setFeedback("Escena default en memoria");
    setWarnings([]);
    setInteraction(createInitialInteractionState());
    setPathDraft({ points: [], hoverPoint: null });
    setWaterDraft({ points: [], hoverPoint: null });
    setMapAnnotationModal(null);
    setIsSpaceDragActive(false);
    setGridAdjustMode(false);
    setArcanePointerResetKey((current) => current + 1);
    setInformationAreaHighlightResetKey((current) => current + 1);
    setIsSelectedPropertiesOpen(true);
    nextShapeId.current = 1;
    nextLightId.current = 1;
    nextEffectId.current = 1;
    nextTokenId.current = 1;
    nextLabelId.current = 1;
    nextRevealId.current = 1;
    nextPinId.current = 1;
    nextInformationAreaId.current = 1;
    nextSceneLinkId.current = 1;
    lastSavedSceneJsonRef.current = null;
    refreshPlayerCameraControl();
    sendPlayerCameraCommand("scene-change");
  }, [refreshPlayerCameraControl, sendPlayerCameraCommand, setGridAdjustMode]);

  const handleRequestNewScene = useCallback((): void => {
    if (!canCreateNewScene) {
      return;
    }

    setIsNewSceneDialogOpen(true);
  }, [canCreateNewScene]);

  const handleCancelNewScene = useCallback((): void => {
    setIsNewSceneDialogOpen(false);
  }, []);

  const handleDiscardAndCreateNewScene = useCallback((): void => {
    resetToNewScene();
    setIsNewSceneDialogOpen(false);
  }, [resetToNewScene]);

  const cancelPathDrawing = useCallback((): void => {
    setPathDraft({ points: [], hoverPoint: null });
    setInteraction((current) => setActiveTool(current, "select"));
  }, []);

  const cancelWaterDrawing = useCallback((): void => {
    setWaterDraft({ points: [], hoverPoint: null });
    setInteraction((current) => setActiveTool(current, "select"));
  }, []);

  const confirmPathDrawing = useCallback((): void => {
    const draft = pathDraftRef.current;

    if (draft.points.length < 2) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["path-"], nextShapeId);
    const path = createPathShape({ id, points: draft.points });

    setScene((sceneCurrent) => ({
      ...sceneCurrent,
      shapes: [...sceneCurrent.shapes, path]
    }));
    setPathDraft({ points: [], hoverPoint: null });
    setInteraction((interactionCurrent) => selectElement(setActiveTool(interactionCurrent, "select"), id));
  }, []);

  const removeLastPathPoint = useCallback((): void => {
    setPathDraft((current) => {
      if (current.points.length <= 1) {
        setInteraction((interactionCurrent) => setActiveTool(interactionCurrent, "select"));
        return {
          points: [],
          hoverPoint: null
        };
      }

      const points = current.points.slice(0, -1);
      return {
        points,
        hoverPoint: points[points.length - 1] ?? null
      };
    });
  }, []);

  const confirmWaterDrawing = useCallback((): void => {
    const draft = waterDraftRef.current;
    const points =
      draft.hoverPoint === null ||
      draft.points.some((point) => point.x === draft.hoverPoint?.x && point.y === draft.hoverPoint?.y)
        ? draft.points
        : [...draft.points, draft.hoverPoint];

    if (points.length < 2) {
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["water-"], nextEffectId);

    try {
      const effect = createWaterEffect({
        id,
        points,
        gridCellSizeWorld: sceneRef.current.grid.cellSizeWorld,
        width: sceneRef.current.grid.cellSizeWorld
      });

      const riverMerge =
        effect.variant === "river"
          ? mergeConsecutiveRiverEffects({
              rivers: sceneRef.current.effects.filter(
                (sceneEffect): sceneEffect is RiverWaterEffect =>
                  sceneEffect.kind === "water" && sceneEffect.variant === "river"
              ),
              incoming: effect,
              maxEndpointDistance: sceneRef.current.grid.cellSizeWorld
            })
          : null;
      const selectedWaterId = riverMerge?.effect.id ?? id;

      setScene((sceneCurrent) => {
        if (riverMerge === null || !riverMerge.didMerge) {
          return {
            ...sceneCurrent,
            effects: [...sceneCurrent.effects, effect]
          };
        }

        const mergedIds = new Set(riverMerge.mergedIds);

        return {
          ...sceneCurrent,
          effects: sceneCurrent.effects
            .filter((sceneEffect) => !mergedIds.has(sceneEffect.id))
            .concat(riverMerge.effect)
        };
      });
      setWaterDraft({ points: [], hoverPoint: null });
      setInteraction((interactionCurrent) => selectElement(setActiveTool(interactionCurrent, "select"), selectedWaterId));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el agua.");
    }
  }, [setScene]);

  const removeLastWaterPoint = useCallback((): void => {
    setWaterDraft((current) => {
      if (current.points.length <= 1) {
        setInteraction((interactionCurrent) => setActiveTool(interactionCurrent, "select"));
        return {
          points: [],
          hoverPoint: null
        };
      }

      const points = current.points.slice(0, -1);
      return {
        points,
        hoverPoint: points[points.length - 1] ?? null
      };
    });
  }, []);

  useEffect(() => {
    const shouldIgnoreSpaceDrag = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      );
    };

    const resetToSelection = (): void => {
      setPathDraft({ points: [], hoverPoint: null });
      setWaterDraft({ points: [], hoverPoint: null });
      setMapAnnotationModal(null);
      setInteraction((current) => setMapAdjustMode(setActiveTool(current, "select"), false));
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      // No interceptar atajos cuando el foco está en un campo de texto o editor rich text
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target !== null && (target.isContentEditable || target.closest("[contenteditable]") !== null));

      if (isEditableTarget) {
        // Solo permitir Escape para cerrar modales; el resto lo maneja el editor/input
        if (event.key === "Escape") {
          event.preventDefault();
          setMapAnnotationModal(null);
          setInteraction((current) => cancelInteraction(current));
        }
        return;
      }

      if (isNewSceneDialogOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          handleCancelNewScene();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setInteraction((current) =>
          setActiveTool(current, current.activeTool === "fog-reveal" ? "select" : "fog-reveal")
        );
        setScene((current) => ({
          ...current,
          fogOfWar: updateFogOfWar(current.fogOfWar, { enabled: true })
        }));
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setGridAdjustMode(!isGridAdjustMode);
        return;
      }

      if (event.code === "Space" && !shouldIgnoreSpaceDrag(event.target)) {
        event.preventDefault();
        setIsSpaceDragActive(true);
        resetToSelection();
        return;
      }

      if (interaction.activeTool === "path") {
        if (event.key === "Enter") {
          event.preventDefault();
          confirmPathDrawing();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          cancelPathDrawing();
          return;
        }

        if (event.key === "Backspace") {
          event.preventDefault();
          removeLastPathPoint();
          return;
        }
      }

      if (interaction.activeTool === "water") {
        if (event.key === "Enter") {
          event.preventDefault();
          confirmWaterDrawing();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          cancelWaterDrawing();
          return;
        }

        if (event.key === "Backspace") {
          event.preventDefault();
          removeLastWaterPoint();
          return;
        }
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelectedElement();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMapAnnotationModal(null);
        setInteraction((current) => cancelInteraction(current));
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.code !== "Space") {
        return;
      }

      if (!isSpaceDragActiveRef.current && shouldIgnoreSpaceDrag(event.target)) {
        return;
      }

      event.preventDefault();
      setIsSpaceDragActive(false);
      resetToSelection();
    };

    const handleWindowBlur = (): void => {
      setIsSpaceDragActive(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [
    cancelPathDrawing,
    cancelWaterDrawing,
    confirmPathDrawing,
    confirmWaterDrawing,
    handleCancelNewScene,
    handleDeleteSelectedElement,
    interaction.activeTool,
    isGridAdjustMode,
    isNewSceneDialogOpen,
    removeLastPathPoint,
    removeLastWaterPoint,
    setGridAdjustMode
  ]);

  async function saveCurrentScene(): Promise<SceneOperationResult> {
    if (window.ttrpg === undefined) {
      return { ok: false, error: "La API de preload no esta disponible." };
    }

    return window.ttrpg.saveScene(createSceneSavePayload(sceneRef.current, sceneAside), {
      suggestedFilePath: currentFilePath
    });
  }

  async function handleSaveScene(): Promise<void> {
    await runSceneOperation("guardada", saveCurrentScene);
  }

  async function handleSaveAndCreateNewScene(): Promise<void> {
    setIsBusy(true);
    setWarnings([]);

    try {
      const result = await saveCurrentScene();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      resetToNewScene();
      setIsNewSceneDialogOpen(false);
      setFeedback("Escena guardada. Nueva escena lista.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadScene(): Promise<void> {
    await runSceneOperation("cargada", async () => {
      if (window.ttrpg === undefined) {
        return { ok: false, error: "La API de preload no esta disponible." };
      }

      return window.ttrpg.loadScene();
    });
  }

  function publishLoadedPlayerScene({
    scene: loadedScene,
    sceneAside: loadedSceneAside,
    mapImageUrl: loadedMapImageUrl,
    tokenImageUrls: loadedTokenImageUrls,
    camera,
    cameraSyncKey
  }: {
    readonly scene: SceneDocument;
    readonly sceneAside: SceneAside;
    readonly mapImageUrl: string | null;
    readonly tokenImageUrls: Readonly<Record<string, string>>;
    readonly camera: ViewportCameraSnapshot;
    readonly cameraSyncKey: number;
  }): void {
    if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
      return;
    }

    void window.ttrpg.publishPlayerScene({
      scene: createPlayerSceneSnapshot({ ...loadedScene, sceneAside: loadedSceneAside }),
      mapImageUrl: loadedMapImageUrl,
      tokenImageUrls: loadedTokenImageUrls,
      camera,
      cameraSyncKey,
      showDmFogOverlay
    });
  }

  async function runSceneOperation(
    actionLabel: "guardada" | "cargada",
    operation: () => Promise<SceneOperationResult>,
    options?: { readonly playerEntryPoint?: WorldPoint }
  ): Promise<void> {
    setIsBusy(true);
    setWarnings([]);
    // Saving always resolves any outdated-format situation
    if (actionLabel === "guardada") setNeedsResave(false);

    try {
      const result = await operation();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setScene(result.scene);
      setMapAnnotationModal(null);
      setSceneLinkModalId(null);
      const loadedSceneAside = result.scene.sceneAside ?? createDefaultSceneAside();
      setSceneAside(loadedSceneAside);
      if (actionLabel === "cargada") {
        const loadedCamera = normalizeCameraSnapshot({
          center: { x: result.scene.camera.x, y: result.scene.camera.y },
          zoom: result.scene.camera.zoom
        });
        const playerCamera = options?.playerEntryPoint === undefined
          ? loadedCamera
          : normalizeCameraSnapshot({ center: options.playerEntryPoint, zoom: loadedCamera.zoom });
        const nextCameraSyncKey = playerCameraSyncKeyRef.current + 1;
        playerCameraRef.current = playerCamera;
        dmCameraRef.current = loadedCamera;
        effectivePlayerCameraRef.current = null;
        acknowledgedPlayerCameraCommandRevisionRef.current = null;
        playerCameraSyncKeyRef.current = nextCameraSyncKey;
        setPlayerCameraSyncKey(nextCameraSyncKey);
        setMapImageUrl(result.mapImageUrl ?? null);
        setTokenImageUrls(result.tokenImageUrls ?? {});
        setInteraction((current) => setZoomLocked(current, result.scene.grid.locked));
        setArcanePointerResetKey((current) => current + 1);
        setInformationAreaHighlightResetKey((current) => current + 1);
        syncSceneEntityCounters(result.scene);
        publishLoadedPlayerScene({
          scene: result.scene,
          sceneAside: loadedSceneAside,
          mapImageUrl: result.mapImageUrl ?? null,
          tokenImageUrls: result.tokenImageUrls ?? {},
          camera: playerCamera,
          cameraSyncKey: nextCameraSyncKey
        });
        refreshPlayerCameraControl();
        sendPlayerCameraCommand("scene-change");
      }
      setCurrentFilePath(result.filePath);
      lastSavedSceneJsonRef.current = JSON.stringify({ ...result.scene, sceneAside: loadedSceneAside });
      setFeedback(`Escena ${actionLabel}`);

      // Separate "scene-format-outdated" from generic warnings so it can get
      // its own prominent UI banner rather than disappearing into the status bar.
      const genericWarnings = result.warnings.filter(
        (w) => w.code !== "scene-format-outdated"
      );
      const isOutdated = result.warnings.some(
        (w) => w.code === "scene-format-outdated"
      );
      setWarnings(genericWarnings.map((w) => w.message));
      setNeedsResave(isOutdated);
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    const unsubscribe = window.ttrpg?.onRecentSceneOpen((result) => {
      void runSceneOperation("cargada", async () => result);
    });

    return () => {
      unsubscribe?.();
    };
  }, [runSceneOperation]);

  async function handleOpenMapImage(): Promise<void> {
    setIsBusy(true);
    setWarnings([]);

    try {
      if (window.ttrpg === undefined) {
        setFeedback("La API de preload no esta disponible.");
        return;
      }

      const result = await window.ttrpg.openMapImage();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      const nextMap = createMapImageState(result.imagePath, result.imageUrl);
      setMapImageUrl(nextMap.imageUrl);
      setArcanePointerResetKey((current) => current + 1);
      setScene((current) => ({
        ...current,
        map: {
          imagePath: nextMap.imagePath,
          position: nextMap.position,
          scale: nextMap.scale
        }
      }));
      setFeedback("Mapa cargado");
    } finally {
      setIsBusy(false);
    }
  }

  function handleGridVisibilityChange(): void {
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        enabled: !current.grid.enabled
      }
    }));
  }

  function handleGridOpacityChange(opacity: number): void {
    setScene((current) => ({
      ...current,
      grid: setGridOpacity(current.grid, opacity)
    }));
  }

  function handleDarknessEnabledChange(): void {
    setScene((current) => ({
      ...current,
      darkness: {
        ...current.darkness,
        enabled: !current.darkness.enabled
      }
    }));
  }

  function handleDarknessOpacityChange(opacity: number): void {
    setScene((current) => ({
      ...current,
      darkness: {
        ...current.darkness,
        opacity: Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : 0))
      }
    }));
  }

  function handleDarkvisionEnabledChange(): void {
    setScene((current) => ({
      ...current,
      darkness: {
        ...current.darkness,
        darkvisionEnabled: !current.darkness.darkvisionEnabled
      }
    }));
  }

  function handleFogEnabledChange(): void {
    const nextEnabled = !scene.fogOfWar.enabled;

    setScene((current) => ({
      ...current,
      fogOfWar: updateFogOfWar(current.fogOfWar, {
        enabled: nextEnabled
      })
    }));

    if (!nextEnabled && interaction.activeTool === "fog-reveal") {
      setInteraction((current) => setActiveTool(current, "select"));
    }
  }

  function handleFogOpacityChange(opacity: number): void {
    setScene((current) => ({
      ...current,
      fogOfWar: updateFogOfWar(current.fogOfWar, { opacity })
    }));
  }

  function handleFogColorChange(color: string): void {
    setScene((current) => ({
      ...current,
      fogOfWar: updateFogOfWar(current.fogOfWar, { color })
    }));
  }

  function handleFogRevealRadiusChange(radius: number): void {
    setScene((current) => ({
      ...current,
      fogOfWar: updateFogOfWar(current.fogOfWar, { revealRadius: radius })
    }));
  }

  function handleClearFogReveals(): void {
    setScene((current) => ({
      ...current,
      fogOfWar: clearRevealedAreas(current.fogOfWar)
    }));
  }

  const handleGridCellSizeChange = useCallback((cellSizeWorld: number): void => {
    setScene((current) => ({
      ...current,
      grid: setGridCellSize(current.grid, cellSizeWorld)
    }));
  }, []);

  const handleMapRenderError = useCallback((message: string): void => {
    setFeedback(message);
  }, []);

  const handleMapRendered = useCallback((message: string): void => {
    setFeedback(message);
  }, []);

  const handleMapPositionChange = useCallback((x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      map: { ...current.map, position: { x, y } }
    }));
  }, []);

  const handleMapScaleChange = useCallback((scale: number): void => {
    setScene((current) => ({
      ...current,
      map: {
        ...current.map,
        scale: sanitizeMapScale(scale)
      }
    }));
  }, []);

  const handleElementMove = useCallback((elementId: string, x: number, y: number): void => {
    setScene((current) => {
      return {
      ...current,
      lights: current.lights.map((light) =>
        light.id === elementId ? moveLightSource(light, { x, y }) : light
      ),
      shapes: current.shapes.map((shape) =>
        shape.id === elementId
          ? moveShape(
              shape,
              { x, y },
              current.settings.snapToGrid ? current.grid.cellSizeWorld : undefined
            )
          : shape
      ),
      effects: current.effects.map((effect) =>
        effect.id === elementId
          ? effect.kind === "fire"
            ? updateAnimatedFireEffect(effect, { position: { x, y } })
            : effect.kind === "dynamic-light"
              ? updateDynamicLightEffect(effect, { position: { x, y } })
            : effect.kind === "magical-darkness"
              ? updateMagicalDarknessEffect(effect, { position: { x, y } })
              : updateWaterEffect(effect, { position: { x, y } })
          : effect
      ),
      tokens: current.tokens.map((token) =>
        token.id === elementId
          ? {
              ...token,
              position: snapTokenToGrid({ x, y }, current.grid, token.footprintCells)
            }
          : token
      ),
      labels: current.labels.map((label) =>
        label.id === elementId ? updateSceneLabel(label, { position: { x, y } }) : label
      ),
      mapAnnotations: {
        ...current.mapAnnotations,
        pins: current.mapAnnotations.pins.map((candidate) =>
          candidate.id === elementId && !candidate.locked
            ? { ...candidate, position: { x, y } }
            : candidate
        ),
        areas: current.mapAnnotations.areas.map((candidate) =>
          candidate.id === elementId && !candidate.locked
            ? translateInformationArea(candidate, {
                x: x - getMapAnnotationCenter(candidate).x,
                y: y - getMapAnnotationCenter(candidate).y
              })
            : candidate
        ),
        sceneLinks: current.mapAnnotations.sceneLinks.map((candidate) =>
          candidate.id === elementId && !candidate.locked
            ? { ...candidate, position: { x, y } }
            : candidate
        )
      }
    };
    });
  }, []);

  const handleLightDirectionChange = useCallback((elementId: string, direction: number): void => {
    setScene((current) => ({
      ...current,
      lights: current.lights.map((light) =>
        light.id === elementId ? updateLightSource(light, { direction }) : light
      )
    }));
  }, []);

  const handleLightRadiusChange = useCallback((elementId: string, radius: number): void => {
    setScene((current) => ({
      ...current,
      lights: current.lights.map((light) =>
        light.id === elementId ? updateLightSource(light, { radius }) : light
      )
    }));
  }, []);

  const handleShapeEndMove = useCallback((elementId: string, x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId ? setLinearShapeEnd(shape, { x, y }) : shape
      )
    }));
  }, []);

  const handlePathPointMove = useCallback((elementId: string, pointIndex: number, x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId ? movePathPoint(shape, pointIndex, { x, y }, current.grid.cellSizeWorld) : shape
      )
    }));
  }, []);

  const handlePathMove = useCallback((elementId: string, x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId ? moveShape(shape, { x, y }, current.grid.cellSizeWorld) : shape
      )
    }));
  }, []);

  const handlePathPointerMove = useCallback((point: WorldPoint | null): void => {
    viewportHandleRef.current?.setPathHoverPoint(point);
  }, []);

  const handlePathPointAdd = useCallback((point: WorldPoint): void => {
    setPathDraft((current) => {
      const previous = current.points[current.points.length - 1];

      if (previous !== undefined && previous.x === point.x && previous.y === point.y) {
        return current;
      }

      return {
        points: [...current.points, point],
        hoverPoint: point
      };
    });
  }, []);

  const handleWaterPointerMove = useCallback((point: WorldPoint | null): void => {
    viewportHandleRef.current?.setWaterHoverPoint(point);
  }, []);

  const handleWaterPointAdd = useCallback((point: WorldPoint): void => {
    setWaterDraft((current) => {
      const previous = current.points[current.points.length - 1];

      if (previous !== undefined && Math.hypot(previous.x - point.x, previous.y - point.y) < 2) {
        return current;
      }

      return {
        points: [...current.points, point],
        hoverPoint: point
      };
    });
  }, []);

  const handleShapeDirectionChange = useCallback((elementId: string, direction: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) => {
        if (shape.id !== elementId) return shape;
        if (shape.type === "cone") return updateShape(shape, { direction });
        return rotateLinearShape(shape, direction);
      })
    }));
  }, []);

  const handleShapeRadiusChange = useCallback((elementId: string, radius: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId ? setShapeRadius(shape, radius) : shape
      )
    }));
  }, []);

  const handleShapeRectResize = useCallback((elementId: string, width: number, height: number, anchorX: number, anchorY: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId
          ? updateShape(moveShape(shape, { x: anchorX, y: anchorY }), { width, height })
          : shape
      )
    }));
  }, []);

  const handleFogRevealStroke = useCallback((points: readonly { readonly x: number; readonly y: number }[]): void => {
    setScene((current) => {
      if (!current.fogOfWar.enabled || points.length === 0) {
        return current;
      }

      const revealArea = createStrokeRevealArea({
        id: getNextAvailableSceneId(current, ["reveal-"], nextRevealId),
        points,
        radius: current.fogOfWar.revealRadius
      });

      return {
        ...current,
        fogOfWar: addRevealedArea(current.fogOfWar, revealArea)
      };
    });
  }, []);

  const handleFirePaint = useCallback((cells: readonly FireCell[], center: { readonly x: number; readonly y: number }): void => {
    if (cells.length === 0) {
      return;
    }

    setScene((current) => {
      const activeFire = current.effects.find(
        (effect): effect is SceneFireEffect =>
          effect.id === selectedElementIdRef.current && effect.kind === "fire"
      );
      const selectedEffect = current.effects.find(
        (effect): effect is SceneFireEffect =>
          effect.id === selectedElementIdRef.current &&
          effect.kind === "fire" &&
          effect.zone.kind === "cells"
      );

      if (selectedEffect !== undefined && selectedEffect.zone.kind === "cells") {
        const mergedCells = mergeFireCells(selectedEffect.zone.cells, cells);

        return {
          ...current,
          effects: current.effects.map((effect) =>
            effect.id === selectedEffect.id && effect.kind === "fire"
              ? updateAnimatedFireEffect(effect, {
                  zone: createCellFireZone(mergedCells, selectedEffect.zone.radius)
                })
              : effect
          )
        };
      }

      const id = getNextAvailableSceneId(current, ["fire-"], nextEffectId);
      const radius =
        activeFire?.zone.kind === "circle" || activeFire?.zone.kind === "cells"
          ? activeFire.zone.radius
          : 25;
      const effect = updateAnimatedFireEffect(createAnimatedFireEffect(id, center), {
        color: "#ff3030",
        opacity: 0.68,
        zone: createCellFireZone(cells, radius)
      });

      setInteraction((currentInteraction) => selectElement(currentInteraction, id));

      return {
        ...current,
        effects: [...current.effects, effect]
      };
    });
  }, []);

  const handleFireZoneRadiusChange = useCallback((elementId: string, radius: number): void => {
    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === elementId && effect.kind === "fire" && effect.zone.kind === "circle"
          ? updateAnimatedFireEffect(effect, {
              zone: createCircleFireZone(radius, effect.zone.mode)
            })
          : effect.id === elementId && effect.kind === "fire" && effect.zone.kind === "cells"
            ? updateAnimatedFireEffect(effect, {
                zone: createCellFireZone(effect.zone.cells, radius)
              })
          : effect
      )
    }));
  }, []);

  const handleFireLightRadiusChange = useCallback((elementId: string, radius: number): void => {
    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === elementId && effect.kind === "fire"
          ? updateAnimatedFireEffect(effect, { lightRadius: radius })
          : effect
      )
    }));
  }, []);

  const handleMagicalDarknessRadiusChange = useCallback((elementId: string, radius: number): void => {
    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === elementId && effect.kind === "magical-darkness"
          ? updateMagicalDarknessEffect(effect, { radius })
          : effect
      )
    }));
  }, []);

  const handleWaterPatternRotationChange = useCallback((elementId: string, rotation: number): void => {
    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === elementId && effect.kind === "water"
          ? updateWaterEffect(effect, { patternRotation: rotation })
          : effect
      )
    }));
  }, []);

  const handleWaterLineRotationChange = useCallback((elementId: string, rotation: number): void => {
    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === elementId && effect.kind === "water"
          ? updateWaterEffect(effect, { lineRotation: rotation })
          : effect
      )
    }));
  }, []);

  function handleToggleMapAdjust(): void {
    setGridAdjustMode(false);
    setInteraction((current) => setMapAdjustMode(current, !current.isMapAdjustMode));
  }

  function handleToggleFogRevealMode(): void {
    if (!scene.fogOfWar.enabled) {
      return;
    }

    setInteraction((current) =>
      setActiveTool(current, current.activeTool === "fog-reveal" ? "select" : "fog-reveal")
    );
  }

  function handleToggleFirePaintMode(): void {
    setInteraction((current) => {
      if (current.activeTool === "fire-paint") {
        return selectElement(setActiveTool(current, "select"), null);
      }
      return setActiveTool(current, "fire-paint");
    });
  }

  function handleToggleArcanePointerMode(): void {
    setPathDraft({ points: [], hoverPoint: null });
    setWaterDraft({ points: [], hoverPoint: null });
    setGridAdjustMode(false);
    setIsSidebarVisible(true);
    setOpenSidebarSections((current) => ({ ...current, effects: true }));
    setInteraction((current) =>
      selectElement(
        setActiveTool(current, current.activeTool === "arcane-pointer" ? "select" : "arcane-pointer"),
        null
      )
    );
  }

  async function handleOpenPlayerWindow(): Promise<void> {
    if (window.ttrpg === undefined) {
      setFeedback("La API de preload no esta disponible.");
      return;
    }

    const result = await window.ttrpg.openPlayerWindow({
      ...playerWindowSnapshot,
      camera: playerCameraRef.current
    });

    if (!result.ok) {
      setFeedback(result.error ?? "No se pudo abrir la ventana de jugador.");
      return;
    }

    isPlayerWindowOpenRef.current = true;
    setIsPlayerWindowOpen(true);
    sendPlayerCameraCommand("open");
    setFeedback("Ventana de jugador lista.");
  }

  const handleSetCombatTracker = useCallback((combatTracker: CombatTracker): void => {
    setScene((current) => ({ ...current, combatTracker }));
  }, [setScene]);

  const handleNextCombatTurn = useCallback((): void => {
    setScene((current) => ({ ...current, combatTracker: advanceTurn(current.combatTracker) }));
  }, [setScene]);

  const handleToggleCombatParticipantDefeated = useCallback(
    (participantId: string, defeated: boolean): void => {
      setScene((current) => ({
        ...current,
        combatTracker: markParticipantDefeated(current.combatTracker, participantId, defeated)
      }));
    },
    [setScene]
  );

  const handleEndCombat = useCallback((): void => {
    setScene((current) => ({ ...current, combatTracker: createDefaultCombatTracker() }));
    setIsCombatSetupOpen(false);
    setFeedback("Batalla finalizada. Turnero listo para una nueva batalla.");
  }, [setScene]);

  function handleCreateToken(): void {
    if (interaction.contextMenu === null) {
      return;
    }

    setNewTokenDraft({
      imagePath: null,
      imageUrl: null,
      name: "",
      size: "medium",
      position: interaction.contextMenu.world
    });
    setInteraction((current) => closeContextMenu(current));
  }

  function handleConfirmNewToken(): void {
    if (newTokenDraft === null) {
      return;
    }

    const { imagePath, imageUrl, name, size, position } = newTokenDraft;

    if (imagePath === null || imageUrl === null) {
      setFeedback("Selecciona una imagen para el token.");
      return;
    }

    const id = getNextAvailableSceneId(sceneRef.current, ["token-"], nextTokenId);
    const tokenName = name.trim() || getFileBaseName(imagePath);

    setScene((current) => {
      const footprintCells =
        size === "large" ? 2 : size === "huge" ? 3 : size === "gargantuan" ? 4 : 1;
      const token = createSceneToken({
        id,
        name: tokenName,
        type: tokenName,
        imagePath,
        position: snapTokenToGrid(position, current.grid, footprintCells),
        size,
        tokens: current.tokens
      });

      return { ...current, tokens: [...current.tokens, token] };
    });
    setTokenImageUrls((current) => ({ ...current, [id]: imageUrl }));
    setInteraction((current) => selectElement(current, id));
    setNewTokenDraft(null);
    setFeedback("Token creado");
  }

  function handleCancelNewToken(): void {
    setNewTokenDraft(null);
  }

  function handleRequestSidebarNewToken(): void {
    setNewTokenDraft({
      imagePath: null,
      imageUrl: null,
      name: "",
      size: "medium",
      position: viewportHandleRef.current?.getRandomVisibleWorldPoint() ?? { x: 0, y: 0 }
    });
    setIsSidebarVisible(true);
    setOpenSidebarSections((current) => ({ ...current, tokens: true }));
  }

  async function handleChooseNewTokenImage(): Promise<void> {
    if (newTokenDraft === null) {
      return;
    }

    if (window.ttrpg === undefined) {
      setFeedback("La API de preload no esta disponible.");
      return;
    }

    setIsBusy(true);
    setWarnings([]);

    try {
      const result = await window.ttrpg.openTokenImage();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setNewTokenDraft((current) => current === null ? null : {
        ...current,
        imagePath: result.imagePath,
        imageUrl: result.imageUrl,
        name: current.name.trim() || getFileBaseName(result.imagePath)
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handleToggleContextMenuFogMode(): void {
    if (interaction.activeTool !== "fog-reveal" && !scene.fogOfWar.enabled) {
      return;
    }

    setInteraction((current) =>
      setActiveTool(current, current.activeTool === "fog-reveal" ? "select" : "fog-reveal")
    );
  }

  function handleToggleContextMenuZoomLock(): void {
    setInteraction((current) => setZoomLocked(current, !current.isZoomLocked));
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        locked: !current.grid.locked
      }
    }));
  }

  function handleGridPresetChange(presetId: string): void {
    const preset = gridPresets.find((candidate) => candidate.id === presetId);

    if (preset === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      grid: applyGridPreset(current.grid, preset)
    }));
  }

  const selectedLight =
    interaction.selectedElementId === null
      ? undefined
      : scene.lights.find((light) => light.id === interaction.selectedElementId);
  const selectedEffect =
    interaction.selectedElementId === null
      ? undefined
      : scene.effects.find((effect) => effect.id === interaction.selectedElementId);
  const selectedFireEffect =
    selectedEffect?.kind === "fire" ? selectedEffect : undefined;
  const selectedDynamicLight =
    selectedEffect?.kind === "dynamic-light" ? selectedEffect : undefined;
  const selectedMagicalDarkness =
    selectedEffect?.kind === "magical-darkness" ? selectedEffect : undefined;
  const selectedWaterEffect =
    selectedEffect?.kind === "water" ? selectedEffect : undefined;
  const selectedShape =
    interaction.selectedElementId === null
      ? undefined
      : scene.shapes.find((shape) => shape.id === interaction.selectedElementId);
  const selectedToken =
    interaction.selectedElementId === null
      ? undefined
      : scene.tokens.find((token) => token.id === interaction.selectedElementId);
  const selectedLabel =
    interaction.selectedElementId === null
      ? undefined
      : scene.labels.find((label) => label.id === interaction.selectedElementId);
  const selectedMapAnnotation =
    interaction.selectedElementId === null
      ? undefined
      : scene.mapAnnotations.pins.find((pin) => pin.id === interaction.selectedElementId) ??
        scene.mapAnnotations.areas.find((area) => area.id === interaction.selectedElementId) ??
        scene.mapAnnotations.sceneLinks.find((marker) => marker.id === interaction.selectedElementId);
  const sceneLinkModalMarker = sceneLinkModalId === null
    ? undefined
    : scene.mapAnnotations.sceneLinks.find((marker) => marker.id === sceneLinkModalId);
  const selectedMeasurement =
    selectedShape?.type === "measurement"
      ? measureDistance(selectedShape.points[0], selectedShape.points[1], {
          grid: scene.grid,
          diagonalMode: scene.settings.diagonalMode
        })
      : undefined;
  const selectedPathDistance =
    selectedShape?.type === "path"
      ? measurePathDistance(selectedShape.points, {
          grid: scene.grid,
          diagonalMode: scene.settings.diagonalMode
        })
      : undefined;
  const hasSelectedObject =
    selectedLight !== undefined ||
    selectedEffect !== undefined ||
    selectedShape !== undefined ||
    selectedToken !== undefined ||
    selectedLabel !== undefined ||
    selectedMapAnnotation !== undefined;

  useEffect(() => {
    if (!hasSelectedObject) {
      return;
    }

    setIsSidebarVisible(true);
    setIsSelectedPropertiesOpen(true);
    if (selectedMapAnnotation !== undefined) {
      setOpenSidebarSections((current) => ({ ...current, annotations: true }));
    }
  }, [hasSelectedObject, interaction.selectedElementId, selectedMapAnnotation]);

  function updateSelectedLight(patch: LightPatch): void {
    if (selectedLight === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      lights: current.lights.map((light) =>
        light.id === selectedLight.id ? updateLightSource(light, patch) : light
      )
    }));
  }

  function updateSelectedFireEffect(patch: FirePatch): void {
    if (selectedFireEffect === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === selectedFireEffect.id && effect.kind === "fire"
          ? updateAnimatedFireEffect(effect, patch)
          : effect
      )
    }));
  }

  function updateSelectedDynamicLight(patch: DynamicLightPatch): void {
    if (selectedDynamicLight === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === selectedDynamicLight.id && effect.kind === "dynamic-light"
          ? updateDynamicLightEffect(effect, patch)
          : effect
      )
    }));
  }

  function updateSelectedMagicalDarkness(patch: MagicalDarknessPatch): void {
    if (selectedMagicalDarkness === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === selectedMagicalDarkness.id && effect.kind === "magical-darkness"
          ? updateMagicalDarknessEffect(effect, patch)
          : effect
      )
    }));
  }

  function updateSelectedWaterEffect(patch: WaterPatch): void {
    if (selectedWaterEffect === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === selectedWaterEffect.id && effect.kind === "water"
          ? updateWaterEffect(effect, patch)
          : effect
      )
    }));
  }

  function updateSelectedShape(patch: ShapePatch): void {
    if (selectedShape === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === selectedShape.id ? updateShape(shape, patch) : shape
      )
    }));
  }

  function updateSelectedToken(patch: Partial<SceneToken>): void {
    if (selectedToken === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      tokens: current.tokens.map((token) =>
        token.id === selectedToken.id
          ? {
              ...token,
              ...patch
            }
          : token
      )
    }));
  }

  function updateSelectedLabel(patch: SceneLabelPatch): void {
    if (selectedLabel === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      labels: current.labels.map((label) =>
        label.id === selectedLabel.id ? updateSceneLabel(label, patch) : label
      )
    }));
  }

  function handleToggleTokenVisibility(tokenId: string): void {
    setScene((current) => ({
      ...current,
      tokens: current.tokens.map((token) =>
        token.id === tokenId ? { ...token, visible: !token.visible } : token
      )
    }));
  }

  function handleConeLengthChange(lengthInCells: number): void {
    if (!Number.isFinite(lengthInCells)) {
      return;
    }

    updateSelectedLight({ radius: Math.max(1, lengthInCells) * scene.grid.cellSizeWorld });
  }

  function handleUnitChange(unit: "ft" | "m"): void {
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        unit
      }
    }));
  }

  function handleSnapToGridChange(): void {
    setScene((current) => ({
      ...current,
      settings: {
        ...current.settings,
        snapToGrid: !current.settings.snapToGrid
      }
    }));
  }

  function handleDiagonalModeChange(diagonalMode: SceneDocument["settings"]["diagonalMode"]): void {
    setScene((current) => ({
      ...current,
      settings: {
        ...current.settings,
        diagonalMode
      }
    }));
  }

  function handleCellDistanceValueChange(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    setScene((current) => ({
      ...current,
      grid:
        current.grid.unit === "ft"
          ? {
              ...current.grid,
              distancePerCell: value
            }
          : {
              ...current.grid,
              metricDistancePerCell: value
            }
    }));
  }

  function toggleSidebarSection(sectionId: SidebarSectionId): void {
    setOpenSidebarSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId]
    }));
  }

  const selectedPropertiesTitle =
    selectedMapAnnotation !== undefined
      ? selectedMapAnnotation.kind === "room-pin"
        ? "Pin de habitacion"
        : selectedMapAnnotation.kind === "scene-link"
          ? "Conexion de escena"
          : selectedMapAnnotation.areaType === "terrain" ? "Area de terreno" : "Area de trampa"
      : selectedLight !== undefined
      ? selectedLight.kind === "point"
        ? "Luz puntual"
        : "Luz conica"
      : selectedFireEffect !== undefined
        ? "Fuego"
        : selectedDynamicLight !== undefined
          ? "Luz dinamica"
        : selectedMagicalDarkness !== undefined
          ? "Oscuridad magica"
          : selectedWaterEffect !== undefined
            ? selectedWaterEffect.variant === "river" ? "Rio" : "Cuerpo de agua"
            : selectedToken !== undefined
              ? "Token"
              : selectedLabel !== undefined
                ? "Texto"
                : selectedShape?.type === "measurement"
                  ? "Linea"
                  : selectedShape?.type === "path"
                    ? "Path/Camino"
                    : selectedShape?.type === "circle"
                      ? "Circulo"
                      : selectedShape?.type === "cone"
                        ? "Cono"
                        : selectedShape?.type === "rectangle"
                          ? "Rectangulo"
                          : "Propiedades";
  const selectedPropertiesIcon =
    selectedMapAnnotation !== undefined
      ? selectedMapAnnotation.kind === "room-pin" ? "◆" : selectedMapAnnotation.kind === "scene-link" ? "◎" : selectedMapAnnotation.areaType === "terrain" ? "▧" : "▲"
      : selectedLight !== undefined
      ? selectedLight.kind === "point"
        ? "●"
        : "◖"
      : selectedFireEffect !== undefined
        ? "火"
        : selectedDynamicLight !== undefined
          ? "✦"
        : selectedMagicalDarkness !== undefined
          ? "●"
          : selectedWaterEffect !== undefined
            ? "≈"
            : selectedToken !== undefined
              ? "◉"
              : selectedLabel !== undefined
                ? "T"
                : selectedShape?.type === "measurement"
                  ? "╱"
                  : selectedShape?.type === "path"
                    ? "⌁"
                    : selectedShape?.type === "circle"
                      ? "○"
                      : selectedShape?.type === "cone"
                        ? "◺"
                        : "▭";
  const selectedMagicalDarknessRadiusCells =
    selectedMagicalDarkness === undefined
      ? 1
      : Number((selectedMagicalDarkness.radius / scene.grid.cellSizeWorld).toFixed(2));
  const selectedMagicalDarknessRadiusLabel = formatDistance(
    selectedMagicalDarknessRadiusCells *
      (scene.grid.unit === "ft" ? scene.grid.distancePerCell : scene.grid.metricDistancePerCell),
    scene.grid.unit
  );
  const sortedTokens = useMemo(() => sortTokensByOrder(scene.tokens), [scene.tokens]);
  const renderedTokens = useMemo(
    () =>
      sortedTokens.map((token) => ({
        ...token,
        imageUrl: tokenImageUrls[token.id] ?? null
      })),
    [sortedTokens, tokenImageUrls]
  );

  return (
    <main className="app-shell" aria-label="TTRPG Effects">
      <header className="app-toolbar">
        <div className="brand">
          <img className="toolbar-logo" src={logoUrl} alt="" />
          <div>
            <h1>{appInfo.name}</h1>
            <p>Motor visual listo</p>
          </div>
        </div>
        <div className="scene-actions" aria-label="Acciones de escena">
          <div className="scene-actions__group scene-actions__group--tools">
            <button type="button" onClick={handleOpenMapImage} disabled={isBusy}>
              <MapIcon size={15} aria-hidden="true" />
              Cargar mapa
            </button>
            <button
              type="button"
              className={interaction.isZoomLocked ? "is-active" : ""}
              onClick={handleToggleZoomLock}
              aria-pressed={interaction.isZoomLocked}
            >
              {interaction.isZoomLocked ? <Lock size={15} aria-hidden="true" /> : <Unlock size={15} aria-hidden="true" />}
              {interaction.isZoomLocked ? "Zoom bloqueado" : "Bloquear zoom"}
            </button>
            <button
              type="button"
              className={interaction.activeTool === "arcane-pointer" ? "is-active" : ""}
              onClick={handleToggleArcanePointerMode}
              aria-pressed={interaction.activeTool === "arcane-pointer"}
            >
              <Crosshair size={15} aria-hidden="true" />
              {interaction.activeTool === "arcane-pointer" ? "Apuntador activo" : "Apuntador"}
            </button>
          </div>
          <div className="scene-actions__divider" aria-hidden="true" />
          <div className="scene-actions__group scene-actions__group--player">
            <button type="button" onClick={() => void handleOpenPlayerWindow()} disabled={isBusy}>
              <Monitor size={15} aria-hidden="true" />
              Ventana de jugador
            </button>
            <div
              className={`player-camera-toolbar is-${playerCameraSyncStatus}`}
              aria-label={`Camara de jugador: ${getPlayerCameraStatusLabel(playerCameraSyncStatus)}`}
            >
              <Camera size={15} aria-hidden="true" />
              <span>{getPlayerCameraStatusLabel(playerCameraSyncStatus)}</span>
              <button
                type="button"
                className="player-camera-toolbar__icon"
                aria-label="Alejar camara de jugador"
                title="Alejar camara de jugador"
                disabled={!isPlayerWindowOpen || isBusy}
                onClick={() => handlePlayerCameraZoom("out")}
              >
                <ZoomOut size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="player-camera-toolbar__icon"
                aria-label="Acercar camara de jugador"
                title="Acercar camara de jugador"
                disabled={!isPlayerWindowOpen || isBusy}
                onClick={() => handlePlayerCameraZoom("in")}
              >
                <ZoomIn size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="player-camera-toolbar__icon"
                aria-label="Recentrar vista de jugador"
                title="Recentrar vista de jugador"
                disabled={playerCameraSyncStatus !== "desynchronized" || isBusy}
                onClick={handleRecenterPlayerCamera}
              >
                <LocateFixed size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="scene-actions__spacer" />
          <div className="scene-actions__group scene-actions__group--files">
            {canCreateNewScene ? (
              <button type="button" className="is-quiet" onClick={handleRequestNewScene} disabled={isBusy}>
                <FilePlus size={15} aria-hidden="true" />
                Nueva escena
              </button>
            ) : null}
            <button type="button" onClick={handleSaveScene} disabled={isBusy}>
              <Save size={15} aria-hidden="true" />
              Guardar escena
            </button>
            <button type="button" className="is-quiet" onClick={handleLoadScene} disabled={isBusy}>
              <FolderOpen size={15} aria-hidden="true" />
              Cargar escena
            </button>
            <button
              type="button"
              className={`is-battle${scene.combatTracker.active ? " is-active" : ""}`}
              onClick={() => setIsCombatSetupOpen(true)}
              disabled={isBusy}
            >
              <Swords size={15} aria-hidden="true" />
              {scene.combatTracker.active ? "Batalla activa" : "Iniciar batalla"}
            </button>
          </div>
        </div>
      </header>
      {needsResave && (
        <div className="resave-banner" role="alert">
          <span>
            ⚠️ Esta escena está en un formato anterior. Guárdala para incluir las nuevas funciones.
          </span>
          <button
            type="button"
            className="resave-banner-action"
            onClick={handleSaveScene}
            disabled={isBusy}
          >
            Guardar ahora
          </button>
          <button
            type="button"
            className="resave-banner-dismiss"
            onClick={() => setNeedsResave(false)}
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}
      <aside className="scene-status" aria-label="Estado de escena">
        <span className="scene-status__primary">{feedback}</span>
        <span>{scene.map.imagePath ?? "Sin mapa"}</span>
        <span>{currentFilePath ?? "Sin archivo seleccionado"}</span>
        <span>
          {scene.shapes.length +
            scene.lights.length +
            scene.effects.length +
            scene.tokens.length +
            scene.labels.length +
            scene.mapAnnotations.pins.length +
            scene.mapAnnotations.areas.length +
            scene.mapAnnotations.sceneLinks.length +
            interaction.elements.length} elementos
        </span>
        <span>
          {interaction.selectedElementId === null
            ? "Sin seleccion"
            : `Seleccion: ${interaction.selectedElementId}`}
        </span>
        <span className="scene-status__version">v{scene.version}</span>
        {warnings.map((warning) => (
          <strong key={warning}>{warning}</strong>
        ))}
      </aside>
      <div className={`app-workspace${isSidebarVisible ? "" : " is-sidebar-hidden"}${isAsidePanelVisible ? "" : " is-aside-hidden"}`}>
        <DmAsidePanel
          aside={sceneAside}
          monsterTemplates={monsterTemplates}
          annotations={scene.mapAnnotations}
          selectedElementId={interaction.selectedElementId}
          onChange={setSceneAside}
          onSelectAnnotation={handleSelectMapAnnotation}
          onGoToAnnotation={handleGoToMapAnnotation}
          onEditAnnotation={handleEditMapAnnotation}
          onToggleAnnotationLock={handleToggleMapAnnotationLock}
          onHighlightInformationArea={handleInformationAreaHighlight}
          sceneLinkStatuses={sceneLinkStatuses}
          hidden={!isAsidePanelVisible}
        />
        <button
          className="aside-visibility-toggle"
          type="button"
          aria-pressed={!isAsidePanelVisible}
          aria-label={isAsidePanelVisible ? "Ocultar panel de escena" : "Mostrar panel de escena"}
          onClick={() => setIsAsidePanelVisible((v) => !v)}
        >
          {isAsidePanelVisible ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
        <MapViewport
          ref={viewportHandleRef}
          map={mapState}
          grid={scene.grid}
          settings={scene.settings}
          darkness={scene.darkness}
          fogOfWar={scene.fogOfWar}
          elements={interaction.elements}
          shapes={scene.shapes}
          lights={scene.lights}
          effects={scene.effects}
          tokens={renderedTokens}
          labels={scene.labels}
          mapAnnotations={scene.mapAnnotations}
          sceneLinkStatuses={sceneLinkStatuses}
          showMapAnnotations={showMapAnnotations}
          selectedElementId={interaction.selectedElementId}
          isZoomLocked={interaction.isZoomLocked}
          isMapAdjustMode={interaction.isMapAdjustMode}
          isGridAdjustMode={isGridAdjustMode}
          isGrabMode={isSpaceDragActive}
          viewRole="dm"
          isReadOnly={false}
          isNavigationEnabled={false}
          fogPresentation={deriveFogPresentation("dm", showDmFogOverlay)}
          hiddenTokenPolicy={deriveHiddenTokenPolicy("dm")}
          isFogRevealMode={interaction.activeTool === "fog-reveal"}
          isFirePaintMode={interaction.activeTool === "fire-paint"}
          isPathDrawingMode={interaction.activeTool === "path"}
          isWaterDrawingMode={interaction.activeTool === "water"}
          isArcanePointerMode={interaction.activeTool === "arcane-pointer"}
          isRoomPinMode={interaction.activeTool === "room-pin"}
          isSceneLinkMode={interaction.activeTool === "scene-link"}
          isInformationAreaMode={interaction.activeTool === "information-area"}
          arcanePointerCreatureSize={arcanePointerCreatureSize}
          arcanePointerResetKey={arcanePointerResetKey}
          informationAreaHighlightResetKey={informationAreaHighlightResetKey}
          pathPreviewPoints={pathDraft.points}
          pathPreviewHoverPoint={pathDraft.hoverPoint}
          waterPreviewPoints={waterDraft.points}
          waterPreviewHoverPoint={waterDraft.hoverPoint}
          onContextMenuRequest={handleContextMenuRequest}
          onElementSelect={handleElementSelect}
          onGridCellSizeChange={handleGridCellSizeChange}
          onMapRenderError={handleMapRenderError}
          onMapRendered={handleMapRendered}
          onMapPositionChange={handleMapPositionChange}
          onElementMove={handleElementMove}
          onLightDirectionChange={handleLightDirectionChange}
          onLightRadiusChange={handleLightRadiusChange}
          onShapeEndMove={handleShapeEndMove}
          onPathPointAdd={handlePathPointAdd}
          onPathPointerMove={handlePathPointerMove}
          onWaterPointAdd={handleWaterPointAdd}
          onWaterPointerMove={handleWaterPointerMove}
          onPathPointMove={handlePathPointMove}
          onPathMove={handlePathMove}
          onShapeDirectionChange={handleShapeDirectionChange}
          onShapeRadiusChange={handleShapeRadiusChange}
          onShapeRectResize={handleShapeRectResize}
          onFogRevealStroke={handleFogRevealStroke}
          onFirePaint={handleFirePaint}
          onFireZoneRadiusChange={handleFireZoneRadiusChange}
          onFireLightRadiusChange={handleFireLightRadiusChange}
          onMagicalDarknessRadiusChange={handleMagicalDarknessRadiusChange}
          onWaterLineRotationChange={handleWaterLineRotationChange}
          onWaterPatternRotationChange={handleWaterPatternRotationChange}
          onCameraChange={handleCameraChange}
          onPlayerCameraControlMove={handlePlayerCameraControlMove}
          onArcanePointerTrigger={handleArcanePointerTrigger}
          onRoomPinPlace={handleRoomPinPlace}
          onSceneLinkPlace={handleSceneLinkPlace}
          onInformationAreaPaint={handleInformationAreaPaint}
          onInformationAreaHighlight={handleInformationAreaHighlight}
          onMapAnnotationPreview={handleMapAnnotationPreviewById}
          overlay={<DmDarknessStatusBadge darkness={scene.darkness} />}
        />
        <CombatTurnBar
          tracker={scene.combatTracker}
          viewRole="dm"
          onNextTurn={handleNextCombatTurn}
          onEditCombat={() => setIsCombatSetupOpen(true)}
          onEndCombat={handleEndCombat}
          onToggleDefeated={handleToggleCombatParticipantDefeated}
        />
        <aside className="control-sidebar" aria-label="Controles de escena" hidden={!isSidebarVisible}>
          <div className="control-sidebar-header">Capas</div>
          {hasSelectedObject ? (
            <SidebarAccordion
              id="selected-object-properties-panel"
              icon={selectedPropertiesIcon}
              title={selectedPropertiesTitle}
              isOpen={isSelectedPropertiesOpen}
              onToggle={() => setIsSelectedPropertiesOpen((current) => !current)}
            >
              {selectedMapAnnotation !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de anotacion">
                  <strong>
                    {selectedMapAnnotation.kind === "room-pin"
                      ? selectedMapAnnotation.title
                      : selectedMapAnnotation.kind === "scene-link"
                        ? selectedMapAnnotation.name
                        : selectedMapAnnotation.name || (selectedMapAnnotation.areaType === "terrain" ? "Terreno" : "Trampa")}
                  </strong>
                  <button type="button" onClick={() => handleEditMapAnnotation(selectedMapAnnotation)}>
                    Ver / editar
                  </button>
                  <button type="button" onClick={() => handleToggleMapAnnotationLock(selectedMapAnnotation)}>
                    {selectedMapAnnotation.locked ? "Desbloquear" : "Bloquear"}
                  </button>
                  {selectedMapAnnotation.kind === "information-area" ? (
                    <button type="button" onClick={() => handleInformationAreaHighlight(selectedMapAnnotation.id)}>
                      Resaltar para jugadores
                    </button>
                  ) : null}
                  {selectedMapAnnotation.kind === "scene-link" ? (
                    <>
                      <div className={`scene-link-inline-status is-${sceneLinkStatuses[selectedMapAnnotation.id]?.state ?? "unlinked"}`}>
                        {getSceneLinkStatusText(
                          sceneLinkStatuses[selectedMapAnnotation.id],
                          selectedMapAnnotation.connection !== null
                        )}
                      </div>
                      {selectedMapAnnotation.connection !== null ? (
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => void handleDisconnectSceneLink(selectedMapAnnotation)}
                          disabled={isBusy}
                        >
                          Desligar
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
              {selectedLight !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de luz">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedLight.visible}
                      onChange={(event) => updateSelectedLight({ visible: event.currentTarget.checked })}
                    />
                    Visible
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={selectedLight.color}
                      onChange={(event) => updateSelectedLight({ color: event.currentTarget.value })}
                    />
                  </label>
                  {selectedLight.kind === "cone" ? (
                    <label>
                      Longitud
                      <input
                        type="number"
                        min="1"
                        max="40"
                        step="1"
                        value={Math.max(1, Math.round(selectedLight.radius / scene.grid.cellSizeWorld))}
                        onChange={(event) => handleConeLengthChange(event.currentTarget.valueAsNumber)}
                      />
                      <span>
                        {Math.round((selectedLight.radius / scene.grid.cellSizeWorld) * scene.grid.distancePerCell)} ft
                      </span>
                    </label>
                  ) : (
                    <label>
                      Radio
                      <input
                        type="number"
                        min="1"
                        max="1200"
                        value={selectedLight.radius}
                        onChange={(event) => updateSelectedLight({ radius: event.currentTarget.valueAsNumber })}
                      />
                    </label>
                  )}
                  <label>
                    Intensidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedLight.intensity}
                      onChange={(event) => updateSelectedLight({ intensity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    Opacidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedLight.opacity}
                      onChange={(event) => updateSelectedLight({ opacity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  {selectedLight.kind === "cone" ? (
                    <label>
                      Direccion
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={selectedLight.direction}
                        onChange={(event) => updateSelectedLight({ direction: event.currentTarget.valueAsNumber })}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
              {selectedFireEffect !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de fuego">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedFireEffect.visible}
                      onChange={(event) => updateSelectedFireEffect({ visible: event.currentTarget.checked })}
                    />
                    Visible
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={selectedFireEffect.color}
                      onChange={(event) => updateSelectedFireEffect({ color: event.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Escala
                    <input
                      type="number"
                      min="0.1"
                      max="8"
                      step="0.1"
                      value={selectedFireEffect.scale}
                      onChange={(event) => updateSelectedFireEffect({ scale: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  {selectedFireEffect.zone.kind === "circle" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => updateSelectedFireEffect({ zone: toggleCircleFireMode(selectedFireEffect).zone })}
                      >
                        {selectedFireEffect.zone.mode === "closed" ? "Abrir circulo" : "Cerrar circulo"}
                      </button>
                      <label>
                        Radio
                        <input
                          type="number"
                          min="10"
                          max="3000"
                          value={selectedFireEffect.zone.radius}
                          onChange={(event) =>
                            updateSelectedFireEffect({
                              zone: createCircleFireZone(
                                event.currentTarget.valueAsNumber,
                                selectedFireEffect.zone.kind === "circle" ? selectedFireEffect.zone.mode : "closed"
                              )
                            })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <span>{selectedFireEffect.zone.cells.length} celdas en fuego</span>
                      <label>
                        Pincel
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={selectedFireEffect.zone.radius}
                          onChange={(event) =>
                            updateSelectedFireEffect({
                              zone: createCellFireZone(
                                selectedFireEffect.zone.kind === "cells" ? selectedFireEffect.zone.cells : [],
                                event.currentTarget.valueAsNumber
                              )
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Opacidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedFireEffect.opacity}
                      onChange={(event) => updateSelectedFireEffect({ opacity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedFireEffect.emitsLight}
                      onChange={(event) => updateSelectedFireEffect({ emitsLight: event.currentTarget.checked })}
                    />
                    Emite luz
                  </label>
                  <label>
                    Radio luz
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={selectedFireEffect.lightRadius}
                      onChange={(event) => updateSelectedFireEffect({ lightRadius: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                </div>
              ) : null}
              {selectedDynamicLight !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de luz dinamica">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDynamicLight.visible}
                      onChange={(event) => updateSelectedDynamicLight({ visible: event.currentTarget.checked })}
                    />
                    Visible
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={selectedDynamicLight.color}
                      onChange={(event) => updateSelectedDynamicLight({ color: event.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Luz fuerte (cuadros)
                    <input
                      type="number"
                      min="0.5"
                      max="40"
                      step="0.25"
                      value={selectedDynamicLight.brightRadiusCells}
                      onChange={(event) =>
                        updateSelectedDynamicLight({ brightRadiusCells: event.currentTarget.valueAsNumber })
                      }
                    />
                  </label>
                  <label>
                    Luz tenue (cuadros)
                    <input
                      type="number"
                      min={Math.max(0.5, selectedDynamicLight.brightRadiusCells)}
                      max="80"
                      step="0.25"
                      value={selectedDynamicLight.dimRadiusCells}
                      onChange={(event) =>
                        updateSelectedDynamicLight({ dimRadiusCells: event.currentTarget.valueAsNumber })
                      }
                    />
                  </label>
                  <label>
                    Intensidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedDynamicLight.intensity}
                      onChange={(event) => updateSelectedDynamicLight({ intensity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    Opacidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedDynamicLight.opacity}
                      onChange={(event) => updateSelectedDynamicLight({ opacity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    Variacion
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedDynamicLight.flicker}
                      onChange={(event) => updateSelectedDynamicLight({ flicker: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    Velocidad
                    <input
                      type="range"
                      min="0.1"
                      max="4"
                      step="0.1"
                      value={selectedDynamicLight.speed}
                      onChange={(event) => updateSelectedDynamicLight({ speed: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                </div>
              ) : null}
              {selectedMagicalDarkness !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de oscuridad magica">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedMagicalDarkness.visible}
                      onChange={(event) =>
                        updateSelectedMagicalDarkness({ visible: event.currentTarget.checked })
                      }
                    />
                    Visible
                  </label>
                  <label>
                    Radio
                    <input
                      type="number"
                      min="1"
                      max="60"
                      step="0.5"
                      value={selectedMagicalDarknessRadiusCells}
                      onChange={(event) =>
                        updateSelectedMagicalDarkness({
                          radius: Math.max(1, event.currentTarget.valueAsNumber) * scene.grid.cellSizeWorld
                        })
                      }
                    />
                    <span>{selectedMagicalDarknessRadiusLabel}</span>
                  </label>
                  <label>
                    Opacidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedMagicalDarkness.opacity}
                      onChange={(event) =>
                        updateSelectedMagicalDarkness({ opacity: event.currentTarget.valueAsNumber })
                      }
                    />
                  </label>
                </div>
              ) : null}
              {selectedWaterEffect !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de agua">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedWaterEffect.visible}
                      onChange={(event) => updateSelectedWaterEffect({ visible: event.currentTarget.checked })}
                    />
                    Visible
                  </label>
                  <span>
                    Tipo: {selectedWaterEffect.variant === "river" ? "Rio / riachuelo" : "Cuerpo de agua cerrado"}
                  </span>
                  {selectedWaterEffect.variant === "river" ? (
                    <>
                      <label>
                        Ancho
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={selectedWaterEffect.width}
                          onChange={(event) => updateSelectedWaterEffect({ width: event.currentTarget.valueAsNumber })}
                        />
                      </label>
                    </>
                  ) : null}
                  <span>Orientacion: {Math.round(selectedWaterEffect.lineRotation)}°</span>
                  <span>GIF: {Math.round(selectedWaterEffect.patternRotation)}°</span>
                  <label>
                    Hue
                    <input
                      type="range"
                      min="0"
                      max="359"
                      step="1"
                      value={selectedWaterEffect.hue}
                      onChange={(event) => updateSelectedWaterEffect({ hue: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    Saturacion
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={selectedWaterEffect.saturation}
                      onChange={(event) =>
                        updateSelectedWaterEffect({ saturation: event.currentTarget.valueAsNumber })
                      }
                    />
                  </label>
                  <label>
                    Opacidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedWaterEffect.opacity}
                      onChange={(event) => updateSelectedWaterEffect({ opacity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                </div>
              ) : null}
              {selectedToken !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de token">
                  <label>
                    Color selección
                    <input
                      type="color"
                      value={selectedToken.selectionColor}
                      onChange={(event) => updateSelectedToken({ selectionColor: event.currentTarget.value })}
                    />
                  </label>
                </div>
              ) : null}
              {selectedLabel !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de texto">
                  <label>
                    Texto
                    <input
                      type="text"
                      value={selectedLabel.text}
                      onChange={(event) => updateSelectedLabel({ text: event.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Fuente
                    <select
                      value={selectedLabel.fontFamily}
                      onChange={(event) => updateSelectedLabel({ fontFamily: event.currentTarget.value })}
                    >
                      {systemLabelFonts.map((font) => (
                        <option key={font} value={font}>
                          {getFontLabel(font)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={selectedLabel.color}
                      onChange={(event) => updateSelectedLabel({ color: event.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Opacidad
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedLabel.opacity}
                      onChange={(event) => updateSelectedLabel({ opacity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedLabel.shadow.enabled}
                      onChange={(event) =>
                        updateSelectedLabel({ shadow: { enabled: event.currentTarget.checked } })
                      }
                    />
                    Sombra
                  </label>
                  <label>
                    Color sombra
                    <input
                      type="color"
                      value={selectedLabel.shadow.color}
                      onChange={(event) => updateSelectedLabel({ shadow: { color: event.currentTarget.value } })}
                      disabled={!selectedLabel.shadow.enabled}
                    />
                  </label>
                  <label>
                    Blur sombra
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="1"
                      value={selectedLabel.shadow.blur}
                      onChange={(event) => updateSelectedLabel({ shadow: { blur: event.currentTarget.valueAsNumber } })}
                      disabled={!selectedLabel.shadow.enabled}
                    />
                  </label>
                </div>
              ) : null}
              {selectedShape !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de forma tactica">
                  {selectedPathDistance !== undefined ? <span>Distancia total: {selectedPathDistance.label}</span> : null}
                  {selectedMeasurement !== undefined ? <span>{selectedMeasurement.label}</span> : null}
                  {selectedShape.type !== "path" ? (
                    <label>
                      Emoji
                      <select
                        value={getSelectedShapeEmojis(selectedShape.emoji)[0] ?? ""}
                        onChange={(event) => updateSelectedShape({ emoji: event.currentTarget.value || undefined })}
                      >
                        <option value="">Sin emoji</option>
                        {ALLOWED_SHAPE_EMOJIS.map(([emoji, element]) => (
                          <option key={emoji} value={emoji}>
                            {emoji} {element}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {selectedShape.type === "circle" || selectedShape.type === "cone" ? (
                    <label>
                      Radio
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={selectedShape.radius ?? scene.grid.cellSizeWorld}
                        onChange={(event) => updateSelectedShape({ radius: event.currentTarget.valueAsNumber })}
                      />
                    </label>
                  ) : null}
                  {selectedShape.type === "cone" ? (
                    <>
                      <label>
                        Angulo
                        <input
                          type="number"
                          min="1"
                          max="360"
                          value={selectedShape.angle ?? 60}
                          onChange={(event) => updateSelectedShape({ angle: event.currentTarget.valueAsNumber })}
                        />
                      </label>
                      <label>
                        Direccion
                        <input
                          type="number"
                          min="0"
                          max="360"
                          value={selectedShape.direction ?? 0}
                          onChange={(event) => updateSelectedShape({ direction: event.currentTarget.valueAsNumber })}
                        />
                      </label>
                    </>
                  ) : null}
                  {selectedShape.type === "rectangle" ? (
                    <>
                      <label>
                        Ancho
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={selectedShape.width ?? scene.grid.cellSizeWorld}
                          onChange={(event) => updateSelectedShape({ width: event.currentTarget.valueAsNumber })}
                        />
                      </label>
                      <label>
                        Alto
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={selectedShape.height ?? scene.grid.cellSizeWorld}
                          onChange={(event) => updateSelectedShape({ height: event.currentTarget.valueAsNumber })}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              ) : null}
            </SidebarAccordion>
          ) : null}

          <SidebarAccordion
            id="grid-controls-panel"
            icon={<Grid3X3 size={16} />}
            title="Grilla"
            isOpen={openSidebarSections.grid}
            onToggle={() => toggleSidebarSection("grid")}
          >
            <label>
              <input type="checkbox" checked={scene.grid.enabled} onChange={handleGridVisibilityChange} />
              Activar grilla
            </label>
            <div className="switch-control">
              <div>
                <span>Ajustar grilla</span>
                <small>Shortcut Cmd/Ctrl + G</small>
              </div>
              <Switch.Root
                className="switch-root"
                checked={isGridAdjustMode}
                onCheckedChange={setGridAdjustMode}
                aria-label="Activar modo ajustar grilla"
              >
                <Switch.Thumb className="switch-thumb" />
              </Switch.Root>
            </div>
            <button
              type="button"
              className={interaction.isMapAdjustMode ? "is-active" : ""}
              onClick={handleToggleMapAdjust}
              aria-pressed={interaction.isMapAdjustMode}
              disabled={mapState === null}
            >
              {interaction.isMapAdjustMode ? "Ajustando mapa" : "Ajustar mapa"}
            </button>
            {interaction.isMapAdjustMode && mapState !== null ? (
              <div className="map-adjust-fields" aria-label="Posicion del mapa">
                <label>
                  X
                  <input
                    type="number"
                    step="1"
                    value={scene.map.position.x}
                    onChange={(event) => {
                      const v = event.currentTarget.valueAsNumber;
                      if (Number.isFinite(v)) handleMapPositionChange(v, scene.map.position.y);
                    }}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    step="1"
                    value={scene.map.position.y}
                    onChange={(event) => {
                      const v = event.currentTarget.valueAsNumber;
                      if (Number.isFinite(v)) handleMapPositionChange(scene.map.position.x, v);
                    }}
                  />
                </label>
              </div>
            ) : null}
            {mapState !== null ? (
              <div className="map-adjust-fields" aria-label="Escala visual del mapa">
                <label>
                  Escala mapa
                  <input
                    type="range"
                    min={MAP_SCALE_MIN * 100}
                    max={MAP_SCALE_MAX * 100}
                    step="5"
                    value={Math.round(scene.map.scale * 100)}
                    onChange={(event) => handleMapScaleChange(event.currentTarget.valueAsNumber / 100)}
                  />
                </label>
                <label>
                  %
                  <input
                    type="number"
                    min={MAP_SCALE_MIN * 100}
                    max={MAP_SCALE_MAX * 100}
                    step="5"
                    value={Math.round(scene.map.scale * 100)}
                    onChange={(event) => handleMapScaleChange(event.currentTarget.valueAsNumber / 100)}
                  />
                </label>
                <button type="button" onClick={() => handleMapScaleChange(MAP_SCALE_DEFAULT)}>
                  Reset 100%
                </button>
              </div>
            ) : null}
            <label>
              Opacidad
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={scene.grid.opacity}
                onChange={(event) => handleGridOpacityChange(event.currentTarget.valueAsNumber)}
              />
            </label>
            {isGridAdjustMode ? (
              <label>
                Celda
                <input
                  type="number"
                  min="8"
                  max="1000"
                  value={scene.grid.cellSizeWorld}
                  onChange={(event) => handleGridCellSizeChange(event.currentTarget.valueAsNumber)}
                />
              </label>
            ) : null}
            <label>
              Unidad
              <select
                aria-label="Unidad de medicion"
                value={scene.grid.unit}
                onChange={(event) => handleUnitChange(event.currentTarget.value as "ft" | "m")}
              >
                <option value="ft">ft</option>
                <option value="m">m</option>
              </select>
            </label>
            <label>
              Preset
              <select
                aria-label="Preset de escala"
                defaultValue=""
                onChange={(event) => handleGridPresetChange(event.currentTarget.value)}
              >
                <option value="" disabled>
                  Preset
                </option>
                {gridPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </SidebarAccordion>

          <div className="control-sidebar-group-label">Herramientas</div>

          <SidebarAccordion
            id="figure-controls-panel"
            icon={<Shapes size={16} />}
            title="Figuras"
            isOpen={openSidebarSections.figures}
            onToggle={() => toggleSidebarSection("figures")}
          >
            <label>
              <input
                type="checkbox"
                checked={scene.settings.snapToGrid}
                onChange={handleSnapToGridChange}
              />
              Snap
            </label>
            <label>
              Diagonal
              <select
                aria-label="Modo de diagonal"
                value={scene.settings.diagonalMode}
                onChange={(event) =>
                  handleDiagonalModeChange(event.currentTarget.value as SceneDocument["settings"]["diagonalMode"])
                }
              >
                <option value="dnd5e-default">D&D 5e</option>
                <option value="dnd5e-alternating">D&D 5e Alt.</option>
                <option value="manhattan">Manhattan</option>
                <option value="euclidean">Euclidean</option>
              </select>
            </label>
            <label>
              Valor por casilla
              <input
                type="number"
                min="0.1"
                step={scene.grid.unit === "ft" ? "1" : "0.1"}
                value={scene.grid.unit === "ft" ? scene.grid.distancePerCell : scene.grid.metricDistancePerCell}
                onChange={(event) => handleCellDistanceValueChange(event.currentTarget.valueAsNumber)}
              />
            </label>
          </SidebarAccordion>

          <SidebarAccordion
            id="effects-controls-panel"
            icon={<Sparkles size={16} />}
            title="Efectos"
            isOpen={openSidebarSections.effects}
            onToggle={() => toggleSidebarSection("effects")}
          >
            <button
              type="button"
              className={interaction.activeTool === "arcane-pointer" ? "is-active" : ""}
              onClick={handleToggleArcanePointerMode}
              aria-pressed={interaction.activeTool === "arcane-pointer"}
            >
              {interaction.activeTool === "arcane-pointer" ? "Apuntador activo" : "Modo apuntador"}
            </button>
            {interaction.activeTool === "arcane-pointer" ? (
              <label>
                Tamano
                <select
                  aria-label="Tamano del apuntador"
                  value={arcanePointerCreatureSize}
                  onChange={(event) =>
                    setArcanePointerCreatureSize(event.currentTarget.value as ArcanePointerCreatureSize)
                  }
                >
                  {arcanePointerSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.footprintCells}x{option.footprintCells})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="button" onClick={handleToggleFirePaintMode}>
              {interaction.activeTool === "fire-paint" ? "Cancelar pintado de fuego" : "Pintar fuego"}
            </button>
            <button type="button" onClick={handleStartWaterDrawing}>
              {interaction.activeTool === "water" ? "Dibujando agua" : "Dibujar agua"}
            </button>
          </SidebarAccordion>

          <SidebarAccordion
            id="token-controls-panel"
            icon={<CircleDot size={16} />}
            title="Tokens"
            isOpen={openSidebarSections.tokens}
            onToggle={() => toggleSidebarSection("tokens")}
          >
            {renderedTokens.length > 0 ? (
              <div className="token-list" aria-label="Tokens en escena">
                {renderedTokens.map((token) => {
                  const hasRepeatedName =
                    scene.tokens.filter((candidate) => sameTokenName(candidate.name, token.name)).length > 1;

                  return (
                    <div
                      key={token.id}
                      className={`token-list-row${interaction.selectedElementId === token.id ? " is-selected" : ""}${token.visible ? "" : " is-hidden-token"}`}
                    >
                      <button
                        type="button"
                        className="token-list-item"
                        onClick={() => setInteraction((current) => selectElement(current, token.id))}
                      >
                        <span className="token-list-image" style={{ borderColor: token.selectionColor }}>
                          {token.imageUrl !== null ? <img src={token.imageUrl} alt="" /> : token.name.slice(0, 1)}
                          {hasRepeatedName ? (
                            <span className="token-list-badge" style={{ color: token.selectionColor }}>
                              {token.badgeNumber}
                            </span>
                          ) : null}
                        </span>
                        <span className="token-list-copy">
                          <strong>{token.name}</strong>
                          <small>
                            {tokenSizeLabels[token.size]} · {getTokenSizeCellLabel(token.size)} · {getTokenNameCardinality(scene.tokens, token.name)}
                          </small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="token-visibility-button"
                        onClick={() => handleToggleTokenVisibility(token.id)}
                        aria-pressed={!token.visible}
                        aria-label={token.visible ? `Ocultar ${token.name}` : `Mostrar ${token.name}`}
                      >
                        {token.visible ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="sidebar-hint">No hay tokens en escena.</p>
            )}
            <button type="button" className="new-token-button" onClick={() => void handleRequestSidebarNewToken()}>
              Nuevo token
            </button>
          </SidebarAccordion>

          <SidebarAccordion
            id="annotations-controls-panel"
            icon={<MapPin size={16} />}
            title="Anotaciones"
            isOpen={openSidebarSections.annotations}
            onToggle={() => toggleSidebarSection("annotations")}
          >
            <MapAnnotationsSection
              visible={showMapAnnotations}
              activeTool={interaction.activeTool}
              onVisibleChange={setShowMapAnnotations}
              onStartPin={handleStartRoomPin}
              onStartArea={handleStartInformationArea}
              onStartSceneLink={handleStartSceneLink}
            />
          </SidebarAccordion>

          <div className="control-sidebar-group-label">Visibilidad</div>

          <SidebarAccordion
            id="darkness-controls-panel"
            icon={<Moon size={16} />}
            title="Oscuridad"
            isOpen={openSidebarSections.darkness}
            onToggle={() => toggleSidebarSection("darkness")}
          >
            <label>
              <input
                type="checkbox"
                checked={scene.darkness.enabled}
                onChange={handleDarknessEnabledChange}
              />
              Activar oscuridad
            </label>
            <label>
              Overlay
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={scene.darkness.opacity}
                onChange={(event) => handleDarknessOpacityChange(event.currentTarget.valueAsNumber)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={scene.darkness.darkvisionEnabled}
                onChange={handleDarkvisionEnabledChange}
              />
              Visión en la oscuridad
            </label>
          </SidebarAccordion>

          <SidebarAccordion
            id="fog-controls-panel"
            icon={<CloudFog size={16} />}
            title="Niebla"
            isOpen={openSidebarSections.fog}
            onToggle={() => toggleSidebarSection("fog")}
          >
            <label>
              <input
                type="checkbox"
                checked={scene.fogOfWar.enabled}
                onChange={handleFogEnabledChange}
              />
              Activar niebla
            </label>
            <label>
              <input
                type="checkbox"
                checked={showDmFogOverlay}
                onChange={(event) => setShowDmFogOverlay(event.currentTarget.checked)}
              />
              Ver niebla en DM
            </label>
            <button
              type="button"
              className={interaction.activeTool === "fog-reveal" ? "is-active" : ""}
              onClick={handleToggleFogRevealMode}
              disabled={!scene.fogOfWar.enabled}
              aria-pressed={interaction.activeTool === "fog-reveal"}
            >
              {interaction.activeTool === "fog-reveal" ? "Modo niebla activo" : "Modo niebla"}
            </button>
            <label>
              Fog
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={scene.fogOfWar.opacity}
                onChange={(event) => handleFogOpacityChange(event.currentTarget.valueAsNumber)}
              />
            </label>
            <label>
              Color
              <input
                type="color"
                value={scene.fogOfWar.color}
                onChange={(event) => handleFogColorChange(event.currentTarget.value)}
              />
            </label>
            <label>
              Reveal
              <input
                type="number"
                min="8"
                max="3000"
                value={scene.fogOfWar.revealRadius}
                onChange={(event) => handleFogRevealRadiusChange(event.currentTarget.valueAsNumber)}
              />
            </label>
            <button
              type="button"
              onClick={handleClearFogReveals}
              disabled={scene.fogOfWar.revealedAreas.length === 0}
            >
              Reset niebla
            </button>
          </SidebarAccordion>
        </aside>
        <button
          className="sidebar-visibility-toggle"
          type="button"
          aria-pressed={!isSidebarVisible}
          aria-label={isSidebarVisible ? "Ocultar menú lateral" : "Mostrar menú lateral"}
          onClick={() => setIsSidebarVisible((current) => !current)}
        >
          {isSidebarVisible ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        </button>
      </div>
      {isNewSceneDialogOpen ? (
        <div className="modal-backdrop" onClick={handleCancelNewScene}>
          <section
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-scene-dialog-title"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div>
              <h2 id="new-scene-dialog-title">Crear nueva escena</h2>
              <p>
                La escena actual tiene contenido. Puedes guardarla antes de limpiar el mapa, luces,
                efectos, niebla y selecciones.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={handleCancelNewScene} disabled={isBusy} autoFocus>
                Cancelar
              </button>
              <button type="button" className="is-danger" onClick={handleDiscardAndCreateNewScene} disabled={isBusy}>
                Descartar cambios
              </button>
              <button type="button" className="is-primary" onClick={handleSaveAndCreateNewScene} disabled={isBusy}>
                Guardar y crear nueva
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {newTokenDraft !== null ? (
        <div className="modal-backdrop" onClick={handleCancelNewToken}>
          <section
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-token-dialog-title"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div>
              <h2 id="new-token-dialog-title">Nuevo token</h2>
              <p>
                {newTokenDraft.imagePath === null
                  ? "Selecciona una imagen y ajusta los datos iniciales."
                  : newTokenDraft.imagePath.split(/[\\/]/).pop()}
              </p>
            </div>
            <div className="token-modal-preview">
              {newTokenDraft.imageUrl !== null ? <img src={newTokenDraft.imageUrl} alt="" /> : <span>Sin imagen</span>}
              <button type="button" onClick={() => void handleChooseNewTokenImage()} disabled={isBusy}>
                {newTokenDraft.imageUrl === null ? "Seleccionar imagen" : "Cambiar imagen"}
              </button>
            </div>
            <div className="modal-form">
              <label>
                Nombre
                <input
                  type="text"
                  autoFocus
                  value={newTokenDraft.name}
                  onChange={(event) =>
                    setNewTokenDraft((current) =>
                      current !== null ? { ...current, name: event.target.value } : null
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleConfirmNewToken();
                    if (event.key === "Escape") handleCancelNewToken();
                  }}
                />
              </label>
              <label>
                Tamaño
                <select
                  value={newTokenDraft.size}
                  onChange={(event) =>
                    setNewTokenDraft((current) =>
                      current !== null
                        ? { ...current, size: event.target.value as TokenSize }
                        : null
                    )
                  }
                >
                  {(["tiny", "small", "medium", "large", "huge", "gargantuan"] as TokenSize[]).map(
                    (size) => (
                      <option key={size} value={size}>
                        {tokenSizeLabels[size]} ({getTokenSizeCellLabel(size)})
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={handleCancelNewToken}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={handleConfirmNewToken}
                disabled={newTokenDraft.imagePath === null || isBusy}
              >
                Crear token
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {mapAnnotationModal !== null ? (
        <MapAnnotationModal
          key={`${mapAnnotationModal.kind}:${mapAnnotationModal.id}`}
          draft={mapAnnotationModal}
          onCancel={() => setMapAnnotationModal(null)}
          onSavePin={handleSaveMapInformationPin}
          onSaveArea={handleSaveMapInformationArea}
        />
      ) : null}
      {sceneLinkModalMarker !== undefined ? (
        <SceneLinkModal
          marker={sceneLinkModalMarker}
          status={sceneLinkStatuses[sceneLinkModalMarker.id] ?? (
            sceneLinkModalMarker.connection === null ? { state: "unlinked" } : { state: "validating" }
          )}
          currentScenePath={currentFilePath}
          onRename={(name) => handleRenameSceneLink(sceneLinkModalMarker.id, name)}
          onConnect={(targetScenePath, targetMarkerId) =>
            handleConnectSceneLink(sceneLinkModalMarker, targetScenePath, targetMarkerId)
          }
          onDisconnect={() => handleDisconnectSceneLink(sceneLinkModalMarker)}
          onNavigate={() => handleNavigateSceneLink(sceneLinkModalMarker)}
          onClose={() => setSceneLinkModalId(null)}
        />
      ) : null}
      {interaction.contextMenu !== null ? (
        <div
          className="context-menu-backdrop"
          onClick={handleCloseContextMenu}
          onContextMenu={(event) => {
            event.preventDefault();
            handleCloseContextMenu();
          }}
        >
          <menu
            ref={contextMenuRef}
            className={[
              "context-menu",
              contextMenuPosition?.opensUpward === true ? "is-opening-upward" : "",
              contextMenuPosition?.opensLeftward === true ? "is-opening-leftward" : ""
            ].filter(Boolean).join(" ")}
            style={{
              left: contextMenuPosition?.left ?? interaction.contextMenu.screen.x,
              top: contextMenuPosition?.top ?? interaction.contextMenu.screen.y
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={handleToggleContextMenuFogMode}
              disabled={interaction.activeTool !== "fog-reveal" && !scene.fogOfWar.enabled}
            >
              {interaction.activeTool === "fog-reveal" ? "Salir de Modo niebla" : "Cambiar a Modo niebla"}
            </button>
            <button type="button" onClick={handleToggleContextMenuZoomLock}>
              {interaction.isZoomLocked ? "Desbloquear zoom" : "Bloquear zoom"}
            </button>
            <hr aria-hidden="true" />
            <button type="button" onClick={handleCreateLabel}>
              Crear label DM
            </button>
            <li className="has-submenu">
              <button type="button">Anotaciones ▶</button>
              <menu className="context-submenu">
                <button type="button" onClick={handleStartRoomPin}>Pin de habitacion</button>
                <button type="button" onClick={handleStartInformationArea}>Area de informacion</button>
                <button type="button" onClick={handleStartSceneLink}>Link a otro mapa</button>
              </menu>
            </li>
            <li className="has-submenu">
              <button type="button">Herramientas de área ▶</button>
              <menu className="context-submenu">
                <button type="button" onClick={() => handleCreateElement("measurement")}>Línea</button>
                <button type="button" onClick={handleStartPathDrawing}>Path/Camino</button>
                <button type="button" onClick={() => handleCreateElement("circle")}>Círculo</button>
                <button type="button" onClick={() => handleCreateElement("cone")}>Cono</button>
                <button type="button" onClick={() => handleCreateElement("rectangle")}>Rectángulo</button>
              </menu>
            </li>
            <li className="has-submenu">
              <button type="button">Tokens ▶</button>
              <menu className="context-submenu">
                <button type="button" onClick={handleCreateToken}>Crear token</button>
              </menu>
            </li>
            <li className="has-submenu">
              <button type="button">Efectos ▶</button>
              <menu className="context-submenu">
                <button type="button" onClick={() => handleCreateElement("fire")}>Fuego</button>
                <button type="button" onClick={handleToggleFirePaintMode}>
                  {interaction.activeTool === "fire-paint" ? "Cancelar pintado de fuego" : "Pintar fuego"}
                </button>
                <button type="button" onClick={() => handleCreateElement("pointLight")}>Luz puntual</button>
                <button type="button" onClick={() => handleCreateElement("coneLight")}>Luz cónica</button>
                <button type="button" onClick={handleCreateDynamicLight}>Luz dinamica</button>
                <button type="button" onClick={handleCreateMagicalDarkness}>Oscuridad magica</button>
                <button type="button" onClick={handleStartWaterDrawing}>Agua</button>
              </menu>
            </li>
          </menu>
        </div>
      ) : null}
      {isMonsterTemplateManagerOpen ? (
        <MonsterTemplateManagerModal
          templates={monsterTemplates}
          onSave={handleSaveMonsterTemplate}
          onDelete={handleDeleteMonsterTemplate}
          onClose={() => setIsMonsterTemplateManagerOpen(false)}
        />
      ) : null}
      {isCombatSetupOpen ? (
        <CombatSetupModal
          aside={sceneAside}
          tracker={scene.combatTracker}
          onStart={handleSetCombatTracker}
          onUpdate={handleSetCombatTracker}
          onClose={() => setIsCombatSetupOpen(false)}
        />
      ) : null}
    </main>
  );
}

function mergeFireCells(existing: readonly FireCell[], incoming: readonly FireCell[]): readonly FireCell[] {
  const cells = new Map<string, FireCell>();

  for (const cell of [...existing, ...incoming]) {
    cells.set(`${cell.x}:${cell.y}:${cell.size}`, cell);
  }

  return [...cells.values()];
}

function getFileBaseName(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const fileName = normalized.split("/").pop() ?? "Token";
  return fileName.replace(/\.[^.]+$/, "") || "Token";
}

function getFontLabel(fontFamily: string): string {
  return fontFamily.split(",")[0]?.replaceAll("\"", "").trim() || fontFamily;
}

function getTokenSizeCellLabel(size: TokenSize): string {
  switch (size) {
    case "tiny":
    case "small":
    case "medium":
      return "1x1";
    case "large":
      return "2x2";
    case "huge":
      return "3x3";
    case "gargantuan":
      return "4x4";
  }
}

function getNextNumericId(ids: readonly string[], prefix: string): number {
  const values = ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number.parseInt(id.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return 1;
  }

  return Math.max(...values) + 1;
}

function getNextNumericIdForPrefixes(ids: readonly string[], prefixes: readonly string[]): number {
  const values = ids.flatMap((id) => {
    const prefix = prefixes.find((candidate) => id.startsWith(candidate));

    if (prefix === undefined) {
      return [];
    }

    const value = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(value) ? [value] : [];
  });

  if (values.length === 0) {
    return 1;
  }

  return Math.max(...values) + 1;
}

function getNextAvailableSceneId(
  scene: SceneDocument,
  prefixes: readonly string[],
  nextId: { current: number }
): string {
  const usedIds = new Set(getSceneObjectIds(scene));

  for (const prefix of prefixes) {
    nextId.current = Math.max(nextId.current, getNextNumericId([...usedIds], prefix));
  }

  while (true) {
    for (const prefix of prefixes) {
      const candidate = `${prefix}${nextId.current}`;

      if (!usedIds.has(candidate)) {
        nextId.current += 1;
        return candidate;
      }
    }

    nextId.current += 1;
  }
}

function getSceneObjectIds(scene: SceneDocument): readonly string[] {
  return [
    ...scene.shapes.map((shape) => shape.id),
    ...scene.lights.map((light) => light.id),
    ...scene.effects.map((effect) => effect.id),
    ...scene.tokens.map((token) => token.id),
    ...scene.labels.map((label) => label.id),
    ...scene.mapAnnotations.pins.map((pin) => pin.id),
    ...scene.mapAnnotations.areas.map((area) => area.id),
    ...scene.mapAnnotations.sceneLinks.map((marker) => marker.id),
    ...scene.fogOfWar.revealedAreas.map((area) => area.id),
    ...scene.fogOfWar.obstacles.map((obstacle) => obstacle.id)
  ];
}

function createSceneSavePayload(scene: SceneDocument, sceneAside: SceneAside): SceneDocument {
  return {
    ...scene,
    sceneAside,
    effects: scene.effects.map((effect) =>
      effect.kind === "dynamic-light"
        ? createDynamicLightSavePayload(effect, scene.grid.cellSizeWorld)
        : effect
    )
  };
}

function sameTokenName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function getTokenNameCardinality(tokens: readonly SceneToken[], tokenName: string): string {
  const count = tokens.filter((token) => sameTokenName(token.name, tokenName)).length;
  return `${count} ${count === 1 ? "igual" : "iguales"}`;
}

function getSceneLinkStatusText(
  status: SceneLinkValidationStatus | undefined,
  connected: boolean
): string {
  if (status?.state === "broken") return status.message;
  if (status?.state === "valid") return "Conexion valida";
  return connected ? "Validando" : "Sin enlazar";
}

function getPlayerCameraStatusLabel(status: PlayerCameraSyncStatus): string {
  switch (status) {
    case "pending":
      return "Sincronizando";
    case "synchronized":
      return "Sincronizada";
    case "desynchronized":
      return "Vista libre";
    case "closed":
      return "Cerrada";
  }
}

interface SidebarAccordionProps {
  readonly id: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}

function SidebarAccordion({
  id,
  icon,
  title,
  isOpen,
  onToggle,
  children
}: SidebarAccordionProps): JSX.Element {
  return (
    <section
      className={`sidebar-accordion${isOpen ? " is-open" : ""}`}
      data-panel={id}
      aria-labelledby={`${id}-header`}
    >
      <button
        id={`${id}-header`}
        className="sidebar-accordion-header"
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className="sidebar-accordion-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="sidebar-accordion-title">{title}</span>
        <span className="sidebar-accordion-chevron" aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div id={id} className="sidebar-accordion-content">
          {children}
        </div>
      ) : null}
    </section>
  );
}
