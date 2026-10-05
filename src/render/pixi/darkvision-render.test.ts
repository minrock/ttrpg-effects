// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorMatrixFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { createDynamicLightEffect } from "../../domain/effects/dynamic-light";
import { createDrawnFireEffect } from "../../domain/effects/fire";
import { createLightningEffect } from "../../domain/effects/lightning";
import { createLightSource } from "../../domain/lighting/lights";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { createPathShape, createTacticalShape, type TacticalShapeKind } from "../../domain/shapes/shapes";
import { PixiViewport } from "./PixiViewport";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); });

function createHarness() {
  const scene = createDefaultScene();
  const layer = new Container();
  const mapSprite = layer.addChild(new Sprite(Texture.WHITE));
  const colorMapSprite = layer.addChild(new Sprite(Texture.WHITE));
  colorMapSprite.visible = false;
  const grayscaleFilter = new ColorMatrixFilter();
  grayscaleFilter.desaturate();
  const viewport = Object.assign(Object.create(PixiViewport.prototype) as Pick<PixiViewport, "setLights" | "setDarkness" | "setShapes" | "setEffects" | "setViewRole">, {
    mapSprite, colorMapSprite, grayscaleFilter, darkvisionMask: null, darkvisionSignature: "",
    layers: new Map([["map", layer]]), viewRole: "player", grid: scene.grid,
    darkness: scene.darkness, lights: [], effects: [], shapes: [],
    previewLights: new Map(), previewEffects: new Map(), previewShapes: new Map(), dynamicLightRenderStates: new Map(),
    scheduleDarknessRedraw: vi.fn(), scheduleFogOfWarRedraw: vi.fn(),
    drawShapesAndMeasurementsLayer: vi.fn(), drawSelectionLayer: vi.fn(),
    drawLightsLayer: vi.fn(), drawLabelsLayer: vi.fn(), drawMapAnnotationsLayer: vi.fn(),
    drawEffectsLayer: vi.fn(), drawMagicalDarknessLayer: vi.fn(),
    applyCamera: vi.fn(), updatePlayerCameraControls: vi.fn(), updateAreaToolLabelScale: vi.fn()
  });
  const darkness = { ...scene.darkness, enabled: true, opacity: 1, darkvisionEnabled: true };
  const lights = [createLightSource("light", "point", { x: 100, y: 100 })];
  viewport.setLights(lights);
  viewport.setDarkness(darkness);
  cleanup.push(() => {
    colorMapSprite.mask = null;
    layer.destroy({ children: true });
    grayscaleFilter.destroy();
  });
  return { viewport, layer, mapSprite, colorMapSprite, grayscaleFilter, darkness, lights, scene };
}

