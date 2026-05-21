import { Application, Assets, ColorMatrixFilter, Container, Graphics, RenderTexture, Sprite, Text, type Texture } from "pixi.js";
import { GifSprite, type GifSource } from "pixi.js/gif";
import {
  createCameraState,
  panCamera,
  screenToWorld,
  zoomCameraAtScreenPoint,
  type CameraState
} from "../../domain/map/camera";
import { renderLayerNames, type RenderLayerName } from "../../domain/map/render-layers";
import type { ScreenPoint, ViewportSize, WorldPoint } from "../../domain/shared/coordinates";
import type { TacticalElement } from "../../domain/tools/tactical-elements";
import type { MapImageState } from "../../domain/map/map-image";
import type {
  SceneDarkness,
  SceneEffect,
  SceneFireEffect,
  SceneFogOfWar,
  SceneGrid,
  SceneLight,
  SceneMagicalDarknessEffect,
  SceneSettings,
  SceneShape,
  SceneToken,
  SceneWaterEffect
} from "../../domain/sessions/scene-document";
import {
  formatDistance,
  measureDistance,
  measurePathDistance,
  snapWorldPointToCellCenter
} from "../../domain/measurement/measurement";
import { getShapeAnchor, getShapeEndPoint } from "../../domain/shapes/shapes";
import { getSelectedShapeEmojis } from "../../domain/shapes/shape-emojis";
import { getVisibleAreasFromLights } from "../../domain/vision/vision";
import type { FireCell } from "../../domain/effects/fire";
import {
  getArcanePointerAlpha,
  getArcanePointerDiameterWorld,
  type ArcanePointerCreatureSize
} from "../../domain/pointer/arcane-pointer";

export type RenderSceneToken = SceneToken & {
  readonly imageUrl: string | null;
};

interface ArcanePointerAnimation {
  readonly container: Container;
  readonly startedAt: number;
  readonly durationMs: number;
}

interface PointerDragState {
  readonly pointerId: number;
  readonly startPoint: ScreenPoint;
  readonly lastPoint: ScreenPoint;
  readonly button: number;
  readonly mode:
    | "idle"
    | "pan"
    | "calibrate"
    | "map-move"
    | "element-move"
    | "light-rotate"
    | "light-resize"
    | "shape-end-move"
    | "shape-rotate"
    | "shape-circle-resize"
    | "shape-cone-rotate"
    | "shape-cone-resize"
    | "shape-rect-resize"
    | "path-point-move"
    | "path-move"
    | "fog-reveal"
    | "fire-paint"
    | "fire-zone-resize"
    | "fire-light-resize"
    | "magical-darkness-resize"
    | "water-line-rotate"
    | "water-pattern-rotate";
  readonly elementId?: string;
  readonly handleIndex?: number;
  readonly grabOffset?: WorldPoint;
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
  readonly onLightRadiusChange?: (elementId: string, radius: number) => void;
  readonly onShapeEndMove?: (elementId: string, x: number, y: number) => void;
  readonly onPathPointAdd?: (point: WorldPoint) => void;
  readonly onPathPointerMove?: (point: WorldPoint | null) => void;
  readonly onWaterPointAdd?: (point: WorldPoint) => void;
  readonly onWaterPointerMove?: (point: WorldPoint | null) => void;
  readonly onPathPointMove?: (elementId: string, pointIndex: number, x: number, y: number) => void;
  readonly onPathMove?: (elementId: string, x: number, y: number) => void;
  readonly onShapeDirectionChange?: (elementId: string, direction: number) => void;
  readonly onFogRevealStroke?: (points: readonly WorldPoint[]) => void;
  readonly onFirePaint?: (cells: readonly FireCell[], center: { readonly x: number; readonly y: number }) => void;
  readonly onFireZoneRadiusChange?: (elementId: string, radius: number) => void;
  readonly onFireLightRadiusChange?: (elementId: string, radius: number) => void;
  readonly onMagicalDarknessRadiusChange?: (elementId: string, radius: number) => void;
  readonly onWaterLineRotationChange?: (elementId: string, rotation: number) => void;
  readonly onWaterPatternRotationChange?: (elementId: string, rotation: number) => void;
  readonly onShapeRadiusChange?: (elementId: string, radius: number) => void;
  readonly onShapeRectResize?: (elementId: string, width: number, height: number, anchorX: number, anchorY: number) => void;
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
  private colorMapSprite: Sprite | null = null;
  private darkvisionMask: Graphics | null = null;
  private readonly grayscaleFilter = new ColorMatrixFilter();
  private mapLoadVersion = 0;
  private tokenLoadVersion = 0;
  private loadedMapUrl: string | null = null;
  private loadedTokenUrls = new Set<string>();
  private firePatternSource: GifSource | null = null;
  private elements: readonly TacticalElement[] = [];
  private shapes: readonly SceneShape[] = [];
  private lights: readonly SceneLight[] = [];
  private effects: readonly SceneEffect[] = [];
  private tokens: readonly RenderSceneToken[] = [];
  private selectedElementId: string | null = null;
  private isZoomLocked = false;
  private isMapAdjustMode = false;
  private isGridAdjustMode = false;
  private isGrabMode = false;
  private isFogRevealMode = false;
  private isFirePaintMode = false;
  private isPathDrawingMode = false;
  private isWaterDrawingMode = false;
  private isArcanePointerMode = false;
  private arcanePointerCreatureSize: ArcanePointerCreatureSize = "medium";
  private pathPreviewPoints: readonly WorldPoint[] = [];
  private pathPreviewHoverPoint: WorldPoint | null = null;
  private waterPreviewPoints: readonly WorldPoint[] = [];
  private waterPreviewHoverPoint: WorldPoint | null = null;
  private pathHoverZone: "point" | "circle" | null = null;
  private fogRevealStrokePoints: WorldPoint[] = [];
  private dragState: PointerDragState | null = null;
  private _darknessTexture: RenderTexture | null = null;
  private _fogOfWarTexture: RenderTexture | null = null;
  private disposed = false;
  private waterPatternSource: GifSource | null = null;
  private arcanePointerSource: GifSource | null = null;
  private readonly arcanePointers = new Map<string, ArcanePointerAnimation>();
  private nextArcanePointerId = 1;
  private readonly effectRenderCache = new Map<
    string,
    {
      readonly signature: string;
      readonly container: Container;
    }
  >();

  private constructor(host: HTMLElement, options: PixiViewportOptions) {
    this.host = host;
    this.options = options;
    this.grayscaleFilter.desaturate();
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
    this.drawShapesAndMeasurementsLayer();
    this.drawSelectionLayer();
  }

  setSettings(settings: SceneSettings): void {
    this.settings = settings;
    this.drawShapesAndMeasurementsLayer();
    this.drawSelectionLayer();
  }

  setLights(lights: readonly SceneLight[]): void {
    this.lights = lights;
    this.drawDarkvisionLayer();
    this.drawDarknessLayer();
    this.drawFogOfWarLayer();
    void this.drawTokenLayer();
    this.drawLightsLayer();
    this.drawSelectionLayer();
  }

  setEffects(effects: readonly SceneEffect[]): void {
    this.effects = effects;
    this.drawDarkvisionLayer();
    this.drawDarknessLayer();
    this.drawFogOfWarLayer();
    this.drawLightsLayer();
    this.drawEffectsLayer();
    this.drawMagicalDarknessLayer();
    this.drawSelectionLayer();
  }

  setTokens(tokens: readonly RenderSceneToken[]): void {
    this.tokens = tokens;
    void this.drawTokenLayer();
    this.drawSelectionLayer();
  }

  setSelectedElementId(selectedElementId: string | null): void {
    this.selectedElementId = selectedElementId;
    this.pathHoverZone = null;
    this.drawSelectionLayer();
  }

  setZoomLocked(isZoomLocked: boolean): void {
    this.isZoomLocked = isZoomLocked;
  }

  setMapAdjustMode(isMapAdjustMode: boolean): void {
    this.isMapAdjustMode = isMapAdjustMode;
  }

  setGridAdjustMode(isGridAdjustMode: boolean): void {
    this.isGridAdjustMode = isGridAdjustMode;
    this.drawSelectionLayer();
  }

  setGrabMode(isGrabMode: boolean): void {
    this.isGrabMode = isGrabMode;
    this.updateCursor();
  }

  setFogRevealMode(isFogRevealMode: boolean): void {
    this.isFogRevealMode = isFogRevealMode;
    this.updateCursor();
  }

  setFirePaintMode(isFirePaintMode: boolean): void {
    this.isFirePaintMode = isFirePaintMode;
    this.updateCursor();
  }

  setPathDrawingMode(isPathDrawingMode: boolean): void {
    this.isPathDrawingMode = isPathDrawingMode;
    this.updateCursor();
  }

  setWaterDrawingMode(isWaterDrawingMode: boolean): void {
    this.isWaterDrawingMode = isWaterDrawingMode;
    this.updateCursor();
  }

  setArcanePointerMode(isArcanePointerMode: boolean): void {
    this.isArcanePointerMode = isArcanePointerMode;
    this.updateCursor();
  }

  setArcanePointerCreatureSize(arcanePointerCreatureSize: ArcanePointerCreatureSize): void {
    this.arcanePointerCreatureSize = arcanePointerCreatureSize;
  }

  clearArcanePointers(): void {
    for (const pointer of this.arcanePointers.values()) {
      destroyDisplayObject(pointer.container);
    }
    this.arcanePointers.clear();
  }

  setPathPreview(points: readonly WorldPoint[], hoverPoint: WorldPoint | null): void {
    this.pathPreviewPoints = points;
    this.pathPreviewHoverPoint = hoverPoint;
    this.drawSelectionLayer();
  }

  setWaterPreview(points: readonly WorldPoint[], hoverPoint: WorldPoint | null): void {
    this.waterPreviewPoints = points;
    this.waterPreviewHoverPoint = hoverPoint;
    this.drawSelectionLayer();
  }

