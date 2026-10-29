// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDaytimeFilter } from "../../../domain/environment/daytime-filter";
import type { SceneDocument, SceneFireEffect } from "../../../domain/sessions/scene-document";
import { parseSceneDocument } from "../../../domain/sessions/scene-schema";
import type { PixiViewportOptions } from "../../../render/pixi/PixiViewport";
import { LabCanvas, type LabCanvasProps } from "./LabCanvas";
import { createLabScene, LAB_SCENE_IDS } from "./fixture";

const engine = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../../../render/pixi/PixiViewport", () => ({ PixiViewport: { create: engine.create } }));

function makeViewport() {
  return Object.fromEntries([
    "destroy", "setViewRole", "setReadOnly", "setNavigationEnabled", "setFogPresentation",
    "setHiddenTokenPolicy", "setShowMapAnnotations", "setMap", "setGrid", "setZoomLocked",
    "setSettings", "setDarkness", "setFogOfWar", "setDaytimeFilter", "setShapes", "setLights",
    "setEffects", "setTokens", "setLabels", "setMapAnnotations", "setCompassOrientation",
    "setBackgroundColor", "setSelectedElementId", "setCameraSnapshot", "setEffectTool",
    "setFirePaintMode", "setArcanePointerMode", "setGrabMode", "setRoomPinMode",
    "setInformationAreaMode", "setFogRevealMode"
  ].map(name => [name, vi.fn()]));
}

