import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type SetStateAction
} from "react";
import { parseSceneJson } from "../../domain/sessions/scene-schema";
import * as Switch from "@radix-ui/react-switch";
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
  createLightSource,
  moveLightSource,
  updateLightSource,
  type LightKind,
  type LightPatch
} from "../../domain/lighting/lights";
import { createMapImageState, type MapImageState } from "../../domain/map/map-image";
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

const logoUrl = "/logo/ttrpg-effects-logo.png";
const fallbackAppInfo = {
  name: "TTRPG Effects",
  version: "0.0.0"
} as const;

type SidebarSectionId = "grid" | "figures" | "effects" | "tokens" | "darkness" | "fog";

type SidebarOpenState = Record<SidebarSectionId, boolean>;

interface PathDraftState {
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
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [tokenImageUrls, setTokenImageUrls] = useState<Readonly<Record<string, string>>>({});
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Escena default en memoria");
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [interaction, setInteraction] = useState(() => createInitialInteractionState());
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSelectedPropertiesOpen, setIsSelectedPropertiesOpen] = useState(true);
  const [isSpaceDragActive, setIsSpaceDragActive] = useState(false);
  const [isGridAdjustMode, setIsGridAdjustMode] = useState(false);
  const [isNewSceneDialogOpen, setIsNewSceneDialogOpen] = useState(false);
  const [newTokenDraft, setNewTokenDraft] = useState<NewTokenDraftState | null>(null);
  const [pathDraft, setPathDraft] = useState<PathDraftState>({
    points: [],
    hoverPoint: null
  });
  const [openSidebarSections, setOpenSidebarSections] = useState<SidebarOpenState>({
    grid: true,
    figures: false,
    effects: false,
    tokens: false,
    darkness: false,
    fog: false
  });
  const nextShapeId = useRef(1);
  const nextLightId = useRef(1);
  const nextEffectId = useRef(1);
  const nextTokenId = useRef(1);
  const nextRevealId = useRef(1);
  const viewportHandleRef = useRef<MapViewportHandle | null>(null);
  const isSpaceDragActiveRef = useRef(isSpaceDragActive);
  isSpaceDragActiveRef.current = isSpaceDragActive;
  const pathDraftRef = useRef(pathDraft);
  pathDraftRef.current = pathDraft;
  const selectedElementIdRef = useRef(interaction.selectedElementId);
  selectedElementIdRef.current = interaction.selectedElementId;
  sceneRef.current = scene;

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
    }, 500);
    return () => clearTimeout(handle);
  }, [scene]);

  const handleContextMenuRequest = useCallback((request: PixiContextMenuRequest) => {
    setInteraction((current) => openContextMenu(current, request));
  }, []);

  const handleElementSelect = useCallback((elementId: string | null) => {
    setInteraction((current) => selectElement(current, elementId));
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

  const handleCreateShape = (kind: TacticalShapeKind): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = `${kind}-${nextShapeId.current}`;
    nextShapeId.current += 1;
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

    const id = `${kind}-light-${nextLightId.current}`;
    nextLightId.current += 1;
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

    const id = `fire-${nextEffectId.current}`;
    nextEffectId.current += 1;
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

    const id = `magical-darkness-${nextEffectId.current}`;
    nextEffectId.current += 1;
    const effect = createMagicalDarknessEffect(id, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      effects: [...current.effects, effect]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleDeleteSelectedElement = useCallback(() => {
    setScene((current) => {
      if (interaction.selectedElementId === null) {
        return current;
      }

      return {
        ...current,
        lights: current.lights.filter((light) => light.id !== interaction.selectedElementId),
        effects: current.effects.filter((effect) => effect.id !== interaction.selectedElementId),
        shapes: current.shapes.filter((shape) => shape.id !== interaction.selectedElementId),
        tokens: current.tokens.filter((token) => token.id !== interaction.selectedElementId)
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

  const resetToNewScene = useCallback((): void => {
    sessionStorage.removeItem("ttrpg:session-scene");
    setScene(createDefaultScene());
    setMapImageUrl(null);
    setTokenImageUrls({});
    setCurrentFilePath(null);
    setFeedback("Escena default en memoria");
    setWarnings([]);
    setInteraction(createInitialInteractionState());
    setPathDraft({ points: [], hoverPoint: null });
    setIsSpaceDragActive(false);
    setGridAdjustMode(false);
    setIsSelectedPropertiesOpen(true);
    nextShapeId.current = 1;
    nextLightId.current = 1;
    nextEffectId.current = 1;
    nextTokenId.current = 1;
    nextRevealId.current = 1;
  }, [setGridAdjustMode]);

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

  const confirmPathDrawing = useCallback((): void => {
    const draft = pathDraftRef.current;

    if (draft.points.length < 2) {
      return;
    }

    const id = `path-${nextShapeId.current}`;
    nextShapeId.current += 1;
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
      setInteraction((current) => setMapAdjustMode(setActiveTool(current, "select"), false));
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
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

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelectedElement();
      }

      if (event.key === "Escape") {
        event.preventDefault();
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
    confirmPathDrawing,
    handleCancelNewScene,
    handleDeleteSelectedElement,
    interaction.activeTool,
    isGridAdjustMode,
    isNewSceneDialogOpen,
    removeLastPathPoint,
    setGridAdjustMode
  ]);

  async function saveCurrentScene(): Promise<SceneOperationResult> {
    if (window.ttrpg === undefined) {
      return { ok: false, error: "La API de preload no esta disponible." };
    }

    return window.ttrpg.saveScene(sceneRef.current, {
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

  async function runSceneOperation(
    actionLabel: "guardada" | "cargada",
    operation: () => Promise<SceneOperationResult>
  ): Promise<void> {
    setIsBusy(true);
    setWarnings([]);

    try {
      const result = await operation();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setScene(result.scene);
      if (actionLabel === "cargada") {
        setMapImageUrl(result.mapImageUrl ?? null);
        setTokenImageUrls(result.tokenImageUrls ?? {});
        setInteraction((current) => setZoomLocked(current, result.scene.grid.locked));
        nextTokenId.current = getNextNumericId(result.scene.tokens.map((token) => token.id), "token-");
      }
      setCurrentFilePath(result.filePath);
      setFeedback(`Escena ${actionLabel}`);
      setWarnings(result.warnings.map((warning) => warning.message));
    } finally {
      setIsBusy(false);
    }
  }

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

  const handleElementMove = useCallback((elementId: string, x: number, y: number): void => {
    setScene((current) => ({
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
            : updateMagicalDarknessEffect(effect, { position: { x, y } })
          : effect
      ),
      tokens: current.tokens.map((token) =>
        token.id === elementId
          ? {
              ...token,
              position: snapTokenToGrid({ x, y }, current.grid, token.footprintCells)
            }
          : token
      )
    }));
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
    setPathDraft((current) => ({
      ...current,
      hoverPoint: point
    }));
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
        id: `reveal-${nextRevealId.current}`,
        points,
        radius: current.fogOfWar.revealRadius
      });
      nextRevealId.current += 1;

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

      const id = `fire-${nextEffectId.current}`;
      nextEffectId.current += 1;
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

    const id = `token-${nextTokenId.current}`;
    nextTokenId.current += 1;
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
  const selectedMagicalDarkness =
    selectedEffect?.kind === "magical-darkness" ? selectedEffect : undefined;
  const selectedShape =
    interaction.selectedElementId === null
      ? undefined
      : scene.shapes.find((shape) => shape.id === interaction.selectedElementId);
  const selectedToken =
    interaction.selectedElementId === null
      ? undefined
      : scene.tokens.find((token) => token.id === interaction.selectedElementId);
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
    selectedToken !== undefined;

  useEffect(() => {
    if (!hasSelectedObject) {
      return;
    }

    setIsSidebarVisible(true);
    setIsSelectedPropertiesOpen(true);
  }, [hasSelectedObject, interaction.selectedElementId]);

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
    selectedLight !== undefined
      ? selectedLight.kind === "point"
        ? "Luz puntual"
        : "Luz conica"
      : selectedFireEffect !== undefined
        ? "Fuego"
        : selectedMagicalDarkness !== undefined
          ? "Oscuridad magica"
          : selectedToken !== undefined
            ? "Token"
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
    selectedLight !== undefined
      ? selectedLight.kind === "point"
        ? "●"
        : "◖"
      : selectedFireEffect !== undefined
        ? "火"
        : selectedMagicalDarkness !== undefined
          ? "●"
          : selectedToken !== undefined
            ? "◉"
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
          <button type="button" onClick={handleOpenMapImage} disabled={isBusy}>
            Cargar mapa
          </button>
          <button
            type="button"
            className={interaction.isZoomLocked ? "is-active" : ""}
            onClick={handleToggleZoomLock}
            aria-pressed={interaction.isZoomLocked}
          >
            {interaction.isZoomLocked ? "Zoom bloqueado" : "Bloquear zoom"}
          </button>
          {canCreateNewScene ? (
            <button type="button" onClick={handleRequestNewScene} disabled={isBusy}>
              Nueva escena
            </button>
          ) : null}
          <button type="button" onClick={handleSaveScene} disabled={isBusy}>
            Guardar escena
          </button>
          <button type="button" onClick={handleLoadScene} disabled={isBusy}>
            Cargar escena
          </button>
        </div>
      </header>
      <aside className="scene-status" aria-label="Estado de escena">
        <span>{feedback}</span>
        <span>{scene.map.imagePath ?? "Sin mapa"}</span>
        <span>{currentFilePath ?? "Sin archivo seleccionado"}</span>
        <span>
          {scene.shapes.length +
            scene.lights.length +
            scene.effects.length +
            scene.tokens.length +
            interaction.elements.length} elementos
        </span>
        <span>
          {interaction.selectedElementId === null
            ? "Sin seleccion"
            : `Seleccion: ${interaction.selectedElementId}`}
        </span>
        <span>v{scene.version}</span>
        {warnings.map((warning) => (
          <strong key={warning}>{warning}</strong>
        ))}
      </aside>
      <div className={`app-workspace${isSidebarVisible ? "" : " is-sidebar-hidden"}`}>
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
          selectedElementId={interaction.selectedElementId}
          isZoomLocked={interaction.isZoomLocked}
          isMapAdjustMode={interaction.isMapAdjustMode}
          isGridAdjustMode={isGridAdjustMode}
          isGrabMode={isSpaceDragActive}
          isFogRevealMode={interaction.activeTool === "fog-reveal"}
          isFirePaintMode={interaction.activeTool === "fire-paint"}
          isPathDrawingMode={interaction.activeTool === "path"}
          pathPreviewPoints={pathDraft.points}
          pathPreviewHoverPoint={pathDraft.hoverPoint}
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
        />
        <aside className="control-sidebar" aria-label="Controles de escena" hidden={!isSidebarVisible}>
          {hasSelectedObject ? (
            <SidebarAccordion
              id="selected-object-properties-panel"
              icon={selectedPropertiesIcon}
              title={selectedPropertiesTitle}
              isOpen={isSelectedPropertiesOpen}
              onToggle={() => setIsSelectedPropertiesOpen((current) => !current)}
            >
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
            icon="▦"
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

          <SidebarAccordion
            id="figure-controls-panel"
            icon="◇"
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
            id="token-controls-panel"
            icon="◉"
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
            id="darkness-controls-panel"
            icon="●"
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
            icon="◌"
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
          {isSidebarVisible ? "›" : "‹"}
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
            className="context-menu"
            style={{
              left: interaction.contextMenu.screen.x,
              top: interaction.contextMenu.screen.y
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
                <button type="button" onClick={handleCreateMagicalDarkness}>Oscuridad magica</button>
              </menu>
            </li>
          </menu>
        </div>
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

function sameTokenName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function getTokenNameCardinality(tokens: readonly SceneToken[], tokenName: string): string {
  const count = tokens.filter((token) => sameTokenName(token.name, tokenName)).length;
  return `${count} ${count === 1 ? "igual" : "iguales"}`;
}

interface SidebarAccordionProps {
  readonly id: string;
  readonly icon: string;
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
    <section className={`sidebar-accordion${isOpen ? " is-open" : ""}`} aria-labelledby={`${id}-header`}>
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
