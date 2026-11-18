import { retainHistoricalTemplate } from "./fixtures";
import { GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { cpSync, chmodSync, readFileSync, writeFileSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cleanup, directory, fixture, accounts, open, listen, http, png, raw } from "./fixtures";
import { legacyFixture, digestDirectory, inlineVersion1, inlineVersion2, streamVersion3 } from "./transfer-fixture";
import { backupLegacy, restoreLegacy, exportLegacy, exportOwned, inspectTransfer, importTransfer, verifyTransfer } from "./transfer";
import { dataDiagnostic } from "./transfer-errors";
import { ServiceStore } from "../service-store";
import { OwnedSceneService } from "../../../server/owned-scene-service";
import { backfillArcPreparations } from "./arc-preparation-backfill";
import type { SceneResource } from "../../../shared/contracts/http-api";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });

type BundleRecord = Record<string, unknown>;

function rewriteRecords(bundle: string, transform: (records: BundleRecord[]) => BundleRecord[]): void {
  const recordPath = join(bundle, "records.jsonl"), manifestPath = join(bundle, "manifest.json");
  const records = transform(readFileSync(recordPath, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as BundleRecord));
  const body = records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  const counts = records.reduce<Record<string, number>>((total, record) => {
    const kind = record.type === "resource" ? String(record.kind) : String(record.type);
    total[kind] = (total[kind] ?? 0) + 1;
    return total;
  }, {});
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  manifest.records = records.length;
  manifest.counts = counts;
  manifest.sha256 = createHash("sha256").update(body).digest("hex");
  writeFileSync(recordPath, body);
  writeFileSync(manifestPath, JSON.stringify(manifest));
}

