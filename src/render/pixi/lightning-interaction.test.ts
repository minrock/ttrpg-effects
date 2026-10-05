// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Container, RendererType } from "pixi.js";
import { PixiViewport, type PixiViewportOptions } from "./PixiViewport";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { createLightningEffect } from "../../domain/effects/lightning";
import { createDrawnFireEffect } from "../../domain/effects/fire";
import type { LightningDraft } from "../../domain/interaction/interaction-state";
import type { SceneLightningEffect, SceneFireEffect } from "../../domain/sessions/scene-document";
import { renderLayerNames } from "../../domain/map/render-layers";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
interface InteractionHarness {
  effectDraft: LightningDraft | null;
  effects: readonly (SceneLightningEffect | SceneFireEffect)[];
  selectedElementId: string | null;
  dragState: { mode: string } | null;
  previewEffects: Map<string, SceneLightningEffect | SceneFireEffect>;
  setEffectTool(kind: "fire" | "lightning", shape: "line" | "cone" | "circle" | null, resetKey?: string): void;
  setLightningTool(shape: "line" | "cone" | "circle" | null, resetKey?: string): void;
  setGrabMode(value: boolean): void;
  handlePointerDown(event: PointerEvent): void;
  handlePointerMove(event: PointerEvent): void;
  handlePointerUp(event: PointerEvent): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleEffectCaptureLost(): void;
  flushPendingViewportUpdates(): void;
  cancelPendingViewportUpdates(): void;
}
const cleanup: (() => void)[] = [];
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { for (const dispose of cleanup.splice(0)) dispose(); vi.unstubAllGlobals(); });

function harness() {
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.setPointerCapture = vi.fn();
  const onLightningCreate = vi.fn(), onLightningChange = vi.fn();
  const onFireCreate = vi.fn(), onFireChange = vi.fn();
  const options: PixiViewportOptions = { onLightningCreate, onLightningChange, onFireCreate, onFireChange };
  // Construct the real pointer handlers without initializing a GPU/window.
  const viewport = Reflect.construct(PixiViewport, [host, options]) as InteractionHarness;
  const layers = new Map(renderLayerNames.map(name => [name, new Container()]));
  const scene = createDefaultScene();
  Object.assign(viewport, {
    app: { canvas, renderer: { width: 1000, height: 800, type: RendererType.WEBGL } }, layers,
    grid: scene.grid, settings: { ...scene.settings, snapToGrid: false },
    drawInteractiveElements: vi.fn(), drawDarkvisionLayer: vi.fn(), drawDarknessLayer: vi.fn(), drawFogOfWarLayer: vi.fn(),
    drawEffectPreviewLayers: vi.fn(),
    applyCamera: vi.fn()
  });
  cleanup.push(() => { viewport.cancelPendingViewportUpdates(); for (const layer of layers.values()) layer.destroy({ children: true }); });
  const event = (x: number, y: number, type = "pointerup") => Object.assign(new MouseEvent(type, { clientX: x, clientY: y, button: 0 }), { pointerId: 1 }) as PointerEvent;
  const click = (x: number, y: number) => { viewport.handlePointerDown(event(x, y, "pointerdown")); viewport.handlePointerUp(event(x, y)); };
  return { viewport, canvas, click, event, onLightningCreate, onLightningChange, onFireCreate, onFireChange };
}

