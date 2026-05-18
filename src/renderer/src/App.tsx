import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from "react";
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
  createLightSource,
  moveLightSource,
  updateLightSource,
  type LightKind,
  type LightPatch
} from "../../domain/lighting/lights";
import { createMapImageState, type MapImageState } from "../../domain/map/map-image";
import { measureDistance } from "../../domain/measurement/measurement";
import { hasSceneContent } from "../../domain/sessions/scene-content";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import {
  createTacticalShape,
  moveShape,
  rotateLinearShape,
  setLinearShapeEnd,
  setShapeRadius,
  updateShape,
  type ShapePatch,
  type TacticalShapeKind
} from "../../domain/shapes/shapes";
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
import type { TacticalElementKind } from "../../domain/tools/tactical-elements";
import { MapViewport } from "./components/MapViewport";
import type { PixiContextMenuRequest } from "../../render/pixi/PixiViewport";

const logoUrl = "/logo/ttrpg-effects-logo.png";
const fallbackAppInfo = {
  name: "TTRPG Effects",
  version: "0.0.0"
} as const;

type SidebarSectionId = "grid" | "figures" | "darkness" | "fog";

type SidebarOpenState = Record<SidebarSectionId, boolean>;

export function App(): JSX.Element {
  const appInfo = window.ttrpg?.getAppInfo() ?? fallbackAppInfo;
  const [scene, setScene] = useState<SceneDocument>(() => createDefaultScene());
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
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
  const [openSidebarSections, setOpenSidebarSections] = useState<SidebarOpenState>({
    grid: true,
    figures: false,
    darkness: false,
    fog: false
  });
  const nextShapeId = useRef(1);
  const nextLightId = useRef(1);
  const nextEffectId = useRef(1);
  const nextRevealId = useRef(1);
  const isSpaceDragActiveRef = useRef(isSpaceDragActive);
  isSpaceDragActiveRef.current = isSpaceDragActive;
  const selectedElementIdRef = useRef(interaction.selectedElementId);
  selectedElementIdRef.current = interaction.selectedElementId;

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

  const handleDeleteSelectedElement = useCallback(() => {
    setScene((current) => {
      if (interaction.selectedElementId === null) {
        return current;
      }

      return {
        ...current,
        lights: current.lights.filter((light) => light.id !== interaction.selectedElementId),
        effects: current.effects.filter((effect) => effect.id !== interaction.selectedElementId),
        shapes: current.shapes.filter((shape) => shape.id !== interaction.selectedElementId)
      };
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
    setScene(createDefaultScene());
    setMapImageUrl(null);
    setCurrentFilePath(null);
    setFeedback("Escena default en memoria");
    setWarnings([]);
    setInteraction(createInitialInteractionState());
    setIsSpaceDragActive(false);
    setGridAdjustMode(false);
    setIsSelectedPropertiesOpen(true);
    nextShapeId.current = 1;
    nextLightId.current = 1;
    nextEffectId.current = 1;
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
    handleCancelNewScene,
    handleDeleteSelectedElement,
    isGridAdjustMode,
    isNewSceneDialogOpen,
    setGridAdjustMode
  ]);

  async function saveCurrentScene(): Promise<SceneOperationResult> {
    if (window.ttrpg === undefined) {
      return { ok: false, error: "La API de preload no esta disponible." };
    }

    return window.ttrpg.saveScene(scene);
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
        setInteraction((current) => setZoomLocked(current, result.scene.grid.locked));
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
        effect.id === elementId ? updateAnimatedFireEffect(effect, { position: { x, y } }) : effect
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
      const activeFire = current.effects.find((effect) => effect.id === selectedElementIdRef.current);
      const selectedEffect = current.effects.find(
        (effect) => effect.id === selectedElementIdRef.current && effect.zone.kind === "cells"
      );

      if (selectedEffect !== undefined && selectedEffect.zone.kind === "cells") {
        const mergedCells = mergeFireCells(selectedEffect.zone.cells, cells);

        return {
          ...current,
          effects: current.effects.map((effect) =>
            effect.id === selectedEffect.id
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
        effect.id === elementId && effect.zone.kind === "circle"
          ? updateAnimatedFireEffect(effect, {
              zone: createCircleFireZone(radius, effect.zone.mode)
            })
          : effect.id === elementId && effect.zone.kind === "cells"
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
        effect.id === elementId ? updateAnimatedFireEffect(effect, { lightRadius: radius }) : effect
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
  const selectedShape =
    interaction.selectedElementId === null
      ? undefined
      : scene.shapes.find((shape) => shape.id === interaction.selectedElementId);
  const selectedMeasurement =
    selectedShape?.type === "measurement"
      ? measureDistance(selectedShape.points[0], selectedShape.points[1], {
          grid: scene.grid,
          diagonalMode: scene.settings.diagonalMode
        })
      : undefined;
  const hasSelectedObject =
    selectedLight !== undefined || selectedEffect !== undefined || selectedShape !== undefined;

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

  function updateSelectedEffect(patch: FirePatch): void {
    if (selectedEffect === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === selectedEffect.id ? updateAnimatedFireEffect(effect, patch) : effect
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
      : selectedEffect !== undefined
        ? "Fuego"
        : selectedShape?.type === "measurement"
          ? "Linea"
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
      : selectedEffect !== undefined
        ? "火"
        : selectedShape?.type === "measurement"
          ? "╱"
          : selectedShape?.type === "circle"
            ? "○"
            : selectedShape?.type === "cone"
              ? "◺"
              : "▭";

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
            className={interaction.isMapAdjustMode ? "is-active" : ""}
            onClick={handleToggleMapAdjust}
            aria-pressed={interaction.isMapAdjustMode}
            disabled={mapState === null}
          >
            {interaction.isMapAdjustMode ? "Ajustando mapa" : "Ajustar mapa"}
          </button>
          {interaction.isMapAdjustMode && mapState !== null ? (
            <>
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
            </>
          ) : null}
          <button
            type="button"
            className={interaction.activeTool === "fog-reveal" ? "is-active" : ""}
            onClick={handleToggleFogRevealMode}
            disabled={!scene.fogOfWar.enabled}
            aria-pressed={interaction.activeTool === "fog-reveal"}
          >
            Modo niebla
          </button>
          <button
            type="button"
            className={interaction.activeTool === "fire-paint" ? "is-active" : ""}
            onClick={handleToggleFirePaintMode}
            aria-pressed={interaction.activeTool === "fire-paint"}
          >
            Pintar fuego
          </button>
          <button
            type="button"
            className={interaction.isZoomLocked ? "is-active" : ""}
            onClick={handleToggleZoomLock}
            aria-pressed={interaction.isZoomLocked}
          >
            {interaction.isZoomLocked ? "Zoom bloqueado" : "Bloquear zoom"}
          </button>
          <button
            type="button"
            onClick={handleDeleteSelectedElement}
            disabled={interaction.selectedElementId === null}
          >
            Borrar seleccionado
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
          {scene.shapes.length + scene.lights.length + scene.effects.length + interaction.elements.length} elementos
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
          map={mapState}
          grid={scene.grid}
          settings={scene.settings}
          darkness={scene.darkness}
          fogOfWar={scene.fogOfWar}
          elements={interaction.elements}
          shapes={scene.shapes}
          lights={scene.lights}
          effects={scene.effects}
          selectedElementId={interaction.selectedElementId}
          isZoomLocked={interaction.isZoomLocked}
          isMapAdjustMode={interaction.isMapAdjustMode}
          isGridAdjustMode={isGridAdjustMode}
          isGrabMode={isSpaceDragActive}
          isFogRevealMode={interaction.activeTool === "fog-reveal"}
          isFirePaintMode={interaction.activeTool === "fire-paint"}
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
          onShapeDirectionChange={handleShapeDirectionChange}
          onShapeRadiusChange={handleShapeRadiusChange}
          onShapeRectResize={handleShapeRectResize}
          onFogRevealStroke={handleFogRevealStroke}
          onFirePaint={handleFirePaint}
          onFireZoneRadiusChange={handleFireZoneRadiusChange}
          onFireLightRadiusChange={handleFireLightRadiusChange}
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
              {selectedEffect !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de fuego">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedEffect.visible}
                      onChange={(event) => updateSelectedEffect({ visible: event.currentTarget.checked })}
                    />
                    Visible
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={selectedEffect.color}
                      onChange={(event) => updateSelectedEffect({ color: event.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Escala
                    <input
                      type="number"
                      min="0.1"
                      max="8"
                      step="0.1"
                      value={selectedEffect.scale}
                      onChange={(event) => updateSelectedEffect({ scale: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  {selectedEffect.zone.kind === "circle" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => updateSelectedEffect({ zone: toggleCircleFireMode(selectedEffect).zone })}
                      >
                        {selectedEffect.zone.mode === "closed" ? "Abrir circulo" : "Cerrar circulo"}
                      </button>
                      <label>
                        Radio
                        <input
                          type="number"
                          min="10"
                          max="3000"
                          value={selectedEffect.zone.radius}
                          onChange={(event) =>
                            updateSelectedEffect({
                              zone: createCircleFireZone(
                                event.currentTarget.valueAsNumber,
                                selectedEffect.zone.kind === "circle" ? selectedEffect.zone.mode : "closed"
                              )
                            })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <span>{selectedEffect.zone.cells.length} celdas en fuego</span>
                      <label>
                        Pincel
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={selectedEffect.zone.radius}
                          onChange={(event) =>
                            updateSelectedEffect({
                              zone: createCellFireZone(
                                selectedEffect.zone.kind === "cells" ? selectedEffect.zone.cells : [],
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
                      value={selectedEffect.opacity}
                      onChange={(event) => updateSelectedEffect({ opacity: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedEffect.emitsLight}
                      onChange={(event) => updateSelectedEffect({ emitsLight: event.currentTarget.checked })}
                    />
                    Emite luz
                  </label>
                  <label>
                    Radio luz
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={selectedEffect.lightRadius}
                      onChange={(event) => updateSelectedEffect({ lightRadius: event.currentTarget.valueAsNumber })}
                    />
                  </label>
                </div>
              ) : null}
              {selectedShape !== undefined ? (
                <div className="selected-properties-content" aria-label="Propiedades de forma tactica">
                  {selectedMeasurement !== undefined ? <span>{selectedMeasurement.label}</span> : null}
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
            <button type="button" onClick={handleToggleFirePaintMode}>
              {interaction.activeTool === "fire-paint" ? "Cancelar pintado de fuego" : "Pintar fuego"}
            </button>
            <hr aria-hidden="true" />
            <li className="has-submenu">
              <button type="button">Herramientas de área ▶</button>
              <menu className="context-submenu">
                <button type="button" onClick={() => handleCreateElement("measurement")}>Línea</button>
                <button type="button" onClick={() => handleCreateElement("circle")}>Círculo</button>
                <button type="button" onClick={() => handleCreateElement("cone")}>Cono</button>
                <button type="button" onClick={() => handleCreateElement("rectangle")}>Rectángulo</button>
              </menu>
            </li>
            <button type="button" onClick={() => handleCreateElement("pointLight")}>Luz puntual</button>
            <button type="button" onClick={() => handleCreateElement("coneLight")}>Luz cónica</button>
            <button type="button" onClick={() => handleCreateElement("fire")}>Fuego</button>
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
