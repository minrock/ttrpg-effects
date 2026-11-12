// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Graphics } from "pixi.js";
import { PixiViewport } from "./PixiViewport";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { SceneGrid } from "../../domain/sessions/scene-document";
import type { WorldPoint } from "../../domain/shared/coordinates";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });

interface Harness extends Pick<PixiViewport, "setGridAdjustMode" | "setReadOnly"> {
  handlePointerDown(event: PointerEvent): void;
  handlePointerMove(event: PointerEvent): void;
  handlePointerUp(event: PointerEvent): void;
  handleWindowBlur(): void;
  flushPendingViewportUpdates(): void;
  cancelPendingViewportUpdates(): void;
  getCalibrationOrigin(): WorldPoint;
  drawCalibrationHandle(): Graphics;
  worldToScreenPoint(point: WorldPoint): WorldPoint;
  grid: SceneGrid;
  camera: { center: WorldPoint; zoom: number };
  dragState: { mode: string } | null;
}

const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals(); });

function setup(zoom = 1) {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const canvas = document.createElement("canvas");
  canvas.setPointerCapture = vi.fn();
  const onGridCalibrationChange = vi.fn();
  const onElementSelect = vi.fn();
  const onCameraChange = vi.fn();
  const viewport = Reflect.construct(PixiViewport, [document.createElement("div"), {
    onGridCalibrationChange, onElementSelect, onCameraChange
  }]) as Harness;
  const scene = createDefaultScene();
  Object.assign(viewport, {
    app: { canvas, renderer: { width: 1000, height: 800 } },
    camera: { center: { x: 70, y: -30 }, zoom },
    grid: { ...scene.grid, enabled: true, cellSizeWorld: 100, origin: { x: 20, y: 10 } },
    map: { position: { x: 20, y: 10 } },
    settings: scene.settings,
    // An object under the anchor must not steal the calibration gesture.
    hitTestElement: vi.fn(() => "under-control"),
    drawSelectionLayer: vi.fn(),
    setGrid: (grid: SceneGrid) => { viewport.grid = grid; }
  });
  viewport.setGridAdjustMode(true);
  cleanups.push(() => viewport.cancelPendingViewportUpdates());
  const event = (world: WorldPoint, type: string) => {
    const point = viewport.worldToScreenPoint(world);
    return Object.assign(new MouseEvent(type, { clientX: point.x, clientY: point.y, button: 0 }), { pointerId: 1 }) as PointerEvent;
  };
  const move = (world: WorldPoint) => viewport.handlePointerMove(event(world, "pointermove"));
  const down = (world: WorldPoint) => viewport.handlePointerDown(event(world, "pointerdown"));
  const up = (world: WorldPoint, type = "pointerup") => viewport.handlePointerUp(event(world, type));
  return { viewport, canvas, move, down, up, onGridCalibrationChange, onElementSelect, onCameraChange };
}

describe("control móvil de calibración", () => {
  it("dibuja un cuadrado de una celda con el tirador en la esquina opuesta", () => {
    const { viewport } = setup();
    const guide = viewport.drawCalibrationHandle();
    const bounds = guide.getLocalBounds();
    expect(bounds.width).toBeCloseTo(bounds.height);
    expect(bounds.maxX).toBeCloseTo(132);
    expect(bounds.maxY).toBeCloseTo(122);
    guide.destroy();
  });

  it.each([0.5, 1, 2])("mueve el ancla sin saltos y conserva el tamaño de celda con zoom %s", zoom => {
    const { viewport, canvas, down, move, up, onGridCalibrationChange, onElementSelect, onCameraChange } = setup(zoom);
    const camera = structuredClone(viewport.camera);
    move({ x: 23, y: 12 });
    expect(canvas.style.cursor).toBe("grab");
    expect(canvas.title).toContain("alinear la grilla");
    down({ x: 23, y: 12 });
    expect(canvas.style.cursor).toBe("grabbing");
    move({ x: 83, y: 92 });
    up({ x: 83, y: 92 });
    expect(viewport.getCalibrationOrigin()).toEqual({ x: 80, y: 90 });
    expect(viewport.camera).toEqual(camera);
    expect(onGridCalibrationChange).toHaveBeenLastCalledWith(expect.objectContaining({ origin: { x: 80, y: 90 }, cellSizeWorld: 100 }));
    expect(onElementSelect).not.toHaveBeenCalled();
    expect(onCameraChange).not.toHaveBeenCalled();
    expect(canvas.style.cursor).toBe("grab");
  });

  it("calibra con la esquina inferior derecha desde el ancla desplazada", () => {
    const { viewport, down, move, up, onGridCalibrationChange, canvas } = setup();
    down({ x: 20, y: 10 }); move({ x: 80, y: 90 }); up({ x: 80, y: 90 });
    move({ x: 180, y: 190 });
    expect(canvas.style.cursor).toBe("nwse-resize");
    down({ x: 180, y: 190 }); move({ x: 230, y: 240 }); up({ x: 230, y: 240 });
    expect(onGridCalibrationChange).toHaveBeenLastCalledWith(expect.objectContaining({ cellSizeWorld: 150, origin: { x: 80, y: 90 } }));
    expect(viewport.getCalibrationOrigin()).toEqual({ x: 80, y: 90 });
  });

  it.each([
    [{ x: 170, y: 110 }, 125],
    [{ x: 120, y: 160 }, 125],
    [{ x: 70, y: 60 }, 50],
    [{ x: -80, y: -90 }, 8]
  ] as const)("redimensiona conservando proporción: %j", (target, expected) => {
    const { down, move, up, onGridCalibrationChange } = setup();
    down({ x: 123, y: 112 });
    const point = { x: target.x + 3, y: target.y + 2 };
    move(point); up(point);
    expect(onGridCalibrationChange).toHaveBeenLastCalledWith(expect.objectContaining({ cellSizeWorld: expected, origin: { x: 20, y: 10 } }));
  });

  it("reabre sobre una celda de la grilla alineada", () => {
    const { viewport, down, move, up } = setup();
    down({ x: 20, y: 10 }); move({ x: -40, y: -60 }); up({ x: -40, y: -60 });
    viewport.setGridAdjustMode(true);
    expect(viewport.getCalibrationOrigin()).toEqual({ x: -40, y: -60 });
    viewport.setGridAdjustMode(false);
    viewport.setGridAdjustMode(true);
    expect(viewport.getCalibrationOrigin()).toEqual({ x: -40, y: -60 });
  });

  it.each(["cancel", "blur", "disable"])("termina el movimiento al recibir %s", action => {
    const { viewport, down, move, up, canvas, onGridCalibrationChange } = setup();
    down({ x: 20, y: 10 }); move({ x: 80, y: 90 });
    if (action === "cancel") up({ x: 80, y: 90 }, "pointercancel");
    if (action === "blur") viewport.handleWindowBlur();
    if (action === "disable") viewport.setGridAdjustMode(false);
    expect(viewport.dragState).toBeNull();
    expect(canvas.style.cursor).toBe("default");
    expect(onGridCalibrationChange).toHaveBeenLastCalledWith(expect.objectContaining({ origin: { x: 80, y: 90 } }));
  });

  it("impide manipular el control en una vista de solo lectura", () => {
    const { viewport, down, move, onGridCalibrationChange } = setup();
    viewport.setReadOnly(true);
    down({ x: 20, y: 10 }); move({ x: 80, y: 90 });
    expect(viewport.getCalibrationOrigin()).toEqual({ x: 20, y: 10 });
    expect(onGridCalibrationChange).not.toHaveBeenCalled();
  });
});
