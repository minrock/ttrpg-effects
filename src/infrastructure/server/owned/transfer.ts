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
import { arcDtoSchema, campaignIdSchema, campaignTransferRecordSchema, CAMPAIGN_HIERARCHY_TRANSFER_VERSION, OPERATIVE_TRANSFER_VERSION, supportedOperativeTransferVersions, type CampaignTransferRecord, type PreparedEntityDto, type PreparedEntitySnapshot, type ScenePreparationReservationDto } from "../../../shared/contracts/campaigns";
import { backfillCampaignHierarchy } from "./campaign-backfill";
import { backfillArcPreparations } from "./arc-preparation-backfill";
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
/** Campo de transporte v4: no amplía ArcDto ni la API pública. */
const arcTransferRecordSchema = z.strictObject({ type: z.literal("arc"), owner: ownerIdSchema, value: arcDtoSchema.extend({ initialGameId: campaignIdSchema.nullable() }) });
type ArcRecord = z.infer<typeof arcTransferRecordSchema>;
type NonArcCampaignTransferRecord = Exclude<CampaignTransferRecord, { type: "arc" }>;
const nonArcCampaignTransferRecordSchema = campaignTransferRecordSchema.refine((record): record is NonArcCampaignTransferRecord => record.type !== "arc");
type TransferRecord = Item | NonArcCampaignTransferRecord | ArcRecord;
type CampaignRecord = Extract<CampaignTransferRecord, { type: "campaign" }>;
type CoverRecord = Extract<CampaignTransferRecord, { type: "scene-cover" }>;
const transferRecordSchema = z.union([resourceSchema, assetSchema, gameSchema, nonArcCampaignTransferRecordSchema, arcTransferRecordSchema]);
const manifestSchema = z.strictObject({ version: z.union(supportedOperativeTransferVersions.map(version => z.literal(version)) as [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]), catalog: z.array(catalogEntrySchema).optional(), links: z.array(linkEntrySchema).optional(), catalogData: catalogDataSchema.optional(), dataset: z.enum(["legacy", "owned"]), records: z.number().int().min(0).max(MAX_ROWS), counts: z.record(z.string(), z.number().int().nonnegative()), sha256: z.string().regex(/^[a-f0-9]{64}$/), owners: z.array(ownerIdSchema).max(10000) });
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
function gameRow(row: Row) {
  const fields = camel(row);
  return {
    deletedAt: fields.deletedAt,
    value: gameMetadataSchema.parse({
      id: fields.id,
      ownerId: fields.ownerId,
      name: fields.name,
      state: fields.state,
      createdAt: fields.createdAt,
      updatedAt: fields.updatedAt,
      revision: fields.revision,
      systemRef: { systemId: fields.systemId, version: fields.systemVersion }
    })
  };
}
async function personalTemplates(root: string): Promise<Map<string,Map<string,unknown>>> { const result = new Map<string,Map<string,unknown>>(); for await (const item of items(root, true)) if (item.type === "resource" && item.kind === "templates") { const owner = item.owner ?? "legacy"; if (!result.has(owner)) result.set(owner,new Map()); const value = resourceRecord("templates",item.value); result.get(owner)!.set(value.id,value); } return result; }
function transferredBindings(item: z.infer<typeof resourceSchema>, templates: Map<string,Map<string,unknown>>, mapped: (owner:string|null)=>string): ResourceBindings {
  const source = item.bindings ?? historicalBindings(item.value,item.kind,item.owner ?? "legacy",templates.get(item.owner ?? "legacy") ?? new Map());
  const map = (ref: NonNullable<ResourceBindings["root"]>) => ref.scope === "private" ? { ...ref, ownerId: mapped(item.owner) } : ref;
  return { ...(source.root ? { root: map(source.root) } : {}), monsters: Object.fromEntries(Object.entries(source.monsters).map(([key,ref])=>[key,map(ref)])) };
}
function transferOwner(item: TransferRecord): string | null { return item.type === "game" ? item.value.ownerId : item.owner; }
function transferKey(item: TransferRecord): string {
  if (item.type === "resource") return (item.value as { id: string }).id;
  if (item.type === "game" || item.type === "asset") return item.type === "game" ? item.value.id : item.id;
  if (item.type === "campaign" || item.type === "arc" || item.type === "prepared-entity") return item.value.id;
  if (item.type === "arc-scene") return `${item.arcId}:${item.sceneId}`;
  if (item.type === "scene-cover") return item.sceneId;
  return `${item.value.sceneId}:${item.value.preparedId}`;
}
function transferKind(item: TransferRecord): string { return item.type === "resource" ? item.kind : item.type; }
function recordKey(owner: string | null, id: string): string { return canonical([owner, id]); }
function validateDefinition(ref: NonNullable<ResourceBindings["root"]>, owner: string, templates: Map<string, Map<string, unknown>>, versions: Map<string, Set<string>>): void {
  if (ref.scope === "private") {
    const template = templates.get(owner)?.get(ref.templateId);
    if (ref.ownerId !== owner || !template || definitionHash(template) !== ref.hash) throw new OwnedError("CORRUPT");
    return;
  }
  if (!versions.get(stable({ systemId: ref.systemId, version: ref.version }))?.has(ref.templateId)) throw new OwnedError("CORRUPT");
}
function remapDefinition(ref: NonNullable<ResourceBindings["root"]>, owner: string) { return ref.scope === "private" ? { ...ref, ownerId: owner } : ref; }
function remapPrepared(value: PreparedEntityDto, owner: string): PreparedEntityDto { return value.kind === "npc" ? value : { ...value, binding: remapDefinition(value.binding, owner) }; }
function remapSnapshot(value: PreparedEntitySnapshot, owner: string): PreparedEntitySnapshot { return value.kind === "npc" ? value : { ...value, binding: remapDefinition(value.binding, owner) }; }
function remapReservation(value: ScenePreparationReservationDto, owner: string): ScenePreparationReservationDto {
  return { ...value, snapshot: remapSnapshot(value.snapshot, owner), binding: value.binding === null ? null : remapDefinition(value.binding, owner) };
}
/**
 * Los paquetes anteriores a v4 no transportaban `arc_scenes`: al importarlos,
 * el backfill les creará un arco inicial por campaña. Por tanto, dos enlaces de
 * una misma escena a campañas distintas ya describen dos padres potenciales y
 * deben rechazarse durante la inspección, antes de abrir una transacción.
 */
