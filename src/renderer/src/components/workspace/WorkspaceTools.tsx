import { useEffect, useState, type JSX } from "react";
import { Check, Circle, CircleDot, CloudFog, Cone, Crosshair, Flame, Hand, Lightbulb, MapPin, MousePointer2, MoveUpRight, Pencil, Route, Ruler, Settings2, Shapes, Square, Sun, Type, Waves, X, Zap } from "lucide-react";
import type { InteractionTool } from "../../../../domain/interaction/interaction-state";
import { getFireTool, getLightningTool } from "../../../../domain/interaction/interaction-state";
import type { TacticalShapeKind } from "../../../../domain/shapes/shapes";
import type { LightKind } from "../../../../domain/lighting/lights";
import { FireTools, type FireTool } from "../FireProperties";
import { LightningTools } from "../LightningProperties";
import type { LightningShape } from "../../../../domain/effects/lightning";

type Group = "measure" | "area" | "light" | "fog" | "fire" | "lightning" | "annotations" | null;
interface WorkspaceToolsProps {
  readonly activeTool: InteractionTool;
  readonly pan: boolean;
  readonly busy: boolean;
  readonly fogEnabled: boolean;
  readonly fogCells: number;
  readonly onPrepare: () => void;
  readonly onSelect: () => void;
  readonly onPan: () => void;
  readonly onShape: (kind: TacticalShapeKind) => void;
  readonly onLight: (kind: LightKind) => void;
  readonly onDynamicLight: () => void;
  readonly onMagicalDarkness: () => void;
  readonly onPath: () => void;
  readonly onWater: () => void;
  readonly onFire: (tool: FireTool) => void;
  readonly onLightning: (shape: LightningShape) => void;
  readonly onPin: () => void;
  readonly onArea: () => void;
  readonly onLink: () => void;
  readonly onLabel: () => void;
  readonly onToken: () => void;
  readonly onPointer: () => void;
  readonly onFog: () => void;
  readonly onFogCells: (value: number) => void;
  readonly onSettings: (section: "fog" | "daytime" | "grid") => void;
  readonly onConfirmDrawing: () => void;
}

