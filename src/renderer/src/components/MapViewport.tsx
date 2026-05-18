import { useEffect, useRef, type JSX } from "react";
import {
  PixiViewport,
  type PixiContextMenuRequest
} from "../../../render/pixi/PixiViewport";
import type { TacticalElement } from "../../../domain/tools/tactical-elements";
import type { MapImageState } from "../../../domain/map/map-image";
import type {
  SceneDarkness,
  SceneEffect,
  SceneGrid,
  SceneLight,
  SceneSettings,
  SceneShape
} from "../../../domain/sessions/scene-document";

interface MapViewportProps {
  readonly map: MapImageState | null;
  readonly grid: SceneGrid;
  readonly settings: SceneSettings;
  readonly darkness: SceneDarkness;
  readonly elements: readonly TacticalElement[];
  readonly shapes: readonly SceneShape[];
  readonly lights: readonly SceneLight[];
  readonly effects: readonly SceneEffect[];
  readonly selectedElementId: string | null;
  readonly isZoomLocked: boolean;
  readonly isMapAdjustMode: boolean;
  readonly onContextMenuRequest: (request: PixiContextMenuRequest) => void;
  readonly onElementSelect: (elementId: string | null) => void;
  readonly onGridCellSizeChange: (cellSizeWorld: number) => void;
  readonly onMapRenderError: (message: string) => void;
  readonly onMapRendered: (message: string) => void;
  readonly onMapPositionChange: (x: number, y: number) => void;
  readonly onElementMove: (elementId: string, x: number, y: number) => void;
  readonly onLightDirectionChange: (elementId: string, direction: number) => void;
  readonly onShapeEndMove: (elementId: string, x: number, y: number) => void;
  readonly onShapeDirectionChange: (elementId: string, direction: number) => void;
}

export function MapViewport({
  map,
  grid,
  settings,
  darkness,
  elements,
  shapes,
  lights,
  effects,
  selectedElementId,
  isZoomLocked,
  isMapAdjustMode,
  onContextMenuRequest,
  onElementSelect,
  onGridCellSizeChange,
  onMapRenderError,
  onMapRendered,
  onMapPositionChange,
  onElementMove,
  onLightDirectionChange,
  onShapeEndMove,
  onShapeDirectionChange
}: MapViewportProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<PixiViewport | null>(null);

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
      onShapeEndMove,
      onShapeDirectionChange
    }).then((createdViewport) => {
      if (cancelled) {
        createdViewport.destroy();
        return;
      }

      viewport = createdViewport;
      viewportRef.current = createdViewport;
      createdViewport.setMap(map);
      createdViewport.setGrid(grid);
      createdViewport.setSettings(settings);
      createdViewport.setDarkness(darkness);
      createdViewport.setElements(elements);
      createdViewport.setShapes(shapes);
      createdViewport.setLights(lights);
      createdViewport.setEffects(effects);
      createdViewport.setSelectedElementId(selectedElementId);
      createdViewport.setZoomLocked(isZoomLocked);
    });

    return () => {
      cancelled = true;
      viewportRef.current = null;
      viewport?.destroy();
    };
  }, [onContextMenuRequest, onElementSelect, onGridCellSizeChange, onMapRenderError, onMapRendered, onMapPositionChange, onElementMove, onLightDirectionChange, onShapeEndMove, onShapeDirectionChange]);

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
    viewportRef.current?.setSelectedElementId(selectedElementId);
  }, [selectedElementId]);

  useEffect(() => {
    viewportRef.current?.setZoomLocked(isZoomLocked);
  }, [isZoomLocked]);

  useEffect(() => {
    viewportRef.current?.setMapAdjustMode(isMapAdjustMode);
  }, [isMapAdjustMode]);

  return <div ref={hostRef} className="map-viewport" aria-label="Lienzo del mapa" />;
}
