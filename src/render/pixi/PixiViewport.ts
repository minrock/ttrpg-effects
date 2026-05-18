import { Application, Assets, Container, Graphics, RenderTexture, Sprite, Text } from "pixi.js";
import {
  createCameraState,
  panCamera,
  screenToWorld,
  zoomCameraAtScreenPoint,
  type CameraState
} from "../../domain/map/camera";
import { renderLayerNames, type RenderLayerName } from "../../domain/map/render-layers";
import type { ScreenPoint, ViewportSize } from "../../domain/shared/coordinates";
import type { TacticalElement } from "../../domain/tools/tactical-elements";
import type { MapImageState } from "../../domain/map/map-image";
import type {
  SceneDarkness,
  SceneEffect,
  SceneFogOfWar,
  SceneGrid,
  SceneLight,
  SceneSettings,
  SceneShape
} from "../../domain/sessions/scene-document";
import { measureDistance } from "../../domain/measurement/measurement";
import { getShapeAnchor, getShapeEndPoint } from "../../domain/shapes/shapes";
import { getVisibleAreasFromLights } from "../../domain/vision/vision";
import type { FireCell } from "../../domain/effects/fire";

interface PointerDragState {
  readonly pointerId: number;
  readonly startPoint: ScreenPoint;
  readonly lastPoint: ScreenPoint;
  readonly button: number;
  readonly mode:
    | "pan"
    | "calibrate"
    | "map-move"
    | "element-move"
    | "light-rotate"
    | "shape-end-move"
    | "shape-rotate"
    | "fog-reveal"
    | "fire-paint"
    | "fire-zone-resize"
    | "fire-light-resize";
  readonly elementId?: string;
}

export interface PixiContextMenuRequest {
  readonly screen: ScreenPoint;
  readonly world: {
    readonly x: number;
    readonly y: number;
  };
}

export interface PixiViewportOptions {
  readonly onContextMenu?: (request: PixiContextMenuRequest) => void;
  readonly onElementSelect?: (elementId: string | null) => void;
  readonly onGridCellSizeChange?: (cellSizeWorld: number) => void;
  readonly onMapRenderError?: (message: string) => void;
  readonly onMapRendered?: (message: string) => void;
  readonly onMapPositionChange?: (x: number, y: number) => void;
  readonly onElementMove?: (elementId: string, x: number, y: number) => void;
  readonly onLightDirectionChange?: (elementId: string, direction: number) => void;
  readonly onShapeEndMove?: (elementId: string, x: number, y: number) => void;
  readonly onShapeDirectionChange?: (elementId: string, direction: number) => void;
  readonly onFogReveal?: (x: number, y: number) => void;
  readonly onFirePaint?: (cells: readonly FireCell[], center: { readonly x: number; readonly y: number }) => void;
  readonly onFireZoneRadiusChange?: (elementId: string, radius: number) => void;
  readonly onFireLightRadiusChange?: (elementId: string, radius: number) => void;
}

export class PixiViewport {
  private readonly host: HTMLElement;
  private readonly options: PixiViewportOptions;
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly layers = new Map<RenderLayerName, Container>();
  private readonly resizeObserver: ResizeObserver;
  private camera: CameraState = createCameraState();
  private map: MapImageState | null = null;
  private grid: SceneGrid | null = null;
  private settings: SceneSettings | null = null;
  private darkness: SceneDarkness | null = null;
  private fogOfWar: SceneFogOfWar | null = null;
  private mapSprite: Sprite | null = null;
  private mapLoadVersion = 0;
  private loadedMapUrl: string | null = null;
  private elements: readonly TacticalElement[] = [];
  private shapes: readonly SceneShape[] = [];
  private lights: readonly SceneLight[] = [];
  private effects: readonly SceneEffect[] = [];
  private selectedElementId: string | null = null;
  private isZoomLocked = false;
  private isMapAdjustMode = false;
  private isGrabMode = false;
  private isFogRevealMode = false;
  private isFirePaintMode = false;
  private dragState: PointerDragState | null = null;
  private _darknessTexture: RenderTexture | null = null;
  private _fogOfWarTexture: RenderTexture | null = null;
  private disposed = false;

  private constructor(host: HTMLElement, options: PixiViewportOptions) {
    this.host = host;
    this.options = options;
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
  }

  static async create(host: HTMLElement, options: PixiViewportOptions = {}): Promise<PixiViewport> {
    const viewport = new PixiViewport(host, options);
    await viewport.initialize();
    return viewport;
  }

  setElements(elements: readonly TacticalElement[]): void {
    this.elements = elements;
    this.drawInteractiveElements();
  }

  setShapes(shapes: readonly SceneShape[]): void {
    this.shapes = shapes;
    this.drawInteractiveElements();
  }

  setSettings(settings: SceneSettings): void {
    this.settings = settings;
    this.drawInteractiveElements();
  }

  setLights(lights: readonly SceneLight[]): void {
    this.lights = lights;
    this.drawDarknessLayer();
    this.drawFogOfWarLayer();
    this.drawInteractiveElements();
  }

  setEffects(effects: readonly SceneEffect[]): void {
    this.effects = effects;
    this.drawDarknessLayer();
    this.drawFogOfWarLayer();
    this.drawInteractiveElements();
  }

  setSelectedElementId(selectedElementId: string | null): void {
    this.selectedElementId = selectedElementId;
    this.drawInteractiveElements();
  }

  setZoomLocked(isZoomLocked: boolean): void {
    this.isZoomLocked = isZoomLocked;
  }

  setMapAdjustMode(isMapAdjustMode: boolean): void {
    this.isMapAdjustMode = isMapAdjustMode;
  }

  setGrabMode(isGrabMode: boolean): void {
    this.isGrabMode = isGrabMode;
  }

  setFogRevealMode(isFogRevealMode: boolean): void {
    this.isFogRevealMode = isFogRevealMode;
  }

  setFirePaintMode(isFirePaintMode: boolean): void {
    this.isFirePaintMode = isFirePaintMode;
  }

  setMap(map: MapImageState | null): void {
    const prevUrl = this.map?.imageUrl ?? null;
    this.map = map;

    if (map?.imageUrl !== prevUrl) {
      void this.drawMapImage();
    } else {
      if (this.mapSprite !== null && map !== null) {
        this.mapSprite.position.set(map.position.x, map.position.y);
        this.mapSprite.scale.set(map.scale);
      }
      this.drawDarknessLayer();
      this.drawFogOfWarLayer();
    }

    this.drawGrid();
  }

  setGrid(grid: SceneGrid): void {
    this.grid = grid;
    this.drawGrid();
    this.drawDarknessLayer();
    this.drawFogOfWarLayer();
    this.drawInteractiveElements();
  }