  getRandomVisibleWorldPoint(): WorldPoint {
    const viewport = this.getViewportSize();
    const screenPoint = {
      x: viewport.width * (0.25 + Math.random() * 0.5),
      y: viewport.height * (0.25 + Math.random() * 0.5)
    };

    return screenToWorld(screenPoint, this.camera, viewport);
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
        this.colorMapSprite?.position.set(map.position.x, map.position.y);
        this.colorMapSprite?.scale.set(map.scale);
      }
      this.drawDarkvisionLayer();
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
    void this.drawTokenLayer();
    this.drawShapesAndMeasurementsLayer();
    this.drawSelectionLayer();
  }

  setDarkness(darkness: SceneDarkness): void {
    this.darkness = darkness;
    this.updateBaseMapVisibility();
    this.drawDarkvisionLayer();
    this.drawDarknessLayer();
    this.drawSelectionLayer();
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
    for (const url of this.loadedTokenUrls) {
      void Assets.unload(url);
    }
    this.loadedTokenUrls.clear();
    if (this.colorMapSprite !== null) {
      this.colorMapSprite.mask = null;
    }
    this.darkvisionMask?.destroy();
    this.darkvisionMask = null;
    this.firePatternSource = null;
    this.waterPatternSource = null;
    this.arcanePointerSource = null;
    this.app.ticker.remove(this.updateArcanePointers);
    this.clearArcanePointers();
    for (const cached of this.effectRenderCache.values()) {
      destroyDisplayObject(cached.container);
    }
    this.effectRenderCache.clear();
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
    this.firePatternSource = await loadFirePatternSource();
    this.waterPatternSource = await loadWaterPatternSource();
    this.arcanePointerSource = await loadArcanePointerSource();
    this.app.ticker.add(this.updateArcanePointers);

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
    clearContainerChildren(layer);

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
  }

  private drawDarknessLayer(): void {
    const layer = this.getLayer("darkness");
    clearContainerChildren(layer);
    this._darknessTexture?.destroy();
    this._darknessTexture = null;

    if (
      this.darkness === null ||
      this.darkness.darkvisionEnabled ||
      !this.darkness.enabled ||
      this.darkness.opacity <= 0
    ) {
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
    const activeFireEffects = this.effects.filter(isVisibleLightEmittingFireEffect);
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
      this.mapSprite.filters = this.darkness?.darkvisionEnabled ? [this.grayscaleFilter] : null;
    }

    if (this.colorMapSprite !== null) {
      this.colorMapSprite.visible = false;
      this.colorMapSprite.mask = null;
    }
  }

  private drawDarkvisionLayer(): void {
    if (this.colorMapSprite !== null) {
      this.colorMapSprite.mask = null;
    }
    this.darkvisionMask?.destroy();
    this.darkvisionMask = null;

    this.updateBaseMapVisibility();

    if (
      this.mapSprite === null ||
      this.colorMapSprite === null ||
      this.darkness?.darkvisionEnabled !== true
    ) {
      return;
    }

    const mask = buildDarkvisionColorMask(this.lights, this.effects);

    if (mask === null) {
      return;
    }

    this.darkvisionMask = mask;
    this.getLayer("map").addChild(mask);
    this.colorMapSprite.visible = true;
    this.colorMapSprite.setMask({ mask });
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

    let mode: PointerDragState["mode"] = "idle";
    let elementId: string | undefined;
    let handleIndex: number | undefined;
    let grabOffset: WorldPoint | undefined;
    if (event.button === 0) {
      if (this.isGrabMode) {
        mode = "pan";
      } else if (this.isFogRevealMode && this.fogOfWar?.enabled) {
        mode = "fog-reveal";
        this.startFogRevealStroke(point);
      } else if (this.isFirePaintMode) {
        mode = "fire-paint";
        this.paintFireAtScreenPoint(point);
      } else if (this.isPathDrawingMode || this.isWaterDrawingMode || this.isArcanePointerMode) {
        mode = "idle";
      } else {
        const hitFireZoneResizeElementId = this.hitTestFireZoneResizeHandle(point);
        const hitFireLightResizeElementId = this.hitTestFireLightResizeHandle(point);
        const hitMagicalDarknessResizeElementId = this.hitTestMagicalDarknessResizeHandle(point);
        const hitWaterLineRotationElementId = this.hitTestWaterLineRotationHandle(point);
        const hitWaterPatternRotationElementId = this.hitTestWaterPatternRotationHandle(point);
        const hitLightResizeElementId = this.hitTestLightResizeHandle(point);
        const hitRotationElementId = this.hitTestConeRotationHandle(point);
        const hitShapeRotationElementId = this.hitTestLinearShapeRotationHandle(point);
        const hitShapeEndElementId = this.hitTestLinearShapeEndHandle(point);
        const hitCircleResizeElementId = this.hitTestCircleResizeHandle(point);
        const hitConeResizeElementId = this.hitTestConeShapeResizeHandle(point);
        const hitConeRotateElementId = this.hitTestConeShapeRotationHandle(point);
        const hitRectCornerIndex = this.hitTestRectCornerHandle(point);
        const hitPathHandles = this.hitTestPathHandles(point);
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
        } else if (hitMagicalDarknessResizeElementId !== null) {
          mode = "magical-darkness-resize";
          elementId = hitMagicalDarknessResizeElementId;
          this.options.onElementSelect?.(hitMagicalDarknessResizeElementId);
          this.updateMagicalDarknessRadiusFromScreenPoint(hitMagicalDarknessResizeElementId, point);
        } else if (hitWaterLineRotationElementId !== null) {
          mode = "water-line-rotate";
          elementId = hitWaterLineRotationElementId;
          this.options.onElementSelect?.(hitWaterLineRotationElementId);
          this.updateWaterLineRotationFromScreenPoint(hitWaterLineRotationElementId, point);
        } else if (hitWaterPatternRotationElementId !== null) {
          mode = "water-pattern-rotate";
          elementId = hitWaterPatternRotationElementId;
          this.options.onElementSelect?.(hitWaterPatternRotationElementId);
          this.updateWaterPatternRotationFromScreenPoint(hitWaterPatternRotationElementId, point);
        } else if (hitLightResizeElementId !== null) {
          mode = "light-resize";
          elementId = hitLightResizeElementId;
          this.options.onElementSelect?.(hitLightResizeElementId);
          this.updateLightRadiusFromScreenPoint(hitLightResizeElementId, point);
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
        } else if (hitCircleResizeElementId !== null) {
          mode = "shape-circle-resize";
          elementId = hitCircleResizeElementId;
          this.updateShapeCircleRadiusFromScreenPoint(hitCircleResizeElementId, point);
        } else if (hitConeResizeElementId !== null) {
          mode = "shape-cone-resize";
          elementId = hitConeResizeElementId;
          this.updateShapeConeRadiusFromScreenPoint(hitConeResizeElementId, point);
        } else if (hitConeRotateElementId !== null) {
          mode = "shape-cone-rotate";
          elementId = hitConeRotateElementId;
          this.updateShapeConeDirectionFromScreenPoint(hitConeRotateElementId, point);
        } else if (hitPathHandles !== null && hitPathHandles.zone === "point") {
          mode = "path-point-move";
          elementId = hitPathHandles.elementId;
          handleIndex = 0;
          this.options.onElementSelect?.(hitPathHandles.elementId);
          this.updatePathPointFromScreenPoint(hitPathHandles.elementId, 0, point);
        } else if (hitPathHandles !== null && hitPathHandles.zone === "circle") {
          mode = "path-move";
          elementId = hitPathHandles.elementId;
          this.options.onElementSelect?.(hitPathHandles.elementId);
          const pathShape = this.shapes.find((s) => s.id === hitPathHandles.elementId);
          const firstPoint = pathShape?.points[0];
          if (firstPoint !== undefined) {
            const grabWorld = screenToWorld(point, this.camera, this.getViewportSize());
            grabOffset = { x: grabWorld.x - firstPoint.x, y: grabWorld.y - firstPoint.y };
          }
        } else if (hitRectCornerIndex !== null && this.selectedElementId !== null) {
          mode = "shape-rect-resize";
          elementId = this.selectedElementId;
          handleIndex = hitRectCornerIndex;
          this.updateShapeRectCornerFromScreenPoint(this.selectedElementId, hitRectCornerIndex, point);
        } else if (hitElementId !== null) {
          const hitIsPath = this.shapes.some((s) => s.id === hitElementId && s.type === "path");
          mode = hitIsPath ? "idle" : "element-move";
          elementId = hitElementId;
          this.options.onElementSelect?.(hitElementId);
        } else if (this.isMapAdjustMode && this.mapSprite !== null) {
          mode = "map-move";
        } else if (this.isGridAdjustMode && this.hitTestCalibrationHandle(point)) {
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
      elementId,
      handleIndex,
      grabOffset
    };
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const screenPoint = this.eventToScreenPoint(event);

    if (this.isPathDrawingMode) {
      this.options.onPathPointerMove?.(this.snapScreenPointToCellCenter(screenPoint));
    }

    if (this.isWaterDrawingMode) {
      this.options.onWaterPointerMove?.(this.snapScreenPointToCellCenter(screenPoint));
    }

    if (this.dragState === null) {
      const newZone = this.hitTestPathHandles(screenPoint)?.zone ?? null;
      if (newZone !== this.pathHoverZone) {
        this.pathHoverZone = newZone;
        this.updateCursor();
      }
      return;
    }

    if (this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextPoint = screenPoint;

    if (this.dragState.mode === "calibrate") {
      const worldPoint = screenToWorld(nextPoint, this.camera, this.getViewportSize());
      const origin = this.getCalibrationOrigin();
      this.options.onGridCellSizeChange?.(Math.abs(worldPoint.x - origin.x));
    } else if (this.dragState.mode === "map-move" && this.mapSprite !== null) {
      const dx = (nextPoint.x - this.dragState.lastPoint.x) / this.camera.zoom;
      const dy = (nextPoint.y - this.dragState.lastPoint.y) / this.camera.zoom;
      this.mapSprite.position.x += dx;
      this.mapSprite.position.y += dy;
      this.colorMapSprite?.position.set(this.mapSprite.position.x, this.mapSprite.position.y);
    } else if (this.dragState.mode === "element-move" && this.dragState.elementId !== undefined) {
      const worldPoint = screenToWorld(nextPoint, this.camera, this.getViewportSize());
      this.options.onElementMove?.(this.dragState.elementId, worldPoint.x, worldPoint.y);
    } else if (this.dragState.mode === "light-rotate" && this.dragState.elementId !== undefined) {
      this.updateLightDirectionFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "light-resize" && this.dragState.elementId !== undefined) {
      this.updateLightRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-end-move" && this.dragState.elementId !== undefined) {
      this.updateLinearShapeEndFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-rotate" && this.dragState.elementId !== undefined) {
      this.updateLinearShapeDirectionFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "fog-reveal") {
      this.appendFogRevealStrokePoint(nextPoint);
    } else if (this.dragState.mode === "fire-paint") {
      this.paintFireAtScreenPoint(nextPoint);
    } else if (this.dragState.mode === "fire-zone-resize" && this.dragState.elementId !== undefined) {
      this.updateFireZoneRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "fire-light-resize" && this.dragState.elementId !== undefined) {
      this.updateFireLightRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "magical-darkness-resize" && this.dragState.elementId !== undefined) {
      this.updateMagicalDarknessRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "water-line-rotate" && this.dragState.elementId !== undefined) {
      this.updateWaterLineRotationFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "water-pattern-rotate" && this.dragState.elementId !== undefined) {
      this.updateWaterPatternRotationFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-circle-resize" && this.dragState.elementId !== undefined) {
      this.updateShapeCircleRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-cone-resize" && this.dragState.elementId !== undefined) {
      this.updateShapeConeRadiusFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-cone-rotate" && this.dragState.elementId !== undefined) {
      this.updateShapeConeDirectionFromScreenPoint(this.dragState.elementId, nextPoint);
    } else if (this.dragState.mode === "shape-rect-resize" && this.dragState.elementId !== undefined && this.dragState.handleIndex !== undefined) {
      this.updateShapeRectCornerFromScreenPoint(this.dragState.elementId, this.dragState.handleIndex, nextPoint);
    } else if (this.dragState.mode === "path-point-move" && this.dragState.elementId !== undefined && this.dragState.handleIndex !== undefined) {
      this.updatePathPointFromScreenPoint(this.dragState.elementId, this.dragState.handleIndex, nextPoint);
    } else if (this.dragState.mode === "path-move" && this.dragState.elementId !== undefined && this.dragState.grabOffset !== undefined) {
      this.app.canvas.style.cursor = "grabbing";
      const currentWorld = screenToWorld(nextPoint, this.camera, this.getViewportSize());
      this.options.onPathMove?.(
        this.dragState.elementId,
        currentWorld.x - this.dragState.grabOffset.x,
        currentWorld.y - this.dragState.grabOffset.y
      );
    } else if (this.dragState.mode === "pan") {
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
      elementId: this.dragState.elementId,
      handleIndex: this.dragState.handleIndex,
      grabOffset: this.dragState.grabOffset
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

    if (this.dragState.mode === "fog-reveal") {
      this.finishFogRevealStroke(releasePoint);
    }

    if (this.dragState.mode === "map-move" && this.mapSprite !== null) {
      this.drawGrid();
      this.drawDarkvisionLayer();
      this.drawDarknessLayer();
      this.drawFogOfWarLayer();
      this.options.onMapPositionChange?.(this.mapSprite.position.x, this.mapSprite.position.y);
    }

    if (isClick && this.dragState.button === 0 && this.dragState.mode === "idle") {
      if (this.isPathDrawingMode) {
        this.options.onPathPointAdd?.(this.snapScreenPointToCellCenter(releasePoint));
      } else if (this.isWaterDrawingMode) {
        this.options.onWaterPointAdd?.(this.snapScreenPointToCellCenter(releasePoint));
      } else if (this.isArcanePointerMode) {
        this.spawnArcanePointer(this.snapScreenPointToCellCenter(releasePoint));
      } else {
        this.options.onElementSelect?.(this.hitTestElement(releasePoint));
      }
    }

    if (this.dragState.mode === "path-move" || this.dragState.mode === "path-point-move") {
      this.pathHoverZone = null;
      this.updateCursor();
    }

    this.dragState = null;
  };

  private updateCursor(): void {
    if (this.isGrabMode) {
      this.app.canvas.style.cursor = "grab";
    } else if (this.isPathDrawingMode || this.isWaterDrawingMode || this.isArcanePointerMode) {
      this.app.canvas.style.cursor = "crosshair";
    } else if (this.isFogRevealMode || this.isFirePaintMode) {
      this.app.canvas.style.cursor = "cell";
    } else if (this.pathHoverZone === "circle") {
      this.app.canvas.style.cursor = "grab";
    } else {
      this.app.canvas.style.cursor = "default";
    }
  }

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

  private snapScreenPointToCellCenter(screenPoint: ScreenPoint): WorldPoint {
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());

    if (this.grid === null) {
      return worldPoint;
    }

    return snapWorldPointToCellCenter(worldPoint, this.grid.cellSizeWorld);
  }

  private drawInteractiveElements(): void {
    this.drawShapesAndMeasurementsLayer();
    this.drawLightsLayer();
    this.drawEffectsLayer();
    this.drawMagicalDarknessLayer();
    this.drawSelectionLayer();
  }

  private drawShapesAndMeasurementsLayer(): void {
    const shapesLayer = this.getLayer("shapesAndMeasurements");
    clearContainerChildren(shapesLayer);

    for (const element of this.elements) {
      if (getLayerForElementKind(element.kind) === "shapes") {
        shapesLayer.addChild(drawElement(element));
      }
    }

    if (this.grid !== null && this.settings !== null) {
      for (const shape of this.shapes) {
        shapesLayer.addChild(drawTacticalShape(shape, this.grid, this.settings));
      }
    }
  }

  private drawLightsLayer(): void {
    const lightsLayer = this.getLayer("lights");
    clearContainerChildren(lightsLayer);

    for (const effect of this.effects.filter(isVisibleLightEmittingFireEffect)) {
      lightsLayer.addChild(drawFireLight(effect));
    }

    for (const light of this.lights) {
      if (light.visible) {
        lightsLayer.addChild(drawSceneLight(light));
      }
    }

    for (const element of this.elements) {
      if (getLayerForElementKind(element.kind) === "lights") {
        lightsLayer.addChild(drawElement(element));
      }
    }
  }

  private drawEffectsLayer(): void {
    const effectsLayer = this.getLayer("effects");
    const previousChildren = effectsLayer.removeChildren();
    const reusedContainers = new Set<Container>();
    const nextCache = new Map<
      string,
      {
        readonly signature: string;
        readonly container: Container;
      }
    >();

    for (const element of this.elements) {
      if (getLayerForElementKind(element.kind) === "effects") {
        effectsLayer.addChild(drawElement(element));
      }
    }

    for (const effect of this.effects) {
      if (effect.visible && effect.kind === "fire") {
        const rendered = this.getCachedEffectContainer(effect, getSceneEffectRenderSignature(effect, this.firePatternSource !== null));
        nextCache.set(effect.id, rendered);
        reusedContainers.add(rendered.container);
        effectsLayer.addChild(rendered.container);
      } else if (effect.visible && effect.kind === "water") {
        const rendered = this.getCachedEffectContainer(effect, getSceneEffectRenderSignature(effect, this.waterPatternSource !== null));
        nextCache.set(effect.id, rendered);
        reusedContainers.add(rendered.container);
        effectsLayer.addChild(rendered.container);
      }
    }

    for (const child of previousChildren) {
      if (child instanceof Container && reusedContainers.has(child)) {
        continue;
      }
      destroyDisplayObject(child);
    }

    for (const [id, cached] of this.effectRenderCache) {
      if (!nextCache.has(id) && !reusedContainers.has(cached.container)) {
        destroyDisplayObject(cached.container);
      }
    }

    this.effectRenderCache.clear();
    for (const [id, cached] of nextCache) {
      this.effectRenderCache.set(id, cached);
    }
  }

  private getCachedEffectContainer(
    effect: SceneFireEffect | SceneWaterEffect,
    signature: string
  ): {
    readonly signature: string;
    readonly container: Container;
  } {
    const cached = this.effectRenderCache.get(effect.id);

    if (cached !== undefined && cached.signature === signature) {
      return cached;
    }

    const container =
      effect.kind === "fire"
        ? drawSceneEffect(effect, this.firePatternSource)
        : drawWaterEffect(effect, this.waterPatternSource);

    return { signature, container };
  }

  private drawMagicalDarknessLayer(): void {
    const magicalDarknessLayer = this.getLayer("magicalDarkness");
    clearContainerChildren(magicalDarknessLayer);

    for (const effect of this.effects) {
      if (effect.visible && effect.kind === "magical-darkness") {
        magicalDarknessLayer.addChild(drawMagicalDarknessEffect(effect));
      }
    }
  }

  private drawSelectionLayer(): void {
    const selectionLayer = this.getLayer("selection");
    clearContainerChildren(selectionLayer);

    for (const effect of this.effects) {
      if (effect.visible && effect.kind === "fire" && effect.id !== this.selectedElementId) {
        selectionLayer.addChild(drawFireZoneHint(effect));
      }
    }

    if (this.isGridAdjustMode && this.grid !== null && this.grid.enabled) {
      selectionLayer.addChild(this.drawCalibrationHandle());
    }

    if (this.selectedElementId !== null) {
      const selectedElement = this.findSelectableElement(this.selectedElementId);

      if (selectedElement !== undefined) {
        selectionLayer.addChild(drawSelection(selectedElement));
      }

      const selectedLinearShape = this.shapes.find(
        (shape) =>
          shape.id === this.selectedElementId &&
          shape.type === "measurement"
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

      const selectedLight = this.lights.find((light) => light.id === this.selectedElementId);

      if (selectedLight !== undefined && selectedLight.visible) {
        selectionLayer.addChild(drawLightResizeHandle(selectedLight));
      }

      const selectedFireEffect = this.effects.find(
        (effect): effect is SceneFireEffect =>
          effect.id === this.selectedElementId && effect.kind === "fire"
      );

      if (selectedFireEffect !== undefined) {
        selectionLayer.addChild(drawFireResizeHandles(selectedFireEffect));
      }

      const selectedMagicalDarkness = this.effects.find(
        (effect): effect is SceneMagicalDarknessEffect =>
          effect.id === this.selectedElementId && effect.kind === "magical-darkness"
      );

      if (selectedMagicalDarkness !== undefined) {
        selectionLayer.addChild(drawMagicalDarknessResizeHandle(selectedMagicalDarkness));
      }

      const selectedWater = this.effects.find(
        (effect): effect is SceneWaterEffect => effect.id === this.selectedElementId && effect.kind === "water"
      );

      if (selectedWater !== undefined) {
        selectionLayer.addChild(drawWaterRotationHandles(selectedWater));
      }

      const selectedCircleShape = this.shapes.find(
        (s) => s.id === this.selectedElementId && s.type === "circle"
      );

      if (selectedCircleShape !== undefined) {
        selectionLayer.addChild(drawCircleResizeHandle(selectedCircleShape));
      }

      const selectedConeShape = this.shapes.find(
        (s) => s.id === this.selectedElementId && s.type === "cone"
      );

      if (selectedConeShape !== undefined) {
        selectionLayer.addChild(drawConeShapeHandles(selectedConeShape));
      }

      const selectedRectShape = this.shapes.find(
        (s) => s.id === this.selectedElementId && s.type === "rectangle"
      );

      if (selectedRectShape !== undefined) {
        selectionLayer.addChild(drawRectCornerHandles(selectedRectShape));
      }

      const selectedPathShape = this.shapes.find(
        (s) => s.id === this.selectedElementId && s.type === "path"
      );

      if (selectedPathShape !== undefined && this.grid !== null) {
        selectionLayer.addChild(drawPathPointHandles(selectedPathShape, this.grid.cellSizeWorld));
      }
    }

    if (this.isPathDrawingMode && this.grid !== null && this.settings !== null) {
      selectionLayer.addChild(
        drawPathPreview(
          this.pathPreviewPoints,
          this.pathPreviewHoverPoint,
          this.grid,
          this.settings
        )
      );
    }

    if (this.isWaterDrawingMode && this.grid !== null) {
      selectionLayer.addChild(
        drawWaterPreview(
          this.waterPreviewPoints,
          this.waterPreviewHoverPoint,
          this.grid.cellSizeWorld
        )
      );
    }
  }

  private async drawTokenLayer(): Promise<void> {
    const layer = this.getLayer("tokens");
    const loadVersion = ++this.tokenLoadVersion;
    clearContainerChildren(layer);

    const currentUrls = new Set(
      this.tokens
        .map((token) => token.imageUrl)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    );

    for (const url of this.loadedTokenUrls) {
      if (!currentUrls.has(url)) {
        void Assets.unload(url);
        this.loadedTokenUrls.delete(url);
      }
    }

    const visibleTokens = this.tokens.filter((token) => token.visible);
    const imageUrls = [
      ...new Set(
        visibleTokens
          .map((token) => token.imageUrl)
          .filter((url): url is string => url !== null)
      )
    ];
    const textures = new Map<string, Texture>();

    await Promise.all(
      imageUrls.map(async (url) => {
        try {
          textures.set(url, await Assets.load<Texture>(url));
          this.loadedTokenUrls.add(url);
        } catch {
          textures.delete(url);
        }
      })
    );

    if (this.disposed || loadVersion !== this.tokenLoadVersion) {
      return;
    }

    for (const token of visibleTokens) {
      if (!token.visible) {
        continue;
      }

      if (this.disposed || loadVersion !== this.tokenLoadVersion) {
        return;
      }

      const container = new Container();
      container.label = token.id;
      const footprintWorld = this.getTokenFootprintWorld(token);

      if (token.imageUrl !== null) {
        const texture = textures.get(token.imageUrl);
        if (texture !== undefined) {
          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          const textureMin = Math.max(Math.min(texture.width, texture.height), 1);
          const scale = footprintWorld / textureMin;
          sprite.width = texture.width * scale;
          sprite.height = texture.height * scale;
          sprite.position.set(token.position.x, token.position.y);
          const tokenMask = new Graphics()
            .circle(token.position.x, token.position.y, footprintWorld / 2)
            .fill({ color: 0xffffff, alpha: 1 });
          sprite.setMask({ mask: tokenMask });
          container.addChild(sprite);
          container.addChild(tokenMask);
        } else {
          container.addChild(drawTokenPlaceholder(token, footprintWorld));
        }
      } else {
        container.addChild(drawTokenPlaceholder(token, footprintWorld));
      }

      if (this.shouldShowTokenBadge(token)) {
        container.addChild(drawTokenBadge(token, footprintWorld));
      }

      layer.addChild(container);
    }
  }

  private drawFogOfWarLayer(): void {
    const layer = this.getLayer("fogOfWar");
    clearContainerChildren(layer);
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

    const activeStrokeReveal =
      this.fogRevealStrokePoints.length > 0
        ? [
            {
              id: "__active-fog-stroke",
              kind: "stroke" as const,
              points: this.fogRevealStrokePoints,
              radius: this.fogOfWar.revealRadius
            }
          ]
        : [];
    const reveals = [
      ...this.fogOfWar.revealedAreas,
      ...activeStrokeReveal,
      ...getVisibleAreasFromLights(this.lights)
    ];
    const circleFireReveals = this.effects
      .filter(
        (effect): effect is SceneFireEffect =>
          effect.kind === "fire" && effect.visible && effect.emitsLight && effect.zone.kind !== "cells"
      )
      .map((effect) => ({
        id: `vision-${effect.id}`,
        kind: "circle" as const,
        center: effect.position,
        radius: effect.lightRadius
      }));

    const cellFireEffects = this.effects.filter(
      (effect): effect is SceneFireEffect =>
        effect.kind === "fire" && effect.visible && effect.emitsLight && effect.zone.kind === "cells"
    );

    if (reveals.length > 0 || circleFireReveals.length > 0 || cellFireEffects.length > 0) {
      const eraseContainer = new Container();

      for (const area of [...reveals, ...circleFireReveals]) {
        const reveal = new Graphics();

        if (area.kind === "circle") {
          reveal.circle(area.center.x - bounds.left, area.center.y - bounds.top, area.radius);
        } else {
          for (const point of area.points) {
            reveal.circle(point.x - bounds.left, point.y - bounds.top, area.radius);
          }
        }

        reveal.fill({ color: 0xffffff, alpha: 1 });
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
    clearContainerChildren(layer);

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

  private startFogRevealStroke(screenPoint: ScreenPoint): void {
    this.fogRevealStrokePoints = [screenToWorld(screenPoint, this.camera, this.getViewportSize())];
    this.drawFogOfWarLayer();
  }

  private appendFogRevealStrokePoint(screenPoint: ScreenPoint): void {
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const previous = this.fogRevealStrokePoints[this.fogRevealStrokePoints.length - 1];

    if (previous === undefined) {
      this.fogRevealStrokePoints = [worldPoint];
      this.drawFogOfWarLayer();
      return;
    }

    const radius = this.fogOfWar?.revealRadius ?? 50;
    const minDistance = Math.max(8, radius * 0.35);

    if (Math.hypot(worldPoint.x - previous.x, worldPoint.y - previous.y) >= minDistance) {
      this.fogRevealStrokePoints = [...this.fogRevealStrokePoints, worldPoint];
      this.drawFogOfWarLayer();
    }
  }

  private finishFogRevealStroke(screenPoint: ScreenPoint): void {
    this.appendFogRevealStrokePoint(screenPoint);

    if (this.fogRevealStrokePoints.length > 0) {
      this.options.onFogRevealStroke?.(this.fogRevealStrokePoints);
    }

    this.fogRevealStrokePoints = [];
    this.drawFogOfWarLayer();
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
      if (element.kind === "path") {
        const path = this.shapes.find((shape) => shape.id === element.id && shape.type === "path");
        if (path !== undefined && hitTestPath(path, worldPoint, 14 / this.camera.zoom)) {
          return element.id;
        }
        continue;
      }

      if (element.kind === "water") {
        const water = this.effects.find(
          (effect): effect is SceneWaterEffect => effect.id === element.id && effect.kind === "water"
        );
        if (water !== undefined && hitTestWaterEffect(water, worldPoint, 18 / this.camera.zoom)) {
          return element.id;
        }
        continue;
      }

      const radius = element.hitRadius ?? getHitRadius(element.kind);
      const distance = Math.hypot(worldPoint.x - element.position.x, worldPoint.y - element.position.y);

      if (distance <= radius) {
        return element.id;
      }
    }

    return null;
  }

  private hitTestPathHandles(screenPoint: ScreenPoint): { elementId: string; zone: "point" | "circle" } | null {
    if (this.selectedElementId === null || this.grid === null) {
      return null;
    }

    const shape = this.shapes.find(
      (candidate) => candidate.id === this.selectedElementId && candidate.type === "path"
    );

    if (shape === undefined) {
      return null;
    }

    const firstPoint = shape.points[0];
    if (firstPoint === undefined) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const distance = Math.hypot(worldPoint.x - firstPoint.x, worldPoint.y - firstPoint.y);
    const pointTolerance = 18 / this.camera.zoom;
    const circleTolerance = Math.max(this.grid.cellSizeWorld / 2, 20 / this.camera.zoom);

    if (distance <= pointTolerance) {
      return { elementId: shape.id, zone: "point" };
    }

    if (distance <= circleTolerance) {
      return { elementId: shape.id, zone: "circle" };
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

  private hitTestLightResizeHandle(screenPoint: ScreenPoint): string | null {
    const light = this.getSelectedLight();

    if (light === null || !light.visible) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const handle = getLightResizeHandlePosition(light);

    return Math.hypot(worldPoint.x - handle.x, worldPoint.y - handle.y) <= 18
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

  private hitTestMagicalDarknessResizeHandle(screenPoint: ScreenPoint): string | null {
    const selectedMagicalDarkness = this.getSelectedMagicalDarknessEffect();

    if (selectedMagicalDarkness === null) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const distance = Math.hypot(
      worldPoint.x - selectedMagicalDarkness.position.x,
      worldPoint.y - selectedMagicalDarkness.position.y
    );

    return distance >= selectedMagicalDarkness.radius - 16 &&
      distance <= selectedMagicalDarkness.radius + 18
      ? selectedMagicalDarkness.id
      : null;
  }

  private getSelectedFireEffect(): SceneFireEffect | null {
    if (this.selectedElementId === null) {
      return null;
    }

    return (
      this.effects.find(
        (effect): effect is SceneFireEffect =>
          effect.id === this.selectedElementId && effect.kind === "fire"
      ) ?? null
    );
  }

  private getSelectedMagicalDarknessEffect(): SceneMagicalDarknessEffect | null {
    if (this.selectedElementId === null) {
      return null;
    }

    return (
      this.effects.find(
        (effect): effect is SceneMagicalDarknessEffect =>
          effect.id === this.selectedElementId && effect.kind === "magical-darkness"
      ) ?? null
    );
  }

  private getSelectedLight(): SceneLight | null {
    if (this.selectedElementId === null) {
      return null;
    }

    return this.lights.find((light) => light.id === this.selectedElementId) ?? null;
  }

  private getTokenFootprintWorld(token: RenderSceneToken): number {
    return token.footprintCells * (this.grid?.cellSizeWorld ?? 100);
  }

  private shouldShowTokenBadge(token: RenderSceneToken): boolean {
    return this.tokens.filter((candidate) => normalizeTokenName(candidate.name) === normalizeTokenName(token.name)).length > 1;
  }

  private getSelectedLinearShape(): SceneShape | null {
    if (this.selectedElementId === null) {
      return null;
    }

    return (
      this.shapes.find(
        (shape) =>
          shape.id === this.selectedElementId &&
          shape.type === "measurement"
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

  private updateLightRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const light = this.lights.find((candidate) => candidate.id === elementId);

    if (light === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = Math.hypot(worldPoint.x - light.position.x, worldPoint.y - light.position.y);
    this.options.onLightRadiusChange?.(elementId, Math.max(10, radius));
  }

  private updateLinearShapeEndFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    this.options.onShapeEndMove?.(elementId, worldPoint.x, worldPoint.y);
  }

  private updatePathPointFromScreenPoint(elementId: string, pointIndex: number, screenPoint: ScreenPoint): void {
    const worldPoint = this.snapScreenPointToCellCenter(screenPoint);
    this.options.onPathPointMove?.(elementId, pointIndex, worldPoint.x, worldPoint.y);
  }

  private updateLinearShapeDirectionFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const shape = this.shapes.find(
      (candidate) =>
        candidate.id === elementId && candidate.type === "measurement"
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
    const effect = this.effects.find(
      (candidate): candidate is SceneFireEffect =>
        candidate.id === elementId && candidate.kind === "fire"
    );

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const visualRadius = Math.hypot(worldPoint.x - effect.position.x, worldPoint.y - effect.position.y);
    this.options.onFireZoneRadiusChange?.(elementId, Math.max(1, visualRadius / effect.scale));
  }

  private updateFireLightRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const effect = this.effects.find(
      (candidate): candidate is SceneFireEffect =>
        candidate.id === elementId && candidate.kind === "fire"
    );

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = Math.hypot(worldPoint.x - effect.position.x, worldPoint.y - effect.position.y);
    this.options.onFireLightRadiusChange?.(elementId, Math.max(1, radius));
  }

  private updateMagicalDarknessRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const effect = this.effects.find(
      (candidate): candidate is SceneMagicalDarknessEffect =>
        candidate.id === elementId && candidate.kind === "magical-darkness"
    );

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = Math.hypot(worldPoint.x - effect.position.x, worldPoint.y - effect.position.y);
    this.options.onMagicalDarknessRadiusChange?.(elementId, Math.max(1, radius));
  }

  private updateWaterPatternRotationFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const effect = this.effects.find(
      (candidate): candidate is SceneWaterEffect => candidate.id === elementId && candidate.kind === "water"
    );

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const rotation =
      (Math.atan2(worldPoint.y - effect.position.y, worldPoint.x - effect.position.x) * 180) / Math.PI;
    this.options.onWaterPatternRotationChange?.(elementId, rotation);
  }

  private updateWaterLineRotationFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const effect = this.effects.find(
      (candidate): candidate is SceneWaterEffect => candidate.id === elementId && candidate.kind === "water"
    );

    if (effect === undefined) {
      return;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const rotation =
      (Math.atan2(worldPoint.y - effect.position.y, worldPoint.x - effect.position.x) * 180) / Math.PI;
    this.options.onWaterLineRotationChange?.(elementId, rotation);
  }

  private hitTestWaterLineRotationHandle(screenPoint: ScreenPoint): string | null {
    if (this.selectedElementId === null) {
      return null;
    }

    const effect = this.effects.find(
      (candidate): candidate is SceneWaterEffect =>
        candidate.id === this.selectedElementId && candidate.kind === "water"
    );

    if (effect === undefined) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const handle = getWaterLineRotationHandlePosition(effect);

    return Math.hypot(worldPoint.x - handle.x, worldPoint.y - handle.y) <= 18
      ? effect.id
      : null;
  }

  private hitTestWaterPatternRotationHandle(screenPoint: ScreenPoint): string | null {
    if (this.selectedElementId === null) {
      return null;
    }

    const effect = this.effects.find(
      (candidate): candidate is SceneWaterEffect =>
        candidate.id === this.selectedElementId && candidate.kind === "water"
    );

    if (effect === undefined) {
      return null;
    }

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const handle = getWaterPatternRotationHandlePosition(effect);

    return Math.hypot(worldPoint.x - handle.x, worldPoint.y - handle.y) <= 18
      ? effect.id
      : null;
  }

  private hitTestCircleResizeHandle(screenPoint: ScreenPoint): string | null {
    const shape = this.shapes.find(
      (s) => s.id === this.selectedElementId && s.type === "circle"
    );

    if (shape === undefined) return null;

    const anchor = shape.points[0];
    if (anchor === undefined) return null;

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = shape.radius ?? 1;
    const distance = Math.hypot(worldPoint.x - anchor.x, worldPoint.y - anchor.y);

    return distance >= radius - 16 && distance <= radius + 18 ? shape.id : null;
  }

  private hitTestConeShapeResizeHandle(screenPoint: ScreenPoint): string | null {
    const shape = this.shapes.find(
      (s) => s.id === this.selectedElementId && s.type === "cone"
    );

    if (shape === undefined) return null;

    const anchor = shape.points[0];
    if (anchor === undefined) return null;

    const radius = shape.radius ?? 1;
    const direction = ((shape.direction ?? 0) * Math.PI) / 180;
    const tipX = anchor.x + Math.cos(direction) * radius;
    const tipY = anchor.y + Math.sin(direction) * radius;
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());

    return Math.hypot(worldPoint.x - tipX, worldPoint.y - tipY) <= 18 ? shape.id : null;
  }

  private hitTestConeShapeRotationHandle(screenPoint: ScreenPoint): string | null {
    const shape = this.shapes.find(
      (s) => s.id === this.selectedElementId && s.type === "cone"
    );

    if (shape === undefined) return null;

    const anchor = shape.points[0];
    if (anchor === undefined) return null;

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const distance = Math.hypot(worldPoint.x - anchor.x, worldPoint.y - anchor.y);

    return distance >= SHAPE_CONE_ROTATION_RING_RADIUS - 16 &&
      distance <= SHAPE_CONE_ROTATION_RING_RADIUS + 18
      ? shape.id
      : null;
  }

  private hitTestRectCornerHandle(screenPoint: ScreenPoint): number | null {
    const shape = this.shapes.find(
      (s) => s.id === this.selectedElementId && s.type === "rectangle"
    );

    if (shape === undefined) return null;

    const anchor = shape.points[0];
    if (anchor === undefined) return null;

    const halfW = (shape.width ?? 1) / 2;
    const halfH = (shape.height ?? 1) / 2;
    const corners = [
      { x: anchor.x - halfW, y: anchor.y - halfH },
      { x: anchor.x + halfW, y: anchor.y - halfH },
      { x: anchor.x + halfW, y: anchor.y + halfH },
      { x: anchor.x - halfW, y: anchor.y + halfH }
    ];
    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());

    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      if (corner !== undefined && Math.hypot(worldPoint.x - corner.x, worldPoint.y - corner.y) <= 16) {
        return i;
      }
    }

    return null;
  }

  private updateShapeCircleRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const shape = this.shapes.find((s) => s.id === elementId && s.type === "circle");
    if (shape === undefined) return;

    const anchor = shape.points[0];
    if (anchor === undefined) return;

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = Math.hypot(worldPoint.x - anchor.x, worldPoint.y - anchor.y);
    this.options.onShapeRadiusChange?.(elementId, Math.max(10, radius));
  }

  private updateShapeConeRadiusFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const shape = this.shapes.find((s) => s.id === elementId && s.type === "cone");
    if (shape === undefined) return;

    const anchor = shape.points[0];
    if (anchor === undefined) return;

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const radius = Math.hypot(worldPoint.x - anchor.x, worldPoint.y - anchor.y);
    this.options.onShapeRadiusChange?.(elementId, Math.max(10, radius));
  }

  private updateShapeConeDirectionFromScreenPoint(elementId: string, screenPoint: ScreenPoint): void {
    const shape = this.shapes.find((s) => s.id === elementId && s.type === "cone");
    if (shape === undefined) return;

    const anchor = shape.points[0];
    if (anchor === undefined) return;

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const direction =
      (Math.atan2(worldPoint.y - anchor.y, worldPoint.x - anchor.x) * 180) / Math.PI;
    this.options.onShapeDirectionChange?.(elementId, direction);
  }

  private updateShapeRectCornerFromScreenPoint(
    elementId: string,
    cornerIndex: number,
    screenPoint: ScreenPoint
  ): void {
    const shape = this.shapes.find((s) => s.id === elementId && s.type === "rectangle");
    if (shape === undefined) return;

    const anchor = shape.points[0];
    if (anchor === undefined) return;

    const halfW = (shape.width ?? 1) / 2;
    const halfH = (shape.height ?? 1) / 2;
    const corners = [
      { x: anchor.x - halfW, y: anchor.y - halfH },
      { x: anchor.x + halfW, y: anchor.y - halfH },
      { x: anchor.x + halfW, y: anchor.y + halfH },
      { x: anchor.x - halfW, y: anchor.y + halfH }
    ];
    const fixed = corners[(cornerIndex + 2) % 4];
    if (fixed === undefined) return;

    const worldPoint = screenToWorld(screenPoint, this.camera, this.getViewportSize());
    const newWidth = Math.max(10, Math.abs(worldPoint.x - fixed.x));
    const newHeight = Math.max(10, Math.abs(worldPoint.y - fixed.y));
    const anchorX = (worldPoint.x + fixed.x) / 2;
    const anchorY = (worldPoint.y + fixed.y) / 2;
    this.options.onShapeRectResize?.(elementId, newWidth, newHeight, anchorX, anchorY);
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
        kind: effect.kind === "fire" ? "fire" as const : effect.kind === "magical-darkness" ? "magical-darkness" as const : "water" as const,
        position: effect.position,
        hitRadius: effect.kind === "magical-darkness" ? effect.radius : undefined
      })),
      ...this.tokens
        .filter((token) => token.visible)
        .map((token) => ({
          id: token.id,
          kind: "token" as const,
          position: token.position,
          hitRadius: this.getTokenFootprintWorld(token) / 2,
          selectionColor: token.selectionColor
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

  private spawnArcanePointer(position: WorldPoint): void {
    const layer = this.getLayer("pointer");
    const cellSize = this.grid?.cellSizeWorld ?? 100;
    const diameter = getArcanePointerDiameterWorld(this.arcanePointerCreatureSize, cellSize);
    const container = new Container();
    container.position.set(position.x, position.y);
    container.alpha = 0;

    if (this.arcanePointerSource !== null) {
      const sprite = new GifSprite({
        source: this.arcanePointerSource,
        autoPlay: true,
        loop: true,
        animationSpeed: 1
      });
      sprite.anchor.set(0.5);
      sprite.width = diameter;
      sprite.height = diameter;
      container.addChild(sprite);
    } else {
      container.addChild(drawArcanePointerFallback(diameter));
    }

    layer.addChild(container);
    this.arcanePointers.set(`arcane-pointer-${this.nextArcanePointerId}`, {
      container,
      startedAt: performance.now(),
      durationMs: 4000
    });
    this.nextArcanePointerId += 1;
  }

  private readonly updateArcanePointers = (): void => {
    if (this.arcanePointers.size === 0) {
      return;
    }

    const now = performance.now();

    for (const [id, pointer] of this.arcanePointers) {
      const progress = (now - pointer.startedAt) / pointer.durationMs;

      if (progress >= 1) {
        destroyDisplayObject(pointer.container);
        this.arcanePointers.delete(id);
        continue;
      }

      pointer.container.alpha = getArcanePointerAlpha(progress);
    }
  };

  private async drawMapImage(): Promise<void> {
    const layer = this.getLayer("map");
    const loadVersion = ++this.mapLoadVersion;
    if (this.colorMapSprite !== null) {
      this.colorMapSprite.mask = null;
    }
    this.darkvisionMask?.destroy();
    clearContainerChildren(layer);
    this.mapSprite = null;
    this.colorMapSprite = null;
    this.darkvisionMask = null;

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
      const colorSprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(this.map.position.x, this.map.position.y);
      sprite.scale.set(this.map.scale);
      colorSprite.anchor.set(0.5);
      colorSprite.position.set(this.map.position.x, this.map.position.y);
      colorSprite.scale.set(this.map.scale);
      colorSprite.visible = false;
      this.mapSprite = sprite;
      this.colorMapSprite = colorSprite;
      this.updateBaseMapVisibility();
      layer.addChild(sprite);
      layer.addChild(colorSprite);
      this.drawDarkvisionLayer();
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
  readonly kind: TacticalElement["kind"] | SceneShape["type"] | "magical-darkness" | "token" | "water";
  readonly position: { readonly x: number; readonly y: number };
  readonly hitRadius?: number;
  readonly selectionColor?: string;
}
const CONE_ROTATION_RING_RADIUS = 72;
const LINEAR_ROTATION_RING_RADIUS = 54;
const SHAPE_CONE_ROTATION_RING_RADIUS = 72;
const FIRE_PATTERN_URL = "/effects/area-fire.gif";
const WATER_PATTERN_URL = "/effects/water/water-center.gif";
const ARCANE_POINTER_URL = "/effects/arcane-pointer.gif";
const WATER_BODY_TILE_SIZE = 72;
const WATER_BODY_MAX_TILE_SIZE = 150;
const WATER_RIVER_MIN_TILE_SIZE = 44;
const WATER_RIVER_MAX_TILE_SIZE = 96;
const WATER_RIVER_PERFORMANCE_TILE_SIZE = 180;
const MAX_WATER_PATTERN_SPRITES_PER_EFFECT = 360;
const FIRE_PATTERN_ALPHA_MULTIPLIER = 0.65;
const MAX_EMOJIS_PER_ELEMENT = 120;
const waterFilterCache = new Map<string, ColorMatrixFilter>();

function clearContainerChildren(container: Container): void {
  const children = container.removeChildren();

  for (const child of children) {
    destroyDisplayObject(child);
  }
}

function destroyDisplayObject(child: Container): void {
  if (child instanceof Container) {
    clearContainerChildren(child);
  }
  child.destroy();
}

function getSceneEffectRenderSignature(effect: SceneFireEffect | SceneWaterEffect, hasPatternSource: boolean): string {
  return `${hasPatternSource ? "pattern" : "fallback"}:${JSON.stringify(effect)}`;
}

function parseHexColor(color: string): number {
  return Number.parseInt(color.replace("#", ""), 16);
}

function isVisibleLightEmittingFireEffect(effect: SceneEffect): effect is SceneFireEffect {
  return effect.kind === "fire" && effect.visible && effect.emitsLight;
}

async function loadFirePatternSource(): Promise<GifSource | null> {
  try {
    return await Assets.load<GifSource>(FIRE_PATTERN_URL);
  } catch {
    return null;
  }
}

async function loadWaterPatternSource(): Promise<GifSource | null> {
  try {
    return await Assets.load<GifSource>(WATER_PATTERN_URL);
  } catch {
    return null;
  }
}

async function loadArcanePointerSource(): Promise<GifSource | null> {
  try {
    return await Assets.load<GifSource>(ARCANE_POINTER_URL);
  } catch {
    return null;
  }
}

function drawArcanePointerFallback(diameter: number): Graphics {
  const radius = diameter / 2;
  return new Graphics()
    .circle(0, 0, radius)
    .stroke({ color: 0x8ee7ff, width: Math.max(2, diameter * 0.035), alpha: 0.9 })
    .circle(0, 0, radius * 0.72)
    .stroke({ color: 0xffd28a, width: Math.max(1, diameter * 0.018), alpha: 0.85 })
    .circle(0, 0, radius * 0.38)
    .stroke({ color: 0xf4f1e8, width: Math.max(1, diameter * 0.012), alpha: 0.7 });
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

function worldLengthLabel(worldUnits: number, grid: SceneGrid): string {
  const cells = worldUnits / grid.cellSizeWorld;
  const value = grid.unit === "ft"
    ? cells * grid.distancePerCell
    : cells * grid.metricDistancePerCell;
  return formatDistance(value, grid.unit);
}

function drawTacticalShape(shape: SceneShape, grid: SceneGrid, settings: SceneSettings): Container {
  const container = new Container();
  const graphic = new Graphics();
  const anchor = getShapeAnchor(shape);
  const endPoint = getShapeEndPoint(shape);
  const emojis = getSelectedShapeEmojis(shape.emoji);

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
        if (emojis.length > 0) {
          addEmojiTexts(
            container,
            emojis,
            getLineEmojiPoints(shape.id, anchor, endPoint, grid.cellSizeWorld),
            grid.cellSizeWorld
          );
        }
      }
      break;
    case "path": {
      drawPathGraphic(graphic, shape.points, 0xfff0a8, 0.94, 5);
      const distance = measurePathDistance(shape.points, {
        grid,
        diagonalMode: settings.diagonalMode
      });
      const lastPoint = shape.points[shape.points.length - 1];
      if (lastPoint !== undefined) {
        const label = drawShapeLabel(distance.label);
        label.position.set(lastPoint.x + 12, lastPoint.y - 30);
        container.addChild(label);
      }
      break;
    }
    case "circle": {
      const radius = shape.radius ?? grid.cellSizeWorld;
      graphic
        .circle(anchor.x, anchor.y, radius)
        .fill({ color: 0x3d8dff, alpha: 0.18 })
        .stroke({ color: 0x7fb8ff, width: 4, alpha: 0.92 });
      const label = drawShapeLabel(worldLengthLabel(radius, grid));
      label.position.set(anchor.x + 10, anchor.y - radius - 28);
      container.addChild(label);
      if (emojis.length > 0) {
        addEmojiTexts(
          container,
          emojis,
          getCircleEmojiPoints(shape.id, anchor, radius, grid.cellSizeWorld),
          grid.cellSizeWorld
        );
      }
      break;
    }
    case "cone": {
      const radius = shape.radius ?? grid.cellSizeWorld * 3;
      const angle = shape.angle ?? 60;
      const direction = shape.direction ?? 0;
      drawConeShape(graphic, anchor.x, anchor.y, radius, angle, direction)
        .fill({ color: 0x60c8a6, alpha: 0.2 })
        .stroke({ color: 0x79e1bf, width: 4, alpha: 0.9 });
      const radians = (direction * Math.PI) / 180;
      const tipX = anchor.x + Math.cos(radians) * radius;
      const tipY = anchor.y + Math.sin(radians) * radius;
      const label = drawShapeLabel(`${Math.round(angle)}° · ${worldLengthLabel(radius, grid)}`);
      label.position.set(tipX + 12, tipY - 10);
      container.addChild(label);
      if (emojis.length > 0) {
        addEmojiTexts(
          container,
          emojis,
          getConeEmojiPoints(shape.id, anchor, radius, angle, direction, grid.cellSizeWorld),
          grid.cellSizeWorld
        );
      }
      break;
    }
    case "rectangle": {
      const width = shape.width ?? grid.cellSizeWorld;
      const height = shape.height ?? grid.cellSizeWorld;
      graphic
        .roundRect(anchor.x - width / 2, anchor.y - height / 2, width, height, 8)
        .fill({ color: 0xd7a34f, alpha: 0.2 })
        .stroke({ color: 0xffd28a, width: 4, alpha: 0.9 });
      const label = drawShapeLabel(`${worldLengthLabel(width, grid)} × ${worldLengthLabel(height, grid)}`);
      label.position.set(anchor.x + 10, anchor.y + height / 2 + 10);
      container.addChild(label);
      if (emojis.length > 0) {
        addEmojiTexts(
          container,
          emojis,
          getRectangleEmojiPoints(shape.id, anchor, width, height, grid.cellSizeWorld),
          grid.cellSizeWorld
        );
      }
      break;
    }
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

function drawPathGraphic(
  graphic: Graphics,
  points: readonly WorldPoint[],
  color: number,
  alpha: number,
  width: number
): Graphics {
  const [firstPoint, ...rest] = points;

  if (firstPoint === undefined) {
    return graphic;
  }

  graphic.moveTo(firstPoint.x, firstPoint.y);

  for (const point of rest) {
    graphic.lineTo(point.x, point.y);
  }

  graphic.stroke({ color, width, alpha });

  for (const point of points) {
    graphic
      .circle(point.x, point.y, 8)
      .fill({ color: 0x101315, alpha: 0.9 })
      .circle(point.x, point.y, 5)
      .fill({ color, alpha });
  }

  return graphic;
}

function drawPathPreview(
  points: readonly WorldPoint[],
  hoverPoint: WorldPoint | null,
  grid: SceneGrid,
  settings: SceneSettings
): Container {
  const container = new Container();
  const graphic = new Graphics();
  const previewPoints = getPathPreviewPoints(points, hoverPoint);

  drawPathGraphic(graphic, previewPoints, 0xfff0a8, 0.9, 4);
  container.addChild(graphic);

  if (previewPoints.length >= 2) {
    const distance = measurePathDistance(previewPoints, {
      grid,
      diagonalMode: settings.diagonalMode
    });
    const label = drawShapeLabel(distance.label);
    const lastPoint = previewPoints[previewPoints.length - 1];

    if (lastPoint !== undefined) {
      label.position.set(lastPoint.x + 12, lastPoint.y - 30);
      container.addChild(label);
    }
  }

  return container;
}

function getPathPreviewPoints(
  points: readonly WorldPoint[],
  hoverPoint: WorldPoint | null
): readonly WorldPoint[] {
  if (hoverPoint === null) {
    return points;
  }

  const lastPoint = points[points.length - 1];

  if (lastPoint !== undefined && lastPoint.x === hoverPoint.x && lastPoint.y === hoverPoint.y) {
    return points;
  }

  return [...points, hoverPoint];
}

function drawEmojiText(emoji: string, x: number, y: number, cellSizeWorld: number): Text {
  const text = new Text({
    text: emoji,
    style: {
      fill: 0xffffff,
      fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
      fontSize: Math.max(18, Math.min(46, cellSizeWorld * 0.46)),
      stroke: { color: 0x101315, width: 3 }
    }
  });
  text.anchor.set(0.5);
  text.alpha = 0.88;
  text.position.set(x, y);
  return text;
}

function addEmojiTexts(
  container: Container,
  emojis: readonly string[],
  points: readonly { readonly x: number; readonly y: number }[],
  cellSizeWorld: number
): void {
  const visiblePoints = points.slice(0, MAX_EMOJIS_PER_ELEMENT);

  for (let index = 0; index < visiblePoints.length; index += 1) {
    const point = visiblePoints[index];
    const emoji = emojis[index % emojis.length];
    if (point === undefined || emoji === undefined) continue;
    container.addChild(drawEmojiText(emoji, point.x, point.y, cellSizeWorld));
  }
}

function getLineEmojiPoints(
  seed: string,
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
  cellSizeWorld: number
): Array<{ x: number; y: number }> {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const count = Math.max(1, Math.ceil(length / cellSizeWorld));
  const points: Array<{ x: number; y: number }> = [];
  const normalX = length > 0 ? -(end.y - start.y) / length : 0;
  const normalY = length > 0 ? (end.x - start.x) / length : 0;

  for (let index = 0; index < count; index += 1) {
    const t = (index + 1) / (count + 1);
    const offset = stableJitter(seed, index, cellSizeWorld * 0.08);
    points.push({
      x: start.x + (end.x - start.x) * t + normalX * offset,
      y: start.y + (end.y - start.y) * t + normalY * offset
    });
  }

  return points;
}

function getCircleEmojiPoints(
  seed: string,
  center: { readonly x: number; readonly y: number },
  radius: number,
  cellSizeWorld: number,
  innerRadius = 0
): Array<{ x: number; y: number }> {
  const step = getEmojiStep(cellSizeWorld);
  const points: Array<{ x: number; y: number }> = [];
  let index = 0;

  for (let y = center.y - radius + step / 2; y <= center.y + radius; y += step) {
    for (let x = center.x - radius + step / 2; x <= center.x + radius; x += step) {
      const px = x + stableJitter(`${seed}:x`, index, step * 0.22);
      const py = y + stableJitter(`${seed}:y`, index, step * 0.22);
      const distance = Math.hypot(px - center.x, py - center.y);

      if (distance <= radius * 0.92 && distance >= innerRadius * 1.08) {
        points.push({ x: px, y: py });
      }

      index += 1;
    }
  }

  if (points.length === 0 && radius > 8 && innerRadius <= 0) {
    points.push({ x: center.x, y: center.y });
  }

  return points;
}

function getConeEmojiPoints(
  seed: string,
  origin: { readonly x: number; readonly y: number },
  radius: number,
  angleDegrees: number,
  directionDegrees: number,
  cellSizeWorld: number
): Array<{ x: number; y: number }> {
  const step = getEmojiStep(cellSizeWorld);
  const points: Array<{ x: number; y: number }> = [];
  let index = 0;

  for (let y = origin.y - radius + step / 2; y <= origin.y + radius; y += step) {
    for (let x = origin.x - radius + step / 2; x <= origin.x + radius; x += step) {
      const px = x + stableJitter(`${seed}:x`, index, step * 0.22);
      const py = y + stableJitter(`${seed}:y`, index, step * 0.22);

      if (isPointInCone(px, py, origin, radius * 0.92, angleDegrees, directionDegrees)) {
        points.push({ x: px, y: py });
      }

      index += 1;
    }
  }

  if (points.length === 0 && radius > 8) {
    const direction = (directionDegrees * Math.PI) / 180;
    points.push({
      x: origin.x + Math.cos(direction) * radius * 0.45,
      y: origin.y + Math.sin(direction) * radius * 0.45
    });
  }

  return points;
}

function getRectangleEmojiPoints(
  seed: string,
  center: { readonly x: number; readonly y: number },
  width: number,
  height: number,
  cellSizeWorld: number
): Array<{ x: number; y: number }> {
  const step = getEmojiStep(cellSizeWorld);
  const points: Array<{ x: number; y: number }> = [];
  const left = center.x - width / 2;
  const right = center.x + width / 2;
  const top = center.y - height / 2;
  const bottom = center.y + height / 2;
  let index = 0;

  for (let y = top + step / 2; y <= bottom; y += step) {
    for (let x = left + step / 2; x <= right; x += step) {
      const px = x + stableJitter(`${seed}:x`, index, step * 0.2);
      const py = y + stableJitter(`${seed}:y`, index, step * 0.2);

      if (px >= left + step * 0.12 && px <= right - step * 0.12 && py >= top + step * 0.12 && py <= bottom - step * 0.12) {
        points.push({ x: px, y: py });
      }

      index += 1;
    }
  }

  if (points.length === 0 && width > 8 && height > 8) {
    points.push({ x: center.x, y: center.y });
  }

  return points;
}

function isPointInCone(
  x: number,
  y: number,
  origin: { readonly x: number; readonly y: number },
  radius: number,
  angleDegrees: number,
  directionDegrees: number
): boolean {
  const dx = x - origin.x;
  const dy = y - origin.y;
  const distance = Math.hypot(dx, dy);

  if (distance > radius || distance < 4) {
    return false;
  }

  const pointAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const diff = Math.abs(normalizeAngleDifference(pointAngle - directionDegrees));
  return diff <= angleDegrees / 2;
}

function normalizeAngleDifference(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function getEmojiStep(cellSizeWorld: number): number {
  return Math.max(24, cellSizeWorld * 0.9);
}

function stableJitter(seed: string, index: number, spread: number): number {
  const value = hashString(`${seed}:${index}`);
  return ((value % 1000) / 999 - 0.5) * 2 * spread;
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeTokenName(name: string): string {
  return name.trim().toLocaleLowerCase();
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
  effect: SceneFireEffect,
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

function buildDarkvisionColorMask(
  lights: readonly SceneLight[],
  effects: readonly SceneEffect[]
): Graphics | null {
  const graphic = new Graphics();
  let hasMaskGeometry = false;

  for (const light of lights) {
    if (!light.visible) {
      continue;
    }

    if (light.kind === "point") {
      graphic
        .circle(light.position.x, light.position.y, light.radius)
        .fill({ color: 0xffffff, alpha: 1 });
    } else {
      drawConeShape(
        graphic,
        light.position.x,
        light.position.y,
        light.radius,
        getLightRenderAngle(light),
        light.direction
      ).fill({ color: 0xffffff, alpha: 1 });
    }

    hasMaskGeometry = true;
  }

  for (const effect of effects) {
    if (!isVisibleLightEmittingFireEffect(effect)) {
      continue;
    }

    if (effect.zone.kind === "cells") {
      const { bright, dim } = computeCellRings(effect.zone.cells);

      for (const cell of [...effect.zone.cells, ...bright, ...dim]) {
        graphic
          .rect(cell.x, cell.y, cell.size, cell.size)
          .fill({ color: 0xffffff, alpha: 1 });
      }
    } else {
      graphic
        .circle(effect.position.x, effect.position.y, effect.lightRadius)
        .fill({ color: 0xffffff, alpha: 1 });
    }

    hasMaskGeometry = true;
  }

  if (!hasMaskGeometry) {
    graphic.destroy();
    return null;
  }

  return graphic;
}

function drawWaterEffect(effect: SceneWaterEffect, waterPatternSource: GifSource | null): Container {
  const container = new Container();
  container.label = effect.id;

  if (waterPatternSource !== null) {
    const mask = drawWaterMask(effect);
    addMaskedWaterPatternSprite(container, effect, waterPatternSource, mask);
  } else {
    container.addChild(drawWaterFallback(effect));
  }

  container.addChild(drawWaterCoast(effect));
  return container;
}

function drawWaterPreview(
  points: readonly WorldPoint[],
  hoverPoint: WorldPoint | null,
  cellSizeWorld: number
): Graphics {
  const graphic = new Graphics();
  const previewPoints =
    hoverPoint === null || points.some((point) => point.x === hoverPoint.x && point.y === hoverPoint.y)
      ? points
      : [...points, hoverPoint];
  const first = previewPoints[0];

  if (first === undefined) {
    return graphic;
  }

  drawPolyline(graphic, previewPoints);

  if (previewPoints.length > 1) {
    graphic.stroke({ color: 0x7adcf0, width: 5, alpha: 0.85 });
  }

  graphic.circle(first.x, first.y, 7).fill({ color: 0x7adcf0, alpha: 0.95 });

  for (const point of previewPoints.slice(1)) {
    graphic.circle(point.x, point.y, 5).fill({ color: 0xc7f7ff, alpha: 0.9 });
  }

  const last = previewPoints[previewPoints.length - 1];
  if (
    last !== undefined &&
    previewPoints.length >= 3 &&
    Math.hypot(last.x - first.x, last.y - first.y) <= Math.max(12, cellSizeWorld * 0.5)
  ) {
    graphic.circle(first.x, first.y, Math.max(12, cellSizeWorld * 0.18)).stroke({
      color: 0xc7f7ff,
      width: 3,
      alpha: 0.8
    });
  }

  return graphic;
}

function drawWaterMask(effect: SceneWaterEffect): Graphics {
  const mask = new Graphics();

  if (effect.variant === "river") {
    drawPolyline(mask, effect.points);
    return mask.stroke({ color: 0xffffff, width: effect.width, alpha: 1, cap: "round", join: "round" });
  }

  drawPolygon(mask, effect.points);
  return mask.fill({ color: 0xffffff, alpha: 1 });
}

function drawWaterFallback(effect: SceneWaterEffect): Graphics {
  const graphic = new Graphics();

  if (effect.variant === "river") {
    drawPolyline(graphic, effect.points);
    return graphic.stroke({ color: 0x1ba7d8, width: effect.width, alpha: effect.opacity, cap: "round", join: "round" });
  }

  drawPolygon(graphic, effect.points);
  return graphic.fill({ color: 0x1ba7d8, alpha: effect.opacity });
}

function drawWaterCoast(effect: SceneWaterEffect): Graphics {
  const graphic = new Graphics();

  if (effect.variant === "river") {
    drawPolyline(graphic, effect.points);
    graphic.stroke({ color: 0x8b6b42, width: effect.width + 10, alpha: 0.58 * effect.opacity, cap: "round", join: "round" });
    drawPolyline(graphic, effect.points);
    graphic.stroke({ color: 0xd2edf2, width: effect.width + 4, alpha: 0.3 * effect.opacity, cap: "round", join: "round" });
    return graphic;
  }

  drawPolygon(graphic, effect.points);
  graphic.stroke({ color: 0x8b6b42, width: 12, alpha: 0.72 * effect.opacity, join: "round" });
  drawPolygon(graphic, effect.points);
  graphic.stroke({ color: 0xd2edf2, width: 4, alpha: 0.48 * effect.opacity, join: "round" });
  return graphic;
}

function addMaskedWaterPatternSprite(
  container: Container,
  effect: SceneWaterEffect,
  waterPatternSource: GifSource,
  mask: Graphics
): void {
  if (effect.variant === "river") {
    addRiverWaterPatternSprites(container, effect, waterPatternSource, mask);
    return;
  }

  addWaterBodyPatternSprites(container, effect, waterPatternSource, mask);
}

function addWaterBodyPatternSprites(
  container: Container,
  effect: Extract<SceneWaterEffect, { readonly variant: "water-body" }>,
  waterPatternSource: GifSource,
  mask: Graphics
): void {
  const bounds = getWaterBounds(effect);
  const patternContainer = new Container();
  const estimatedColumns = Math.max(1, Math.ceil((bounds.right - bounds.left + WATER_BODY_TILE_SIZE * 2) / WATER_BODY_TILE_SIZE));
  const estimatedRows = Math.max(1, Math.ceil((bounds.bottom - bounds.top + WATER_BODY_TILE_SIZE * 2) / WATER_BODY_TILE_SIZE));
  const estimatedSprites = estimatedColumns * estimatedRows;
  const tileSize =
    estimatedSprites > MAX_WATER_PATTERN_SPRITES_PER_EFFECT
      ? Math.min(
          WATER_BODY_MAX_TILE_SIZE,
          WATER_BODY_TILE_SIZE * Math.sqrt(estimatedSprites / MAX_WATER_PATTERN_SPRITES_PER_EFFECT)
        )
      : WATER_BODY_TILE_SIZE;
  const step = tileSize;

  for (let y = bounds.top - tileSize; y <= bounds.bottom + tileSize; y += step) {
    for (let x = bounds.left - tileSize; x <= bounds.right + tileSize; x += step) {
      const sprite = new GifSprite({ source: waterPatternSource, autoPlay: true });
      sprite.anchor.set(0.5);
      sprite.position.set(x + tileSize / 2, y + tileSize / 2);
      sprite.width = tileSize;
      sprite.height = tileSize;
      sprite.rotation = (effect.patternRotation * Math.PI) / 180;
      sprite.alpha = effect.opacity;
      applyWaterPatternFilters(sprite, effect);
      patternContainer.addChild(sprite);
    }
  }

  patternContainer.setMask({ mask });
  container.addChild(patternContainer);
  container.addChild(mask);
}

function addRiverWaterPatternSprites(
  container: Container,
  effect: Extract<SceneWaterEffect, { readonly variant: "river" }>,
  waterPatternSource: GifSource,
  mask: Graphics
): void {
  const patternContainer = new Container();
  const baseTileSize = Math.max(WATER_RIVER_MIN_TILE_SIZE, Math.min(WATER_RIVER_MAX_TILE_SIZE, effect.width * 0.72));
  const baseExtraRows = Math.max(0, Math.ceil((effect.width - baseTileSize) / (baseTileSize * 2)));
  const estimatedSprites =
    Math.max(1, Math.ceil(getPolylineLength(effect.points) / baseTileSize)) * (baseExtraRows * 2 + 1);
  const tileSize =
    estimatedSprites > MAX_WATER_PATTERN_SPRITES_PER_EFFECT
      ? Math.min(
          WATER_RIVER_PERFORMANCE_TILE_SIZE,
          baseTileSize * Math.sqrt(estimatedSprites / MAX_WATER_PATTERN_SPRITES_PER_EFFECT)
        )
      : baseTileSize;
  const step = tileSize;
  const extraRows = Math.max(0, Math.ceil((effect.width - tileSize) / (tileSize * 2)));

  for (let index = 1; index < effect.points.length; index += 1) {
    const from = effect.points[index - 1];
    const to = effect.points[index];
    if (from === undefined || to === undefined) continue;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;

    const angle = Math.atan2(dy, dx);
    const normalAngle = angle + Math.PI / 2;
    const count = Math.max(1, Math.ceil(length / step));

    for (let tileIndex = 0; tileIndex < count; tileIndex += 1) {
      const distance = Math.min(length, tileIndex * step + step / 2);
      const t = length === 0 ? 0 : distance / length;
      const center = {
        x: from.x + dx * t,
        y: from.y + dy * t
      };

      for (let row = -extraRows; row <= extraRows; row += 1) {
        const offset = row * tileSize;
        addWaterPatternTile(patternContainer, effect, waterPatternSource, {
          x: center.x + Math.cos(normalAngle) * offset,
          y: center.y + Math.sin(normalAngle) * offset
        }, tileSize, angle + (effect.patternRotation * Math.PI) / 180);
      }
    }
  }

  addRiverEndpointAndCornerPatternSprites(patternContainer, effect, waterPatternSource, tileSize);
  patternContainer.setMask({ mask });
  container.addChild(patternContainer);
  container.addChild(mask);
}

function addRiverEndpointAndCornerPatternSprites(
  container: Container,
  effect: Extract<SceneWaterEffect, { readonly variant: "river" }>,
  waterPatternSource: GifSource,
  tileSize: number
): void {
  const capTileSize = Math.max(tileSize, effect.width * 1.08);

  for (let index = 0; index < effect.points.length; index += 1) {
    const point = effect.points[index];
    if (point === undefined) {
      continue;
    }

    addWaterPatternTile(
      container,
      effect,
      waterPatternSource,
      point,
      capTileSize,
      getRiverPointPatternRotation(effect, index)
    );
  }
}

function addWaterPatternTile(
  container: Container,
  effect: SceneWaterEffect,
  waterPatternSource: GifSource,
  position: WorldPoint,
  size: number,
  rotation: number
): void {
  const sprite = new GifSprite({ source: waterPatternSource, autoPlay: true });
  sprite.anchor.set(0.5);
  sprite.position.set(position.x, position.y);
  sprite.width = size;
  sprite.height = size;
  sprite.rotation = rotation;
  sprite.alpha = effect.opacity;
  applyWaterPatternFilters(sprite, effect);
  container.addChild(sprite);
}

function getRiverPointPatternRotation(
  effect: Extract<SceneWaterEffect, { readonly variant: "river" }>,
  pointIndex: number
): number {
  const previous = effect.points[pointIndex - 1];
  const point = effect.points[pointIndex];
  const next = effect.points[pointIndex + 1];

  if (point === undefined) {
    return (effect.patternRotation * Math.PI) / 180;
  }

  if (previous !== undefined && next !== undefined) {
    const previousAngle = Math.atan2(point.y - previous.y, point.x - previous.x);
    const nextAngle = Math.atan2(next.y - point.y, next.x - point.x);
    return ((previousAngle + nextAngle) / 2) + (effect.patternRotation * Math.PI) / 180;
  }

  if (next !== undefined) {
    return Math.atan2(next.y - point.y, next.x - point.x) + (effect.patternRotation * Math.PI) / 180;
  }

  if (previous !== undefined) {
    return Math.atan2(point.y - previous.y, point.x - previous.x) + (effect.patternRotation * Math.PI) / 180;
  }

  return (effect.patternRotation * Math.PI) / 180;
}

function applyWaterPatternFilters(sprite: Sprite | GifSprite, effect: SceneWaterEffect): void {
  if (effect.hue === 0 && effect.saturation === 1) {
    return;
  }

  sprite.filters = [getWaterColorMatrixFilter(effect.hue, effect.saturation)];
}

function getWaterColorMatrixFilter(hue: number, saturation: number): ColorMatrixFilter {
  const key = `${hue}:${saturation}`;
  const cached = waterFilterCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const filter = new ColorMatrixFilter();
  if (hue !== 0) {
    filter.hue(hue, false);
  }
  if (saturation !== 1) {
    filter.saturate(saturation, true);
  }
  waterFilterCache.set(key, filter);
  return filter;
}

function getPolylineLength(points: readonly WorldPoint[]): number {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined) {
      continue;
    }

    length += Math.hypot(to.x - from.x, to.y - from.y);
  }

  return length;
}

function getWaterBounds(effect: SceneWaterEffect): {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
} {
  const padding = effect.variant === "river" ? effect.width / 2 + 12 : 12;
  const xs = effect.points.map((point) => point.x);
  const ys = effect.points.map((point) => point.y);

  return {
    left: Math.min(...xs) - padding,
    right: Math.max(...xs) + padding,
    top: Math.min(...ys) - padding,
    bottom: Math.max(...ys) + padding
  };
}

function drawPolyline(graphic: Graphics, points: readonly WorldPoint[]): void {
  const first = points[0];
  if (first === undefined) return;
  graphic.moveTo(first.x, first.y);

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point !== undefined) {
      graphic.lineTo(point.x, point.y);
    }
  }
}

function drawPolygon(graphic: Graphics, points: readonly WorldPoint[]): void {
  drawPolyline(graphic, points);
  graphic.closePath();
}

function drawFireLight(effect: SceneFireEffect): Graphics {
  if (effect.zone.kind === "cells") {
    const graphic = new Graphics();
    const { bright, dim } = computeCellRings(effect.zone.cells);

    for (const cell of dim) {
      graphic
        .rect(cell.x, cell.y, cell.size, cell.size)
        .fill({ color: 0xffa54f, alpha: 0.08 * effect.opacity });
    }

    for (const cell of [...effect.zone.cells, ...bright]) {
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
  const origin = getFireCellGridOrigin(cells);
  const cellsByIndex = new Map(cells.map((cell) => [getFireCellIndexKey(cell, origin), cell] as const));
  const fireSet = new Set(cellsByIndex.keys());
  const brightSet = new Map<string, { x: number; y: number; size: number }>();

  for (const cell of cells) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const neighbor = getFireCellIndex(cell, origin);
      const key = `${neighbor.x + dx}:${neighbor.y + dy}`;
      if (!fireSet.has(key)) {
        brightSet.set(key, {
          x: cell.x + dx * cellSize,
          y: cell.y + dy * cellSize,
          size: cellSize
        });
      }
    }
  }

  const dimSet = new Map<string, { x: number; y: number; size: number }>();

  for (const brightCell of brightSet.values()) {
    const brightIndex = getFireCellIndex(brightCell, origin);

    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const key = `${brightIndex.x + dx}:${brightIndex.y + dy}`;
      if (!fireSet.has(key) && !brightSet.has(key)) {
        dimSet.set(key, {
          x: brightCell.x + dx * cellSize,
          y: brightCell.y + dy * cellSize,
          size: cellSize
        });
      }
    }
  }

  return {
    bright: [...brightSet.values()],
    dim: [...dimSet.values()]
  };
}

function drawSceneEffect(
  effect: SceneFireEffect,
  firePatternSource: GifSource | null
): Container {
  const container = new Container();
  const graphic = new Graphics();
  const color = parseHexColor(effect.color);
  const alpha = Math.max(0.15, 0.62 * effect.opacity);

  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;
    addFirePattern(container, effect, firePatternSource);
    if (firePatternSource === null) {
      graphic
        .circle(effect.position.x, effect.position.y, radius)
        .fill({ color, alpha });

      if (effect.zone.mode === "open") {
        graphic
          .circle(effect.position.x, effect.position.y, radius * effect.zone.innerRadiusRatio)
          .cut();
      }

      container.addChild(graphic);
    }

    container.addChild(drawFireZoneOutline(effect));
    return container;
  }

  addFirePattern(container, effect, firePatternSource);

  if (firePatternSource === null) {
    for (const cell of effect.zone.cells) {
      graphic
        .rect(cell.x, cell.y, cell.size, cell.size)
        .fill({ color, alpha });
    }

    container.addChild(graphic);
  }

  container.addChild(drawFireZoneOutline(effect));

  return container;
}

function addFirePattern(
  container: Container,
  effect: SceneFireEffect,
  firePatternSource: GifSource | null
): void {
  if (firePatternSource === null) {
    return;
  }

  if (effect.zone.kind === "circle") {
    addMaskedFirePatternSprite(
      container,
      firePatternSource,
      getFirePatternBounds(effect),
      drawFireZoneMask(effect),
      effect.opacity
    );
    return;
  }

  for (const group of groupContiguousFireCells(effect.zone.cells)) {
    addMaskedFirePatternSprite(
      container,
      firePatternSource,
      getFireCellBounds(group),
      drawFireCellMask(group),
      effect.opacity
    );
  }
}

function getFirePatternBounds(effect: SceneFireEffect): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;

    return {
      left: effect.position.x - radius,
      right: effect.position.x + radius,
      top: effect.position.y - radius,
      bottom: effect.position.y + radius
    };
  }

  const xs = effect.zone.cells.flatMap((cell) => [cell.x, cell.x + cell.size]);
  const ys = effect.zone.cells.flatMap((cell) => [cell.y, cell.y + cell.size]);

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys)
  };
}

