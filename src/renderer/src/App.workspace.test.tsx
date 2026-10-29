// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewportCameraSnapshot } from "../../domain/player/player-window";
import { createDefaultSceneMap, createSceneWithMap } from "../../domain/sessions/scene-maps";
import type { MapViewport, MapViewportHandle } from "./components/MapViewport";
import { App } from "./App";

type ViewportProps = ComponentProps<typeof MapViewport>;
const viewport = vi.hoisted(() => ({
  props: null as ViewportProps | null,
  mount: vi.fn(),
  unmount: vi.fn(),
  handle: {
    setCameraSnapshot: vi.fn<MapViewportHandle["setCameraSnapshot"]>(),
    getRandomVisibleWorldPoint: vi.fn(() => ({ x: 0, y: 0 })),
    getNearbyVisibleWorldPoint: vi.fn(() => ({ x: 0, y: 0 })),
    setPathHoverPoint: vi.fn<MapViewportHandle["setPathHoverPoint"]>(),
    setWaterHoverPoint: vi.fn<MapViewportHandle["setWaterHoverPoint"]>(),
    centerOnWorldPoint: vi.fn<MapViewportHandle["centerOnWorldPoint"]>(),
    setPlayerCameraControlState: vi.fn<MapViewportHandle["setPlayerCameraControlState"]>(),
    clearPlayerCameraControlState: vi.fn<MapViewportHandle["clearPlayerCameraControlState"]>()
  } satisfies MapViewportHandle
}));

vi.mock("./components/MapViewport", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react");
  return {
    MapViewport: forwardRef<MapViewportHandle, ViewportProps>(function MockMapViewport(props, ref) {
      viewport.props = props;
      useImperativeHandle(ref, () => viewport.handle, []);
      useEffect(() => {
        viewport.mount();
        return () => { viewport.unmount(); };
      }, []);
      return <div data-testid="workspace-canvas" tabIndex={0}>{props.overlay}</div>;
    })
  };
});

