import { z } from "zod";
import { HttpError, invalid } from "./errors";
export const idSchema = z.uuid();
export const templateIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const name = z.string().trim().min(1).max(200);
const short = z.string().max(200);
const notes = z.string().max(1_000_000);
const imagePath = z.string().max(2048).nullable().optional();
export const loginSchema = z.strictObject({ key: z.string().max(1024) });
export const sceneInputSchema = z.strictObject({ name, scene: z.unknown() });
export const resolveSchema = z.strictObject({ references: z.array(z.string().max(2048)).max(200) });
export const templateSchema = z.strictObject({ template: z.strictObject({
  id: templateIdSchema, name, system: name, markdown: notes, css: z.string().max(200_000),
  builtIn: z.literal(false), updatedAt: z.string().datetime()
}) });
export const npcSchema = z.strictObject({ entry: z.strictObject({ name, imagePath, notes: notes.optional() }) });
export const monsterSchema = z.strictObject({ entry: z.strictObject({
  name, system: name, imagePath, contentMarkdown: notes, templateId: templateIdSchema.nullable().optional()
}) });
export const characterSchema = z.strictObject({ entry: z.strictObject({
  characterName: name, playerName: short.optional(), level: short.optional(), species: short.optional(), classes: short.optional(),
  imagePath, stats: z.strictObject({ strength: short.optional(), constitution: short.optional(), dexterity: short.optional(),
    intelligence: short.optional(), wisdom: short.optional(), charisma: short.optional() }).optional(),
  initiative: short.optional(), armorClass: z.string().regex(/^(?:\d+(?:\s*\/\s*\d+)?)?$/).max(200).optional(),
  passivePerception: short.optional(), hitPoints: short.optional(), spellSaveDc: short.optional(), speeds: short.optional(), notes: notes.optional()
}) });
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw invalid();
  return result.data;
}
export function routeId(value: string, template = false): string {
  const result = (template ? templateIdSchema : idSchema).safeParse(value);
  if (!result.success) throw new HttpError(400, "INVALID_ID", "El identificador no es válido.");
  return result.data;
}
export function query(url: URL, allowed: readonly string[]): void {
  for (const key of url.searchParams.keys()) if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) throw new HttpError(400, "INVALID_QUERY", "Los parámetros no son válidos.");
}
export function numberQuery(url: URL, key: string, fallback: number, min: number, max: number): number {
  const raw = url.searchParams.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, "INVALID_QUERY", "Los parámetros no son válidos.");
  return value;
}
