// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useEffect, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterfaceLab } from "./InterfaceLab";
import { LabCanvas, type LabCanvasProps } from "./LabCanvas";
import { LabDice } from "./LabDice";

const canvasLifecycle = vi.hoisted(() => ({ mount: vi.fn(), unmount: vi.fn() }));
vi.mock("./LabCanvas", () => ({ LabCanvas: vi.fn(function MockLabCanvas(props: LabCanvasProps) {
  useEffect(() => {
    canvasLifecycle.mount();
    return () => { canvasLifecycle.unmount(); };
  }, []);
  return <div data-testid={props.player ? "player-canvas" : "dm-canvas"} tabIndex={0} />;
}) }));
vi.mock("./LabDice", () => ({ LabDice: vi.fn(function MockLabDice({ active, viewport }: ComponentProps<typeof LabDice>) {
  const [rolls, setRolls] = useState(0);
  return <>
    <div className="dice-panel" data-testid="lab-dice" hidden={!active}>
      <button type="button" aria-label="Tirada de prueba" onClick={() => setRolls(value => value + 1)}>{rolls}</button>
    </div>
    {viewport && createPortal(<div className="dice-overlay is-visible" data-testid="private-dice-overlay">Private roll</div>, viewport)}
  </>;
}) }));

const dialogMethods = {
  showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal"),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close")
};
const showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
const closeDialog = vi.fn(function (this: HTMLDialogElement) { this.open = false; });

