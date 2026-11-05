// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TtrpgApi } from "../../preload/ttrpg-api";
import type { PlayerWindowSnapshot, ViewportCameraSnapshot } from "../../domain/player/player-window";
import type { SceneShape } from "../../domain/sessions/scene-document";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { MapViewport } from "./components/MapViewport";
import { PlayerApp } from "./PlayerApp";

type ViewportProps = ComponentProps<typeof MapViewport>;
const viewport = vi.hoisted(() => ({
  props: null as ViewportProps | null,
  effectiveCamera: null as ViewportCameraSnapshot | null,
  setPathHoverPoint: vi.fn(),
  setCameraSnapshot: vi.fn()
}));

vi.mock("./components/MapViewport", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react");
  return {
    MapViewport: forwardRef<import("./components/MapViewport").MapViewportHandle, ViewportProps>(function MockViewport(props, ref) {
      viewport.props = props;
      useImperativeHandle(ref, () => ({
        setCameraSnapshot: (camera) => { viewport.effectiveCamera = camera; viewport.setCameraSnapshot(camera); },
        setPathHoverPoint: viewport.setPathHoverPoint,
        getRandomVisibleWorldPoint: () => ({ x: 0, y: 0 }),
        getNearbyVisibleWorldPoint: (origin) => origin,
        setWaterHoverPoint: () => undefined,
        centerOnWorldPoint: () => undefined,
        setPlayerCameraControlState: () => undefined,
        clearPlayerCameraControlState: () => undefined
      }));
      useEffect(() => { viewport.effectiveCamera = props.cameraSnapshot ?? null; }, [props.cameraSnapshot]);
      return null;
    })
  };
});
vi.mock("./components/aside/PlayerAsideOverlay", () => ({ PlayerAsideOverlay: () => null }));
vi.mock("./components/combat/CombatTurnBar", () => ({ CombatTurnBar: () => null }));
vi.mock("./components/counters/SceneCountersOverlay", () => ({ SceneCountersOverlay: () => null }));

const dmShape: SceneShape = { id: "dm-circle", type: "circle", points: [{ x: 10, y: 20 }], radius: 30 };

