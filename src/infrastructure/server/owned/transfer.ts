import { catalogDataSchema, catalogEntrySchema, linkEntrySchema, catalogRecords, catalogWriter, jsonLines, seedCatalog, transferVersion, verifyCatalogFile } from "./transfer-catalog";
import { resourceBindingsSchema, systemRefSchema, sameSystem, type ResourceBindings } from "../../../domain/systems/system-catalog";
import { definitionHash, historicalBindings, stable } from "./system-data";
import { readSystem } from "./system-repository";
import { DataError, dataFailure } from "./transfer-errors";
import type { TransactionOutcome } from "../identity/database";
import { createHash, randomUUID } from "node:crypto";
import { constants, chmodSync, mkdtempSync, rmSync, copyFileSync, mkdirSync, lstatSync, openSync, closeSync, readFileSync, realpathSync, readdirSync, writeFileSync, unlinkSync, createReadStream, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { validateReciprocalSceneLink, type MapSceneLinkMarker } from "../../../domain/annotations/scene-navigation-links";
import { z } from "zod";
import { OwnedError, type ResourceKind } from "../../../application/services/owned-store";
import { gameMetadataSchema, gameNameSchema, ownerIdSchema } from "../../../domain/games/game-metadata";
import { readStoredScene } from "../persisted-records";
import { validateImage } from "../image-validation";
import { resourceRecord, searchText, readRetainedTemplate } from "./records";
import { canonical, fingerprint, record } from "./repository";
import type { DatabaseConfig } from "../database/config";
import { identityDatabase } from "../identity/database";
import type { Row } from "../database/driver";
const MAX_ROWS = 100000, MAX_FILE = 1024 * 1024 * 1024, MAX_LINE = 10 * 1024 * 1024;
const kinds = ["scenes", "templates", "monsters", "npcs", "player-characters"] as const;
const legacyNames = ["service.sqlite", "monsters.sqlite", "entities.sqlite"];
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
function directory(path: string): string {
  const root = resolve(path), stat = lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(root) !== root || (stat.mode & 0o077)) throw new OwnedError("VALIDATION"); return root;
}
function file(root: string, name: string, limit = MAX_FILE): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(name) || name === "." || name === "..") throw new OwnedError("VALIDATION");
  const path = join(root, name), stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > limit) throw new OwnedError("VALIDATION"); return path;
}
function newDirectory(path: string): string { const absolute = resolve(path); mkdirSync(absolute, { mode: 0o700 }); return directory(absolute); }
/** Exclusión cooperativa del escritor legado, tres bases y todos sus sidecars. Nunca elimina locks existentes. */
export function backupLegacy(source: string, destination: string): void {
  const root = directory(source); if (resolve(destination) === root || resolve(destination).startsWith(root + "/")) throw new OwnedError("VALIDATION");
  const lockPath = join(root, "service.lock"); let fd: number;
  try { fd = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new DataError("WRITER_ACTIVE"); throw error; }
  try {
    const target = newDirectory(destination);
    for (const name of legacyNames) file(root, name);
    const files = readdirSync(root).filter(name => legacyNames.some(base => name === base || ["-wal", "-shm", "-journal"].some(suffix => name === base + suffix)));
    const inventory = files.map(name => { const path = file(root, name); copyFileSync(path, join(target, name), constants.COPYFILE_EXCL); chmodSync(join(target, name), 0o600); return { name, sha256: hash(readFileSync(path)) }; });
    writeFileSync(join(target, "backup.json"), JSON.stringify({ version: 1, files: inventory }), { mode: 0o600, flag: "wx" });
  } finally { closeSync(fd); unlinkSync(lockPath); }
}
export function restoreLegacy(backup: string, destination: string): void {
  const root = directory(backup), inventory = backupInventory(root); const target = newDirectory(destination);
  for (const entry of inventory) copyFileSync(file(root, entry.name), join(target, entry.name), constants.COPYFILE_EXCL);
}
function backupInventory(root: string): { name: string; sha256: string }[] {
  const schema = z.strictObject({ version: z.literal(1), files: z.array(z.strictObject({ name: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(3).max(12) });
  const value = schema.parse(JSON.parse(readFileSync(file(root, "backup.json", 10000), "utf8")));
  for (const entry of value.files) if (!legacyNames.some(base => entry.name === base || ["-wal", "-shm", "-journal"].some(s => entry.name === base + s)) || hash(readFileSync(file(root, entry.name))) !== entry.sha256) throw new OwnedError("CORRUPT");
  for (const name of legacyNames) if (!value.files.some(entry => entry.name === name)) throw new OwnedError("CORRUPT");
  return value.files;
}
const resourceSchema = z.strictObject({ type: z.literal("resource"), owner: ownerIdSchema.nullable(), kind: z.enum(kinds), revision: z.number().int().min(1), value: z.unknown(), bindings: resourceBindingsSchema.optional() });
const assetSchema = z.strictObject({ type: z.literal("asset"), owner: ownerIdSchema.nullable(), id: z.uuid(), mime: z.enum(["image/png", "image/jpeg", "image/webp"]), bytes: z.number().int().min(1).max(20 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/), file: z.string().regex(/^[a-f0-9]{64}\.bin$/) });
const gameSchema = z.strictObject({ type: z.literal("game"), value: gameMetadataSchema, deletedAt: z.iso.datetime().nullable() });
const itemSchema = z.discriminatedUnion("type", [resourceSchema, assetSchema, gameSchema]);
type Item = z.infer<typeof itemSchema>;
const manifestSchema = z.strictObject({ version: z.union([z.literal(1),z.literal(2),z.literal(3)]), catalog: z.array(catalogEntrySchema).optional(), links: z.array(linkEntrySchema).optional(), catalogData: catalogDataSchema.optional(), dataset: z.enum(["legacy", "owned"]), records: z.number().int().min(0).max(MAX_ROWS), counts: z.record(z.string(), z.number().int().nonnegative()), sha256: z.string().regex(/^[a-f0-9]{64}$/), owners: z.array(ownerIdSchema).max(10000) });
type Manifest = z.infer<typeof manifestSchema>;
const catalogPath = (root: string) => file(root, "catalog.jsonl", Number.MAX_SAFE_INTEGER);
async function catalogVersions(root: string, manifest: Manifest): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>(), systems = new Map<string, string>();
  for await (const entry of catalogRecords(manifest, () => catalogPath(root))) {
    if (entry.type !== "version") continue;
    const v = entry.value, key = stable({ systemId: v.systemId, version: v.version });
    if (result.has(key) || systems.has(v.systemId) && systems.get(v.systemId) !== entry.name) throw new OwnedError("CORRUPT");
    systems.set(v.systemId, entry.name); result.set(key, new Set(v.definition.presentations.map(t => t.id)));
  }
  return result;
}
function gameRow(row: Row) { const { deletedAt,systemId,systemVersion,...fields } = camel(row); return { deletedAt, value: gameMetadataSchema.parse({ ...fields, systemRef: { systemId, version: systemVersion } }) }; }
async function personalTemplates(root: string): Promise<Map<string,Map<string,unknown>>> { const result = new Map<string,Map<string,unknown>>(); for await (const item of items(root)) if (item.type === "resource" && item.kind === "templates") { const owner = item.owner ?? ""; if (!result.has(owner)) result.set(owner,new Map()); const value = resourceRecord("templates",item.value); result.get(owner)!.set(value.id,value); } return result; }
function transferredBindings(item: z.infer<typeof resourceSchema>, templates: Map<string,Map<string,unknown>>, mapped: (owner:string|null)=>string): ResourceBindings {
  const source = item.bindings ?? historicalBindings(item.value,item.kind,item.owner ?? "legacy",templates.get(item.owner ?? "") ?? new Map());
  const map = (ref: NonNullable<ResourceBindings["root"]>) => ref.scope === "private" ? { ...ref, ownerId: mapped(item.owner) } : ref;
  return { ...(source.root ? { root: map(source.root) } : {}), monsters: Object.fromEntries(Object.entries(source.monsters).map(([key,ref])=>[key,map(ref)])) };
}
function writer(target: string, dataset: Manifest["dataset"]) {
  const root = newDirectory(target), path = join(root, "records.jsonl"), fd = openSync(path, "wx", 0o600); closeSync(fd);
  const catalog = catalogWriter(root);
  const digest = createHash("sha256"), counts: Record<string, number> = {}, owners = new Set<string>(); let records = 0, size = 0;
  return {
    root, catalog,
    append(item: Item) {
      if (++records > MAX_ROWS) throw new OwnedError("VALIDATION");
      if (item.type === "resource") resourceRecord(item.kind, item.value);
      itemSchema.parse(item);
      const line = canonical(item) + "\n"; size += Buffer.byteLength(line); if (size > MAX_FILE || Buffer.byteLength(line) > MAX_LINE) throw new OwnedError("VALIDATION");
      writeFileSync(path, line, { flag: "a" }); digest.update(line);
      const kind = item.type === "resource" ? item.kind : item.type; counts[kind] = (counts[kind] ?? 0) + 1;
      const owner = item.type === "game" ? item.value.ownerId : item.owner; if (owner) owners.add(owner);
    },
    asset(owner: string | null, id: string, mime: string, bytes: Uint8Array) {
      const sha256 = hash(bytes), name = sha256 + ".bin";
      if (!existsSync(join(root, name))) writeFileSync(join(root, name), bytes, { mode: 0o600, flag: "wx" });
      this.append(assetSchema.parse({ type: "asset", owner, id, mime, bytes: bytes.length, sha256, file: name }));
    },
    finish() { const manifest: Manifest = { version: 3, catalogData: catalog.finish(), dataset, records, counts, sha256: digest.digest("hex"), owners: [...owners].sort() }; const body = canonical(manifest); if (Buffer.byteLength(body) > 1024 * 1024) throw new OwnedError("VALIDATION"); writeFileSync(join(root, "manifest.json"), body, { mode: 0o600, flag: "wx" }); return manifest; }
  };
}
function camel(row: Row): Record<string, unknown> { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value])); }
export async function exportLegacy(backup: string, target: string): Promise<Manifest> {
  const root = directory(backup), inventory = backupInventory(root); const out = writer(target, "legacy");
  // SQLite en WAL puede crear sidecars incluso con readOnly: trabajar sobre una copia privada descartable.
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-legacy-reader-")));
  const opened: DatabaseSync[] = [];
  const open = (name: string) => { const db = new DatabaseSync(file(scratch, name), { readOnly: true }); opened.push(db); return db; };
  try {
    for (const entry of inventory) copyFileSync(file(root, entry.name), join(scratch, entry.name), constants.COPYFILE_EXCL);
    const service = open("service.sqlite"), monsters = open("monsters.sqlite"), entities = open("entities.sqlite");
    for (const [db, versions] of [[service, [1]], [monsters, [1]], [entities, [2, 3]]] as const) if (!versions.includes(Number(db.prepare("PRAGMA user_version").get()!.user_version) as never)) throw new OwnedError("CORRUPT");
    const append = (kind: ResourceKind, value: unknown) => out.append({ type: "resource", owner: null, kind, value: resourceRecord(kind, value), revision: 1 });
    for (const row of service.prepare("SELECT * FROM scenes ORDER BY id").iterate()) append("scenes", readStoredScene(String(row.body), { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at }));
    for (const row of service.prepare("SELECT * FROM templates ORDER BY id").iterate()) append("templates", readRetainedTemplate(String(row.body), row.id));
    for (const row of service.prepare("SELECT * FROM assets ORDER BY id").iterate()) { if (!(row.bytes instanceof Uint8Array)) throw new OwnedError("CORRUPT"); await validateImage(Buffer.from(row.bytes), String(row.mime)); out.asset(null, String(row.id), String(row.mime), row.bytes); }
    for (const row of monsters.prepare("SELECT * FROM monster_library_entries ORDER BY id").iterate()) append("monsters", camel(row));
    for (const row of entities.prepare("SELECT * FROM npc_library_entries ORDER BY id").iterate()) append("npcs", camel(row));
    for (const row of entities.prepare("SELECT * FROM player_character_library_entries ORDER BY id").iterate()) {
      const value = camel(row), stats: Record<string, string> = {};
      for (const name of ["strength", "constitution", "dexterity", "intelligence", "wisdom", "charisma"]) { const stat = value[name]; stats[name] = stat === null ? "" : typeof stat === "number" ? stat >= 0 ? `+${stat}` : String(stat) : String(stat); delete value[name]; }
      if ("ancestryAndClasses" in value) { value.species = value.species || value.ancestryAndClasses || ""; value.classes ??= ""; delete value.ancestryAndClasses; }
      append("player-characters", { ...value, stats });
    }
    for (const system of seedCatalog()) for (const raw of system.versions) out.catalog.version(system.name, transferVersion(raw));
    out.finish();
    try { return await inspectTransfer(out.root); } catch (error) { unlinkSync(join(out.root, "manifest.json")); throw error; }
  } finally { for (const db of opened.reverse()) db.close(); rmSync(scratch, { recursive: true, force: true }); }
}
export async function exportOwned(config: DatabaseConfig, target: string): Promise<Manifest> {
  const unit = await identityDatabase(config);
  try { return await unit.transaction(async c => {
    const out = writer(target, "owned");
    for (const table of ["ttrpg_games", "owned_resources", "owned_assets"] as const) {
      let offset = 0; const batch = table === "owned_assets" ? 1 : table === "owned_resources" ? 10 : 100;
      for (;;) {
        const rows = (await c.query(`SELECT * FROM ${table} ORDER BY ${table === "ttrpg_games" ? "id" : table === "owned_resources" ? "owner_id,kind,id" : "owner_id,id"} LIMIT ${batch} OFFSET $1`, [offset])).rows;
        if (!rows.length) break;
        for (const row of rows) {
          if (table === "ttrpg_games") { const { deletedAt, value } = gameRow(row); out.append({ type: "game", value, deletedAt: deletedAt as string | null }); }
          else if (table === "owned_resources") {
            const value = record(row.kind as ResourceKind,row);
            if (row.kind === "templates") { const retained = (await c.query("SELECT hash,body FROM retained_templates WHERE owner_id=$1 AND id=$2 AND version=1",[String(row.owner_id),String(row.id)])).rows[0]; if (!retained || retained.hash !== definitionHash(value.value) || stable(JSON.parse(String(retained.body))) !== stable(value.value)) throw new OwnedError("CORRUPT"); }
            out.append({ type:"resource",owner:String(row.owner_id),kind:row.kind as ResourceKind,revision:value.revision,value:value.value,bindings:value.bindings });
          }
          else { if (!(row.bytes instanceof Uint8Array) || row.bytes.length !== row.byte_length || hash(row.bytes) !== row.sha256) throw new OwnedError("CORRUPT"); await validateImage(Buffer.from(row.bytes), String(row.mime)); out.asset(String(row.owner_id), String(row.id), String(row.mime), row.bytes); }
        }
        offset += rows.length;
      }
    }
    if (Number((await c.query("SELECT COUNT(*) AS n FROM retained_templates")).rows[0].n) !== Number((await c.query("SELECT COUNT(*) AS n FROM owned_resources WHERE kind='templates'")).rows[0].n)) throw new OwnedError("CORRUPT");
    // Una versión por lectura; cada presentación ocupa una línea acotada, no el manifiesto.
    let offset = 0;
    for (;;) {
      const row = (await c.query("SELECT v.*,s.name AS system_name FROM system_versions v JOIN system_catalog s ON s.system_id=v.system_id WHERE v.state='published' ORDER BY v.system_id,v.version LIMIT 1 OFFSET $1", [offset++])).rows[0];
      if (!row) break;
      out.catalog.version(String(row.system_name), readSystem(row));
    }
    offset = 0;
    for (;;) {
      const rows = (await c.query("SELECT * FROM game_resources ORDER BY owner_id,game_id,kind,resource_id LIMIT 100 OFFSET $1", [offset])).rows;
      if (!rows.length) break;
      for (const r of rows) out.catalog.link(linkEntrySchema.parse({ owner:r.owner_id,gameId:r.game_id,kind:r.kind,resourceId:r.resource_id }));
      offset += rows.length;
    }
    out.finish();
    try { return await inspectTransfer(out.root); } catch (error) { unlinkSync(join(out.root, "manifest.json")); throw error; }
  }); } finally { await unit.close(); }
}
async function* items(root: string): AsyncGenerator<Item> {
  const version = manifestSchema.parse(JSON.parse(readFileSync(file(root,"manifest.json",1024*1024),"utf8"))).version;
  for await (const value of jsonLines(file(root, "records.jsonl"))) {
    const raw = value as Record<string, unknown>;
    if (version === 1 && (raw.bindings !== undefined || raw.type === "game" && (raw.value as Record<string,unknown>)?.systemRef !== undefined) || version >= 2 && raw.type === "game" && (raw.value as Record<string,unknown>)?.systemRef === undefined) throw new OwnedError("CORRUPT");
    yield itemSchema.parse(raw);
  }
}