  setDarkness(darkness: SceneDarkness): void {
    this.darkness = darkness;
    this.updateBaseMapVisibility();
    this.drawDarknessLayer();
    this.drawInteractiveElements();
  }

  setFogOfWar(fogOfWar: SceneFogOfWar): void {
    this.fogOfWar = fogOfWar;
    this.drawFogOfWarLayer();
    this.drawVisionObstaclesLayer();
  }

  destroy(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.resizeObserver.disconnect();
    this.removeInputListeners();
    this._darknessTexture?.destroy();
    this._darknessTexture = null;
    this._fogOfWarTexture?.destroy();
    this._fogOfWarTexture = null;
    this.app.destroy(true, { children: true, texture: true });
  }

  private async initialize(): Promise<void> {
    await this.app.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1
    });

    this.app.canvas.className = "pixi-canvas";
    this.host.append(this.app.canvas);
    this.app.stage.addChild(this.world);

    this.createLayers();
    this.drawStaticScene();
    this.addInputListeners();
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  private createLayers(): void {
    for (const layerName of renderLayerNames) {
      const layer = new Container();
      layer.label = layerName;
      this.layers.set(layerName, layer);
      this.world.addChild(layer);
    }
  }

  private drawStaticScene(): void {
    this.drawBackgroundLayer();
    this.drawGrid();
  }

  private drawBackgroundLayer(): void {
    const layer = this.getLayer("background");
    layer.addChild(
      new Graphics()
        .rect(-2400, -2400, 4800, 4800)
        .fill({ color: 0x15181a })
        .rect(-1800, -1800, 3600, 3600)
        .stroke({ color: 0x293034, width: 4, alpha: 0.8 })
    );
  }

  private drawMapPlaceholder(): void {
    const layer = this.getLayer("map");
    layer.addChild(
      new Graphics()
        .roundRect(-360, -240, 720, 480, 10)
        .fill({ color: 0x2d3435 })
        .stroke({ color: 0xc79b55, width: 4, alpha: 0.9 })
    );
  }

  private drawGrid(): void {
    const layer = this.getLayer("grid");
    layer.removeChildren();

    if (this.grid === null || !this.grid.enabled) {
      return;
    }

    const grid = new Graphics();
    const cellSize = this.grid.cellSizeWorld;
    const bounds = this.getGridBounds();
    const startX = Math.floor(bounds.left / cellSize) * cellSize;
    const endX = Math.ceil(bounds.right / cellSize) * cellSize;
    const startY = Math.floor(bounds.top / cellSize) * cellSize;
    const endY = Math.ceil(bounds.bottom / cellSize) * cellSize;

    for (let x = startX; x <= endX; x += cellSize) {
      grid
        .moveTo(x, bounds.top)
        .lineTo(x, bounds.bottom);
    }

    for (let y = startY; y <= endY; y += cellSize) {
      grid
        .moveTo(bounds.left, y)
        .lineTo(bounds.right, y);
    }

    grid.stroke({ color: 0xd9e5df, width: 1, alpha: this.grid.opacity });
    layer.addChild(grid);
    layer.addChild(this.drawCalibrationHandle());
  }

  private drawDarknessLayer(): void {
    const layer = this.getLayer("darkness");
    layer.removeChildren();
    this._darknessTexture?.destroy();
    this._darknessTexture = null;

    if (this.darkness === null || !this.darkness.enabled || this.darkness.opacity <= 0) {
      return;
    }

    const bounds = this.getGridBounds();
    const w = Math.ceil(bounds.right - bounds.left);
    const h = Math.ceil(bounds.bottom - bounds.top);

    const rt = RenderTexture.create({ width: w, height: h });
    this._darknessTexture = rt;

    // Pass 1: fill darkness into the texture
    const darkRect = new Graphics()
      .rect(0, 0, w, h)
      .fill({ color: parseHexColor(this.darkness.color), alpha: this.darkness.opacity });
    this.app.renderer.render({ container: darkRect, target: rt, clear: true });
    darkRect.destroy();

    // Pass 2: erase light areas from the texture
    const activeLights = this.lights.filter((l) => l.visible);
    const activeFireEffects = this.effects.filter((e) => e.visible && e.emitsLight);
    if (activeLights.length > 0 || activeFireEffects.length > 0) {
      const eraseContainer = new Container();
      for (const light of activeLights) {
        eraseContainer.addChild(buildLightEraseGraphic(light, bounds.left, bounds.top));
      }
      for (const effect of activeFireEffects) {
        eraseContainer.addChild(buildFireLightEraseGraphic(effect, bounds.left, bounds.top));
      }
      this.app.renderer.render({ container: eraseContainer, target: rt, clear: false });
      eraseContainer.destroy({ children: true });
    }

    // Display the composited darkness texture as a sprite in world space
    const darknessSprite = new Sprite(rt);
    darknessSprite.position.set(bounds.left, bounds.top);
    layer.addChild(darknessSprite);
  }

  private updateBaseMapVisibility(): void {
    if (this.mapSprite !== null) {
      this.mapSprite.alpha = 1;
    }
  }


  private addInputListeners(): void {
    const { canvas } = this.app;
    canvas.addEventListener("contextmenu", this.handleNativeContextMenu);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointercancel", this.handlePointerUp);
    canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  private removeInputListeners(): void {
    const { canvas } = this.app;
    canvas.removeEventListener("contextmenu", this.handleNativeContextMenu);
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointercancel", this.handlePointerUp);
    canvas.removeEventListener("wheel", this.handleWheel);
  }

  private readonly handleNativeContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.app.canvas.setPointerCapture(event.pointerId);
    const point = this.eventToScreenPoint(event);

    let mode: PointerDragState["mode"] = "pan";
    let elementId: string | undefined;
    if (event.button === 0) {
      if (this.isGrabMode) {
        mode = "pan";
      } else if (this.isFogRevealMode && this.fogOfWar?.enabled) {
        mode = "fog-reveal";
        this.revealFogAtScreenPoint(point);
      } else if (this.isFirePaintMode) {
        mode = "fire-paint";
        this.paintFireAtScreenPoint(point);
      } else {
        const hitFireZoneResizeElementId = this.hitTestFireZoneResizeHandle(point);
        const hitFireLightResizeElementId = this.hitTestFireLightResizeHandle(point);
        const hitRotationElementId = this.hitTestConeRotationHandle(point);
        const hitShapeRotationElementId = this.hitTestLinearShapeRotationHandle(point);
        const hitShapeEndElementId = this.hitTestLinearShapeEndHandle(point);
        const hitElementId = this.hitTestElement(point);

        if (hitFireZoneResizeElementId !== null) {
          mode = "fire-zone-resize";
          elementId = hitFireZoneResizeElementId;
          this.options.onElementSelect?.(hitFireZoneResizeElementId);
          this.updateFireZoneRadiusFromScreenPoint(hitFireZoneResizeElementId, point);
        } else if (hitFireLightResizeElementId !== null) {
          mode = "fire-light-resize";
          elementId = hitFireLightResizeElementId;
          this.options.onElementSelect?.(hitFireLightResizeElementId);
          this.updateFireLightRadiusFromScreenPoint(hitFireLightResizeElementId, point);
        } else if (hitRotationElementId !== null) {
          mode = "light-rotate";
          elementId = hitRotationElementId;
          this.options.onElementSelect?.(hitRotationElementId);
          this.updateLightDirectionFromScreenPoint(hitRotationElementId, point);
        } else if (hitShapeRotationElementId !== null) {
          mode = "shape-rotate";
          elementId = hitShapeRotationElementId;
          this.options.onElementSelect?.(hitShapeRotationElementId);
          this.updateLinearShapeDirectionFromScreenPoint(hitShapeRotationElementId, point);
        } else if (hitShapeEndElementId !== null) {
          mode = "shape-end-move";
          elementId = hitShapeEndElementId;
          this.options.onElementSelect?.(hitShapeEndElementId);
          this.updateLinearShapeEndFromScreenPoint(hitShapeEndElementId, point);
        } else if (hitElementId !== null) {
          mode = "element-move";
          elementId = hitElementId;
          this.options.onElementSelect?.(hitElementId);
        } else if (this.isMapAdjustMode && this.mapSprite !== null) {
          mode = "map-move";
        } else if (this.hitTestCalibrationHandle(point)) {
          mode = "calibrate";
        }
      }
    }

    this.dragState = {
      pointerId: event.pointerId,
      startPoint: point,
      lastPoint: point,
      button: event.button,
      mode,
      elementId
    };
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.dragState === null || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextPoint = this.eventToScreenPoint(event);

    if (this.dragState.mode === "calibrate") {
      const worldPoint = screenToWorld(nextPoint, this.camera, this.getViewportSize());
      const origin = this.getCalibrationOrigin();
      this.options.onGridCellSizeChange?.(Math.abs(worldPoint.x - origin.x));
    } else if (this.dragState.mode === "map-move" && this.mapSprite !== null) {
      const dx = (nextPoint.x - this.dragState.lastPoint.x) / this.camera.zoom;
      const dy = (nextPoint.y - this.dragState.lastPoint.y) / this.camera.zoom;
      this.mapSprite.position.x += dx;
      this.mapSprite.position.y += dy;
      this.drawGrid();
      this.drawDarknessLayer();
      this.drawFogOfWarLayer();
      this.options.onMapPositionChange?.(this.mapSprite.position.x, this.mapSprite.position.y);
    } else if (this.dragState.mode === "element-move" && this.dragState.elementId !== undefined) {
      const worldPoint = screenToWorld(nextPoint, this.camera, this.getViewportSize());
      this.options.onElementMove?.(this.dragState.elementId, worldPoint.x, worldPoint.y);
    } else if (this.dragState.mode === "light-rotate" && this.dragState.elementId !== undefined) {
      this.updateLightDirectionFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-end-move" && this.dragState.elementId !== undefined) {
      this.updateLinearShapeEndFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-rotate" && this.dragState.elementId !== undefined) {
      this.updateLinearShapeDirectionFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "fog-reveal") {
      this.revealFogAtScreenPoint(nextPoint);
    } else if (this.dragState.mode === "fire-paint") {
      this.paintFireAtScreenPoint(nextPoint);
    } else if (this.dragState.mode === "fire-zone-resize" && this.dragState.elementId !== undefined) {
      this.updateFireZoneRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "fire-light-resize" && this.dragState.elementId !== undefined) {
      this.updateFireLightRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.button === 0 || this.dragState.button === 1) {
      this.camera = panCamera(this.camera, {
        x: nextPoint.x - this.dragState.lastPoint.x,
        y: nextPoint.y - this.dragState.lastPoint.y
      });
      this.applyCamera();
    }

    this.dragState = {
      pointerId: event.pointerId,
      startPoint: this.dragState.startPoint,
      lastPoint: nextPoint,
      button: this.dragState.button,
      mode: this.dragState.mode,
      elementId: this.dragState.elementId
    };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.dragState === null || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const releasePoint = this.eventToScreenPoint(event);
    const movedDistance = Math.hypot(
      releasePoint.x - this.dragState.startPoint.x,
      releasePoint.y - this.dragState.startPoint.y
    );
    const isClick = movedDistance < 4;

    if (isClick && this.dragState.button === 2) {
      const screen = this.eventToClientPoint(event);
      this.options.onContextMenu?.({
        screen,
        world: screenToWorld(releasePoint, this.camera, this.getViewportSize())
      });
    }

    if (isClick && this.dragState.button === 0 && this.dragState.mode === "pan") {
      this.options.onElementSelect?.(this.hitTestElement(releasePoint));
    }

    this.dragState = null;
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    if (this.isZoomLocked) {
      return;
    }

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.camera = zoomCameraAtScreenPoint(
      this.camera,
      this.getViewportSize(),
      this.eventToScreenPoint(event),
      this.camera.zoom * zoomFactor
    );
    this.applyCamera();
  };

  private resize(): void {
    const { width, height } = this.host.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));

    this.app.renderer.resize(nextWidth, nextHeight);
    this.applyCamera();
  }

  private applyCamera(): void {
    const viewport = this.getViewportSize();
    this.world.scale.set(this.camera.zoom);
    this.world.position.set(
      viewport.width / 2 - this.camera.center.x * this.camera.zoom,
      viewport.height / 2 - this.camera.center.y * this.camera.zoom
    );
  }

  private getViewportSize(): ViewportSize {
    return {
      width: this.app.renderer.width,
      height: this.app.renderer.height
    };
  }

  private eventToScreenPoint(event: PointerEvent | WheelEvent): ScreenPoint {
    const bounds = this.app.canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  private eventToClientPoint(event: PointerEvent): ScreenPoint {
    return {
      x: event.clientX,
      y: event.clientY
    };
  }

  private drawInteractiveElements(): void {
    const shapesLayer = this.getLayer("shapesAndMeasurements");
    const lightsLayer = this.getLayer("lights");
    const effectsLayer = this.getLayer("effects");
    const selectionLayer = this.getLayer("selection");

    shapesLayer.removeChildren();
    lightsLayer.removeChildren();
    effectsLayer.removeChildren();
    selectionLayer.removeChildren();

    for (const effect of this.effects) {
      if (effect.visible && effect.emitsLight) {
        lightsLayer.addChild(drawFireLight(effect));
      }
    }

    for (const light of this.lights) {
      if (light.visible) {
        lightsLayer.addChild(drawSceneLight(light));
      }
    }

    for (const element of this.elements) {
      const layer = getLayerForElementKind(element.kind);
      const targetLayer =
        layer === "lights" ? lightsLayer : layer === "effects" ? effectsLayer : shapesLayer;
      targetLayer.addChild(drawElement(element));
    }

    if (this.grid !== null && this.settings !== null) {
      for (const shape of this.shapes) {
        shapesLayer.addChild(drawTacticalShape(shape, this.grid, this.settings));
      }
    }

    for (const effect of this.effects) {
      if (effect.visible) {
        effectsLayer.addChild(drawSceneEffect(effect));
      }
    }

    if (this.selectedElementId !== null) {
      const selectedElement = this.findSelectableElement(this.selectedElementId);

      if (selectedElement !== undefined) {
        selectionLayer.addChild(drawSelection(selectedElement));
      }

      const selectedLinearShape = this.shapes.find(
        (shape) =>
          shape.id === this.selectedElementId &&
          (shape.type === "measurement" || shape.type === "line")
      );

      if (selectedLinearShape !== undefined) {
        selectionLayer.addChild(drawLinearShapeHandles(selectedLinearShape));
      }

      const selectedConeLight = this.lights.find(
        (light) => light.id === this.selectedElementId && light.kind === "cone"
      );

      if (selectedConeLight !== undefined) {
        selectionLayer.addChild(drawConeRotationHandle(selectedConeLight));
      }

      const selectedFireEffect = this.effects.find((effect) => effect.id === this.selectedElementId);

      if (selectedFireEffect !== undefined) {
        selectionLayer.addChild(drawFireResizeHandles(selectedFireEffect));
      }
    }
  }

  private drawFogOfWarLayer(): void {
    const layer = this.getLayer("fogOfWar");
    layer.removeChildren();
    this._fogOfWarTexture?.destroy();
    this._fogOfWarTexture = null;

    if (this.fogOfWar === null || !this.fogOfWar.enabled || this.fogOfWar.opacity <= 0) {
      return;
    }

    const bounds = this.getGridBounds();
    const width = Math.ceil(bounds.right - bounds.left);
    const height = Math.ceil(bounds.bottom - bounds.top);
    const fogTexture = RenderTexture.create({ width, height });
    this._fogOfWarTexture = fogTexture;

    const fogRect = new Graphics()
      .rect(0, 0, width, height)
      .fill({ color: parseHexColor(this.fogOfWar.color), alpha: this.fogOfWar.opacity });
    this.app.renderer.render({ container: fogRect, target: fogTexture, clear: true });
    fogRect.destroy();

    const reveals = [...this.fogOfWar.revealedAreas, ...getVisibleAreasFromLights(this.lights)];
    const circleFireReveals = this.effects
      .filter((effect) => effect.visible && effect.emitsLight && effect.zone.kind !== "cells")
      .map((effect) => ({
        id: `vision-${effect.id}`,
        kind: "circle" as const,
        center: effect.position,
        radius: effect.lightRadius
      }));

    const cellFireEffects = this.effects.filter(
      (effect) => effect.visible && effect.emitsLight && effect.zone.kind === "cells"
    );

    if (reveals.length > 0 || circleFireReveals.length > 0 || cellFireEffects.length > 0) {
      const eraseContainer = new Container();

      for (const area of [...reveals, ...circleFireReveals]) {
        const reveal = new Graphics()
          .circle(area.center.x - bounds.left, area.center.y - bounds.top, area.radius)
          .fill({ color: 0xffffff, alpha: 1 });
        reveal.blendMode = "erase";
        eraseContainer.addChild(reveal);
      }

      for (const effect of cellFireEffects) {
        if (effect.zone.kind !== "cells") continue;
        const { bright, dim } = computeCellRings(effect.zone.cells);
        for (const cell of [...effect.zone.cells, ...bright, ...dim]) {
          const reveal = new Graphics()
            .rect(cell.x - bounds.left, cell.y - bounds.top, cell.size, cell.size)
            .fill({ color: 0xffffff, alpha: 1 });
          reveal.blendMode = "erase";
          eraseContainer.addChild(reveal);
        }
      }

      this.app.renderer.render({ container: eraseContainer, target: fogTexture, clear: false });
      eraseContainer.destroy({ children: true });
    }

    const fogSprite = new Sprite(fogTexture);
    fogSprite.position.set(bounds.left, bounds.top);
    layer.addChild(fogSprite);
  }

  private drawVisionObstaclesLayer(): void {
    const layer = this.getLayer("walls");
    layer.removeChildren();

    if (this.fogOfWar === null || this.fogOfWar.obstacles.length === 0) {
      return;
    }

    const walls = new Graphics();

    for (const obstacle of this.fogOfWar.obstacles) {
      const [firstPoint, ...rest] = obstacle.points;

      if (firstPoint === undefined) {
        continue;
      }

      walls.moveTo(firstPoint.x, firstPoint.y);

      for (const point of rest) {
        walls.lineTo(point.x, point.y);
      }
    }

    walls.stroke({ color: 0xffd28a, width: 4, alpha: 0.75 });
    layer.addChild(walls);
  }

  private revealFogAtScreenPoint(screenPoint: ScreenPoint): void {
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    this.options.onFogReveal?.(worldPoint.x, worldPoint.y);
  }

  private paintFireAtScreenPoint(screenPoint: ScreenPoint): void {
    const cells = this.getFirePaintCells(screenPoint);

    if (cells.length === 0) {
      return;
    }

    this.options.onFirePaint?.(cells, screenToWorld(screenPoint, this.camera, this.getViewportSize()));
  }

  private getFirePaintCells(screenPoint: ScreenPoint): readonly FireCell[] {
    if (this.grid === null) {
      return [];
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const cellSize = this.grid.cellSizeWorld;
    const radius = this.getFirePaintRadius();
    const startColumn = Math.floor((worldPoint.x - radius) / cellSize);
    const endColumn = Math.floor((worldPoint.x + radius) / cellSize);
    const startRow = Math.floor((worldPoint.y - radius) / cellSize);
    const endRow = Math.floor((worldPoint.y + radius) / cellSize);
    const cells: FireCell[] = [];

    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        const x = column * cellSize;
        const y = row * cellSize;
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;

        if (Math.hypot(centerX - worldPoint.x, centerY - worldPoint.y) <= radius) {
          cells.push({ x, y, size: cellSize });
        }
      }
    }

    if (cells.length === 0) {
      const column = Math.floor(worldPoint.x / cellSize);
      const row = Math.floor(worldPoint.y / cellSize);
      cells.push({
        x: column * cellSize,
        y: row * cellSize,
        size: cellSize
      });
    }

    return cells;
  }

  private getFirePaintRadius(): number {
    const selectedFire = this.getSelectedFireEffect();

    if (selectedFire?.zone.kind === "circle") {
      return selectedFire.zone.radius * selectedFire.scale;
    }

    if (selectedFire?.zone.kind === "cells") {
      return selectedFire.zone.radius * selectedFire.scale;
    }

    return 25;
  }

  private hitTestElement(screenPoint: ScreenPoint): string | null {
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());

    for (const element of [...this.getSelectableElements()].reverse()) {
      const radius = getHitRadius(element.kind);
      const distance = Math.hypot(worldPoint.x - element.position.x, worldPoint.y - element.position.y);

      if (distance <= radius) {
        return element.id;
      }
    }

    return null;
  }

  private hitTestConeRotationHandle(screenPoint: ScreenPoint): string | null {
    if (this.selectedElementId === null) {
      return null;
    }

    const light = this.lights.find(
      (candidate) => candidate.id === this.selectedElementId && candidate.kind === "cone"
    );

    if (light === undefined) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const distance = Math.hypot(worldPoint.x - light.position.x, worldPoint.y - light.position.y);

    return distance >= CONE_ROTATION_RING_RADIUS - 16 && distance <= CONE_ROTATION_RING_RADIUS + 18
      ? light.id
      : null;
  }

  private hitTestLinearShapeEndHandle(screenPoint: ScreenPoint): string | null {
    const selectedShape = this.getSelectedLinearShape();

    if (selectedShape === null) {
      return null;
    }

    const endPoint = getShapeEndPoint(selectedShape);

    if (endPoint === null) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    return Math.hypot(worldPoint.x - endPoint.x, worldPoint.y - endPoint.y) <= 18
      ? selectedShape.id
      : null;
  }

  private hitTestLinearShapeRotationHandle(screenPoint: ScreenPoint): string | null {
    const selectedShape = this.getSelectedLinearShape();

    if (selectedShape === null) {
      return null;
    }

    const anchor = getShapeAnchor(selectedShape);
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const distance = Math.hypot(worldPoint.x - anchor.x, worldPoint.y - anchor.y);

    return distance >= LINEAR_ROTATION_RING_RADIUS - 16 && distance <= LINEAR_ROTATION_RING_RADIUS + 18
      ? selectedShape.id
      : null;
  }

  private hitTestFireZoneResizeHandle(screenPoint: ScreenPoint): string | null {
    const selectedFire = this.getSelectedFireEffect();

    if (selectedFire === null || selectedFire.zone.kind === "cells") {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = getFireVisualRadius(selectedFire);
    const distance = Math.hypot(worldPoint.x - selectedFire.position.x, worldPoint.y - selectedFire.position.y);

    return distance >= radius - 16 && distance <= radius + 18 ? selectedFire.id : null;
  }

  private hitTestFireLightResizeHandle(screenPoint: ScreenPoint): string | null {
    const selectedFire = this.getSelectedFireEffect();

    if (selectedFire === null || !selectedFire.emitsLight || selectedFire.zone.kind === "cells") {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const distance = Math.hypot(worldPoint.x - selectedFire.position.x, worldPoint.y - selectedFire.position.y);

    return distance >= selectedFire.lightRadius - 16 && distance <= selectedFire.lightRadius + 18
      ? selectedFire.id
      : null;
  }

  private getSelectedFireEffect(): SceneEffect | null {
    if (this.selectedElementId === null) {
      return null;
    }

    return this.effects.find((effect) => effect.id === this.selectedElementId) ?? null;
  }

  private getSelectedLinearShape(): SceneShape | null {
    if (this.selectedElementId === null) {
      return null;
    }

    return (
      this.shapes.find(
        (shape) =>
          shape.id === this.selectedElementId &&
          (shape.type === "measurement" || shape.type === "line")
      ) ?? null
    );
  }

  private updateLightDirectionFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const light = this.lights.find((candidate) => candidate.id === elementId && candidate.kind === "cone");

    if (light === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const direction =
      (Math.atan2(worldPoint.y - light.position.y, worldPoint.x - light.position.x) * 180) / Math.PI;
    this.options.onLightDirectionChange?.(elementId, direction);
  }

  private updateLinearShapeEndFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    this.options.onShapeEndMove?.(elementId, worldPoint.x, worldPoint.y);
  }

  private updateLinearShapeDirectionFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const shape = this.shapes.find(
      (candidate) =>
        candidate.id === elementId && (candidate.type === "measurement" || candidate.type === "line")
    );

    if (shape === undefined) {
      return;
    }

    const anchor = getShapeAnchor(shape);
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const direction = (Math.atan2(worldPoint.y - anchor.y, worldPoint.x - anchor.x) * 180) / Math.PI;
    this.options.onShapeDirectionChange?.(elementId, direction);
  }

  private updateFireZoneRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const effect = this.effects.find((candidate) => candidate.id === elementId);

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const visualRadius = Math.hypot(worldPoint.x - effect.position.x, worldPoint.y - effect.position.y);
    this.options.onFireZoneRadiusChange?.(elementId, Math.max(1, visualRadius / effect.scale));
  }

  private updateFireLightRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const effect = this.effects.find((candidate) => candidate.id === elementId);

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = Math.hypot(worldPoint.x - effect.position.x, worldPoint.y - effect.position.y);
    this.options.onFireLightRadiusChange?.(elementId, Math.max(1, radius));
  }

  private getSelectableElements(): readonly SelectableRenderElement[] {
    return [
      ...this.elements,
      ...this.shapes.map((shape) => ({
        id: shape.id,
        kind: shape.type,
        position: getShapeAnchor(shape)
      })),
      ...this.lights.map((light) => ({
        id: light.id,
        kind: light.kind === "point" ? "pointLight" as const : "coneLight" as const,
        position: light.position
      })),
      ...this.effects.map((effect) => ({
        id: effect.id,
        kind: "fire" as const,
        position: effect.position
      }))
    ];
  }

  private findSelectableElement(elementId: string): SelectableRenderElement | undefined {
    return this.getSelectableElements().find((element) => element.id === elementId);
  }

  private getLayer(layerName: RenderLayerName): Container {
    const layer = this.layers.get(layerName);

    if (layer === undefined) {
      throw new Error(`Render layer not found: ${layerName}`);
    }

    return layer;
  }

  private async drawMapImage(): Promise<void> {
    const layer = this.getLayer("map");
    const loadVersion = ++this.mapLoadVersion;
    layer.removeChildren();
    this.mapSprite = null;

    if (this.loadedMapUrl !== null) {
      await Assets.unload(this.loadedMapUrl);
      this.loadedMapUrl = null;
    }

    if (this.map === null) {
      this.drawMapPlaceholder();
      this.drawFogOfWarLayer();
      return;
    }

    if (typeof this.map.imageUrl !== "string" || this.map.imageUrl.length === 0) {
      this.drawMapPlaceholder();
      this.drawFogOfWarLayer();
      this.options.onMapRenderError?.("La imagen del mapa no tiene una URL valida para renderizar.");
      return;
    }

    try {
      const texture = await Assets.load(this.map.imageUrl);

      if (this.disposed || loadVersion !== this.mapLoadVersion) {
        return;
      }

      this.loadedMapUrl = this.map.imageUrl;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(this.map.position.x, this.map.position.y);
      sprite.scale.set(this.map.scale);
      this.mapSprite = sprite;
      this.updateBaseMapVisibility();
      layer.addChild(sprite);
      this.drawGrid();
      this.drawDarknessLayer();
      this.drawFogOfWarLayer();
      this.options.onMapRendered?.(`Mapa renderizado (${texture.width} x ${texture.height})`);
    } catch {
      this.drawMapPlaceholder();
      this.drawFogOfWarLayer();
      this.options.onMapRenderError?.(
        "No se pudo decodificar la imagen del mapa. Si es HEIC, puede depender del soporte del sistema."
      );
    }
  }

  private getGridBounds(): { left: number; right: number; top: number; bottom: number } {
    if (this.mapSprite !== null) {
      const halfWidth = (this.mapSprite.texture.width * (this.map?.scale ?? 1)) / 2;
      const halfHeight = (this.mapSprite.texture.height * (this.map?.scale ?? 1)) / 2;
      const x = this.mapSprite.position.x;
      const y = this.mapSprite.position.y;
      return {
        left: x - halfWidth - 400,
        right: x + halfWidth + 400,
        top: y - halfHeight - 400,
        bottom: y + halfHeight + 400
      };
    }

    return {
      left: -900,
      right: 900,
      top: -700,
      bottom: 700
    };
  }

  private drawCalibrationHandle(): Graphics {
    const origin = this.getCalibrationOrigin();
    const cellSize = this.grid?.cellSizeWorld ?? 100;
    const handleX = origin.x + cellSize;
    const handleY = origin.y;

    return new Graphics()
      .moveTo(origin.x, origin.y)
      .lineTo(handleX, handleY)
      .stroke({ color: 0xffd28a, width: 5, alpha: 0.95 })
      .circle(origin.x, origin.y, 8)
      .fill({ color: 0xffd28a })
      .circle(handleX, handleY, 12)
      .fill({ color: 0x1a1d1f })
      .circle(handleX, handleY, 8)
      .fill({ color: 0xffd28a });
  }

  private hitTestCalibrationHandle(screenPoint: ScreenPoint): boolean {
    if (this.grid === null || !this.grid.enabled) {
      return false;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const origin = this.getCalibrationOrigin();
    const handle = {
      x: origin.x + this.grid.cellSizeWorld,
      y: origin.y
    };
    return Math.hypot(worldPoint.x - handle.x, worldPoint.y - handle.y) <= 20;
  }

  private getCalibrationOrigin(): { x: number; y: number } {
    return this.map?.position ?? { x: 0, y: 0 };
  }

}

