// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Container, Mesh, RendererType, Text } from "pixi.js";
import { createLightningEffect, moveLightningEffect, updateLightningEffect } from "../../domain/effects/lightning";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { SceneLightningEffect } from "../../domain/sessions/scene-document";
import { renderLayerNames } from "../../domain/map/render-layers";
import { PixiViewport } from "./PixiViewport";
import { LightningVisual, lightningVertexBudget, MAX_LIGHTNING_MAP_VERTICES } from "./lightning-visual";
import { lightningHandles, hitTestLightningHandle } from "./lightning-guides";
import { createLightningBuffers, writeLightningDischarge } from "./lightning-discharge";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); vi.restoreAllMocks(); });
const effect = createLightningEffect("bolt", "cone", { x: 100, y: 200 }, { x: 600, y: 200 }, 1000);

interface Harness {
  effects: readonly SceneLightningEffect[];
  selectedElementId: string | null;
  viewRole: "dm" | "player";
  isMapImageLoading: boolean;
  lightningVisuals: Map<string, LightningVisual>;
  drawEffectsLayer(): void;
  drawSelectionLayer(): void;
}
function harness() {
  const scene = createDefaultScene();
  const effectsLayer = new Container(), selection = new Container();
  const viewport: Harness = Object.assign(Object.create(PixiViewport.prototype) as Harness, {
    effects: [effect], elements: [], previewEffects: new Map(), previewShapes: new Map(), previewLights: new Map(),
    shapes: [], lights: [], tokens: [], labels: [], mapAnnotations: scene.mapAnnotations, settings: scene.settings, grid: scene.grid,
    app: { renderer: { type: RendererType.WEBGL } }, layers: new Map([["effects", effectsLayer], ["selection", selection]]),
    camera: { center: { x: 0, y: 0 }, zoom: 1 }, lightningVisuals: new Map(), effectRenderCache: new Map(),
    viewRole: "dm", map: {}, mapSprite: {}, isMapImageLoading: false, selectedElementId: null,
    fogRevealGuideRadius: null, lightningDraft: null, updateAreaToolLabelScale: vi.fn()
  });
  cleanup.push(() => { for (const visual of viewport.lightningVisuals.values()) visual.destroy(); effectsLayer.destroy({ children: true }); selection.destroy({ children: true }); });
  return { viewport, effectsLayer, selection };
}

