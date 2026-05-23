import { forwardRef, useEffect, useImperativeHandle, useRef, type JSX } from "react";
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
  SceneLight,
  SceneSettings,
  SceneShape
} from "../../../domain/sessions/scene-document";
import type { FireCell } from "../../../domain/effects/fire";
import type { ArcanePointerCreatureSize } from "../../../domain/pointer/arcane-pointer";
import type {
  ArcanePointerBroadcast,
  FogPresentation,
  HiddenTokenPolicy,
  ViewportCameraSnapshot,
  ViewportViewRole
} from "../../../domain/player/player-window";

export interface MapViewportHandle {
  getRandomVisibleWorldPoint: () => { readonly x: number; readonly y: number };
  setPathHoverPoint: (point: { readonly x: number; readonly y: number } | null) => void;
  setWaterHoverPoint: (point: { readonly x: number; readonly y: number } | null) => void;
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
  readonly arcanePointerCreatureSize: ArcanePointerCreatureSize;
  readonly arcanePointerResetKey: number;
  readonly arcanePointerEvent?: ArcanePointerBroadcast | null;
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
  readonly onArcanePointerTrigger?: (pointer: ArcanePointerBroadcast) => void;
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
  arcanePointerCreatureSize,
  arcanePointerResetKey,
  arcanePointerEvent = null,
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
  onArcanePointerTrigger
}: MapViewportProps, ref): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<PixiViewport | null>(null);
  const mapRef = useRef(map);
  mapRef.current = map;

  useImperativeHandle(ref, () => ({
    getRandomVisibleWorldPoint: () => viewportRef.current?.getRandomVisibleWorldPoint() ?? { x: 0, y: 0 },
    setPathHoverPoint: (point) => viewportRef.current?.setPathHoverPoint(point),
    setWaterHoverPoint: (point) => viewportRef.current?.setWaterHoverPoint(point)
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
      onArcanePointerTrigger
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
      createdViewport.setGrabMode(isGrabMode);
      createdViewport.setGridAdjustMode(isGridAdjustMode);
      createdViewport.setFogRevealMode(isFogRevealMode);
      createdViewport.setFirePaintMode(isFirePaintMode);
      createdViewport.setPathDrawingMode(isPathDrawingMode);
      createdViewport.setPathPreview(pathPreviewPoints, pathPreviewHoverPoint);
      createdViewport.setWaterDrawingMode(isWaterDrawingMode);
      createdViewport.setWaterPreview(waterPreviewPoints, waterPreviewHoverPoint);
      createdViewport.setArcanePointerMode(isArcanePointerMode);
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
  }, [onContextMenuRequest, onElementSelect, onGridCellSizeChange, onMapRenderError, onMapRendered, onMapPositionChange, onElementMove, onLightDirectionChange, onLightRadiusChange, onShapeEndMove, onPathPointAdd, onPathPointerMove, onWaterPointAdd, onWaterPointerMove, onPathPointMove, onPathMove, onShapeDirectionChange, onShapeRadiusChange, onShapeRectResize, onFogRevealStroke, onFirePaint, onFireZoneRadiusChange, onFireLightRadiusChange, onMagicalDarknessRadiusChange, onWaterLineRotationChange, onWaterPatternRotationChange, onCameraChange, onArcanePointerTrigger]);

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

  return (
    <div
      ref={hostRef}
      className={`map-viewport${isFogRevealMode ? " is-fog-reveal-mode" : ""}${isFirePaintMode ? " is-fire-paint-mode" : ""}${isWaterDrawingMode ? " is-water-drawing-mode" : ""}${isArcanePointerMode ? " is-arcane-pointer-mode" : ""}${isGrabMode ? " is-space-drag-mode" : ""}${isNavigationEnabled ? " is-navigation-enabled" : ""}`}
      aria-label="Lienzo del mapa"
    >
      {isReadOnly ? null : <NavigationLegend />}
    </div>
  );
});
