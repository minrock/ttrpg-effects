import { Circle, MoveRight, Triangle } from "lucide-react";
import type { SceneGrid, SceneLightningEffect, SceneSettings } from "../../../domain/sessions/scene-document";
import { lightningMeasure, lightningShapeNames, type LightningPatch, type LightningShape } from "../../../domain/effects/lightning";
import { worldLengthFromValue, worldLengthValue } from "../../../domain/measurement/measurement";

export function LightningTools({ active, onSelect }: { readonly active: LightningShape | null; readonly onSelect: (shape: LightningShape) => void }) {
  return <div className="lightning-tools" role="group" aria-label="Relampagos">
    {([{ shape: "line", Icon: MoveRight }, { shape: "cone", Icon: Triangle }, { shape: "circle", Icon: Circle }] as const).map(({ shape, Icon }) => (
      <button key={shape} type="button" title={`Relampago: ${lightningShapeNames[shape]}`} aria-label={`Relampago: ${lightningShapeNames[shape]}`}
        aria-pressed={active === shape} className={active === shape ? "is-active" : ""} onClick={() => onSelect(shape)}>
        <Icon size={18} aria-hidden="true" />
      </button>
    ))}
  </div>;
}

export function LightningProperties({ effect, grid, settings, onChange }: {
  readonly effect: SceneLightningEffect; readonly grid: SceneGrid; readonly settings: SceneSettings;
  readonly onChange: (patch: LightningPatch) => void;
}) {
  return <div className="selected-properties-content lightning-properties">
    <span>{lightningMeasure(effect, grid, settings)}</span>
    {effect.zone.kind !== "line" && <label>{effect.zone.kind === "cone" ? "Largo" : "Radio"} ({grid.unit})
      <input type="number" aria-label={effect.zone.kind === "cone" ? "Largo del relampago" : "Radio del relampago"}
        min={worldLengthValue(10, grid)} step="0.25" value={Number(worldLengthValue(effect.zone.radius, grid).toFixed(2))}
        onChange={(event) => onChange({ radius: worldLengthFromValue(event.currentTarget.valueAsNumber, grid) })} />
    </label>}
    {effect.zone.kind === "cone" && <label>Direccion (grados)
      <input type="number" aria-label="Direccion del relampago" min="0" max="359" step="1" value={Math.round(effect.zone.direction) % 360}
        onChange={(event) => onChange({ direction: event.currentTarget.valueAsNumber })} />
    </label>}
    <label>Intensidad <input type="range" min="0.4" max="2" step="0.05" value={effect.intensity}
      onChange={(event) => onChange({ intensity: event.currentTarget.valueAsNumber })} /></label>
    <label>Velocidad <input type="range" min="0.2" max="1.5" step="0.05" value={effect.speed}
      onChange={(event) => onChange({ speed: event.currentTarget.valueAsNumber })} /></label>
    <label>Opacidad <input type="range" min="0" max="1" step="0.05" value={effect.opacity}
      onChange={(event) => onChange({ opacity: event.currentTarget.valueAsNumber })} /></label>
    <label className="checkbox-row"><input type="checkbox" checked={effect.sparks} onChange={(event) => onChange({ sparks: event.currentTarget.checked })} />Chispas</label>
    <label className="checkbox-row"><input type="checkbox" checked={effect.visible} onChange={(event) => onChange({ visible: event.currentTarget.checked })} />Visible</label>
    {effect.zone.kind !== "line" && <label className="checkbox-row"><input type="checkbox" checked={effect.showGuide}
      onChange={(event) => onChange({ showGuide: event.currentTarget.checked })} />Guia del area</label>}
  </div>;
}
