// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Assets, ColorMatrixFilter, Container, Graphics, Sprite, Texture, TextureSource } from "pixi.js";
import type { MapImageState } from "../../domain/map/map-image";
import { renderLayerNames } from "../../domain/map/render-layers";
import { createLightSource } from "../../domain/lighting/lights";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { PixiViewport, type RenderSceneToken } from "./PixiViewport";
import { acquireImageResource, MAX_MAP_IMAGE_DIMENSION, prepareMapImageResource, registerMapImageTextureLimit } from "./map-image-resource";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });

const cleanup: (() => void)[] = [];
const pending = new Map<string, ReturnType<typeof deferred<Texture>>>();
const textures = new Map<string, Texture>();
let sequence = 0;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

function candidate(mapId = "map-a"): MapImageState {
  const url = `map-asset:///map.png?revision=${++sequence}`;
  pending.set(url, deferred<Texture>());
  return { mapId, imagePath: "/map.png", imageUrl: url, scale: 1, position: { x: 120, y: -30 } };
}

function resolve(map: MapImageState, width = 200, height = 100): Texture {
  const texture = new Texture({ source: new TextureSource({ width, height }) });
  texture.frame.width = width;
  texture.frame.height = height;
  textures.set(map.imageUrl!, texture);
  pending.get(map.imageUrl!)!.resolve(texture);
  return texture;
}

async function flush() { await new Promise<void>(done => setTimeout(done, 0)); }

beforeEach(() => {
  vi.spyOn(Assets as { load(url: string): Promise<Texture> }, "load").mockImplementation(async url => {
    const request = pending.get(String(url));
    if (!request) throw new Error(`Unexpected asset: ${String(url)}`);
    return request.promise;
  });
  vi.spyOn(Assets, "unload").mockImplementation(async url => { textures.get(String(url))?.destroy(true); });
});

afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) dispose();
  await flush();
  for (const texture of textures.values()) if (!texture.destroyed) texture.destroy(true);
  pending.clear();
  textures.clear();
  vi.restoreAllMocks();
});

interface Internals {
  map: MapImageState | null;
  mapSprite: Sprite | null;
  colorMapSprite: Sprite | null;
  drawDaytimeFilterLayer(): void;
  drawTokenLayer(force?: boolean): Promise<void>;
  getGridBounds(): { left: number; right: number; top: number; bottom: number };
  shouldDeferEffectsUntilMapReady(): boolean;
}

