import { useEffect, useRef, type JSX } from "react";
import { deduplicateInformationAreaCells, getMapAnnotationCenter, translateInformationArea } from "../../../domain/annotations/map-annotations";
import { updateDynamicLightEffect } from "../../../domain/effects/dynamic-light";
import {
  createAnimatedFireEffect, createCellFireZone, createCircleFireZone, createDrawnFireEffect,
  updateAnimatedFireEffect
} from "../../../domain/effects/fire";
import { createLightningEffect, lightningCenter, lightningPoint, moveLightningEffect } from "../../../domain/effects/lightning";
import { fireCenter } from "../../../domain/effects/fire-shapes";
import { updateMagicalDarknessEffect } from "../../../domain/effects/magical-darkness";
import { updateWaterEffect } from "../../../domain/effects/water";
import { updateSceneLabel } from "../../../domain/labels/labels";
import { createLightSource, moveLightSource, updateLightSource } from "../../../domain/lighting/lights";
import { worldToScreen } from "../../../domain/map/camera";
import type { ViewportCameraSnapshot } from "../../../domain/player/player-window";
import type { SceneDocument, SceneEffect, SceneShape } from "../../../domain/sessions/scene-document";
import { syncActiveMapFromRuntimeFields } from "../../../domain/sessions/scene-maps";
import type { WorldPoint } from "../../../domain/shared/coordinates";
import {
  createTacticalShape, movePathPoint, moveShape, rotateLinearShape, setLinearShapeEnd, setShapeRadius, updateShape
} from "../../../domain/shapes/shapes";
import { snapTokenToGrid } from "../../../domain/tokens/tokens";
import { addRevealedArea, createStrokeRevealArea, updateFogOfWar } from "../../../domain/vision/vision";
import { PixiViewport } from "../../../render/pixi/PixiViewport";
import { startCanvasVerification } from "./canvas-verification";

export type LabTool = "select" | "pan" | "measure" | "area" | "light" | "fog" | "fire" | "lightning" | "water" | "pin" | "pointer";

export interface LabCanvasProps {
  scene: SceneDocument;
  imageUrl: string;
  tool: LabTool;
  shape: "circle" | "cone" | "line" | "paint";
  selectedId: string | null;
  camera: ViewportCameraSnapshot;
  onCameraChange: (camera: ViewportCameraSnapshot) => void;
  onSelect: (id: string | null) => void;
  onSceneChange: (scene: SceneDocument) => void;
  /** Single-object tools disarm before this callback; the shell should select its select tool. */
  onToolComplete?: () => void;
  /** Called after the supplied map image has rendered, including replacements. */
  onReady?: () => void;
  onError?: (message: string) => void;
  player?: boolean;
}

/**
 * Uses production constructors and default sizes for one-click measure/area/light/pin.
 * Area line is a measurement; area paint creates terrain annotations. Fog reveals.
 * Water and lightning+paint remain selection previews. Pointer is local/transient.
 * Player mode uses the engine's read-only presentation, wheel and Space-drag.
 */