describe("lightning production renderer", () => {
  it("reuses GPU geometry and guide across pan, zoom, direction, position and visual controls", () => {
    vi.spyOn(Date, "now").mockReturnValue(2000);
    const { viewport, effectsLayer } = harness();
    viewport.drawEffectsLayer();
    const root = effectsLayer.children[0]!;
    const guide = root.children[0]!;
    const body = root.children[1]!;
    const meshes = body.children[0]!.children as Mesh[];
    const geometry = meshes.map(mesh => mesh.geometry);
    const buffers = geometry.map(item => item.getBuffer("aPosition"));
    for (let i = 0; i < 30; i++) {
      effectsLayer.rotation = i * Math.PI / 2; effectsLayer.scale.set(0.05 + i / 10);
      viewport.effects = [{ ...effect, intensity: 0.4 + i / 30, opacity: 0.5 }];
      viewport.drawEffectsLayer();
      expect(effectsLayer.children[0]).toBe(root);
      expect(root.children[0]).toBe(guide);
      expect(meshes.map(mesh => mesh.geometry)).toEqual(geometry);
      expect(meshes.map(mesh => mesh.geometry.getBuffer("aPosition"))).toEqual(buffers);
    }
    viewport.effects = [moveLightningEffect(updateLightningEffect(effect, { direction: 90 }, 2000), { x: -100, y: 30 })];
    viewport.drawEffectsLayer();
    expect(effectsLayer.children[0]).toBe(root);
    expect(body.rotation).toBeCloseTo(Math.PI / 2);
    expect(meshes.map(mesh => mesh.geometry)).toEqual(geometry);
    expect(guide.destroyed).toBe(true);
    expect(meshes.every(mesh => !mesh.filters?.length && !mesh.mask)).toBe(true);
  });

  it("shares geometry/phase at the same instant in both windows, including after rehydration", () => {
    const dm = new LightningVisual(effect, true, 8192), player = new LightningVisual(effect, true, 8192);
    cleanup.push(() => { dm.destroy(); player.destroy(); });
    dm.update(1791000000000); player.update(1791000000000);
    const meshes = (visual: LightningVisual) => visual.container.children[1]!.children[0]!.children as Mesh[];
    for (let i = 0; i < 2; i++) {
      expect(meshes(dm)[i]!.geometry.positions).toEqual(meshes(player)[i]!.geometry.positions);
      expect(meshes(dm)[i]!.shader!.resources.lightning.uniforms).toEqual(meshes(player)[i]!.shader!.resources.lightning.uniforms);
    }
  });

  it("shares guides below fog, but keeps measurement and handles in the DM selection layer", () => {
    const { viewport, effectsLayer, selection } = harness();
    viewport.drawEffectsLayer(); viewport.drawSelectionLayer();
    expect(effectsLayer.children[0]!.children).toHaveLength(2);
    expect(selection.children[0]?.children.some(child => child instanceof Text)).toBe(true);
    viewport.viewRole = "player"; viewport.drawSelectionLayer();
    expect(selection.children).toHaveLength(0);
    expect(renderLayerNames.indexOf("effects")).toBeLessThan(renderLayerNames.indexOf("fogOfWar"));
    expect(renderLayerNames.indexOf("effects")).toBeLessThan(renderLayerNames.indexOf("magicalDarkness"));
    viewport.effects = [{ ...effect, showGuide: false }]; viewport.drawEffectsLayer();
    expect(effectsLayer.children[0]!.children).toHaveLength(1);
    viewport.viewRole = "dm"; viewport.selectedElementId = effect.id; viewport.drawSelectionLayer();
    expect(selection.children).toHaveLength(1);
    expect(selection.children[0]!.children).toHaveLength(3);
  });

  it("releases hidden, transparent, deleted and unloaded effects safely", () => {
    const { viewport, effectsLayer } = harness();
    for (const hidden of [{ ...effect, visible: false }, { ...effect, opacity: 0 }]) {
      viewport.effects = [effect]; viewport.drawEffectsLayer();
      const root = effectsLayer.children[0]!;
      viewport.effects = [hidden]; viewport.drawEffectsLayer();
      expect(root.destroyed).toBe(true); expect(viewport.lightningVisuals.size).toBe(0);
    }
    viewport.effects = [effect]; viewport.viewRole = "player"; viewport.drawEffectsLayer();
    const root = effectsLayer.children[0]!;
    viewport.isMapImageLoading = true; viewport.drawEffectsLayer();
    expect(root.destroyed).toBe(true);
    viewport.isMapImageLoading = false; viewport.drawEffectsLayer();
    expect(effectsLayer.children[0]).not.toBe(root);
    viewport.effects = []; viewport.drawEffectsLayer();
    expect(viewport.lightningVisuals.size).toBe(0); expect(effectsLayer.children).toHaveLength(0);
  });

  it("keeps rotation and radius handles separate for small cones at minimum zoom", () => {
    for (const zoom of [0.03, 0.1, 1, 4]) {
      for (const radius of [10, 64, 100, 384]) {
        const cone = updateLightningEffect(effect, { radius }, 0);
        const handles = lightningHandles(cone, zoom);
        for (const handle of handles) expect(hitTestLightningHandle(cone, handle.point, zoom)).toBe(handle.kind);
      }
    }
  });

  it("provides a static fallback without shader meshes", () => {
    const visual = new LightningVisual(effect, false, 8192);
    cleanup.push(() => visual.destroy());
    const body = visual.container.children[1]!;
    expect(body.children[0]).not.toBeInstanceOf(Mesh);
    visual.update(10000000);
    expect(visual.container.children).toHaveLength(2);
  });
});

describe("lightning aggregate geometry budget", () => {
  it.each([1, 3, 24, 100])("bounds both banks across %s effects", count => {
    const budget = lightningVertexBudget(count);
    expect(budget * count * 2).toBeLessThanOrEqual(MAX_LIGHTNING_MAP_VERTICES);
    const data = createLightningBuffers();
    for (const shape of ["line", "cone", "circle"] as const) {
      writeLightningDischarge(data, { shape, size: 10000, seed: 2, sparks: true, maxVertices: budget, constrainArea: true }, 4);
      expect(data.vertices).toBeGreaterThan(0); expect(data.vertices).toBeLessThanOrEqual(budget);
      expect(data.positions.subarray(0, data.vertices * 2).every(Number.isFinite)).toBe(true);
    }
  });

  it.each(["cone", "circle"] as const)("keeps %s main centerlines in the true area at any size", shape => {
    const data = createLightningBuffers();
    for (const size of [20, 400, 100000]) {
      for (let epoch = 0; epoch < 10; epoch++) {
        writeLightningDischarge(data, { shape, size, seed: 13, sparks: false, constrainArea: true }, epoch);
        for (let i = 0; i < data.vertices; i += 2) {
          const x = (data.positions[i * 2]! + data.positions[i * 2 + 2]!) / 2 + (shape === "cone" ? size / 2 : 0);
          const y = (data.positions[i * 2 + 1]! + data.positions[i * 2 + 3]!) / 2;
          expect(Math.hypot(x, y)).toBeLessThanOrEqual(size * (shape === "circle" ? 0.5 : 1) + 0.01);
          if (shape === "cone" && Math.hypot(x, y) > 0.01) expect(Math.abs(Math.atan2(y, x))).toBeLessThanOrEqual(Math.PI / 6 + 0.00001);
        }
      }
    }
  });
});