describe("App production workspace", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("ResizeObserver", class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    });
    Reflect.deleteProperty(window, "ttrpg");
    sessionStorage.clear();
    viewport.props = null;
    const map = createDefaultSceneMap({ id: "workspace-map", name: "Workspace fixture" });
    const scene = createSceneWithMap({
      ...map,
      camera: { x: 10, y: 20, zoom: 1 },
      settings: { ...map.settings, snapToGrid: false }
    });
    sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(scene));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    sessionStorage.clear();
    Reflect.deleteProperty(window, "ttrpg");
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function render(width = 1440): Promise<void> {
    vi.stubGlobal("innerWidth", width);
    await act(async () => root.render(<App />));
    expect(window.ttrpg).toBeUndefined();
    expect(host.textContent).toContain("Workspace fixture");
  }

  function props(): ViewportProps {
    expect(viewport.props).not.toBeNull();
    return viewport.props!;
  }

  function element<T extends HTMLElement = HTMLElement>(selector: string, scope: ParentNode = host): T {
    const result = scope.querySelector<T>(selector);
    expect(result, `Missing ${selector}`).not.toBeNull();
    return result!;
  }

  function button(label: string, scope: ParentNode = host): HTMLButtonElement {
    const matches = [...scope.querySelectorAll<HTMLButtonElement>("button")].filter(candidate =>
      (candidate.getAttribute("aria-label") ?? candidate.textContent?.trim()) === label
    );
    expect(matches, `Expected one button named ${label}`).toHaveLength(1);
    return matches[0];
  }

  async function click(target: HTMLElement): Promise<void> {
    await act(async () => target.click());
  }

  async function rail(label: string): Promise<void> {
    await click(button(label, element('[aria-label="Herramientas del mapa"]')));
  }

  async function option(label: string): Promise<void> {
    await click(button(label, element('[aria-label="Opciones de herramienta"]')));
  }

  async function navigate(camera: ViewportCameraSnapshot): Promise<void> {
    expect(props().onCameraChange).toBeTypeOf("function");
    await act(async () => props().onCameraChange!(camera));
  }

  async function contextAt(world: { x: number; y: number }): Promise<void> {
    await act(async () => props().onContextMenuRequest({
      screen: { x: 100, y: 120 }, world, targetElementId: null
    }));
  }

  it("creates rail shapes at the current camera center and context shapes at the clicked world point", async () => {
    await render();
    const center = { x: 237, y: -113 };
    const clicked = { x: -421, y: 79 };
    await navigate({ center, zoom: 1.5 });
    await rail("Areas");
    await option("Area circular");
    expect(props().shapes).toHaveLength(1);
    expect(props().shapes[0]).toMatchObject({ type: "circle", points: [center] });
    expect(props().selectedElementId).toBe(props().shapes[0].id);

    await contextAt(clicked);
    await click(button("C\u00edrculo", element(".context-menu")));
    expect(props().shapes).toHaveLength(2);
    expect(props().shapes[1]).toMatchObject({ type: "circle", points: [clicked] });
    expect(props().shapes[0].points[0]).toEqual(center);
    expect(props().selectedElementId).toBe(props().shapes[1].id);
    expect(host.querySelector(".context-menu")).toBeNull();
  });

  it("creates rail lights at the latest camera center without reusing a prior context position", async () => {
    await render();
    const clicked = { x: -320, y: 70 };
    await contextAt(clicked);
    await click(button("Luz puntual", element(".context-menu")));
    expect(props().lights).toHaveLength(1);
    expect(props().lights[0]).toMatchObject({ kind: "point", position: clicked });

    const center = { x: 345, y: 213 };
    await navigate({ center, zoom: 2 });
    await rail("Luces");
    await option("Luz conica");
    expect(props().lights).toHaveLength(2);
    expect(props().lights[1]).toMatchObject({ kind: "cone", position: center });
    expect(props().selectedElementId).toBe(props().lights[1].id);
    expect(props().lights[0].position).toEqual(clicked);
  });

  it("delegates fire and lightning gestures to the viewport and selects completed effects", async () => {
    await render();
    await rail("Fuego");
    await option("Circulo de fuego");
    expect(props()).toMatchObject({ fireTool: "circle", lightningTool: null, isFirePaintMode: false });
    expect(props().effects).toHaveLength(0);
    expect(props().onFireCreate).toBeTypeOf("function");
    await act(async () => props().onFireCreate!("circle", { x: 25, y: 35 }, { x: 85, y: 35 }));
    expect(props().effects).toHaveLength(1);
    const fire = props().effects[0];
    expect(fire).toMatchObject({ kind: "fire", position: { x: 25, y: 35 }, zone: { kind: "circle" } });
    expect(props()).toMatchObject({ fireTool: null, selectedElementId: fire.id });

    await rail("Relampago");
    await option("Relampago: Linea");
    expect(props()).toMatchObject({ lightningTool: "line", fireTool: null, selectedElementId: null });
    expect(props().effects).toHaveLength(1);
    expect(props().onLightningCreate).toBeTypeOf("function");
    await act(async () => props().onLightningCreate!("line", { x: 75, y: 95 }, { x: 175, y: 95 }));
    expect(props().effects).toHaveLength(2);
    const lightning = props().effects[1];
    expect(lightning).toMatchObject({ kind: "lightning", position: { x: 75, y: 95 }, zone: { kind: "line" } });
    expect(props()).toMatchObject({ lightningTool: null, selectedElementId: lightning.id });
  });

  it("activates pan and cancels it with Escape or another drawing tool", async () => {
    await render();
    await rail("Desplazar mapa");
    expect(props().isGrabMode).toBe(true);
    expect(button("Desplazar mapa").getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      element('[data-testid="workspace-canvas"]').dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape", bubbles: true, cancelable: true
      }));
    });
    expect(props().isGrabMode).toBe(false);
    expect(button("Seleccionar").getAttribute("aria-pressed")).toBe("true");

    await rail("Desplazar mapa");
    await rail("Fuego");
    await option("Pintar fuego");
    expect(props()).toMatchObject({ isGrabMode: false, isFirePaintMode: true });
  });

  it("preserves canvas and scene state across panel toggles and selects the properties tab", async () => {
    await render();
    await rail("Areas");
    await option("Area rectangular");
    const shape = props().shapes[0];
    const canvas = element('[data-testid="workspace-canvas"]');
    await click(button("Alternar explorador"));
    await click(button("Alternar inspector"));
    expect(element(".dm-aside-panel").hidden).toBe(true);
    expect(element(".control-sidebar").hidden).toBe(true);
    await click(button("Alternar explorador"));
    await click(button("Abrir dados"));
    expect(element("#right-tab-dice").getAttribute("aria-selected")).toBe("true");
    await act(async () => props().onElementSelect(shape.id));
    expect(element("#right-tab-properties").getAttribute("aria-selected")).toBe("true");
    expect(props().selectedElementId).toBe(shape.id);
    expect(props().shapes).toEqual([shape]);
    expect(element('[data-testid="workspace-canvas"]')).toBe(canvas);
    expect(viewport.mount).toHaveBeenCalledOnce();
    expect(viewport.unmount).not.toHaveBeenCalled();
    expect(viewport.handle.setCameraSnapshot).not.toHaveBeenCalled();
  });

  it("keeps the real dice panel and sound preference mounted when changing tabs and hiding the inspector", async () => {
    await render();
    await click(button("Abrir dados"));
    const panel = element(".dice-panel");
    const sound = element<HTMLInputElement>(".dice-sound-control input", panel);
    expect(sound.checked).toBe(true);
    await click(sound);
    expect(sound.checked).toBe(false);
    await click(element("#right-tab-properties"));
    await click(button("Alternar inspector"));
    expect(element(".control-sidebar").hidden).toBe(true);
    await click(button("Abrir dados"));
    expect(element(".control-sidebar").hidden).toBe(false);
    expect(element("#right-panel-dice").hidden).toBe(false);
    expect(element(".dice-panel")).toBe(panel);
    expect(element<HTMLInputElement>(".dice-sound-control input").checked).toBe(false);
    expect(viewport.mount).toHaveBeenCalledOnce();
    expect(viewport.unmount).not.toHaveBeenCalled();
  });

  it("routes DM zoom to the viewport handle while Player controls remain unavailable without preload", async () => {
    await render();
    const camera = { center: { x: 200, y: -70 }, zoom: 1.25 };
    await navigate(camera);
    const grid = props().grid;
    const playerUpdates = viewport.handle.setPlayerCameraControlState.mock.calls.length;
    const playerClears = viewport.handle.clearPlayerCameraControlState.mock.calls.length;
    expect(element('[aria-label="Zoom DM"]').textContent).toBe("125%");
    await click(button("Acercar mapa DM"));
    expect(viewport.handle.setCameraSnapshot).toHaveBeenCalledOnce();
    const zoomed = viewport.handle.setCameraSnapshot.mock.calls[0][0];
    expect(zoomed.center).toEqual(camera.center);
    expect(zoomed.zoom).toBeGreaterThan(camera.zoom);
    expect(element('[aria-label="Zoom DM"]').textContent).toBe(`${Math.round(zoomed.zoom * 100)}%`);
    await click(button("Alejar mapa DM"));
    expect(viewport.handle.setCameraSnapshot).toHaveBeenCalledTimes(2);
    expect(viewport.handle.setCameraSnapshot.mock.calls[1][0].zoom).toBeCloseTo(camera.zoom);
    expect(props().grid).toEqual(grid);
    expect(viewport.handle.setPlayerCameraControlState).toHaveBeenCalledTimes(playerUpdates);
    expect(viewport.handle.clearPlayerCameraControlState).toHaveBeenCalledTimes(playerClears);
    expect(button("Acercar camara de jugador").disabled).toBe(true);
    expect(button("Alejar camara de jugador").disabled).toBe(true);
    expect(window.ttrpg).toBeUndefined();
  });

  it("starts narrow viewports with closed drawers and opens only one at a time", async () => {
    await render(900);
    const explorer = element(".dm-aside-panel");
    const inspector = element(".control-sidebar");
    expect(explorer.hidden).toBe(true);
    expect(inspector.hidden).toBe(true);
    await click(button("Alternar explorador"));
    expect(explorer.hidden).toBe(false);
    expect(inspector.hidden).toBe(true);
    await click(button("Alternar inspector"));
    expect(explorer.hidden).toBe(true);
    expect(inspector.hidden).toBe(false);
    await click(button("Alternar explorador"));
    await click(button("Abrir dados"));
    expect(explorer.hidden).toBe(true);
    expect(inspector.hidden).toBe(false);
    expect(element("#right-tab-dice").getAttribute("aria-selected")).toBe("true");
    await rail("Areas");
    expect(explorer.hidden).toBe(true);
    expect(inspector.hidden).toBe(true);
    await option("Area conica");
    expect(props().shapes.at(-1)?.type).toBe("cone");
    expect(inspector.hidden).toBe(true);
    expect(viewport.mount).toHaveBeenCalledOnce();
    expect(viewport.unmount).not.toHaveBeenCalled();
  });
});