describe("Player darkvision snapshot updates", () => {
  it.each<TacticalShapeKind>(["cone", "measurement", "circle", "rectangle", "path"])(
    "keeps the color mask attached across serialized snapshots adding a %s", kind => {
      const { viewport, colorMapSprite, mapSprite, grayscaleFilter, darkness, lights, scene, layer } = createHarness();
      const mask = colorMapSprite.mask as Graphics;
      const shape = kind === "path"
        ? createPathShape({ id: kind, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] })
        : createTacticalShape({ id: kind, kind, position: { x: 0, y: 0 }, grid: scene.grid, settings: scene.settings });

      for (let update = 0; update < 3; update++) {
        const snapshot = JSON.parse(JSON.stringify({ darkness, lights, shapes: [shape] }));
        viewport.setDarkness(snapshot.darkness);
        viewport.setShapes(snapshot.shapes);
        viewport.setLights(snapshot.lights);

        expect(colorMapSprite.visible).toBe(true);
        expect(colorMapSprite.mask).toBe(mask);
        expect(mask.includeInBuild).toBe(false);
        expect(mask.destroyed).toBe(false);
        expect(mapSprite.filters).toEqual([grayscaleFilter]);
        expect(layer.children).toHaveLength(3);
      }
    }
  );

  it.each(["line", "cone", "circle"] as const)("preserves dynamic-light color reveals when adding a lightning %s", shape => {
    const { viewport, colorMapSprite, darkness, layer } = createHarness();
    viewport.setLights([]);
    const light = createDynamicLightEffect("torch", { x: 100, y: 100 });
    viewport.setEffects([light]);
    const mask = colorMapSprite.mask as Graphics;
    const lightning = createLightningEffect("lightning", shape, { x: 0, y: 0 }, { x: 200, y: 100 }, 0);
    for (let update = 0; update < 3; update++) {
      viewport.setDarkness({ ...darkness });
      viewport.setEffects(JSON.parse(JSON.stringify([light, lightning])));
      expect(colorMapSprite.visible).toBe(true);
      expect(colorMapSprite.mask).toBe(mask);
      expect(mask.includeInBuild).toBe(false);
      expect(layer.children).toHaveLength(3);
    }
    viewport.setEffects([{ ...light, dimRadiusCells: 6 }, lightning]);
    expect(mask.destroyed).toBe(true);
    expect(colorMapSprite.visible).toBe(true);
    expect(colorMapSprite.mask).toBeInstanceOf(Graphics);
  });

  it("rebuilds the reveal for new fire geometry and retains it on the next snapshot", () => {
    const { viewport, colorMapSprite, darkness } = createHarness();
    const originalMask = colorMapSprite.mask as Graphics;
    const fire = createDrawnFireEffect("fire", "cone", { x: 0, y: 0 }, { x: 200, y: 100 }, 100);
    viewport.setEffects([fire]);
    expect(originalMask.destroyed).toBe(true);
    const fireMask = colorMapSprite.mask as Graphics;
    viewport.setDarkness({ ...darkness });
    viewport.setEffects(JSON.parse(JSON.stringify([fire])));
    expect(colorMapSprite.visible).toBe(true);
    expect(colorMapSprite.mask).toBe(fireMask);
    expect(fireMask.includeInBuild).toBe(false);
  });

  it("keeps an unlit map grayscale through repeated snapshots without creating an empty mask", () => {
    const { viewport, colorMapSprite, mapSprite, grayscaleFilter, darkness, layer } = createHarness();
    viewport.setLights([]);
    for (let update = 0; update < 3; update++) {
      viewport.setDarkness({ ...darkness });
      expect(colorMapSprite.visible).toBe(false);
      expect(colorMapSprite.mask).toBeFalsy();
      expect(mapSprite.filters).toEqual([grayscaleFilter]);
      expect(layer.children).toHaveLength(2);
    }
  });

  it("removes the mask when disabled and recreates it when enabled again", () => {
    const { viewport, colorMapSprite, mapSprite, darkness, layer } = createHarness();
    const originalMask = colorMapSprite.mask as Graphics;
    viewport.setDarkness({ ...darkness, darkvisionEnabled: false });
    expect(originalMask.destroyed).toBe(true);
    expect(colorMapSprite.mask).toBeFalsy();
    expect(colorMapSprite.visible).toBe(false);
    expect(mapSprite.filters?.length ?? 0).toBe(0);
    expect(layer.children).toHaveLength(2);
    viewport.setDarkness(darkness);
    expect(colorMapSprite.visible).toBe(true);
    expect(colorMapSprite.mask).toBeInstanceOf(Graphics);
    expect(colorMapSprite.mask).not.toBe(originalMask);
  });

  it("rebuilds only when lighting changes and removes the last color reveal", () => {
    const { viewport, colorMapSprite, mapSprite, grayscaleFilter, darkness, lights, layer } = createHarness();
    const originalMask = colorMapSprite.mask as Graphics;
    viewport.setLights([{ ...lights[0]!, radius: 240 }]);
    expect(originalMask.destroyed).toBe(true);
    const resizedMask = colorMapSprite.mask as Graphics;
    expect(resizedMask).not.toBe(originalMask);
    viewport.setDarkness({ ...darkness });
    expect(colorMapSprite.mask).toBe(resizedMask);
    expect(colorMapSprite.visible).toBe(true);
    viewport.setLights([]);
    expect(resizedMask.destroyed).toBe(true);
    expect(colorMapSprite.mask).toBeFalsy();
    expect(colorMapSprite.visible).toBe(false);
    expect(mapSprite.filters).toEqual([grayscaleFilter]);
    expect(layer.children).toHaveLength(2);
  });

  it("keeps DM full color and restores the Player mask when changing roles", () => {
    const { viewport, colorMapSprite, mapSprite, darkness } = createHarness();
    viewport.setViewRole("dm");
    viewport.setDarkness({ ...darkness });
    expect(colorMapSprite.visible).toBe(false);
    expect(colorMapSprite.mask).toBeFalsy();
    expect(mapSprite.filters?.length ?? 0).toBe(0);
    viewport.setViewRole("player");
    expect(colorMapSprite.visible).toBe(true);
    expect(colorMapSprite.mask).toBeInstanceOf(Graphics);
  });
});