interface SelectableRenderElement {
  readonly id: string;
  readonly kind: TacticalElement["kind"] | SceneShape["type"];
  readonly position: { readonly x: number; readonly y: number };
}
const CONE_ROTATION_RING_RADIUS = 72;
const LINEAR_ROTATION_RING_RADIUS = 54;
function parseHexColor(color: string): number {
  return Number.parseInt(color.replace("#", ""), 16);
}

function getLayerForElementKind(kind: TacticalElement["kind"]): "shapes" | "lights" | "effects" {
  if (kind === "pointLight" || kind === "coneLight") {
    return "lights";
  }

  if (kind === "fire") {
    return "effects";
  }

  return "shapes";
}

function drawElement(element: TacticalElement): Graphics {
  const graphic = new Graphics();
  const { x, y } = element.position;

  switch (element.kind) {
    case "measurement":
    case "line":
      return graphic
        .moveTo(x, y)
        .lineTo(x + 150, y)
        .stroke({ color: 0x7fd3ff, width: 5, alpha: 0.95 })
        .circle(x, y, 9)
        .fill({ color: 0x7fd3ff })
        .circle(x + 150, y, 9)
        .fill({ color: 0x7fd3ff });
    case "circle":
      return graphic.circle(x, y, 72).fill({ color: 0x3d8dff, alpha: 0.18 }).stroke({
        color: 0x7fb8ff,
        width: 4,
        alpha: 0.92
      });
    case "cone":
      return graphic
        .moveTo(x, y)
        .lineTo(x + 150, y - 70)
        .lineTo(x + 150, y + 70)
        .closePath()
        .fill({ color: 0x60c8a6, alpha: 0.2 })
        .stroke({ color: 0x79e1bf, width: 4, alpha: 0.9 });
    case "rectangle":
      return graphic.roundRect(x - 70, y - 45, 140, 90, 8).fill({ color: 0xd7a34f, alpha: 0.2 }).stroke({
        color: 0xffd28a,
        width: 4,
        alpha: 0.9
      });
    case "pointLight":
      return graphic
        .circle(x, y, 92)
        .fill({ color: 0xffc56b, alpha: 0.18 })
        .circle(x, y, 28)
        .fill({ color: 0xffdf91, alpha: 0.52 });
    case "coneLight":
      return graphic
        .moveTo(x, y)
        .lineTo(x + 170, y - 90)
        .lineTo(x + 170, y + 90)
        .closePath()
        .fill({ color: 0xffd27d, alpha: 0.18 })
        .stroke({ color: 0xffdf91, width: 3, alpha: 0.72 });
    case "fire":
      return graphic
        .circle(x, y + 20, 34)
        .fill({ color: 0xff6b35, alpha: 0.45 })
        .circle(x, y, 24)
        .fill({ color: 0xff8a38, alpha: 0.94 })
        .circle(x + 8, y - 8, 13)
        .fill({ color: 0xffe39a, alpha: 0.96 });
  }
}