function addMaskedFirePatternSprite(
  container: Container,
  firePatternSource: GifSource,
  bounds: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number },
  mask: Graphics,
  opacity: number
): void {
  const sprite = new GifSprite({
    source: firePatternSource,
    autoPlay: true,
    loop: true,
    animationSpeed: 1
  });
  sprite.x = bounds.left;
  sprite.y = bounds.top;
  sprite.width = Math.max(1, bounds.right - bounds.left);
  sprite.height = Math.max(1, bounds.bottom - bounds.top);
  sprite.alpha = Math.max(0.18, opacity * FIRE_PATTERN_ALPHA_MULTIPLIER);
  sprite.mask = mask;
  container.addChild(sprite);
  container.addChild(mask);
}

function groupContiguousFireCells(cells: readonly FireCell[]): readonly (readonly FireCell[])[] {
  const origin = getFireCellGridOrigin(cells);
  const remaining = new Map(cells.map((cell) => [getFireCellIndexKey(cell, origin), cell] as const));
  const groups: FireCell[][] = [];

  while (remaining.size > 0) {
    const first = remaining.values().next().value;

    if (first === undefined) {
      break;
    }

    const group: FireCell[] = [];
    const queue = [first];
    remaining.delete(getFireCellIndexKey(first, origin));

    for (let index = 0; index < queue.length; index += 1) {
      const cell = queue[index];

      if (cell === undefined) {
        continue;
      }

      group.push(cell);

      for (const key of getFireCellNeighborKeys(cell, origin)) {
        const neighbor = remaining.get(key);

        if (neighbor !== undefined) {
          remaining.delete(key);
          queue.push(neighbor);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

function getFireCellGridOrigin(cells: readonly { readonly x: number; readonly y: number; readonly size: number }[]): {
  readonly x: number;
  readonly y: number;
} {
  return {
    x: Math.min(...cells.map((cell) => cell.x)),
    y: Math.min(...cells.map((cell) => cell.y))
  };
}

function getFireCellIndex(
  cell: { readonly x: number; readonly y: number; readonly size: number },
  origin: { readonly x: number; readonly y: number }
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round((cell.x - origin.x) / cell.size),
    y: Math.round((cell.y - origin.y) / cell.size)
  };
}

function getFireCellIndexKey(
  cell: { readonly x: number; readonly y: number; readonly size: number },
  origin: { readonly x: number; readonly y: number }
): string {
  const index = getFireCellIndex(cell, origin);
  return `${index.x}:${index.y}`;
}

function getFireCellNeighborKeys(
  cell: FireCell,
  origin: { readonly x: number; readonly y: number }
): readonly string[] {
  const index = getFireCellIndex(cell, origin);
  return [
    `${index.x - 1}:${index.y}`,
    `${index.x + 1}:${index.y}`,
    `${index.x}:${index.y - 1}`,
    `${index.x}:${index.y + 1}`
  ];
}

function getFireCellBounds(cells: readonly FireCell[]): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const xs = cells.flatMap((cell) => [cell.x, cell.x + cell.size]);
  const ys = cells.flatMap((cell) => [cell.y, cell.y + cell.size]);

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys)
  };
}

function drawFireCellMask(cells: readonly FireCell[]): Graphics {
  const mask = new Graphics();

  for (const cell of cells) {
    mask.rect(cell.x, cell.y, cell.size, cell.size).fill({ color: 0xffffff, alpha: 1 });
  }

  return mask;
}

function drawFireZoneMask(effect: SceneFireEffect): Graphics {
  const mask = new Graphics();

  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;
    mask
      .circle(effect.position.x, effect.position.y, radius)
      .fill({ color: 0xffffff, alpha: 1 });

    if (effect.zone.mode === "open") {
      mask
        .circle(effect.position.x, effect.position.y, radius * effect.zone.innerRadiusRatio)
        .cut();
    }

    return mask;
  }

  for (const cell of effect.zone.cells) {
    mask.rect(cell.x, cell.y, cell.size, cell.size).fill({ color: 0xffffff, alpha: 1 });
  }

  return mask;
}

