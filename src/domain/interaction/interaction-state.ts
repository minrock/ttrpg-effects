import type { ScreenPoint, WorldPoint } from "../shared/coordinates";
import {
  createTacticalElement,
  type TacticalElement,
  type TacticalElementKind
} from "../tools/tactical-elements";

export type InteractionTool =
  | "select"
  | "fog-reveal"
  | "fire-paint"
  | "path"
  | "water"
  | "arcane-pointer"
  | "room-pin"
  | "information-area"
  | "scene-link";

export interface ContextMenuState {
  readonly screen: ScreenPoint;
  readonly world: WorldPoint;
}

export interface InteractionState {
  readonly activeTool: InteractionTool;
  readonly contextMenu: ContextMenuState | null;
  readonly selectedElementId: string | null;
  readonly isZoomLocked: boolean;
  readonly isMapAdjustMode: boolean;
  readonly elements: readonly TacticalElement[];
}

export function createInitialInteractionState(): InteractionState {
  return {
    activeTool: "select",
    contextMenu: null,
    selectedElementId: null,
    isZoomLocked: true,
    isMapAdjustMode: false,
    elements: []
  };
}

export function openContextMenu(
  state: InteractionState,
  contextMenu: ContextMenuState
): InteractionState {
  return {
    ...state,
    contextMenu
  };
}

export function closeContextMenu(state: InteractionState): InteractionState {
  return {
    ...state,
    contextMenu: null
  };
}

export function selectElement(state: InteractionState, selectedElementId: string | null): InteractionState {
  return {
    ...state,
    selectedElementId,
    contextMenu: null
  };
}

export function createElementAtContextMenu(
  state: InteractionState,
  kind: TacticalElementKind,
  id: string
): InteractionState {
  if (state.contextMenu === null) {
    throw new Error("Cannot create an element without an open context menu.");
  }

  const element = createTacticalElement(id, kind, state.contextMenu.world);

  return {
    ...state,
    contextMenu: null,
    selectedElementId: element.id,
    elements: [...state.elements, element]
  };
}

export function deleteSelectedElement(state: InteractionState): InteractionState {
  if (state.selectedElementId === null) {
    return state;
  }

  return {
    ...state,
    selectedElementId: null,
    elements: state.elements.filter((element) => element.id !== state.selectedElementId)
  };
}

export function cancelInteraction(state: InteractionState): InteractionState {
  if (state.contextMenu !== null) {
    return closeContextMenu(state);
  }

  return {
    ...state,
    activeTool: "select",
    isMapAdjustMode: false
  };
}

export function setZoomLocked(state: InteractionState, isZoomLocked: boolean): InteractionState {
  return {
    ...state,
    isZoomLocked
  };
}

export function setActiveTool(state: InteractionState, activeTool: InteractionTool): InteractionState {
  return {
    ...state,
    activeTool,
    contextMenu: null,
    isMapAdjustMode: activeTool === "select" ? state.isMapAdjustMode : false
  };
}

export function setMapAdjustMode(state: InteractionState, isMapAdjustMode: boolean): InteractionState {
  return {
    ...state,
    isMapAdjustMode,
    activeTool: isMapAdjustMode ? "select" : state.activeTool,
    contextMenu: null
  };
}