function drawTacticalShape(shape: SceneShape, grid: SceneGrid, settings: SceneSettings): Container {
  const container = new Container();
  const graphic = new Graphics();
  const anchor = getShapeAnchor(shape);
  const endPoint = getShapeEndPoint(shape);

  switch (shape.type) {
    case "measurement":
      if (endPoint !== null) {
        graphic
          .moveTo(anchor.x, anchor.y)
          .lineTo(endPoint.x, endPoint.y)
          .stroke({ color: 0x7fd3ff, width: 5, alpha: 0.95 })
          .circle(anchor.x, anchor.y, 9)
          .fill({ color: 0x7fd3ff })
          .circle(endPoint.x, endPoint.y, 9)
          .fill({ color: 0x7fd3ff });
        const distance = measureDistance(anchor, endPoint, {
          grid,
          diagonalMode: settings.diagonalMode
        });
        const label = drawShapeLabel(distance.label);
        label.position.set((anchor.x + endPoint.x) / 2 + 10, (anchor.y + endPoint.y) / 2 - 28);
        container.addChild(label);
      }
      break;
    case "line":
      if (endPoint !== null) {
        graphic
          .moveTo(anchor.x, anchor.y)
          .lineTo(endPoint.x, endPoint.y)
          .stroke({ color: 0xa7d7ff, width: 4, alpha: 0.9 })
          .circle(anchor.x, anchor.y, 8)
          .fill({ color: 0xa7d7ff })
          .circle(endPoint.x, endPoint.y, 8)
          .fill({ color: 0xa7d7ff });
      }
      break;
    case "circle":
      graphic
        .circle(anchor.x, anchor.y, shape.radius ?? grid.cellSizeWorld)
        .fill({ color: 0x3d8dff, alpha: 0.18 })
        .stroke({ color: 0x7fb8ff, width: 4, alpha: 0.92 });
      break;
    case "cone":
      drawConeShape(
        graphic,
        anchor.x,
        anchor.y,
        shape.radius ?? grid.cellSizeWorld * 3,
        shape.angle ?? 60,
        shape.direction ?? 0
      )
        .fill({ color: 0x60c8a6, alpha: 0.2 })
        .stroke({ color: 0x79e1bf, width: 4, alpha: 0.9 });
      break;
    case "rectangle":
      graphic
        .roundRect(
          anchor.x - (shape.width ?? grid.cellSizeWorld) / 2,
          anchor.y - (shape.height ?? grid.cellSizeWorld) / 2,
          shape.width ?? grid.cellSizeWorld,
          shape.height ?? grid.cellSizeWorld,
          8
        )
        .fill({ color: 0xd7a34f, alpha: 0.2 })
        .stroke({ color: 0xffd28a, width: 4, alpha: 0.9 });
      break;
  }

  container.addChildAt(graphic, 0);
  return container;
}

