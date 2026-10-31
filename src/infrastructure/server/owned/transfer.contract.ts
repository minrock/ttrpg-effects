import { retainHistoricalTemplate } from "./fixtures";
import { GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { cpSync, chmodSync, readFileSync, writeFileSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cleanup, directory, fixture, accounts, open, listen, http, png, raw } from "./fixtures";
import { legacyFixture, digestDirectory } from "./transfer-fixture";
import { backupLegacy, restoreLegacy, exportLegacy, exportOwned, inspectTransfer, importTransfer, verifyTransfer } from "./transfer";
import { dataDiagnostic } from "./transfer-errors";
import { ServiceStore } from "../service-store";
import { OwnedSceneService } from "../../../server/owned-scene-service";
import type { SceneResource } from "../../../shared/contracts/http-api";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
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
