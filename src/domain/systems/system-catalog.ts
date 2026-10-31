import { measureDistance, measurePathDistance } from "../measurement/measurement";
import { normalizeMonsterLibrarySaveInput } from "../monster-library/monster-library";
import { z } from "zod";
import { builtInMonsterTemplates, createEmptyMonsterTemplate } from "../monster-templates/monster-template";
export const systemIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
export const systemRefSchema = z.strictObject({ systemId: systemIdSchema, version: z.number().int().min(1) });
export type SystemRef = z.infer<typeof systemRefSchema>;
export const GENERIC_SYSTEM: SystemRef = Object.freeze({ systemId: "generic", version: 1 });
export const DND_SYSTEM: SystemRef = Object.freeze({ systemId: "dnd-55e", version: 1 });
export const availabilitySchema = z.enum(["enabled", "disabled"]);
export type Availability = z.infer<typeof availabilitySchema>;
/** Registro cerrado: identificadores de módulos compilados, nunca rutas ni código ejecutable. */
export const moduleManifestSchema = z.strictObject({ version: z.literal(1), rules: z.enum(["generic-v1", "dnd-55e-v1"]), measurement: z.literal("grid-measurement-v1"), presentation: z.literal("monster-markdown-v1") });
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export const compiledModules = Object.freeze({ "generic-v1": { profile: "generic" }, "dnd-55e-v1": { profile: "dnd-55e" }, "grid-measurement-v1": { measureDistance, measurePathDistance }, "monster-markdown-v1": { normalize: normalizeMonsterLibrarySaveInput } });
const template = z.strictObject({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/), name: z.string().trim().min(1).max(200), system: z.string().trim().min(1).max(200), markdown: z.string().max(1_000_000), css: z.string().max(200_000), builtIn: z.boolean(), updatedAt: z.iso.datetime() });
export const systemDefinitionSchema = z.strictObject({
  manifest: moduleManifestSchema,
  rules: z.strictObject({ version: z.literal(1), defaultDiagonalMode: z.enum(["dnd5e-default","dnd5e-alternating","manhattan","euclidean"]), capabilities: z.tuple([z.literal("grid-measurement"),z.literal("markdown-monsters")]) }),
  dataSchema: z.strictObject({ id: z.enum(["monster-markdown","generic-notes"]), version: z.literal(1) }),
  presentations: z.array(template).min(1).max(100)
}).refine(value => new Set(value.presentations.map(t => t.id)).size === value.presentations.length);
/** Resuelve solo código compilado; los valores por defecto nunca se aplican sobre una escena existente. */
export function resolveCompiledModules(manifest: ModuleManifest) {
  const valid = moduleManifestSchema.parse(manifest);
  return { rules: compiledModules[valid.rules], measurement: compiledModules[valid.measurement], presentation: compiledModules[valid.presentation] };
}
export type SystemDefinition = z.infer<typeof systemDefinitionSchema>;
export const definitionRefSchema = z.discriminatedUnion("scope", [
  systemRefSchema.extend({ scope: z.literal("catalog"), templateId: z.string().min(1).max(128) }),
  z.strictObject({ scope: z.literal("private"), ownerId: z.string().min(1).max(128), templateId: z.string().min(1).max(128), version: z.literal(1), hash: z.string().regex(/^[a-f0-9]{64}$/) })
]);
export type DefinitionRef = z.infer<typeof definitionRefSchema>;
export const resourceBindingsSchema = z.strictObject({ root: definitionRefSchema.optional(), monsters: z.record(z.string().min(1).max(128), definitionRefSchema).default({}) });
export type ResourceBindings = z.infer<typeof resourceBindingsSchema>;
export interface SystemVersion { systemId: string; version: number; state: "draft" | "published"; createdAt: string; publishedAt: string | null; revision: number; availability: Availability; definition: SystemDefinition; hash: string; templates: Record<string, { availability: Availability; revision: number }> }
export interface ResolvedSystem { ref: SystemRef; definition: SystemDefinition; hash: string; availability: Availability }
export function sameSystem(a: SystemRef, b: SystemRef): boolean { return a.systemId === b.systemId && a.version === b.version; }
const epoch = new Date("2026-10-30T00:00:00.000Z");
export const systemSeeds: ReadonlyArray<{ ref: SystemRef; name: string; definition: SystemDefinition }> = [
  { ref: GENERIC_SYSTEM, name: "Genérico", definition: { manifest: { version: 1, rules: "generic-v1", measurement: "grid-measurement-v1", presentation: "monster-markdown-v1" }, rules: { version: 1, defaultDiagonalMode: "euclidean", capabilities: ["grid-measurement","markdown-monsters"] }, dataSchema: { id: "generic-notes", version: 1 }, presentations: [{ ...createEmptyMonsterTemplate("generic-markdown", epoch), builtIn: true }] } },
  { ref: DND_SYSTEM, name: "D&D 5.5", definition: { manifest: { version: 1, rules: "dnd-55e-v1", measurement: "grid-measurement-v1", presentation: "monster-markdown-v1" }, rules: { version: 1, defaultDiagonalMode: "dnd5e-default", capabilities: ["grid-measurement","markdown-monsters"] }, dataSchema: { id: "monster-markdown", version: 1 }, presentations: structuredClone([...builtInMonsterTemplates]) } }
];