function drawShapeLabel(text: string): Text {
  return new Text({
    text,
    style: {
      fill: 0xf4f1e8,
      fontFamily: "system-ui, sans-serif",
      fontSize: 18,
      fontWeight: "700",
      stroke: { color: 0x101315, width: 4 }
    }
  });
}

function drawSceneLight(light: SceneLight): Graphics {
  const graphic = new Graphics();
  const color = parseHexColor(light.color);

  if (light.kind === "point") {
    return graphic
      .circle(light.position.x, light.position.y, light.radius)
      .fill({ color, alpha: light.opacity * 0.06 * light.intensity })
      .circle(light.position.x, light.position.y, light.radius * 0.52)
      .fill({ color, alpha: light.opacity * 0.08 * light.intensity })
      .circle(light.position.x, light.position.y, Math.max(12, light.radius * 0.14))
      .fill({ color, alpha: light.opacity * 0.18 * light.intensity });
  }

  return drawConeShape(
    graphic,
    light.position.x,
    light.position.y,
    light.radius,
    getLightRenderAngle(light),
    light.direction
  )
    .fill({ color, alpha: light.opacity * 0.06 * light.intensity })
    .stroke({ color, width: 3, alpha: light.opacity * 0.55 * light.intensity })
    .circle(light.position.x, light.position.y, Math.max(10, light.radius * 0.08))
    .fill({ color, alpha: light.opacity * 0.18 * light.intensity });
}