function drawFireZoneOutline(effect: SceneFireEffect): Graphics {
  const outline = new Graphics();

  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;
    outline.circle(effect.position.x, effect.position.y, radius);

    if (effect.zone.mode === "open") {
      outline.circle(effect.position.x, effect.position.y, radius * effect.zone.innerRadiusRatio).cut();
    }

    return outline.stroke({ color: 0xff8a38, width: 2, alpha: 0.8 * effect.opacity });
  }

  return outline;
}

function drawMagicalDarknessEffect(effect: SceneMagicalDarknessEffect): Graphics {
  return new Graphics()
    .circle(effect.position.x, effect.position.y, effect.radius)
    .fill({ color: 0x000000, alpha: effect.opacity })
    .stroke({ color: 0x000000, width: 4, alpha: 0.95 });
}

function drawTokenPlaceholder(token: RenderSceneToken, footprintWorld: number): Graphics {
  return new Graphics()
    .circle(token.position.x, token.position.y, footprintWorld / 2)
    .fill({ color: 0x273033, alpha: 0.96 })
    .stroke({ color: parseHexColor(token.selectionColor), width: 3, alpha: 0.72 });
}

function drawTokenBadge(token: RenderSceneToken, footprintWorld: number): Container {
  const container = new Container();
  const x = token.position.x + footprintWorld / 2 - Math.max(8, footprintWorld * 0.08);
  const y = token.position.y - footprintWorld / 2 + Math.max(12, footprintWorld * 0.12);
  const label = new Text({
    text: String(token.badgeNumber),
    style: {
      fill: parseHexColor(token.selectionColor),
      fontFamily: "system-ui, sans-serif",
      fontSize: Math.max(12, Math.min(18, footprintWorld * 0.18)),
      fontWeight: "800",
      stroke: { color: 0x111315, width: 3 }
    }
  });

  label.anchor.set(1, 0);
  label.position.set(x, y);
  container.addChild(label);
  return container;
}

