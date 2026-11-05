import { useEffect, useRef, useState } from "react";
import type { SceneShape } from "../../../../domain/sessions/scene-document";
import type { ShapePatch } from "../../../../domain/shapes/shapes";
import { ALLOWED_SHAPE_EMOJIS, getSelectedShapeEmojis } from "../../../../domain/shapes/shape-emojis";
import { Copy, LockKeyhole, UnlockKeyhole, Palette, Shapes, Trash2 } from "lucide-react";
import "./area-context.css";
export interface AreaContextBounds { left: number; top: number; right: number; bottom: number; mapLeft: number; mapTop: number; mapRight: number; mapBottom: number }
interface Props {
  shape: SceneShape; disabled?: boolean; unavailable?: string;
  bounds: () => AreaContextBounds | null;
  onPatch: (patch: ShapePatch) => void; onLock: () => void; onCopy: () => void; onDelete: () => void; onClose: () => void;
}
const colors = ["#7fb8ff", "#79e1bf", "#f59e0b", "#ef4444", "#a78bfa", "#f472b6", "#ffffff", "#334155"];
export function AreaContextToolbar({ shape, disabled, unavailable, bounds, onPatch, onLock, onCopy, onDelete, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<"color" | "pattern" | null>(null);
  const [draft, setDraft] = useState(shape.color ?? (shape.type === "circle" ? "#7fb8ff" : "#79e1bf"));
  const [error, setError] = useState("");
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  useEffect(() => { setPanel(null); setError(""); }, [shape.id, shape.locked]);
  useEffect(() => { setDraft(shape.color ?? (shape.type === "circle" ? "#7fb8ff" : "#79e1bf")); }, [shape.id, shape.color, shape.type]);
  useEffect(() => {
    const update = () => {
      const b = bounds();
      if (!b) { setPosition(null); return; }
      const width = Math.min(328, b.mapRight - b.mapLeft - 16);
      const height = root.current?.offsetHeight ?? 52;
      const left = Math.max(b.mapLeft + 8, Math.min((b.left + b.right - width) / 2, b.mapRight - width - 8));
      const top = Math.max(b.mapTop + 8, Math.min(b.top - height - 20 >= b.mapTop + 8 ? b.top - height - 20 : b.bottom + 20, b.mapBottom - height - 8));
      const next = { left, top, width, maxHeight: Math.max(64, b.mapBottom - b.mapTop - 16) };
      setPosition(old => JSON.stringify(old) === JSON.stringify(next) ? old : next);
    };
    update(); const timer = setInterval(update, 80); return () => clearInterval(timer);
  }, [bounds, panel]);
  const blocked = disabled || shape.locked;
  const reason = unavailable || (shape.locked ? "Desbloquea el área para modificarla" : undefined);
  const toggle = (next: "color" | "pattern", button: HTMLButtonElement) => { trigger.current = button; if (next === "color") setDraft(shape.color ?? (shape.type === "circle" ? "#7fb8ff" : "#79e1bf")); setPanel(current => current === next ? null : next); setError(""); };
  const closePanel = () => { setPanel(null); trigger.current?.focus(); };
  const commitColor = (color: string | undefined) => { onPatch({ color }); closePanel(); };
  return <div ref={root} className="area-context" role="region" aria-label="Acciones del área" style={{ position: "fixed", ...position, visibility: position ? "visible" : "hidden" }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (panel) closePanel(); else { onClose(); document.querySelector<HTMLCanvasElement>("canvas:focus, .map-viewport canvas")?.focus(); } }
    if (e.key === "Delete" || e.key === "Backspace") e.stopPropagation();
  }}>
    <div className="area-context__bar" role="toolbar" aria-label="Editar área">
      <button title={reason ?? "Color"} disabled={blocked} aria-expanded={panel === "color"} onClick={e => toggle("color", e.currentTarget)}><Palette size={18} style={{ color: shape.color }} />Color</button>
      <button title={reason ?? "Patrón"} disabled={blocked} aria-expanded={panel === "pattern"} onClick={e => toggle("pattern", e.currentTarget)}><Shapes size={18} />Patrón</button>
      <button title={unavailable ?? (shape.locked ? "Desbloquear" : "Bloquear")} disabled={disabled} aria-pressed={shape.locked === true} onClick={onLock}>{shape.locked ? <LockKeyhole size={18} /> : <UnlockKeyhole size={18} />}{shape.locked ? "Desbloquear" : "Bloquear"}</button>
      <button title={reason ?? "Eliminar"} disabled={blocked} onClick={onDelete}><Trash2 size={18} />Eliminar</button>
      <button title={reason ?? "Copiar"} disabled={blocked} onClick={onCopy}><Copy size={18} />Copiar</button>
    </div>
    {unavailable && <p role="status">{unavailable}</p>}
    {panel === "color" && <div className="area-context__panel">
      <div className="area-context__colors">{colors.map(color => <button key={color} aria-label={`Color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => commitColor(color)} />)}</div>
      <output aria-label="Vista previa de color" style={{ display: "block", height: 18, borderRadius: 4, marginBottom: 8, backgroundColor: /^#[0-9a-fA-F]{6}$/.test(draft) ? draft : "transparent" }} />
      <form onSubmit={e => { e.preventDefault(); if (!/^#[0-9a-fA-F]{6}$/.test(draft)) { setError("Usa un color como #7fb8ff."); return; } commitColor(draft.toLowerCase()); }}>
        <label>Color hexadecimal<input value={draft} maxLength={7} onChange={e => { setDraft(e.target.value); setError(""); }} /></label><button type="submit">Aplicar</button>
      </form>
      <button onClick={() => commitColor(undefined)}>Restablecer color</button>{error && <p role="alert">{error}</p>}
    </div>}
    {panel === "pattern" && <div className="area-context__patterns" role="group" aria-label="Patrones de área" onKeyDown={e => {
      const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 };
      if (!(e.key in steps)) return;
      const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")]; const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (index >= 0) { e.preventDefault(); buttons[(index + steps[e.key] + buttons.length) % buttons.length]?.focus(); }
    }}>
      {[["", "Sin patrón"], ...ALLOWED_SHAPE_EMOJIS].map(([emoji, label]) => <button key={label} title={label} aria-label={label} aria-pressed={emoji === (getSelectedShapeEmojis(shape.emoji)[0] ?? "")} onClick={() => { onPatch({ emoji: emoji || undefined, areaPattern: "checkerboard" }); closePanel(); }}>{emoji || "∅"}</button>)}
    </div>}
  </div>;
}
