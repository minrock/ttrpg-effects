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

export interface PlayerToolsBridge { shapes: readonly SceneShape[]; enabled: boolean; save(shape: SceneShape): void; remove(id: string): void; clear(): void; cancel(): void }
export function usePlayerTools(identity: string | null, grid: SceneGrid, settings: SceneSettings, bridge?: PlayerToolsBridge) {
  const [stored, setStored] = useState(() => emptyState(identity));
  const local = stored.identity === identity ? stored : emptyState(identity);
  const state = bridge ? { ...local, shapes: bridge.shapes } : local;
  // Never render tools from the previous map while waiting for an effect to reset them.
  if (stored.identity !== identity) setStored(emptyState(identity));
  const context = useRef({ identity, grid, settings });
  context.current = { identity, grid, settings };
  const stateRef = useRef(state);
  stateRef.current = state;
  const bridgeRef = useRef(bridge); bridgeRef.current = bridge;
  const mutate = useCallback((update: (value: LocalToolsState) => LocalToolsState) => {
    const previous = stateRef.current, remote = bridgeRef.current;
    if (remote && !remote.enabled) return;
    const next = update(previous);
    if (remote && next.shapes !== previous.shapes) {
      for (const shape of next.shapes) if (shape !== previous.shapes.find(p => p.id === shape.id)) remote.save(shape);
      for (const shape of previous.shapes) if (!next.shapes.some(p => p.id === shape.id)) remote.remove(shape.id);
    }
    stateRef.current = next; setStored(next);
  }, []);
  const newId = useCallback(() => bridgeRef.current ? `shared-${crypto.randomUUID()}` : `player-local-${crypto.randomUUID()}`, []);


  const editableIds = useMemo(() => state.shapes.map(shape => shape.id), [state.shapes]);
  const selectedShape = state.shapes.find(shape => shape.id === state.selectedId) ?? null;
  const edit = useCallback((id: string, transform: (shape: SceneShape) => SceneShape): void => {
    mutate(current => ({ ...current, shapes: current.shapes.map(shape => shape.id === id ? transform(shape) : shape) }));
  }, [mutate]);
  const cancel = useCallback((): void => { bridgeRef.current?.cancel(); const next = { ...stateRef.current, tool: "select" as const, selectedId: null, points: [] }; stateRef.current = next; setStored(next); }, [mutate]);
  const remove = useCallback((): void => mutate(current => ({
    ...current, shapes: current.shapes.filter(shape => shape.id !== current.selectedId), selectedId: null
  })), []);
  const finish = useCallback((): void => mutate(current => {
    if (current.tool !== "path" || current.points.length < 2) return current;
    const shape = createPathShape({ id: newId(), points: current.points });
    return { ...current, shapes: [...current.shapes, shape], selectedId: shape.id, points: [], tool: "select" };
  }), [mutate]);

  const select = useCallback((id: string | null): void => mutate(current => ({
    ...current, selectedId: current.shapes.some(shape => shape.id === id) ? id : null
  })), []);
  const chooseTool = useCallback((tool: PlayerTool): void => mutate(current => ({ ...current, tool, selectedId: null, points: [] })), []);
  const createArea = useCallback((kind: PlayerAreaKind, position: WorldPoint): void => {
    const { grid, settings } = context.current;
    let shape = createTacticalShape({
      id: newId(), kind: kind === "square" ? "rectangle" : kind,
      position, grid, settings
    });
    if (kind === "square") shape = updateShape(shape, { height: shape.width });
    mutate(current => ({ ...current, tool: "select", points: [], selectedId: shape.id, shapes: [...current.shapes, shape] }));
  }, [mutate]);
  const addPoint = useCallback((point: WorldPoint): void => mutate(current => {
    if (current.tool !== "path" && current.tool !== "measurement") return current;
    const { grid, settings } = context.current;
    const points = normalizePathPoints([...current.points, point]);
    if (bridgeRef.current && points.length > 256) return current;
    if (current.tool === "measurement" && points.length === 2) {
      const shape = setLinearShapeEnd(createTacticalShape({
        id: newId(), kind: "measurement", position: points[0], grid, settings
      }), points[1], grid);
      return { ...current, tool: "select", points: [], selectedId: shape.id, shapes: [...current.shapes, shape] };
    }
    return { ...current, points };
  }), [mutate]);
  const undoPoint = useCallback((): void => mutate(current => ({ ...current, points: current.points.slice(0, -1) })), []);
  const clear = useCallback((): void => { if (bridgeRef.current) { if (!bridgeRef.current.enabled) return; bridgeRef.current.clear(); setStored(emptyState(context.current.identity)); } else setStored(emptyState(context.current.identity)); }, [mutate]);
  const patch = useCallback((patch: ShapePatch): void => mutate(current => ({
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
