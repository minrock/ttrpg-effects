import { Dices, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useRef, useState, type JSX, type KeyboardEvent } from "react";
import { countPhysicalDice, DAMAGE_LABELS, D20_LABELS, MAX_DICE, MAX_MODIFIER, type D20Mode, type DamageType, type DiceDraft } from "../../../../domain/dice/dice";

export function DiceModifierInput({ type, value, onChange, onInvalid }: { readonly type: DamageType | "d20"; readonly value: number; readonly onChange: (value: number) => void; readonly onInvalid: (value: boolean) => void }): JSX.Element {
  const [text, setText] = useState(String(value));
  const valid = /^[+-]?\d+$/.test(text) && Math.abs(Number(text)) <= MAX_MODIFIER;
  useEffect(() => { setText(String(value)); onInvalid(false); }, [value, onInvalid]);
  useEffect(() => () => onInvalid(false), [onInvalid]);
  const edit = (next: string): void => {
    setText(next);
    const accepted = /^[+-]?\d+$/.test(next) && Math.abs(Number(next)) <= MAX_MODIFIER;
    onInvalid(!accepted);
    if (accepted) onChange(Number(next));
  };
  return <div><label className="dice-field dice-modifier"><span>{type === "d20" ? "Modificador d20" : "Modificador final"}</span><input type="text" inputMode="numeric" maxLength={6} aria-label={`Modificador de ${type === "d20" ? "d20" : DAMAGE_LABELS[type]}`} aria-invalid={!valid} aria-describedby={!valid ? `dice-modifier-error-${type}` : undefined} value={text} onChange={event => edit(event.currentTarget.value)} /></label>{!valid && <p className="dice-error" id={`dice-modifier-error-${type}`} role="alert">Modificador entero entre -{MAX_MODIFIER} y {MAX_MODIFIER}.</p>}</div>;
}

export function D20RollModeDialog({ draft, onClose, onRoll }: { readonly draft: DiceDraft; readonly onClose: () => void; readonly onRoll: (mode: D20Mode) => void }): JSX.Element {
  const [mode, setMode] = useState<D20Mode>("normal");
  const dialog = useRef<HTMLElement>(null);
  const count = countPhysicalDice(draft.groups, mode);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]")?.focus();
    return () => previous?.focus();
  }, []);
  const key = (event: KeyboardEvent): void => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key === "Tab") {
      const elements = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  return <div className="modal-backdrop dice-dialog-backdrop" onClick={onClose} onKeyDown={key}><section ref={dialog} className="dice-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="dice-mode-title" onClick={event => event.stopPropagation()}><header><h2 id="dice-mode-title">Chequeo d20</h2><button type="button" className="dice-icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></header><div className="dice-dialog-visibility">{draft.visibility === "open" ? <Eye size={16} /> : <EyeOff size={16} />}{draft.visibility === "open" ? "Tirada pública" : "Tirada oculta"}</div>{draft.d20Modifier !== 0 && <p className="dice-dialog-modifier">Modificador <strong>{draft.d20Modifier > 0 ? "+" : ""}{draft.d20Modifier}</strong></p>}<div className="dice-mode-options">{(["normal", "advantage", "disadvantage"] as const).map(option => <button type="button" key={option} aria-pressed={mode === option} onClick={() => setMode(option)}><span>{D20_LABELS[option]}</span><small>{option === "normal" ? "1d20" : option === "advantage" ? "2d20 · Mayor" : "2d20 · Menor"}</small></button>)}</div>{count > MAX_DICE && <p className="dice-error" role="alert">Esta tirada necesita {count} piezas. El máximo es 24.</p>}<footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="dice-roll-button" disabled={count > MAX_DICE} onClick={() => onRoll(mode)}><Dices size={17} />Lanzar</button></footer></section></div>;
}