function createHarness() {
  const scene = createDefaultScene();
  const layers = new Map(renderLayerNames.map(name => [name, new Container()]));
  const grayscaleFilter = new ColorMatrixFilter();
  const camera = { center: { x: 625, y: -100 }, zoom: 1.75 };
  const viewport = Object.assign(Object.create(PixiViewport.prototype) as Pick<PixiViewport,
    "setMap" | "setViewRole" | "setGrid" | "setDarkness" | "setCompassOrientation" | "destroy"> & Internals, {
    map: null as MapImageState | null, requestedMap: null, mapResource: null, pendingMapResource: null,
    mapSprite: null as Sprite | null, colorMapSprite: null as Sprite | null, darkvisionMask: null,
    loadedMapUrl: null, mapLoadVersion: 0, tokenLoadVersion: 0, disposed: false,
    daytimeFeedbackTexture: null, daytimeFeedbackSignature: "", daytimeFeedbackRedrawFrame: null,
    darkvisionSignature: "", isMapImageLoading: false, shouldDrawEffectsAfterMapLoad: false,
    layers, grayscaleFilter, camera, compassOrientation: 0,
    viewRole: "player", grid: scene.grid, settings: scene.settings,
    darkness: { ...scene.darkness, enabled: true, opacity: 1, darkvisionEnabled: true },
    lights: [createLightSource("lamp", "point", { x: 100, y: 100 })], effects: [], shapes: [],
    daytimeFilter: { enabled: true, preset: "night", coverage: "scene" }, daytimeMask: { strokes: [] },
    tokens: [] as RenderSceneToken[], hiddenTokenPolicy: "hide", tokenResources: new Map(),
    tokenTextureCache: new Map(), tokenLayerSignature: null,
    previewLights: new Map(), previewEffects: new Map(), previewShapes: new Map(), dynamicLightRenderStates: new Map(),
    effectRenderCache: new Map(), shapeRenderCache: new Map(), lightRenderCache: new Map(),
    magicalDarknessRenderCache: new Map(), lightningVisuals: new Map(),
    cameraInteractionEndTimer: null, firePatternSource: null,
    options: { onMapImageLoaded: vi.fn(), onMapImageError: vi.fn(), onMapRendered: vi.fn(), onMapRenderError: vi.fn(), onCameraChange: vi.fn() },
    scheduleDarknessRedraw: vi.fn(), scheduleFogOfWarRedraw: vi.fn(),
    drawDarknessLayer: vi.fn(), drawFogOfWarLayer: vi.fn(), drawEffectsLayer: vi.fn(),
    drawGrid: vi.fn(), drawSelectionLayer: vi.fn(), drawShapesAndMeasurementsLayer: vi.fn(),
    drawLightsLayer: vi.fn(), drawLabelsLayer: vi.fn(), drawMapAnnotationsLayer: vi.fn(),
    applyCamera: vi.fn(), updatePlayerCameraControls: vi.fn(),
    resizeObserver: { disconnect: vi.fn() }, removeInputListeners: vi.fn(),
    cancelScheduledFogRedraw: vi.fn(), cancelScheduledDarknessRedraw: vi.fn(), cancelPendingViewportUpdates: vi.fn(),
    clearArcanePointers: vi.fn(), clearInformationAreaHighlights: vi.fn(),
    app: { ticker: { remove: vi.fn() }, destroy: vi.fn(() => {
      for (const layer of layers.values()) layer.destroy({ children: true, texture: true });
    }) }
  });
  cleanup.push(() => { viewport.destroy(); grayscaleFilter.destroy(); });
  return viewport;
}

async function loadInitial(viewport: ReturnType<typeof createHarness>) {
  const map = candidate();
  viewport.setMap(map);
  const texture = resolve(map);
  await flush();
  return { map, texture };
}

