import { forwardRef, useEffect, useImperativeHandle, useRef, type JSX, type ReactNode } from "react";
import { NavigationLegend } from "./NavigationLegend";
import {
  PixiViewport,
  type PixiContextMenuRequest,
  type RenderSceneToken
} from "../../../render/pixi/PixiViewport";
import type { TacticalElement } from "../../../domain/tools/tactical-elements";
import type { MapImageState } from "../../../domain/map/map-image";
import type {
  SceneDarkness,
  SceneEffect,
  SceneFogOfWar,
  SceneGrid,
  SceneLabel,
  SceneLight,
  SceneSettings,
  SceneShape
} from "../../../domain/sessions/scene-document";
import type { FireCell } from "../../../domain/effects/fire";
import type { CompassOrientation } from "../../../domain/map/compass-orientation";
import { DEFAULT_COMPASS_ORIENTATION } from "../../../domain/map/compass-orientation";
import type { ArcanePointerCreatureSize } from "../../../domain/pointer/arcane-pointer";
import type {
  ArcanePointerBroadcast,
  FogPresentation,
  HiddenTokenPolicy,
  ViewportCameraSnapshot,
  ViewportViewRole
} from "../../../domain/player/player-window";
import type {
  InformationAreaCell,
  InformationAreaHighlightBroadcast,
  MapAnnotations
} from "../../../domain/annotations/map-annotations";
import type { SceneLinkValidationStatus } from "../../../domain/annotations/scene-navigation-links";
import type { PlayerCameraControlViewState } from "../../../domain/player/player-camera-control";
import { CompassOverlay } from "./CompassOverlay";

export interface MapViewportHandle {
  getRandomVisibleWorldPoint: () => { readonly x: number; readonly y: number };
  getNearbyVisibleWorldPoint: (
    origin: { readonly x: number; readonly y: number },
    excludedElementId?: string
  ) => { readonly x: number; readonly y: number };
  setPathHoverPoint: (point: { readonly x: number; readonly y: number } | null) => void;
  setWaterHoverPoint: (point: { readonly x: number; readonly y: number } | null) => void;
  centerOnWorldPoint: (point: { readonly x: number; readonly y: number }) => void;
  setPlayerCameraControlState: (state: PlayerCameraControlViewState) => void;
  clearPlayerCameraControlState: () => void;
}

