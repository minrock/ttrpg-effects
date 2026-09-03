// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultMapAnnotations, type MapAnnotations } from "../../../../domain/annotations/map-annotations";
import { MapAnnotationsTree } from "./MapAnnotationsTree";

const annotations: MapAnnotations = {
  ...createDefaultMapAnnotations(),
  pins: [{ id: "pin", kind: "room-pin", title: "Sala", content: "", position: { x: 0, y: 0 }, locked: false }],
  areas: [
    { id: "terrain", kind: "information-area", areaType: "terrain", name: "Terreno", description: "", cells: [{ x: 0, y: 0, size: 100 }], locked: false },
    { id: "trap", kind: "information-area", areaType: "trap", name: "Trampa", description: "", cells: [{ x: 100, y: 0, size: 100, layout: "hexagonal" }], locked: false },
    { id: "locked", kind: "information-area", areaType: "terrain", name: "Protegida", description: "", cells: [{ x: 200, y: 0, size: 100 }], locked: true }
  ]
};

describe("MapAnnotationsTree deletion", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onDeleteArea = vi.fn(), onSelect = vi.fn(), onEdit = vi.fn(), onHighlightArea = vi.fn();

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<MapAnnotationsTree annotations={annotations} selectedElementId="pin" onSelect={onSelect} onEdit={onEdit} onDeleteArea={onDeleteArea} onGoTo={vi.fn()} onToggleLock={vi.fn()} onHighlightArea={onHighlightArea} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("provides delete actions for terrain and traps, targeting their id instead of the selection", () => {
    for (const name of ["Terreno", "Trampa"]) {
      const button = container.querySelector<HTMLButtonElement>(`[aria-label="Eliminar ${name}"]`);
      expect(button?.title).toBe("Eliminar area");
      act(() => button?.click());
    }
    expect(onDeleteArea.mock.calls).toEqual([["terrain"], ["trap"]]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
    expect(onHighlightArea).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Eliminar Sala"]')).toBeNull();
  });

  it.each(["Backspace", "Delete"])("handles %s in the focused area row without deleting another selected object", (key) => {
    const bubble = vi.fn();
    document.body.addEventListener("keydown", bubble);
    const rowButton = [...container.querySelectorAll<HTMLButtonElement>(".annotation-tree__leaf-main")].find(button => button.textContent?.includes("Trampa"));
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    act(() => rowButton?.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(onDeleteArea).toHaveBeenCalledExactlyOnceWith("trap");
    expect(bubble).not.toHaveBeenCalled();
    document.body.removeEventListener("keydown", bubble);
  });

  it("disables deletion for locked areas and explains how to unlock them", () => {
    const button = container.querySelector<HTMLButtonElement>('[aria-label="Eliminar Protegida"]');
    expect(button?.disabled).toBe(true);
    expect(button?.title).toContain("Desbloquea");
    act(() => button?.click());
    expect(onDeleteArea).not.toHaveBeenCalled();
  });

  it("does not intercept deletion while editing the search field", () => {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    const event = new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true });
    act(() => input?.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
    expect(onDeleteArea).not.toHaveBeenCalled();
  });
});