describe("map image replacement", () => {
  it("retains the loaded texture AND transform across repeated pending snapshots and redraws", async () => {
    const viewport = createHarness();
    const { map, texture } = await loadInitial(viewport);
    const camera = structuredClone(viewport.camera);
    const oldBounds = viewport.getGridBounds();
    const originalMask = viewport.colorMapSprite!.mask;
    const replacement = { ...candidate(), position: { x: -40, y: 75 }, scale: 0.5 };
    viewport.setMap(replacement);
    expect(viewport.shouldDeferEffectsUntilMapReady()).toBe(false);
    for (let index = 0; index < 3; index++) {
      viewport.setMap({ ...replacement });
      viewport.setGrid({ ...viewport.grid, cellSizeWorld: 100 + index });
      viewport.setViewRole("dm");
      viewport.setViewRole("player");
      viewport.drawDaytimeFilterLayer();
      expect(viewport.map).toEqual(map);
      expect(viewport.mapSprite!.texture).toBe(texture);
      expect(viewport.mapSprite!.scale.x).toBe(1);
      expect(viewport.colorMapSprite!.scale.x).toBe(1);
      expect(viewport.getGridBounds()).toEqual(oldBounds);
      const overlay = viewport.layers.get("daytimeFilter")!.children[0]!.getLocalBounds();
      expect([overlay.x, overlay.y, overlay.width, overlay.height]).toEqual([20, -80, 200, 100]);
    }
    expect(Assets.unload).not.toHaveBeenCalled();
    const nextTexture = resolve(replacement, 400, 200);
    await flush();
    expect(viewport.mapSprite!.texture).toBe(nextTexture);
    expect(viewport.colorMapSprite!.texture).toBe(nextTexture);
    expect(viewport.mapSprite!.scale.x).toBe(0.5);
    expect(viewport.mapSprite!.position.x).toBe(-40);
    expect(viewport.colorMapSprite!.visible).toBe(true);
    expect(viewport.colorMapSprite!.mask).toBeInstanceOf(Graphics);
    expect(viewport.colorMapSprite!.mask).not.toBe(originalMask);
    expect(viewport.mapSprite!.filters).toEqual([viewport.grayscaleFilter]);
    expect(texture.destroyed).toBe(true);
    expect(viewport.camera).toEqual(camera);
    expect(viewport.options.onCameraChange).not.toHaveBeenCalled();
    expect(Assets.load).toHaveBeenCalledTimes(2);
  });

  it("commits base, darkvision, daytime and protection redraws before reporting loaded", async () => {
    const viewport = createHarness();
    await loadInitial(viewport);
    const mask = viewport.colorMapSprite!.mask;
    const replacement = { ...candidate(), scale: 0.5 };
    const prepared = prepareMapImageResource(replacement.imageUrl!);
    const texture = resolve(replacement, 600, 200);
    const lease = await prepared;
    viewport.drawDarknessLayer.mockClear();
    viewport.drawFogOfWarLayer.mockClear();
    viewport.options.onMapImageLoaded.mockImplementation(payload => {
      expect(payload).toEqual({ imagePath: replacement.imagePath, imageUrl: replacement.imageUrl, width: 600, height: 200 });
      expect(viewport.mapSprite!.texture).toBe(texture);
      expect(viewport.colorMapSprite!.texture).toBe(texture);
      expect(viewport.colorMapSprite!.mask).toBe(mask);
      expect(viewport.colorMapSprite!.visible).toBe(true);
      expect((mask as Graphics).includeInBuild).toBe(false);
      const overlay = viewport.layers.get("daytimeFilter")!.children[0]!.getLocalBounds();
      expect([overlay.width, overlay.height]).toEqual([300, 100]);
      expect(viewport.drawDarknessLayer).toHaveBeenCalledOnce();
      expect(viewport.drawFogOfWarLayer).toHaveBeenCalledOnce();
      lease.release();
    });
    viewport.setMap(replacement);
    await flush();
    expect(Assets.load).toHaveBeenCalledTimes(2);
    expect(texture.destroyed).toBe(false);
    expect(viewport.applyCamera).not.toHaveBeenCalled();
  });

  it.each(["decode", "invalid-dimensions", "oversized"])("preserves the previous image when replacement fails: %s", async failure => {
    const viewport = createHarness();
    const { map, texture } = await loadInitial(viewport);
    const mask = viewport.colorMapSprite!.mask;
    const replacement = { ...candidate(), scale: 0.5 };
    viewport.setMap(replacement);
    if (failure === "decode") pending.get(replacement.imageUrl!)!.reject(new Error("corrupt"));
    else resolve(replacement, failure === "oversized" ? MAX_MAP_IMAGE_DIMENSION + 1 : 0, 100);
    await flush();
    viewport.setMap({ ...replacement });
    expect(viewport.map).toEqual(map);
    expect(viewport.mapSprite!.texture).toBe(texture);
    expect(viewport.mapSprite!.scale.x).toBe(1);
    expect(viewport.colorMapSprite!.mask).toBe(mask);
    expect(texture.destroyed).toBe(false);
    expect(viewport.options.onMapRenderError).toHaveBeenCalledOnce();
    expect(viewport.options.onMapImageError).toHaveBeenCalledExactlyOnceWith({
      imageUrl: replacement.imageUrl,
      error: viewport.options.onMapRenderError.mock.calls[0][0]
    });
    if (failure === "oversized") expect(viewport.options.onMapRenderError).toHaveBeenCalledWith(expect.stringContaining("8192"));
    expect(viewport.options.onMapImageLoaded).toHaveBeenCalledOnce();
    expect(Assets.unload).not.toHaveBeenCalledWith(map.imageUrl);
  });

  it.each(["success", "failure"])("ignores an obsolete %s after a newer request wins", async result => {
    const viewport = createHarness();
    await loadInitial(viewport);
    const obsolete = candidate();
    const latest = candidate();
    viewport.setMap(obsolete);
    viewport.setMap(latest);
    const latestTexture = resolve(latest, 700, 350);
    await flush();
    if (result === "success") resolve(obsolete, 900, 450);
    else pending.get(obsolete.imageUrl!)!.reject(new Error("old failure"));
    await flush();
    expect(viewport.mapSprite!.texture).toBe(latestTexture);
    expect(viewport.options.onMapRenderError).not.toHaveBeenCalled();
    expect(viewport.options.onMapImageError).not.toHaveBeenCalled();
    expect(viewport.options.onMapImageLoaded).toHaveBeenCalledTimes(2);
    expect(viewport.options.onMapImageLoaded).toHaveBeenLastCalledWith({
      imagePath: latest.imagePath, imageUrl: latest.imageUrl, width: 700, height: 350
    });
    expect(Assets.unload).not.toHaveBeenCalledWith(latest.imageUrl);
    if (result === "success") expect(Assets.unload).toHaveBeenCalledWith(obsolete.imageUrl);
  });

  it("does not retain another map during navigation, even when paths match", async () => {
    const viewport = createHarness();
    await loadInitial(viewport);
    const secretSprite = viewport.mapSprite!;
    const secretColor = viewport.colorMapSprite!;
    const next = candidate("map-b");
    viewport.setMap(next);
    expect(viewport.shouldDeferEffectsUntilMapReady()).toBe(true);
    expect(secretSprite.destroyed).toBe(true);
    expect(secretColor.destroyed).toBe(true);
    expect(viewport.mapSprite).toBeNull();
    expect(viewport.layers.get("daytimeFilter")!.children).toHaveLength(0);
    pending.get(next.imageUrl!)!.reject(new Error("unavailable"));
    await flush();
    expect(viewport.mapSprite).toBeNull();
    expect(viewport.options.onMapRenderError).toHaveBeenCalledOnce();
  });

  it.each(["success", "failure"])("releases pending resources and ignores %s after dispose", async result => {
    const viewport = createHarness();
    const { texture } = await loadInitial(viewport);
    const next = candidate();
    viewport.setMap(next);
    viewport.destroy();
    if (result === "success") resolve(next);
    else pending.get(next.imageUrl!)!.reject(new Error("late failure"));
    await flush();
    expect(texture.destroyed).toBe(true);
    expect(viewport.options.onMapImageLoaded).toHaveBeenCalledOnce();
    expect(viewport.options.onMapRenderError).not.toHaveBeenCalled();
    expect(viewport.options.onMapImageError).not.toHaveBeenCalled();
    if (result === "success") expect(Assets.unload).toHaveBeenCalledWith(next.imageUrl);
  });

  it("shares map textures with token leases until the token is removed", async () => {
    const viewport = createHarness();
    const { map, texture } = await loadInitial(viewport);
    viewport.tokens = [{
      id: "token", type: "monster", imagePath: "/map.png", imageUrl: map.imageUrl, position: { x: 0, y: 0 },
      visible: true, size: "medium", name: "Token", footprintCells: 1,
      selectionColor: "#ffffff", badgeNumber: 1, order: 0
    }];
    await viewport.drawTokenLayer();
    expect(Assets.load).toHaveBeenCalledTimes(1);
    const next = candidate();
    viewport.setMap(next);
    resolve(next);
    await flush();
    expect(Assets.unload).not.toHaveBeenCalledWith(map.imageUrl);
    expect(texture.destroyed).toBe(false);
    viewport.tokens = [];
    await viewport.drawTokenLayer();
    await flush();
    expect(Assets.unload).toHaveBeenCalledWith(map.imageUrl);
    expect(texture.destroyed).toBe(true);
  });
});