export function LabCanvas(props: LabCanvasProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const syncRef = useRef<(() => void) | null>(null);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    let cancelled = false;
    let viewport: PixiViewport | null = null;
    let previous: LabCanvasProps | null = null;
    let spaceHeld = false;
    let toolCompleted = false;
    let stopVerification: (() => void) | null = null;

    const reportError = (error: unknown): void => {
      if (!cancelled) propsRef.current.onError?.(error instanceof Error ? error.message : String(error));
    };
    const select = (id: string | null): void => {
      if (cancelled || propsRef.current.player) return;
      propsRef.current = { ...propsRef.current, selectedId: id };
      propsRef.current.onSelect(id);
    };
    const changeScene = (update: (scene: SceneDocument) => SceneDocument): boolean => {
      const current = propsRef.current;
      const editable = current.tool !== "water" && current.tool !== "pointer" && current.tool !== "pan" && !(current.tool === "lightning" && current.shape === "paint");
      if (cancelled || current.player || !editable || current.scene.activeMapId === null) return false;
      try {
        const scene = syncActiveMapFromRuntimeFields(update(propsRef.current.scene));
        // Consecutive paint batches may arrive before the shell commits its render.
        propsRef.current = { ...propsRef.current, scene };
        propsRef.current.onSceneChange(scene);
        return true;
      } catch (error) {
        reportError(error);
        return false;
      }
    };
    const completeTool = (): void => {
      if (cancelled || propsRef.current.player || toolCompleted) return;
      toolCompleted = true;
      viewport?.setEffectTool("lightning", null, propsRef.current.scene.activeMapId ?? "no-map");
      viewport?.setRoomPinMode(false);
      viewport?.setArcanePointerMode(false);
      propsRef.current.onToolComplete?.();
    };
    const createObject = (id: string, update: (scene: SceneDocument) => SceneDocument): void => {
      if (toolCompleted || !changeScene(update)) return;
      select(id);
      completeTool();
    };
    const changeEffect = (id: string, update: (effect: SceneEffect) => SceneEffect): void => {
      changeScene(scene => ({ ...scene, effects: scene.effects.map(effect => effect.id === id ? update(effect) : effect) }));
    };
    const changeShape = (id: string, update: (shape: SceneShape, scene: SceneDocument) => SceneShape): void => {
      changeScene(scene => ({ ...scene, shapes: scene.shapes.map(shape => shape.id === id ? update(shape, scene) : shape) }));
    };
    const setGrabMode = (): void => {
      viewport?.setGrabMode(spaceHeld || (!propsRef.current.player && propsRef.current.tool === "pan"));
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== "Space" || !(event.target instanceof HTMLCanvasElement)) return;
      event.preventDefault();
      spaceHeld = true;
      setGrabMode();
    };
    const releaseSpace = (): void => {
      spaceHeld = false;
      setGrabMode();
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.code === "Space") releaseSpace();
    };

    host.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseSpace);
    const sync = (): void => {
      if (viewport === null || cancelled) return;
      let next = propsRef.current;
      const toolChanged = previous === null || previous.tool !== next.tool || previous.shape !== next.shape || previous.player !== next.player || previous.scene.activeMapId !== next.scene.activeMapId;
      if (toolChanged) {
        toolCompleted = false;
        if (next.tool === "fog" && !next.scene.fogOfWar.enabled) {
          changeScene(scene => ({ ...scene, fogOfWar: updateFogOfWar(scene.fogOfWar, { enabled: true }) }));
          next = propsRef.current;
        }
      }
      syncViewport(viewport, next, previous);
      if (previous === null || previous.tool !== next.tool || previous.player !== next.player) setGrabMode();
      previous = next;
    };
    syncRef.current = sync;

    void PixiViewport.create(host, {
      onElementSelect: select,
      onContextMenu: request => select(request.targetElementId),
      onCameraChange: camera => { if (!cancelled) propsRef.current.onCameraChange(camera); },
      onMapRendered: () => {
        if (cancelled) return;
        if (stopVerification === null && new URLSearchParams(window.location.search).get("verify") === "1") {
          const current = propsRef.current;
          const size = { width: host.clientWidth, height: host.clientHeight };
          const effects = current.scene.effects.filter(effect => effect.visible && (effect.kind === "fire" || effect.kind === "lightning")).slice(0, 3);
          const points = current.player && current.scene.compassOrientation !== 0 ? [] : effects.flatMap(effect =>
            effect.kind === "fire" || effect.kind === "lightning"
              ? [worldToScreen(effect.kind === "fire" ? fireCenter(effect) : lightningCenter(effect), current.camera, size)] : []);
          stopVerification = startCanvasVerification(host, points);
        }
        propsRef.current.onReady?.();
      },
      onMapRenderError: reportError,
      // Reuse Pixi's unsnapped world placement event instead of a second coordinate system.
      onRoomPinPlace: position => {
        const { tool, shape } = propsRef.current;
        if (tool === "measure" || (tool === "area" && shape !== "paint")) {
          const kind = tool === "measure" || shape === "line" ? "measurement" : shape === "cone" ? "cone" : "circle";
          const id = `${kind}-${crypto.randomUUID()}`;
          createObject(id, scene => ({ ...scene, shapes: [...scene.shapes, createTacticalShape({
            id, kind, position, grid: scene.grid, settings: scene.settings
          })] }));
        } else if (tool === "light") {
          const id = `light-${crypto.randomUUID()}`;
          createObject(id, scene => ({ ...scene, lights: [...scene.lights, createLightSource(id, shape === "cone" ? "cone" : "point", position)] }));
        } else if (tool === "pin") {
          const id = `room-pin-${crypto.randomUUID()}`;
          createObject(id, scene => ({ ...scene, mapAnnotations: { ...scene.mapAnnotations, pins: [
            ...scene.mapAnnotations.pins,
            { id, kind: "room-pin", position, title: `Habitacion ${scene.mapAnnotations.pins.length + 1}`, content: "", locked: false }
          ] } }));
        }
      },
      onFogRevealStroke: points => {
        if (propsRef.current.tool !== "fog" || points.length === 0 || !propsRef.current.scene.fogOfWar.enabled) return;
        changeScene(scene => ({ ...scene, fogOfWar: addRevealedArea(scene.fogOfWar, createStrokeRevealArea({
          id: `reveal-${crypto.randomUUID()}`, points, radius: scene.fogOfWar.revealRadius
        })) }));
      },
      onInformationAreaPaint: cells => {
        if (propsRef.current.tool !== "area" || propsRef.current.shape !== "paint" || cells.length === 0) return;
        changeScene(scene => {
          const active = scene.mapAnnotations.areas.find(area => area.id === propsRef.current.selectedId && !area.locked);
          const area = active
            ? { ...active, cells: deduplicateInformationAreaCells([...active.cells, ...cells]) }
            : { id: `information-area-${crypto.randomUUID()}`, kind: "information-area" as const, areaType: "terrain" as const,
              name: `Terreno ${scene.mapAnnotations.areas.length + 1}`, description: "", cells: deduplicateInformationAreaCells(cells), locked: false };
          select(area.id);
          return { ...scene, mapAnnotations: { ...scene.mapAnnotations, areas: active
            ? scene.mapAnnotations.areas.map(item => item.id === area.id ? area : item)
            : [...scene.mapAnnotations.areas, area] } };
        });
      },
      onArcanePointerTrigger: () => { if (propsRef.current.tool === "pointer") completeTool(); },
      onElementMove: (id, x, y) => changeScene(scene => moveSceneObject(scene, id, { x, y })),
      onLightDirectionChange: (id, direction) => changeScene(scene => ({
        ...scene, lights: scene.lights.map(light => light.id === id ? updateLightSource(light, { direction }) : light)
      })),
      onLightRadiusChange: (id, radius) => changeScene(scene => ({
        ...scene, lights: scene.lights.map(light => light.id === id ? updateLightSource(light, { radius }) : light)
      })),
      onDynamicLightDirectionChange: (id, direction) => changeEffect(id, effect => effect.kind === "dynamic-light" ? updateDynamicLightEffect(effect, { direction }) : effect),
      onMagicalDarknessRadiusChange: (id, radius) => changeEffect(id, effect => effect.kind === "magical-darkness" ? updateMagicalDarknessEffect(effect, { radius }) : effect),
      onWaterLineRotationChange: (id, lineRotation) => changeEffect(id, effect => effect.kind === "water" ? updateWaterEffect(effect, { lineRotation }) : effect),
      onWaterPatternRotationChange: (id, patternRotation) => changeEffect(id, effect => effect.kind === "water" ? updateWaterEffect(effect, { patternRotation }) : effect),
      onShapeEndMove: (id, x, y) => changeShape(id, (shape, scene) => setLinearShapeEnd(shape, { x, y }, scene.grid)),
      onShapeDirectionChange: (id, direction) => changeShape(id, (shape, scene) => shape.type === "cone" ? updateShape(shape, { direction }) : rotateLinearShape(shape, direction, scene.grid)),
      onShapeRadiusChange: (id, radius) => changeShape(id, shape => setShapeRadius(shape, radius)),
      onShapeRectResize: (id, width, height, x, y) => changeShape(id, shape => updateShape(moveShape(shape, { x, y }), { width, height })),
      onPathMove: (id, x, y) => changeShape(id, (shape, scene) => moveShape(shape, { x, y }, scene.grid)),
      onPathPointMove: (id, index, x, y) => changeShape(id, (shape, scene) => movePathPoint(shape, index, { x, y }, scene.grid)),
      onFireCreate: (shape, start, end) => {
        if (propsRef.current.tool !== "fire" || propsRef.current.shape === "paint") return;
        const id = `fire-${crypto.randomUUID()}`;
        createObject(id, scene => {
          const effect = createDrawnFireEffect(id, shape, start, end, scene.grid.cellSizeWorld);
          return { ...scene, effects: [...scene.effects, effect] };
        });
      },
      onLightningCreate: (shape, start, end) => {
        if (propsRef.current.tool !== "lightning" || propsRef.current.shape === "paint") return;
        const id = `lightning-${crypto.randomUUID()}`;
        createObject(id, scene => {
          const effect = createLightningEffect(id, shape, start, end, Date.now());
          return { ...scene, effects: [...scene.effects, effect] };
        });
      },
      onFireChange: preview => changeEffect(preview.id, effect => effect.kind === "fire" ? { ...effect, position: preview.position, zone: preview.zone } : effect),
      onLightningChange: preview => changeEffect(preview.id, effect => effect.kind === "lightning" ? { ...effect, position: preview.position, zone: preview.zone } : effect),
      onFireZoneRadiusChange: (id, radius) => changeEffect(id, effect => {
        if (effect.kind !== "fire") return effect;
        if (effect.zone.kind === "circle") return updateAnimatedFireEffect(effect, { zone: createCircleFireZone(radius, effect.zone.mode) });
        if (effect.zone.kind === "cells") return updateAnimatedFireEffect(effect, { zone: createCellFireZone(effect.zone.cells, radius) });
        return effect;
      }),
      onFireLightRadiusChange: (id, lightRadius) => changeEffect(id, effect => effect.kind === "fire" ? updateAnimatedFireEffect(effect, { lightRadius }) : effect),
      onFirePaint: (cells, center) => {
        if (cells.length === 0 || propsRef.current.tool !== "fire" || propsRef.current.shape !== "paint") return;
        changeScene(scene => {
          const active = scene.effects.find(effect => effect.id === propsRef.current.selectedId && effect.kind === "fire");
          if (active?.kind === "fire" && active.zone.kind === "cells") {
            const zone = createCellFireZone([...active.zone.cells, ...cells], active.zone.radius);
            return { ...scene, effects: scene.effects.map(effect => effect.id === active.id ? updateAnimatedFireEffect(active, { zone }) : effect) };
          }
          const radius = active?.kind === "fire" && active.zone.kind === "circle" ? active.zone.radius : 25;
          const effect = updateAnimatedFireEffect(createAnimatedFireEffect(`fire-${crypto.randomUUID()}`, center), {
            zone: createCellFireZone(cells, radius)
          });
          select(effect.id);
          return { ...scene, effects: [...scene.effects, effect] };
        });
      }
    }).then(created => {
      if (cancelled) {
        created.destroy();
        return;
      }
      viewport = created;
      sync();
    }).catch(error => {
      viewport?.destroy();
      viewport = null;
      reportError(error);
    });

    return () => {
      cancelled = true;
      syncRef.current = null;
      host.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseSpace);
      stopVerification?.();
      viewport?.destroy();
    };
  }, []);

  useEffect(() => { syncRef.current?.(); });

  return <div ref={hostRef} className="lab-canvas" aria-label="Lienzo del mapa"
    style={{ position: "relative", width: "100%", height: "100%", minWidth: 0, minHeight: 0, overflow: "hidden", touchAction: "none" }} />;
}

