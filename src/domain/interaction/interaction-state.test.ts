import { describe, expect, it } from "vitest";
import {
  cancelInteraction,
  closeContextMenu,
  createElementAtContextMenu,
  createInitialInteractionState,
  deleteSelectedElement,
  openContextMenu,
  selectElement,
  setActiveTool,
  setMapAdjustMode,
  setZoomLocked
} from "./interaction-state";

const contextMenu = {
  screen: { x: 120, y: 80 },
  world: { x: 20, y: -10 }
};

describe("interaction state", () => {
  it("opens and closes a context menu with screen and world coordinates", () => {
    const opened = openContextMenu(createInitialInteractionState(), contextMenu);

    expect(opened.contextMenu).toEqual(contextMenu);
    expect(closeContextMenu(opened).contextMenu).toBeNull();
  });

  it("creates an element at the context menu world position and selects it", () => {
    const state = openContextMenu(createInitialInteractionState(), contextMenu);
    const next = createElementAtContextMenu(state, "circle", "element-1");

    expect(next.contextMenu).toBeNull();
    expect(next.selectedElementId).toBe("element-1");
    expect(next.elements).toEqual([
      {
        id: "element-1",
        kind: "circle",
        position: { x: 20, y: -10 }
      }
    ]);
  });

  it("selects and deletes an element", () => {
    const withElement = createElementAtContextMenu(
      openContextMenu(createInitialInteractionState(), contextMenu),
      "fire",
      "element-1"
    );
    const selected = selectElement(withElement, "element-1");

    expect(deleteSelectedElement(selected)).toMatchObject({
      selectedElementId: null,
      elements: []
    });
  });

  it("does nothing when deleting without a selected element", () => {
    const state = createInitialInteractionState();

    expect(deleteSelectedElement(state)).toBe(state);
  });

  it("cancels an open context menu before resetting the active tool", () => {
    const opened = openContextMenu(setActiveTool(createInitialInteractionState(), "fog-reveal"), contextMenu);

    expect(cancelInteraction(opened).contextMenu).toBeNull();
    expect(cancelInteraction(setActiveTool(createInitialInteractionState(), "fog-reveal")).activeTool).toBe(
      "select"
    );
  });

  it("uses exclusive tool modes for fog reveal, fire paint and map adjust", () => {
    const fogTool = setActiveTool(setMapAdjustMode(createInitialInteractionState(), true), "fog-reveal");

    expect(fogTool.activeTool).toBe("fog-reveal");
    expect(fogTool.isMapAdjustMode).toBe(false);

    const firePaint = setActiveTool(setMapAdjustMode(createInitialInteractionState(), true), "fire-paint");

    expect(firePaint.activeTool).toBe("fire-paint");
    expect(firePaint.isMapAdjustMode).toBe(false);

    const mapAdjust = setMapAdjustMode(fogTool, true);

    expect(mapAdjust.activeTool).toBe("select");
    expect(mapAdjust.isMapAdjustMode).toBe(true);
  });

  it("tracks zoom lock independently from selection and tools", () => {
    const state = setZoomLocked(createInitialInteractionState(), true);

    expect(state.isZoomLocked).toBe(true);
    expect(setZoomLocked(state, false).isZoomLocked).toBe(false);
  });

  it("activates and deactivates map adjust mode without mutating other fields", () => {
    const base = openContextMenu(createInitialInteractionState(), contextMenu);
    const active = setMapAdjustMode(base, true);

    expect(active.isMapAdjustMode).toBe(true);
    expect(active.contextMenu).toBeNull();
    expect(active.isZoomLocked).toBe(base.isZoomLocked);
    expect(active.elements).toBe(base.elements);

    const inactive = setMapAdjustMode(active, false);

    expect(inactive.isMapAdjustMode).toBe(false);
    expect(inactive.isZoomLocked).toBe(active.isZoomLocked);
  });
});