function validateBackfilledSceneLinks(linkIds: Set<string>): void {
  const sceneCampaigns = new Map<string, string>();
  for (const link of linkIds) {
    const value = JSON.parse(link) as { owner: string; gameId: string; kind: string; resourceId: string };
    if (value.kind !== "scenes") continue;
    const sceneKey = recordKey(value.owner, value.resourceId);
    const campaign = sceneCampaigns.get(sceneKey);
    if (campaign !== undefined && campaign !== value.gameId) throw new OwnedError("CORRUPT");
    sceneCampaigns.set(sceneKey, value.gameId);
  }
}
function validateCampaignRecords(input: {
  gameRefs: Map<string, z.infer<typeof systemRefSchema>>;
  games: Map<string, z.infer<typeof gameSchema>>;
  scenes: Map<string, { value: ReturnType<typeof resourceRecord>; bindings: ResourceBindings }>;
  campaigns: Map<string, CampaignRecord>;
  arcs: Map<string, ArcRecord>;
  arcScenes: Map<string, Extract<CampaignTransferRecord, { type: "arc-scene" }>>;
  covers: Map<string, CoverRecord>;
  preparations: Map<string, Extract<CampaignTransferRecord, { type: "prepared-entity" }>>;
  reservations: { owner: string; value: ScenePreparationReservationDto }[];
  linkIds: Set<string>;
  assets: Set<string>;
  personal: Map<string, Map<string, unknown>>;
  versions: Map<string, Set<string>>;
}): void {
  if (input.campaigns.size !== input.games.size || input.games.size !== input.gameRefs.size) throw new OwnedError("CORRUPT");
  for (const [key, campaign] of input.campaigns) {
    const game = input.games.get(key), value = campaign.value;
    if (!game || value.id !== game.value.id || value.name !== game.value.name || value.state !== (game.value.state === "ready" ? "active" : "inactive") || !sameSystem(game.value.systemRef, value.systemRef) || value.revision !== game.value.revision || value.createdAt !== game.value.createdAt || value.updatedAt !== game.value.updatedAt || value.coverAssetId !== null && !input.assets.has(recordKey(campaign.owner, value.coverAssetId))) throw new OwnedError("CORRUPT");
  }
  for (const key of input.games.keys()) if (!input.campaigns.has(key)) throw new OwnedError("CORRUPT");
  const initialArcs = new Set<string>();
  for (const [key, arc] of input.arcs) {
    const campaign = input.campaigns.get(recordKey(arc.owner, arc.value.campaignId));
    if (!campaign || arc.value.campaignId !== campaign.value.id || key !== recordKey(arc.owner, arc.value.id) || arc.value.coverAssetId !== null && !input.assets.has(recordKey(arc.owner, arc.value.coverAssetId)) || arc.value.initialGameId !== null && arc.value.initialGameId !== arc.value.campaignId) throw new OwnedError("CORRUPT");
    if (arc.value.initialGameId !== null && (initialArcs.has(recordKey(arc.owner, arc.value.initialGameId)) || !initialArcs.add(recordKey(arc.owner, arc.value.initialGameId)))) throw new OwnedError("CORRUPT");
  }
  const sceneParents = new Map<string, string>();
  for (const [key, association] of input.arcScenes) {
    const [owner, arcId, sceneId] = JSON.parse(key) as [string, string, string];
    const arc = input.arcs.get(recordKey(owner, arcId)), scene = input.scenes.get(recordKey(owner, sceneId));
    if (!arc || association.campaignId !== arc.value.campaignId || !scene || !("scene" in scene.value) || !input.linkIds.has(stable({ owner, gameId: arc.value.campaignId, kind: "scenes", resourceId: sceneId }))) throw new OwnedError("CORRUPT");
    const sceneKey = recordKey(owner, sceneId);
    const parent = sceneParents.get(sceneKey);
    if (parent !== undefined && parent !== arcId) throw new OwnedError("CORRUPT");
    sceneParents.set(sceneKey, arcId);
  }
  const sceneCampaigns = new Map<string, string>();
  for (const link of input.linkIds) {
    const value = JSON.parse(link) as { owner: string; gameId: string; kind: string; resourceId: string };
    if (value.kind !== "scenes") continue;
    const sceneKey = recordKey(value.owner, value.resourceId);
    const campaign = sceneCampaigns.get(sceneKey);
    if (campaign !== undefined && campaign !== value.gameId) throw new OwnedError("CORRUPT");
    sceneCampaigns.set(sceneKey, value.gameId);
    const arcId = sceneParents.get(sceneKey), arc = arcId === undefined ? undefined : input.arcs.get(recordKey(value.owner, arcId));
    // Un recurso de biblioteca sin enlace ni arco puede ser legado. En cambio,
    // si el paquete declara uno de los dos extremos de la pertenencia, ambos
    // deben existir y referirse a la misma campaña.
    if (!arc || arc.value.campaignId !== value.gameId) throw new OwnedError("CORRUPT");
  }
  for (const [key, cover] of input.covers) {
    if (!input.scenes.has(key) || ![...input.arcScenes.keys()].some(value => { const [owner, , sceneId] = JSON.parse(value) as [string, string, string]; return recordKey(owner, sceneId) === key; }) || cover.customCoverAssetId !== null && !input.assets.has(recordKey(cover.owner, cover.customCoverAssetId))) throw new OwnedError("CORRUPT");
    if (cover.revision < 0) throw new OwnedError("CORRUPT");
  }
  for (const [key, record] of input.preparations) {
    const owner = JSON.parse(key)[0] as string, prepared = record.value, arc = input.arcs.get(recordKey(owner, prepared.arcId));
    if (!arc) throw new OwnedError("CORRUPT");
    if (prepared.kind === "monster") {
      validateDefinition(prepared.binding, owner, input.personal, input.versions);
      const game = input.gameRefs.get(recordKey(owner, arc.value.campaignId));
      if (!game || (prepared.binding.scope === "private" ? game.systemId !== "generic" || game.version !== 1 : !sameSystem(game, prepared.binding))) throw new OwnedError("CORRUPT");
    }
  }
  const aliases = new Map<string, { owner: string; value: ScenePreparationReservationDto; prepared: PreparedEntityDto }[]>();
  for (const reservation of input.reservations) {
    const preparedRecord = input.preparations.get(recordKey(reservation.owner, reservation.value.preparedId));
    const prepared = preparedRecord?.value;
    const scene = input.scenes.get(recordKey(reservation.owner, reservation.value.sceneId));
    if (!prepared || !scene || !("scene" in scene.value) || !input.arcScenes.has(canonical([reservation.owner, prepared.arcId, reservation.value.sceneId])) || prepared.kind !== reservation.value.snapshot.kind) throw new OwnedError("CORRUPT");
    if (reservation.value.binding !== null) validateDefinition(reservation.value.binding, reservation.owner, input.personal, input.versions);
    if (reservation.value.snapshot.kind === "monster" && reservation.value.binding === null || reservation.value.snapshot.kind === "npc" && reservation.value.binding !== null) throw new OwnedError("CORRUPT");
    // La procedencia identifica el origen de una preparación, no la única escena
    // donde puede reservarse. La colisión solo se evalúa entre reservas de la misma
    // escena, más abajo, para conservar aliases históricos sin fusionarlos.
    const aliasKey = canonical([reservation.owner, reservation.value.sceneId, reservation.value.snapshot.kind, reservation.value.entityId]);
    const group = aliases.get(aliasKey) ?? []; group.push({ ...reservation, prepared }); aliases.set(aliasKey, group);
  }
  for (const group of aliases.values()) {
    if (group.length < 2) continue;
    const first = group[0];
    const expectedProvenance = { sceneId: first.value.sceneId, kind: first.value.snapshot.kind, entityId: first.value.entityId };
    if (first.prepared.provenance === null || canonical(first.prepared.provenance) !== canonical(expectedProvenance)) throw new OwnedError("CORRUPT");
    for (const candidate of group) {
      if (candidate.prepared.provenance === null || canonical(candidate.prepared.provenance) !== canonical(expectedProvenance) || stable(candidate.value.snapshot) !== stable(first.value.snapshot) || stable(candidate.value.binding) !== stable(first.value.binding)) throw new OwnedError("CORRUPT");
    }
  }
}
function writer(target: string, dataset: Manifest["dataset"], version: Manifest["version"] = OPERATIVE_TRANSFER_VERSION) {
  const root = newDirectory(target), path = join(root, "records.jsonl"), fd = openSync(path, "wx", 0o600); closeSync(fd);
  const catalog = catalogWriter(root);
  const digest = createHash("sha256"), counts: Record<string, number> = {}, owners = new Set<string>(); let records = 0, size = 0;
  return {
    root, catalog,
    append(item: TransferRecord) {
      if (++records > MAX_ROWS) throw new OwnedError("VALIDATION");
      if (item.type === "resource") resourceRecord(item.kind, item.value);
      transferRecordSchema.parse(item);
      const line = canonical(item) + "\n"; size += Buffer.byteLength(line); if (size > MAX_FILE || Buffer.byteLength(line) > MAX_LINE) throw new OwnedError("VALIDATION");
      writeFileSync(path, line, { flag: "a" }); digest.update(line);
      const kind = transferKind(item); counts[kind] = (counts[kind] ?? 0) + 1;
      const owner = transferOwner(item); if (owner) owners.add(owner);
    },
    asset(owner: string | null, id: string, mime: string, bytes: Uint8Array) {
      const sha256 = hash(bytes), name = sha256 + ".bin";
      if (!existsSync(join(root, name))) writeFileSync(join(root, name), bytes, { mode: 0o600, flag: "wx" });
      this.append(assetSchema.parse({ type: "asset", owner, id, mime, bytes: bytes.length, sha256, file: name }));
    },
    finish() { const manifest: Manifest = { version, catalogData: catalog.finish(), dataset, records, counts, sha256: digest.digest("hex"), owners: [...owners].sort() }; const body = canonical(manifest); if (Buffer.byteLength(body) > 1024 * 1024) throw new OwnedError("VALIDATION"); writeFileSync(join(root, "manifest.json"), body, { mode: 0o600, flag: "wx" }); return manifest; }
  };
}
function camel(row: Row): Record<string, unknown> { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value])); }
export async function exportLegacy(backup: string, target: string): Promise<Manifest> {
  const root = directory(backup), inventory = backupInventory(root); const out = writer(target, "legacy", 3);
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
export async function exportOwned(config: DatabaseConfig, target: string, report?: (excludedDrafts:number)=>void): Promise<Manifest> {
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
    // Las campañas se leen de persistencia, inclusive las eliminadas lógicamente: el panel no es fuente de una transferencia.
    for (const row of (await c.query("SELECT g.*,d.description,d.cover_asset_id FROM ttrpg_games g LEFT JOIN campaign_details d ON d.owner_id=g.owner_id AND d.game_id=g.id ORDER BY g.owner_id,g.id")).rows) {
      if (row.description === null || row.description === undefined) throw new OwnedError("CORRUPT");
      const game = gameRow(row).value;
      out.append(nonArcCampaignTransferRecordSchema.parse({ type: "campaign", owner: game.ownerId, value: { id: game.id, name: game.name, description: row.description, coverAssetId: row.cover_asset_id ?? null, state: game.state === "ready" ? "active" : "inactive", systemRef: game.systemRef, revision: game.revision, createdAt: game.createdAt, updatedAt: game.updatedAt } }));
    }
    for (const row of (await c.query("SELECT * FROM campaign_arcs ORDER BY owner_id,id")).rows) out.append(arcTransferRecordSchema.parse({ type: "arc", owner: row.owner_id, value: { id: row.id, campaignId: row.campaign_id, name: row.name, description: row.description, coverAssetId: row.cover_asset_id, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, sceneCount: Number((await c.query("SELECT COUNT(*) AS total FROM arc_scenes WHERE owner_id=$1 AND arc_id=$2", [String(row.owner_id), String(row.id)])).rows[0].total), initialGameId: row.initial_game_id } }));
    for (const row of (await c.query("SELECT s.owner_id,a.campaign_id,s.arc_id,s.scene_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id ORDER BY s.owner_id,s.arc_id,s.scene_id")).rows) out.append(nonArcCampaignTransferRecordSchema.parse({ type: "arc-scene", owner: row.owner_id, campaignId: row.campaign_id, arcId: row.arc_id, sceneId: row.scene_id }));
    for (const row of (await c.query("SELECT * FROM scene_covers ORDER BY owner_id,scene_id")).rows) out.append(nonArcCampaignTransferRecordSchema.parse({ type: "scene-cover", owner: row.owner_id, sceneId: row.scene_id, customCoverAssetId: row.custom_cover_asset_id, revision: Number(row.revision) }));
    for (const row of (await c.query("SELECT * FROM arc_preparations ORDER BY owner_id,id")).rows) {
      const provenance = row.source_scene_id === null ? null : { sceneId: row.source_scene_id, kind: row.source_kind, entityId: row.source_entity_id };
      const value = row.kind === "npc"
        ? { id: row.id, arcId: row.arc_id, kind: "npc", name: row.name, imagePath: row.image_path, notes: row.notes, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, provenance }
        : { id: row.id, arcId: row.arc_id, kind: "monster", name: row.name, imagePath: row.image_path, notes: row.notes, templateId: row.template_id, binding: JSON.parse(String(row.binding)), revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, provenance };
      out.append(nonArcCampaignTransferRecordSchema.parse({ type: "prepared-entity", owner: row.owner_id, value, deletedAt: row.deleted_at }));
    }
    for (const row of (await c.query("SELECT * FROM scene_preparation_instances ORDER BY owner_id,scene_id,prepared_id")).rows) out.append(nonArcCampaignTransferRecordSchema.parse({ type: "scene-preparation-instance", owner: row.owner_id, value: { sceneId: row.scene_id, preparedId: row.prepared_id, entityId: row.entity_id, snapshot: JSON.parse(String(row.snapshot)), binding: row.binding === null ? null : JSON.parse(String(row.binding)) } }));
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
    try { const manifest=await inspectTransfer(out.root); const excludedDrafts=Number((await c.query("SELECT COUNT(*) AS n FROM owned_drafts")).rows[0].n); report?.(excludedDrafts);return manifest; } catch (error) { unlinkSync(join(out.root, "manifest.json")); throw error; }
  }); } finally { await unit.close(); }
}
function items(root: string): AsyncGenerator<Item>;
function items(root: string, includeCampaignRecords: true): AsyncGenerator<TransferRecord>;
async function* items(root: string, includeCampaignRecords = false): AsyncGenerator<TransferRecord> {
  const version = manifestSchema.parse(JSON.parse(readFileSync(file(root,"manifest.json",1024*1024),"utf8"))).version;
  for await (const value of jsonLines(file(root, "records.jsonl"))) {
    const raw = value as Record<string, unknown>;
    if (version === 1 && (raw.bindings !== undefined || raw.type === "game" && (raw.value as Record<string,unknown>)?.systemRef !== undefined) || version >= 2 && raw.type === "game" && (raw.value as Record<string,unknown>)?.systemRef === undefined) throw new OwnedError("CORRUPT");
    if (version < CAMPAIGN_HIERARCHY_TRANSFER_VERSION && ["campaign", "arc", "arc-scene", "scene-cover", "prepared-entity", "scene-preparation-instance"].includes(String(raw.type))) throw new OwnedError("CORRUPT");
    if (version >= CAMPAIGN_HIERARCHY_TRANSFER_VERSION && !includeCampaignRecords && raw.type !== "resource" && raw.type !== "asset" && raw.type !== "game") throw new DataError("UNAVAILABLE");
    if (version === 4 && raw.type === "prepared-entity" && raw.deletedAt !== undefined) throw new OwnedError("CORRUPT");
    const normalized = version === 1 && raw.type === "game"
      ? { ...raw, value: { ...(raw.value as Record<string, unknown>), systemRef: { systemId: "generic", version: 1 } } }
      : version === 4 && raw.type === "prepared-entity" ? { ...raw, deletedAt: null } : raw;
    yield (includeCampaignRecords ? transferRecordSchema : itemSchema).parse(normalized);
  }
}

