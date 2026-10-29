import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SceneGrid, SceneSettings, SceneShape } from "../../../domain/sessions/scene-document";
import type { WorldPoint } from "../../../domain/shared/coordinates";
import {
  createPathShape, createTacticalShape, movePathPoint, moveShape, normalizePathPoints,
  rotateLinearShape, setLinearShapeEnd, setShapeRadius, updateShape, type ShapePatch
} from "../../../domain/shapes/shapes";
import type { PlayerAreaKind, PlayerTool } from "../components/workspace/PlayerTools";

interface LocalToolsState {
  readonly identity: string | null;
  readonly shapes: readonly SceneShape[];
  readonly selectedId: string | null;
  readonly tool: PlayerTool;
  readonly points: readonly WorldPoint[];
}

const emptyState = (identity: string | null): LocalToolsState => ({
  identity, shapes: [], selectedId: null, tool: "select", points: []
});

export function usePlayerTools(identity: string | null, grid: SceneGrid, settings: SceneSettings) {
  const [stored, setStored] = useState(() => emptyState(identity));
  const state = stored.identity === identity ? stored : emptyState(identity);
  // Never render tools from the previous map while waiting for an effect to reset them.
  if (stored.identity !== identity) setStored(state);
  const context = useRef({ identity, grid, settings });
  context.current = { identity, grid, settings };
  const stateRef = useRef(state);
  stateRef.current = state;

  const editableIds = useMemo(() => state.shapes.map(shape => shape.id), [state.shapes]);
  const selectedShape = state.shapes.find(shape => shape.id === state.selectedId) ?? null;
  const edit = useCallback((id: string, transform: (shape: SceneShape) => SceneShape): void => {
    setStored(current => ({ ...current, shapes: current.shapes.map(shape => shape.id === id ? transform(shape) : shape) }));
  }, []);
  const cancel = useCallback((): void => setStored(current => ({ ...current, tool: "select", selectedId: null, points: [] })), []);
  const remove = useCallback((): void => setStored(current => ({
    ...current, shapes: current.shapes.filter(shape => shape.id !== current.selectedId), selectedId: null
  })), []);
  const finish = useCallback((): void => setStored(current => {
    if (current.tool !== "path" || current.points.length < 2) return current;
    const shape = createPathShape({ id: `player-local-${crypto.randomUUID()}`, points: current.points });
    return { ...current, shapes: [...current.shapes, shape], selectedId: shape.id, points: [], tool: "select" };
  }), []);

  const select = useCallback((id: string | null): void => setStored(current => ({
    ...current, selectedId: current.shapes.some(shape => shape.id === id) ? id : null
  })), []);
  const chooseTool = useCallback((tool: PlayerTool): void => setStored(current => ({ ...current, tool, selectedId: null, points: [] })), []);
  const createArea = useCallback((kind: PlayerAreaKind, position: WorldPoint): void => {
    const { grid, settings } = context.current;
    let shape = createTacticalShape({
      id: `player-local-${crypto.randomUUID()}`, kind: kind === "square" ? "rectangle" : kind,
      position, grid, settings
    });
    if (kind === "square") shape = updateShape(shape, { height: shape.width });
    setStored(current => ({ ...current, tool: "select", points: [], selectedId: shape.id, shapes: [...current.shapes, shape] }));
  }, []);
  const addPoint = useCallback((point: WorldPoint): void => setStored(current => {
    if (current.tool !== "path" && current.tool !== "measurement") return current;
    const { grid, settings } = context.current;
    const points = normalizePathPoints([...current.points, point]);
    if (current.tool === "measurement" && points.length === 2) {
      const shape = setLinearShapeEnd(createTacticalShape({
        id: `player-local-${crypto.randomUUID()}`, kind: "measurement", position: points[0], grid, settings
      }), points[1], grid);
      return { ...current, tool: "select", points: [], selectedId: shape.id, shapes: [...current.shapes, shape] };
    }
    return { ...current, points };
  }), []);
  const undoPoint = useCallback((): void => setStored(current => ({ ...current, points: current.points.slice(0, -1) })), []);
  const clear = useCallback((): void => setStored(emptyState(context.current.identity)), []);
  const patch = useCallback((patch: ShapePatch): void => setStored(current => ({
    ...current, shapes: current.shapes.map(shape => shape.id === current.selectedId ? updateShape(shape, patch) : shape)
  })), []);
  const move = useCallback((id: string, x: number, y: number): void => {
    const { grid, settings } = context.current;
    edit(id, shape => moveShape(shape, { x, y }, settings.snapToGrid ? grid : undefined));
  }, [edit]);
  const movePath = useCallback((id: string, x: number, y: number): void => edit(id, shape => moveShape(shape, { x, y }, context.current.grid)), [edit]);
  const moveEnd = useCallback((id: string, x: number, y: number): void => edit(id, shape => setLinearShapeEnd(shape, { x, y }, context.current.grid)), [edit]);
  const movePoint = useCallback((id: string, index: number, x: number, y: number): void => edit(id, shape => movePathPoint(shape, index, { x, y }, context.current.grid)), [edit]);
  const direction = useCallback((id: string, direction: number): void => edit(id, shape => shape.type === "cone"
    ? updateShape(shape, { direction }) : rotateLinearShape(shape, direction, context.current.grid)), [edit]);
  const radius = useCallback((id: string, radius: number): void => edit(id, shape => setShapeRadius(shape, radius)), [edit]);
  const resize = useCallback((id: string, width: number, height: number, x: number, y: number): void =>
    edit(id, shape => updateShape(moveShape(shape, { x, y }), { width, height })), [edit]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true], [role=dialog]"))) return;
      if (event.key === "Escape") {
        cancel();
      } else if (event.key === "Enter" && stateRef.current.tool === "path") {
        if (event.target instanceof Element && event.target.closest("button")) return;
        event.preventDefault();
        finish();
      } else if ((event.key === "Delete" || event.key === "Backspace") && stateRef.current.selectedId !== null) {
        event.preventDefault();
        remove();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cancel, finish, remove]);

  return {
    shapes: state.shapes, editableIds, selectedShape, selectedId: state.selectedId,
    tool: state.tool, points: state.points,
    isDrawing: state.tool === "path" || state.tool === "measurement",
    cancel, remove, finish, select, chooseTool, createArea, addPoint, undoPoint, clear,
    patch, move, movePath, moveEnd, movePoint, direction, radius, resize
  };
}
