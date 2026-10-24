import { z } from "zod";

export const POOL_DICE = ["d4", "d6", "d8", "d10", "d12", "d%"] as const;
export type PoolDie = typeof POOL_DICE[number];
export type PhysicalDieType = Exclude<PoolDie, "d%"> | "d20" | "d100";
export const DAMAGE_TYPES = ["none", "acid", "bludgeoning", "slashing", "piercing", "fire", "cold", "force", "necrotic", "psychic", "radiant", "lightning", "thunder", "poison"] as const;
export type DamageType = typeof DAMAGE_TYPES[number];
export const DAMAGE_LABELS: Record<DamageType, string> = { none: "Sin tipo", acid: "Acido", bludgeoning: "Contundente", slashing: "Cortante", piercing: "Perforante", fire: "Fuego", cold: "Frio", force: "Fuerza", necrotic: "Necrotico", psychic: "Psiquico", radiant: "Radiante", lightning: "Relampago", thunder: "Trueno", poison: "Veneno" };
export const DICE_COLORS = [
  ["ruby", "Rubi", "#a52d50"], ["crimson", "Carmesi", "#d23e4b"], ["coral", "Coral", "#ec786c"], ["orange", "Naranja", "#df7935"],
  ["amber", "Ambar", "#ca9638"], ["gold", "Oro", "#ddb659"], ["lime", "Lima", "#a5bb57"], ["jade", "Jade", "#219c83"],
  ["emerald", "Esmeralda", "#197559"], ["cyan", "Cian", "#3ea6b6"], ["blue", "Azul", "#397fba"], ["violet", "Violeta", "#8570ae"],
  ["pink", "Rosa", "#ce82b1"], ["white", "Blanco", "#f0eee3"], ["silver", "Plata", "#aeb9bc"], ["graphite", "Grafito", "#353c40"]] as const;
export type D20Mode = "normal" | "advantage" | "disadvantage";
export const D20_LABELS: Record<D20Mode, string> = { normal: "Normal", advantage: "Con ventaja", disadvantage: "Con desventaja" };
export const MAX_DICE = 24;
export const HISTORY_LIMIT = 500;
export const MAX_MODIFIER = 9999;
export const DICE_PROTOCOL_VERSION = 3;