export function WorkspaceTools(props: WorkspaceToolsProps): JSX.Element {
  const [group, setGroup] = useState<Group>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent): void => { if (event.key === "Escape") setGroup(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const choose = (action: () => void): void => { if (!props.busy) { props.onPrepare(); action(); } };
  const open = (value: Group): void => { props.onPrepare(); setGroup(current => current === value ? null : value); };
  const tool = (label: string, icon: JSX.Element, active: boolean, action: () => void): JSX.Element =>
    <button type="button" className="workspace-icon" aria-label={label} title={label} aria-pressed={active} disabled={props.busy} onClick={action}>{icon}</button>;
  const action = (label: string, icon: JSX.Element, run: () => void): JSX.Element =>
    <button type="button" title={label} aria-label={label} onClick={() => choose(run)} disabled={props.busy}>{icon}</button>;
  return <>
    <nav className="workspace-tool-rail" aria-label="Herramientas del mapa">
      {tool("Seleccionar", <MousePointer2 size={18} />, props.activeTool === "select" && !props.pan && group === null, () => { setGroup(null); choose(props.onSelect); })}
      {tool("Desplazar mapa", <Hand size={18} />, props.pan, () => { setGroup(null); choose(props.onPan); })}
      <hr />
      {tool("Medicion", <Ruler size={18} />, group === "measure" || props.activeTool === "path", () => open("measure"))}
      {tool("Areas", <Shapes size={18} />, group === "area", () => open("area"))}
      {tool("Luces", <Lightbulb size={18} />, group === "light", () => open("light"))}
      {tool("Niebla de guerra", <CloudFog size={18} />, group === "fog" || props.activeTool === "fog-reveal", () => open("fog"))}
      <hr />
      {tool("Fuego", <Flame size={18} />, group === "fire" || props.activeTool.startsWith("fire-"), () => open("fire"))}
      {tool("Relampago", <Zap size={18} />, group === "lightning" || props.activeTool.startsWith("lightning-"), () => open("lightning"))}
      {tool("Agua", <Waves size={18} />, props.activeTool === "water", () => { setGroup(null); choose(props.onWater); })}
      {tool("Anotaciones", <MapPin size={18} />, group === "annotations", () => open("annotations"))}
      {tool("Nuevo token", <CircleDot size={18} />, false, () => { setGroup(null); choose(props.onToken); })}
      {tool("Apuntador", <Crosshair size={18} />, props.activeTool === "arcane-pointer", () => { setGroup(null); choose(props.onPointer); })}
      <div className="workspace-tool-spacer" />
      {tool("Ambiente", <Sun size={18} />, false, () => props.onSettings("daytime"))}
      {tool("Ajustes del mapa", <Settings2 size={18} />, false, () => props.onSettings("grid"))}
    </nav>
    {(group !== null || props.activeTool === "path" || props.activeTool === "water") && <div className="workspace-context-tools" role="toolbar" aria-label="Opciones de herramienta">
      {group === "measure" && <>{action("Medir distancia", <MoveUpRight size={17} />, () => props.onShape("measurement"))}{action("Dibujar camino", <Route size={17} />, props.onPath)}</>}
      {group === "area" && <>{action("Area circular", <Circle size={17} />, () => props.onShape("circle"))}{action("Area conica", <Cone size={17} />, () => props.onShape("cone"))}{action("Area rectangular", <Square size={17} />, () => props.onShape("rectangle"))}</>}
      {group === "light" && <>{action("Luz puntual", <Lightbulb size={17} />, () => props.onLight("point"))}{action("Luz conica", <Cone size={17} />, () => props.onLight("cone"))}{action("Luz dinamica", <Sun size={17} />, props.onDynamicLight)}{action("Oscuridad magica", <Circle size={17} />, props.onMagicalDarkness)}</>}
      {group === "fire" && <FireTools active={props.activeTool === "fire-paint" ? "paint" : getFireTool(props.activeTool)} onSelect={value => choose(() => props.onFire(value))} />}
      {group === "lightning" && <LightningTools active={getLightningTool(props.activeTool)} onSelect={value => choose(() => props.onLightning(value))} />}
      {group === "annotations" && <>{action("Pin de habitacion", <MapPin size={17} />, props.onPin)}{action("Area de informacion", <Pencil size={17} />, props.onArea)}{action("Conexion de mapa", <Route size={17} />, props.onLink)}{action("Texto DM", <Type size={17} />, props.onLabel)}</>}
      {group === "fog" && <>
        <button type="button" aria-label="Revelar niebla" title={props.fogEnabled ? "Revelar niebla" : "Activa la niebla en sus ajustes"} disabled={!props.fogEnabled || props.busy} aria-pressed={props.activeTool === "fog-reveal"} onClick={() => choose(props.onFog)}><Pencil size={17} /></button>
        <label>Cuadros<input type="number" min="0.25" max="30" step="0.25" aria-label="Pincel de niebla en cuadros" value={props.fogCells} onChange={event => props.onFogCells(event.currentTarget.valueAsNumber)} /></label>
        <button type="button" title="Ajustes de niebla" aria-label="Ajustes de niebla" onClick={() => props.onSettings("fog")}><Settings2 size={17} /></button>
      </>}
      {(props.activeTool === "path" || props.activeTool === "water") && <button type="button" aria-label="Terminar dibujo" title="Terminar dibujo" onClick={props.onConfirmDrawing}><Check size={17} /></button>}
      <button type="button" title="Cancelar herramienta" aria-label="Cancelar herramienta" onClick={() => { setGroup(null); choose(props.onSelect); }}><X size={16} /></button>
    </div>}
  </>;
}
