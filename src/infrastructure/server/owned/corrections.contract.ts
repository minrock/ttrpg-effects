import { GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { accounts, cleanup, fixture, open, listen, http, directory } from "./fixtures";
import * as drivers from "../database/driver";
import { identityDatabase } from "../identity/database";
import { ownedRepositories } from "./repository";
import { ownedGames } from "../../../application/services/owned-games";
import type { OwnedTransaction } from "../../../application/services/owned-store";
import { GameRuntimeRegistry } from "../../../application/services/game-runtime";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { legacyFixture } from "./transfer-fixture";
import { backupLegacy, exportLegacy, importTransfer, inspectTransfer, exportOwned, verifyTransfer } from "./transfer";
import { dataDiagnostic, DataError } from "./transfer-errors";
import { ServiceStore } from "../service-store";
const snapshot = () => ({ scene: createDefaultScene(), camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false });
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Correcciones ronda 1 ${kind}`, () => {
  it("cierra owner en cada puerto y rechaza contextos falsos aunque el caller se equivoque", async () => {
    const { identity, a, b, aCookie, bCookie, adminCookie } = await accounts(await fixture(kind));
    const game = await identity.authorized(bCookie, "dm", (_, tx) => tx.games.create(b.id, "Privada", GENERIC_SYSTEM));
    const attacks: Array<(tx: OwnedTransaction) => Promise<unknown>> = [tx => tx.games.find(b.id, game.id), tx => tx.games.list(b.id), tx => tx.games.create(b.id, "Intrusa", GENERIC_SYSTEM), tx => tx.games.update(b.id, game.id, { name: "Intrusa" }, 1), tx => tx.games.delete(b.id, game.id, 1), tx => ownedGames(b.id, tx).find(game.id), tx => tx.openings.start(game.id, 1)];
    for (const attack of attacks) await expect(identity.authorized(aCookie, "dm", (_, tx) => attack(tx))).rejects.toMatchObject({ code: "NOT_FOUND" });
    for (const role of [undefined, "admin"] as const) {
      expect(await identity.authorized(adminCookie, role, async () => "preflight")).toBe("preflight");
      const functional: Array<(tx: OwnedTransaction, owner: string) => Promise<unknown>> = [
        (tx, owner) => tx.games.create(owner, "No DM", GENERIC_SYSTEM), (tx, owner) => tx.games.list(owner),
        tx => tx.resources.list("scenes"), tx => tx.assets.has(randomUUID()), tx => tx.openings.current(game.id),
        tx => tx.operation(randomUUID(), "admin", {}, () => tx.resources.list("scenes")),
        async tx => tx.effects.afterCommit(() => { throw new Error("No debe publicarse"); }, () => {})
      ];
      for (const action of functional) await expect(identity.authorized(adminCookie, role, (p, tx) => action(tx, p.account.id))).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(identity.authorized(adminCookie, undefined, (p, tx) => { p.account.role = "dm"; return tx.games.create(p.account.id, "DTO manipulado", GENERIC_SYSTEM); })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const session = await identity.session(aCookie);
    const opening = await identity.authorized(aCookie, "dm", async (p, tx) => {
      p.account.id = b.id; p.sessionId = "patrocinador-falso";
      const own = await tx.games.create(a.id, "Propiedad cerrada", GENERIC_SYSTEM); return tx.openings.start(own.id, 1);
    });
    expect(opening).toMatchObject({ hostAccountId: a.id, hostSessionId: session.sessionId });
    expect((await identity.listDms(adminCookie, 10, 0)).accounts).toHaveLength(2);
    const registry = new GameRuntimeRegistry(Date.now, randomUUID);
    await expect(identity.authorized(aCookie, "dm", (_, tx) => registry.context(tx, b.id, game.id))).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await identity.authorized(bCookie, "dm", (_, tx) => tx.games.list(b.id))).toMatchObject({ total: 1, games: [{ name: "Privada", revision: 1 }] });
    expect(await identity.authorized(aCookie, "dm", (_, tx) => tx.games.list(a.id))).toMatchObject({ total: 1 });
  });
  it("publicación solo tras commit; fallo tardío/revalidación conserva anterior y commit incierto limpia", async () => {
    const config = await fixture(kind), auth = await accounts(config); await auth.identity.close();
    const actual = drivers.createDriver; let fault: "none" | "commit-before" | "commit-after" | "revalidate" = "none";
    vi.spyOn(drivers, "createDriver").mockImplementation(config => {
      const driver = actual(config);
      return { ...driver, async acquire() { const connection = await driver.acquire(); return { release: connection.release, async query(sql, values) {
        if (fault === "revalidate" && sql.startsWith("select")) { fault = "none"; throw new Error("fallo privado de revalidación"); }
        if (sql === "COMMIT" && fault === "commit-before") { fault = "none"; throw new Error("commit sin enviar"); }
        const result = await connection.query(sql, values);
        if (sql === "COMMIT" && fault === "commit-after") { fault = "none"; throw new Error("respuesta de commit perdida"); }
        return result;
      } }; } };
    });
    const identity = await open(config), registry = new GameRuntimeRegistry(Date.now, randomUUID);
    const context = await identity.authorized(auth.aCookie, "dm", async (_, tx) => { const game = await tx.games.create(auth.a.id, "Mesa", GENERIC_SYSTEM); await tx.openings.start(game.id, 1); return registry.context(tx, auth.a.id, game.id); });
    await expect(identity.authorized(auth.aCookie, "dm", async (_, tx) => { await registry.publish(tx, context, snapshot()); expect(registry.state(context)).toBeNull(); await Promise.resolve(); throw new Error("tardío"); })).rejects.toBeTruthy();
    expect(registry.state(context)).toBeNull();
    const first = snapshot();
    await identity.authorized(auth.aCookie, "dm", async (_, tx) => { await registry.publish(tx, context, first); expect(registry.state(context)).toBeNull(); });
    const before = registry.state(context)!;
    for (const mode of ["callback", "revalidate", "archive", "pending-archive"] as const) {
      await expect(identity.authorized(auth.aCookie, "dm", async (_, tx) => {
        await registry.publish(tx, context, snapshot()); expect(registry.state(context)?.snapshot).toEqual(before.snapshot);
        if (mode === "callback") throw new Error("tardío");
        if (mode === "revalidate") fault = "revalidate";
        if (mode === "pending-archive") void tx.games.update(auth.a.id, context.gameId, { state: "archived" }, 1).catch(() => undefined);
        if (mode === "archive") await ownedGames(auth.a.id, tx).update(context.gameId, { state: "archived" }, 1);
      })).rejects.toBeTruthy();
      expect(registry.state(context)?.snapshot).toEqual(before.snapshot); expect(registry.state(context)?.revision).toBe(before.revision);
    }
    for (const mode of ["commit-before", "commit-after"] as const) {
      await expect(identity.authorized(auth.aCookie, "dm", async (_, tx) => { await registry.publish(tx, context, snapshot()); fault = mode; })).rejects.toBeTruthy();
      expect(registry.state(context)).toBeNull();
      await identity.authorized(auth.aCookie, "dm", (_, tx) => registry.publish(tx, context, first));
    }
    const other = await open(config), order: string[] = [];
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; }), resume = new Promise<void>(resolve => { release = resolve; });
    const publishing = identity.authorized(auth.aCookie, "dm", async (_, tx) => { await registry.publish(tx, context, null); tx.effects.afterCommit(() => { order.push("publicado"); }, () => {}); entered(); await resume; });
    await started;
    const archiving = other.authorized(auth.aCookie, "dm", async (_, tx) => { await ownedGames(auth.a.id, tx).update(context.gameId, { state: "archived" }, 1); order.push("archivado"); expect(registry.state(context)?.snapshot).toBeNull(); });
    release(); await Promise.all([publishing, archiving]);
    expect(order).toEqual(["publicado", "archivado"]);
    await expect(identity.authorized(auth.aCookie, "dm", (_, tx) => registry.publish(tx, context, snapshot()))).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(registry.state(context)?.snapshot).toBeNull(); registry.clear();
  });
  it("presupuesto tiene motivo y recuperación al vencer; el contenido distinto es otro error", async () => {
    const config = await fixture(kind), { identity, aCookie, a } = await accounts(config), p = await identity.session(aCookie), unit = await identityDatabase(config); cleanup.push(() => unit.close());
    let clock = Date.now(); const expiry = new Date(clock + 24 * 3600000).toISOString(), key = randomUUID();
    await unit.transaction(async c => { for (let i = 0; i < 1000; i++) await c.query("INSERT INTO owned_operations(owner_id,context,operation_id,fingerprint,result,expires_at,result_bytes) VALUES($1,'lleno',$2,'hash','null',$3,4)", [a.id, randomUUID(), expiry]); });
    const port = await listen(identity), response = await http(port, "/games", aCookie, "POST", { name: "Pendiente", systemRef: GENERIC_SYSTEM }, { "idempotency-key": key });
    expect(response.status).toBe(429); expect(response.json).toMatchObject({ error: { code: "OPERATION_BUDGET", retryAt: expiry, message: expect.stringContaining("no se confirmó") } });
    expect(await identity.authorized(aCookie, "dm", (_, tx) => tx.games.list(a.id))).toMatchObject({ total: 0 });
    const execute = <T>(work: (tx: OwnedTransaction) => Promise<T>) => unit.transaction((c, effects) => work(ownedRepositories(action => action(c), p, { now: () => new Date(clock), id: randomUUID }, effects)));
    clock = Date.parse(expiry);
    const result = await execute(tx => tx.operation(key, "retry", { name: "Pendiente" }, () => tx.games.create(a.id, "Pendiente", GENERIC_SYSTEM)));
    expect(await execute(tx => tx.operation(key, "retry", { name: "Pendiente" }, () => tx.games.create(a.id, "Duplicada", GENERIC_SYSTEM)))).toEqual(result);
    await expect(execute(tx => tx.operation(key, "retry", { name: "Otro" }, async () => null))).rejects.toMatchObject({ code: "OPERATION_CONTENT_CONFLICT" });
    await unit.transaction(c => c.query("UPDATE owned_operations SET result_bytes=$1 WHERE owner_id=$2", [64 * 1024 * 1024, a.id]));
    await expect(execute(tx => tx.operation(randomUUID(), "bytes", {}, async () => null))).rejects.toMatchObject({ code: "OPERATION_BUDGET", retryAt: new Date(clock + 24 * 3600000).toISOString() });
    clock += 24 * 3600000; expect(await execute(tx => tx.operation(randomUUID(), "bytes", {}, async () => "recuperada"))).toBe("recuperada");
    await expect(execute(tx => tx.operation(randomUUID(), "resultado-grande", {}, async () => { await tx.games.create(a.id, "No confirmar resultado grande", GENERIC_SYSTEM); return "x".repeat(64 * 1024 * 1024); }))).rejects.toMatchObject({ code: "RESULT_TOO_LARGE" });
    await unit.transaction(async c=>{await c.query("DELETE FROM owned_operations WHERE owner_id=$1",[a.id]);for(let i=0;i<999;i++)await c.query("INSERT INTO owned_operations(owner_id,context,operation_id,fingerprint,result,expires_at,result_bytes) VALUES($1,'casi-lleno',$2,'hash','null',$3,4)",[a.id,randomUUID(),new Date(clock+86400000).toISOString()]);});
    let arrived=0,release!:()=>void;const barrier=new Promise<void>(r=>release=r);
    await expect(execute(tx=>Promise.all([1,2].map(n=>tx.operation(randomUUID(),"parallel",n,async()=>{if(++arrived===2)release();await barrier;return tx.games.create(a.id,"No confirmar",GENERIC_SYSTEM);}))))).rejects.toMatchObject({code:"OPERATION_BUDGET"});
    expect(await unit.transaction(async c=>Number((await c.query("SELECT COUNT(*) AS total FROM owned_operations WHERE owner_id=$1",[a.id])).rows[0].total))).toBe(999);
    expect((await execute(tx=>tx.games.list(a.id))).total).toBe(1);
  });
  it("importación con respuesta de COMMIT perdida declara incertidumbre y se recupera por huella", async () => {
    const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), bundle = join(root, "bundle"); backupLegacy(old.source, backup); await exportLegacy(backup, bundle);
    const config = await fixture(kind), auth = await accounts(config); await auth.identity.close();
    const actual = drivers.createDriver; let fault: "none" | "before" | "after" = "none";
    vi.spyOn(drivers, "createDriver").mockImplementation(config => {
      const driver = actual(config);
      return { ...driver, async acquire() { const c = await driver.acquire(); return { release: c.release, async query(sql, values) {
        if (sql === "COMMIT" && fault === "before") { fault = "none"; throw new Error("fallo privado"); }
        const result = await c.query(sql, values);
        if (sql === "COMMIT" && fault === "after") { fault = "none"; throw new Error("respuesta perdida postgres://secreto"); }
        return result;
      } }; } };
    });
    const settings = { owner: auth.a.id, gameName: "Incierta" };
    for (const mode of ["before", "after"] as const) {
      const failure = await importTransfer(config, bundle, { ...settings, afterRow: async () => { fault = mode; } }).catch(error => error);
      expect(failure).toMatchObject({ code: "UNAVAILABLE", outcome: "uncertain" });
      expect(dataDiagnostic(failure)).toContain("Estado incierto"); expect(dataDiagnostic(failure)).not.toContain("Rollback confirmado"); expect(dataDiagnostic(failure)).not.toContain("secreto");
    }
    await verifyTransfer(config, bundle, { owner: auth.a.id });
    const prior = await importTransfer(config, bundle, settings); expect(await importTransfer(config, bundle, settings)).toEqual(prior);
  });
  it("plantilla referenciada preserva edición y exportación/importación, sin afectar al otro DM", async () => {
    const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), bundle = join(root, "bundle"); backupLegacy(old.source, backup); await exportLegacy(backup, bundle);
    const source = await fixture(kind), src = await accounts(source); await importTransfer(source, bundle, { owner: src.a.id, gameName: "A" });
    await expect(src.identity.authorized(src.bCookie, "dm", (_, tx) => tx.resources.put("templates", old.template, 0))).rejects.toMatchObject({ code: "IMMUTABLE" });
    await expect(src.identity.authorized(src.aCookie, "dm", (_, tx) => tx.resources.remove("templates", old.template.id, 1))).rejects.toMatchObject({ code: "IMMUTABLE" });
    await expect(src.identity.authorized(src.bCookie, "dm", (_, tx) => tx.resources.remove("templates", old.template.id, 1))).rejects.toMatchObject({ code: "IMMUTABLE" });
    await src.identity.authorized(src.aCookie, "dm", (_, tx) => tx.resources.put("monsters", { ...old.monster, name: "Editado" }, 1));
    const exported = join(root, "owned"); await exportOwned(source, exported); await inspectTransfer(exported);
    const destination = await fixture(kind), dst = await accounts(destination); await importTransfer(destination, exported, { ownerMap: { [src.a.id]: dst.a.id } }); await verifyTransfer(destination, exported, { ownerMap: { [src.a.id]: dst.a.id } });
    expect(await dst.identity.authorized(dst.aCookie, "dm", (_, tx) => tx.resources.get("monsters", old.monster.id))).toMatchObject({ value: { name: "Editado", templateId: old.template.id }, revision: 2 });
  });
});
it("CLI compilada distingue sintaxis/ruta/lock/corrupción y no anuncia válido un legado con plantilla ausente", async () => {
  const root = directory(), old = await legacyFixture(), bundle = join(root, "bundle");
  const invoke = async (...args: string[]) => promisify(execFile)(process.execPath, ["out/api/data-cli.mjs", ...args]).then(result => ({ ...result, code: 0 }), error => ({ stdout: String(error.stdout), stderr: String(error.stderr), code: Number(error.code) }));
  let result = await invoke("invalido"); expect(result.code).toBe(1); expect(result.stderr).toContain("[USAGE]"); expect(result.stderr).toContain("Uso:");
  result = await invoke("inspect", "--bundle", join(root, "ruta-privada-inexistente")); expect(result.stderr).toContain("[PATH_MISSING]"); expect(result.stderr).not.toContain(root);
  const live = new ServiceStore(old.source);
  try { result = await invoke("backup-legacy", "--source", old.source, "--target", join(root, "backup")); expect(result.stderr).toContain("[WRITER_ACTIVE]"); await live.deleteUserTemplate(old.template.id); } finally { live.close(); }
  const backup = join(root, "backup"); backupLegacy(old.source, backup);
  result = await invoke("export-legacy", "--source", backup, "--target", bundle); expect(result.code).toBe(1); expect(result.stderr).toContain("[TEMPLATE_MISSING]"); expect(result.stdout).not.toContain("completada"); expect(existsSync(join(bundle, "manifest.json"))).toBe(false);
  writeFileSync(join(bundle, "manifest.json"), '{"private":"postgres://usuario:secreto@host"}');
  result = await invoke("inspect", "--bundle", bundle); expect(result.stderr).toContain("[CORRUPT]"); expect(result.stderr).not.toContain("secreto");
  expect(dataDiagnostic(new DataError("CANCELLED", "rolled_back"))).toContain("Rollback confirmado");
  const uncertain = dataDiagnostic(new DataError("UNAVAILABLE", "uncertain")); expect(uncertain).toContain("Estado incierto"); expect(uncertain).not.toContain("Rollback confirmado"); expect(uncertain).toContain("mismo paquete");
});
it("CLI PostgreSQL recibe SIGINT mientras espera exclusión, confirma rollback y libera conexiones", async () => {
  const old = await legacyFixture(), root = directory(), backup = join(root, "backup"), bundle = join(root, "bundle"); backupLegacy(old.source, backup); await exportLegacy(backup, bundle);
  const config = await fixture("postgres"), auth = await accounts(config); if (config.driver !== "postgres") throw new Error("Motor incorrecto");
  const unit = await identityDatabase(config); cleanup.push(() => unit.close());
  const env = { ...process.env, TTRPG_DB_DRIVER: "postgres", TTRPG_DEPLOYMENT: config.deployment, TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile };
  let finished!: Promise<{ stdout: string; stderr: string; code: number | string | undefined }>;
  await unit.transaction(async c => {
    let complete!: (result: { stdout: string; stderr: string; code: number | string | undefined }) => void;
    finished = new Promise(resolve => { complete = resolve; });
    const child = execFile(process.execPath, ["out/api/data-cli.mjs", "import", "--bundle", bundle, "--owner", auth.a.id, "--game-name", "Cancelada"], { env }, (error, stdout, stderr) => complete({ stdout, stderr, code: error?.code ?? 0 }));
    try {
      const until = Date.now() + 4500; let waiting = false;
      while (Date.now() < until) {
        waiting = (await c.query("SELECT pid FROM pg_locks WHERE locktype='advisory' AND objid=783496102 AND NOT granted")).rows.length > 0;
        if (waiting) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true); child.kill("SIGINT"); await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) { child.kill("SIGKILL"); throw error; }
  });
  const result = await finished;
  expect(result.code).toBe(130); expect(result.stderr).toContain("[CANCELLED]"); expect(result.stderr).toContain("Rollback confirmado"); expect(result.stdout).not.toContain("completada"); expect(result.stderr).not.toContain(bundle);
  expect(await auth.identity.authorized(auth.aCookie, "dm", (_, tx) => tx.games.list(auth.a.id))).toMatchObject({ total: 0 });
});
