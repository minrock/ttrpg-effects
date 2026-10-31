import { createHash } from "node:crypto";
import { createReadStream, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { z } from "zod";
import { OwnedError } from "../../../application/services/owned-store";
import { ownerIdSchema } from "../../../domain/games/game-metadata";
import { systemSeeds, type SystemVersion } from "../../../domain/systems/system-catalog";
import { definitionHash, stable } from "./system-data";
import { readSystem } from "./system-repository";

export const MAX_TRANSFER_LINE = 10 * 1024 * 1024;
export const catalogEntrySchema = z.strictObject({ systemId: z.string(), name: z.string(), versions: z.array(z.unknown()) });
export const linkEntrySchema = z.strictObject({ owner: ownerIdSchema, gameId: z.uuid(), kind: z.enum(["scenes", "monsters", "npcs", "player-characters"]), resourceId: z.uuid() });
export const catalogDataSchema = z.strictObject({ records: z.number().int().nonnegative().safe(), bytes: z.number().int().nonnegative().safe(), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
type CatalogEntry = z.infer<typeof catalogEntrySchema>;
type LinkEntry = z.infer<typeof linkEntrySchema>;
type CatalogData = z.infer<typeof catalogDataSchema>;
export interface CatalogManifest { version: 1 | 2 | 3; catalog?: CatalogEntry[]; links?: LinkEntry[]; catalogData?: CatalogData }
export type CatalogRecord = { type: "version"; name: string; value: SystemVersion } | { type: "link"; value: LinkEntry };
const headerSchema = z.strictObject({ type: z.literal("version"), name: z.string().trim().min(1).max(200), value: z.record(z.string(), z.unknown()), presentations: z.number().int().min(1).max(100) });
const presentationSchema = z.strictObject({ type: z.literal("presentation"), value: z.unknown() });
const linkSchema = z.strictObject({ type: z.literal("link"), value: linkEntrySchema });

export function seedCatalog(): CatalogEntry[] {
  return systemSeeds.map(s => ({ systemId: s.ref.systemId, name: s.name, versions: [{ ...s.ref, definition: s.definition, hash: definitionHash(s.definition), state: "published", createdAt: "2026-10-30T00:00:00.000Z", publishedAt: "2026-10-30T00:00:00.000Z", revision: 1, availability: "enabled", templates: Object.fromEntries(s.definition.presentations.map(t => [t.id, { availability: "enabled", revision: 1 }])) }] }));
}
export function transferVersion(value: unknown): SystemVersion {
  const v = value as SystemVersion;
  if (!v || typeof v !== "object" || Object.keys(v).some(k => !["systemId", "version", "definition", "hash", "state", "createdAt", "publishedAt", "revision", "availability", "templates"].includes(k))) throw new OwnedError("CORRUPT");
  const parsed = readSystem({ system_id: v.systemId, version: v.version, definition: stable(v.definition), hash: v.hash, state: v.state, created_at: v.createdAt, published_at: v.publishedAt, revision: v.revision, availability: v.availability, templates: stable(v.templates) });
  if (parsed.state !== "published") throw new OwnedError("CORRUPT"); return parsed;
}
/** Líneas acotadas; nunca carga el catálogo completo ni confunde caracteres con bytes. */
export async function* jsonLines(path: string): AsyncGenerator<unknown> {
  const stream = createReadStream(path, { highWaterMark: 65536 }), decoder = new StringDecoder("utf8"); let pending = "";
  try {
    for await (const chunk of stream) {
      pending += decoder.write(chunk as Buffer);
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        if (Buffer.byteLength(line) > MAX_TRANSFER_LINE) throw new OwnedError("CORRUPT");
        yield JSON.parse(line) as unknown;
      }
      if (Buffer.byteLength(pending) > MAX_TRANSFER_LINE) throw new OwnedError("CORRUPT");
    }
    pending += decoder.end(); if (pending) throw new OwnedError("CORRUPT");
  } finally { stream.destroy(); }
}
export function catalogWriter(root: string) {
  const path = join(root, "catalog.jsonl"), digest = createHash("sha256"); let records = 0, bytes = 0;
  writeFileSync(path, "", { flag: "wx", mode: 0o600 });
  const append = (record: unknown) => {
    const line = stable(record) + "\n", length = Buffer.byteLength(line);
    if (length > MAX_TRANSFER_LINE || !Number.isSafeInteger(bytes + length) || !Number.isSafeInteger(records + 1)) throw new OwnedError("VALIDATION");
    writeFileSync(path, line, { flag: "a" }); digest.update(line); bytes += length; records++;
  };
  return {
    version(name: string, value: SystemVersion) {
      const { presentations, ...definition } = value.definition;
      append({ type: "version", name, value: { ...value, definition }, presentations: presentations.length });
      for (const presentation of presentations) append({ type: "presentation", value: presentation });
    },
    link(value: LinkEntry) { append({ type: "link", value }); },
    finish(): CatalogData { return { records, bytes, sha256: digest.digest("hex") }; }
  };
}
export async function verifyCatalogFile(path: string, expected: CatalogData): Promise<void> {
  if (statSync(path).size !== expected.bytes) throw new OwnedError("CORRUPT");
  const digest = createHash("sha256"); let records = 0;
  for await (const chunk of createReadStream(path)) { digest.update(chunk as Buffer); for (const byte of chunk as Buffer) if (byte === 10) records++; }
  if (records !== expected.records || digest.digest("hex") !== expected.sha256) throw new OwnedError("CORRUPT");
}
/** v1/v2 quedan explícitos; v3 conserva solo un descriptor fijo en el manifiesto. */
export async function* catalogRecords(manifest: CatalogManifest, catalogPath: () => string): AsyncGenerator<CatalogRecord> {
  if (manifest.version !== 3) {
    if (manifest.catalogData !== undefined || manifest.version === 1 && (manifest.catalog !== undefined || manifest.links !== undefined) || manifest.version === 2 && (!manifest.catalog || !manifest.links)) throw new OwnedError("CORRUPT");
    const systems = new Set<string>();
    for (const system of manifest.catalog ?? seedCatalog()) {
      if (systems.has(system.systemId) || !system.name.trim() || system.name.length > 200) throw new OwnedError("CORRUPT"); systems.add(system.systemId);
      for (const raw of system.versions) { const value = transferVersion(raw); if (system.systemId !== value.systemId) throw new OwnedError("CORRUPT"); yield { type: "version", name: system.name, value }; }
    }
    for (const value of manifest.links ?? []) yield { type: "link", value };
    return;
  }
  if (!manifest.catalogData || manifest.catalog !== undefined || manifest.links !== undefined) throw new OwnedError("CORRUPT");
  const iterator = jsonLines(catalogPath())[Symbol.asyncIterator]();
  try {
    for (;;) {
      const row = await iterator.next(); if (row.done) break;
      if ((row.value as { type?: string })?.type === "link") { yield linkSchema.parse(row.value); continue; }
      const header = headerSchema.parse(row.value), definition = z.record(z.string(), z.unknown()).parse(header.value.definition);
      if ("presentations" in definition) throw new OwnedError("CORRUPT");
      const presentations: unknown[] = [];
      for (let n = 0; n < header.presentations; n++) { const next = await iterator.next(); if (next.done) throw new OwnedError("CORRUPT"); presentations.push(presentationSchema.parse(next.value).value); }
      yield { type: "version", name: header.name, value: transferVersion({ ...header.value, definition: { ...definition, presentations } }) };
    }
  } finally { await iterator.return?.(undefined); }
}
