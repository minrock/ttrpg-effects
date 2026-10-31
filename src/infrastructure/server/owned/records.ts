import { z } from "zod";
import { OwnedError, type ResourceBodies, type ResourceKind } from "../../../application/services/owned-store";
import { readStoredScene } from "../persisted-records";
import { characterSchema, monsterSchema, npcSchema, templateSchema } from "../../../shared/contracts/resource-inputs";
const dates = { id: z.uuid(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() };
const schemas = {
  monsters: monsterSchema.shape.entry.extend(dates).required(),
  npcs: npcSchema.shape.entry.extend(dates).required(),
  "player-characters": characterSchema.shape.entry.extend({ ...dates, stats: characterSchema.shape.entry.shape.stats.unwrap().required() }).required()
};
/** Retención privada: permite IDs incorporados históricos sin cambiar el editor local. */
export function readRetainedTemplate(body: string, id: unknown): ResourceBodies["templates"] {
  try { const value = templateSchema.shape.template.parse(JSON.parse(body)); if (value.id !== id) throw new Error(); return value; } catch { throw new OwnedError("CORRUPT"); }
}
export function resourceRecord<K extends ResourceKind>(kind: K, value: unknown): ResourceBodies[K] {
  try {
    if (kind === "scenes") {
      const scene = value as ResourceBodies["scenes"];
      return readStoredScene(JSON.stringify(scene), { id: scene.id, name: scene.name, createdAt: scene.createdAt, updatedAt: scene.updatedAt }) as ResourceBodies[K];
    }
    if (kind === "templates") return readRetainedTemplate(JSON.stringify(value), (value as { id: string }).id) as ResourceBodies[K];
    const result = schemas[kind as keyof typeof schemas].parse(value);
    if (result.updatedAt < result.createdAt) throw new Error();
    return result as ResourceBodies[K];
  } catch { throw new OwnedError("CORRUPT"); }
}
export function searchText(kind: ResourceKind, value: ResourceBodies[ResourceKind]): string {
  const record = value as unknown as Record<string, unknown>;
  const fields = kind === "monsters" ? ["name", "system"] : kind === "npcs" ? ["name", "notes"] : kind === "player-characters" ? ["characterName", "playerName", "species", "classes"] : ["name"];
  // NFC + Unicode default lowercase computed in JS, never dialect-dependent folding.
  return fields.map(key => String(record[key] ?? "")).join("\n").normalize("NFC").toLowerCase();
}
