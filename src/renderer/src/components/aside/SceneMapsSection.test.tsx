// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSceneMap } from "../../../../domain/sessions/scene-maps";
import { SceneMapsSection } from "./SceneMapsSection";

describe("SceneMapsSection image replacement", () => {
  let container: HTMLDivElement;
  let root: Root;
  const maps = [
    createDefaultSceneMap({ id: "active", name: "Entrada" }),
    createDefaultSceneMap({ id: "inactive", name: "Cripta" })
  ];
  const onSelect = vi.fn(), onRename = vi.fn(), onReorder = vi.fn(), onDelete = vi.fn();
  const onAddMap = vi.fn(), onImportScene = vi.fn(), onReplaceMapImage = vi.fn();

  function render(busy = false): void {
    act(() => root.render(<SceneMapsSection
      maps={maps} activeMapId="active" onSelect={onSelect} onRename={onRename}
      onReorder={onReorder} onDelete={onDelete} onAddMap={onAddMap}
      onImportScene={onImportScene} onReplaceMapImage={onReplaceMapImage} isReplacingImage={busy}
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
});
