import { ArrowLeft, ArrowRight, Dices, Diamond, Eye, EyeOff, Gem, Hexagon, Minus, Pentagon, Percent, Plus, RotateCcw, Square, SquareFunction, Trash2, Triangle, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { changeGroupType, countPhysicalDice, DAMAGE_LABELS, DAMAGE_TYPES, D20_LABELS, DICE_COLORS, groupFormula, MAX_DICE, MAX_MODIFIER, POOL_DICE, updateGroupModifier, updateGroupQuantity, type D20Mode, type DamageType, type DiceDraft } from "../../../../domain/dice/dice";
import { DAMAGE_COLORS } from "../../../../domain/dice/appearance";
import { composeFormulaDraft, MAX_FORMULA_LENGTH, type FormulaEdits } from "../../../../domain/dice/formula";
import type { useDiceSession } from "../../hooks/useDiceSession";
import { DiceResultSummary } from "./DiceResultSummary";
import "./dice.css";

type DiceController = ReturnType<typeof useDiceSession>;
const ICONS = { d4: Triangle, d6: Square, d8: Diamond, d10: Gem, d12: Pentagon, "d%": Percent };

export function DicePanel({ controller }: { controller: DiceController }): JSX.Element {
  const { draft, state, busy, ready, preparing, error, updateDraft } = controller;
  const [activeGroup, setActiveGroup] = useState<DamageType>("none");
  const [askD20, setAskD20] = useState(false);
  const [page, setPage] = useState(0);
  const [inputMode, setInputMode] = useState<"manual" | "formula">("manual");
  const [formulaEdits, setFormulaEdits] = useState<FormulaEdits>({});
  const [invalidModifier, setInvalidModifier] = useState(false);
  const [invalidD20Modifier, setInvalidD20Modifier] = useState(false);
  const [modifierReset, setModifierReset] = useState(0);
  const formulaState = useMemo(() => composeFormulaDraft(draft, formulaEdits), [draft, formulaEdits]);
  const invalidFormula = inputMode === "formula" && (formulaState.error !== null || Object.keys(formulaState.errors).length > 0);
  const selection = inputMode === "formula" ? formulaState.draft : draft;
  const count = countPhysicalDice(selection.groups, selection.includeD20 ? "normal" : null);
  const group = selection.groups.find(g => g.damageType === activeGroup);
  const patch = (value: Partial<DiceDraft>): void => updateDraft({ ...draft, ...value });
  const editFormula = (text: string): void => {
    const edits = { ...formulaEdits, [activeGroup]: text };
    setFormulaEdits(edits);
    const next = composeFormulaDraft(draft, edits);
    if (!next.error && Object.keys(next.errors).length === 0) updateDraft(next.draft);
  };
  const forgetFormulas = (...types: DamageType[]): void => setFormulaEdits(current => Object.fromEntries(Object.entries(current).filter(([type]) => !types.includes(type as DamageType))));
  const pages = Math.max(1, Math.ceil(state.history.length / 10)), currentPage = Math.min(page, pages - 1);
  const disabled = busy || !ready;
  const launch = (mode: D20Mode | null): void => { if (mode !== null) void controller.roll(mode, draft); else if (inputMode === "formula") void controller.roll(mode, selection); else void controller.roll(mode); };
  return <div className="dice-panel" onKeyDown={event => event.stopPropagation()}>
    <fieldset disabled={disabled} className="dice-panel-properties"><legend>Tirada</legend>
      <div className="dice-segmented" aria-label="Visibilidad de la tirada">
        <button type="button" aria-pressed={draft.visibility === "hidden"} onClick={() => patch({ visibility: "hidden" })}><EyeOff size={16} /> Oculta</button>
        <button type="button" aria-pressed={draft.visibility === "open"} onClick={() => patch({ visibility: "open" })}><Eye size={16} /> Abierta</button>
      </div>
      {draft.visibility === "open" && <label className="dice-toggle" title="Oculta etiquetas y totales, no los numeros impresos en los dados"><span>Mostrar resultado a jugadores</span><input type="checkbox" checked={draft.showPlayerResult} onChange={event => patch({ showPlayerResult: event.target.checked })} /></label>}
      <div className="dice-field-label">Color sin tipo / d20</div>
      <div className="dice-swatches" role="group" aria-label="Color de los dados">
        <button type="button" className="dice-swatch dice-swatch-multi" title="Por tipo de dado" aria-label="Por tipo de dado" aria-pressed={draft.appearance.color === "multi"} onClick={() => patch({ appearance: { ...draft.appearance, color: "multi" } })} />
        {DICE_COLORS.map(([id, label, color]) => <button type="button" key={id} className="dice-swatch" style={{ backgroundColor: color }} title={label} aria-label={label} aria-pressed={draft.appearance.color === id} onClick={() => patch({ appearance: { ...draft.appearance, color: id } })} />)}
      </div>
      <label className="dice-field"><span>Material</span><select value={draft.appearance.material} onChange={event => patch({ appearance: { ...draft.appearance, material: event.target.value as DiceDraft["appearance"]["material"] } })}><option value="resin">Resina</option><option value="matte">Mate</option><option value="metal">Metal</option></select></label>
      <label className="dice-field dice-force"><span>Fuerza <output>{draft.force.toFixed(1)}</output></span><input aria-label="Fuerza de lanzamiento" type="range" min="0.5" max="1.6" step="0.1" value={draft.force} onChange={event => patch({ force: event.target.valueAsNumber })} /></label>
      {(["dm", "player"] as const).map(view => {
        const label = view === "dm" ? "Tamano en DM" : "Tamano en Player", scale = controller.diceSizes.sizes[view];
        return <div key={view} className="dice-size-control">
          <label className="dice-field dice-force"><span>{label}<output>{Math.round(scale * 100)}%</output></span><input type="range" aria-label={label} min="1" max="2.5" step="0.25" value={scale} disabled={!controller.diceSizes.ready} onChange={event => void controller.diceSizes.setSize({ view, scale: event.target.valueAsNumber })} /></label>
          <button type="button" className="dice-icon-button" aria-label={`Restablecer ${label.toLowerCase()}`} title={`Restablecer ${label.toLowerCase()} (100%)`} disabled={!controller.diceSizes.ready || scale === 1} onClick={() => void controller.diceSizes.setSize({ view, scale: 1 })}><RotateCcw size={16} aria-hidden="true" /></button>
        </div>;
      })}
    </fieldset>
    <label className="dice-toggle dice-sound-control"><span>{controller.soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}Sonido de dados</span><input type="checkbox" checked={controller.soundEnabled} onChange={event => controller.setSoundEnabled(event.target.checked)} /></label>
    <fieldset disabled={disabled} className="dice-pool"><legend>Dados</legend>
      <label className="dice-d20"><Hexagon size={22} aria-hidden="true" /><span><strong>d20</strong><small>Chequeo independiente</small></span><input type="checkbox" aria-label="Incluir chequeo d20" checked={draft.includeD20} onChange={event => patch({ includeD20: event.target.checked })} /></label>
      {draft.includeD20 && <DiceModifierInput type="d20" value={draft.d20Modifier} onChange={d20Modifier => patch({ d20Modifier })} onInvalid={setInvalidD20Modifier} />}
      <fieldset className="dice-damage-controls" aria-label="Dados de dano" disabled={disabled || draft.includeD20}>
      <div className="dice-segmented" role="group" aria-label="Modo de composicion">
        <button type="button" aria-pressed={inputMode === "manual"} disabled={disabled || invalidFormula} onClick={() => { if (inputMode === "formula") updateDraft(selection); setInputMode("manual"); setFormulaEdits({}); }}><Dices size={16} />Por dados</button>
        <button type="button" aria-pressed={inputMode === "formula"} disabled={disabled || invalidModifier} onClick={() => setInputMode("formula")}><SquareFunction size={16} />Formula</button>
      </div>
      <label className="dice-field"><span><i className="dice-damage-swatch" style={{ backgroundColor: DAMAGE_COLORS[activeGroup] }} aria-hidden="true" />Grupo de dano</span><select aria-label="Grupo de dano activo" value={activeGroup} onChange={event => setActiveGroup(event.target.value as DamageType)}>{DAMAGE_TYPES.map(type => <option key={type} value={type}>{DAMAGE_LABELS[type]}</option>)}</select></label>
      {inputMode === "formula" ? <div className="dice-formula-editor">
        <label htmlFor="dice-damage-formula">Formula de {DAMAGE_LABELS[activeGroup]}</label>
        <input id="dice-damage-formula" type="text" maxLength={MAX_FORMULA_LENGTH} autoComplete="off" spellCheck={false} placeholder="2d6 + 3d4 + 2" value={formulaEdits[activeGroup] ?? (group ? groupFormula(group) : "")} aria-invalid={Boolean(formulaState.errors[activeGroup] || formulaState.error)} aria-describedby={formulaState.errors[activeGroup] ? "dice-formula-error" : formulaState.error ? "dice-formula-limit" : undefined} onChange={event => editFormula(event.target.value)} />
        {formulaState.errors[activeGroup] && <p className="dice-error" id="dice-formula-error" role="alert">{formulaState.errors[activeGroup]}</p>}
        {formulaState.error && <p className="dice-error" id="dice-formula-limit" role="alert">{formulaState.error}</p>}
        {DAMAGE_TYPES.filter(type => type !== activeGroup && formulaState.errors[type]).map(type => <button type="button" key={type} className="dice-formula-error-link" onClick={() => setActiveGroup(type)}>{DAMAGE_LABELS[type]}: formula invalida</button>)}
      </div> : <><div className="dice-quantity-list">{POOL_DICE.map(type => { const Icon = ICONS[type], quantity = group?.dice[type] ?? 0; return <div key={type} className="dice-quantity-row">
        <span><Icon aria-hidden="true" size={20} style={activeGroup === "none" ? undefined : { color: DAMAGE_COLORS[activeGroup] }} /><b>{type}</b>{type === "d%" && <small>2d10</small>}</span>
        <button type="button" className="dice-icon-button" title={`Quitar ${type}`} aria-label={`Quitar ${type}`} disabled={disabled || quantity === 0} onClick={() => patch({ groups: updateGroupQuantity(draft.groups, activeGroup, type, quantity - 1) })}><Minus size={14} /></button>
        <input type="number" min="0" max={type === "d%" ? 12 : 24} step="1" aria-label={`Cantidad ${type}`} value={quantity} onChange={event => patch({ groups: updateGroupQuantity(draft.groups, activeGroup, type, event.target.value === "" ? 0 : event.target.valueAsNumber) })} />
        <button type="button" className="dice-icon-button" title={`Agregar ${type}`} aria-label={`Agregar ${type}`} disabled={disabled || count + (type === "d%" ? 2 : 1) > MAX_DICE} onClick={() => patch({ groups: updateGroupQuantity(draft.groups, activeGroup, type, quantity + 1) })}><Plus size={14} /></button>
      </div>; })}</div>
      <DiceModifierInput key={`${activeGroup}:${modifierReset}`} type={activeGroup} value={group?.modifier ?? 0} onChange={modifier => patch({ groups: updateGroupModifier(draft.groups, activeGroup, modifier) })} onInvalid={setInvalidModifier} /></>}
      {selection.groups.length > 0 && <ul className="dice-groups" aria-label="Grupos de la tirada">{selection.groups.map(g => <li key={g.id}>
        <button type="button" className="dice-group-edit" aria-label={`Editar ${DAMAGE_LABELS[g.damageType]}`} aria-pressed={activeGroup === g.damageType} onClick={() => setActiveGroup(g.damageType)}><i className="dice-damage-swatch" style={{ backgroundColor: DAMAGE_COLORS[g.damageType] }} aria-hidden="true" />{groupFormula(g)}</button>
        <select disabled={disabled || invalidFormula} aria-label={`Tipo de dano de ${groupFormula(g)}`} value={g.damageType} onChange={event => { const next = event.target.value as DamageType; patch({ groups: changeGroupType(selection.groups, g.id, next) }); forgetFormulas(g.damageType, next); setActiveGroup(next); }}>{DAMAGE_TYPES.map(type => <option key={type} value={type}>{DAMAGE_LABELS[type]}</option>)}</select>
        <button type="button" className="dice-icon-button" aria-label={`Quitar grupo ${DAMAGE_LABELS[g.damageType]}`} title="Quitar grupo" onClick={() => { patch({ groups: selection.groups.filter(candidate => candidate.id !== g.id) }); forgetFormulas(g.damageType); if (activeGroup === g.damageType) setModifierReset(current => current + 1); }}><X size={14} /></button>
      </li>)}</ul>}
      </fieldset>
      <div className="dice-selection-footer"><span>{count} / {MAX_DICE} piezas</span><button type="button" className="dice-icon-button" title="Limpiar seleccion" aria-label="Limpiar seleccion" onClick={() => { setFormulaEdits({}); setModifierReset(current => current + 1); patch({ groups: [], includeD20: false, d20Modifier: 0 }); }}><Trash2 size={16} /></button></div>
    </fieldset>
    {error && <p className="dice-error" role="alert">{error}</p>}
    {!ready && !error && <p className="dice-status" role="status">Mesa de dados no disponible</p>}
    <button type="button" className="dice-roll-button" disabled={disabled || count === 0 || (draft.includeD20 ? invalidD20Modifier : invalidFormula || invalidModifier)} onClick={() => { setPage(0); if (draft.includeD20) setAskD20(true); else launch(null); }}><Dices size={19} /><span>{preparing ? "Preparando..." : busy ? "Rodando..." : "Lanzar"}</span>{draft.visibility === "hidden" ? <EyeOff size={16} aria-label="Oculta" /> : <Eye size={16} aria-label="Abierta" />}</button>
    <section className="dice-history" aria-label="Historial de tiradas"><header><h3>Tiradas recientes <small>{state.history.length} / 500</small></h3><button type="button" className="dice-icon-button" aria-label="Limpiar historial" title="Limpiar historial" disabled={!state.history.length || busy} onClick={() => { if (window.confirm("Limpiar el historial de tiradas de esta sesion?")) void controller.clearHistory(); }}><Trash2 size={16} /></button></header>
      {state.history.length === 0 && <p className="dice-status">Sin tiradas</p>}
      <ol>{state.history.slice(currentPage * 10, currentPage * 10 + 10).map(entry => <li key={entry.id}>
        <div className="dice-history-meta"><span title={entry.request.draft.visibility === "open" ? "Abierta" : "Oculta"}>{entry.request.draft.visibility === "open" ? <Eye size={14} /> : <EyeOff size={14} />}{entry.request.draft.visibility === "open" ? "Abierta" : "Oculta"}</span><time>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div>
        <div className="dice-history-origin" title={`${entry.context.sceneName} / ${entry.context.mapName}`}>{entry.context.sceneName} / {entry.context.mapName}</div>
        {entry.result && Date.now() >= entry.settledAt ? <DiceResultSummary result={entry.result} /> : <p className="dice-status">{entry.status === "interrupted" ? "Interrumpida" : entry.status === "failed" ? "No resuelta" : "Rodando..."}</p>}
        {entry.id === state.publicRollId && entry.status === "complete" && Date.now() >= entry.settledAt && <button type="button" className="dice-publish-result" disabled={busy} onClick={() => void controller.showResult(entry.id, !state.publicResultVisible)}>{state.publicResultVisible ? <EyeOff size={14} /> : <Eye size={14} />}{state.publicResultVisible ? "Ocultar resultado" : "Mostrar resultado"}</button>}
      </li>)}</ol>
      {pages > 1 && <nav className="dice-history-pages" aria-label="Paginas del historial"><button type="button" className="dice-icon-button" aria-label="Tiradas mas recientes" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft size={16} /></button><span>{currentPage + 1} / {pages}</span><button type="button" className="dice-icon-button" aria-label="Tiradas anteriores" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}><ArrowRight size={16} /></button></nav>}
    </section>
    {askD20 && createPortal(<D20RollModeDialog draft={draft} onClose={() => setAskD20(false)} onRoll={mode => { setAskD20(false); launch(mode); }} />, document.body)}
  </div>;
}