describe("UI lab canvas adapter", () => {
  let host: HTMLDivElement;
  let root: Root;
  let props: LabCanvasProps;
  let options: PixiViewportOptions;
  let viewport: ReturnType<typeof makeViewport>;

  async function render(patch: Partial<LabCanvasProps> = {}): Promise<void> {
    props = { ...props, ...patch };
    await act(async () => root.render(<LabCanvas {...props} />));
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    engine.create.mockReset();
    viewport = makeViewport();
    options = {};
    engine.create.mockImplementation(async (_host: HTMLElement, callbacks: PixiViewportOptions) => {
      options = callbacks;
      return viewport;
    });
    props = {
      scene: createLabScene(), imageUrl: "/assets/lab/cloister-map.png", tool: "select", shape: "circle",
      selectedId: null, camera: { center: { x: 0, y: 0 }, zoom: 0.8 },
      onCameraChange: vi.fn(), onSelect: vi.fn(), onSceneChange: vi.fn(), onReady: vi.fn(), onError: vi.fn(), onToolComplete: vi.fn()
    };
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("creates a fresh valid fixture with stable IDs and matching active-map fields", () => {
    const scene = createLabScene();
    expect(parseSceneDocument(scene)).toEqual(scene);
    expect(scene.maps).toHaveLength(1);
    expect(scene.maps[0]).toMatchObject({
      id: LAB_SCENE_IDS.map, name: "Claustro del rio", compassOrientation: 0,
      map: { imagePath: null, imageSize: { width: 1536, height: 1024 }, position: { x: 0, y: 0 }, scale: 1 },
      grid: { cellSizeWorld: 64 }, darkness: { enabled: false }
    });
    expect(scene.daytimeFilter).toEqual(createDefaultDaytimeFilter());
    expect([scene.id, ...scene.effects.map(item => item.id), ...scene.lights.map(item => item.id), ...scene.shapes.map(item => item.id), ...scene.mapAnnotations.pins.map(item => item.id)])
      .toEqual(Object.values(LAB_SCENE_IDS));
    expect(scene.maps[0].effects).toBe(scene.effects);
    expect(scene.effects[0]).not.toBe(createLabScene().effects[0]);
  });

  it("applies current props after delayed creation and uses fresh callbacks without rebuilding Pixi", async () => {
    let resolve!: (value: ReturnType<typeof makeViewport>) => void;
    engine.create.mockImplementation((_host: HTMLElement, callbacks: PixiViewportOptions) => {
      options = callbacks;
      return new Promise<ReturnType<typeof makeViewport>>(done => { resolve = done; });
    });
    await render();
    const oldSelect = props.onSelect;
    const onSelect = vi.fn();
    const onReady = vi.fn();
    const onCameraChange = vi.fn();
    const camera = { center: { x: 125, y: -50 }, zoom: 1.25 };
    await render({ onSelect, onReady, onCameraChange, camera, tool: "fire", shape: "cone", imageUrl: "/replacement.png" });
    await act(async () => resolve(viewport));
    expect(viewport.setMap).toHaveBeenLastCalledWith(expect.objectContaining({ imageUrl: "/replacement.png", imagePath: null }));
    expect(viewport.setCameraSnapshot).toHaveBeenLastCalledWith(camera);
    expect(viewport.setEffectTool).toHaveBeenLastCalledWith("fire", "cone", LAB_SCENE_IDS.map);
    options.onElementSelect?.(LAB_SCENE_IDS.fireBrazier);
    options.onCameraChange?.(camera);
    expect(onSelect).toHaveBeenCalledWith(LAB_SCENE_IDS.fireBrazier);
    expect(oldSelect).not.toHaveBeenCalled();
    expect(onCameraChange).toHaveBeenCalledWith(camera);
    expect(onReady).not.toHaveBeenCalled();
    options.onMapRendered?.("rendered");
    expect(onReady).toHaveBeenCalledOnce();
    await render({ selectedId: LAB_SCENE_IDS.fireBrazier });
    expect(engine.create).toHaveBeenCalledOnce();
    expect(viewport.destroy).not.toHaveBeenCalled();
    expect(host.querySelector(".lab-canvas")).not.toBeNull();
    expect(host.textContent).toBe("");
  });

  it("does not refresh scene layers or reset effect drafts on camera-only updates", async () => {
    await render({ tool: "lightning", shape: "line" });
    await render({ camera: { center: { x: 100, y: 50 }, zoom: 0.7 } });
    expect(viewport.setCameraSnapshot).toHaveBeenCalledTimes(2);
    expect(viewport.setEffects).toHaveBeenCalledOnce();
    expect(viewport.setMap).toHaveBeenCalledOnce();
    expect(viewport.setEffectTool).toHaveBeenCalledOnce();
  });

  it("creates original fire and lightning effects, synchronizes maps, and preserves intervening changes", async () => {
    const scenes: SceneDocument[] = [];
    await render({ tool: "fire", shape: "line", onSceneChange: scene => scenes.push(scene) });
    const original = props.scene;
    options.onFireCreate?.("line", { x: 0, y: 0 }, { x: 192, y: 0 });
    const fireScene = scenes.at(-1)!;
    const fire = fireScene.effects.at(-1) as SceneFireEffect;
    expect(fire).toMatchObject({ kind: "fire", zone: { kind: "line", end: { x: 192, y: 0 }, width: 64 } });
    expect(fireScene.maps[0].effects).toBe(fireScene.effects);
    expect(original.effects).toHaveLength(2);
    expect(props.onSelect).toHaveBeenLastCalledWith(fire.id);
    expect(viewport.setEffectTool).toHaveBeenCalledTimes(2);
    expect(viewport.setEffectTool).toHaveBeenLastCalledWith("lightning", null, LAB_SCENE_IDS.map);
    expect(props.onToolComplete).toHaveBeenCalledOnce();
    options.onFireCreate?.("line", { x: 0, y: 0 }, { x: 192, y: 0 });
    expect(scenes).toHaveLength(1);

    await render({ scene: { ...fireScene, effects: fireScene.effects.map(effect => effect.id === fire.id ? { ...effect, opacity: 0.25 } : effect) }, tool: "select" });
    options.onFireChange?.({ ...fire, position: { x: 64, y: 64 }, zone: { kind: "line", end: { x: 256, y: 64 }, width: 64 } });
    expect(scenes.at(-1)!.effects.at(-1)).toMatchObject({ opacity: 0.25, position: { x: 64, y: 64 } });
    await render({ scene: scenes.at(-1), tool: "lightning", shape: "circle" });
    options.onLightningCreate?.("circle", { x: 0, y: 0 }, { x: 64, y: 0 });
    expect(scenes.at(-1)!.effects.at(-1)).toMatchObject({ kind: "lightning", zone: { kind: "circle", radius: 64 } });
    expect(parseSceneDocument(scenes.at(-1))).toEqual(scenes.at(-1));
    expect(props.onToolComplete).toHaveBeenCalledTimes(2);
  });

  it("merges paint batches before a React render without losing or duplicating cells", async () => {
    const scenes: SceneDocument[] = [];
    await render({ tool: "fire", shape: "paint", onSceneChange: scene => scenes.push(scene) });
    const cell = { x: 0, y: 0, size: 64 };
    options.onFirePaint?.([cell], { x: 32, y: 32 });
    options.onFirePaint?.([cell, { ...cell, x: 64 }], { x: 96, y: 32 });
    const scene = scenes.at(-1)!;
    expect(scene.effects).toHaveLength(3);
    expect(scene.effects.at(-1)).toMatchObject({ zone: { kind: "cells", cells: [cell, { ...cell, x: 64 }] } });
    expect(scene.maps[0].effects).toBe(scene.effects);
    expect(props.onSelect).toHaveBeenCalledOnce();
    expect(props.onToolComplete).not.toHaveBeenCalled();
  });

  it.each([
    ["measure", "circle", "measurement"],
    ["area", "circle", "circle"],
    ["area", "cone", "cone"],
    ["area", "line", "measurement"]
  ] as const)("places %s/%s through Pixi world coordinates and the production shape constructor", async (tool, shape, kind) => {
    const scenes: SceneDocument[] = [];
    await render({ tool, shape, onSceneChange: scene => scenes.push(scene) });
    expect(viewport.setRoomPinMode).toHaveBeenLastCalledWith(true);
    options.onRoomPinPlace?.({ x: 72, y: 130 });
    const scene = scenes.at(-1)!;
    const created = scene.shapes.at(-1)!;
    expect(created.type).toBe(kind);
    expect(created.points[0]).toEqual(kind === "measurement" ? { x: 72, y: 130 } : { x: 64, y: 128 });
    if (kind === "measurement") expect(created.points[1]).toEqual({ x: 264, y: 130 });
    if (kind === "circle") expect(created.radius).toBe(64);
    if (kind === "cone") expect(created).toMatchObject({ radius: 192, angle: 60 });
    expect(scene.maps[0].shapes).toBe(scene.shapes);
    expect(props.onSelect).toHaveBeenLastCalledWith(created.id);
    expect(props.onToolComplete).toHaveBeenCalledOnce();
    expect(viewport.setRoomPinMode).toHaveBeenLastCalledWith(false);
    expect(parseSceneDocument(scene)).toEqual(scene);
    await render({ scene });
    options.onRoomPinPlace?.({ x: 200, y: 200 });
    expect(scenes).toHaveLength(1);
  });

  it.each(["circle", "cone"] as const)("places a %s light and completes once with the latest callback", async shape => {
    const scenes: SceneDocument[] = [];
    await render({ tool: "light", shape, onSceneChange: scene => scenes.push(scene) });
    const oldComplete = props.onToolComplete;
    const onToolComplete = vi.fn();
    await render({ onToolComplete });
    options.onRoomPinPlace?.({ x: 17, y: 39 });
    const scene = scenes.at(-1)!;
    expect(scene.lights.at(-1)).toMatchObject({ kind: shape === "cone" ? "cone" : "point", position: { x: 17, y: 39 } });
    expect(onToolComplete).toHaveBeenCalledOnce();
    expect(oldComplete).not.toHaveBeenCalled();
    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("places a named room pin and emits scene, selection, then completion", async () => {
    const order: string[] = [];
    const scenes: SceneDocument[] = [];
    await render({ tool: "pin", onSceneChange: scene => { scenes.push(scene); order.push("scene"); },
      onSelect: () => order.push("select"), onToolComplete: () => order.push("complete") });
    options.onRoomPinPlace?.({ x: -200, y: 96 });
    const scene = scenes.at(-1)!;
    expect(scene.mapAnnotations.pins.at(-1)).toMatchObject({ kind: "room-pin", position: { x: -200, y: 96 },
      title: "Habitacion 2", content: "", locked: false });
    expect(scene.maps[0].mapAnnotations).toBe(scene.mapAnnotations);
    expect(order).toEqual(["scene", "select", "complete"]);
    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("enables fog on tool entry and appends simplified reveal strokes while the brush stays active", async () => {
    const scenes: SceneDocument[] = [];
    await render({ tool: "fog", onSceneChange: scene => scenes.push(scene) });
    expect(scenes.at(-1)!.fogOfWar.enabled).toBe(true);
    expect(viewport.setFogRevealMode).toHaveBeenLastCalledWith(true);
    options.onFogRevealStroke?.([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 80, y: 0 }]);
    options.onFogRevealStroke?.([{ x: 200, y: 200 }]);
    const scene = scenes.at(-1)!;
    expect(scene.fogOfWar.revealedAreas).toHaveLength(2);
    expect(scene.fogOfWar.revealedAreas[0]).toMatchObject({ kind: "stroke", radius: 100, points: [{ x: 0, y: 0 }, { x: 80, y: 0 }] });
    expect(props.onToolComplete).not.toHaveBeenCalled();
    expect(parseSceneDocument(scene)).toEqual(scene);
    await render({ scene, tool: "select" });
    expect(viewport.setFogRevealMode).toHaveBeenLastCalledWith(false);
    options.onFogRevealStroke?.([{ x: 500, y: 500 }]);
    expect(scenes.at(-1)).toBe(scene);
  });

  it("paints terrain annotations through existing cell output without duplicate cells", async () => {
    const scenes: SceneDocument[] = [];
    await render({ tool: "area", shape: "paint", onSceneChange: scene => scenes.push(scene) });
    const cell = { x: 0, y: 0, size: 64 };
    options.onInformationAreaPaint?.([cell]);
    options.onInformationAreaPaint?.([cell, { ...cell, x: 64 }]);
    const scene = scenes.at(-1)!;
    expect(viewport.setInformationAreaMode).toHaveBeenLastCalledWith(true);
    expect(viewport.setRoomPinMode).toHaveBeenLastCalledWith(false);
    expect(scene.mapAnnotations.areas).toHaveLength(1);
    expect(scene.mapAnnotations.areas[0]).toMatchObject({ kind: "information-area", areaType: "terrain", cells: [cell, { ...cell, x: 64 }] });
    expect(props.onToolComplete).not.toHaveBeenCalled();
    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("completes a transient pointer without changing the scene", async () => {
    await render({ tool: "pointer" });
    options.onArcanePointerTrigger?.({ id: "pointer-1", position: { x: 0, y: 0 }, creatureSize: "medium", durationMs: 1000 });
    expect(props.onToolComplete).toHaveBeenCalledOnce();
    expect(props.onSceneChange).not.toHaveBeenCalled();
    expect(viewport.setArcanePointerMode).toHaveBeenLastCalledWith(false);
  });

  it("does not complete failed creation or enable fog in the read-only player view", async () => {
    await render({ tool: "light" });
    options.onRoomPinPlace?.({ x: NaN, y: 0 });
    expect(props.onError).toHaveBeenCalledOnce();
    expect(props.onToolComplete).not.toHaveBeenCalled();
    expect(props.onSceneChange).not.toHaveBeenCalled();
    await render({ player: true, tool: "fog" });
    options.onFogRevealStroke?.([{ x: 0, y: 0 }]);
    expect(props.onSceneChange).not.toHaveBeenCalled();
    expect(viewport.setFogRevealMode).toHaveBeenLastCalledWith(false);
    await render({ player: true, tool: "pin" });
    options.onRoomPinPlace?.({ x: 0, y: 0 });
    expect(props.onSceneChange).not.toHaveBeenCalled();
    expect(props.onToolComplete).not.toHaveBeenCalled();
  });

  it("moves and resizes fixture objects with domain helpers", async () => {
    const scenes: SceneDocument[] = [];
    await render({ onSceneChange: scene => scenes.push(scene) });
    options.onElementMove?.(LAB_SCENE_IDS.areaCourtyard, 72, 130);
    expect(scenes.at(-1)!.shapes[0].points[0]).toEqual({ x: 64, y: 128 });
    options.onLightRadiusChange?.(LAB_SCENE_IDS.lightArch, 320);
    expect(scenes.at(-1)!.lights[0].radius).toBe(320);
    options.onFireZoneRadiusChange?.(LAB_SCENE_IDS.fireBrazier, 48);
    expect(scenes.at(-1)!.effects[0]).toMatchObject({ zone: { kind: "circle", radius: 48 } });
    expect(parseSceneDocument(scenes.at(-1))).toEqual(scenes.at(-1));
  });

  it("uses selection fallback and suppresses editing in player mode", async () => {
    await render({ tool: "water" });
    expect(viewport.setEffectTool).toHaveBeenLastCalledWith("lightning", null, LAB_SCENE_IDS.map);
    expect(viewport.setFirePaintMode).toHaveBeenLastCalledWith(false);
    expect(viewport.setArcanePointerMode).toHaveBeenLastCalledWith(false);
    options.onElementSelect?.(LAB_SCENE_IDS.lightArch);
    expect(props.onSelect).toHaveBeenCalledOnce();
    options.onElementMove?.(LAB_SCENE_IDS.lightArch, 0, 0);
    options.onLightRadiusChange?.(LAB_SCENE_IDS.lightArch, 320);
    expect(props.onSceneChange).not.toHaveBeenCalled();
    await render({ player: true, tool: "fire", selectedId: LAB_SCENE_IDS.lightArch });
    expect(viewport.setReadOnly).toHaveBeenLastCalledWith(true);
    expect(viewport.setViewRole).toHaveBeenLastCalledWith("player");
    expect(viewport.setFogPresentation).toHaveBeenLastCalledWith("player-blocking");
    expect(viewport.setSelectedElementId).toHaveBeenLastCalledWith(null);
    options.onElementMove?.(LAB_SCENE_IDS.fireBrazier, 0, 0);
    options.onFireCreate?.("circle", { x: 0, y: 0 }, { x: 64, y: 0 });
    options.onElementSelect?.(null);
    expect(props.onSceneChange).not.toHaveBeenCalled();
    expect(props.onSelect).toHaveBeenCalledOnce();
  });

  it("delegates temporary Space-pan and persistent pan to the engine and cleans up", async () => {
    await render();
    const canvas = document.createElement("canvas");
    host.querySelector(".lab-canvas")!.append(canvas);
    canvas.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    expect(viewport.setGrabMode).toHaveBeenLastCalledWith(true);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    expect(viewport.setGrabMode).toHaveBeenLastCalledWith(false);
    await render({ tool: "pan" });
    expect(viewport.setGrabMode).toHaveBeenLastCalledWith(true);
    act(() => root.unmount());
    viewport.setGrabMode.mockClear();
    window.dispatchEvent(new Event("blur"));
    expect(viewport.setGrabMode).not.toHaveBeenCalled();
    expect(viewport.destroy).toHaveBeenCalledOnce();
  });

  it("destroys a viewport that finishes initializing after unmount", async () => {
    let resolve!: (value: ReturnType<typeof makeViewport>) => void;
    engine.create.mockImplementation((_host: HTMLElement, callbacks: PixiViewportOptions) => {
      options = callbacks;
      return new Promise<ReturnType<typeof makeViewport>>(done => { resolve = done; });
    });
    await render();
    act(() => root.unmount());
    await act(async () => resolve(viewport));
    options.onMapRendered?.("late");
    options.onMapRenderError?.("late");
    expect(viewport.destroy).toHaveBeenCalledOnce();
    expect(viewport.setMap).not.toHaveBeenCalled();
    expect(props.onReady).not.toHaveBeenCalled();
    expect(props.onError).not.toHaveBeenCalled();
  });

  it("reports initialization failures through onError", async () => {
    engine.create.mockRejectedValue(new Error("Renderer unavailable"));
    await render();
    expect(props.onError).toHaveBeenCalledWith("Renderer unavailable");
    expect(props.onReady).not.toHaveBeenCalled();
  });
});
