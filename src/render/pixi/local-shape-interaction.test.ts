// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PixiViewport, type PixiViewportOptions } from "./PixiViewport";
import { Container, Text } from "pixi.js";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { SceneShape } from "../../domain/sessions/scene-document";
import type { CompassOrientation } from "../../domain/map/compass-orientation";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });

interface Harness extends Pick<PixiViewport,
  "setReadOnly" | "setLocalEditableShapeIds" | "setPathDrawingMode" | "setSelectedElementId" |
  "setNavigationEnabled" | "setGrabMode" | "setZoomLocked" | "cancelCameraGesture" | "setCameraSnapshot" | "selectAttentionPoint"> {
  handlePointerDown(event: PointerEvent): void;
  handlePointerMove(event: PointerEvent): void;
  handlePointerUp(event: PointerEvent): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  handleWheel(event: WheelEvent): void;
  flushPendingViewportUpdates(): void;
  cancelPendingViewportUpdates(): void;
  dragState: { mode: string } | null;
  camera: { center: { x: number; y: number }; zoom: number };
  selectedElementId: string | null;
  updateAreaToolLabelScale(): void;
  screenToWorldPoint(point: { x: number; y: number }): { x: number; y: number };
  worldToScreenPoint(point: { x: number; y: number }): { x: number; y: number };
}

const cleanup: (() => void)[] = [];
beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); });
afterEach(() => { for (const dispose of cleanup.splice(0)) dispose(); vi.unstubAllGlobals(); });

function setup(shapes: readonly SceneShape[], ids?: readonly string[]) {
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.setPointerCapture = vi.fn();
  canvas.hasPointerCapture = vi.fn(() => true); canvas.releasePointerCapture = vi.fn();
  const options: PixiViewportOptions = {
    onElementSelect: vi.fn(), onElementMove: vi.fn(), onShapeEndMove: vi.fn(),
    onPathPointAdd: vi.fn(), onPathPointerMove: vi.fn(), onPathPointMove: vi.fn(), onPathMove: vi.fn(),
    onShapeRadiusChange: vi.fn(), onShapeDirectionChange: vi.fn(), onShapeRectResize: vi.fn(),
    onFogRevealStroke: vi.fn(), onMapPositionChange: vi.fn(),
    onWaterPointAdd: vi.fn(), onFirePaint: vi.fn(), onCameraChange: vi.fn()
  };
  const viewport = Reflect.construct(PixiViewport, [host, options]) as Harness;
  const scene = createDefaultScene();
  Object.assign(viewport, {
    app: { canvas, renderer: { width: 1000, height: 800 } },
    grid: scene.grid, settings: scene.settings, shapes,
    tokens: [{ id: "dm-token", position: { x: 0, y: 0 }, footprintCells: 1, visible: true }],
    lights: [{ id: "dm-light", kind: "point", position: { x: 200, y: 0 }, visible: true }],
    effects: [],
    drawSelectionLayer: vi.fn(), drawShapePreviewLayers: vi.fn(), drawInteractiveElements: vi.fn(),
    drawDarkvisionLayer: vi.fn(), drawDarknessLayer: vi.fn(), drawFogOfWarLayer: vi.fn(),
    applyElementMovePreview: vi.fn(), clearElementMovePreview: vi.fn(), applyCamera: vi.fn()
  });
  viewport.setReadOnly(true);
  viewport.setLocalEditableShapeIds(ids);
  cleanup.push(() => viewport.cancelPendingViewportUpdates());
  const event = (x: number, y: number, type = "pointerup") =>
    Object.assign(new MouseEvent(type, { clientX: x, clientY: y, button: 0 }), { pointerId: 1 }) as PointerEvent;
  const click = (x: number, y: number) => {
    viewport.handlePointerDown(event(x, y, "pointerdown"));
    viewport.handlePointerUp(event(x, y));
  };
  return { viewport, options, event, click, canvas };
}

const rotatedCamera = { center: { x: 35, y: -25 }, zoom: 1.6 };

function presentAsPlayer(viewport: Harness, orientation: CompassOrientation): void {
  Object.assign(viewport, { viewRole: "player", compassOrientation: orientation, camera: rotatedCamera });
}

