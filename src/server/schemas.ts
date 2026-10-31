import { z } from "zod";
import { HttpError, invalid } from "./errors";
import { idSchema, templateIdSchema } from "../shared/contracts/resource-inputs";
export { idSchema, templateIdSchema, loginSchema, sceneInputSchema, resolveSchema, templateSchema, npcSchema, monsterSchema, characterSchema } from "../shared/contracts/resource-inputs";
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