function buildLightEraseGraphic(
  light: SceneLight,
  offsetX: number,
  offsetY: number
): Graphics {
  const x = light.position.x - offsetX;
  const y = light.position.y - offsetY;
  const g = new Graphics();

  if (light.kind === "point") {
    g.circle(x, y, light.radius).fill({ color: 0xffffff, alpha: 1 });
  } else {
    drawConeShape(g, x, y, light.radius, getLightRenderAngle(light), light.direction)
      .fill({ color: 0xffffff, alpha: 1 });
  }

  g.blendMode = "erase";
  return g;
}

function buildFireLightEraseGraphic(
  effect: SceneEffect,
  offsetX: number,
  offsetY: number
): Graphics {
  if (effect.zone.kind === "cells") {
    const graphic = new Graphics();
    const { bright, dim } = computeCellRings(effect.zone.cells);

    for (const cell of [...effect.zone.cells, ...bright, ...dim]) {
      graphic
        .rect(cell.x - offsetX, cell.y - offsetY, cell.size, cell.size)
        .fill({ color: 0xffffff, alpha: 1 });
    }

    graphic.blendMode = "erase";
    return graphic;
  }

  const x = effect.position.x - offsetX;
  const y = effect.position.y - offsetY;
  const graphic = new Graphics()
    .circle(x, y, effect.lightRadius)
    .fill({ color: 0xffffff, alpha: 1 });

  graphic.blendMode = "erase";
  return graphic;
}

