import { afterEach, describe, expect, it } from "vitest";
import { Container, Texture, TextureSource, Sprite } from "pixi.js";
import { createAnimatedFireEffect } from "../../domain/effects/fire";
import type { SceneFireEffect } from "../../domain/sessions/scene-document";
import { PixiViewport } from "./PixiViewport";
import { FirePatternAnimation } from "./fire-pattern-animation";
import atlas from "./fire-preview-atlas.json";
import { createFireFlameLayout, MAX_FIRE_FLAMES_PER_EFFECT, MAX_FIRE_FLAMES_PER_VIEWPORT } from "./fire-pattern-layout";

interface EffectRenderHarness {
  effects: SceneFireEffect[];
  grid: { cellSizeWorld: number };
  isMapImageLoading: boolean;
  effectRenderCache: Map<string, { signature: string; container: Container }>;
  drawEffectsLayer(): void;
}

const cleanup: (() => void)[] = [];

function createHarness() {
  const texture = new Texture({ source: new TextureSource({ width: atlas.width, height: atlas.height }) });
  const animation = new FirePatternAnimation(texture);
  const layer = new Container();
  // Exercise the real effect renderer/cache without creating an Electron/WebGL window.
  const viewport = Object.assign(Object.create(PixiViewport.prototype) as EffectRenderHarness, {
    effects: [createAnimatedFireEffect("fire-1", { x: 100, y: 100 })],
    elements: [],
    previewEffects: new Map(),
    grid: { cellSizeWorld: 100 },
    layers: new Map([["effects", layer]]),
    effectRenderCache: new Map(),
    firePatternSource: animation,
    viewRole: "player",
    map: {},
    mapSprite: {},
    isMapImageLoading: false
  });
  cleanup.push(() => {
    layer.destroy({ children: true });
    animation.destroy();
    texture.destroy(true);
  });
  return { viewport, layer, animation };
}

afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); });

describe("fire pattern render cache", () => {
  it("keeps the same geometry and sprites through repeated unchanged redraws", () => {
    const { viewport, animation } = createHarness();
    viewport.drawEffectsLayer();
    const original = viewport.effectRenderCache.get("fire-1")!.container;
    for (let i = 0; i < 120; i++) {
      animation.update(i * 40);
      viewport.drawEffectsLayer();
    }
    expect(viewport.effectRenderCache.get("fire-1")!.container).toBe(original);
    expect(animation.spriteCount).toBe(createFireFlameLayout(viewport.effects[0]!, 100).length);
  });

  it("releases old sprites on geometry changes and deletion", () => {
    const { viewport, animation } = createHarness();
    for (let i = 0; i < 100; i++) {
      viewport.effects = [{ ...viewport.effects[0]!, position: { x: i, y: i } }];
      viewport.drawEffectsLayer();
      expect(animation.spriteCount).toBe(createFireFlameLayout(viewport.effects[0]!, 100).length);
    }
    viewport.effects = [];
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBe(0);
  });

  it("bounds sprite count across thousands of cells", () => {
    const { viewport, animation } = createHarness();
    viewport.effects = [{ ...viewport.effects[0]!, zone: {
      kind: "cells", radius: 50,
      cells: Array.from({ length: 2000 }, (_, i) => ({ x: (i % 50) * 100, y: Math.floor(i / 50) * 100, size: 100 }))
    } }];
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBeLessThanOrEqual(MAX_FIRE_FLAMES_PER_EFFECT);
    expect(animation.spriteCount).toBeGreaterThan(1);
  });

  it("rebuilds density when the grid changes without retaining previous sprites", () => {
    const { viewport, animation, layer } = createHarness();
    viewport.drawEffectsLayer();
    const original = layer.children[0]!;
    viewport.grid = { cellSizeWorld: 50 };
    viewport.drawEffectsLayer();
    const next = layer.children[0]!;
    expect(next).not.toBe(original);
    expect(original.destroyed).toBe(true);
    const sprite = next.children[0]!.children.find((child) => child instanceof Sprite) as Sprite;
    const expected = createFireFlameLayout(viewport.effects[0]!, 50);
    expect(sprite.width).toBeCloseTo(expected[0]!.width);
    expect(animation.spriteCount).toBe(expected.length);
  });

  it("rebuilds destroyed cached containers when the player map finishes loading", () => {
    const { viewport, animation, layer } = createHarness();
    viewport.drawEffectsLayer();
    const original = layer.children[0]!;
    viewport.isMapImageLoading = true;
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBe(0);
    viewport.isMapImageLoading = false;
    viewport.drawEffectsLayer();
    expect(layer.children[0]).not.toBe(original);
    expect(layer.children[0]?.destroyed).toBe(false);
    expect(animation.spriteCount).toBe(createFireFlameLayout(viewport.effects[0]!, 100).length);
  });

  it("can delete fire while loading a player map without destroying it twice", () => {
    const { viewport, animation } = createHarness();
    viewport.drawEffectsLayer();
    viewport.isMapImageLoading = true;
    viewport.drawEffectsLayer();
    viewport.effects = [];
    viewport.isMapImageLoading = false;
    expect(() => viewport.drawEffectsLayer()).not.toThrow();
    expect(animation.spriteCount).toBe(0);
  });

  it("keeps complete frames unmasked at the boundary and increases opacity", () => {
    const { viewport, layer } = createHarness();
    viewport.drawEffectsLayer();
    const pattern = layer.children[0]!.children[0]!;
    expect(pattern.effects).toHaveLength(0);
    expect(pattern.alpha).toBe(viewport.effects[0]!.opacity);
    const sprites = pattern.children.filter((child) => child instanceof Sprite) as Sprite[];
    expect(new Set(sprites.map((sprite) => sprite.texture)).size).toBeGreaterThan(1);
    for (const sprite of sprites) {
      expect(sprite.effects).toHaveLength(0);
      expect(sprite.alpha).toBeGreaterThanOrEqual(0.92);
      expect(sprite.texture.width).toBe(128);
      expect(sprite.texture.height).toBe(160);
    }
  });

  it("does not animate fully transparent flames and releases their previous sprites", () => {
    const { viewport, animation } = createHarness();
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBeGreaterThan(0);
    viewport.effects = [{ ...viewport.effects[0]!, opacity: 0 }];
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBe(0);
  });

  it("budgets dense fires across a viewport without leaking rebuilt sprites", () => {
    const { viewport, animation } = createHarness();
    viewport.effects = Array.from({ length: 20 }, (_, i) => ({
      ...createAnimatedFireEffect(`fire-${i}`, { x: i * 1000, y: 0 }),
      zone: { kind: "circle" as const, mode: "closed" as const, radius: 2000, innerRadiusRatio: 0 }
    }));
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBeLessThanOrEqual(MAX_FIRE_FLAMES_PER_VIEWPORT);
    const original = viewport.effectRenderCache.get("fire-0")!.container;
    viewport.effects.push({ ...viewport.effects[0]!, id: "fire-extra" });
    viewport.drawEffectsLayer();
    expect(viewport.effectRenderCache.get("fire-0")!.container).toBe(original);
    viewport.effects = viewport.effects.slice(0, 1);
    viewport.drawEffectsLayer();
    expect(animation.spriteCount).toBe(MAX_FIRE_FLAMES_PER_EFFECT);
  });
});