export async function inspectTransfer(bundle: string): Promise<Manifest> {
  const root = directory(bundle);
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(file(root, "manifest.json", 1024 * 1024), "utf8")));
  for (const name of readdirSync(root)) { if (!["manifest.json", "records.jsonl", ...(manifest.version >= 3 ? ["catalog.jsonl"] : [])].includes(name) && !/^[a-f0-9]{64}\.bin$/.test(name)) throw new OwnedError("CORRUPT"); file(root, name, name === "catalog.jsonl" ? Number.MAX_SAFE_INTEGER : MAX_FILE); }
  if (manifest.version >= 3) { if (!manifest.catalogData) throw new OwnedError("CORRUPT"); await verifyCatalogFile(catalogPath(root), manifest.catalogData); }
  // Stream the digest, not all records/blobs together.
  const digest = createHash("sha256"); for await (const chunk of createReadStream(file(root, "records.jsonl"))) digest.update(chunk as Buffer);
  if (digest.digest("hex") !== manifest.sha256) throw new OwnedError("CORRUPT");
  const versions = await catalogVersions(root, manifest), personal = await personalTemplates(root);
  const gameRefs = new Map<string,z.infer<typeof systemRefSchema>>(), games = new Map<string,z.infer<typeof gameSchema>>(), bindingRows = new Map<string,ResourceBindings>();
  const scenes = new Map<string, { value: ReturnType<typeof resourceRecord>; bindings: ResourceBindings }>();
  const campaigns = new Map<string, CampaignRecord>();
  const arcs = new Map<string, ArcRecord>();
  const arcScenes = new Map<string, Extract<CampaignTransferRecord, { type: "arc-scene" }>>(), covers = new Map<string, CoverRecord>();
  const preparations = new Map<string, Extract<CampaignTransferRecord, { type: "prepared-entity" }>>(), reservations: { owner: string; value: ScenePreparationReservationDto }[] = [];
  const assets = new Set<string>();
  const seen = new Set<string>(), owners = new Set<string>(), counts: Record<string, number> = {}; let count = 0;
  const sceneLinks = new Map<string, { id: string; owner: string | null; markers: { mapId: string; marker: MapSceneLinkMarker }[] }>();
  for await (const item of items(root, true)) {
    if (++count > MAX_ROWS) throw new OwnedError("CORRUPT");
    const owner = transferOwner(item), key = transferKey(item);
    if ((manifest.dataset === "legacy" && (owner !== null || item.type === "game" || manifest.version >= CAMPAIGN_HIERARCHY_TRANSFER_VERSION)) || (manifest.dataset === "owned" && owner === null)) throw new OwnedError("CORRUPT");
    if (owner) owners.add(owner);
    const kind = transferKind(item), identity = canonical([owner, kind, key]); if (seen.has(identity)) throw new OwnedError("CORRUPT"); seen.add(identity); counts[kind] = (counts[kind] ?? 0) + 1;
    if (item.type === "resource") {
      const value = resourceRecord(item.kind, item.value);
      if (item.kind === "scenes" && "scene" in value) {
        sceneLinks.set(canonical([owner, `scene:${value.id}`]), { id: value.id, owner, markers: value.scene.maps.flatMap(map => map.mapAnnotations.sceneLinks.map(marker => ({ mapId: map.id, marker }))) });
      }
      if (item.kind !== "templates") {
        if (manifest.version >= 2 && manifest.dataset === "owned" && !item.bindings) throw new OwnedError("CORRUPT");
        const bound = transferredBindings(item,personal,o=>o ?? "legacy");
        if (item.bindings && stable(bound) !== stable(item.bindings)) throw new OwnedError("CORRUPT");
        const expected = item.kind === "monsters" && "templateId" in value ? [["root",value.templateId] as const] : item.kind === "scenes" && "scene" in value ? value.scene.sceneAside.monsters.map(m=>[m.id,m.templateId] as const) : [];
        if ((item.kind === "monsters") !== Boolean(bound.root) || Object.keys(bound.monsters).length !== (item.kind === "scenes" ? expected.length : 0)) throw new OwnedError("CORRUPT");
        for (const [key,template] of expected) {
          const ref = key === "root" ? bound.root : bound.monsters[key]; if (!ref || (template === null ? ref.templateId !== "generic-markdown" : template !== ref.templateId)) throw new OwnedError("CORRUPT");
          validateDefinition(ref, owner ?? "legacy", personal, versions);
        }
        bindingRows.set(stable([owner,item.kind,value.id]),bound);
        if (item.kind === "scenes") scenes.set(recordKey(owner, value.id), { value, bindings: bound });
      }
    } else if (item.type === "game") { if (!versions.has(stable(item.value.systemRef))) throw new OwnedError("CORRUPT"); gameRefs.set(stable([owner,item.value.id]),item.value.systemRef); games.set(recordKey(owner, item.value.id), item); } else if (item.type === "asset") {
      const bytes = readFileSync(file(root, item.file, 20 * 1024 * 1024)); if (bytes.length !== item.bytes || hash(bytes) !== item.sha256 || item.file !== item.sha256 + ".bin") throw new OwnedError("CORRUPT"); await validateImage(bytes, item.mime);
      assets.add(recordKey(owner, item.id));
    } else if (item.type === "campaign") {
      campaigns.set(recordKey(owner, item.value.id), item);
    } else if (item.type === "arc") {
      arcs.set(recordKey(owner, item.value.id), item);
    } else if (item.type === "arc-scene") {
      arcScenes.set(canonical([owner, item.arcId, item.sceneId]), item);
    } else if (item.type === "scene-cover") {
      covers.set(recordKey(owner, item.sceneId), item);
    } else if (item.type === "prepared-entity") {
      preparations.set(recordKey(owner, item.value.id), item);
    } else {
      reservations.push({ owner: owner!, value: item.value });
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
  if (manifest.dataset === "owned") {
    if (manifest.version >= CAMPAIGN_HIERARCHY_TRANSFER_VERSION) validateCampaignRecords({ gameRefs, games, scenes, campaigns, arcs, arcScenes, covers, preparations, reservations, linkIds, assets, personal, versions });
    else validateBackfilledSceneLinks(linkIds);
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
    for (const table of ["ttrpg_games", "owned_resources", "owned_assets", "game_openings", "owned_imports", "owned_operations", "retained_templates", "game_resources", "campaign_details", "campaign_arcs", "arc_scenes", "scene_covers", "arc_preparations", "scene_preparation_instances"]) if (Number((await c.query(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total)) throw new DataError("TARGET_OCCUPIED");
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
    for await (const item of items(root, true)) {
      check();
      if (item.type === "game") { const g = item.value; await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision,deleted_at,system_id,system_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [g.id, mapped(g.ownerId), g.name, g.state, g.createdAt, g.updatedAt, g.revision, item.deletedAt,g.systemRef.systemId,g.systemRef.version]); }
      else if (item.type === "asset") { const bytes = readFileSync(file(root, item.file, 20 * 1024 * 1024)); if (hash(bytes) !== item.sha256) throw new OwnedError("CORRUPT"); await c.query("INSERT INTO owned_assets(owner_id,id,mime,bytes,sha256,byte_length) VALUES($1,$2,$3,$4,$5,$6)", [mapped(item.owner), item.id, item.mime, bytes, item.sha256, item.bytes]); }
      else if (item.type === "resource") { const v = resourceRecord(item.kind, item.value); await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [mapped(item.owner), item.kind, v.id, "name" in v ? v.name : v.characterName, searchText(item.kind, v), Buffer.from(v.id).toString("hex"), "createdAt" in v ? v.createdAt : v.updatedAt, v.updatedAt, item.revision, JSON.stringify(v), stable(transferredBindings(item,personal,mapped))]);
        if (item.kind === "templates") await c.query("INSERT INTO retained_templates(owner_id,id,version,hash,body) VALUES($1,$2,1,$3,$4)",[mapped(item.owner),v.id,definitionHash(v),stable(v)]);
      } else continue;
      await options.afterRow?.(++count);
    }
    for await (const entry of catalogRecords(manifest, () => catalogPath(root))) { check(); if (entry.type === "link") { const link = entry.value; await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,$3,$4)",[mapped(link.owner),link.gameId,link.kind,link.resourceId]); } }
    if (manifest.version < CAMPAIGN_HIERARCHY_TRANSFER_VERSION || manifest.dataset === "legacy") {
      await backfillCampaignHierarchy(c);
      await backfillArcPreparations(c);
    } else {
      for await (const item of items(root, true)) {
        check();
        if (item.type === "campaign") await c.query("INSERT INTO campaign_details(owner_id,game_id,description,cover_asset_id) VALUES($1,$2,$3,$4)", [mapped(item.owner), item.value.id, item.value.description, item.value.coverAssetId]);
        else if (item.type === "arc") await c.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [mapped(item.owner), item.value.id, item.value.campaignId, item.value.name, item.value.description, item.value.coverAssetId, item.value.revision, item.value.createdAt, item.value.updatedAt, item.value.initialGameId]);
        else if (item.type === "arc-scene") await c.query("INSERT INTO arc_scenes(owner_id,arc_id,kind,scene_id) VALUES($1,$2,'scenes',$3)", [mapped(item.owner), item.arcId, item.sceneId]);
        else if (item.type === "scene-cover") await c.query("INSERT INTO scene_covers(owner_id,kind,scene_id,custom_cover_asset_id,revision) VALUES($1,'scenes',$2,$3,$4)", [mapped(item.owner), item.sceneId, item.customCoverAssetId, item.revision]);
        else if (item.type === "prepared-entity") {
          const value = remapPrepared(item.value, mapped(item.owner));
          await c.query("INSERT INTO arc_preparations(owner_id,id,arc_id,kind,name,image_path,notes,template_id,binding,source_scene_id,source_kind,source_entity_id,revision,created_at,updated_at,deleted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)", [mapped(item.owner), value.id, value.arcId, value.kind, value.name, value.imagePath, value.notes, value.kind === "monster" ? value.templateId : null, value.kind === "monster" ? stable(value.binding) : null, value.provenance?.sceneId ?? null, value.provenance?.kind ?? null, value.provenance?.entityId ?? null, value.revision, value.createdAt, value.updatedAt, item.deletedAt]);
        } else if (item.type === "scene-preparation-instance") {
          const value = remapReservation(item.value, mapped(item.owner));
          await c.query("INSERT INTO scene_preparation_instances(owner_id,scene_kind,scene_id,prepared_id,kind,entity_id,snapshot,binding) VALUES($1,'scenes',$2,$3,$4,$5,$6,$7)", [mapped(item.owner), value.sceneId, value.preparedId, value.snapshot.kind, value.entityId, stable(value.snapshot), value.binding === null ? null : stable(value.binding)]);
        } else continue;
        await options.afterRow?.(++count);
      }
    }
    check();
    // Detect package modification during validation/import; rollback the entire transaction.
    const digest = createHash("sha256"); for await (const chunk of createReadStream(file(root, "records.jsonl"))) digest.update(chunk as Buffer); if (digest.digest("hex") !== manifest.sha256) throw new OwnedError("CORRUPT");
    if (manifest.version >= 3) await verifyCatalogFile(catalogPath(root), manifest.catalogData!);
    check();
    await c.query("INSERT INTO owned_imports(fingerprint,result,created_at) VALUES($1,$2,$3)", [operationHash, JSON.stringify(result), new Date().toISOString()]); return result;
  }, state => { outcome = state; }); } catch (error) { throw dataFailure(error, outcome); } finally { await unit.close(); }
}
/** Verificación de solo lectura después de importar: identidades/documentos/bytes, sin trasladar credenciales. */
export async function verifyTransfer(config: DatabaseConfig, bundle: string, options: ImportOptions): Promise<void> {
  const root = directory(bundle), manifest = await inspectTransfer(root), personal = await personalTemplates(root), unit = await identityDatabase(config);
  const ownerFor = (owner: string | null) => owner === null || manifest.dataset === "legacy" && owner === "legacy" ? options.owner : options.ownerMap?.[owner] ?? owner;
  const ownerForRequired = (owner: string) => { const value = ownerFor(owner); if (!value) throw new OwnedError("CORRUPT"); return value; };
  try { await unit.transaction(async c => {
    for await (const item of items(root, true)) {
      if (item.type === "resource") {
        const value = resourceRecord(item.kind, item.value), row = (await c.query("SELECT body,revision,bindings FROM owned_resources WHERE owner_id=$1 AND kind=$2 AND id=$3", [ownerFor(item.owner) ?? null, item.kind, value.id])).rows[0];
        if (!row || row.revision !== item.revision || canonical(JSON.parse(String(row.body))) !== canonical(value) || stable(JSON.parse(String(row.bindings))) !== stable(transferredBindings(item,personal,o=>ownerFor(o)!))) throw new OwnedError("CORRUPT");
      } else if (item.type === "asset") {
        const row = (await c.query("SELECT mime,bytes FROM owned_assets WHERE owner_id=$1 AND id=$2", [ownerFor(item.owner) ?? null, item.id])).rows[0];
        if (!row || row.mime !== item.mime || !(row.bytes instanceof Uint8Array) || row.bytes.length !== item.bytes || hash(row.bytes) !== item.sha256) throw new OwnedError("CORRUPT");
      } else if (item.type === "game") {
        const row = (await c.query("SELECT * FROM ttrpg_games WHERE owner_id=$1 AND id=$2", [ownerFor(item.value.ownerId) ?? null, item.value.id])).rows[0];
        if (!row) throw new OwnedError("CORRUPT"); const { deletedAt, value: game } = gameRow(row);
        if (deletedAt !== item.deletedAt || canonical(game) !== canonical({ ...item.value, ownerId: ownerFor(item.value.ownerId) })) throw new OwnedError("CORRUPT");
      } else if (item.type === "campaign") {
        const row = (await c.query("SELECT g.*,d.description,d.cover_asset_id FROM ttrpg_games g JOIN campaign_details d ON d.owner_id=g.owner_id AND d.game_id=g.id WHERE g.owner_id=$1 AND g.id=$2", [ownerForRequired(item.owner), item.value.id])).rows[0];
        if (!row) throw new OwnedError("CORRUPT"); const game = gameRow(row).value;
        const value = { id: game.id, name: game.name, description: row.description, coverAssetId: row.cover_asset_id ?? null, state: game.state === "ready" ? "active" : "inactive", systemRef: game.systemRef, revision: game.revision, createdAt: game.createdAt, updatedAt: game.updatedAt };
        if (canonical(value) !== canonical(item.value)) throw new OwnedError("CORRUPT");
      } else if (item.type === "arc") {
        const row = (await c.query("SELECT a.*,COUNT(s.scene_id) AS scene_count FROM campaign_arcs a LEFT JOIN arc_scenes s ON s.owner_id=a.owner_id AND s.arc_id=a.id WHERE a.owner_id=$1 AND a.id=$2 GROUP BY a.owner_id,a.id,a.campaign_id,a.name,a.description,a.cover_asset_id,a.revision,a.created_at,a.updated_at,a.initial_game_id", [ownerForRequired(item.owner), item.value.id])).rows[0];
        const value = row && { id: row.id, campaignId: row.campaign_id, name: row.name, description: row.description, coverAssetId: row.cover_asset_id, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, sceneCount: Number(row.scene_count), initialGameId: row.initial_game_id };
        if (!value || canonical(value) !== canonical(item.value)) throw new OwnedError("CORRUPT");
      } else if (item.type === "arc-scene") {
        if (!(await c.query("SELECT scene_id FROM arc_scenes WHERE owner_id=$1 AND arc_id=$2 AND scene_id=$3", [ownerForRequired(item.owner), item.arcId, item.sceneId])).rows.length) throw new OwnedError("CORRUPT");
      } else if (item.type === "scene-cover") {
        const row = (await c.query("SELECT custom_cover_asset_id,revision FROM scene_covers WHERE owner_id=$1 AND kind='scenes' AND scene_id=$2", [ownerForRequired(item.owner), item.sceneId])).rows[0];
        if (!row || row.custom_cover_asset_id !== item.customCoverAssetId || Number(row.revision) !== item.revision) throw new OwnedError("CORRUPT");
      } else if (item.type === "prepared-entity") {
        const row = (await c.query("SELECT * FROM arc_preparations WHERE owner_id=$1 AND id=$2", [ownerForRequired(item.owner), item.value.id])).rows[0];
        if (!row) throw new OwnedError("CORRUPT");
        const provenance = row.source_scene_id === null ? null : { sceneId: row.source_scene_id, kind: row.source_kind, entityId: row.source_entity_id };
        const value = row.kind === "npc"
          ? { id: row.id, arcId: row.arc_id, kind: "npc", name: row.name, imagePath: row.image_path, notes: row.notes, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, provenance }
          : { id: row.id, arcId: row.arc_id, kind: "monster", name: row.name, imagePath: row.image_path, notes: row.notes, templateId: row.template_id, binding: JSON.parse(String(row.binding)), revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at, provenance };
        if (canonical(value) !== canonical(remapPrepared(item.value, ownerFor(item.owner)!)) || (row.deleted_at ?? null) !== item.deletedAt) throw new OwnedError("CORRUPT");
      } else {
        const row = (await c.query("SELECT kind,entity_id,snapshot,binding FROM scene_preparation_instances WHERE owner_id=$1 AND scene_kind='scenes' AND scene_id=$2 AND prepared_id=$3", [ownerForRequired(item.owner), item.value.sceneId, item.value.preparedId])).rows[0];
        const value = remapReservation(item.value, ownerFor(item.owner)!);
        if (!row || row.kind !== value.snapshot.kind || row.entity_id !== value.entityId || canonical(JSON.parse(String(row.snapshot))) !== canonical(value.snapshot) || canonical(row.binding === null ? null : JSON.parse(String(row.binding))) !== canonical(value.binding)) throw new OwnedError("CORRUPT");
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
    if (manifest.version >= CAMPAIGN_HIERARCHY_TRANSFER_VERSION && manifest.dataset === "owned") for (const [table, total] of [["campaign_details", manifest.counts.campaign ?? 0], ["campaign_arcs", manifest.counts.arc ?? 0], ["arc_scenes", manifest.counts["arc-scene"] ?? 0], ["scene_covers", manifest.counts["scene-cover"] ?? 0], ["arc_preparations", manifest.counts["prepared-entity"] ?? 0], ["scene_preparation_instances", manifest.counts["scene-preparation-instance"] ?? 0]] as const) if (Number((await c.query(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total) !== total) throw new OwnedError("CORRUPT");
    if ((await c.query("SELECT id FROM game_openings")).rows.length) throw new OwnedError("CORRUPT");
  }); } finally { await unit.close(); }
}