function syncEffectTool(viewport: PixiViewport, props: LabCanvasProps): void {
  const kind = props.tool === "fire" ? "fire" : "lightning";
  const shape = !props.player && (props.tool === "fire" || props.tool === "lightning") && props.shape !== "paint" ? props.shape : null;
  viewport.setEffectTool(kind, shape, props.scene.activeMapId ?? "no-map");
}

function syncViewport(viewport: PixiViewport, next: LabCanvasProps, previous: LabCanvasProps | null): void {
  const scene = next.scene;
  const old = previous?.scene;
  const roleChanged = previous === null || Boolean(previous.player) !== Boolean(next.player);
  if (roleChanged) {
    viewport.setViewRole(next.player ? "player" : "dm");
    viewport.setReadOnly(Boolean(next.player));
    viewport.setNavigationEnabled(true);
    viewport.setFogPresentation(next.player ? "player-blocking" : "dm-preview");
    viewport.setHiddenTokenPolicy(next.player ? "hide" : "show-with-indicator");
    viewport.setShowMapAnnotations(!next.player);
  }
  if (old?.map !== scene.map || old?.activeMapId !== scene.activeMapId || previous?.imageUrl !== next.imageUrl) {
    // imagePath may be null: the lab URL alone is sufficient for Pixi's loader.
    viewport.setMap(scene.activeMapId === null ? null : { ...scene.map, mapId: scene.activeMapId, imageUrl: next.imageUrl });
  }
  if (old?.grid !== scene.grid) {
    viewport.setGrid(scene.grid);
    viewport.setZoomLocked(scene.grid.locked);
  }
  if (old?.settings !== scene.settings) viewport.setSettings(scene.settings);
  if (old?.darkness !== scene.darkness) viewport.setDarkness(scene.darkness);
  if (old?.fogOfWar !== scene.fogOfWar) viewport.setFogOfWar(scene.fogOfWar);
  if (old?.daytimeFilter !== scene.daytimeFilter || old?.daytimeMask !== scene.daytimeMask) viewport.setDaytimeFilter(scene.daytimeFilter, scene.daytimeMask);
  if (old?.shapes !== scene.shapes) viewport.setShapes(scene.shapes);
  if (old?.lights !== scene.lights) viewport.setLights(scene.lights);
  if (old?.effects !== scene.effects) viewport.setEffects(scene.effects);
  // This adapter has no token asset resolver; existing placeholders stay in Pixi.
  if (old?.tokens !== scene.tokens) viewport.setTokens(scene.tokens.map(token => ({ ...token, imageUrl: null })));
  if (old?.labels !== scene.labels) viewport.setLabels(scene.labels);
  if (old?.mapAnnotations !== scene.mapAnnotations) viewport.setMapAnnotations(scene.mapAnnotations);
  if (old?.compassOrientation !== scene.compassOrientation) viewport.setCompassOrientation(scene.compassOrientation);
  if (old?.backgroundColor !== scene.backgroundColor) viewport.setBackgroundColor(scene.backgroundColor);
  if (roleChanged || previous?.selectedId !== next.selectedId) viewport.setSelectedElementId(next.player ? null : next.selectedId);
  if (previous === null || previous.camera.center.x !== next.camera.center.x || previous.camera.center.y !== next.camera.center.y || previous.camera.zoom !== next.camera.zoom) viewport.setCameraSnapshot(next.camera);
  if (roleChanged || previous?.tool !== next.tool || previous?.shape !== next.shape || old?.activeMapId !== scene.activeMapId) {
    syncEffectTool(viewport, next);
    viewport.setFirePaintMode(!next.player && next.tool === "fire" && next.shape === "paint");
    viewport.setArcanePointerMode(!next.player && next.tool === "pointer");
    viewport.setRoomPinMode(!next.player && (next.tool === "measure" || (next.tool === "area" && next.shape !== "paint") || next.tool === "light" || next.tool === "pin"));
    viewport.setInformationAreaMode(!next.player && next.tool === "area" && next.shape === "paint");
    viewport.setFogRevealMode(!next.player && next.tool === "fog");
  }
}

