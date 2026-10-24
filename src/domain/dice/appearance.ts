import { DICE_COLORS, type DamageType, type DiceAppearance, type PhysicalDie, type PhysicalDieType } from "./dice";

export const DAMAGE_COLORS: Record<DamageType, string> = {
  none: "#aeb9bc", acid: "#b4cb35", bludgeoning: "#8594a3", slashing: "#d3dce1", piercing: "#c79964",
  fire: "#ec632b", cold: "#65c5e7", force: "#b26fdf", necrotic: "#40533f", psychic: "#d967a5",
  radiant: "#efc851", lightning: "#408cf0", thunder: "#6977c6", poison: "#359d64"
};
const DIE_COLORS: Record<PhysicalDieType, string> = { d4: "#a52d50", d6: "#eeeadd", d8: "#3188ac", d10: "#259e80", d100: "#d6a54f", d12: "#8b79ab", d20: "#cf4050" };

export function physicalDieColor(die: PhysicalDie, appearance: DiceAppearance): string {
  if (die.damageType !== "none") return DAMAGE_COLORS[die.damageType];
  return appearance.color === "multi" ? DIE_COLORS[die.type] : DICE_COLORS.find(([id]) => id === appearance.color)![2];
}