const idSchema = z.string().min(1).max(160);
export const groupSchema = z.object({ id: idSchema, damageType: z.enum(DAMAGE_TYPES), dice: z.partialRecord(z.enum(POOL_DICE), z.number().int().min(0).max(MAX_DICE)), modifier: z.number().int().min(-MAX_MODIFIER).max(MAX_MODIFIER).optional() });
export type DiceGroup = z.infer<typeof groupSchema>;
export const appearanceSchema = z.object({ color: z.string().refine(value => value === "multi" || DICE_COLORS.some(([id]) => id === value)), material: z.enum(["resin", "matte", "metal"]) });
export type DiceAppearance = z.infer<typeof appearanceSchema>;
export const draftSchema = z.object({ groups: z.array(groupSchema).max(DAMAGE_TYPES.length), includeD20: z.boolean(), d20Modifier: z.number().int().min(-MAX_MODIFIER).max(MAX_MODIFIER).default(0), visibility: z.enum(["open", "hidden"]), showPlayerResult: z.boolean(), appearance: appearanceSchema, force: z.number().finite().min(.5).max(1.6) }).superRefine((value, ctx) => {
  if (new Set(value.groups.map(g => g.id)).size !== value.groups.length || new Set(value.groups.map(g => g.damageType)).size !== value.groups.length) ctx.addIssue({ code: "custom", message: "Grupos duplicados." });
  if (countPhysicalDice(value.groups, null) > MAX_DICE) ctx.addIssue({ code: "custom", message: "Maximo 24 piezas por tirada de dano." });
});
export type DiceDraft = z.infer<typeof draftSchema>;
export function defaultDiceDraft(): DiceDraft { return { groups: [], includeD20: false, d20Modifier: 0, visibility: "hidden", showPlayerResult: false, appearance: { color: "multi", material: "resin" }, force: 1 }; }
export const contextSchema = z.object({ token: idSchema, sceneId: z.string().max(160), mapId: z.string().max(160), sceneName: z.string().max(200), mapName: z.string().max(200) });
export type DiceContext = z.infer<typeof contextSchema>;
export const requestSchema = z.object({ requestId: idSchema, contextToken: idSchema, draft: draftSchema, d20: z.enum(["normal", "advantage", "disadvantage"]).nullable() }).superRefine((value, ctx) => {
  const count = countPhysicalDice(value.draft.groups, value.d20);
  if (count < 1 || count > MAX_DICE) ctx.addIssue({ code: "custom", message: "Selecciona entre 1 y 24 piezas fisicas." });
  if (value.draft.includeD20 !== (value.d20 !== null)) ctx.addIssue({ code: "custom", message: "Modo d20 invalido." });
});
export type DiceRollRequest = z.infer<typeof requestSchema>;
export interface PhysicalDie { readonly id: string; readonly type: PhysicalDieType; readonly damageType: DamageType; readonly groupId: string | null; readonly logicalId: string; readonly role: "pool" | "tens" | "units" | "check" }
export interface DieValue { readonly id: string; readonly value: number }
export interface LogicalDieResult { readonly id: string; readonly type: PoolDie; readonly value: number; readonly parts: readonly number[] }
export interface DiceGroupResult { readonly id: string; readonly damageType: DamageType; readonly formula: string; readonly dice: readonly LogicalDieResult[]; readonly modifier?: number; readonly total: number }
export interface DiceResult { readonly groups: readonly DiceGroupResult[]; readonly poolTotal: number; readonly d20: { readonly mode: D20Mode; readonly values: readonly number[]; readonly selected: number; readonly value: number; readonly modifier: number; readonly total: number } | null }
export interface DiceReplay { readonly frames: readonly number[]; readonly frameCount: number; readonly stepMs: number; readonly durationMs: number }
export interface DiceSimulation { readonly replay: DiceReplay; readonly values: readonly DieValue[] }
export interface DicePresentation {
  readonly rollId: string; readonly contextToken: string; readonly sceneId: string; readonly mapId: string;
  readonly dice: readonly PhysicalDie[]; readonly appearance: DiceAppearance; readonly replay: DiceReplay | null;
  readonly result: DiceResult | null; readonly startedAt: number; readonly settledAt: number;
  readonly critical?: { readonly dieId: string } | null;
}
export interface DiceEnvelope { readonly revision: number; readonly presentation: DicePresentation | null }
export interface DiceHistoryEntry { readonly id: string; readonly context: DiceContext; readonly request: DiceRollRequest; readonly createdAt: number; readonly settledAt: number; readonly status: "complete" | "interrupted" | "failed"; readonly result: DiceResult | null }
export interface DiceSessionState { readonly protocolVersion: number; readonly draft: DiceDraft; readonly history: readonly DiceHistoryEntry[]; readonly envelope: DiceEnvelope; readonly publicRollId: string | null; readonly publicResultVisible: boolean; readonly busyUntil: number }
export type DiceReply<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