describe("PlayerApp local tools", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onScene: (snapshot: PlayerWindowSnapshot) => void;
  let initial: PlayerWindowSnapshot;
  const saveScene = vi.fn<TtrpgApi["saveScene"]>();
  const publishPlayerScene = vi.fn<TtrpgApi["publishPlayerScene"]>();

  function props(): ViewportProps {
    expect(viewport.props).not.toBeNull();
    return viewport.props!;
  }

  function button(label: string): HTMLButtonElement {
    const result = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.getAttribute("aria-label") === label);
    expect(result, `Missing button: ${label}`).toBeDefined();
    return result!;
  }

  async function click(label: string): Promise<void> {
    await act(async () => button(label).click());
  }

  async function key(keyName: string): Promise<void> {
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: keyName, bubbles: true })));
  }

  async function scene(snapshot: PlayerWindowSnapshot): Promise<void> {
    await act(async () => onScene(snapshot));
  }

  function localShapes(): SceneShape[] {
    const editableIds = props().localEditableShapeIds ?? [];
    return props().shapes.filter((shape) => editableIds.includes(shape.id));
  }

  function toolCallbacks(): Pick<ViewportProps,
    "onElementSelect" | "onElementMove" | "onShapeEndMove" | "onPathPointAdd" |
    "onPathPointerMove" | "onPathPointMove" | "onPathMove" |
    "onShapeDirectionChange" | "onShapeRadiusChange" | "onShapeRectResize"> {
    const current = props();
    return {
      onElementSelect: current.onElementSelect,
      onElementMove: current.onElementMove,
      onShapeEndMove: current.onShapeEndMove,
      onPathPointAdd: current.onPathPointAdd,
      onPathPointerMove: current.onPathPointerMove,
      onPathPointMove: current.onPathPointMove,
      onPathMove: current.onPathMove,
      onShapeDirectionChange: current.onShapeDirectionChange,
      onShapeRadiusChange: current.onShapeRadiusChange,
      onShapeRectResize: current.onShapeRectResize
    };
  }

  async function createCircle(): Promise<SceneShape> {
    await click("Areas");
    await click("Area circular");
    expect(localShapes()).toHaveLength(1);
    return localShapes()[0];
  }

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.clearAllMocks();
    viewport.props = null;
    viewport.effectiveCamera = null;
    initial = {
      scene: { ...createDefaultScene(), shapes: [dmShape] },
      mapImageUrl: null, tokenImageUrls: {},
      camera: { center: { x: 100, y: 200 }, zoom: 1.25 }, cameraSyncKey: 10,
      showDmFogOverlay: false, showZoomIndicator: false
    };
    const api = {
      getPlayerWindowState: async () => ({ snapshot: initial, camera: null, cameraCommand: null, isOpen: true }),
      onPlayerScene: (handler) => { onScene = handler; return () => undefined; },
      onPlayerCameraCommand: () => () => undefined,
      onPlayerPointer: () => () => undefined,
      onPlayerInformationAreaHighlight: () => () => undefined,
      reportPlayerCamera: async () => ({ ok: true }),
      reportPlayerMapImageStatus: async () => undefined,
      notifyPlayerContentReady: async () => ({ ok: true }),
      saveScene,
      publishPlayerScene
    } satisfies Partial<TtrpgApi>;
    Object.defineProperty(window, "ttrpg", { configurable: true, value: api });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<PlayerApp />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(window, "ttrpg");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps table data in a retractable sidebar without resetting drawings or camera", async () => {
    expect(container.querySelector("#player-table-sidebar")).toBeNull();
    const local = await createCircle();
    await act(async () => root.render(<PlayerApp tablePanel={<details open><summary>Datos de la mesa</summary><button aria-label="Salir de la partida">Salir de la partida</button></details>} />));
    const sidebar = container.querySelector<HTMLElement>("#player-table-sidebar")!;
    const toggle = container.querySelector<HTMLButtonElement>('[aria-controls="player-table-sidebar"]')!;
    if (sidebar.hidden) await act(async () => toggle.click());
    expect(sidebar.hidden).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(button("Salir de la partida").closest("#player-table-sidebar")).toBe(sidebar);
    const camera = props().cameraSnapshot;
    const inner = button("Salir de la partida");
    inner.focus();
    await act(async () => inner.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
    expect(localShapes()).toEqual([local]);
    await act(async () => inner.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(sidebar.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
    await click("Mostrar mesa");
    expect(button("Salir de la partida")).toBe(inner);
    expect(props().cameraSnapshot).toEqual(camera);
    expect(localShapes()).toEqual([local]);
    await click("Ocultar mesa");
    expect(sidebar.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it("creates a local shape from PlayerTools at the effective local camera without persisting it", async () => {
    const localCamera = { center: { x: -340, y: 870 }, zoom: 2 };
    await act(async () => props().onCameraChange?.(localCamera));
    expect(viewport.effectiveCamera).toEqual(initial.camera);
    const local = await createCircle();
    expect(local.id).toMatch(/^player-local-/);
    expect(local.points[0]).toEqual({ x: -300, y: 900 });
    expect(props().shapes).toEqual([dmShape, local]);
    expect(props().localEditableShapeIds).toEqual([local.id]);
    expect(props().isReadOnly).toBe(true);
    expect(props().viewRole).toBe("player");
    expect(props().selectedElementId).toBe(local.id);
    expect(saveScene).not.toHaveBeenCalled();
    expect(publishPlayerScene).not.toHaveBeenCalled();
  });

  it("selects, edits and deletes only local shapes while DM shapes stay read only", async () => {
    const local = await createCircle();
    await act(async () => props().onElementSelect(dmShape.id));
    expect(props().selectedElementId).toBeNull();
    await act(async () => {
      props().onElementMove(dmShape.id, 999, 999);
      props().onShapeRadiusChange(dmShape.id, 99);
    });
    expect(props().shapes[0]).toEqual(dmShape);
    await act(async () => props().onElementSelect(local.id));
    await act(async () => props().onElementMove(local.id, 45, 60));
    expect(localShapes()[0].points[0]).toEqual({ x: 0, y: 100 });
    await key("Delete");
    expect(props().shapes).toEqual([dmShape]);
    expect(props().localEditableShapeIds).toEqual([]);
    expect(saveScene).not.toHaveBeenCalled();
    expect(publishPlayerScene).not.toHaveBeenCalled();
  });

  it.each([
    ["Area circular", "circle"], ["Area cuadrada", "rectangle"],
    ["Area rectangular", "rectangle"], ["Area conica", "cone"]
  ] as const)("creates %s and clears only local content", async (label, type) => {
    await click("Areas");
    await click(label);
    const shape = localShapes()[0];
    expect(shape.type).toBe(type);
    if (label === "Area cuadrada") expect(shape.width).toBe(shape.height);
    if (type === "cone") {
      await act(async () => props().onShapeDirectionChange(shape.id, 270));
      expect(localShapes()[0].direction).toBe(270);
    }
    if (type === "rectangle") {
      await act(async () => props().onShapeRectResize(shape.id, 80, 60, 200, 300));
      expect(localShapes()[0]).toMatchObject({ width: 80, height: 60, points: [{ x: 200, y: 300 }] });
    }
    await click("Borrar todas las formas");
    expect(props().shapes).toEqual([dmShape]);
    expect(props().selectedElementId).toBeNull();
  });

  it("cancels pan with Escape while its toolbar button is focused, and respects local zoom lock", async () => {
    await click("Desplazar mapa");
    expect(props().isGrabMode).toBe(true);
    await act(async () => button("Desplazar mapa").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(props().isGrabMode).toBe(false);
    expect(button("Acercar vista local").disabled).toBe(true);
    await click("Acercar vista local");
    expect(viewport.setCameraSnapshot).not.toHaveBeenCalled();
    await click("Desbloquear zoom local");
    const effective = { center: { x: 350, y: -150 }, zoom: 2 };
    await act(async () => props().onCameraChange?.(effective));
    await click("Acercar vista local");
    expect(viewport.setCameraSnapshot).toHaveBeenCalledWith({ center: effective.center, zoom: expect.any(Number) });
    expect(viewport.effectiveCamera!.zoom).toBeGreaterThan(effective.zoom);
    expect(props().cameraSnapshot).toEqual(initial.camera);
  });

  it("keeps viewport tool callback references stable through local changes and grid snapshots", async () => {
    const callbacks = toolCallbacks();
    const expectStable = (): void => {
      const current = toolCallbacks();
      for (const key of Object.keys(callbacks) as (keyof typeof callbacks)[]) {
        expect(current[key], key).toBe(callbacks[key]);
      }
    };

    const local = await createCircle();
    expectStable();
    await act(async () => props().onElementSelect(null));
    expectStable();
    await act(async () => props().onElementSelect(local.id));
    expectStable();
    await act(async () => props().onShapeRadiusChange(local.id, 175));
    expect(localShapes()[0].radius).toBe(175);
    expectStable();

    await scene({ ...initial, scene: {
      ...initial.scene,
      grid: { ...initial.scene.grid, cellSizeWorld: 25 },
      settings: { ...initial.scene.settings, snapToGrid: true }
    } });
    expectStable();
    await act(async () => callbacks.onElementMove(local.id, 43, 61));
    expect(localShapes()[0].points[0]).toEqual({ x: 50, y: 50 });
    expectStable();
  });

  it("does not delete a selected shape when Delete is pressed in a numeric property input", async () => {
    const local = await createCircle();
    const radiusInput = container.querySelector<HTMLInputElement>('.player-tools input[type="number"]');
    expect(radiusInput).not.toBeNull();
    await act(async () => radiusInput!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
    expect(localShapes().map((shape) => shape.id)).toEqual([local.id]);
    expect(props().selectedElementId).toBe(local.id);
    await key("Delete");
    expect(localShapes()).toEqual([]);
  });

  it("preserves local ids across same-epoch snapshots and clears them on cameraSyncKey change", async () => {
    const local = await createCircle();
    await scene({ ...initial, scene: { ...initial.scene, shapes: [{ ...dmShape, radius: 50 }] } });
    expect(props().shapes.map((shape) => shape.id)).toEqual([dmShape.id, local.id]);
    expect(props().shapes[0].radius).toBe(50);
    expect(localShapes()[0]).toEqual(local);
    await scene({ ...initial, cameraSyncKey: 11 });
    expect(props().shapes).toEqual([dmShape]);
    expect(props().localEditableShapeIds).toEqual([]);
    expect(props().selectedElementId).toBeNull();
  });

  it("supports measurement and path confirmation, Escape cancellation, and hidden controls", async () => {
    await click("Medir");
    await click("Medir distancia");
    expect(props().isPathDrawingMode).toBe(true);
    await act(async () => {
      props().onPathPointAdd({ x: 1, y: 2 });
      props().onPathPointAdd({ x: 40, y: 50 });
    });
    expect(localShapes()[0].type).toBe("measurement");
    const measurementId = localShapes()[0].id;
    await act(async () => props().onShapeEndMove(measurementId, 80, 90));
    expect(localShapes()[0].points[1]).toEqual({ x: 80, y: 90 });
    await click("Medir");
    await click("Dibujar camino");
    await act(async () => props().onPathPointAdd({ x: 5, y: 6 }));
    expect(props().pathPreviewPoints).toEqual([{ x: 5, y: 6 }]);
    await act(async () => props().onPathPointerMove({ x: 7, y: 8 }));
    expect(viewport.setPathHoverPoint).toHaveBeenCalledWith({ x: 7, y: 8 });
    await key("Escape");
    expect(props().pathPreviewPoints).toEqual([]);
    expect(localShapes()).toHaveLength(1);
    await click("Medir");
    await click("Dibujar camino");
    await act(async () => props().onPathPointAdd({ x: 5, y: 6 }));
    await act(async () => props().onPathPointAdd({ x: 30, y: 40 }));
    await click("Terminar camino");
    expect(localShapes().map((shape) => shape.type)).toEqual(["measurement", "path"]);
    expect(props().isPathDrawingMode).toBe(false);
    await click("Medir");
    await click("Dibujar camino");
    await act(async () => props().onPathPointAdd({ x: 60, y: 70 }));
    await click("Ocultar herramientas");
    expect(container.querySelector(".player-tools")).toBeNull();
    expect(props().localEditableShapeIds).toBeUndefined();
    expect(props().pathPreviewPoints).toEqual([]);
    expect(props().isPathDrawingMode).toBe(false);
    expect(props().shapes).toHaveLength(3);
    await click("Mostrar herramientas");
    expect(container.querySelector(".player-tools")).not.toBeNull();
    expect(localShapes()).toHaveLength(2);
    expect(saveScene).not.toHaveBeenCalled();
    expect(publishPlayerScene).not.toHaveBeenCalled();
  });
});