function moveSceneObject(scene: SceneDocument, id: string, position: WorldPoint): SceneDocument {
  return {
    ...scene,
    lights: scene.lights.map(light => light.id === id ? moveLightSource(light, position) : light),
    shapes: scene.shapes.map(shape => shape.id === id ? moveShape(shape, position,
      scene.settings.snapToGrid || (scene.grid.layout === "hexagonal" && shape.type === "measurement") ? scene.grid : undefined
    ) : shape),
    effects: scene.effects.map(effect => {
      if (effect.id !== id) return effect;
      switch (effect.kind) {
        case "fire": return updateAnimatedFireEffect(effect, { position });
        case "lightning": return moveLightningEffect(effect, lightningPoint(position, effect.zone.kind, scene.grid, scene.settings));
        case "dynamic-light": return updateDynamicLightEffect(effect, { position });
        case "magical-darkness": return updateMagicalDarknessEffect(effect, { position });
        case "water": return updateWaterEffect(effect, { position });
      }
    }),
    tokens: scene.tokens.map(token => token.id === id ? { ...token, position: snapTokenToGrid(position, scene.grid, token.footprintCells) } : token),
    labels: scene.labels.map(label => label.id === id ? updateSceneLabel(label, { position }) : label),
    mapAnnotations: {
      ...scene.mapAnnotations,
      pins: scene.mapAnnotations.pins.map(pin => pin.id === id && !pin.locked ? { ...pin, position } : pin),
      sceneLinks: scene.mapAnnotations.sceneLinks.map(link => link.id === id && !link.locked ? { ...link, position } : link),
      areas: scene.mapAnnotations.areas.map(area => {
        if (area.id !== id || area.locked) return area;
        const center = getMapAnnotationCenter(area);
        return translateInformationArea(area, { x: position.x - center.x, y: position.y - center.y });
      })
    }
  };
}
