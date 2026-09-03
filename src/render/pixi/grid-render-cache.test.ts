import { describe, expect, it, vi } from "vitest";
import { Container, Graphics } from "pixi.js";
import { PixiViewport } from "./PixiViewport";
import { createDefaultScene } from "../../domain/sessions/default-scene";

interface Harness { drawGrid(): void; getGridBounds(): unknown; camera: { center: { x: number; y: number }; zoom: number } }

describe("grid render cache", () => {
  it("updates only the grid for line width changes and reuses the new geometry", () => {
    const layer = new Container();
    const scene = createDefaultScene();
    const drawDarkvisionLayer = vi.fn();
    const viewport = Object.assign(Object.create(PixiViewport.prototype) as Pick<PixiViewport, "setGrid">, {
      grid: scene.grid, gridWindowCache: null, layers: new Map([["grid", layer]]),
      camera: { center: { x: 0, y: 0 }, zoom: 1 },
      app: { renderer: { width: 1000, height: 800 } }, drawDarkvisionLayer
    });
    viewport.setGrid(scene.grid);
    const thin = layer.children[0] as Graphics;
    expect(thin.context.instructions[0]).toMatchObject({ action: "stroke", data: { style: { width: 1 } } });
    viewport.setGrid({ ...scene.grid, lineWidth: 3 });
    const thick = layer.children[0] as Graphics;
    expect(thick.context.instructions[0]).toMatchObject({ action: "stroke", data: { style: { width: 3 } } });
    expect(thin.destroyed).toBe(true);
    expect(drawDarkvisionLayer).not.toHaveBeenCalled();
    viewport.setGrid({ ...scene.grid, lineWidth: 3 });
    expect(layer.children[0]).toBe(thick);
    viewport.setGrid(scene.grid);
    expect(thick.destroyed).toBe(true);
    expect((layer.children[0] as Graphics).context.instructions[0]).toMatchObject({ data: { style: { width: 1 } } });
    layer.destroy({ children: true });
  });

  it("reuses identical settings without rebuilding effects or visibility masks", () => {
    const grid = createDefaultScene().grid;
    const drawGrid = vi.fn();
    const drawDarkvisionLayer = vi.fn();
    const viewport = Object.assign(Object.create(PixiViewport.prototype) as Pick<PixiViewport, "setGrid">, {
      grid, drawGrid, drawDarkvisionLayer
    });
    viewport.setGrid({ ...grid });
    expect(drawGrid).toHaveBeenCalledOnce();
    expect(drawDarkvisionLayer).not.toHaveBeenCalled();
  });

  it("pans within cached overscan without recreating geometry or growing fog bounds", () => {
    const layer = new Container();
    const viewport = Object.assign(Object.create(PixiViewport.prototype) as Harness, {
      grid: createDefaultScene().grid, gridWindowCache: null,
      mapSprite: null, layers: new Map([["grid", layer]]), camera: { center: { x: 0, y: 0 }, zoom: 1 },
      app: { renderer: { width: 1000, height: 800 } }
    });
    const maskBounds = viewport.getGridBounds();
    viewport.drawGrid();
    const original = layer.children[0];
    viewport.camera.center.x = 100;
    viewport.drawGrid();
    expect(layer.children[0]).toBe(original);
    viewport.camera.center.x = 50000;
    viewport.drawGrid();
    expect(layer.children).toHaveLength(1);
    expect(layer.children[0]).not.toBe(original);
    expect(original?.destroyed).toBe(true);
    expect(viewport.getGridBounds()).toEqual(maskBounds);
    layer.destroy({ children: true });
  });
});