export function countPhysicalDice(groups: readonly DiceGroup[], d20: D20Mode | null): number {
  if (d20 !== null) return d20 === "normal" ? 1 : 2;
  return groups.reduce((total, group) => total + POOL_DICE.reduce((n, type) => n + (group.dice[type] ?? 0) * (type === "d%" ? 2 : 1), 0), 0);
}
export function withModifier(expression: string, modifier: number): string {
  return !modifier ? expression : !expression ? String(modifier) : `${expression} ${modifier < 0 ? "-" : "+"} ${Math.abs(modifier)}`;
}
export function groupFormula(group: DiceGroup): string { return withModifier(POOL_DICE.filter(type => (group.dice[type] ?? 0) > 0).map(type => `${group.dice[type]}${type}`).join(" + "), group.modifier ?? 0); }
export function setGroupComposition(groups: readonly DiceGroup[], type: DamageType, composition: Pick<DiceGroup, "dice" | "modifier">): DiceGroup[] {
  const current = groups.find(g => g.damageType === type);
  let id: string = current?.id ?? type;
  for (let suffix = 1; !current && groups.some(g => g.id === id); suffix++) id = `${type}-${suffix}`;
  const next = { id, damageType: type, ...composition };
  return (current ? groups.map(g => g.id === current.id ? next : g) : [...groups, next]).filter(g => groupFormula(g));
}
export function updateGroupQuantity(groups: readonly DiceGroup[], type: DamageType, die: PoolDie, count: number): DiceGroup[] {
  const current = groups.find(g => g.damageType === type);
  return setGroupComposition(groups, type, { dice: { ...current?.dice, [die]: count }, modifier: current?.modifier ?? 0 });
}
export function updateGroupModifier(groups: readonly DiceGroup[], type: DamageType, modifier: number): DiceGroup[] {
  return setGroupComposition(groups, type, { dice: groups.find(g => g.damageType === type)?.dice ?? {}, modifier });
}
export function changeGroupType(groups: readonly DiceGroup[], id: string, type: DamageType): DiceGroup[] {
  const source = groups.find(g => g.id === id);
  if (!source || source.damageType === type) return [...groups];
  const target = groups.find(g => g.damageType === type);
  const dice = Object.fromEntries(POOL_DICE.map(d => [d, (source.dice[d] ?? 0) + (target?.dice[d] ?? 0)]));
  return [...groups.filter(g => g.id !== id && g.id !== target?.id), { id: target?.id ?? source.id, damageType: type, dice, modifier: (source.modifier ?? 0) + (target?.modifier ?? 0) }];
}
export function expandDice(request: DiceRollRequest): PhysicalDie[] {
  const dice: PhysicalDie[] = [];
  for (const group of request.d20 === null ? request.draft.groups : []) for (const type of POOL_DICE) for (let i = 0; i < (group.dice[type] ?? 0); i++) {
    const logicalId = `${group.id}:${type}:${i}`;
    if (type === "d%") dice.push({ id: `${logicalId}:tens`, logicalId, groupId: group.id, damageType: group.damageType, type: "d100", role: "tens" }, { id: `${logicalId}:units`, logicalId, groupId: group.id, damageType: group.damageType, type: "d10", role: "units" });
    else dice.push({ id: logicalId, logicalId, groupId: group.id, damageType: group.damageType, type, role: "pool" });
  }
  for (let i = 0; i < (request.d20 === null ? 0 : request.d20 === "normal" ? 1 : 2); i++) dice.push({ id: `check:${i}`, logicalId: "check", groupId: null, damageType: "none", type: "d20", role: "check" });
  return dice;
}
export function resolveDiceRoll(request: DiceRollRequest, values: readonly DieValue[]): DiceResult {
  const dice = expandDice(request), byId = new Map(values.map(v => [v.id, v.value]));
  if (values.length !== dice.length || byId.size !== dice.length) throw new Error("Resultados incompletos o duplicados.");
  for (const die of dice) {
    const value = byId.get(die.id), sides = Number(die.type.slice(1));
    if (value === undefined || !Number.isInteger(value) || value < 1 || value > sides || (die.type === "d100" && value % 10 !== 0)) throw new Error("Cara de dado invalida.");
  }
  const groups = (request.d20 === null ? request.draft.groups : []).filter(g => groupFormula(g)).map(group => {
    const logical: LogicalDieResult[] = [];
    for (const die of dice.filter(d => d.groupId === group.id && d.role !== "units")) {
      const value = byId.get(die.id)!;
      if (die.role === "tens") {
        const units = byId.get(`${die.logicalId}:units`)! % 10, tens = value % 100;
        logical.push({ id: die.logicalId, type: "d%", value: (tens + units) || 100, parts: [tens, units] });
      } else logical.push({ id: die.logicalId, type: die.type as PoolDie, value, parts: [value] });
    }
    return { id: group.id, damageType: group.damageType, formula: groupFormula(group), dice: logical, modifier: group.modifier ?? 0, total: logical.reduce((n, d) => n + d.value, group.modifier ?? 0) };
  });
  const checks = dice.filter(d => d.role === "check").map(d => byId.get(d.id)!);
  const selected = request.d20 === "advantage" ? checks.indexOf(Math.max(...checks)) : request.d20 === "disadvantage" ? checks.indexOf(Math.min(...checks)) : 0;
  return { groups, poolTotal: groups.reduce((n, g) => n + g.total, 0), d20: request.d20 === null ? null : { mode: request.d20, values: checks, selected, value: checks[selected], modifier: request.draft.d20Modifier, total: checks[selected] + request.draft.d20Modifier } };
}
export function validateSimulation(value: unknown, dice: readonly PhysicalDie[]): DiceSimulation {
  const parsed = z.object({ values: z.array(z.object({ id: idSchema, value: z.number().int() })).max(MAX_DICE), replay: z.object({ frames: z.array(z.number().finite().min(-100).max(100)).max(24 * 361 * 7), frameCount: z.number().int().min(2).max(361), stepMs: z.literal(1000 / 30), durationMs: z.number().finite().positive().max(12000) }) }).parse(value);
  const { replay } = parsed;
  if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > 1024 * 1024) throw new Error("Trayectoria demasiado grande.");
  if (replay.frames.length !== dice.length * replay.frameCount * 7 || Math.abs(replay.durationMs - (replay.frameCount - 1) * replay.stepMs) > .001) throw new Error("Trayectoria invalida.");
  for (let i = 0; i < replay.frames.length; i += 7) {
    const norm = Math.hypot(...replay.frames.slice(i + 3, i + 7));
    if (Math.abs(norm - 1) > .01) throw new Error("Rotacion invalida.");
  }
  return parsed;
}