interface MapViewportProps {
  readonly map: MapImageState | null;
  readonly grid: SceneGrid;
  readonly settings: SceneSettings;
  readonly darkness: SceneDarkness;
  readonly fogOfWar: SceneFogOfWar;
  readonly elements: readonly TacticalElement[];
  readonly shapes: readonly SceneShape[];
  readonly lights: readonly SceneLight[];
  readonly effects: readonly SceneEffect[];
  readonly tokens: readonly RenderSceneToken[];
  readonly labels: readonly SceneLabel[];
  readonly mapAnnotations: MapAnnotations;
  readonly compassOrientation?: CompassOrientation;
  readonly showCompass?: boolean;
  readonly sceneLinkStatuses?: Readonly<Record<string, SceneLinkValidationStatus>>;
  readonly showMapAnnotations: boolean;
  readonly selectedElementId: string | null;
  readonly isZoomLocked: boolean;
  readonly isMapAdjustMode: boolean;
  readonly isGridAdjustMode: boolean;
  readonly isGrabMode: boolean;
  readonly viewRole?: ViewportViewRole;
  readonly isReadOnly?: boolean;
  readonly isNavigationEnabled?: boolean;
  readonly fogPresentation?: FogPresentation;
  readonly hiddenTokenPolicy?: HiddenTokenPolicy;
  readonly cameraSnapshot?: ViewportCameraSnapshot | null;
  readonly isFogRevealMode: boolean;
  readonly isFirePaintMode: boolean;
  readonly isPathDrawingMode: boolean;
  readonly isWaterDrawingMode: boolean;
  readonly isArcanePointerMode: boolean;
  readonly isRoomPinMode: boolean;
  readonly isSceneLinkMode?: boolean;
  readonly isInformationAreaMode: boolean;
  readonly arcanePointerCreatureSize: ArcanePointerCreatureSize;
  readonly arcanePointerResetKey: number;
  readonly arcanePointerEvent?: ArcanePointerBroadcast | null;
  readonly informationAreaHighlightEvent?: InformationAreaHighlightBroadcast | null;
  readonly informationAreaHighlightResetKey: number;
  readonly pathPreviewPoints: readonly { readonly x: number; readonly y: number }[];
  readonly pathPreviewHoverPoint: { readonly x: number; readonly y: number } | null;
  readonly waterPreviewPoints: readonly { readonly x: number; readonly y: number }[];
  readonly waterPreviewHoverPoint: { readonly x: number; readonly y: number } | null;
  readonly onContextMenuRequest: (request: PixiContextMenuRequest) => void;
  readonly onElementSelect: (elementId: string | null) => void;
  readonly onGridCellSizeChange: (cellSizeWorld: number) => void;
  readonly onMapRenderError: (message: string) => void;
  readonly onMapRendered: (message: string) => void;
  readonly onMapPositionChange: (x: number, y: number) => void;
  readonly onElementMove: (elementId: string, x: number, y: number) => void;
  readonly onLightDirectionChange: (elementId: string, direction: number) => void;
  readonly onLightRadiusChange: (elementId: string, radius: number) => void;
  readonly onDynamicLightDirectionChange?: (elementId: string, direction: number) => void;
  readonly onShapeEndMove: (elementId: string, x: number, y: number) => void;
  readonly onPathPointAdd: (point: { readonly x: number; readonly y: number }) => void;
  readonly onPathPointerMove: (point: { readonly x: number; readonly y: number } | null) => void;
  readonly onWaterPointAdd: (point: { readonly x: number; readonly y: number }) => void;
  readonly onWaterPointerMove: (point: { readonly x: number; readonly y: number } | null) => void;
  readonly onPathPointMove: (elementId: string, pointIndex: number, x: number, y: number) => void;
  readonly onPathMove: (elementId: string, x: number, y: number) => void;
  readonly onShapeDirectionChange: (elementId: string, direction: number) => void;
  readonly onShapeRadiusChange: (elementId: string, radius: number) => void;
  readonly onShapeRectResize: (elementId: string, width: number, height: number, anchorX: number, anchorY: number) => void;
  readonly onFogRevealStroke: (points: readonly { readonly x: number; readonly y: number }[]) => void;
  readonly onFirePaint: (cells: readonly FireCell[], center: { readonly x: number; readonly y: number }) => void;
  readonly onFireZoneRadiusChange: (elementId: string, radius: number) => void;
  readonly onFireLightRadiusChange: (elementId: string, radius: number) => void;
  readonly onMagicalDarknessRadiusChange: (elementId: string, radius: number) => void;
  readonly onWaterLineRotationChange: (elementId: string, rotation: number) => void;
  readonly onWaterPatternRotationChange: (elementId: string, rotation: number) => void;
  readonly onCameraChange?: (camera: ViewportCameraSnapshot) => void;
  readonly onCameraInteractionEnd?: (camera: ViewportCameraSnapshot) => void;
  readonly onPlayerCameraControlMove?: (position: { readonly x: number; readonly y: number }) => void;
  readonly onArcanePointerTrigger?: (pointer: ArcanePointerBroadcast) => void;
  readonly onRoomPinPlace: (position: { readonly x: number; readonly y: number }) => void;
  readonly onSceneLinkPlace?: (position: { readonly x: number; readonly y: number }) => void;
  readonly onInformationAreaPaint: (cells: readonly InformationAreaCell[]) => void;
  readonly onInformationAreaHighlight: (areaId: string) => void;
  readonly onMapAnnotationPreview: (annotationId: string) => void;
  /** Optional node rendered as a floating overlay inside the viewport (DM-only status badges, etc.). */
  readonly overlay?: ReactNode;
}

