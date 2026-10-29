import { z } from "zod";
import { builtInMonsterTemplates, type MonsterTemplate } from "../../domain/monster-templates/monster-template";
import { detectOutdatedSceneFields, parseSceneDocument, serializeSceneDocument } from "../../domain/sessions/scene-schema";
import type { SceneResource, SceneSummary } from "../../shared/contracts/http-api";

export type StoredScene = Omit<SceneResource, "missingImages">;
export class StoredDataError extends Error {
  constructor() { super("El recurso persistido no es válido."); }
}
const name = z.string().min(1).max(200).refine((value) => value === value.trim());
const summary = z.strictObject({
  id: z.uuid(), name, createdAt: z.string().datetime(), updatedAt: z.string().datetime()
}).refine((value) => Date.parse(value.updatedAt) >= Date.parse(value.createdAt));
const envelope = z.strictObject({
  ...summary.shape,
  scene: z.unknown(),
  warnings: z.array(z.strictObject({ code: z.enum(["scene-format-outdated", "external-link-unresolved"]), message: z.string().min(1).max(1000) })).max(100)
}).refine((value) => Date.parse(value.updatedAt) >= Date.parse(value.createdAt));
const template = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/), name, system: name,
  markdown: z.string().max(1_000_000), css: z.string().max(200_000),
  builtIn: z.literal(false), updatedAt: z.string().datetime()
});
export function readSummary(value: unknown): SceneSummary {
  const result = summary.safeParse(value);
  if (!result.success) throw new StoredDataError();
  return result.data;
}
export function readStoredScene(body: string, row: unknown): StoredScene {
  try {
    const metadata = readSummary(row);
    const saved = envelope.parse(JSON.parse(body));
    for (const key of ["id", "name", "createdAt", "updatedAt"] as const) {
      if (saved[key] !== metadata[key]) throw new StoredDataError();
    }
    // Aplicar solo la migración/defaults existentes de v1 a v2. Versiones futuras y
    // documentos sin mapas fallan aquí; leer nunca reescribe una fila corrupta.
    const scene = parseSceneDocument(JSON.parse(serializeSceneDocument(parseSceneDocument(saved.scene))));
    const warnings = [...saved.warnings];
    if (detectOutdatedSceneFields(saved.scene).length && !warnings.some((warning) => warning.code === "scene-format-outdated")) {
      warnings.push({ code: "scene-format-outdated", message: "Se actualizaron campos del formato anterior al formato de escena 2." });
    }
    return { ...saved, scene, warnings };
  } catch { throw new StoredDataError(); }
}
export function readStoredTemplate(body: string, id: unknown): MonsterTemplate {
  try {
    const saved = template.parse(JSON.parse(body));
    if (saved.id !== id || builtInMonsterTemplates.some((value) => value.id === saved.id)) throw new StoredDataError();
    return saved;
  } catch { throw new StoredDataError(); }
}