describe("UI lab shell", () => {
  let root: Root, host: HTMLDivElement;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    vi.stubGlobal("innerWidth", 1440);
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, writable: true, value: showModal },
      close: { configurable: true, writable: true, value: closeDialog }
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals(); vi.restoreAllMocks();
    for (const [method, descriptor] of Object.entries(dialogMethods)) {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, method, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, method);
    }
  });

  async function render(width = 1440): Promise<void> {
    vi.stubGlobal("innerWidth", width);
    await act(async () => root.render(<InterfaceLab />));
  }
  function element<T extends HTMLElement = HTMLElement>(selector: string, scope: ParentNode = host): T {
    const result = scope.querySelector<T>(selector);
    expect(result, `Missing ${selector}`).not.toBeNull();
    return result!;
  }
  function button(text: string, scope: ParentNode = host): HTMLButtonElement {
    const result = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.trim() === text);
    expect(result, `Missing button ${text}`).toBeDefined();
    return result!;
  }
  function tabs(label: string): HTMLElement { return element(`[role="tablist"][aria-label="${label}"]`); }
  function toggle(label: string): HTMLInputElement {
    const field = [...host.querySelectorAll("label.lab-toggle")].find(item => item.querySelector("span")?.textContent === label);
    expect(field, `Missing switch ${label}`).toBeDefined();
    return element<HTMLInputElement>('input[role="switch"]', field!);
  }
  function canvas(player = false): LabCanvasProps {
    return vi.mocked(LabCanvas).mock.calls.filter(([props]) => Boolean(props.player) === player).at(-1)![0];
  }
  function dice(): ComponentProps<typeof LabDice> { return vi.mocked(LabDice).mock.calls.at(-1)![0]; }
  async function click(target: HTMLElement): Promise<void> { await act(async () => target.click()); }
  async function fill(target: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
    await act(async () => {
      const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(target, value);
      target.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function key(value: string, target: HTMLElement = host, options: KeyboardEventInit = {}): Promise<KeyboardEvent> {
    const event = new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options });
    await act(async () => { target.dispatchEvent(event); });
    return event;
  }
  function mockLocalImage(dataUrl: string, size: { width: number; height: number }) {
    const read = vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      queueMicrotask(() => {
        Object.defineProperty(this, "result", { configurable: true, value: dataUrl });
        this.dispatchEvent(new ProgressEvent("load"));
      });
    });
    const image = document.createElement("img"), decode = vi.fn(async () => {});
    Object.defineProperties(image, {
      naturalWidth: { value: size.width }, naturalHeight: { value: size.height }, decode: { value: decode }
    });
    vi.stubGlobal("Image", vi.fn(function () { return image; }));
    return { read, image, decode };
  }
  async function chooseFile(file: File): Promise<void> {
    const input = element<HTMLInputElement>('[aria-label="Imagen para el laboratorio"]');
    await act(async () => {
      Object.defineProperty(input, "files", { configurable: true, value: [file] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function mapButton(name: string): HTMLButtonElement {
    const result = [...host.querySelectorAll<HTMLButtonElement>(".lab-map-select")].find(item => item.querySelector(".lab-map-name")?.textContent === name);
    expect(result, `Missing map ${name}`).toBeDefined();
    return result!;
  }

  it("navigates explorer tabs with clicks and arrows, resets search, and switches collections", async () => {
    await render();
    const explorerTabs = tabs("Ambito del explorador");
    const sceneTab = button("Escena", explorerTabs), mapTab = button("Mapa", explorerTabs);
    expect(sceneTab.getAttribute("aria-selected")).toBe("true");
    expect(sceneTab.tabIndex).toBe(0);
    await fill(element<HTMLInputElement>('[aria-label="Buscar en el explorador"]'), "no matching map");
    expect(host.querySelectorAll(".lab-map-item")).toHaveLength(0);
    await click(mapTab);
    expect(mapTab.getAttribute("aria-selected")).toBe("true");
    expect(element<HTMLInputElement>('[aria-label="Buscar en el explorador"]').value).toBe("");
    expect(host.querySelector(".lab-object-list")).not.toBeNull();
    await key("ArrowRight", mapTab);
    expect(sceneTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(sceneTab);
    expect(mapTab.tabIndex).toBe(-1);
    await key("ArrowLeft", sceneTab);
    expect(document.activeElement).toBe(mapTab);
    expect(mapTab.getAttribute("aria-selected")).toBe("true");
    await click(sceneTab);
    await click(element('.lab-collection-tabs button:nth-child(2)'));
    expect(element('.lab-collection-tabs button:nth-child(2)').getAttribute("aria-pressed")).toBe("true");
    expect(host.querySelectorAll(".lab-note-row")).toHaveLength(2);
    await click(element('.lab-collection-tabs button:nth-child(3)'));
    expect(element(".lab-empty").textContent).toContain("Sin entidades");
    expect(button("Agregar entidad").disabled).toBe(true);
    await click(element('.lab-collection-tabs button:first-child'));
    expect(host.querySelectorAll(".lab-map-item")).toHaveLength(canvas().scene.maps.length);
  });

  it("keeps dice mounted across inspector tabs and panel toggles and guards dice keyboard events", async () => {
    await render();
    expect(dice().active).toBe(false);
    expect(dice().viewport).toBe(element('[aria-label="Mesa de juego"]'));
    const diceHost = element('[data-testid="lab-dice"]');
    await click(element('[aria-label="Abrir dados"]'));
    expect(dice().active).toBe(true);
    expect(button("Dados", tabs("Panel derecho")).getAttribute("aria-selected")).toBe("true");
    expect(host.querySelector('[aria-label="Nombre del mapa"]')).toBeNull();
    await click(element('[aria-label="Tirada de prueba"]'));
    await key("f");
    const roll = element('[aria-label="Tirada de prueba"]');
    await key("h", roll);
    await key("Escape", roll);
    expect(canvas().tool).toBe("fire");
    await click(button("Propiedades", tabs("Panel derecho")));
    expect(dice().active).toBe(false);
    expect(element('[data-testid="lab-dice"]')).toBe(diceHost);
    await key("ArrowRight", button("Propiedades", tabs("Panel derecho")));
    expect(dice().active).toBe(true);
    expect(document.activeElement).toBe(button("Dados", tabs("Panel derecho")));
    expect(roll.textContent).toBe("1");
    await click(element('[aria-label="Cerrar inspector"]'));
    expect(element('[aria-label="Inspector"]').hidden).toBe(true);
    await click(element('[aria-label="Abrir inspector"]'));
    expect(element('[data-testid="lab-dice"]')).toBe(diceHost);
    expect(element('[aria-label="Tirada de prueba"]').textContent).toBe("1");
  });

  it("passes tool and shape changes to the canvas and Escape clears tool, selection, focus and menus", async () => {
    await render();
    await click(element('[aria-label="Fuego (F)"]'));
    await click(element('[aria-label="Fuego: Cono"]'));
    expect(canvas()).toMatchObject({ tool: "fire", shape: "cone" });
    expect(element('[aria-label="Fuego (F)"]').getAttribute("aria-pressed")).toBe("true");
    expect(canvas().onToolComplete).toBeTypeOf("function");
    await act(async () => canvas().onToolComplete!());
    expect(canvas().tool).toBe("select");
    expect((await key("h")).defaultPrevented).toBe(true);
    expect(canvas().tool).toBe("pan");
    await key("M");
    expect(canvas().tool).toBe("measure");
    await act(async () => canvas().onSelect(canvas().scene.shapes[0].id));
    expect(canvas().selectedId).not.toBeNull();
    await click(element('[aria-label="Concentrarse en el mapa"]'));
    await click(element(".lab-scene-title"));
    expect(host.querySelector(".lab-app.is-focus")).not.toBeNull();
    expect(host.querySelector('[role="menu"]')).not.toBeNull();
    await key("Escape");
    expect(canvas()).toMatchObject({ tool: "select", selectedId: null });
    expect(host.querySelector(".lab-app.is-focus")).toBeNull();
    expect(host.querySelector('[role="menu"]')).toBeNull();
    expect(host.querySelector('[aria-label="Salir de la herramienta"]')).toBeNull();
    await key("m");
    await click(button("Vista del jugador"));
    expect(canvas(true)).toMatchObject({ player: true, tool: "select", selectedId: null });
    const preview = element<HTMLDialogElement>('dialog[aria-label="Vista previa del jugador"]');
    expect(preview.open).toBe(true);
    await key("h", preview);
    expect(canvas().tool).toBe("measure");
    await act(async () => { preview.dispatchEvent(new Event("cancel", { cancelable: true })); });
    expect(host.querySelector('[aria-label="Vista previa del jugador"]')).toBeNull();
    expect(closeDialog).toHaveBeenCalledOnce();
    expect(canvas().tool).toBe("measure");
  });

  it("does not change tools while editing inputs or using modified keyboard shortcuts", async () => {
    await render();
    await key("f");
    const name = element<HTMLInputElement>('[aria-label="Nombre del mapa"]');
    name.focus();
    expect((await key("h", name)).defaultPrevented).toBe(false);
    await key("Escape", name);
    await fill(name, "Hall of mirrors");
    expect(canvas().tool).toBe("fire");
    await key("m", element('[aria-label="Buscar en el explorador"]'));
    expect(canvas().tool).toBe("fire");
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
      expect((await key("h", host, { [modifier]: true })).defaultPrevented).toBe(false);
      expect(canvas().tool).toBe("fire");
    }
    await key("h");
    expect(canvas().tool).toBe("pan");
  });

  it("reuses one canvas across Player Preview and hides the private dice portal through CSS", async () => {
    const styles = ["../components/dice/dice.css", "./ui-lab.css"].map(path => {
      const style = document.createElement("style");
      style.textContent = readFileSync(new URL(path, import.meta.url), "utf8");
      document.head.append(style);
      return style;
    });
    try {
      await render();
      await key("f");
      const canvasElement = element('[data-testid="dm-canvas"]');
      const overlay = element('[data-testid="private-dice-overlay"]');
      const canvasSelector = '[data-testid="dm-canvas"], [data-testid="player-canvas"]';
      expect(overlay.parentElement).toBe(element('[aria-label="Mesa de juego"]'));
      expect(getComputedStyle(overlay).display).not.toBe("none");
      expect(getComputedStyle(overlay).visibility).toBe("visible");
      expect(canvasLifecycle.mount).toHaveBeenCalledOnce();
      await click(button("Vista del jugador"));
      expect(host.querySelectorAll(canvasSelector)).toHaveLength(1);
      expect(element('[data-testid="player-canvas"]')).toBe(canvasElement);
      expect(canvas(true)).toMatchObject({ player: true, tool: "select", selectedId: null });
      expect(canvasLifecycle.mount).toHaveBeenCalledOnce();
      expect(canvasLifecycle.unmount).not.toHaveBeenCalled();
      expect(element('[data-testid="private-dice-overlay"]')).toBe(overlay);
      expect(getComputedStyle(overlay).display).toBe("none");
      const preview = element<HTMLDialogElement>('dialog[aria-label="Vista previa del jugador"]');
      expect(preview.open).toBe(true);
      expect(preview.contains(canvasElement)).toBe(false);
      await click(button("Volver al DM", preview));
      expect(host.querySelectorAll(canvasSelector)).toHaveLength(1);
      expect(element('[data-testid="dm-canvas"]')).toBe(canvasElement);
      expect(canvas()).toMatchObject({ player: false, tool: "fire" });
      expect(canvasLifecycle.mount).toHaveBeenCalledOnce();
      expect(canvasLifecycle.unmount).not.toHaveBeenCalled();
      expect(element('[data-testid="private-dice-overlay"]')).toBe(overlay);
      expect(getComputedStyle(overlay).display).not.toBe("none");
      expect(getComputedStyle(overlay).visibility).toBe("visible");
      await act(async () => root.render(null));
      expect(canvasLifecycle.unmount).toHaveBeenCalledOnce();
    } finally { styles.forEach(style => style.remove()); }
  });

  it("propagates map renaming to the map list, canvas and dice context without changing the context token", async () => {
    await render();
    const initialContext = dice().context;
    await fill(element<HTMLInputElement>('[aria-label="Nombre del mapa"]'), "Sala del eclipse");
    const scene = canvas().scene;
    expect(scene.name).toBe("Sala del eclipse");
    expect(scene.maps.find(map => map.id === scene.id)?.name).toBe(scene.name);
    expect(element(".lab-map-name").textContent).toBe(scene.name);
    expect(element(".lab-map-breadcrumb").textContent).toBe(scene.name);
    expect(element(".lab-inspector-title h2").textContent).toBe(scene.name);
    expect(dice().context).toEqual({ ...initialContext, mapName: scene.name });
  });

  it("imports a local image as a MIME data URL and retains it after renaming and switching maps", async () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=", imageSize = { width: 2048, height: 1024 };
    const { read, image, decode } = mockLocalImage(dataUrl, imageSize);
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "river.crossing.png", { type: "image/png" });
    await render();
    const original = canvas().scene, originalUrl = canvas().imageUrl;
    await click(element('[aria-label="Agregar mapa"]'));
    await chooseFile(file);
    expect(read).toHaveBeenCalledExactlyOnceWith(file);
    expect(decode).toHaveBeenCalledOnce();
    expect(image.src).toBe(dataUrl);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    const imported = canvas().scene;
    expect(imported.maps).toHaveLength(original.maps.length + 1);
    expect(imported.id).not.toBe(original.id);
    expect(imported.activeMapId).toBe(imported.id);
    expect(imported.name).toBe("river.crossing");
    expect(imported.map).toMatchObject({ imagePath: null, imageSize });
    expect(imported.maps.find(map => map.id === imported.id)?.map.imageSize).toEqual(imageSize);
    expect(canvas().imageUrl).toBe(dataUrl);
    expect(element<HTMLImageElement>(".lab-map-item.is-active img").src).toBe(dataUrl);
    expect(element<HTMLInputElement>('[aria-label="Imagen para el laboratorio"]').value).toBe("");
    await fill(element<HTMLInputElement>('[aria-label="Nombre del mapa"]'), "Puente del rio");
    await click(mapButton(original.name));
    expect(canvas().scene.id).toBe(original.id);
    expect(canvas().imageUrl).toBe(originalUrl);
    await click(mapButton("Puente del rio"));
    expect(canvas().scene).toMatchObject({ id: imported.id, activeMapId: imported.id, name: "Puente del rio", map: { imageSize } });
    expect(canvas().imageUrl).toBe(dataUrl);
    expect(dice().context).toMatchObject({ mapId: imported.id, mapName: "Puente del rio" });
  });

  it("replaces the current image without replacing its map, effects or annotation markers", async () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", imageSize = { width: 3200, height: 1800 };
    const { read, decode } = mockLocalImage(dataUrl, imageSize);
    const file = new File([new Uint8Array([137, 80, 78, 71])], "replacement.png", { type: "image/png" });
    await render();
    const original = canvas().scene, originalContext = dice().context;
    expect(original.effects.length).toBeGreaterThan(0);
    expect(original.mapAnnotations.pins.length).toBeGreaterThan(0);
    await click(button("Actualizar imagen"));
    await chooseFile(file);
    expect(read).toHaveBeenCalledExactlyOnceWith(file);
    expect(decode).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    const replaced = canvas().scene;
    expect(replaced).toEqual({
      ...original,
      map: { ...original.map, imageSize },
      maps: original.maps.map(map => map.id === original.activeMapId ? { ...map, map: { ...map.map, imageSize } } : map)
    });
    expect(replaced.effects).toEqual(original.effects);
    expect(replaced.mapAnnotations).toEqual(original.mapAnnotations);
    expect(canvas().imageUrl).toBe(dataUrl);
    expect(element<HTMLImageElement>(".lab-map-item.is-active img").src).toBe(dataUrl);
    expect(dice().context).toEqual(originalContext);
    expect(host.querySelectorAll(".lab-map-item")).toHaveLength(original.maps.length);
  });

  it("keeps tabs, switches, map inputs and notes usable without preload or browser storage access", async () => {
    const preloadAccess = vi.fn(() => { throw new Error("Preload access is forbidden in the UI lab."); });
    vi.stubGlobal("ttrpg", new Proxy({}, { get: preloadAccess, set: preloadAccess }));
    const storageGet = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage reads are forbidden in the UI lab."); });
    const storageSet = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage writes are forbidden in the UI lab."); });
    await render();
    const gridEnabled = canvas().scene.grid.enabled;
    await click(toggle("Mostrar grilla"));
    expect(canvas().scene.grid.enabled).toBe(!gridEnabled);
    await fill(element<HTMLInputElement>('[aria-label="Nombre del mapa"]'), "Mesa sin persistencia");
    expect(canvas().scene.name).toBe("Mesa sin persistencia");
    await click(button("Mapa", tabs("Ambito del explorador")));
    expect(host.querySelector(".lab-object-list")).not.toBeNull();
    await click(element('[aria-label="Abrir dados"]'));
    expect(dice().active).toBe(true);
    await click(button("Propiedades", tabs("Panel derecho")));
    expect(dice().active).toBe(false);
    await click(element('[aria-label="Notas de la escena"]'));
    await click(element(".lab-note-row"));
    await fill(element<HTMLInputElement>("dialog input"), "Nota en memoria");
    await fill(element<HTMLTextAreaElement>("dialog textarea"), "Revisar el puente.");
    await click(button("Listo", element("dialog")));
    expect(element(".lab-note-row strong").textContent).toBe("Nota en memoria");
    await click(element(".lab-note-row"));
    expect(element<HTMLTextAreaElement>("dialog textarea").value).toBe("Revisar el puente.");
    await act(async () => root.render(null));
    expect(preloadAccess).not.toHaveBeenCalled();
    expect(storageGet).not.toHaveBeenCalled();
    expect(storageSet).not.toHaveBeenCalled();
  });

  it("updates grid visibility, snapping, spacing and opacity in the canvas and active map", async () => {
    await render();
    const initial = canvas().scene;
    expect(toggle("Mostrar grilla").checked).toBe(initial.grid.enabled);
    await click(toggle("Mostrar grilla"));
    await click(toggle("Ajustar a la grilla"));
    await fill(element<HTMLInputElement>('[aria-label="Distancia por celda"]'), "10");
    await fill(element<HTMLInputElement>('[aria-label="Opacidad de grilla"]'), "0.65");
    const scene = canvas().scene;
    expect(scene.grid).toMatchObject({ enabled: !initial.grid.enabled, distancePerCell: 10, opacity: .65 });
    expect(scene.settings.snapToGrid).toBe(!initial.settings.snapToGrid);
    expect(scene.maps.find(map => map.id === scene.id)?.grid).toEqual(scene.grid);
    expect(element(".lab-statusbar").textContent).toContain(`10 ${scene.grid.unit} / celda`);
    await fill(element<HTMLInputElement>('[aria-label="Distancia por celda"]'), "0");
    expect(canvas().scene.grid.distancePerCell).toBe(10);
    expect(element<HTMLInputElement>('[aria-label="Distancia por celda"]').value).toBe("10");
  });

  it("applies night and darkness settings and restores natural daytime light", async () => {
    await render();
    await click(element(".lab-environment-badge"));
    await click(button("Noche"));
    expect(canvas().scene.daytimeFilter).toMatchObject({ enabled: true, preset: "night" });
    expect(element(".lab-environment-badge").textContent).toBe("Noche");
    expect(button("Noche").getAttribute("aria-pressed")).toBe("true");
    const enabled = canvas().scene.darkness.enabled;
    await click(toggle("Oscuridad activa"));
    await fill(element<HTMLInputElement>('[aria-label="Opacidad de oscuridad"]'), "0.75");
    const scene = canvas().scene;
    expect(scene.darkness).toMatchObject({ enabled: !enabled, opacity: .75 });
    expect(scene.maps.find(map => map.id === scene.id)?.darkness).toEqual(scene.darkness);
    await click(button("Dia"));
    expect(canvas().scene.daytimeFilter).toMatchObject({ enabled: false, preset: "day" });
    expect(element(".lab-environment-badge").textContent).toBe("Luz natural");
    expect(canvas().scene.darkness).toEqual(scene.darkness);
  });

  it("edits and reopens notes, guards dialog typing, and closes through native cancel", async () => {
    await render();
    await key("f");
    await click(element('[aria-label="Notas de la escena"]'));
    await click(element(".lab-note-row"));
    const dialog = element<HTMLDialogElement>("dialog");
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Nota de escena");
    await fill(element<HTMLInputElement>("dialog input"), "La puerta del norte");
    const content = element<HTMLTextAreaElement>("dialog textarea");
    await fill(content, "Buscar la llave.\nEsperar a la noche.");
    await key("h", content);
    await key("Escape", content);
    expect(canvas().tool).toBe("fire");
    expect(dialog.open).toBe(true);
    await click(button("Listo", dialog));
    expect(host.querySelector("dialog")).toBeNull();
    expect(closeDialog).toHaveBeenCalledOnce();
    expect(element(".lab-note-row strong").textContent).toBe("La puerta del norte");
    await click(element(".lab-note-row"));
    expect(element<HTMLTextAreaElement>("dialog textarea").value).toBe("Buscar la llave.\nEsperar a la noche.");
    await act(async () => { element("dialog").dispatchEvent(new Event("cancel", { cancelable: true })); });
    expect(host.querySelector("dialog")).toBeNull();
    expect(closeDialog).toHaveBeenCalledTimes(2);
    expect(canvas().tool).toBe("fire");
  });

  it("adds a local note and preserves its edits after closing the dialog backdrop", async () => {
    await render();
    await click(element('[aria-label="Notas de la escena"]'));
    const count = host.querySelectorAll(".lab-note-row").length;
    await click(element('[aria-label="Nueva nota de prueba"]'));
    expect(element<HTMLInputElement>("dialog input").value).toBe("Nueva nota");
    await fill(element<HTMLInputElement>("dialog input"), "Recordatorio");
    await click(element("dialog"));
    expect(host.querySelector("dialog")).toBeNull();
    expect(host.querySelectorAll(".lab-note-row")).toHaveLength(count + 1);
    expect([...host.querySelectorAll(".lab-note-row strong")].map(item => item.textContent)).toContain("Recordatorio");
  });

  it.each([
    { width: 1440, left: true, right: true },
    { width: 1024, left: false, right: true },
    { width: 768, left: false, right: false }
  ])("initializes and toggles responsive panels at $width px", async ({ width, left, right }) => {
    await render(width);
    const explorer = element('[aria-label="Explorador"]'), inspector = element('[aria-label="Inspector"]');
    expect(explorer.hidden).toBe(!left);
    expect(inspector.hidden).toBe(!right);
    if (left) await click(element('[aria-label="Cerrar explorador"]'));
    await click(element('[aria-label="Abrir explorador"]'));
    expect(explorer.hidden).toBe(false);
    expect(inspector.hidden).toBe(width < 1100 || !right);
    if (!inspector.hidden) await click(element('[aria-label="Cerrar inspector"]'));
    await click(element('[aria-label="Abrir inspector"]'));
    expect(inspector.hidden).toBe(false);
    expect(explorer.hidden).toBe(width < 1100);
    await click(element('[aria-label="Plegar inspector"]'));
    expect(inspector.hidden).toBe(true);
    await click(element('[aria-label="Notas de la escena"]'));
    expect(explorer.hidden).toBe(false);
    expect(inspector.hidden).toBe(true);
    await click(element('[aria-label="Abrir dados"]'));
    expect(inspector.hidden).toBe(false);
    expect(explorer.hidden).toBe(width < 1100);
    expect(dice().active).toBe(true);
  });
});
