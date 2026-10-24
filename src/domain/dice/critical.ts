import type { DicePresentation, DiceResult, PhysicalDie } from "./dice";

export const CRITICAL_CELEBRATION_MS = 3000;

export function naturalTwenty(dice: readonly PhysicalDie[], result: DiceResult): DicePresentation["critical"] {
  const check = result.d20;
  if (!check || check.values[check.selected] !== 20) return null;
  const die = dice.filter(die => die.role === "check")[check.selected];
  return die?.type === "d20" ? { dieId: die.id } : null;
}

export function criticalIsActive(presentation: DicePresentation | null, now: number): boolean {
  return Boolean(presentation?.critical && presentation.replay && now >= presentation.settledAt && now < presentation.settledAt + CRITICAL_CELEBRATION_MS);
}
