// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneObjectEntry } from "../../../../domain/sessions/scene-objects";
import { SceneObjectsTree } from "./SceneObjectsTree";

const objects: SceneObjectEntry[] = [
  { id: "light-1", collection: "lights", group: "Efectos", label: "Luz puntual 1", visible: false, center: { x: 0, y: 0 } },
  { id: "shape-2", collection: "shapes", group: "Areas", label: "Circulo 2", visible: true, center: { x: 8000, y: 1000 } }
];

describe("SceneObjectsTree", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelect = vi.fn(), onLocate = vi.fn(), onDelete = vi.fn();

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<SceneObjectsTree objects={objects} selectedElementId="light-1" onSelect={onSelect} onLocate={onLocate} onDelete={onDelete} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("selects hidden objects and locates the requested object independently", () => {
    expect(container.querySelector('[aria-label="Oculto"]')).not.toBeNull();
    const selected = container.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    act(() => selected?.click());
    expect(onSelect).toHaveBeenCalledWith(objects[0]);
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Centrar Circulo 2"]')?.click());
    expect(onLocate).toHaveBeenCalledWith(objects[1]);
  });

  it("deletes the clicked row, not the currently selected object", () => {
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Borrar Circulo 2"]')?.click());
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(objects[1]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("handles Delete and Backspace without bubbling to canvas deletion", () => {
    const bubble = vi.fn();
    document.body.addEventListener("keydown", bubble);
    const row = container.querySelector<HTMLButtonElement>('[title="Circulo 2"]');
    for (const key of ["Delete", "Backspace"]) {
      act(() => row?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })));
    }
    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenLastCalledWith(objects[1]);
    expect(bubble).not.toHaveBeenCalled();
    document.body.removeEventListener("keydown", bubble);
  });

  it("collapses branches and searches without modifying scene objects", () => {
    const group = container.querySelector<HTMLButtonElement>(".scene-object-group");
    act(() => group?.click());
    expect(group?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[title="Luz puntual 1"]')).toBeNull();
    const input = container.querySelector<HTMLInputElement>("input");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "luz");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector('[title="Luz puntual 1"]')).not.toBeNull();
    expect(container.querySelector('[title="Circulo 2"]')).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