export const MapViewport = forwardRef<MapViewportHandle, MapViewportProps>(function MapViewport({
  map,
  grid,
  settings,
  darkness,
  fogOfWar,
  elements,
  shapes,
  lights,
  effects,
  tokens,
  labels,
  mapAnnotations,
  compassOrientation = DEFAULT_COMPASS_ORIENTATION,
  showCompass = false,
  sceneLinkStatuses = {},
  showMapAnnotations,
  selectedElementId,
  isZoomLocked,
  isMapAdjustMode,
  isGridAdjustMode,
  isGrabMode,
  viewRole = "dm",
  isReadOnly = false,
  isNavigationEnabled = false,
  fogPresentation = "dm-preview",
  hiddenTokenPolicy = "show-with-indicator",
  cameraSnapshot = null,
  isFogRevealMode,
  isFirePaintMode,
  isPathDrawingMode,
  isWaterDrawingMode,
  isArcanePointerMode,
  isRoomPinMode,
  isSceneLinkMode = false,
  isInformationAreaMode,
  arcanePointerCreatureSize,
  arcanePointerResetKey,
  arcanePointerEvent = null,
  informationAreaHighlightEvent = null,
  informationAreaHighlightResetKey,
  pathPreviewPoints,
  pathPreviewHoverPoint,
  waterPreviewPoints,
  waterPreviewHoverPoint,
  onContextMenuRequest,
  onElementSelect,
  onGridCellSizeChange,
  onMapRenderError,
  onMapRendered,
  onMapPositionChange,
  onElementMove,
  onLightDirectionChange,
  onLightRadiusChange,
  onDynamicLightDirectionChange,
  onShapeEndMove,
  onPathPointAdd,
  onPathPointerMove,
  onWaterPointAdd,
  onWaterPointerMove,
  onPathPointMove,
  onPathMove,
  onShapeDirectionChange,
  onShapeRadiusChange,
  onShapeRectResize,
  onFogRevealStroke,
  onFirePaint,
  onFireZoneRadiusChange,
  onFireLightRadiusChange,
  onMagicalDarknessRadiusChange,
  onWaterLineRotationChange,
  onWaterPatternRotationChange,
  onCameraChange,
  onCameraInteractionEnd,
  onPlayerCameraControlMove,
  onArcanePointerTrigger,
  onRoomPinPlace,
  onSceneLinkPlace,
  onInformationAreaPaint,
  onInformationAreaHighlight,
  onMapAnnotationPreview,
  overlay
}: MapViewportProps, ref): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<PixiViewport | null>(null);
  const mapRef = useRef(map);
  const compassOrientationRef = useRef(compassOrientation);
  const playerCameraControlStateRef = useRef<PlayerCameraControlViewState | null>(null);
  mapRef.current = map;
  compassOrientationRef.current = compassOrientation;

  useImperativeHandle(ref, () => ({
    getRandomVisibleWorldPoint: () => viewportRef.current?.getRandomVisibleWorldPoint() ?? { x: 0, y: 0 },
    getNearbyVisibleWorldPoint: (origin, excludedElementId) =>
      viewportRef.current?.getNearbyVisibleWorldPoint(origin, excludedElementId) ?? origin,
    setPathHoverPoint: (point) => viewportRef.current?.setPathHoverPoint(point),
    setWaterHoverPoint: (point) => viewportRef.current?.setWaterHoverPoint(point),
    centerOnWorldPoint: (point) => viewportRef.current?.centerOnWorldPoint(point),
    setPlayerCameraControlState: (state) => {
      playerCameraControlStateRef.current = state;
      viewportRef.current?.setPlayerCameraControlState(state);
    },
    clearPlayerCameraControlState: () => {
      playerCameraControlStateRef.current = null;
      viewportRef.current?.clearPlayerCameraControlState();
    }
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    let viewport: PixiViewport | null = null;
    let cancelled = false;

    if (host === null) {
      return undefined;
    }

    void PixiViewport.create(host, {
      onContextMenu: onContextMenuRequest,
      onElementSelect,
      onGridCellSizeChange,
      onMapRenderError,
      onMapRendered,
      onMapPositionChange,
      onElementMove,
      onLightDirectionChange,
      onLightRadiusChange,
      onDynamicLightDirectionChange,
      onShapeEndMove,
      onPathPointAdd,
      onPathPointerMove,
      onWaterPointAdd,
      onWaterPointerMove,
      onPathPointMove,
      onPathMove,
      onShapeDirectionChange,
      onShapeRadiusChange,
      onShapeRectResize,
      onFogRevealStroke,
      onFirePaint,
      onFireZoneRadiusChange,
      onFireLightRadiusChange,
      onMagicalDarknessRadiusChange,
      onWaterLineRotationChange,
      onWaterPatternRotationChange,
      onCameraChange,
      onCameraInteractionEnd,
      onPlayerCameraControlMove,
      onArcanePointerTrigger,
      onRoomPinPlace,
      onSceneLinkPlace,
      onInformationAreaPaint,
      onInformationAreaHighlight,
      onMapAnnotationPreview
    }).then((createdViewport) => {
      if (cancelled) {
        createdViewport.destroy();
        return;
      }

      viewport = createdViewport;
      viewportRef.current = createdViewport;
      createdViewport.setMap(mapRef.current);
      createdViewport.setGrid(grid);
      createdViewport.setSettings(settings);
      createdViewport.setDarkness(darkness);
      createdViewport.setFogOfWar(fogOfWar);
      createdViewport.setElements(elements);
      createdViewport.setShapes(shapes);
      createdViewport.setLights(lights);
      createdViewport.setEffects(effects);
      createdViewport.setTokens(tokens);
      createdViewport.setLabels(labels);
      createdViewport.setMapAnnotations(mapAnnotations);
      createdViewport.setCompassOrientation(compassOrientationRef.current);
      createdViewport.setSceneLinkStatuses(sceneLinkStatuses);
      createdViewport.setShowMapAnnotations(showMapAnnotations);
      createdViewport.setSelectedElementId(selectedElementId);
      createdViewport.setZoomLocked(isZoomLocked);
      createdViewport.setViewRole(viewRole);
      createdViewport.setReadOnly(isReadOnly);
      createdViewport.setNavigationEnabled(isNavigationEnabled);
      createdViewport.setFogPresentation(fogPresentation);
      createdViewport.setHiddenTokenPolicy(hiddenTokenPolicy);
      if (cameraSnapshot !== null) {
        createdViewport.setCameraSnapshot(cameraSnapshot);
      }
      if (playerCameraControlStateRef.current !== null) {
        createdViewport.setPlayerCameraControlState(playerCameraControlStateRef.current);
      }
      createdViewport.setGrabMode(isGrabMode);
      createdViewport.setGridAdjustMode(isGridAdjustMode);
      createdViewport.setFogRevealMode(isFogRevealMode);
      createdViewport.setFirePaintMode(isFirePaintMode);
      createdViewport.setPathDrawingMode(isPathDrawingMode);
      createdViewport.setPathPreview(pathPreviewPoints, pathPreviewHoverPoint);
      createdViewport.setWaterDrawingMode(isWaterDrawingMode);
      createdViewport.setWaterPreview(waterPreviewPoints, waterPreviewHoverPoint);
      createdViewport.setArcanePointerMode(isArcanePointerMode);
      createdViewport.setRoomPinMode(isRoomPinMode);
      createdViewport.setSceneLinkMode(isSceneLinkMode);
      createdViewport.setInformationAreaMode(isInformationAreaMode);
      createdViewport.setArcanePointerCreatureSize(arcanePointerCreatureSize);
      if (arcanePointerResetKey > 0) {
        createdViewport.clearArcanePointers();
      }
    });

    return () => {
      cancelled = true;
      viewportRef.current = null;
      viewport?.destroy();
    };
  }, [onContextMenuRequest, onElementSelect, onGridCellSizeChange, onMapRenderError, onMapRendered, onMapPositionChange, onElementMove, onLightDirectionChange, onLightRadiusChange, onDynamicLightDirectionChange, onShapeEndMove, onPathPointAdd, onPathPointerMove, onWaterPointAdd, onWaterPointerMove, onPathPointMove, onPathMove, onShapeDirectionChange, onShapeRadiusChange, onShapeRectResize, onFogRevealStroke, onFirePaint, onFireZoneRadiusChange, onFireLightRadiusChange, onMagicalDarknessRadiusChange, onWaterLineRotationChange, onWaterPatternRotationChange, onCameraChange, onCameraInteractionEnd, onPlayerCameraControlMove, onArcanePointerTrigger, onRoomPinPlace, onSceneLinkPlace, onInformationAreaPaint, onInformationAreaHighlight, onMapAnnotationPreview]);

  useEffect(() => {
    viewportRef.current?.setMap(map);
  }, [map]);

  useEffect(() => {
    viewportRef.current?.setGrid(grid);
  }, [grid]);

  useEffect(() => {
    viewportRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    viewportRef.current?.setDarkness(darkness);
  }, [darkness]);

  useEffect(() => {
    viewportRef.current?.setFogOfWar(fogOfWar);
  }, [fogOfWar]);

  useEffect(() => {
    viewportRef.current?.setElements(elements);
  }, [elements]);

  useEffect(() => {
    viewportRef.current?.setShapes(shapes);
  }, [shapes]);

  useEffect(() => {
    viewportRef.current?.setLights(lights);
  }, [lights]);

  useEffect(() => {
    viewportRef.current?.setEffects(effects);
  }, [effects]);

  useEffect(() => {
    viewportRef.current?.setTokens(tokens);
  }, [tokens]);

  useEffect(() => {
    viewportRef.current?.setLabels(labels);
  }, [labels]);

  useEffect(() => {
    viewportRef.current?.setMapAnnotations(mapAnnotations);
  }, [mapAnnotations]);

  useEffect(() => {
    viewportRef.current?.setCompassOrientation(compassOrientation);
  }, [compassOrientation]);

  useEffect(() => {
    viewportRef.current?.setSceneLinkStatuses(sceneLinkStatuses);
  }, [sceneLinkStatuses]);

  useEffect(() => {
    viewportRef.current?.setShowMapAnnotations(showMapAnnotations);
  }, [showMapAnnotations]);

  useEffect(() => {
    viewportRef.current?.setSelectedElementId(selectedElementId);
  }, [selectedElementId]);

  useEffect(() => {
    viewportRef.current?.setZoomLocked(isZoomLocked);
  }, [isZoomLocked]);

  useEffect(() => {
    viewportRef.current?.setViewRole(viewRole);
  }, [viewRole]);

  useEffect(() => {
    viewportRef.current?.setReadOnly(isReadOnly);
  }, [isReadOnly]);

  useEffect(() => {
    viewportRef.current?.setNavigationEnabled(isNavigationEnabled);
  }, [isNavigationEnabled]);

  useEffect(() => {
    viewportRef.current?.setFogPresentation(fogPresentation);
  }, [fogPresentation]);

  useEffect(() => {
    viewportRef.current?.setHiddenTokenPolicy(hiddenTokenPolicy);
  }, [hiddenTokenPolicy]);

  useEffect(() => {
    if (cameraSnapshot !== null) {
      viewportRef.current?.setCameraSnapshot(cameraSnapshot);
    }
  }, [cameraSnapshot]);

  useEffect(() => {
    viewportRef.current?.setMapAdjustMode(isMapAdjustMode);
  }, [isMapAdjustMode]);

  useEffect(() => {
    viewportRef.current?.setGridAdjustMode(isGridAdjustMode);
  }, [isGridAdjustMode]);

  useEffect(() => {
    viewportRef.current?.setGrabMode(isGrabMode);
  }, [isGrabMode]);

  useEffect(() => {
    viewportRef.current?.setFogRevealMode(isFogRevealMode);
  }, [isFogRevealMode]);

  useEffect(() => {
    viewportRef.current?.setFirePaintMode(isFirePaintMode);
  }, [isFirePaintMode]);

  useEffect(() => {
    viewportRef.current?.setPathDrawingMode(isPathDrawingMode);
  }, [isPathDrawingMode]);

  useEffect(() => {
    viewportRef.current?.setPathPreview(pathPreviewPoints, pathPreviewHoverPoint);
  }, [pathPreviewPoints, pathPreviewHoverPoint]);

  useEffect(() => {
    viewportRef.current?.setWaterDrawingMode(isWaterDrawingMode);
  }, [isWaterDrawingMode]);

  useEffect(() => {
    viewportRef.current?.setWaterPreview(waterPreviewPoints, waterPreviewHoverPoint);
  }, [waterPreviewPoints, waterPreviewHoverPoint]);

  useEffect(() => {
    viewportRef.current?.setArcanePointerMode(isArcanePointerMode);
  }, [isArcanePointerMode]);

  useEffect(() => {
    viewportRef.current?.setRoomPinMode(isRoomPinMode);
  }, [isRoomPinMode]);

  useEffect(() => {
    viewportRef.current?.setSceneLinkMode(isSceneLinkMode);
  }, [isSceneLinkMode]);

  useEffect(() => {
    viewportRef.current?.setInformationAreaMode(isInformationAreaMode);
  }, [isInformationAreaMode]);

  useEffect(() => {
    viewportRef.current?.setArcanePointerCreatureSize(arcanePointerCreatureSize);
  }, [arcanePointerCreatureSize]);

  useEffect(() => {
    viewportRef.current?.clearArcanePointers();
  }, [arcanePointerResetKey]);

  useEffect(() => {
    if (arcanePointerEvent !== null) {
      viewportRef.current?.showArcanePointer(arcanePointerEvent);
    }
  }, [arcanePointerEvent]);

  useEffect(() => {
    if (informationAreaHighlightEvent !== null) {
      viewportRef.current?.showInformationAreaHighlight(informationAreaHighlightEvent);
    }
  }, [informationAreaHighlightEvent]);

  useEffect(() => {
    viewportRef.current?.clearInformationAreaHighlights();
  }, [informationAreaHighlightResetKey]);

  return (
    <div
      ref={hostRef}
      className={`map-viewport${isFogRevealMode ? " is-fog-reveal-mode" : ""}${isFirePaintMode ? " is-fire-paint-mode" : ""}${isWaterDrawingMode ? " is-water-drawing-mode" : ""}${isArcanePointerMode ? " is-arcane-pointer-mode" : ""}${isGrabMode ? " is-space-drag-mode" : ""}${isNavigationEnabled ? " is-navigation-enabled" : ""}`}
      aria-label="Lienzo del mapa"
    >
      {isReadOnly ? null : <NavigationLegend />}
      {showCompass && map !== null ? (
        <CompassOverlay
          orientation={viewRole === "player" ? DEFAULT_COMPASS_ORIENTATION : compassOrientation}
          variant={viewRole === "player" ? "player" : "dm"}
        />
      ) : null}
      {overlay}
    </div>
  );
});