function rewriteCatalog(bundle: string, transform: (records: BundleRecord[]) => BundleRecord[]): void {
  const catalogPath = join(bundle, "catalog.jsonl"), manifestPath = join(bundle, "manifest.json");
  const records = transform(readFileSync(catalogPath, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as BundleRecord));
  const body = records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  manifest.catalogData = { records: records.length, bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex") };
  writeFileSync(catalogPath, body);
  writeFileSync(manifestPath, JSON.stringify(manifest));
}

for (const kind of ["sqlite", "postgres"] as const) describe(`Migración real ${kind}`, () => {
  it("respalda tres bases, adopta todo con owner explícito, verifica HTTP y restaura fuente temporal", async () => {
    const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), bundle = join(root, "bundle");
    const original = digestDirectory(old.source); backupLegacy(old.source, backup); const backupHash = digestDirectory(backup);
    const manifest = await exportLegacy(backup, bundle); expect(manifest.counts).toEqual({ scenes: 2, templates: 1, asset: 2, monsters: 1, npcs: 1, "player-characters": 1 });
    expect(await inspectTransfer(bundle)).toEqual(manifest);
    const config = await fixture(kind), { identity, a, bCookie, adminCookie, aCookie } = await accounts(config);
    await expect(importTransfer(config, bundle, {})).rejects.toBeTruthy(); await expect(importTransfer(config, bundle, { owner: "missing", gameName: "Adoptada" })).rejects.toBeTruthy();
    const first = await importTransfer(config, bundle, { owner: a.id, gameName: "Mesa adoptada Ñ" });
    expect(await importTransfer(config, bundle, { owner: a.id, gameName: "Mesa adoptada Ñ" })).toEqual(first);
    await verifyTransfer(config, bundle, { owner: a.id });
    await expect(importTransfer(config, bundle, { owner: a.id, gameName: "Otra" })).rejects.toMatchObject({ code: "TARGET_OCCUPIED" });
    const port = await listen(identity);
    expect((await http(port, `/monster-templates/${old.template.id}`, aCookie, "DELETE", {}, { "if-match": "1" })).json).toMatchObject({ error: { code: "IMMUTABLE" } });
    const privateBundle = join(root, "private-export"); await exportOwned(config, privateBundle); await inspectTransfer(privateBundle);
    for (const saved of old.scenes) {
      const response = await http(port, `/scenes/${saved.id}`, aCookie); expect(response.status).toBe(200); const resource = response.json.resource as SceneResource;
      expect(resource.scene).toEqual(saved.scene); expect(resource.missingImages.some(image => image.reference === "/ausente/imagen.png")).toBe(true);
      expect((await http(port, `/scenes/${saved.id}/export`, aCookie)).json).toEqual(saved.scene);
      expect((await http(port, `/scenes/${saved.id}`, bCookie)).status).toBe(404); expect((await http(port, `/scenes/${saved.id}`, adminCookie)).status).toBe(403);
    }
    for (const id of [old.imageId, old.orphanId]) { const image = await http(port, `/assets/${id}`, aCookie); expect(image.bytes).toEqual(png); expect(image.headers["content-type"]).toBe("image/png"); }
    expect((await http(port, `/monster-templates/${old.template.id}`, aCookie)).json.template).toMatchObject(old.template);
    for (const [collection, entry] of [["monsters", old.monster], ["npcs", old.npc], ["player-characters", old.character]] as const) expect((await http(port, `/libraries/${collection}/${entry.id}`, aCookie)).json.entry).toMatchObject(entry);
    expect(await identity.authorized(aCookie, "dm", (_, tx) => tx.openings.current(first.gameId!))).toBeNull();
    await identity.close();
    const env = { ...process.env, TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile }) };
    for (const [owner, gameName, code] of [["inexistente", "Adopción", "OWNER_INVALID"], [a.id, "Destino ocupado", "TARGET_OCCUPIED"]]) {
      const failed = await promisify(execFile)(process.execPath, ["out/api/data-cli.mjs", "import", "--bundle", bundle, "--owner", owner, "--game-name", gameName], { env }).catch(error => ({ stderr: String(error.stderr), stdout: String(error.stdout) }));
      expect(failed.stderr).toContain(`[${code}]`); expect(failed.stderr).toContain("Rollback confirmado"); expect(failed.stderr).not.toContain(bundle); expect(failed.stderr).not.toContain(aCookie); expect(failed.stdout).not.toContain("completada");
    }
    const verified = await promisify(execFile)(process.execPath, ["out/api/data-cli.mjs", "verify", "--bundle", bundle, "--owner", a.id], { env }); expect(verified.stdout).toContain("completada");
    const repeated = await promisify(execFile)(process.execPath, ["out/api/data-cli.mjs", "import", "--bundle", bundle, "--owner", a.id, "--game-name", "Mesa adoptada Ñ"], { env }); expect(repeated.stdout).toContain(first.fingerprint);
    const restarted = await open(config); expect(await restarted.authorized(aCookie, "dm", async (_, tx) => (await new OwnedSceneService(tx, Date.now).get(old.scenes[0].id)).scene)).toEqual(old.scenes[0].scene);
    expect(digestDirectory(old.source)).toEqual(original); expect(digestDirectory(backup)).toEqual(backupHash);
    const restore = join(root, "restored"); restoreLegacy(backup, restore); const restored = new ServiceStore(restore);
    try { expect(restored.getScene(old.scenes[0].id)).toEqual(old.scenes[0]); expect(restored.getAsset(old.imageId)?.bytes).toEqual(new Uint8Array(png)); expect(await restored.listUserTemplates()).toEqual([old.template]); expect(await restored.monsters.findById(old.monster.id)).toEqual(old.monster); expect(await restored.entities.findNpcById(old.npc.id)).toEqual(old.npc); expect(await restored.entities.findPlayerCharacterById(old.character.id)).toEqual(old.character); } finally { restored.close(); }
    const cli = await promisify(execFile)(process.execPath, ["out/api/data-cli.mjs", "inspect", "--bundle", bundle], { cwd: process.cwd() }); expect(cli.stdout).toContain('"scenes":2'); expect(cli.stdout).not.toContain(aCookie);
  });
  it("fallo tras await/cancelación revierten adopción completa y permiten reintento", async () => {
    const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), bundle = join(root, "bundle"); backupLegacy(old.source, backup); await exportLegacy(backup, bundle);
    const config = await fixture(kind), { identity, a, aCookie } = await accounts(config), before = digestDirectory(backup);
    const late = await importTransfer(config, bundle, { owner: a.id, gameName: "Abortada", afterRow: async count => { await Promise.resolve(); if (count === 4) throw new Error("fallo privado postgres://secreto"); } }).catch(error => error);
    expect(dataDiagnostic(late)).toContain("Rollback confirmado"); expect(dataDiagnostic(late)).not.toContain("postgres://");
    const controller = new AbortController();
    await expect(importTransfer(config, bundle, { owner: a.id, gameName: "Abortada", signal: controller.signal, afterRow: async count => { if (count === 3) controller.abort(); } })).rejects.toMatchObject({ code: "CANCELLED", outcome: "rolled_back" });
    expect(await identity.authorized(aCookie, "dm", async (p, tx) => (await tx.games.list(p.account.id)).total)).toBe(0);
    expect(await identity.authorized(aCookie, "dm", async (_, tx) => (await tx.resources.list("scenes")).total)).toBe(0);
    expect(digestDirectory(backup)).toEqual(before);
    await importTransfer(config, bundle, { owner: a.id, gameName: "Completada" }); expect(await identity.authorized(aCookie, "dm", async (_, tx) => (await tx.resources.list("scenes")).total)).toBe(2);
  });
  it("v5 conserva reservas y tombstones entre dos arcos con escenas propias", async () => {
    const root = directory(), bundle = join(root, "v5"), source = await fixture(kind), accountsSource = await accounts(source), port = await listen(accountsSource.identity);
    let tombstoneId = "", tombstoneAt = "";
    const campaign = (await http(port, "/campaigns", accountsSource.aCookie, "POST", { name: "Compartida", systemRef: GENERIC_SYSTEM, description: "", coverAssetId: null })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, accountsSource.aCookie)).json.items as Array<{ id: string }>)[0];
    const scene = (await http(port, "/scenes", accountsSource.aCookie, "POST", { name: "Escena inicial", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc.id })).json.resource as { id: string };
    const otherScene = (await http(port, "/scenes", accountsSource.aCookie, "POST", { name: "Escena posterior", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc.id })).json.resource as { id: string };
    await accountsSource.identity.close();
    await raw(source, async c => {
      const association = (await c.query("SELECT a.id AS arc_id,s.scene_id FROM campaign_arcs a JOIN arc_scenes s ON s.owner_id=a.owner_id AND s.arc_id=a.id WHERE a.owner_id=$1 AND a.campaign_id=$2 AND s.scene_id=$3 LIMIT 1", [accountsSource.a.id, campaign.id, scene.id])).rows[0];
      if (!association) throw new Error("Falta la asociación histórica.");
      const sceneId = String(association.scene_id), arcId = String(association.arc_id);
      await c.query("UPDATE campaign_arcs SET initial_game_id=$1 WHERE owner_id=$2 AND id=$3", [campaign.id, accountsSource.a.id, arcId]);
      const resource = (await c.query("SELECT body FROM owned_resources WHERE owner_id=$1 AND kind='scenes' AND id=$2", [accountsSource.a.id, sceneId])).rows[0];
      const value = JSON.parse(String(resource.body)); value.scene.sceneAside.npcs.push({ id: "npc-historico", name: "Guía histórico", imagePath: null, notes: "No duplicar", visibleToPlayer: false });
      await c.query("UPDATE owned_resources SET body=$1 WHERE owner_id=$2 AND kind='scenes' AND id=$3", [JSON.stringify(value), accountsSource.a.id, sceneId]);
      await backfillArcPreparations(c, () => randomUUID());
      const original = (await c.query("SELECT p.*,i.snapshot,i.binding AS instance_binding FROM arc_preparations p JOIN scene_preparation_instances i ON i.owner_id=p.owner_id AND i.prepared_id=p.id WHERE p.owner_id=$1 AND p.arc_id=$2 AND p.source_scene_id=$3 AND p.kind='npc' AND p.source_entity_id='npc-historico'", [accountsSource.a.id, arcId, sceneId])).rows[0];
      if (!original) throw new Error("Falta la reserva histórica.");
      tombstoneId = String(original.id);
      const secondArcId = randomUUID(), now = new Date().toISOString(), preparedId = randomUUID();
      await c.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,'Segundo arco','',NULL,1,$4,$5,NULL)", [accountsSource.a.id, secondArcId, campaign.id, now, now]);
      await c.query("UPDATE arc_scenes SET arc_id=$1 WHERE owner_id=$2 AND scene_id=$3", [secondArcId, accountsSource.a.id, otherScene.id]);
      await c.query("INSERT INTO arc_preparations(owner_id,id,arc_id,kind,name,image_path,notes,template_id,binding,source_scene_id,source_kind,source_entity_id,revision,created_at,updated_at) VALUES($1,$2,$3,'npc',$4,$5,$6,NULL,NULL,$7,'npc','npc-historico',1,$8,$9)", [accountsSource.a.id, preparedId, secondArcId, String(original.name), original.image_path === null ? null : String(original.image_path), String(original.notes), otherScene.id, now, now]);
      await c.query("INSERT INTO scene_preparation_instances(owner_id,scene_kind,scene_id,prepared_id,kind,entity_id,snapshot,binding) VALUES($1,'scenes',$2,$3,'npc','npc-historico',$4,NULL)", [accountsSource.a.id, otherScene.id, preparedId, String(original.snapshot)]);
      const newPreparedId = randomUUID(), newSnapshot = JSON.stringify({ version: 2, kind: "npc", name: "Reserva nueva", imagePath: null, notes: "Conservada" });
      await c.query("INSERT INTO arc_preparations(owner_id,id,arc_id,kind,name,image_path,notes,template_id,binding,source_scene_id,source_kind,source_entity_id,revision,created_at,updated_at) VALUES($1,$2,$3,'npc','Reserva nueva',NULL,'Conservada',NULL,NULL,NULL,NULL,NULL,1,$4,$5)", [accountsSource.a.id, newPreparedId, arcId, now, now]);
      await c.query("INSERT INTO scene_preparation_instances(owner_id,scene_kind,scene_id,prepared_id,kind,entity_id,snapshot,binding) VALUES($1,'scenes',$2,$3,'npc','reserva-nueva',$4,NULL)", [accountsSource.a.id, sceneId, newPreparedId, newSnapshot]);
      await c.query("UPDATE arc_preparations SET deleted_at=$1,revision=revision+1,updated_at=$2 WHERE owner_id=$3 AND id=$4", [now, now, accountsSource.a.id, String(original.id)]);
      tombstoneAt = now;
    });
    expect((await raw(source, c => c.query("SELECT deleted_at FROM arc_preparations WHERE owner_id=$1 AND id=$2", [accountsSource.a.id, tombstoneId]))).rows[0].deleted_at).toBe(tombstoneAt);
    const manifest = await exportOwned(source, bundle); expect(manifest.version).toBe(5); expect(manifest.counts["scene-preparation-instance"]).toBe(3);
    const exported = readFileSync(join(bundle, "records.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
    expect(exported.find(record => record.type === "prepared-entity" && record.value.id === tombstoneId)).toMatchObject({ deletedAt: tombstoneAt });
    const v4 = join(root, "v4"), v4Records = exported.map(record => {
      if (record.type === "prepared-entity") delete record.deletedAt;
      return record;
    }), v4Body = v4Records.map(record => JSON.stringify(record)).join("\n") + "\n";
    cpSync(bundle, v4, { recursive: true }); chmodSync(v4, 0o700);
    writeFileSync(join(v4, "records.jsonl"), v4Body);
    writeFileSync(join(v4, "manifest.json"), JSON.stringify({ ...manifest, version: 4, sha256: createHash("sha256").update(v4Body).digest("hex") }));
    expect((await inspectTransfer(v4)).version).toBe(4);
    const v4Destination = await fixture(kind), v4Accounts = await accounts(v4Destination), v4Options = { ownerMap: { [accountsSource.a.id]: v4Accounts.a.id } };
    await importTransfer(v4Destination, v4, v4Options); await verifyTransfer(v4Destination, v4, v4Options);
    const invalidV4 = JSON.parse(readFileSync(join(v4, "manifest.json"), "utf8")); v4Records.find(record => record.type === "prepared-entity")!.deletedAt = tombstoneAt;
    const invalidV4Body = v4Records.map(record => JSON.stringify(record)).join("\n") + "\n";
    writeFileSync(join(v4, "records.jsonl"), invalidV4Body); writeFileSync(join(v4, "manifest.json"), JSON.stringify({ ...invalidV4, sha256: createHash("sha256").update(invalidV4Body).digest("hex") }));
    await expect(inspectTransfer(v4)).rejects.toMatchObject({ code: "CORRUPT" });
    const destination = await fixture(kind), accountsDestination = await accounts(destination), options = { ownerMap: { [accountsSource.a.id]: accountsDestination.a.id } };
    await importTransfer(destination, bundle, options); await verifyTransfer(destination, bundle, options);
    await accountsDestination.identity.authorized(accountsDestination.aCookie, "dm", (_, tx) => tx.links.link(campaign.id, "scenes", scene.id));
    await accountsDestination.identity.close();
    expect(Number((await raw(destination, c => c.query("SELECT COUNT(*) AS total FROM campaign_arcs WHERE owner_id=$1 AND campaign_id=$2 AND initial_game_id=$3", [accountsDestination.a.id, campaign.id, campaign.id]))).rows[0].total)).toBe(1);
    expect((await raw(destination, c => c.query("SELECT entity_id FROM scene_preparation_instances WHERE owner_id=$1 AND kind='npc'", [accountsDestination.a.id]))).rows).toHaveLength(3);
    expect((await raw(destination, c => c.query("SELECT deleted_at FROM arc_preparations WHERE owner_id=$1 AND id=$2", [accountsDestination.a.id, tombstoneId]))).rows[0].deleted_at).toBe(tombstoneAt);
    await raw(destination, c => c.query("UPDATE arc_preparations SET deleted_at=NULL WHERE owner_id=$1 AND id=$2", [accountsDestination.a.id, tombstoneId]));
    await expect(verifyTransfer(destination, bundle, options)).rejects.toMatchObject({ code: "CORRUPT" });
  });
  it("rechaza relaciones ambiguas antes de escribir y conserva lectores válidos v1–v5", async () => {
    const root = directory(), old = await legacyFixture(), backup = join(root, "backup"), legacy = join(root, "legacy"), valid = join(root, "valid-v5");
    backupLegacy(old.source, backup); await exportLegacy(backup, legacy);
    const source = await fixture(kind), sourceAccounts = await accounts(source);
    const adopted = await importTransfer(source, legacy, { owner: sourceAccounts.a.id, gameName: "Transferencia válida" });
    const port = await listen(sourceAccounts.identity);
    const linked = (await http(port, "/scenes", sourceAccounts.aCookie, "POST", { name: "Escena contextual", scene: createDefaultScene(), campaignId: adopted.gameId })).json.resource as { id: string };
    const orphan = await sourceAccounts.identity.authorized(sourceAccounts.aCookie, "dm", (_, tx) => new OwnedSceneService(tx, Date.now).save("Huérfana legada", createDefaultScene()));
    const secondCampaign = (await http(port, "/campaigns", sourceAccounts.aCookie, "POST", { name: "Segunda campaña", systemRef: GENERIC_SYSTEM, description: "", coverAssetId: null })).json.campaign as { id: string };
    await sourceAccounts.identity.close();
    expect((await exportOwned(source, valid)).version).toBe(5);
    expect((await inspectTransfer(valid)).version).toBe(5);
    const records = readFileSync(join(valid, "records.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line) as BundleRecord);
    const association = records.find(record => record.type === "arc-scene" && record.sceneId === linked.id)!;
    const linkedSceneId = linked.id;

    const versions: Array<[number, (bundle: string) => Promise<void>]> = [
      [5, async () => undefined],
      [4, async bundle => {
        const manifest = JSON.parse(readFileSync(join(bundle, "manifest.json"), "utf8")) as Record<string, unknown>;
        manifest.version = 4;
        writeFileSync(join(bundle, "manifest.json"), JSON.stringify(manifest));
      }],
      [3, streamVersion3],
      [2, inlineVersion2],
      [1, inlineVersion1]
    ];
    for (const [version, convert] of versions) {
      const bundle = join(root, `v${version}`);
      cpSync(valid, bundle, { recursive: true }); chmodSync(bundle, 0o700);
      await convert(bundle);
      expect((await inspectTransfer(bundle)).version).toBe(version);
      const destination = await fixture(kind), destinationAccounts = await accounts(destination), options = { ownerMap: { [sourceAccounts.a.id]: destinationAccounts.a.id } };
      await importTransfer(destination, bundle, options);
      await verifyTransfer(destination, bundle, options);
      await destinationAccounts.identity.close();
    }

    const missingArc = join(root, "missing-arc");
    cpSync(valid, missingArc, { recursive: true }); chmodSync(missingArc, 0o700);
    rewriteRecords(missingArc, entries => entries.filter(record => !(record.type === "arc-scene" && record.sceneId === linkedSceneId)));
    await expect(inspectTransfer(missingArc)).rejects.toMatchObject({ code: "CORRUPT" });

    const missingLink = join(root, "missing-link");
    cpSync(valid, missingLink, { recursive: true }); chmodSync(missingLink, 0o700);
    rewriteRecords(missingLink, entries => entries.map(record => record.type === "arc-scene" && record.sceneId === linkedSceneId ? { ...record, sceneId: orphan.id } : record));
    await expect(inspectTransfer(missingLink)).rejects.toMatchObject({ code: "CORRUPT" });

    const manyParents = join(root, "many-parents");
    cpSync(valid, manyParents, { recursive: true }); chmodSync(manyParents, 0o700);
    rewriteRecords(manyParents, entries => {
      const arc = entries.find(record => record.type === "arc")!, secondArcId = randomUUID();
      entries.push({ ...arc, value: { ...(arc.value as Record<string, unknown>), id: secondArcId, initialGameId: null } }, { ...association, arcId: secondArcId });
      return entries;
    });
    await expect(inspectTransfer(manyParents)).rejects.toMatchObject({ code: "CORRUPT" });

    const ambiguousV3 = join(root, "ambiguous-v3");
    cpSync(valid, ambiguousV3, { recursive: true }); chmodSync(ambiguousV3, 0o700);
    await streamVersion3(ambiguousV3);
    rewriteCatalog(ambiguousV3, entries => [...entries, { type: "link", value: { owner: sourceAccounts.a.id, gameId: secondCampaign.id, kind: "scenes", resourceId: linkedSceneId } }]);
    await expect(inspectTransfer(ambiguousV3)).rejects.toMatchObject({ code: "CORRUPT" });

    const destination = await fixture(kind), destinationAccounts = await accounts(destination), options = { ownerMap: { [sourceAccounts.a.id]: destinationAccounts.a.id } };
    await destinationAccounts.identity.close();
    await expect(importTransfer(destination, manyParents, options)).rejects.toMatchObject({ code: "CORRUPT" });
    const gamesAfterRejectedImport = await raw(destination, c => c.query("SELECT COUNT(*) AS total FROM ttrpg_games"));
    const resourcesAfterRejectedImport = await raw(destination, c => c.query("SELECT COUNT(*) AS total FROM owned_resources"));
    expect(Number(gamesAfterRejectedImport.rows[0].total)).toBe(0);
    expect(Number(resourcesAfterRejectedImport.rows[0].total)).toBe(0);
    await importTransfer(destination, valid, options);
    await verifyTransfer(destination, valid, options);
  });
});
it("SQLite con dos propietarios migra a PostgreSQL con mapa explícito total y sin aperturas/sesiones", async () => {
  const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), legacy = join(root, "legacy"), bundle = join(root, "owned"); backupLegacy(old.source, backup); await exportLegacy(backup, legacy);
  const source = await fixture("sqlite"), src = await accounts(source); await importTransfer(source, legacy, { owner: src.a.id, gameName: "A1" });
  await src.identity.authorized(src.aCookie, "dm", async (p, tx) => { const game = await tx.games.create(p.account.id, "A2", GENERIC_SYSTEM); await tx.openings.start(game.id, 1); });
  await retainHistoricalTemplate(source,src.b.id,{...old.template,name:"Privada B"});
  const bScene = await src.identity.authorized(src.bCookie, "dm", async (p, tx) => { await tx.games.create(p.account.id, "B1", GENERIC_SYSTEM); return new OwnedSceneService(tx, Date.now).save("Escena B", old.scenes[0].scene); });
  const manifest = await exportOwned(source, bundle); expect(manifest.owners).toHaveLength(2); expect(manifest.counts.scenes).toBe(3);
  const destination = await fixture("postgres"), dst = await accounts(destination);
  await expect(importTransfer(destination, bundle, {})).rejects.toBeTruthy(); await expect(importTransfer(destination, bundle, { ownerMap: { [src.a.id]: dst.a.id } })).rejects.toBeTruthy();
  await importTransfer(destination, bundle, { ownerMap: { [src.a.id]: dst.a.id, [src.b.id]: dst.b.id } });
  await verifyTransfer(destination, bundle, { ownerMap: { [src.a.id]: dst.a.id, [src.b.id]: dst.b.id } });
  expect(await dst.identity.authorized(dst.aCookie, "dm", async (p, tx) => (await tx.games.list(p.account.id)).total)).toBe(2);
  expect(await dst.identity.authorized(dst.bCookie, "dm", async (_, tx) => (await tx.resources.list("scenes")).total)).toBe(1);
  expect(await dst.identity.authorized(dst.aCookie, "dm", (_, tx) => tx.resources.get("scenes", bScene.id))).toBeNull();
  expect(await dst.identity.authorized(dst.bCookie, "dm", (_, tx) => tx.resources.get("templates", old.template.id))).toMatchObject({value:{name:"Privada B"}});
  expect(await dst.identity.authorized(dst.aCookie,"dm",(_,tx)=>tx.resources.get("templates",old.template.id))).toMatchObject({value:{name:old.template.name}});
  expect(JSON.stringify(await dst.identity.authorized(dst.adminCookie,"admin",(_,tx)=>tx.systems.list()))).not.toContain("Privada B");
  await dst.identity.close(); expect((await raw(destination, c => c.query("SELECT id FROM game_openings"))).rows).toEqual([]);
  const users = await raw(destination, c => c.query("SELECT id FROM identity_user")); expect(users.rows.map(r => r.id)).not.toContain(src.a.id);
});
it("validación rechaza corrupción, formato futuro, blobs corruptos, symlinks y backup de escritor activo", async () => {
  const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), bundle = join(root, "bundle");
  const live = new ServiceStore(old.source); expect(() => backupLegacy(old.source, backup)).toThrow(); live.close(); backupLegacy(old.source, backup); await exportLegacy(backup, bundle);
  const manifestPath = join(bundle, "manifest.json"), original = readFileSync(manifestPath, "utf8"); writeFileSync(manifestPath, JSON.stringify({...JSON.parse(original),version:99})); await expect(inspectTransfer(bundle)).rejects.toBeTruthy(); writeFileSync(manifestPath, original);
  const lines = readFileSync(join(bundle, "records.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line) as { type: string; file?: string });
  const assetFile = join(bundle, lines.find(item => item.type === "asset")!.file!); const bytes = readFileSync(assetFile); writeFileSync(assetFile, Buffer.from("damaged")); await expect(inspectTransfer(bundle)).rejects.toBeTruthy(); writeFileSync(assetFile, bytes);
  unlinkSync(assetFile); symlinkSync(join(old.source, "service.sqlite"), assetFile); await expect(inspectTransfer(bundle)).rejects.toBeTruthy(); unlinkSync(assetFile); writeFileSync(assetFile, bytes);
  const futureSource = join(root, "future-source"); cpSync(old.source, futureSource, { recursive: true }); chmodSync(futureSource, 0o700); const db = new DatabaseSync(join(futureSource, "service.sqlite")); db.exec("PRAGMA user_version=99"); db.close(); const futureBackup = join(root, "future-backup"); backupLegacy(futureSource, futureBackup); await expect(exportLegacy(futureBackup, join(root, "future-bundle"))).rejects.toBeTruthy();
  const corrupt = join(root, "corrupt-source"); cpSync(old.source, corrupt, { recursive: true }); chmodSync(corrupt, 0o700); const bad = new DatabaseSync(join(corrupt, "service.sqlite")); bad.prepare("UPDATE scenes SET body=? WHERE id=?").run(JSON.stringify({ version: 99 }), old.scenes[0].id); bad.close(); const corruptBackup = join(root, "corrupt-backup"); backupLegacy(corrupt, corruptBackup); await expect(exportLegacy(corruptBackup, join(root, "corrupt-bundle"))).rejects.toBeTruthy();
  const recordFile = join(bundle, "records.jsonl"), validRecords = readFileSync(recordFile, "utf8");
  const records = validRecords.trim().split("\n").map(line => JSON.parse(line));
  const first = records.find(item => item.type === "resource" && item.kind === "scenes");
  first.value.scene.maps[0].mapAnnotations.sceneLinks[0].connection.peer.markerId = "extremo-inexistente";
  first.value.scene.mapAnnotations.sceneLinks[0].connection.peer.markerId = "extremo-inexistente";
  const invalidRecords = records.map(item => JSON.stringify(item)).join("\n") + "\n";
  const metadata = JSON.parse(original); metadata.sha256 = createHash("sha256").update(invalidRecords).digest("hex");
  writeFileSync(recordFile, invalidRecords); writeFileSync(manifestPath, JSON.stringify(metadata));
  await expect(inspectTransfer(bundle)).rejects.toBeTruthy();
});
