// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSceneMap } from "../../../../domain/sessions/scene-maps";
import { SceneMapsSection } from "./SceneMapsSection";

describe("SceneMapsSection", () => {
  let container: HTMLDivElement;
  let root: Root;
  const maps = [
    createDefaultSceneMap({ id: "active", name: "Entrada" }),
    createDefaultSceneMap({ id: "inactive", name: "Cripta" })
  ];
  const onSelect = vi.fn(), onRename = vi.fn(), onReorder = vi.fn(), onDelete = vi.fn();
  const onAddMap = vi.fn(), onImportScene = vi.fn(), onReplaceMapImage = vi.fn();

  function render(busy = false, overrides: Partial<ComponentProps<typeof SceneMapsSection>> = {}): void {
    act(() => root.render(<SceneMapsSection
      maps={maps} activeMapId="active" onSelect={onSelect} onRename={onRename}
      onReorder={onReorder} onDelete={onDelete} onAddMap={onAddMap}
      onImportScene={onImportScene} onReplaceMapImage={onReplaceMapImage} isReplacingImage={busy}
      {...overrides}
    />));
  }

  function replacementButton(name = "Cripta"): HTMLButtonElement {
    const button = container.querySelector<HTMLButtonElement>(`[aria-label="Actualizar imagen de ${name}"]`);
    expect(button).not.toBeNull();
    return button!;
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    render();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("targets the inactive row without selecting, renaming, deleting or reordering a map", () => {
    const button = replacementButton();
    expect(button.title).toBe("Actualizar imagen");
    expect(button.closest("li")?.classList.contains("is-active")).toBe(false);
    act(() => button.click());
    expect(onReplaceMapImage).toHaveBeenCalledExactlyOnceWith("inactive");
    expect(onSelect).not.toHaveBeenCalled();
    expect(onRename).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
    expect(container.querySelector("li.is-active input")?.getAttribute("aria-label")).toBe("Nombre de Entrada");
  });

  it("blocks pointer and drag propagation from the replacement control", () => {
    const button = replacementButton();
    const pointerBubble = vi.fn();
    document.body.addEventListener("pointerdown", pointerBubble);
    const transfer = { effectAllowed: "none", setData: vi.fn() };
    const drag = new Event("dragstart", { bubbles: true, cancelable: true });
    Object.defineProperty(drag, "dataTransfer", { value: transfer });
    act(() => {
      button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      button.dispatchEvent(drag);
    });
    document.body.removeEventListener("pointerdown", pointerBubble);
    expect(button.draggable).toBe(false);
    expect(pointerBubble).not.toHaveBeenCalled();
    expect(drag.defaultPrevented).toBe(true);
    expect(transfer.setData).not.toHaveBeenCalled();
    expect(container.querySelector(".is-dragging")).toBeNull();
    const target = container.querySelector("li")!;
    act(() => target.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true })));
    expect(onReorder).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onReplaceMapImage).not.toHaveBeenCalled();
  });

  it("disables replacement on every row while an operation is in progress", () => {
    render(true);
    for (const name of ["Entrada", "Cripta"]) {
      const button = replacementButton(name);
      expect(button.disabled).toBe(true);
      act(() => button.click());
    }
    expect(onReplaceMapImage).not.toHaveBeenCalled();
    render(false);
    act(() => replacementButton().click());
    expect(onReplaceMapImage).toHaveBeenCalledExactlyOnceWith("inactive");
  });

  it("retains normal map selection and row drag reordering", () => {
    const [active, inactive] = container.querySelectorAll("li");
    act(() => inactive.querySelector<HTMLButtonElement>(".scene-map-list__select")!.click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("inactive");
    const transfer = { effectAllowed: "none", setData: vi.fn() };
    const drag = new Event("dragstart", { bubbles: true, cancelable: true });
    Object.defineProperty(drag, "dataTransfer", { value: transfer });
    act(() => inactive.dispatchEvent(drag));
    expect(transfer.setData).toHaveBeenCalledWith("text/plain", "inactive");
    act(() => active.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true })));
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(["inactive", "active"]);
    expect(onReplaceMapImage).not.toHaveBeenCalled();
  });

  it("names icon actions and exposes the active map without hiding actions on inactive rows", () => {
    for (const map of maps) {
      const select = container.querySelector<HTMLButtonElement>(`[aria-label="Seleccionar ${map.name}"]`)!;
      expect(select.title).toBe(`Seleccionar ${map.name}`);
      expect(select.getAttribute("aria-pressed")).toBe(String(map.id === "active"));
      const actions = select.closest("li")!.querySelectorAll<HTMLButtonElement>("button");
      expect(actions).toHaveLength(3);
      for (const action of actions) {
        expect(action.getAttribute("aria-label")).toBeTruthy();
        expect(action.getAttribute("data-tooltip")).toBeTruthy();
        expect(action.title).toBeTruthy();
      }
    }
    render(false, { activeMapId: "inactive" });
    expect(container.querySelector('[aria-label="Seleccionar Cripta"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[aria-label="Seleccionar Entrada"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("routes adding, importing, renaming and deleting independently of selection", () => {
    const commands = container.querySelectorAll<HTMLButtonElement>(".scene-maps-actions button");
    act(() => commands[0].click());
    act(() => commands[1].click());
    const input = container.querySelector<HTMLInputElement>('[aria-label="Nombre de Cripta"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Cripta norte");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Eliminar Cripta"]')!.click());
    expect(onAddMap).toHaveBeenCalledOnce();
    expect(onImportScene).toHaveBeenCalledOnce();
    expect(onRename).toHaveBeenCalledExactlyOnceWith("inactive", "Cripta norte");
    expect(onDelete).toHaveBeenCalledExactlyOnceWith("inactive");
    expect(onSelect).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
    expect(onReplaceMapImage).not.toHaveBeenCalled();
  });

  it("does not initiate row dragging from selection, rename or delete controls", () => {
    const row = container.querySelectorAll("li")[1];
    for (const control of row.querySelectorAll("button, input")) {
      const transfer = { effectAllowed: "none", setData: vi.fn() };
      const drag = new Event("dragstart", { bubbles: true, cancelable: true });
      Object.defineProperty(drag, "dataTransfer", { value: transfer });
      act(() => control.dispatchEvent(drag));
      expect(drag.defaultPrevented).toBe(true);
      expect(transfer.setData).not.toHaveBeenCalled();
      expect(container.querySelector(".is-dragging")).toBeNull();
    }
  });

  it("clears a drag whose source map disappeared without reordering remaining maps", () => {
    const rows = container.querySelectorAll("li");
    const drag = new Event("dragstart", { bubbles: true });
    Object.defineProperty(drag, "dataTransfer", { value: { effectAllowed: "none", setData: vi.fn() } });
    act(() => rows[1].dispatchEvent(drag));
    render(false, { maps: [maps[0]] });
    act(() => rows[0].dispatchEvent(new Event("drop", { bubbles: true, cancelable: true })));
    render();
    expect(container.querySelector(".is-dragging, .is-drop-target")).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps empty-state commands available and does not load local map images", () => {
    const load = vi.fn(() => { throw new Error("Unexpected image loading"); });
    vi.stubGlobal("Image", load);
    vi.stubGlobal("FileReader", load);
    vi.stubGlobal("ttrpg", new Proxy({}, { get: load }));
    render(false, { maps: [{ ...maps[0], map: { ...maps[0].map, imagePath: "/local/map.png" } }] });
    expect(container.querySelector("img")).toBeNull();
    expect(load).not.toHaveBeenCalled();
    render(false, { maps: [], activeMapId: null });
    expect(container.querySelector("ol")).toBeNull();
    const commands = container.querySelectorAll<HTMLButtonElement>(".scene-maps-actions button");
    act(() => commands.forEach((button) => button.click()));
    expect(onAddMap).toHaveBeenCalledOnce();
    expect(onImportScene).toHaveBeenCalledOnce();
  });
});