describe("prepared image resource leases", () => {
  it("deduplicates preparation and renderer ownership and releases exactly once", async () => {
    const map = candidate();
    const first = prepareMapImageResource(map.imageUrl!);
    const second = prepareMapImageResource(map.imageUrl!);
    resolve(map, 500, 250);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toMatchObject({ width: 500, height: 250 });
    expect(Assets.load).toHaveBeenCalledOnce();
    a.release(); a.release();
    await flush();
    expect(Assets.unload).not.toHaveBeenCalled();
    b.release();
    await flush();
    expect(Assets.unload).toHaveBeenCalledExactlyOnceWith(map.imageUrl);
  });

  it("rejects oversized resources before confirmation and frees them", async () => {
    const map = candidate();
    const prepared = prepareMapImageResource(map.imageUrl!);
    resolve(map, MAX_MAP_IMAGE_DIMENSION + 1, 100);
    await expect(prepared).rejects.toThrow("limite");
    await flush();
    expect(Assets.unload).toHaveBeenCalledExactlyOnceWith(map.imageUrl);
  });

  it("rejects a resource exceeding the active backend's texture limit", async () => {
    const unregister = registerMapImageTextureLimit(1024);
    cleanup.push(unregister);
    const map = candidate();
    const prepared = prepareMapImageResource(map.imageUrl!);
    resolve(map, 2048, 1024);
    await expect(prepared).rejects.toThrow("1024");
    await flush();
    expect(Assets.unload).toHaveBeenCalledExactlyOnceWith(map.imageUrl);
  });

  it("accepts maps larger than the fallback when the active backend supports them", async () => {
    cleanup.push(registerMapImageTextureLimit(16384));
    const map = candidate();
    const preparedPromise = prepareMapImageResource(map.imageUrl!);
    resolve(map, 12000, 6000);
    const prepared = await preparedPromise;
    cleanup.push(prepared.release);
    expect(prepared).toMatchObject({ width: 12000, height: 6000 });
  });

  it("builds a bounded preview from the retained decoded source, without fetching its path", async () => {
    const map = candidate();
    const source = document.createElement("canvas");
    source.width = 2048;
    source.height = 1024;
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype as { getContext(id: "2d"): CanvasRenderingContext2D | null }, "getContext")
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,preview");
    const texture = new Texture({ source: new TextureSource({ resource: source, width: 2048, height: 1024 }) });
    textures.set(map.imageUrl!, texture);
    pending.get(map.imageUrl!)!.resolve(texture);
    const holder = acquireImageResource(map.imageUrl!);
    cleanup.push(holder.release);
    await holder.ready;
    const prepared = await prepareMapImageResource(map.imageUrl!);
    cleanup.push(prepared.release);
    expect(prepared.previewUrl).toBe("data:image/png;base64,preview");
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(source, 0, 0, 512, 256);
    expect(toDataURL.mock.instances[0]).toMatchObject({ width: 512, height: 256 });
    expect(Assets.load).toHaveBeenCalledOnce();
  });

  it("omits previews for unsupported sources instead of substituting the original URL", async () => {
    const map = candidate();
    const preparedPromise = prepareMapImageResource(map.imageUrl!);
    resolve(map);
    const prepared = await preparedPromise;
    cleanup.push(prepared.release);
    expect(prepared.previewUrl).toBeUndefined();
  });

  it("waits for an in-progress unload before reacquiring the same URL", async () => {
    const map = candidate();
    const unloading = deferred<void>();
    vi.mocked(Assets.unload).mockReturnValueOnce(unloading.promise);
    const first = acquireImageResource(map.imageUrl!);
    resolve(map);
    await first.ready;
    first.release();
    await flush();
    const second = acquireImageResource(map.imageUrl!);
    await flush();
    expect(Assets.load).toHaveBeenCalledOnce();
    unloading.resolve();
    await second.ready;
    expect(Assets.load).toHaveBeenCalledTimes(2);
    second.release();
    await flush();
  });
});
