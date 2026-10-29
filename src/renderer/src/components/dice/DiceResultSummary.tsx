import type { JSX } from "react";
import { DAMAGE_LABELS, D20_LABELS, withModifier, type DiceResult } from "../../../../domain/dice/dice";
import { DAMAGE_COLORS } from "../../../../domain/dice/appearance";

export function DiceResultSummary({ result, compact = false }: { result: DiceResult; compact?: boolean }): JSX.Element {
  return <div className="dice-result">
    {result.d20 && <div className="dice-result-check"><span>d20 <small>{D20_LABELS[result.d20.mode]}</small></span><strong>{result.d20.total}</strong>{result.d20.modifier !== 0 && <small className="dice-result-modifier">Modificador <b>{result.d20.modifier > 0 ? "+" : ""}{result.d20.modifier}</b></small>}<span className="dice-check-values">{result.d20.values.map((value, index) => index === result.d20!.selected ? <b key={index}>{value}</b> : <s key={index}>{value}</s>)}</span></div>}
    {result.groups.map(group => {
      const modifier = group.modifier ?? 0;
      return <div className="dice-result-group" key={group.id}>
        <span><i className="dice-damage-swatch" style={{ backgroundColor: DAMAGE_COLORS[group.damageType] }} aria-hidden="true" />{DAMAGE_LABELS[group.damageType]} <small>{group.formula}</small></span>
        <strong>{group.total}</strong>
        {modifier !== 0 && <small className="dice-result-modifier">Modificador <b>{modifier > 0 ? "+" : ""}{modifier}</b></small>}
        {!compact && <small className="dice-result-values">{withModifier(group.dice.map(die => die.parts.length === 2 ? `${die.value} (${String(die.parts[0]).padStart(2, "0")} + ${die.parts[1]})` : String(die.value)).join(" + "), modifier)}</small>}
      </div>;
    })}
    {result.groups.length > 0 && <div className="dice-result-total"><span>{result.groups.some(g => g.damageType !== "none") ? "Total de dano" : "Total de dados"}</span><strong>{result.poolTotal}</strong></div>}
  </div>;
}
