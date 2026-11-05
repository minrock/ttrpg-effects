// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewportCameraSnapshot } from "../../domain/player/player-window";
import { createDefaultSceneMap, createSceneWithMap, syncRuntimeFieldsFromActiveMap } from "../../domain/sessions/scene-maps";
import type { MapViewport, MapViewportHandle } from "./components/MapViewport";
import { App } from "./App";
import { PlayerApp } from "./PlayerApp";
import { TableSession } from "../../application/services/table-session";
import { randomUUID } from "node:crypto";
import type { TableEvent } from "../../shared/contracts/table";
import { parseSceneJson } from "../../domain/sessions/scene-schema";
import { connectInternalSceneLink } from "../../domain/annotations/internal-scene-links";
import { createReciprocalSceneLinkMarkers } from "../../domain/annotations/scene-navigation-links";
import { DialogBroker, DialogHost } from "../../web/dialogs";
import { createBrowserClient } from "../../infrastructure/browser/browser-client";
import { HttpTransport } from "../../infrastructure/browser/http";
import { ClientProvider } from "./client/ClientProvider";
import { createClient } from "../../shared/api/client";
import type { TtrpgApi } from "../../shared/api/ttrpg-api";
import type { MapInformationArea } from "../../domain/annotations/map-annotations";

