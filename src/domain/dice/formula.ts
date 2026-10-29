import { DiceRoller } from "@3d-dice/dice-roller-parser";
import { z } from "zod";
import { DAMAGE_TYPES, MAX_DICE, MAX_MODIFIER, POOL_DICE, draftSchema, setGroupComposition, type DamageType, type DiceDraft, type DiceGroup, type PoolDie } from "./dice";

export const MAX_FORMULA_LENGTH = 256;
export const FORMULA_ERROR = "Formula invalida. Usa dados y modificadores enteros, por ejemplo 2d6 + 3d4 + 2.";
const numberNode = z.object({ type: z.literal("number"), value: z.number().int().min(-MAX_MODIFIER).max(MAX_MODIFIER) });
const dieNode = z.object({ type: z.literal("die"), count: z.object({ type: z.literal("number"), value: z.number().int().min(1).max(MAX_DICE) }), die: z.object({ type: z.literal("number"), value: z.union([z.number().int(), z.literal("100")]) }), mods: z.array(z.never()).optional() });
const termNode = z.union([numberNode, dieNode]);
const expressionNode = z.object({ type: z.literal("expression"), head: termNode, ops: z.array(z.object({ type: z.literal("math"), op: z.enum(["+", "-"]), tail: termNode })).max(64) });
const parsedSchema = z.intersection(z.object({ label: z.literal("").optional() }), z.union([termNode, expressionNode]));

export function parseDamageFormula(text: string): Pick<DiceGroup, "dice" | "modifier"> {
  if (text.length > MAX_FORMULA_LENGTH || !text.trim() || /[^\d\sdD%+-]/.test(text)) throw new Error(FORMULA_ERROR);
  let parsed: z.infer<typeof parsedSchema>;
  try {
    // Parse only: randomness and face values still come exclusively from the physics worker.
    parsed = parsedSchema.parse(new DiceRoller().parse(text.trim().toLowerCase()));
  } catch { throw new Error(FORMULA_ERROR); }
  const terms = parsed.type === "expression" ? [{ op: "+", tail: parsed.head }, ...parsed.ops] : [{ op: "+", tail: parsed }];
  const dice: Partial<Record<PoolDie, number>> = {};
  let modifier = 0;
  for (const { op, tail } of terms) {
    if (tail.type === "number") modifier += (op === "-" ? -1 : 1) * tail.value;
    else {
      const sides = Number(tail.die.value), type = sides === 100 ? "d%" : `d${sides}`;
      if (sides === 20) throw new Error("El d20 se configura como chequeo independiente.");
      if (op !== "+" || !POOL_DICE.includes(type as PoolDie)) throw new Error("Usa sumas de d4, d6, d8, d10, d12 o d%; solo se restan modificadores.");
      dice[type as PoolDie] = (dice[type as PoolDie] ?? 0) + tail.count.value;
    }
  }
  if (Math.abs(modifier) > MAX_MODIFIER) throw new Error(`El modificador debe estar entre -${MAX_MODIFIER} y ${MAX_MODIFIER}.`);
  if (POOL_DICE.reduce((sum, type) => sum + (dice[type] ?? 0) * (type === "d%" ? 2 : 1), 0) > MAX_DICE) throw new Error("Maximo 24 piezas fisicas por tirada.");
  return { dice, modifier };
}

export type FormulaEdits = Partial<Record<DamageType, string>>;
export function composeFormulaDraft(draft: DiceDraft, edits: FormulaEdits): { draft: DiceDraft; errors: Partial<Record<DamageType, string>>; error: string | null } {
  let groups = draft.groups;
  const errors: Partial<Record<DamageType, string>> = {};
  for (const type of DAMAGE_TYPES) {
    const text = edits[type];
    if (text === undefined) continue;
    try { groups = setGroupComposition(groups, type, text.trim() ? parseDamageFormula(text) : { dice: {}, modifier: 0 }); }
    catch (error) { errors[type] = error instanceof Error ? error.message : FORMULA_ERROR; }
  }
  const parsed = draftSchema.safeParse({ ...draft, groups });
  return { draft: parsed.success ? parsed.data : draft, errors, error: parsed.success ? null : "Maximo 24 piezas fisicas por tirada de dano." };
}
