// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Container, Mesh, Texture, UniformGroup } from "pixi.js";
import { createAnimatedFireEffect, moveAnimatedFireEffect } from "../../domain/effects/fire";
import type { SceneFireEffect } from "../../domain/sessions/scene-document";
import { getGridCellAtPoint, getGridCellHeight } from "../../domain/grid/grid-cell";
import { PixiViewport } from "./PixiViewport";
import { createFireNoise, getFireFootprint, getFireSeed, MAX_FIRE_MASK_SIZE, ProceduralFireRenderer } from "./procedural-fire";

const dispose: (() => void)[] = [];
const fire = createAnimatedFireEffect("original-fire", { x: 100, y: 200 });
vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });

afterEach(() => {
  for (const cleanup of dispose.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});

function createRenderer(now?: () => number): ProceduralFireRenderer {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const renderer = new ProceduralFireRenderer(now);
  dispose.push(() => renderer.destroy());
  return renderer;
}

interface FireViewportHarness {
  effects: SceneFireEffect[];
  grid: { cellSizeWorld: number };
  viewRole: "dm" | "player";
  isMapImageLoading: boolean;
  effectRenderCache: Map<string, { signature: string; container: Container }>;
  drawEffectsLayer(): void;
  drawSelectionLayer(): void;
  setViewRole(role: "dm" | "player"): void;
}

function createViewportHarness() {
  const renderer = createRenderer();
  const layer = new Container();
  const selection = new Container();
  dispose.push(() => { layer.destroy({ children: true }); selection.destroy({ children: true }); });
  const viewport = Object.assign(Object.create(PixiViewport.prototype) as FireViewportHarness, {
    effects: [fire], elements: [], previewEffects: new Map(), grid: { cellSizeWorld: 100 },
    layers: new Map([["effects", layer], ["selection", selection]]), effectRenderCache: new Map(),
    proceduralFireSource: renderer, firePatternSource: null, viewRole: "dm", map: {}, mapSprite: {},
    isMapImageLoading: false, selectedElementId: null, fogRevealGuideRadius: null,
    applyCamera: vi.fn(), scheduleDarknessRedraw: vi.fn(), drawDarkvisionLayer: vi.fn(),
    drawLightsLayer: vi.fn(), drawLabelsLayer: vi.fn(), drawMapAnnotationsLayer: vi.fn(),
    updatePlayerCameraControls: vi.fn(), updateAreaToolLabelScale: vi.fn()
  });
  return { renderer, layer, selection, viewport };
}

describe("procedural fire footprint", () => {
  it("has positive bounded texture dimensions even for huge, thin regions", () => {
    const huge = { ...fire, zone: { kind: "cells" as const, radius: 10, cells: [{ x: 0, y: 0, size: 1 }, { x: 1e6, y: 0, size: 1 }] } };
    for (const effect of [fire, huge]) {
      const footprint = getFireFootprint(effect, 100)!;
      expect(footprint.textureWidth).toBeGreaterThan(0);
      expect(footprint.textureHeight).toBeGreaterThan(0);
      expect(footprint.textureWidth).toBeLessThanOrEqual(MAX_FIRE_MASK_SIZE);
      expect(footprint.textureHeight).toBeLessThanOrEqual(MAX_FIRE_MASK_SIZE);
    }
  });

  it("includes complete hexagons and padding without a square-cell assumption", () => {
    const cell = getGridCellAtPoint({ x: 0, y: 0 }, { cellSizeWorld: 100, layout: "hexagonal" });
    const footprint = getFireFootprint({ ...fire, zone: { kind: "cells", radius: 50, cells: [cell] } }, 100)!;
    expect(footprint.height - 70).toBeCloseTo(getGridCellHeight(cell));
    expect(footprint.width - 70).toBeCloseTo(100);
  });

  it("moves the footprint without changing the local field or random seed", () => {
    const moved = moveAnimatedFireEffect(fire, { x: 310, y: -70 });
    const before = getFireFootprint(fire, 100)!;
    const after = getFireFootprint(moved, 100)!;
    expect(after.x - moved.position.x).toBe(before.x - fire.position.x);
    expect(after.y - moved.position.y).toBe(before.y - fire.position.y);
    expect(after.detail).toBe(before.detail);
    expect(getFireSeed(fire.id)).toEqual(getFireSeed(moved.id));
    expect(getFireSeed("another-fire")).not.toEqual(getFireSeed(fire.id));
  });

  it("does not create empty or transparent fire resources", () => {
    expect(getFireFootprint({ ...fire, opacity: 0 }, 100)).toBeNull();
    expect(getFireFootprint({ ...fire, zone: { kind: "cells", radius: 5, cells: [] } }, 100)).toBeNull();
  });

  it("generates a deterministic periodic noise volume with matching adjacent slices", () => {
    const noise = createFireNoise();
    expect(noise).toEqual(createFireNoise());
    expect(new Set(noise).size).toBe(256);
    for (let y = 0; y < 256; y += 7) {
      for (let x = 0; x < 256; x += 11) {
        expect(noise[(y * 256 + x) * 4 + 1]).toBe(noise[(((y + 17) % 256) * 256 + (x + 37) % 256) * 4]);
      }
    }
  });
});

describe("procedural fire resources", () => {
  it("joins the same wall-clock phase on first load and after reopening a map", () => {
    let now = 1_791_000_000_000;
    const dm = createRenderer(() => now);
    const player = createRenderer(() => now);
    const dmContainer = dm.createEffect(fire, 100);
    let playerContainer = player.createEffect(fire, 100);
    dispose.push(() => { dmContainer.destroy({ children: true }); playerContainer.destroy({ children: true }); });
    const clockFor = (container: Container) => ((container.children[0] as Mesh).shader!.resources.fireClock as UniformGroup).uniforms.uClock;
    expect(clockFor(playerContainer)).toEqual(clockFor(dmContainer));
    expect(clockFor(dmContainer)).not.toEqual(new Float32Array(4));
    playerContainer.destroy({ children: true });
    now += 1_200_000;
    dm.update();
    playerContainer = player.createEffect(fire, 100);
    expect(clockFor(playerContainer)).toEqual(clockFor(dmContainer));
    player.destroy();
    expect(dm.meshCount).toBe(1);
    expect(() => dm.update()).not.toThrow();
  });

  it("uses one mesh per area with a shared clock/noise, no masks or render textures", () => {
    const renderer = createRenderer();
    const first = renderer.createEffect(fire, 100);
    const second = renderer.createEffect({ ...fire, id: "other" }, 100);
    dispose.push(() => { first.destroy({ children: true }); second.destroy({ children: true }); });
    const mesh = first.children[0] as Mesh;
    const other = second.children[0] as Mesh;
    expect(first.children).toHaveLength(1);
    expect(mesh).toBeInstanceOf(Mesh);
    expect(first.effects).toHaveLength(0);
    expect(mesh.effects).toHaveLength(0);
    expect(mesh.shader!.resources.fireClock).toBe(other.shader!.resources.fireClock);
    expect(mesh.shader!.resources.uNoise).toBe(other.shader!.resources.uNoise);
    const geometry = mesh.geometry;
    const clock = mesh.shader!.resources.fireClock as UniformGroup;
    renderer.update(1_000);
    const previous = [...clock.uniforms.uClock as Float32Array];
    for (let i = 0; i < 100; i++) renderer.update(i * 1000);
    expect([...clock.uniforms.uClock as Float32Array]).not.toEqual(previous);
    expect(mesh.geometry).toBe(geometry);
    expect(renderer.meshCount).toBe(2);
    first.destroy({ children: true });
    expect(renderer.meshCount).toBe(1);
    expect(other.destroyed).toBe(false);
  });

  it("keeps the ring interior in the procedural shape and applies effect opacity", () => {
    const renderer = createRenderer();
    const effect = { ...fire, zone: { kind: "circle" as const, mode: "open" as const, radius: 200, innerRadiusRatio: 0.65 } };
    const container = renderer.createEffect(effect, 100);
    dispose.push(() => container.destroy({ children: true }));
    const mesh = container.children[0] as Mesh;
    const uniforms = mesh.shader!.resources.fireArea as UniformGroup;
    expect((uniforms.uniforms.uShape as Float32Array)[0]).toBe(2);
    expect((uniforms.uniforms.uShape as Float32Array)[1]).toBeCloseTo(1.3);
    expect(container.alpha).toBe(effect.opacity);
    expect(mesh.shader!.resources.uFuel).toBe(Texture.WHITE.source);
  });

  it("releases resources and rejects new effects after disposal", () => {
    const renderer = createRenderer();
    const container = renderer.createEffect(fire, 100);
    dispose.push(() => container.destroy({ children: true }));
    renderer.destroy();
    expect(renderer.meshCount).toBe(0);
    expect(() => renderer.destroy()).not.toThrow();
    expect(() => renderer.update(1000)).not.toThrow();
    expect(() => renderer.createEffect(fire, 100)).toThrow();
  });

  it("rasterizes a painted hex region once, then animates without touching its mask", () => {
    const renderer = createRenderer();
    const context = { scale: vi.fn(), translate: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), fillStyle: "", filter: "" };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((id: string) =>
      id === "2d" ? context : null) as HTMLCanvasElement["getContext"]);
    const cell = getGridCellAtPoint({ x: 0, y: 0 }, { cellSizeWorld: 100, layout: "hexagonal" });
    const effect = { ...fire, zone: { kind: "cells" as const, radius: 50, cells: [cell] } };
    const container = renderer.createEffect(effect, 100);
    dispose.push(() => container.destroy({ children: true }));
    const mesh = container.children[0] as Mesh;
    const mask = mesh.shader!.resources.uFuel;
    expect(context.lineTo).toHaveBeenCalledTimes(5);
    expect(context.fill).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 300; i++) renderer.update(i * 16.7);
    expect(context.fill).toHaveBeenCalledTimes(1);
    expect(mesh.shader!.resources.uFuel).toBe(mask);
  });

  it("reuses the production viewport mesh across redraws and frees it on deletion", () => {
    const { renderer, layer, viewport } = createViewportHarness();
    viewport.drawEffectsLayer();
    const original = layer.children[0];
    for (let i = 0; i < 100; i++) { renderer.update(i * 20); viewport.drawEffectsLayer(); }
    expect(layer.children[0]).toBe(original);
    expect(renderer.meshCount).toBe(1);
    viewport.effects = [];
    viewport.drawEffectsLayer();
    expect(renderer.meshCount).toBe(0);
  });

  it("changes opacity and light settings without rebuilding the mesh or resetting its clock", () => {
    const { viewport, layer, renderer } = createViewportHarness();
    viewport.drawEffectsLayer();
    const original = layer.children[0]!;
    const mesh = original.children[0] as Mesh;
    renderer.update(40_000);
    const clock = (mesh.shader!.resources.fireClock as UniformGroup).uniforms.uClock as Float32Array;
    const phase = [...clock];
    viewport.effects = [{ ...fire, opacity: 0.2, color: "#33bb77", emitsLight: false, lightRadius: 320 }];
    viewport.drawEffectsLayer();
    expect(layer.children[0]).toBe(original);
    expect(original.alpha).toBe(0.2);
    expect([...clock]).toEqual(phase);
    expect(renderer.meshCount).toBe(1);
  });

  it("releases invisible/zero-opacity fires and rebuilds them only when shown again", () => {
    const { viewport, layer, renderer } = createViewportHarness();
    viewport.drawEffectsLayer();
    const original = layer.children[0]!;
    viewport.effects = [{ ...fire, opacity: 0 }];
    viewport.drawEffectsLayer();
    expect(original.destroyed).toBe(true);
    expect(renderer.meshCount).toBe(0);
    viewport.effects = [fire];
    viewport.drawEffectsLayer();
    expect(renderer.meshCount).toBe(1);
    viewport.effects = [{ ...fire, visible: false }];
    viewport.drawEffectsLayer();
    expect(renderer.meshCount).toBe(0);
    expect(layer.children).toHaveLength(0);
  });

  it("does not reuse destroyed meshes after a player map load, including deletion during load", () => {
    const { viewport, layer, renderer } = createViewportHarness();
    viewport.viewRole = "player";
    viewport.drawEffectsLayer();
    const original = layer.children[0]!;
    viewport.isMapImageLoading = true;
    viewport.drawEffectsLayer();
    expect(renderer.meshCount).toBe(0);
    viewport.isMapImageLoading = false;
    viewport.drawEffectsLayer();
    expect(layer.children[0]).not.toBe(original);
    expect(layer.children[0]!.destroyed).toBe(false);
    expect(renderer.meshCount).toBe(1);
    viewport.isMapImageLoading = true;
    viewport.drawEffectsLayer();
    viewport.effects = [];
    viewport.isMapImageLoading = false;
    expect(() => viewport.drawEffectsLayer()).not.toThrow();
    expect(renderer.meshCount).toBe(0);
  });

  it("preserves cached fire through world transforms but rebuilds for grid/geometry changes", () => {
    const { viewport, layer, renderer } = createViewportHarness();
    viewport.drawEffectsLayer();
    const original = layer.children[0]!;
    layer.rotation = Math.PI / 2;
    layer.scale.set(0.1);
    layer.position.set(310, 170);
    viewport.drawEffectsLayer();
    expect(layer.children[0]).toBe(original);
    viewport.grid = { cellSizeWorld: 50 };
    viewport.drawEffectsLayer();
    expect(original.destroyed).toBe(true);
    const calibrated = layer.children[0]!;
    viewport.effects = [moveAnimatedFireEffect(fire, { x: 123, y: 321 })];
    viewport.drawEffectsLayer();
    expect(calibrated.destroyed).toBe(true);
    expect(renderer.meshCount).toBe(1);
  });

  it("removes DM fire guides immediately when switching to the player role", () => {
    const { viewport, selection } = createViewportHarness();
    viewport.drawSelectionLayer();
    expect(selection.children).toHaveLength(1);
    viewport.setViewRole("player");
    expect(selection.children).toHaveLength(0);
    viewport.setViewRole("dm");
    expect(selection.children).toHaveLength(1);
  });
});