type ViewportProps = ComponentProps<typeof MapViewport>;
const viewport = vi.hoisted(() => ({
  props: null as ViewportProps | null,
  playerProps: null as ViewportProps | null,
  mount: vi.fn(),
  unmount: vi.fn(),
  handle: {
    cancelCameraGesture: vi.fn(), selectAttentionPoint: vi.fn(),
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
      if (props.viewRole === "player") viewport.playerProps = props;
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

  it.each(["absent", "no-player"] as const)("deletes local areas with %s client by Delete, Backspace and tree button", async (mode) => {
    const area: MapInformationArea = { id: "local-area", kind: "information-area", areaType: "terrain", name: "Local area", description: "", cells: [{ x: 0, y: 0, size: 100 }], locked: false };
    const client = mode === "absent" ? null : createClient({} as TtrpgApi, { scenes: false, images: false, libraries: false, player: false, dice: false, nativeMenus: false });
    for (const action of ["Delete", "Backspace", "button"]) {
      await act(async () => root.render(null));
      const map = createDefaultSceneMap({ id: "area-map", name: "Area map" });
      const scene = createSceneWithMap({ ...map, mapAnnotations: { ...map.mapAnnotations, areas: [area] } });
      sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(scene));
      await act(async () => root.render(<ClientProvider client={client}><App /></ClientProvider>));
      expect(props().mapAnnotations.areas).toHaveLength(1);
      await act(async () => props().onElementSelect(area.id));
      if (action === "button") {
        await click(button("Mapa"));
        const annotations = [...host.querySelectorAll<HTMLButtonElement>("button")].find(candidate => candidate.textContent?.includes("Anotaciones"));
        if (!host.querySelector('[aria-label="Eliminar Local area"]')) await click(annotations!);
        await click(button("Eliminar Local area"));
      } else {
        await act(async () => host.querySelector("[data-testid=workspace-canvas]")!.dispatchEvent(new KeyboardEvent("keydown", { key: action, bubbles: true })));
      }
      expect(props().mapAnnotations.areas).toHaveLength(0);
      expect(props().selectedElementId).toBeNull();
      expect(host.textContent).not.toContain("La proyeccion no esta disponible");
    }
  });

  it("preserves the lock when deleting a local area without a client", async () => {
    const map = createDefaultSceneMap({ id: "locked-map", name: "Locked" });
    sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(createSceneWithMap({ ...map, mapAnnotations: { ...map.mapAnnotations, areas: [{ id: "locked", kind: "information-area", areaType: "terrain", name: "Locked area", description: "", cells: [{ x: 0, y: 0, size: 100 }], locked: true }] } })));
    await act(async () => root.render(<ClientProvider client={null}><App /></ClientProvider>));
    await act(async () => props().onElementSelect("locked"));
    await act(async () => host.querySelector("[data-testid=workspace-canvas]")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
    expect(props().mapAnnotations.areas).toHaveLength(1);
  });

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

  it("keeps the table menu inside the sidebar and preserves its state across tabs", async () => {
    await act(async () => root.render(<App tablePanel={<details open><summary>Mesa · 2 jugadores</summary><input aria-label="Enlace de prueba" defaultValue="invitación" /></details>} />));
    const panel = element("#right-panel-table");
    const field = element<HTMLInputElement>('[aria-label="Enlace de prueba"]');
    const canvas = element('[data-testid="workspace-canvas"]');
    expect(panel.closest(".control-sidebar")).toBeTruthy();
    expect(panel.hidden).toBe(true);
    await click(element("#right-tab-table"));
    expect(panel.hidden).toBe(false);
    field.value = "conservado";
    await click(element("#right-tab-dice"));
    await click(element("#right-tab-table"));
    expect(element('[aria-label="Enlace de prueba"]')).toBe(field);
    expect(field.value).toBe("conservado");
    expect(element('[data-testid="workspace-canvas"]')).toBe(canvas);
    expect(viewport.unmount).not.toHaveBeenCalled();
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

  it("enfoca el centro DM sin zoom remoto y comunica errores recuperables", async () => {
    const scene = JSON.parse(sessionStorage.getItem("ttrpg:session-scene")!) as ReturnType<typeof createSceneWithMap>;
    const snapshot = { scene, mapImageUrl: null, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 1 }, cameraSyncKey: 0, mapNavigationKey: 0, showDmFogOverlay: false };
    const focus = vi.fn<NonNullable<TtrpgApi["focusPlayers"]>>(async () => ({ ok: true, delivered: 2, incompatible: 1, notReady: 0 }));
    const api = { focusPlayers: focus, getPlayerWindowState: async () => ({ snapshot, camera: null, cameraCommand: null, isOpen: true }),
      publishPlayerScene: async () => ({ ok: true }), onPlayerMapImageStatus: () => () => {}, onPlayerWindowReady: () => () => {}, onPlayerWindowClosed: () => () => {} } as unknown as TtrpgApi;
    const client = createClient(api, { scenes: false, images: false, libraries: false, player: true, dice: false, nativeMenus: false });
    await act(async () => root.render(<ClientProvider client={client}><App /></ClientProvider>));
    const center = { x: 345.67, y: -89.12 }; await navigate({ center, zoom: 2 });
    await click(button("Enfocar el centro de mi vista"));
    expect(focus).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ position: center, sceneId: scene.id }));
    expect(focus.mock.calls[0][0]).not.toHaveProperty("zoom");
    expect(host.textContent).toContain("2 ventana(s). 1 incompatibles");
    expect(viewport.handle.setCameraSnapshot).not.toHaveBeenCalled();
    focus.mockRejectedValueOnce(new Error("Conexión interrumpida"));
    await click(button("Enfocar el centro de mi vista")); expect(host.textContent).toContain("Conexión interrumpida");
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
    expect(host.querySelector('[aria-label="Acercar camara de jugador"]')).toBeNull();
    expect(host.querySelector('[aria-label="Alejar camara de jugador"]')).toBeNull();
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
  it("publica web por acción explícita y no por la mera presencia de un jugador", async () => {
    const browser = createBrowserClient(new HttpTransport(vi.fn()), { selectScene: async () => null, sceneName: async () => null });
    const publish = vi.fn(async () => ({ ok: true }));
    const open = vi.fn(async () => ({ ok: true }));
    const client = createClient({ ...browser.client.api, openPlayerWindow: open, publishPlayerScene: publish,
      getPlayerWindowState: async () => ({ snapshot: null, camera: null, cameraCommand: null, isOpen: true }),
      commandPlayerCamera: async () => ({ ok: true }) }, browser.client.capabilities, "service");
    await act(async () => root.render(<ClientProvider client={client}><App service={{ browser, confirmLeave: async () => null, logout: async () => {} }}/></ClientProvider>));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(publish).not.toHaveBeenCalled();
    await click(button("Publicar vista de jugador"));
    expect(open).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Proyección publicada");
    await click(button("Abrir dados"));
    expect(element('[role="tab"][aria-selected="true"]#right-tab-dice')).toBeTruthy();
  });
  it("protege cambios web ante guardar fallido/cancelar y no usa el autosave local", async () => {
    const scene=JSON.parse(sessionStorage.getItem("ttrpg:session-scene")!);
    const storage=vi.spyOn(Storage.prototype,"setItem");
    const browser=createBrowserClient(new HttpTransport(vi.fn()),{selectScene:async()=>null,sceneName:async()=>null});
    const load=vi.fn(async()=>({ok:true as const,scene,filePath:"scene:01010101-0101-4101-8101-010101010101",mapImageUrl:undefined,tokenImageUrls:{},warnings:[]}));
    const save=vi.fn(async()=>({ok:false as const,error:"Servicio desconectado"}));
    const client=createClient({...browser.client.api,loadScene:load,saveScene:save},browser.client.capabilities);
    const leave=vi.fn<()=>Promise<string|null>>();const logout=vi.fn(async()=>{});
    await act(async()=>root.render(<ClientProvider client={client}><App service={{browser,confirmLeave:leave,logout}}/></ClientProvider>));
    expect(host.textContent).not.toContain("Workspace fixture");
    await click(element('[aria-label="Menu de escena"]'));await click(button("Cargar escena"));
    expect(host.textContent).toContain("Workspace fixture");
    await rail("Areas");await option("Area conica");
    leave.mockResolvedValueOnce("save");await click(element('[aria-label="Menu de escena"]'));await click(button("Cerrar sesión"));
    expect(save).toHaveBeenCalledOnce();expect(logout).not.toHaveBeenCalled();expect(host.textContent).toContain("Servicio desconectado");expect(props().shapes).toHaveLength(1);
    leave.mockResolvedValueOnce(null);await click(element('[aria-label="Menu de escena"]'));await click(button("Cerrar sesión"));expect(logout).not.toHaveBeenCalled();
    leave.mockResolvedValueOnce("discard");await click(element('[aria-label="Menu de escena"]'));await click(button("Cerrar sesión"));expect(logout).toHaveBeenCalledOnce();expect(storage).not.toHaveBeenCalled();
  });

  it.each([false,true])("conecta desde App con selector remoto y conserva estado ante fallo (reparación=%s)",async broken=>{
    const base=parseSceneJson(sessionStorage.getItem("ttrpg:session-scene")!);
    const source="scene:01010101-0101-4101-8101-010101010101",target="scene:02020202-0202-4202-8202-020202020202";
    const marker={id:"a",kind:"scene-link" as const,name:"Puerta A",position:{x:0,y:0},locked:false,connection:null};
    const peer={...marker,id:"b",name:"Puerta B"};
    const old=broken?createReciprocalSceneLinkMarkers(marker,source,peer,"/anterior.ttrpgscene","old")[0]:marker;
    const scene={...base,mapAnnotations:{...base.mapAnnotations,sceneLinks:[old]}};
    const connected=createReciprocalSceneLinkMarkers(old,source,peer,target,"new")[0];
    const browser=createBrowserClient(new HttpTransport(vi.fn()),{selectScene:async()=>null,sceneName:async()=>null});
    const load=vi.fn(async()=>({ok:true as const,scene,filePath:source,warnings:[]}));
    const select=vi.fn(async()=>({ok:true as const,filePath:target}));
    const connect=vi.fn().mockResolvedValueOnce({ok:false,error:"Falló la conexión"}).mockResolvedValueOnce({ok:true,mapAnnotations:{...scene.mapAnnotations,sceneLinks:[connected]}});
    const save=vi.fn(async()=>({ok:true as const,scene,filePath:source,warnings:[]}));
    const client=createClient({...browser.client.api,loadScene:load,saveSceneToPath:save,selectSceneLinkTargetFile:select,listSceneLinkCandidates:async()=>({ok:true,candidate:{filePath:target,markers:[{...peer,available:true}]}}),connectSceneLink:connect,validateSceneLinks:async()=>({ok:true,statuses:{a:broken?{state:"broken",reason:"file-missing",message:"Ausente"}:{state:"unlinked"}}})},browser.client.capabilities);
    await act(async()=>root.render(<ClientProvider client={client}><App service={{browser,confirmLeave:async()=>null,logout:async()=>{}}}/></ClientProvider>));
    await click(element('[aria-label="Menu de escena"]'));await click(button("Cargar escena"));
    await act(async()=>props().onMapAnnotationPreview("a"));expect(host.textContent).toContain("Otra escena guardada");
    await click(button("Elegir escena del servicio"));expect(select).toHaveBeenCalledOnce();expect(element<HTMLSelectElement>('[aria-label="Marcador de la escena"]').value).toBe("b");
    await click(button("Conectar con esta escena"));expect(host.textContent).toContain("Falló la conexión");expect(props().mapAnnotations.sceneLinks[0].connection).toEqual(old.connection);
    await click(button("Conectar con esta escena"));expect(connect).toHaveBeenLastCalledWith({sourceScenePath:source,sourceMarkerId:"a",targetScenePath:target,targetMarkerId:"b"});expect(props().mapAnnotations.sceneLinks[0].connection?.peer.scenePath).toBe(target);expect(host.querySelector('.scene-link-modal')).toBeNull();
  });
  it.each(["remote", "internal"] as const)("exige Desligar antes de cambiar %s y conserva estado si falla", async (kind) => {
    const source = "scene:01010101-0101-4101-8101-010101010101";
    const target = "scene:02020202-0202-4202-8202-020202020202";
    const marker = { id: "a", kind: "scene-link" as const, name: "Puerta A", position: { x: 0, y: 0 }, locked: false, connection: null };
    const peer = { ...marker, id: "b", name: "Puerta B" };
    const mapA = createDefaultSceneMap({ id: "map-a", name: "Origen", mapAnnotations: { pins: [], areas: [], sceneLinks: [marker] } });
    const mapC = createDefaultSceneMap({ id: "map-c", name: "Interno", mapAnnotations: { pins: [], areas: [], sceneLinks: [{ ...marker, id: "c", name: "Puerta C" }] } });
    const free = syncRuntimeFieldsFromActiveMap({ ...createSceneWithMap(mapA), maps: [mapA, mapC] });
    const original = kind === "internal"
      ? connectInternalSceneLink(free, { sourceMapId: "map-a", sourceMarkerId: "a", targetMapId: "map-c", targetMarkerId: "c", scenePath: source, connectionId: "old" })
      : syncRuntimeFieldsFromActiveMap({ ...free, maps: [{ ...mapA, mapAnnotations: { ...mapA.mapAnnotations, sceneLinks: [createReciprocalSceneLinkMarkers(marker, source, peer, target, "old")[0]] } }, mapC] });
    const browser = createBrowserClient(new HttpTransport(vi.fn()), { selectScene: async () => null, sceneName: async () => null });
    let failSave = kind === "internal";
    const save = vi.fn<TtrpgApi["saveSceneToPath"]>(async (payload) => failSave ? { ok: false, error: "Guardado fallido" } : { ok: true, scene: parseSceneJson(JSON.stringify(payload)), filePath: source, warnings: [] });
    const disconnect = vi.fn<TtrpgApi["disconnectSceneLink"]>().mockResolvedValueOnce({ ok: false, error: "Desconexión fallida" }).mockResolvedValueOnce({ ok: true, mapAnnotations: free.mapAnnotations });
    const connect = vi.fn<TtrpgApi["connectSceneLink"]>(async () => ({ ok: true, mapAnnotations: { ...free.mapAnnotations, sceneLinks: [createReciprocalSceneLinkMarkers(marker, source, peer, target, "new")[0]] } }));
    const client = createClient({ ...browser.client.api,
      loadScene: async () => ({ ok: true, scene: original, filePath: source, warnings: [] }), saveSceneToPath: save,
      selectSceneLinkTargetFile: async () => ({ ok: true, filePath: target }),
      listSceneLinkCandidates: async () => ({ ok: true, candidate: { filePath: target, markers: [{ ...peer, available: true }] } }),
      connectSceneLink: connect, disconnectSceneLink: disconnect, validateSceneLinks: async () => ({ ok: true, statuses: { a: { state: "valid" } } })
    }, browser.client.capabilities);
    await act(async () => root.render(<ClientProvider client={client}><App service={{ browser, confirmLeave: async () => null, logout: async () => {} }} /></ClientProvider>));
    await click(element('[aria-label="Menu de escena"]')); await click(button("Cargar escena"));
    await click(button("Mapa"));
    const open = async () => { await click(button("Editar Puerta A")); if (kind === "internal") await click(button("Elegir escena del servicio")); };
    const switchKind = async () => click(button(kind === "remote" ? "Conectar habitaciones" : "Conectar con esta escena"));
    await open(); await switchKind();
    expect(element('[role="alert"]', element('.scene-link-modal')).textContent).toContain("Usa Desligar");
    expect(save).not.toHaveBeenCalled(); expect(connect).not.toHaveBeenCalled(); expect(disconnect).not.toHaveBeenCalled();
    expect(props().mapAnnotations.sceneLinks[0].connection).toEqual(original.mapAnnotations.sceneLinks[0].connection);
    await click(button("Desligar"));
    expect(element('[role="alert"]', element('.scene-link-modal')).textContent).toContain("No se pudo desligar");
    expect(props().mapAnnotations.sceneLinks[0].connection).toEqual(original.mapAnnotations.sceneLinks[0].connection);
    await switchKind(); expect(connect).not.toHaveBeenCalled();
    failSave = false;
    await click(button("Desligar")); expect(props().mapAnnotations.sceneLinks[0].connection).toBeNull();
    if (kind === "internal") {
      const payload = save.mock.calls.at(-1)![0];
      expect(payload.maps.every(map => map.mapAnnotations.sceneLinks.every(item => item.connection === null))).toBe(true);
    }
    await open(); await switchKind();
    expect(host.querySelector('.scene-link-modal')).toBeNull();
    expect(props().mapAnnotations.sceneLinks[0].connection?.peer).toMatchObject(kind === "remote" ? { mapId: "map-c", markerId: "c" } : { scenePath: target, markerId: "b" });
  });

  it("restaura foco al menú real después de cancelar el selector de servicio",async()=>{
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
    const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn(async()=>new Response(JSON.stringify({ok:true,scenes:[],total:0}),{headers:{"content-type":"application/json"}}))),broker);
    await act(async()=>root.render(<><ClientProvider client={browser.client}><App service={{browser,confirmLeave:broker.leave,logout:async()=>{}}}/></ClientProvider><DialogHost broker={broker} browser={browser}/></>));
    const summary=element('[aria-label="Menu de escena"]');await click(summary);await click(button("Cargar escena"));
    expect(host.querySelector('dialog')).not.toBeNull();await click(button("Cancelar"));await act(async()=>vi.runAllTimers());expect(document.activeElement).toBe(summary);
  });

  it("devuelve foco al botón superior al cancelar y confirmar un nombre con busy",async()=>{
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
    const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn(async(path,init)=>{
      if(String(path).includes("/scenes")){const body=JSON.parse(String(init?.body));return new Response(JSON.stringify({ok:true,resource:{id:"01010101-0101-4101-8101-010101010101",name:body.name,scene:body.scene,createdAt:"2026-10-29T00:00:00Z",updatedAt:"2026-10-29T00:00:00Z",warnings:[],missingImages:[]}}),{headers:{"content-type":"application/json"}});}
      return new Response(JSON.stringify({ok:true,assets:[],templates:[]}),{headers:{"content-type":"application/json"}});
    })),broker);
    const client=createClient({...browser.client.api,openMapImage:async()=>({ok:true,imagePath:"asset:01010101-0101-4101-8101-010101010101",imageUrl:"/api/v1/assets/01010101-0101-4101-8101-010101010101"})},browser.client.capabilities);
    await act(async()=>root.render(<><ClientProvider client={client}><App service={{browser,confirmLeave:broker.leave,logout:async()=>{}}}/></ClientProvider><DialogHost broker={broker} browser={browser}/></>));
    await click(button("Agregar mapa"));const saveButton=element<HTMLButtonElement>('.workspace-header-actions [aria-label="Guardar escena"]');
    await click(saveButton);expect(saveButton.disabled).toBe(true);await click(button("Cancelar"));await act(async()=>vi.runAllTimers());expect(document.activeElement).toBe(saveButton);
    await click(saveButton);await click(button("Guardar",element('dialog')));await act(async()=>vi.runAllTimers());expect(saveButton.disabled).toBe(false);expect(document.activeElement).toBe(saveButton);
    await click(saveButton);await act(async()=>vi.runAllTimers());expect(document.activeElement).toBe(saveButton);expect(host.textContent).toContain("Escena guardada");
  });

  it("DM, adaptador y Player conservan cámara divergente al reconectar, promover y remontar DM",async()=>{
    const server=new TableSession(Date.now,randomUUID);
    server.publish({scene:createSceneWithMap(createDefaultSceneMap()),camera:{center:{x:0,y:0},zoom:1},mapImageUrl:null,tokenImageUrls:{},showDmFogOverlay:false});
    let controller!:ReadableStreamDefaultController<Uint8Array>;
    const browser=createBrowserClient(new HttpTransport(vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(c){controller=c;}}),{headers:{"content-type":"text/event-stream"}}))),{selectScene:async()=>null,sceneName:async()=>null});
    const command=vi.fn<TtrpgApi["commandPlayerCamera"]>(async c=>{server.setCommand(c);return {ok:true};});
    const caps={...browser.client.capabilities,dice:false,libraries:false,images:false};
    const dmClient=createClient({...browser.client.api,commandPlayerCamera:command},caps,"service");
    const handlers=new Map<string,(value:unknown)=>void>();
    const emit=(e:TableEvent)=>{if(e.state?.snapshot)handlers.get("scene")?.(e.state.snapshot);if(e.type==="camera-command")handlers.get("command")?.(e.payload);};
    let player=server.connect("p","player",emit);
    const observer=server.connect("observer","player",()=>{});
    const playerClient=createClient({...browser.client.api,
      getPlayerWindowState:async()=>({snapshot:server.state("player").snapshot,camera:null,cameraCommand:null,isOpen:true}),
      onPlayerScene:h=>{handlers.set("scene",h as (v:unknown)=>void);return()=>handlers.delete("scene");},
      onPlayerCameraCommand:h=>{handlers.set("command",h as (v:unknown)=>void);return()=>handlers.delete("command");},
      reportPlayerCamera:async report=>{server.report("p",player.id,report);return {ok:true};},
      notifyPlayerContentReady:async()=>({ok:true})
    },caps,"service");
    const service={browser,confirmLeave:async()=>null,logout:async()=>{}};
    const renderBoth=(key=0)=>root.render(<><ClientProvider client={dmClient}><App key={key} service={service}/></ClientProvider><ClientProvider client={playerClient}><PlayerApp/></ClientProvider></>);
    browser.table.start("dm");await act(async()=>{await Promise.resolve();});
    const dm=server.connect("dm","dm",e=>controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`)));
    const flush=async()=>act(async()=>{for(let i=0;i<30;i++)await Promise.resolve();});
    await flush();await act(async()=>renderBoth());await flush();expect(command).not.toHaveBeenCalled();
    const local={center:{x:800,y:900},zoom:2};
    await act(async()=>{viewport.playerProps!.onCameraChange?.(local);viewport.playerProps!.onCameraInteractionEnd?.(local);});await flush();
    const cameraProp=viewport.playerProps!.cameraSnapshot;
    expect(server.presence().report?.camera).toEqual(local);
    await act(async()=>{player.close();player=server.connect("p","player",emit);});await flush();
    expect(server.presence().primaryId).toBe(observer.id);expect(command).not.toHaveBeenCalled();
    await act(async()=>observer.close());await flush();
    expect(server.presence().primaryId).toBe(player.id);expect(server.presence().report?.camera).toEqual(local);
    await act(async()=>renderBoth(1));await flush();
    expect(command).not.toHaveBeenCalled();expect(viewport.playerProps!.cameraSnapshot).toBe(cameraProp);
    await expect(command({revision:1,camera:{center:{x:30,y:40},zoom:1},reason:"recenter"})).rejects.toThrow("se retiró");
    expect(viewport.playerProps!.cameraSnapshot).toBe(cameraProp);
    browser.table.stop();dm.close();player.close();
  });

});
