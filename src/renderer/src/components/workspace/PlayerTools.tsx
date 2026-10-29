import { useEffect, useState, type JSX } from "react";
import {
  Check, Circle, Cone, Hand, MousePointer2, MoveUpRight, RectangleHorizontal, RotateCcw,
  Route, Ruler, Shapes, Square, Trash2, X
} from "lucide-react";
import type { SceneGrid, SceneSettings, SceneShape } from "../../../../domain/sessions/scene-document";
import type { ShapePatch } from "../../../../domain/shapes/shapes";
import { worldLengthFromValue, worldLengthValue } from "../../../../domain/measurement/measurement";
import "./PlayerTools.css";

export type PlayerTool = "select" | "pan" | "measurement" | "path";
export type PlayerAreaKind = "circle" | "square" | "rectangle" | "cone";

export interface PlayerToolsProps {
  readonly tool: PlayerTool;
  readonly selectedShape: SceneShape | null;
  readonly count: number;
  readonly draftCount: number;
  readonly disabled: boolean;
  readonly grid: SceneGrid;
  readonly settings: SceneSettings;
  readonly onTool: (tool: PlayerTool) => void;
  readonly onArea: (kind: PlayerAreaKind) => void;
  readonly onFinish: () => void;
  readonly onCancel: () => void;
  readonly onUndoPoint: () => void;
  readonly onDelete: () => void;
  readonly onClear: () => void;
  readonly onPatch: (patch: ShapePatch) => void;
}

type Group = "measure" | "area" | null;

export function PlayerTools(props: PlayerToolsProps): JSX.Element {
  const [group, setGroup] = useState<Group>(null);
  const { tool, selectedShape, count, draftCount, disabled, grid } = props;
  const isDrawingPath = tool === "path";
  const isDrawing = isDrawingPath || tool === "measurement";
  const hasShapeProperties = selectedShape?.type === "circle" || selectedShape?.type === "cone" || selectedShape?.type === "rectangle";
  useEffect(() => {
    const close = (event: KeyboardEvent): void => { if (event.key === "Escape") setGroup(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const toggleGroup = (next: Exclude<Group, null>): void => {
    props.onTool("select");
    setGroup(current => current === next ? null : next);
  };

  const button = (
    label: string,
    icon: JSX.Element,
    onClick: () => void,
    active = false,
    unavailable = false
  ): JSX.Element => (
    <button type="button" className="player-tools__button" title={label} aria-label={label}
      aria-pressed={active} disabled={disabled || unavailable} onClick={onClick}>{icon}</button>
  );

  const lengthField = (label: string, key: "radius" | "width" | "height", value: number): JSX.Element => (
    <label className="player-tools__field" key={key}>
      <span>{label} <small>{grid.unit}</small></span>
      <input type="number" min="0.01" step="any" aria-label={`${label} en ${grid.unit}`}
        value={Number(worldLengthValue(value, grid).toFixed(2))} disabled={disabled}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next > 0) props.onPatch({ [key]: worldLengthFromValue(next, grid) });
        }} />
    </label>
  );

  const degreeField = (label: string, key: "angle" | "direction", value: number): JSX.Element => (
    <label className="player-tools__field" key={key}>
      <span>{label} <small>°</small></span>
      <input type="number" min={key === "angle" ? 1 : 0} max="360" step="1"
        aria-label={`${label} en grados`} value={value} disabled={disabled}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next >= (key === "angle" ? 1 : 0) && next <= 360) props.onPatch({ [key]: next });
        }} />
    </label>
  );

  return <div className="player-tools">
    <nav className="player-tools__rail" aria-label="Herramientas del jugador">
      {button("Seleccionar", <MousePointer2 size={18} />, () => { setGroup(null); props.onTool("select"); }, tool === "select" && group === null)}
      {button("Desplazar mapa", <Hand size={18} />, () => { setGroup(null); props.onTool("pan"); }, tool === "pan")}
      <span className="player-tools__divider" aria-hidden="true" />
      {button("Medir", <Ruler size={18} />, () => toggleGroup("measure"), group === "measure" || isDrawing)}
      {button("Areas", <Shapes size={18} />, () => toggleGroup("area"), group === "area")}
      <span className="player-tools__divider" aria-hidden="true" />
      {button("Borrar seleccion", <Trash2 size={17} />, props.onDelete, false, selectedShape === null)}
      {button("Borrar todas las formas", <RotateCcw size={17} />, props.onClear, false, count <= 0)}
    </nav>

    {(group !== null || isDrawing || hasShapeProperties) &&
      <div className="player-tools__options" role="toolbar" aria-label="Opciones de herramientas del jugador">
        {group === "measure" && <div className="player-tools__set" role="group" aria-label="Medicion">
          {button("Medir distancia", <MoveUpRight size={17} />, () => { setGroup(null); props.onTool("measurement"); }, tool === "measurement")}
          {button("Dibujar camino", <Route size={17} />, () => { setGroup(null); props.onTool("path"); }, isDrawingPath)}
        </div>}
        {group === "area" && <div className="player-tools__set" role="group" aria-label="Areas">
          {button("Area circular", <Circle size={17} />, () => { setGroup(null); props.onArea("circle"); })}
          {button("Area cuadrada", <Square size={17} />, () => { setGroup(null); props.onArea("square"); })}
          {button("Area rectangular", <RectangleHorizontal size={17} />, () => { setGroup(null); props.onArea("rectangle"); })}
          {button("Area conica", <Cone size={17} />, () => { setGroup(null); props.onArea("cone"); })}
        </div>}
        {isDrawing && <div className="player-tools__set" role="group" aria-label={isDrawingPath ? "Camino" : "Linea"}>
          {isDrawingPath && button("Terminar camino", <Check size={17} />, props.onFinish, false, draftCount < 2)}
          {button("Deshacer ultimo punto", <RotateCcw size={17} />, props.onUndoPoint, false, draftCount < 1)}
          {button(isDrawingPath ? "Cancelar camino" : "Cancelar linea", <X size={17} />, props.onCancel)}
        </div>}
        {hasShapeProperties && selectedShape && <div className="player-tools__properties" role="group" aria-label="Propiedades de la forma seleccionada">
          {(selectedShape.type === "circle" || selectedShape.type === "cone") && lengthField("Radio", "radius", selectedShape.radius ?? grid.cellSizeWorld)}
          {selectedShape.type === "rectangle" && <>
            {lengthField("Ancho", "width", selectedShape.width ?? grid.cellSizeWorld)}
            {lengthField("Alto", "height", selectedShape.height ?? grid.cellSizeWorld)}
          </>}
          {selectedShape.type === "cone" && <>
            {degreeField("Angulo", "angle", selectedShape.angle ?? 60)}
            {degreeField("Direccion", "direction", selectedShape.direction ?? 0)}
          </>}
        </div>}
        {group !== null && button("Cerrar opciones", <X size={16} />, () => setGroup(null))}
      </div>}
  </div>;
}