export async function inspectTransfer(bundle: string): Promise<Manifest> {
  const root = directory(bundle);
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(file(root, "manifest.json", 1024 * 1024), "utf8")));
  for (const name of readdirSync(root)) { if (!["manifest.json", "records.jsonl", ...(manifest.version === 3 ? ["catalog.jsonl"] : [])].includes(name) && !/^[a-f0-9]{64}\.bin$/.test(name)) throw new OwnedError("CORRUPT"); file(root, name, name === "catalog.jsonl" ? Number.MAX_SAFE_INTEGER : MAX_FILE); }
  if (manifest.version === 3) { if (!manifest.catalogData) throw new OwnedError("CORRUPT"); await verifyCatalogFile(catalogPath(root), manifest.catalogData); }
  // Stream the digest, not all records/blobs together.
  const digest = createHash("sha256"); for await (const chunk of createReadStream(file(root, "records.jsonl"))) digest.update(chunk as Buffer);
  if (digest.digest("hex") !== manifest.sha256) throw new OwnedError("CORRUPT");
  const versions = await catalogVersions(root, manifest), personal = await personalTemplates(root);
  const gameRefs = new Map<string,z.infer<typeof systemRefSchema>>(), bindingRows = new Map<string,ResourceBindings>();
  const seen = new Set<string>(), owners = new Set<string>(), counts: Record<string, number> = {}; let count = 0;
  const sceneLinks = new Map<string, { id: string; owner: string | null; markers: { mapId: string; marker: MapSceneLinkMarker }[] }>();
  for await (const item of items(root)) {
    if (++count > MAX_ROWS) throw new OwnedError("CORRUPT");
    const owner = item.type === "game" ? item.value.ownerId : item.owner, key = item.type === "resource" ? (item.value as { id: string }).id : item.type === "game" ? item.value.id : item.id;
    if ((manifest.dataset === "legacy" && (owner !== null || item.type === "game")) || (manifest.dataset === "owned" && owner === null)) throw new OwnedError("CORRUPT");
    if (owner) owners.add(owner);
    const kind = item.type === "resource" ? item.kind : item.type, identity = canonical([owner, kind, key]); if (seen.has(identity)) throw new OwnedError("CORRUPT"); seen.add(identity); counts[kind] = (counts[kind] ?? 0) + 1;
    if (item.type === "resource") {
      const value = resourceRecord(item.kind, item.value);
      if (item.kind === "scenes" && "scene" in value) sceneLinks.set(canonical([owner, `scene:${value.id}`]), { id: value.id, owner, markers: value.scene.maps.flatMap(map => map.mapAnnotations.sceneLinks.map(marker => ({ mapId: map.id, marker }))) });
      if (item.kind !== "templates") {
        if (manifest.version >= 2 && manifest.dataset === "owned" && !item.bindings) throw new OwnedError("CORRUPT");
        const bound = transferredBindings(item,personal,o=>o ?? "legacy");
        if (item.bindings && stable(bound) !== stable(item.bindings)) throw new OwnedError("CORRUPT");
        const expected = item.kind === "monsters" && "templateId" in value ? [["root",value.templateId] as const] : item.kind === "scenes" && "scene" in value ? value.scene.sceneAside.monsters.map(m=>[m.id,m.templateId] as const) : [];
        if ((item.kind === "monsters") !== Boolean(bound.root) || Object.keys(bound.monsters).length !== (item.kind === "scenes" ? expected.length : 0)) throw new OwnedError("CORRUPT");
        for (const [key,template] of expected) {
          const ref = key === "root" ? bound.root : bound.monsters[key]; if (!ref || (template === null ? ref.templateId !== "generic-markdown" : template !== ref.templateId)) throw new OwnedError("CORRUPT");
          if (ref.scope === "private") { const t = personal.get(owner ?? "")?.get(ref.templateId); if (ref.ownerId !== (owner ?? "legacy") || !t || definitionHash(t) !== ref.hash) throw new OwnedError("CORRUPT"); }
          else { const v = versions.get(stable({ systemId:ref.systemId,version:ref.version })); if (!v?.has(ref.templateId)) throw new OwnedError("CORRUPT"); }
        }
        bindingRows.set(stable([owner,item.kind,value.id]),bound);
      }
    } else if (item.type === "game") { if (!versions.has(stable(item.value.systemRef))) throw new OwnedError("CORRUPT"); gameRefs.set(stable([owner,item.value.id]),item.value.systemRef); } else if (item.type === "asset") {
      const bytes = readFileSync(file(root, item.file, 20 * 1024 * 1024)); if (bytes.length !== item.bytes || hash(bytes) !== item.sha256 || item.file !== item.sha256 + ".bin") throw new OwnedError("CORRUPT"); await validateImage(bytes, item.mime);
    }
  }
  const linkIds = new Set<string>();
  for await (const entry of catalogRecords(manifest, () => catalogPath(root))) {
    if (entry.type !== "link") continue; const link = entry.value;
    const key = stable(link); if (linkIds.has(key) || manifest.dataset === "legacy") throw new OwnedError("CORRUPT"); linkIds.add(key);
    const game = gameRefs.get(stable([link.owner,link.gameId])), bound = bindingRows.get(stable([link.owner,link.kind,link.resourceId])); if (!game || !bound) throw new OwnedError("CORRUPT");
    for (const ref of [...(bound.root ? [bound.root] : []),...Object.values(bound.monsters)]) if (ref.scope === "private" ? game.systemId !== "generic" || game.version !== 1 : !sameSystem(game,ref)) throw new OwnedError("CORRUPT");
  }
  for (const scene of sceneLinks.values()) for (const { marker } of scene.markers) {
    if (!marker.connection) continue;
    const peer = marker.connection.peer;
    if (peer.mapId !== undefined) {
      if (!scene.markers.some(m => m.mapId === peer.mapId && m.marker.id === peer.markerId)) throw new OwnedError("CORRUPT");
    } else {
      const destination = sceneLinks.get(canonical([scene.owner, peer.scenePath]));
      // Destinos históricos ausentes permanecen sin resolver; si ambos existen deben ser recíprocos.
      if (!destination) continue;
      const candidates = destination.markers.filter(m => m.marker.id === peer.markerId);
      if (candidates.length !== 1 || !validateReciprocalSceneLink(marker, `scene:${scene.id}`, candidates[0].marker, peer.scenePath)) throw new OwnedError("CORRUPT");
    }
  }
  if (count !== manifest.records || canonical(counts) !== canonical(manifest.counts) || canonical([...owners].sort()) !== canonical(manifest.owners)) throw new OwnedError("CORRUPT");
  return manifest;
}
export interface ImportOptions { owner?: string; gameName?: string; ownerMap?: Record<string, string>; signal?: AbortSignal; afterRow?: (count: number) => Promise<void> }
export async function importTransfer(config: DatabaseConfig, bundle: string, options: ImportOptions): Promise<{ fingerprint: string; counts: Record<string, number>; gameId?: string }> {
  const root = directory(bundle), manifest = await inspectTransfer(root), personal = await personalTemplates(root);
  if (manifest.dataset === "legacy" && (!ownerIdSchema.safeParse(options.owner).success || !gameNameSchema.safeParse(options.gameName).success || options.ownerMap)) throw new DataError("OWNER_INVALID");
  if (manifest.dataset === "owned" && (options.owner || options.gameName || options.ownerMap && (Object.keys(options.ownerMap).length !== manifest.owners.length || manifest.owners.some(owner => !options.ownerMap?.[owner])))) throw new DataError("OWNER_INVALID");
  const mapped = (owner: string | null) => owner === null ? options.owner! : options.ownerMap?.[owner] ?? owner;
  const destinations = manifest.dataset === "legacy" ? [options.owner!] : manifest.owners.map(mapped);
  if (new Set(destinations).size !== destinations.length || destinations.some(owner => !ownerIdSchema.safeParse(owner).success)) throw new DataError("OWNER_INVALID");
  const operationHash = fingerprint({ manifest, owner: options.owner ?? null, gameName: options.gameName ?? null, ownerMap: options.ownerMap ?? null });
  const unit = await identityDatabase(config);
  let outcome: TransactionOutcome | undefined;
  try { return await unit.transaction(async c => {
    const check = () => { if (options.signal?.aborted) throw new DataError("CANCELLED"); }; check();
    for (const owner of destinations) { const user = (await c.query("SELECT role,enabled FROM identity_user WHERE id=$1", [owner])).rows[0]; if (!user || user.role !== "dm" || ![true, 1].includes(user.enabled as boolean | number)) throw new DataError("OWNER_INVALID"); }
    const prior = (await c.query("SELECT result FROM owned_imports WHERE fingerprint=$1", [operationHash])).rows[0]; if (prior) return JSON.parse(String(prior.result)) as { fingerprint: string; counts: Record<string, number>; gameId?: string };
    for (const table of ["ttrpg_games", "owned_resources", "owned_assets", "game_openings", "owned_imports", "owned_operations", "retained_templates", "game_resources"]) if (Number((await c.query(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total)) throw new DataError("TARGET_OCCUPIED");
    // Solo semillas intactas preexistentes: jamás sobreescribir un catálogo del destino.
    const existing = (await c.query("SELECT * FROM system_versions ORDER BY system_id,version")).rows.map(readSystem);
    const initial = seedCatalog().flatMap(s=>s.versions).map(transferVersion);
    if (stable(existing) !== stable(initial.sort((a,b)=>a.systemId.localeCompare(b.systemId))) || Number((await c.query("SELECT COUNT(*) AS n FROM system_catalog")).rows[0].n) !== initial.length) throw new DataError("TARGET_OCCUPIED");
    for await (const entry of catalogRecords(manifest, () => catalogPath(root))) {
      check(); if (entry.type !== "version") continue;
      const v = entry.value, destination = (await c.query("SELECT name FROM system_catalog WHERE system_id=$1",[v.systemId])).rows[0];
      if (destination && destination.name !== entry.name) throw new OwnedError("CORRUPT");
      if (!destination) await c.query("INSERT INTO system_catalog(system_id,name) VALUES($1,$2)",[v.systemId,entry.name]);
      const seed = initial.find(x=>sameSystem(x,v));
      if (seed && seed.hash !== v.hash) throw new OwnedError("CORRUPT");
      if (seed) await c.query("UPDATE system_versions SET revision=$1,availability=$2,templates=$3 WHERE system_id=$4 AND version=$5",[v.revision,v.availability,stable(v.templates),v.systemId,v.version]);
      else await c.query("INSERT INTO system_versions(system_id,version,state,revision,availability,definition,hash,templates,created_at,published_at) VALUES($1,$2,'published',$3,$4,$5,$6,$7,$8,$9)",[v.systemId,v.version,v.revision,v.availability,stable(v.definition),v.hash,stable(v.templates),v.createdAt,v.publishedAt]);
    }
    const result: { fingerprint: string; counts: Record<string, number>; gameId?: string } = { fingerprint: operationHash, counts: manifest.counts };
    if (manifest.dataset === "legacy") { result.gameId = randomUUID(); const at = new Date().toISOString(); await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision) VALUES($1,$2,$3,'ready',$4,$5,1)", [result.gameId, options.owner!, gameNameSchema.parse(options.gameName), at, at]); }
    let count = 0;
    for await (const item of items(root)) {
      check();
      if (item.type === "game") { const g = item.value; await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision,deleted_at,system_id,system_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [g.id, mapped(g.ownerId), g.name, g.state, g.createdAt, g.updatedAt, g.revision, item.deletedAt,g.systemRef.systemId,g.systemRef.version]); }
      else if (item.type === "asset") { const bytes = readFileSync(file(root, item.file, 20 * 1024 * 1024)); if (hash(bytes) !== item.sha256) throw new OwnedError("CORRUPT"); await c.query("INSERT INTO owned_assets(owner_id,id,mime,bytes,sha256,byte_length) VALUES($1,$2,$3,$4,$5,$6)", [mapped(item.owner), item.id, item.mime, bytes, item.sha256, item.bytes]); }
      else { const v = resourceRecord(item.kind, item.value); await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [mapped(item.owner), item.kind, v.id, "name" in v ? v.name : v.characterName, searchText(item.kind, v), Buffer.from(v.id).toString("hex"), "createdAt" in v ? v.createdAt : v.updatedAt, v.updatedAt, item.revision, JSON.stringify(v), stable(transferredBindings(item,personal,mapped))]);
        if (item.kind === "templates") await c.query("INSERT INTO retained_templates(owner_id,id,version,hash,body) VALUES($1,$2,1,$3,$4)",[mapped(item.owner),v.id,definitionHash(v),stable(v)]);
      }
      await options.afterRow?.(++count);
    }
    for await (const entry of catalogRecords(manifest, () => catalogPath(root))) { check(); if (entry.type === "link") { const link = entry.value; await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,$3,$4)",[mapped(link.owner),link.gameId,link.kind,link.resourceId]); } }
    check();
    // Detect package modification during validation/import; rollback the entire transaction.
    const digest = createHash("sha256"); for await (const chunk of createReadStream(file(root, "records.jsonl"))) digest.update(chunk as Buffer); if (digest.digest("hex") !== manifest.sha256) throw new OwnedError("CORRUPT");
    if (manifest.version === 3) await verifyCatalogFile(catalogPath(root), manifest.catalogData!);
    check();
    await c.query("INSERT INTO owned_imports(fingerprint,result,created_at) VALUES($1,$2,$3)", [operationHash, JSON.stringify(result), new Date().toISOString()]); return result;
  }, state => { outcome = state; }); } catch (error) { throw dataFailure(error, outcome); } finally { await unit.close(); }
}
/** Verificación de solo lectura después de importar: identidades/documentos/bytes, sin trasladar credenciales. */
export async function verifyTransfer(config: DatabaseConfig, bundle: string, options: ImportOptions): Promise<void> {
  const root = directory(bundle), manifest = await inspectTransfer(root), personal = await personalTemplates(root), unit = await identityDatabase(config);
  const ownerFor = (owner: string | null) => owner === null ? options.owner : options.ownerMap?.[owner] ?? owner;
  try { await unit.transaction(async c => {
    for await (const item of items(root)) {
      if (item.type === "resource") {
        const value = resourceRecord(item.kind, item.value), row = (await c.query("SELECT body,revision,bindings FROM owned_resources WHERE owner_id=$1 AND kind=$2 AND id=$3", [ownerFor(item.owner) ?? null, item.kind, value.id])).rows[0];
        if (!row || row.revision !== item.revision || canonical(JSON.parse(String(row.body))) !== canonical(value) || stable(JSON.parse(String(row.bindings))) !== stable(transferredBindings(item,personal,o=>ownerFor(o)!))) throw new OwnedError("CORRUPT");
      } else if (item.type === "asset") {
        const row = (await c.query("SELECT mime,bytes FROM owned_assets WHERE owner_id=$1 AND id=$2", [ownerFor(item.owner) ?? null, item.id])).rows[0];
        if (!row || row.mime !== item.mime || !(row.bytes instanceof Uint8Array) || row.bytes.length !== item.bytes || hash(row.bytes) !== item.sha256) throw new OwnedError("CORRUPT");
      } else {
        const row = (await c.query("SELECT * FROM ttrpg_games WHERE owner_id=$1 AND id=$2", [ownerFor(item.value.ownerId) ?? null, item.value.id])).rows[0];
        if (!row) throw new OwnedError("CORRUPT"); const { deletedAt, value: game } = gameRow(row);
        if (deletedAt !== item.deletedAt || canonical(game) !== canonical({ ...item.value, ownerId: ownerFor(item.value.ownerId) })) throw new OwnedError("CORRUPT");
      }
    }
    let linkCount = 0;
    for await (const entry of catalogRecords(manifest, () => catalogPath(root))) {
      if (entry.type === "version") { const v = entry.value, row = (await c.query("SELECT * FROM system_versions WHERE system_id=$1 AND version=$2",[v.systemId,v.version])).rows[0]; if (!row || stable(readSystem(row)) !== stable(v)) throw new OwnedError("CORRUPT"); }
      else { const link = entry.value; linkCount++; if (!(await c.query("SELECT game_id FROM game_resources WHERE owner_id=$1 AND game_id=$2 AND kind=$3 AND resource_id=$4",[ownerFor(link.owner)!,link.gameId,link.kind,link.resourceId])).rows.length) throw new OwnedError("CORRUPT"); }
    }
    for (const [owner,templates] of personal) for (const [id,value] of templates) { const row = (await c.query("SELECT hash,body FROM retained_templates WHERE owner_id=$1 AND id=$2",[ownerFor(owner || null)!,id])).rows[0]; if (!row || row.hash !== definitionHash(value) || stable(JSON.parse(String(row.body))) !== stable(value)) throw new OwnedError("CORRUPT"); }
    if (Number((await c.query("SELECT COUNT(*) AS n FROM game_resources")).rows[0].n) !== linkCount) throw new OwnedError("CORRUPT");
    const resources = kinds.reduce((n, kind) => n + (manifest.counts[kind] ?? 0), 0);
    for (const [table, total] of [["owned_resources", resources], ["owned_assets", manifest.counts.asset ?? 0], ["ttrpg_games", manifest.dataset === "legacy" ? 1 : manifest.counts.game ?? 0]] as const) if (Number((await c.query(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total) !== total) throw new OwnedError("CORRUPT");
    if ((await c.query("SELECT id FROM game_openings")).rows.length) throw new OwnedError("CORRUPT");
  }); } finally { await unit.close(); }
}