function rotatedScreenPoint(world: { x: number; y: number }, orientation: CompassOrientation) {
  const radians = -orientation * Math.PI / 180;
  const dx = (world.x - rotatedCamera.center.x) * rotatedCamera.zoom;
  const dy = (world.y - rotatedCamera.center.y) * rotatedCamera.zoom;
  return {
    x: 500 + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: 400 + dx * Math.sin(radians) + dy * Math.cos(radians)
  };
}

const localCircle: SceneShape = { id: "local-circle", type: "circle", points: [{ x: 0, y: 0 }], radius: 40 };
const dmCircle: SceneShape = { id: "dm-circle", type: "circle", points: [{ x: 150, y: 0 }], radius: 40 };

describe("read-only local shape tools", () => {
  it.each([0, 90, 180, 270] as const)("keeps area measurements upright at Player north %i", (orientation) => {
    const { viewport } = setup([], []);
    presentAsPlayer(viewport, orientation);
    const layer = new Container();
    const shape = new Container();
    const label = new Text({ text: "25 ft" });
    label.label = "area-tool-size-label";
    shape.addChild(label);
    layer.addChild(shape);
    Object.assign(viewport, { getLayer: () => layer });
    viewport.updateAreaToolLabelScale();
    expect(label.rotation).toBeCloseTo(orientation * Math.PI / 180);
    layer.destroy({ children: true });
  });
  it("keeps the default read-only behavior without a local tool configuration", () => {
    const { viewport, options, click, event } = setup([localCircle]);
    viewport.setPathDrawingMode(true);
    click(500, 400);
    viewport.handlePointerMove(event(520, 400, "pointermove"));
    viewport.flushPendingViewportUpdates();
    expect(options.onElementSelect).not.toHaveBeenCalled();
    expect(options.onPathPointAdd).not.toHaveBeenCalled();
    expect(options.onPathPointerMove).not.toHaveBeenCalled();
  });

  it("selects and moves only allowlisted shapes, even over a DM token", () => {
    const { viewport, options, event, click } = setup([localCircle, dmCircle], ["local-circle", "dm-token", "dm-light", "dm-circle-missing"]);
    click(650, 400);
    expect(options.onElementSelect).toHaveBeenCalledWith(null);
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("element-move");
    expect(options.onElementSelect).toHaveBeenLastCalledWith("local-circle");
    viewport.handlePointerMove(event(520, 410, "pointermove"));
    viewport.handlePointerUp(event(520, 410));
    expect(options.onElementMove).toHaveBeenCalledExactlyOnceWith("local-circle", 20, 10);
    viewport.setSelectedElementId("dm-circle");
    expect(viewport.selectedElementId).toBeNull();
  });

  it.each(["measurement", "circle", "cone", "rectangle"] as const)(
    "moves an allowlisted %s through the existing shape callback", (type) => {
      const shape: SceneShape = { id: `local-${type}`, type, points: [{ x: 0, y: 0 }, { x: 80, y: 0 }], radius: 40, width: 80, height: 60 };
      const { viewport, options, event } = setup([shape], [shape.id]);
      viewport.handlePointerDown(event(500, 400, "pointerdown"));
      expect(viewport.dragState?.mode).toBe("element-move");
      viewport.handlePointerMove(event(520, 410, "pointermove"));
      viewport.handlePointerUp(event(520, 410));
      expect(options.onElementMove).toHaveBeenCalledExactlyOnceWith(shape.id, 20, 10);
    }
  );

  it("uses existing path callbacks in read-only mode with an empty allowlist", () => {
    const { viewport, options, click, event } = setup([], []);
    viewport.setPathDrawingMode(true);
    viewport.handlePointerMove(event(500, 400, "pointermove"));
    viewport.flushPendingViewportUpdates();
    click(500, 400);
    expect(options.onPathPointerMove).toHaveBeenCalledOnce();
    expect(options.onPathPointAdd).toHaveBeenCalledOnce();
    expect(options.onWaterPointAdd).not.toHaveBeenCalled();
  });

  it("edits an allowlisted path handle and never exposes a DM path handle", () => {
    const path: SceneShape = { id: "local-path", type: "path", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const dmPath: SceneShape = { id: "dm-path", type: "path", points: [{ x: 150, y: 0 }, { x: 250, y: 0 }] };
    const { viewport, options, event } = setup([path, dmPath], [path.id]);
    viewport.setSelectedElementId(dmPath.id);
    viewport.handlePointerDown(event(650, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("idle");
    viewport.handlePointerUp(event(650, 400));
    viewport.setSelectedElementId(path.id);
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("path-point-move");
    viewport.handlePointerMove(event(540, 400, "pointermove"));
    viewport.handlePointerUp(event(540, 400));
    expect(options.onPathPointMove).toHaveBeenCalledOnce();
    expect(options.onPathPointMove).toHaveBeenCalledWith(path.id, 0, expect.any(Number), expect.any(Number));
  });

  it("moves an allowlisted path using its existing circle handle", () => {
    const path: SceneShape = { id: "local-path", type: "path", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const { viewport, options, event } = setup([path], [path.id]);
    viewport.setSelectedElementId(path.id);
    viewport.handlePointerDown(event(530, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("path-move");
    viewport.handlePointerMove(event(550, 400, "pointermove"));
    viewport.handlePointerUp(event(550, 400));
    expect(options.onPathMove).toHaveBeenCalledWith(path.id, expect.any(Number), expect.any(Number));
  });

  it("commits local circle resize and measurement endpoint previews", () => {
    const line: SceneShape = { id: "local-line", type: "measurement", points: [{ x: 150, y: 0 }, { x: 230, y: 0 }] };
    const { viewport, options, event } = setup([localCircle, line], [localCircle.id, line.id]);
    viewport.setSelectedElementId(localCircle.id);
    viewport.handlePointerDown(event(540, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("shape-circle-resize");
    viewport.handlePointerMove(event(560, 400, "pointermove"));
    viewport.handlePointerUp(event(560, 400));
    expect(options.onShapeRadiusChange).toHaveBeenCalledWith(localCircle.id, expect.any(Number));
    viewport.setSelectedElementId(line.id);
    viewport.handlePointerDown(event(730, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("shape-end-move");
    viewport.handlePointerMove(event(750, 410, "pointermove"));
    viewport.handlePointerUp(event(750, 410));
    expect(options.onShapeEndMove).toHaveBeenCalledWith(line.id, expect.any(Number), expect.any(Number));
  });

  it("preserves Space and grab pan and respects zoom lock", () => {
    const { viewport, options, event } = setup([localCircle], [localCircle.id]);
    viewport.setNavigationEnabled(true);
    viewport.handleKeyDown(new KeyboardEvent("keydown", { code: "Space", key: " " }));
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("pan");
    viewport.handlePointerMove(event(530, 400, "pointermove"));
    viewport.handlePointerUp(event(530, 400));
    expect(viewport.camera.center.x).toBe(-30);
    expect(options.onElementMove).not.toHaveBeenCalled();
    viewport.handleKeyUp(new KeyboardEvent("keyup", { code: "Space", key: " " }));
    viewport.setGrabMode(true);
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("pan");
    viewport.handlePointerUp(event(500, 400));
    viewport.setZoomLocked(true);
    viewport.handleWheel(new WheelEvent("wheel", { deltaY: -100 }));
    expect(viewport.camera.zoom).toBe(1);
  });

  it("cancels an active drag when its local ID is revoked", () => {
    const { viewport, options, event } = setup([localCircle], [localCircle.id]);
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    viewport.handlePointerMove(event(520, 400, "pointermove"));
    viewport.setLocalEditableShapeIds([]);
    viewport.handlePointerUp(event(520, 400));
    expect(viewport.dragState).toBeNull();
    expect(options.onElementMove).not.toHaveBeenCalled();
  });

  it.each([90, 180, 270] as const)("picks and drags only the local shape at Player north %i", (orientation) => {
    const local: SceneShape = { id: "local", type: "circle", points: [{ x: 100, y: 50 }], radius: 40 };
    const dm: SceneShape = { id: "dm", type: "circle", points: [{ x: 200, y: 50 }], radius: 40 };
    const { viewport, options, event, click } = setup([local, dm], [local.id]);
    presentAsPlayer(viewport, orientation);
    const dmScreen = rotatedScreenPoint({ x: 200, y: 50 }, orientation);
    click(dmScreen.x, dmScreen.y);
    expect(options.onElementSelect).toHaveBeenLastCalledWith(null);
    const start = rotatedScreenPoint({ x: 100, y: 50 }, orientation);
    const end = rotatedScreenPoint({ x: 110, y: 65 }, orientation);
    expect(viewport.screenToWorldPoint(start).x).toBeCloseTo(100);
    expect(viewport.worldToScreenPoint({ x: 100, y: 50 }).x).toBeCloseTo(start.x);
    viewport.handlePointerDown(event(start.x, start.y, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("element-move");
    viewport.handlePointerMove(event(end.x, end.y, "pointermove"));
    viewport.handlePointerUp(event(end.x, end.y));
    expect(options.onElementSelect).toHaveBeenLastCalledWith(local.id);
    const move = vi.mocked(options.onElementMove!).mock.calls[0];
    expect(move?.[0]).toBe(local.id);
    expect(move?.[1]).toBeCloseTo(110);
    expect(move?.[2]).toBeCloseTo(65);
  });

  it.each([90, 180, 270] as const)("uses rotated Player coordinates for local shape handles at north %i", (orientation) => {
    const circle: SceneShape = { id: "circle", type: "circle", points: [{ x: 100, y: 50 }], radius: 40 };
    const line: SceneShape = { id: "line", type: "measurement", points: [{ x: 200, y: 50 }, { x: 280, y: 50 }] };
    const cone: SceneShape = { id: "cone", type: "cone", points: [{ x: -100, y: 50 }], radius: 40, direction: 0 };
    const rect: SceneShape = { id: "rect", type: "rectangle", points: [{ x: 0, y: -100 }], width: 80, height: 60 };
    const { viewport, options, event } = setup([circle, line, cone, rect], [circle.id, line.id, cone.id, rect.id]);
    presentAsPlayer(viewport, orientation);
    const drag = (startWorld: { x: number; y: number }, endWorld: { x: number; y: number }) => {
      const start = rotatedScreenPoint(startWorld, orientation);
      const end = rotatedScreenPoint(endWorld, orientation);
      viewport.handlePointerDown(event(start.x, start.y, "pointerdown"));
      viewport.handlePointerMove(event(end.x, end.y, "pointermove"));
      viewport.handlePointerUp(event(end.x, end.y));
    };
    viewport.setSelectedElementId(circle.id);
    drag({ x: 140, y: 50 }, { x: 165, y: 50 });
    const radius = vi.mocked(options.onShapeRadiusChange!).mock.calls[0];
    expect(radius?.[0]).toBe(circle.id);
    expect(radius?.[1]).toBeCloseTo(65);
    viewport.setSelectedElementId(line.id);
    drag({ x: 280, y: 50 }, { x: 290, y: 65 });
    const end = vi.mocked(options.onShapeEndMove!).mock.calls[0];
    expect(end?.[0]).toBe(line.id);
    expect(end?.[1]).toBeCloseTo(290);
    expect(end?.[2]).toBeCloseTo(65);
    viewport.setSelectedElementId(cone.id);
    drag({ x: -60, y: 50 }, { x: -35, y: 50 });
    const coneRadius = vi.mocked(options.onShapeRadiusChange!).mock.calls[1];
    expect(coneRadius?.[0]).toBe(cone.id);
    expect(coneRadius?.[1]).toBeCloseTo(65);
    viewport.setSelectedElementId(rect.id);
    drag({ x: 40, y: -70 }, { x: 50, y: -60 });
    const resize = vi.mocked(options.onShapeRectResize!).mock.calls[0];
    expect(resize?.[0]).toBe(rect.id);
    expect(resize?.[1]).toBeCloseTo(90);
    expect(resize?.[2]).toBeCloseTo(70);
    expect(resize?.[3]).toBeCloseTo(5);
    expect(resize?.[4]).toBeCloseTo(-95);
  });

  it.each([90, 180, 270] as const)("snaps path drawing and path handles at Player north %i", (orientation) => {
    const path: SceneShape = { id: "path", type: "path", points: [{ x: 100, y: 50 }, { x: 200, y: 50 }] };
    const { viewport, options, event, click, canvas } = setup([path], [path.id]);
    presentAsPlayer(viewport, orientation);
    viewport.setPathDrawingMode(true);
    expect(canvas.style.cursor).toBe("crosshair");
    const drawAt = rotatedScreenPoint({ x: 25, y: 25 }, orientation);
    viewport.handlePointerMove(event(drawAt.x, drawAt.y, "pointermove"));
    viewport.flushPendingViewportUpdates();
    click(drawAt.x, drawAt.y);
    expect(options.onPathPointerMove).toHaveBeenLastCalledWith({ x: 50, y: 50 });
    expect(options.onPathPointAdd).toHaveBeenLastCalledWith({ x: 50, y: 50 });
    viewport.setPathDrawingMode(false);
    viewport.setSelectedElementId(path.id);
    const hover = rotatedScreenPoint({ x: 130, y: 50 }, orientation);
    viewport.handlePointerMove(event(hover.x, hover.y, "pointermove"));
    expect(canvas.style.cursor).toBe("grab");
    const start = rotatedScreenPoint({ x: 100, y: 50 }, orientation);
    const finish = rotatedScreenPoint({ x: 125, y: 25 }, orientation);
    viewport.handlePointerDown(event(start.x, start.y, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("path-point-move");
    viewport.handlePointerMove(event(finish.x, finish.y, "pointermove"));
    viewport.handlePointerUp(event(finish.x, finish.y));
    expect(options.onPathPointMove).toHaveBeenLastCalledWith(path.id, 0, 150, 50);
  });

  it.each([90, 180, 270] as const)("moves paths and rotates local shapes at Player north %i", (orientation) => {
    const path: SceneShape = { id: "path", type: "path", points: [{ x: 100, y: 50 }, { x: 200, y: 50 }] };
    const line: SceneShape = { id: "line", type: "measurement", points: [{ x: 200, y: 50 }, { x: 280, y: 50 }] };
    const cone: SceneShape = { id: "cone", type: "cone", points: [{ x: -100, y: 50 }], radius: 40, direction: 0 };
    const { viewport, options, event } = setup([path, line, cone], [path.id, line.id, cone.id]);
    presentAsPlayer(viewport, orientation);
    const drag = (startWorld: { x: number; y: number }, endWorld: { x: number; y: number }) => {
      const start = rotatedScreenPoint(startWorld, orientation);
      const end = rotatedScreenPoint(endWorld, orientation);
      viewport.handlePointerDown(event(start.x, start.y, "pointerdown"));
      viewport.handlePointerMove(event(end.x, end.y, "pointermove"));
      viewport.handlePointerUp(event(end.x, end.y));
    };
    viewport.setSelectedElementId(path.id);
    drag({ x: 130, y: 50 }, { x: 150, y: 60 });
    expect(options.onPathMove).toHaveBeenLastCalledWith(path.id, 150, 50);
    viewport.setSelectedElementId(line.id);
    drag({ x: 200, y: 104 }, { x: 200, y: 120 });
    const lineDirection = vi.mocked(options.onShapeDirectionChange!).mock.calls[0];
    expect(lineDirection?.[0]).toBe(line.id);
    expect(lineDirection?.[1]).toBeCloseTo(90);
    viewport.setSelectedElementId(cone.id);
    drag({ x: -100, y: 122 }, { x: -100, y: 150 });
    const coneDirection = vi.mocked(options.onShapeDirectionChange!).mock.calls[1];
    expect(coneDirection?.[0]).toBe(cone.id);
    expect(coneDirection?.[1]).toBeCloseTo(90);
  });

  it.each([90, 180, 270] as const)("pans a rotated Player view with Space or grab at north %i", (orientation) => {
    const { viewport, options, event } = setup([localCircle], [localCircle.id]);
    presentAsPlayer(viewport, orientation);
    viewport.setNavigationEnabled(true);
    viewport.handleKeyDown(new KeyboardEvent("keydown", { code: "Space", key: " " }));
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("pan");
    viewport.handlePointerMove(event(532, 400, "pointermove"));
    viewport.handlePointerUp(event(532, 400));
    const radians = orientation * Math.PI / 180;
    expect(viewport.camera.center.x).toBeCloseTo(35 - 20 * Math.cos(radians));
    expect(viewport.camera.center.y).toBeCloseTo(-25 - 20 * Math.sin(radians));
    viewport.handleKeyUp(new KeyboardEvent("keyup", { code: "Space", key: " " }));
    viewport.setGrabMode(true);
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    expect(viewport.dragState?.mode).toBe("pan");
    viewport.handlePointerMove(event(516, 400, "pointermove"));
    viewport.handlePointerUp(event(516, 400));
    expect(viewport.camera.center.x).toBeCloseTo(35 - 30 * Math.cos(radians));
    expect(viewport.camera.center.y).toBeCloseTo(-25 - 30 * Math.sin(radians));
    expect(options.onElementMove).not.toHaveBeenCalled();
  });
});

describe("autoría de dibujos compartidos", () => {
  it("etiquetas de todas las geometrías mantienen medida, texto seguro y contrarrotación", () => {
    const { viewport } = setup([]);
    const pixi = viewport as unknown as PixiViewport;
    const layer = new Container(); Object.assign(viewport, { getLayer: () => layer });
    cleanup.push(() => layer.destroy({ children: true }));
    const alias = "Ana <img src=x onerror=alert(1)> nombre largo";
    const geometries: import("../../shared/contracts/shared-annotations").AnnotationGeometry[] = [
      { type: "measurement", points: [{ x: 0, y: 0 }, { x: 100, y: 50 }] },
      { type: "path", points: [{ x: 0, y: 0 }, { x: 100, y: 50 }] },
      { type: "circle", points: [{ x: 0, y: 0 }], radius: 10 },
      { type: "rectangle", points: [{ x: 0, y: 0 }], width: 20, height: 15 },
      { type: "cone", points: [{ x: 0, y: 0 }], radius: 100, angle: 60, direction: 90 }
    ];
    Object.assign(viewport, { viewRole: "player", compassOrientation: 90, camera: { center: { x: 0, y: 0 }, zoom: 2 } });
    pixi.setSharedAnnotations(geometries.map(geometry => ({ id: crypto.randomUUID(), revision: 1, author: { publicId: crypto.randomUUID(), alias, discriminator: 7 }, geometry, measurementLabel: "15 ft", preview: true })));
    const labels = layer.children.flatMap(child => child instanceof Container ? child.children.filter((c): c is Text => c instanceof Text && c.label === "area-tool-size-label") : []);
    expect(labels).toHaveLength(5);
    for (const label of labels) { expect(label.text).toContain("… #7\n15 ft"); expect(label.rotation).toBeCloseTo(Math.PI / 2); }
    for (const container of layer.children) expect(container.alpha).toBe(0.65);
    expect(Reflect.get(viewport, "shapes")).toEqual([]);
    expect(document.querySelector("img[src=x]")).toBeNull();
    pixi.setSharedAnnotations([]); expect(layer.children).toHaveLength(0);
  });
});


describe("foco de atención en el canvas", () => {
  it.each([0, 90, 180, 270] as const)("centra exactamente sin cambiar zoom con norte %i", orientation => {
    const { viewport, event, options, canvas } = setup([localCircle], [localCircle.id]);
    presentAsPlayer(viewport, orientation); viewport.setGrabMode(true);
    viewport.handlePointerDown(event(500, 400, "pointerdown"));
    viewport.handlePointerMove(event(620, 470, "pointermove"));
    const point = { x: -123.45, y: 789.25 }, zoom = viewport.camera.zoom;
    viewport.cancelCameraGesture(); viewport.setCameraSnapshot({ center: point, zoom });
    viewport.handlePointerUp(event(700, 500)); viewport.flushPendingViewportUpdates();
    const center = viewport.worldToScreenPoint(point);
    expect(center.x).toBeCloseTo(500, 8); expect(center.y).toBeCloseTo(400, 8);
    expect(viewport.camera.zoom).toBe(zoom); expect(viewport.dragState).toBeNull();
    expect(canvas.releasePointerCapture).toHaveBeenCalled(); expect(options.onElementMove).not.toHaveBeenCalled();
  });
  it("selecciona coordenadas sin snap y Escape/clic derecho no dibujan", () => {
    const { viewport, event, options } = setup([], []), handler = vi.fn();
    viewport.setReadOnly(false); viewport.setPathDrawingMode(true);
    const expected = viewport.screenToWorldPoint({ x: 523.25, y: 415.75 });
    viewport.selectAttentionPoint(handler); viewport.handlePointerDown(event(523.25, 415.75, "pointerdown")); viewport.handlePointerUp(event(523.25, 415.75));
    expect(handler).toHaveBeenCalledExactlyOnceWith(expected); expect(options.onPathPointAdd).not.toHaveBeenCalled();
    handler.mockClear(); viewport.selectAttentionPoint(handler); viewport.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" })); expect(handler).toHaveBeenCalledExactlyOnceWith(null);
    handler.mockClear(); viewport.selectAttentionPoint(handler); viewport.handlePointerDown(Object.assign(new MouseEvent("pointerdown", { button: 2 }), { pointerId: 2 }) as PointerEvent); expect(handler).toHaveBeenCalledExactlyOnceWith(null);
    expect(options.onPathPointAdd).not.toHaveBeenCalled();
  });
});