function drawFireLight(effect: SceneEffect): Graphics {
  if (effect.zone.kind === "cells") {
    const graphic = new Graphics();
    const { bright, dim } = computeCellRings(effect.zone.cells);

    for (const cell of dim) {
      graphic
        .rect(cell.x, cell.y, cell.size, cell.size)
        .fill({ color: 0xffa54f, alpha: 0.08 * effect.opacity });
    }

    for (const cell of bright) {
      graphic
        .rect(cell.x, cell.y, cell.size, cell.size)
        .fill({ color: 0xffd28a, alpha: 0.18 * effect.opacity });
    }

    return graphic;
  }

  return new Graphics()
    .circle(effect.position.x, effect.position.y, effect.lightRadius)
    .fill({ color: 0xffa54f, alpha: 0.12 * effect.opacity })
    .circle(effect.position.x, effect.position.y, effect.lightRadius * 0.5)
    .fill({ color: 0xffd28a, alpha: 0.18 * effect.opacity });
}

function computeCellRings(
  cells: readonly { readonly x: number; readonly y: number; readonly size: number }[]
): {
  bright: Array<{ x: number; y: number; size: number }>;
  dim: Array<{ x: number; y: number; size: number }>;
} {
  if (cells.length === 0) return { bright: [], dim: [] };

  const cellSize = cells[0].size;
  const fireSet = new Set(cells.map((c) => `${c.x}:${c.y}`));
  const brightSet = new Set<string>();

  for (const cell of cells) {
    for (const [dx, dy] of [[-cellSize, 0], [cellSize, 0], [0, -cellSize], [0, cellSize]]) {
      const key = `${cell.x + dx}:${cell.y + dy}`;
      if (!fireSet.has(key)) brightSet.add(key);
    }
  }

  const dimSet = new Set<string>();

  for (const key of brightSet) {
    const [xs, ys] = key.split(":");
    const x = Number(xs);
    const y = Number(ys);

    for (const [dx, dy] of [[-cellSize, 0], [cellSize, 0], [0, -cellSize], [0, cellSize]]) {
      const nKey = `${x + dx}:${y + dy}`;
      if (!fireSet.has(nKey) && !brightSet.has(nKey)) dimSet.add(nKey);
    }
  }

  const keyToCell = (key: string): { x: number; y: number; size: number } => {
    const [xs, ys] = key.split(":");
    return { x: Number(xs), y: Number(ys), size: cellSize };
  };

  return {
    bright: [...brightSet].map(keyToCell),
    dim: [...dimSet].map(keyToCell)
  };
}

