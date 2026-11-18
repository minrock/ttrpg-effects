import { Diamond, Gem, Hexagon, Minus, Pentagon, Percent, Plus, Square, SquareFunction, Trash2, Triangle, X } from "lucide-react";
import { useEffect, useMemo, useState, type JSX } from "react";
import { changeGroupType, countPhysicalDice, DAMAGE_LABELS, DAMAGE_TYPES, groupFormula, MAX_DICE, POOL_DICE, updateGroupModifier, updateGroupQuantity, type DamageType, type DiceDraft } from "../../../../domain/dice/dice";
import { DAMAGE_COLORS } from "../../../../domain/dice/appearance";
import { composeFormulaDraft, MAX_FORMULA_LENGTH, type FormulaEdits } from "../../../../domain/dice/formula";
import { Select } from "../ui/Controls";
import { DiceModifierInput } from "./DiceControls";

const ICONS = { d4: Triangle, d6: Square, d8: Diamond, d10: Gem, d12: Pentagon, "d%": Percent };

export type DiceComposerState = {
  readonly count: number;
  readonly invalidFormula: boolean;
  readonly invalidModifier: boolean;
  readonly invalidD20Modifier: boolean;
  readonly rollDraft: DiceDraft;
};

export function DiceComposer({ draft, disabled = false, onDraftChange, onStateChange }: { readonly draft: DiceDraft; readonly disabled?: boolean; readonly onDraftChange: (draft: DiceDraft) => void; readonly onStateChange?: (state: DiceComposerState) => void }): JSX.Element {
  const [activeGroup, setActiveGroup] = useState<DamageType>("none");
  const [inputMode, setInputMode] = useState<"manual" | "formula">("manual");
  const [formulaEdits, setFormulaEdits] = useState<FormulaEdits>({});
  const [invalidModifier, setInvalidModifier] = useState(false);
  const [invalidD20Modifier, setInvalidD20Modifier] = useState(false);
  const [modifierReset, setModifierReset] = useState(0);
  const formulaState = useMemo(() => composeFormulaDraft(draft, formulaEdits), [draft, formulaEdits]);
  const invalidFormula = inputMode === "formula" && (formulaState.error !== null || Object.keys(formulaState.errors).length > 0);
  const selection = inputMode === "formula" ? formulaState.draft : draft;
  const count = countPhysicalDice(selection.groups, selection.includeD20 ? "normal" : null);
  const group = selection.groups.find(candidate => candidate.damageType === activeGroup);
  const patch = (value: Partial<DiceDraft>): void => onDraftChange({ ...draft, ...value });
  const editFormula = (text: string): void => {
    const edits = { ...formulaEdits, [activeGroup]: text };
    setFormulaEdits(edits);
    const next = composeFormulaDraft(draft, edits);
    if (!next.error && Object.keys(next.errors).length === 0) onDraftChange(next.draft);
  };
  const forgetFormulas = (...types: DamageType[]): void => setFormulaEdits(current => Object.fromEntries(Object.entries(current).filter(([type]) => !types.includes(type as DamageType))));
  useEffect(() => onStateChange?.({ count, invalidFormula, invalidModifier, invalidD20Modifier, rollDraft: selection }), [count, invalidD20Modifier, invalidFormula, invalidModifier, onStateChange, selection]);

  return <fieldset disabled={disabled} className="dice-pool"><legend>Dados</legend>
    <label className="dice-d20"><Hexagon size={22} aria-hidden="true" /><span><strong>d20</strong><small>Chequeo independiente</small></span><input type="checkbox" aria-label="Incluir chequeo d20" checked={draft.includeD20} onChange={event => patch({ includeD20: event.currentTarget.checked })} /></label>
    {draft.includeD20 && <DiceModifierInput type="d20" value={draft.d20Modifier} onChange={d20Modifier => patch({ d20Modifier })} onInvalid={setInvalidD20Modifier} />}
    <fieldset className="dice-damage-controls" aria-label="Dados de dano" disabled={disabled || draft.includeD20}>
      <div className="dice-segmented" role="group" aria-label="Modo de composicion"><button type="button" aria-pressed={inputMode === "manual"} disabled={disabled || invalidFormula} onClick={() => { if (inputMode === "formula") onDraftChange(selection); setInputMode("manual"); setFormulaEdits({}); }}><span>Por dados</span></button><button type="button" aria-pressed={inputMode === "formula"} disabled={disabled || invalidModifier} onClick={() => setInputMode("formula")}><SquareFunction size={16} />Formula</button></div>
      <label className="dice-field"><span><i className="dice-damage-swatch" style={{ backgroundColor: DAMAGE_COLORS[activeGroup] }} aria-hidden="true" />Grupo de dano</span><Select aria-label="Grupo de dano activo" value={activeGroup} onChange={event => setActiveGroup(event.currentTarget.value as DamageType)}>{DAMAGE_TYPES.map(type => <option key={type} value={type}>{DAMAGE_LABELS[type]}</option>)}</Select></label>
      {inputMode === "formula" ? <div className="dice-formula-editor"><label htmlFor="dice-damage-formula">Formula de {DAMAGE_LABELS[activeGroup]}</label><input id="dice-damage-formula" type="text" maxLength={MAX_FORMULA_LENGTH} autoComplete="off" spellCheck={false} placeholder="2d6 + 3d4 + 2" value={formulaEdits[activeGroup] ?? (group ? groupFormula(group) : "")} aria-invalid={Boolean(formulaState.errors[activeGroup] || formulaState.error)} aria-describedby={formulaState.errors[activeGroup] ? "dice-formula-error" : formulaState.error ? "dice-formula-limit" : undefined} onChange={event => editFormula(event.currentTarget.value)} />{formulaState.errors[activeGroup] && <p className="dice-error" id="dice-formula-error" role="alert">{formulaState.errors[activeGroup]}</p>}{formulaState.error && <p className="dice-error" id="dice-formula-limit" role="alert">{formulaState.error}</p>}{DAMAGE_TYPES.filter(type => type !== activeGroup && formulaState.errors[type]).map(type => <button type="button" key={type} className="dice-formula-error-link" onClick={() => setActiveGroup(type)}>{DAMAGE_LABELS[type]}: formula invalida</button>)}</div> : <><div className="dice-quantity-list">{POOL_DICE.map(type => { const Icon = ICONS[type], quantity = group?.dice[type] ?? 0; return <div key={type} className="dice-quantity-row"><span><Icon aria-hidden="true" size={20} style={activeGroup === "none" ? undefined : { color: DAMAGE_COLORS[activeGroup] }} /><b>{type}</b>{type === "d%" && <small>2d10</small>}</span><button type="button" className="dice-icon-button" title={`Quitar ${type}`} aria-label={`Quitar ${type}`} disabled={disabled || quantity === 0} onClick={() => patch({ groups: updateGroupQuantity(draft.groups, activeGroup, type, quantity - 1) })}><Minus size={14} /></button><input type="number" min="0" max={type === "d%" ? 12 : 24} step="1" aria-label={`Cantidad ${type}`} value={quantity} onChange={event => patch({ groups: updateGroupQuantity(draft.groups, activeGroup, type, event.currentTarget.value === "" ? 0 : event.currentTarget.valueAsNumber) })} /><button type="button" className="dice-icon-button" title={`Agregar ${type}`} aria-label={`Agregar ${type}`} disabled={disabled || count + (type === "d%" ? 2 : 1) > MAX_DICE} onClick={() => patch({ groups: updateGroupQuantity(draft.groups, activeGroup, type, quantity + 1) })}><Plus size={14} /></button></div>; })}</div><DiceModifierInput key={`${activeGroup}:${modifierReset}`} type={activeGroup} value={group?.modifier ?? 0} onChange={modifier => patch({ groups: updateGroupModifier(draft.groups, activeGroup, modifier) })} onInvalid={setInvalidModifier} /></>}
      {selection.groups.length > 0 && <ul className="dice-groups" aria-label="Grupos de la tirada">{selection.groups.map(groupValue => <li key={groupValue.id}><button type="button" className="dice-group-edit" aria-label={`Editar ${DAMAGE_LABELS[groupValue.damageType]}`} aria-pressed={activeGroup === groupValue.damageType} onClick={() => setActiveGroup(groupValue.damageType)}><i className="dice-damage-swatch" style={{ backgroundColor: DAMAGE_COLORS[groupValue.damageType] }} aria-hidden="true" />{groupFormula(groupValue)}</button><Select disabled={disabled || invalidFormula} aria-label={`Tipo de daño de ${groupFormula(groupValue)}`} value={groupValue.damageType} onChange={event => { const next = event.currentTarget.value as DamageType; patch({ groups: changeGroupType(selection.groups, groupValue.id, next) }); forgetFormulas(groupValue.damageType, next); setActiveGroup(next); }}>{DAMAGE_TYPES.map(type => <option key={type} value={type}>{DAMAGE_LABELS[type]}</option>)}</Select><button type="button" className="dice-icon-button" aria-label={`Quitar grupo ${DAMAGE_LABELS[groupValue.damageType]}`} title="Quitar grupo" onClick={() => { patch({ groups: selection.groups.filter(candidate => candidate.id !== groupValue.id) }); forgetFormulas(groupValue.damageType); if (activeGroup === groupValue.damageType) setModifierReset(current => current + 1); }}><X size={14} /></button></li>)}</ul>}
    </fieldset>
    <div className="dice-selection-footer"><span>{count} / {MAX_DICE} piezas</span><button type="button" className="dice-icon-button" title="Limpiar seleccion" aria-label="Limpiar seleccion" onClick={() => { setFormulaEdits({}); setModifierReset(current => current + 1); patch({ groups: [], includeD20: false, d20Modifier: 0 }); }}><Trash2 size={16} /></button></div>
  </fieldset>;
}