describe("lightning pointer workflow", () => {
  it.each(["line", "cone", "circle"] as const)("creates %s only after two valid clicks, with a transient preview", shape => {
    const { viewport, click, event, onLightningCreate } = harness();
    viewport.setLightningTool(shape, "map-1");
    click(400, 300);
    const anchor = viewport.effectDraft?.anchor;
    expect(anchor).toEqual({ x: -100, y: -100 });
    click(400, 300); expect(onLightningCreate).not.toHaveBeenCalled();
    viewport.handlePointerMove(event(700, 400, "pointermove")); viewport.flushPendingViewportUpdates();
    expect(viewport.effectDraft?.pointer).toEqual({ x: 200, y: 0 });
    expect(viewport.effects).toHaveLength(0);
    click(700, 400);
    expect(onLightningCreate).toHaveBeenCalledExactlyOnceWith(shape, anchor, { x: 200, y: 0 });
    expect(viewport.effectDraft).toBeNull();
  });

  it("preserves the draft during Space pan and drops it on tool/map reset", () => {
    const { viewport, click, event, onLightningCreate } = harness();
    viewport.setLightningTool("line", "map-1"); click(400, 300);
    const anchor = viewport.effectDraft?.anchor;
    viewport.setGrabMode(true);
    viewport.handlePointerDown(event(600, 500));
    expect(viewport.dragState?.mode).toBe("pan");
    viewport.handlePointerMove(event(700, 500)); viewport.handlePointerUp(event(700, 500));
    viewport.setGrabMode(false);
    expect(viewport.effectDraft?.anchor).toBe(anchor); expect(onLightningCreate).not.toHaveBeenCalled();
    viewport.setLightningTool("line", "map-2"); expect(viewport.effectDraft?.anchor).toBeNull();
    click(300, 300); viewport.setLightningTool(null); expect(viewport.effectDraft).toBeNull();
  });

  it("never confirms on pointer cancellation or a release outside the canvas", () => {
    const { viewport, click, event, onLightningCreate } = harness();
    viewport.setLightningTool("circle"); click(400, 300);
    viewport.handlePointerDown(event(650, 350)); viewport.handlePointerUp(event(650, 350, "pointercancel"));
    viewport.handlePointerDown(event(1100, 400)); viewport.handlePointerUp(event(1100, 400));
    expect(onLightningCreate).not.toHaveBeenCalled(); expect(viewport.effects).toHaveLength(0);
  });

  it("previews geometry locally and commits once at release; Escape/lost capture cancel", () => {
    const { viewport, event, onLightningChange } = harness();
    const effect = createLightningEffect("l", "line", { x: -100, y: -100 }, { x: 100, y: -100 }, 0);
    viewport.effects = [effect]; viewport.selectedElementId = "l";
    viewport.handlePointerDown(event(600, 300));
    expect(viewport.dragState?.mode).toBe("effect-edit");
    viewport.handlePointerMove(event(700, 350)); viewport.flushPendingViewportUpdates();
    expect(onLightningChange).not.toHaveBeenCalled(); expect(viewport.effects[0]).toBe(effect);
    viewport.handlePointerUp(event(710, 360));
    expect(onLightningChange).toHaveBeenCalledTimes(1);
    expect(onLightningChange.mock.calls[0]?.[0].zone.end).toEqual({ x: 210, y: -40 });
    viewport.previewEffects.clear();
    for (const cancel of [() => viewport.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" })), () => viewport.handleEffectCaptureLost()]) {
      viewport.handlePointerDown(event(600, 300)); viewport.handlePointerMove(event(800, 350)); viewport.flushPendingViewportUpdates();
      cancel(); viewport.handlePointerUp(event(800, 350));
      expect(viewport.dragState).toBeNull(); expect(viewport.previewEffects.size).toBe(0);
      expect(onLightningChange).toHaveBeenCalledTimes(1);
    }
  });
});

describe("fire drawing pointer workflow", () => {
  it.each(["line", "cone", "circle"] as const)("creates %s only after the second valid click, never publishing its draft", shape => {
    const { viewport, click, event, onFireCreate, onLightningCreate } = harness();
    viewport.setEffectTool("fire", shape, "map-1"); click(400, 300);
    const anchor = viewport.effectDraft?.anchor;
    click(400, 300); expect(onFireCreate).not.toHaveBeenCalled();
    viewport.handlePointerMove(event(700, 400)); viewport.flushPendingViewportUpdates();
    expect(viewport.effectDraft?.pointer).toEqual({ x: 200, y: 0 }); expect(viewport.effects).toHaveLength(0);
    click(700, 400); expect(onFireCreate).toHaveBeenCalledExactlyOnceWith(shape, anchor, { x: 200, y: 0 });
    expect(onLightningCreate).not.toHaveBeenCalled(); expect(viewport.effectDraft).toBeNull();
  });
  it("switches effect families without inheriting an anchor and cancels on map change", () => {
    const { viewport, click, onFireCreate } = harness();
    viewport.setEffectTool("lightning", "line", "a"); click(400, 300);
    viewport.setEffectTool("fire", "line", "a"); expect(viewport.effectDraft?.anchor).toBeNull();
    click(500, 400); viewport.setEffectTool("fire", "line", "b"); expect(viewport.effectDraft?.anchor).toBeNull();
    expect(onFireCreate).not.toHaveBeenCalled();
  });
  it("edits a fire endpoint once at release and rolls back on loss of capture", () => {
    const { viewport, event, onFireChange, onLightningChange } = harness();
    const effect = createDrawnFireEffect("f", "line", { x: -100, y: -100 }, { x: 100, y: -100 }, 50);
    viewport.effects = [effect]; viewport.selectedElementId = "f";
    viewport.handlePointerDown(event(600, 300)); expect(viewport.dragState?.mode).toBe("effect-edit");
    viewport.handlePointerMove(event(700, 350)); viewport.flushPendingViewportUpdates(); expect(onFireChange).not.toHaveBeenCalled();
    viewport.handlePointerUp(event(710, 360)); expect(onFireChange).toHaveBeenCalledTimes(1);
    expect(onFireChange.mock.calls[0]?.[0].zone.end).toEqual({ x: 210, y: -40 });
    expect(onLightningChange).not.toHaveBeenCalled();
    viewport.previewEffects.clear(); viewport.handlePointerDown(event(600, 300)); viewport.handlePointerMove(event(800, 350)); viewport.flushPendingViewportUpdates();
    viewport.handleEffectCaptureLost(); viewport.handlePointerUp(event(800, 350));
    expect(onFireChange).toHaveBeenCalledTimes(1); expect(viewport.previewEffects.size).toBe(0);
  });
});

describe.each(["fire", "lightning"] as const)("%s drawing cursor lifecycle", kind => {
  it.each(["line", "cone", "circle"] as const)("restores selection cursor immediately after confirming %s", shape => {
    const { viewport, canvas, click, event, onFireCreate, onLightningCreate } = harness();
    viewport.setEffectTool(kind, shape, "map-1");
    expect(canvas.style.cursor).toBe("crosshair");
    click(400, 300);
    expect(canvas.style.cursor).toBe("crosshair");
    click(700, 400);
    expect(viewport.effectDraft).toBeNull();
    expect(canvas.style.cursor).toBe("default");

    // React switches back to selection after the viewport already cleared its draft.
    viewport.setEffectTool("lightning", null, "map-1");
    viewport.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
    viewport.handlePointerMove(event(750, 500));
    viewport.flushPendingViewportUpdates();
    click(750, 500);
    expect(viewport.effectDraft).toBeNull();
    expect(canvas.style.cursor).toBe("default");
    expect(kind === "fire" ? onFireCreate : onLightningCreate).toHaveBeenCalledTimes(1);
  });

  it("clears the cursor and queued preview when cancelling an unfinished circle", () => {
    const { viewport, canvas, click, event, onFireCreate, onLightningCreate } = harness();
    viewport.setEffectTool(kind, "circle", "map-1");
    click(400, 300);
    viewport.handlePointerMove(event(700, 400));
    viewport.setEffectTool("lightning", null, "map-1");
    viewport.flushPendingViewportUpdates();
    expect(viewport.effectDraft).toBeNull();
    expect(canvas.style.cursor).toBe("default");
    click(700, 400);
    expect(onFireCreate).not.toHaveBeenCalled();
    expect(onLightningCreate).not.toHaveBeenCalled();
  });
});