function drawSceneEffect(effect: SceneEffect): Graphics {
  const graphic = new Graphics();
  const color = parseHexColor(effect.color);
  const alpha = Math.max(0.15, 0.62 * effect.opacity);

  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;
    graphic
      .circle(effect.position.x, effect.position.y, radius)
      .fill({ color, alpha });

    if (effect.zone.mode === "open") {
      graphic
        .circle(effect.position.x, effect.position.y, radius * effect.zone.innerRadiusRatio)
        .cut();
    }

    return graphic.stroke({ color: 0xff8a38, width: 2, alpha: 0.8 * effect.opacity });
  }

  for (const cell of effect.zone.cells) {
    graphic
      .rect(cell.x, cell.y, cell.size, cell.size)
      .fill({ color, alpha })
      .stroke({ color: 0xff8a38, width: 1, alpha: 0.45 * effect.opacity });
  }

  return graphic;
}

function drawSelection(element: SelectableRenderElement): Graphics {
  const { x, y } = element.position;
  const radius = getHitRadius(element.kind) + 8;

  return new Graphics().circle(x, y, radius).stroke({
    color: 0xfff0a8,
    width: 4,
    alpha: 0.95
  });
}

function drawLinearShapeHandles(shape: SceneShape): Graphics {
  const anchor = getShapeAnchor(shape);
  const endPoint = getShapeEndPoint(shape);
  const graphic = new Graphics()
    .circle(anchor.x, anchor.y, LINEAR_ROTATION_RING_RADIUS)
    .stroke({ color: 0xfff0a8, width: 2, alpha: 0.72 });

  if (endPoint === null) {
    return graphic;
  }

  const direction = Math.atan2(endPoint.y - anchor.y, endPoint.x - anchor.x);
  const handleX = anchor.x + Math.cos(direction) * LINEAR_ROTATION_RING_RADIUS;
  const handleY = anchor.y + Math.sin(direction) * LINEAR_ROTATION_RING_RADIUS;

  return graphic
    .moveTo(anchor.x, anchor.y)
    .lineTo(handleX, handleY)
    .stroke({ color: 0xfff0a8, width: 3, alpha: 0.8 })
    .circle(handleX, handleY, 7)
    .fill({ color: 0xfff0a8, alpha: 0.95 })
    .circle(endPoint.x, endPoint.y, 12)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(endPoint.x, endPoint.y, 8)
    .fill({ color: 0x7fd3ff, alpha: 0.95 });
}

function drawConeRotationHandle(light: SceneLight): Graphics {
  const angle = (light.direction * Math.PI) / 180;
  const handleX = light.position.x + Math.cos(angle) * CONE_ROTATION_RING_RADIUS;
  const handleY = light.position.y + Math.sin(angle) * CONE_ROTATION_RING_RADIUS;

  return new Graphics()
    .circle(light.position.x, light.position.y, CONE_ROTATION_RING_RADIUS)
    .stroke({ color: 0xfff0a8, width: 2, alpha: 0.75 })
    .moveTo(light.position.x, light.position.y)
    .lineTo(handleX, handleY)
    .stroke({ color: 0xfff0a8, width: 3, alpha: 0.85 })
    .circle(handleX, handleY, 8)
    .fill({ color: 0xfff0a8, alpha: 0.95 });
}

function drawFireResizeHandles(effect: SceneEffect): Graphics {
  const graphic = new Graphics();

  if (effect.zone.kind === "cells") {
    return graphic;
  }

  const fireRadius = getFireVisualRadius(effect);

  graphic
    .circle(effect.position.x, effect.position.y, fireRadius)
    .stroke({ color: 0xff8a38, width: 3, alpha: 0.9 })
    .circle(effect.position.x + fireRadius, effect.position.y, 9)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(effect.position.x + fireRadius, effect.position.y, 6)
    .fill({ color: 0xff8a38, alpha: 0.95 });

  if (effect.emitsLight) {
    graphic
      .circle(effect.position.x, effect.position.y, effect.lightRadius)
      .stroke({ color: 0xfff0a8, width: 2, alpha: 0.78 })
      .circle(effect.position.x + effect.lightRadius, effect.position.y, 10)
      .fill({ color: 0x101315, alpha: 0.9 })
      .circle(effect.position.x + effect.lightRadius, effect.position.y, 7)
      .fill({ color: 0xfff0a8, alpha: 0.95 });
  }

  return graphic;
}

function getFireVisualRadius(effect: SceneEffect): number {
  return effect.zone.radius * effect.scale;
}

function drawConeShape(
  graphic: Graphics,
  x: number,
  y: number,
  radius: number,
  angleDegrees: number,
  directionDegrees: number
): Graphics {
  const start = ((directionDegrees - angleDegrees / 2) * Math.PI) / 180;
  const end = ((directionDegrees + angleDegrees / 2) * Math.PI) / 180;
  const steps = Math.max(8, Math.ceil(angleDegrees / 9));

  graphic.moveTo(x, y);

  for (let index = 0; index <= steps; index += 1) {
    const angle = start + ((end - start) * index) / steps;
    graphic.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }

  return graphic.closePath();
}

function getLightRenderAngle(light: SceneLight): number {
  return light.kind === "cone" ? 60 : light.angle;
}

function getHitRadius(kind: SelectableRenderElement["kind"]): number {
  switch (kind) {
    case "measurement":
    case "line":
      return 90;
    case "rectangle":
      return 86;
    case "cone":
    case "coneLight":
      return 95;
    case "pointLight":
      return 92;
    case "circle":
      return 72;
    case "fire":
      return 42;
  }
}