function drawSelection(element: SelectableRenderElement): Graphics {
  const { x, y } = element.position;
  const radius = (element.hitRadius ?? getHitRadius(element.kind)) + 8;

  return new Graphics().circle(x, y, radius).stroke({
    color: parseHexColor(element.selectionColor ?? "#fff0a8"),
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

function drawPathPointHandles(shape: SceneShape, cellSizeWorld: number): Graphics {
  const graphic = new Graphics();

  const firstPoint = shape.points[0];
  if (firstPoint !== undefined) {
    graphic
      .circle(firstPoint.x, firstPoint.y, cellSizeWorld / 2)
      .stroke({ color: 0xfff0a8, width: 4, alpha: 0.45 })
      .circle(firstPoint.x, firstPoint.y, 13)
      .fill({ color: 0x101315, alpha: 0.9 })
      .circle(firstPoint.x, firstPoint.y, 8)
      .fill({ color: 0xfff0a8, alpha: 0.95 });
  }

  return graphic;
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

function drawWaterRotationHandles(effect: SceneWaterEffect): Graphics {
  const lineRadius = getWaterLineRotationRadius(effect);
  const patternRadius = getWaterPatternRotationRadius(effect);
  const lineHandle = getWaterLineRotationHandlePosition(effect);
  const patternHandle = getWaterPatternRotationHandlePosition(effect);

  return new Graphics()
    .circle(effect.position.x, effect.position.y, lineRadius)
    .stroke({ color: 0xfff0a8, width: 2, alpha: 0.74 })
    .moveTo(effect.position.x, effect.position.y)
    .lineTo(lineHandle.x, lineHandle.y)
    .stroke({ color: 0xfff0a8, width: 3, alpha: 0.82 })
    .circle(lineHandle.x, lineHandle.y, 11)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(lineHandle.x, lineHandle.y, 7)
    .fill({ color: 0xfff0a8, alpha: 0.95 })
    .circle(effect.position.x, effect.position.y, patternRadius)
    .stroke({ color: 0x7adcf0, width: 2, alpha: 0.72 })
    .moveTo(effect.position.x, effect.position.y)
    .lineTo(patternHandle.x, patternHandle.y)
    .stroke({ color: 0x7adcf0, width: 3, alpha: 0.82 })
    .circle(patternHandle.x, patternHandle.y, 11)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(patternHandle.x, patternHandle.y, 7)
    .fill({ color: 0xc7f7ff, alpha: 0.95 });
}

function getWaterLineRotationHandlePosition(effect: SceneWaterEffect): WorldPoint {
  const radius = getWaterLineRotationRadius(effect);
  const angle = (effect.lineRotation * Math.PI) / 180;

  return {
    x: effect.position.x + Math.cos(angle) * radius,
    y: effect.position.y + Math.sin(angle) * radius
  };
}

function getWaterPatternRotationHandlePosition(effect: SceneWaterEffect): WorldPoint {
  const radius = getWaterPatternRotationRadius(effect);
  const angle = (effect.patternRotation * Math.PI) / 180;

  return {
    x: effect.position.x + Math.cos(angle) * radius,
    y: effect.position.y + Math.sin(angle) * radius
  };
}

function getWaterLineRotationRadius(effect: SceneWaterEffect): number {
  if (effect.variant === "river") {
    return Math.max(54, effect.width * 0.7 + 24);
  }

  const bounds = getWaterBounds(effect);
  const maxDimension = Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top);

  return Math.max(72, Math.min(260, maxDimension * 0.25));
}

function getWaterPatternRotationRadius(effect: SceneWaterEffect): number {
  return getWaterLineRotationRadius(effect) + 42;
}

function drawLightResizeHandle(light: SceneLight): Graphics {
  const handle = getLightResizeHandlePosition(light);
  const graphic = new Graphics();

  if (light.kind === "point") {
    graphic
      .circle(light.position.x, light.position.y, light.radius)
      .stroke({ color: 0xfff0a8, width: 2, alpha: 0.78 });
  } else {
    graphic
      .moveTo(light.position.x, light.position.y)
      .lineTo(handle.x, handle.y)
      .stroke({ color: 0xfff0a8, width: 2, alpha: 0.72 });
  }

  return graphic
    .circle(handle.x, handle.y, 11)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(handle.x, handle.y, 7)
    .fill({ color: 0xfff0a8, alpha: 0.95 });
}

function getLightResizeHandlePosition(light: SceneLight): { x: number; y: number } {
  if (light.kind === "point") {
    return {
      x: light.position.x + light.radius,
      y: light.position.y
    };
  }

  const direction = (light.direction * Math.PI) / 180;

  return {
    x: light.position.x + Math.cos(direction) * light.radius,
    y: light.position.y + Math.sin(direction) * light.radius
  };
}

function drawFireResizeHandles(effect: SceneFireEffect): Graphics {
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

function drawMagicalDarknessResizeHandle(effect: SceneMagicalDarknessEffect): Graphics {
  return new Graphics()
    .circle(effect.position.x, effect.position.y, effect.radius)
    .stroke({ color: 0x111315, width: 4, alpha: 0.92 })
    .circle(effect.position.x + effect.radius, effect.position.y, 10)
    .fill({ color: 0xf4f1e8, alpha: 0.9 })
    .circle(effect.position.x + effect.radius, effect.position.y, 6)
    .fill({ color: 0x111315, alpha: 0.95 });
}

function getFireVisualRadius(effect: SceneFireEffect): number {
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

function drawCircleResizeHandle(shape: SceneShape): Graphics {
  const anchor = shape.points[0];
  if (anchor === undefined) return new Graphics();

  const radius = shape.radius ?? 1;

  return new Graphics()
    .circle(anchor.x, anchor.y, radius)
    .stroke({ color: 0x7fb8ff, width: 2, alpha: 0.75 })
    .circle(anchor.x + radius, anchor.y, 10)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(anchor.x + radius, anchor.y, 7)
    .fill({ color: 0x7fb8ff, alpha: 0.95 });
}

function drawConeShapeHandles(shape: SceneShape): Graphics {
  const anchor = shape.points[0];
  if (anchor === undefined) return new Graphics();

  const radius = shape.radius ?? 1;
  const angle = ((shape.direction ?? 0) * Math.PI) / 180;
  const tipX = anchor.x + Math.cos(angle) * radius;
  const tipY = anchor.y + Math.sin(angle) * radius;
  const ringHandleX = anchor.x + Math.cos(angle) * SHAPE_CONE_ROTATION_RING_RADIUS;
  const ringHandleY = anchor.y + Math.sin(angle) * SHAPE_CONE_ROTATION_RING_RADIUS;

  return new Graphics()
    .circle(anchor.x, anchor.y, SHAPE_CONE_ROTATION_RING_RADIUS)
    .stroke({ color: 0xfff0a8, width: 2, alpha: 0.72 })
    .moveTo(anchor.x, anchor.y)
    .lineTo(ringHandleX, ringHandleY)
    .stroke({ color: 0xfff0a8, width: 2, alpha: 0.8 })
    .circle(ringHandleX, ringHandleY, 8)
    .fill({ color: 0xfff0a8, alpha: 0.95 })
    .moveTo(anchor.x, anchor.y)
    .lineTo(tipX, tipY)
    .stroke({ color: 0x79e1bf, width: 2, alpha: 0.7 })
    .circle(tipX, tipY, 10)
    .fill({ color: 0x101315, alpha: 0.9 })
    .circle(tipX, tipY, 7)
    .fill({ color: 0x79e1bf, alpha: 0.95 });
}

function drawRectCornerHandles(shape: SceneShape): Graphics {
  const anchor = shape.points[0];
  if (anchor === undefined) return new Graphics();

  const halfW = (shape.width ?? 1) / 2;
  const halfH = (shape.height ?? 1) / 2;
  const corners = [
    { x: anchor.x - halfW, y: anchor.y - halfH },
    { x: anchor.x + halfW, y: anchor.y - halfH },
    { x: anchor.x + halfW, y: anchor.y + halfH },
    { x: anchor.x - halfW, y: anchor.y + halfH }
  ];
  const graphic = new Graphics();

  graphic
    .rect(anchor.x - halfW, anchor.y - halfH, halfW * 2, halfH * 2)
    .stroke({ color: 0xffd28a, width: 2, alpha: 0.65 });

  for (const corner of corners) {
    graphic
      .circle(corner.x, corner.y, 10)
      .fill({ color: 0x101315, alpha: 0.9 })
      .circle(corner.x, corner.y, 7)
      .fill({ color: 0xffd28a, alpha: 0.95 });
  }

  return graphic;
}

function getHitRadius(kind: SelectableRenderElement["kind"]): number {
  switch (kind) {
    case "measurement":
      return 90;
    case "path":
      return 18;
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
    case "magical-darkness":
      return 72;
    case "token":
      return 50;
    case "water":
      return 50;
  }
}

function hitTestPath(shape: SceneShape, point: WorldPoint, tolerance: number): boolean {
  if (shape.type !== "path") {
    return false;
  }

  for (const pathPoint of shape.points) {
    if (Math.hypot(point.x - pathPoint.x, point.y - pathPoint.y) <= tolerance * 1.25) {
      return true;
    }
  }

  for (let index = 1; index < shape.points.length; index += 1) {
    const from = shape.points[index - 1];
    const to = shape.points[index];

    if (from !== undefined && to !== undefined && distanceToSegment(point, from, to) <= tolerance) {
      return true;
    }
  }

  return false;
}

function hitTestWaterEffect(effect: SceneWaterEffect, point: WorldPoint, tolerance: number): boolean {
  if (effect.variant === "river") {
    for (let index = 1; index < effect.points.length; index += 1) {
      const from = effect.points[index - 1];
      const to = effect.points[index];

      if (
        from !== undefined &&
        to !== undefined &&
        distanceToSegment(point, from, to) <= effect.width / 2 + tolerance
      ) {
        return true;
      }
    }

    return false;
  }

  if (isPointInsidePolygon(point, effect.points)) {
    return true;
  }

  for (let index = 1; index < effect.points.length; index += 1) {
    const from = effect.points[index - 1];
    const to = effect.points[index];

    if (from !== undefined && to !== undefined && distanceToSegment(point, from, to) <= tolerance) {
      return true;
    }
  }

  return false;
}

function isPointInsidePolygon(point: WorldPoint, polygon: readonly WorldPoint[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (a === undefined || b === undefined) continue;

    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToSegment(point: WorldPoint, from: WorldPoint, to: WorldPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  const projectionX = from.x + t * dx;
  const projectionY = from.y + t * dy;

  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

function drawFireZoneHint(effect: SceneFireEffect): Graphics {
  const graphic = new Graphics();

  graphic
    .circle(effect.position.x, effect.position.y, 50)
    .stroke({ color: 0x7fb8ff, width: 3, alpha: 0.2 });

  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;
    graphic
      .circle(effect.position.x, effect.position.y, radius)
      .stroke({ color: 0xff8a38, width: 2, alpha: 0.28 });
  }

  return graphic;
}