function DiceModifierInput({ type, value, onChange, onInvalid }: { type: DamageType | "d20"; value: number; onChange: (value: number) => void; onInvalid: (value: boolean) => void }): JSX.Element {
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
  return <div><label className="dice-field dice-modifier"><span>{type === "d20" ? "Modificador d20" : "Modificador final"}</span><input type="text" inputMode="numeric" maxLength={6} aria-label={`Modificador de ${type === "d20" ? "d20" : DAMAGE_LABELS[type]}`} aria-invalid={!valid} aria-describedby={!valid ? `dice-modifier-error-${type}` : undefined} value={text} onChange={event => edit(event.target.value)} /></label>
    {!valid && <p className="dice-error" id={`dice-modifier-error-${type}`} role="alert">Modificador entero entre -{MAX_MODIFIER} y {MAX_MODIFIER}.</p>}
  </div>;
}

function D20RollModeDialog({ draft, onClose, onRoll }: { draft: DiceDraft; onClose: () => void; onRoll: (mode: D20Mode) => void }): JSX.Element {
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
  return <div className="modal-backdrop dice-dialog-backdrop" onClick={onClose} onKeyDown={key}><section ref={dialog} className="dice-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="dice-mode-title" onClick={event => event.stopPropagation()}>
    <header><h2 id="dice-mode-title">Chequeo d20</h2><button type="button" className="dice-icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></header>
    <div className="dice-dialog-visibility">{draft.visibility === "open" ? <Eye size={16} /> : <EyeOff size={16} />}{draft.visibility === "open" ? "Tirada abierta" : "Tirada oculta"}</div>
    {draft.d20Modifier !== 0 && <p className="dice-dialog-modifier">Modificador <strong>{draft.d20Modifier > 0 ? "+" : ""}{draft.d20Modifier}</strong></p>}
    <div className="dice-mode-options">{(["normal", "advantage", "disadvantage"] as const).map(option => <button type="button" key={option} aria-pressed={mode === option} onClick={() => setMode(option)}><span>{D20_LABELS[option]}</span><small>{option === "normal" ? "1d20" : option === "advantage" ? "2d20 · Mayor" : "2d20 · Menor"}</small></button>)}</div>
    {count > MAX_DICE && <p className="dice-error" role="alert">Esta tirada necesita {count} piezas. El maximo es 24.</p>}
    <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="dice-roll-button" disabled={count > MAX_DICE} onClick={() => onRoll(mode)}><Dices size={17} />Lanzar</button></footer>
  </section></div>;
}
