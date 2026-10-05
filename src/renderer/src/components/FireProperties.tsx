import { Circle, MoveRight, Pencil, Triangle } from "lucide-react";
import type { SceneFireEffect, SceneGrid, SceneSettings } from "../../../domain/sessions/scene-document";
import { createCellFireZone, toggleCircleFireMode, type FirePatch } from "../../../domain/effects/fire";
import { fireLength, fireMeasure, type FireShape } from "../../../domain/effects/fire-shapes";
import { worldLengthFromValue, worldLengthValue } from "../../../domain/measurement/measurement";

export type FireTool = FireShape | "paint";
export function FireTools({ active, onSelect }: { readonly active: FireTool | null; readonly onSelect: (tool: FireTool) => void }) {
  return <div className="lightning-tools fire-tools" role="group" aria-label="Fuegos">
    {([{ shape: "line", Icon: MoveRight, label: "Linea de fuego" }, { shape: "cone", Icon: Triangle, label: "Cono de fuego" },
      { shape: "circle", Icon: Circle, label: "Circulo de fuego" }, { shape: "paint", Icon: Pencil, label: "Pintar fuego" }] as const).map(({ shape, Icon, label }) => (
      <button key={shape} type="button" title={label} aria-label={label} aria-pressed={active === shape}
        className={active === shape ? "is-active" : ""} onClick={() => onSelect(shape)}><Icon size={18} aria-hidden="true" /></button>
    ))}
  </div>;
}

export function FireProperties({ effect, grid, settings, onChange }: {
  readonly effect: SceneFireEffect; readonly grid: SceneGrid; readonly settings: SceneSettings; readonly onChange: (patch: FirePatch) => void;
}) {
  const length = (value: number) => Number(worldLengthValue(value, grid).toFixed(2));
  const zone = effect.zone;
  return <div className="selected-properties-content lightning-properties" aria-label="Propiedades de fuego">
    <span>{zone.kind === "cells" ? `${zone.cells.length} celdas en fuego` : fireMeasure(effect, grid, settings)}</span>
    {(zone.kind === "circle" || zone.kind === "cone") && <label>{zone.kind === "circle" ? "Radio" : "Largo"} ({grid.unit})
      <input type="number" aria-label={`${zone.kind === "circle" ? "Radio" : "Largo"} del fuego`} min={worldLengthValue(10, grid)} step="0.25" value={length(fireLength(effect))}
        onChange={event => {
          const next = worldLengthFromValue(event.currentTarget.valueAsNumber, grid) / effect.scale;
          if (!Number.isFinite(next) || next <= 0) return;
          onChange({ zone: { ...zone, radius: next } });
        }} />
    </label>}
    {zone.kind === "line" && <label>Ancho ({grid.unit})<input type="number" aria-label="Ancho del fuego" min={worldLengthValue(1, grid)} step="0.25"
      value={length(zone.width * effect.scale)} onChange={event => { const width = worldLengthFromValue(event.currentTarget.valueAsNumber, grid) / effect.scale;
        if (Number.isFinite(width) && width > 0) onChange({ zone: { ...zone, width } }); }} /></label>}
    {zone.kind === "cone" && <label>Direccion (grados)<input type="number" aria-label="Direccion del fuego" min="0" max="359" step="1" value={Math.round(zone.direction) % 360}
      onChange={event => { if (Number.isFinite(event.currentTarget.valueAsNumber)) onChange({ zone: { ...zone, direction: event.currentTarget.valueAsNumber } }); }} /></label>}
    {zone.kind === "circle" && <label className="checkbox-row"><input type="checkbox" checked={zone.mode === "open"}
      onChange={() => onChange({ zone: toggleCircleFireMode(effect).zone })} />Circulo abierto</label>}
    {zone.kind === "cells" && <label>Pincel (cuadros)<input type="number" aria-label="Radio del pincel de fuego" min="0.25" step="0.25"
      value={Number((zone.radius * effect.scale / grid.cellSizeWorld).toFixed(2))} onChange={event => {
        const radius = event.currentTarget.valueAsNumber * grid.cellSizeWorld / effect.scale;
        if (Number.isFinite(radius) && radius > 0) onChange({ zone: createCellFireZone(zone.cells, radius) });
      }} /></label>}
    <label>Escala<input type="number" min="0.1" max="8" step="0.1" value={effect.scale}
      onChange={event => { if (Number.isFinite(event.currentTarget.valueAsNumber)) onChange({ scale: event.currentTarget.valueAsNumber }); }} /></label>
    <label>Opacidad<input type="range" min="0" max="1" step="0.05" value={effect.opacity} onChange={event => onChange({ opacity: event.currentTarget.valueAsNumber })} /></label>
    <label className="checkbox-row"><input type="checkbox" checked={effect.visible} onChange={event => onChange({ visible: event.currentTarget.checked })} />Visible</label>
    <label className="checkbox-row"><input type="checkbox" checked={effect.emitsLight} onChange={event => onChange({ emitsLight: event.currentTarget.checked })} />Emite luz</label>
    <label>Color<input type="color" value={effect.color} onChange={event => onChange({ color: event.currentTarget.value })} /></label>
    <label>{zone.kind === "line" || zone.kind === "cone" ? "Alcance de luz" : "Radio luz"} ({grid.unit})<input type="number" min={worldLengthValue(1, grid)} step="0.25"
      value={length(effect.lightRadius)} onChange={event => { const radius = worldLengthFromValue(event.currentTarget.valueAsNumber, grid);
        if (Number.isFinite(radius) && radius > 0) onChange({ lightRadius: radius }); }} /></label>
  </div>;
}
