import { afterEach, describe, expect, it } from "vitest";
import { request } from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CatalogDatabase, type CatalogTransaction } from "../../../application/services/game-catalog";
import { openCatalog, migrateCatalog } from "./index";
import { readDatabaseConfig, type DatabaseConfig } from "./config";
import { createDriver, postgresPool, type SqlConnection } from "./driver";
import { applyMigrations, migrations } from "./migrations";

// Gate obligatorio: no se carga .env ni se admite fallback/skips ante falta de PostgreSQL.
if (!process.env.TTRPG_TEST_DATABASE_URL || !process.env.TTRPG_TEST_DB_CA_FILE) throw new Error("test:db requiere TTRPG_TEST_DATABASE_URL y TTRPG_TEST_DB_CA_FILE de un PostgreSQL temporal con TLS.");
const adminConfig = readDatabaseConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DEPLOYMENT: "production", TTRPG_DATABASE_URL: process.env.TTRPG_TEST_DATABASE_URL, TTRPG_DB_CA_FILE: process.env.TTRPG_TEST_DB_CA_FILE });
if (adminConfig.driver !== "postgres") throw new Error("Configuración de prueba inválida");
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function fixture(kind: "sqlite" | "postgres"): Promise<DatabaseConfig> {
  if (kind === "sqlite") {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-db-contract-")));
    cleanups.push(async () => { rmSync(directory, { recursive: true, force: true }); });
    return { driver: "sqlite", deployment: "local", dataDir: directory };
  }
  const name = `ttrpg_test_${randomUUID().replaceAll("-", "")}`;
  const admin = postgresPool(adminConfig as Extract<DatabaseConfig, { driver: "postgres" }>);
  try { await admin.query(`CREATE DATABASE "${name}"`); } finally { await admin.end(); }
  cleanups.push(async () => {
    const pool = postgresPool(adminConfig as Extract<DatabaseConfig, { driver: "postgres" }>);
    try { await pool.query(`DROP DATABASE "${name}"`); } finally { await pool.end(); }
  });
  const url = new URL((adminConfig as Extract<DatabaseConfig, { driver: "postgres" }>).url); url.pathname = `/${name}`;
  return { ...adminConfig, url: url.href } as DatabaseConfig;
}
async function raw<T>(config: DatabaseConfig, work: (c: SqlConnection) => Promise<T>): Promise<T> {
  const driver = createDriver(config);
  try { const c = await driver.acquire(); try { return await work(c); } finally { c.release(); } } finally { await driver.close(); }
}
async function ready(config: DatabaseConfig, id?: () => string): Promise<CatalogDatabase> {
  await migrateCatalog(config);
  const db = await openCatalog(config, { now: () => new Date("2026-10-29T23:00:00.000Z"), id: id ?? randomUUID });
  cleanups.push(() => db.close());
  return db;
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }

for (const kind of ["sqlite", "postgres"] as const) describe(`Contrato real ${kind}`, () => {
  it("CRUD persiste, normaliza, aísla propietarios y conserva campos inmutables", async () => {
    const config = await fixture(kind), db = await ready(config);
    const first = await db.games.create("dm-A", "  Campaña Ñ 日本語  ");
    expect(first.name).toBe("Campaña Ñ 日本語"); expect(first.state).toBe("ready");
    await db.games.create("dm-A", first.name);
    const other = await db.games.create("dm-B", "Privada");
    expect(await db.games.find("dm-A", other.id)).toBeNull();
    expect(await db.games.update("dm-A", other.id, { name: "invasión" })).toBeNull();
    expect(await db.games.delete("dm-A", other.id)).toBe(false);
    const edited = await db.games.update("dm-A", first.id, { name: "Renombrada", state: "archived" });
    expect(edited).toMatchObject({ id: first.id, ownerId: "dm-A", createdAt: first.createdAt, name: "Renombrada", state: "archived" });
    await db.games.update("dm-A", first.id, { state: "ready" });
    expect((await db.games.list("dm-A")).total).toBe(2);
    expect(await db.games.delete("dm-A", first.id)).toBe(true);
    expect(await db.games.delete("dm-A", first.id)).toBe(false);
    await db.close();
    const reopened = await openCatalog(config); cleanups.push(() => reopened.close());
    expect(await reopened.games.find("dm-B", other.id)).toEqual(other);
    expect(await reopened.games.find("dm-A", first.id)).toBeNull();
  });
  it("pagina en orden estable, devuelve total incluso al exceder offset y trata SQL como texto", async () => {
    const db = await ready(await fixture(kind));
    const games = await Promise.all([1, 2, 3].map(() => db.games.create("dm", "'; DROP TABLE ttrpg_games; --")));
    games.sort((a, b) => a.id.localeCompare(b.id));
    expect(await db.games.list("dm", { limit: 1, offset: 1 })).toEqual({ games: [games[1]], total: 3 });
    expect(await db.games.list("dm", { offset: 99 })).toEqual({ games: [], total: 3 });
    expect(await db.games.list("ajeno")).toEqual({ games: [], total: 0 });
  });
  it("rechaza inputs y cambios de propietario sin efectos", async () => {
    const db = await ready(await fixture(kind)); const game = await db.games.create("dm", "Válida");
    for (const name of ["", "  ", "a\0b", "\nok", "a".repeat(201)]) await expect(db.games.create("dm", name)).rejects.toMatchObject({ code: "VALIDATION" });
    for (const owner of ["", " dm", "dm\n", "a".repeat(129)]) await expect(db.games.create(owner, "ok")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(db.games.find("dm", "bad")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(db.games.list("dm", { limit: 101 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(db.games.list("dm", { offset: -1 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(db.games.update("dm", game.id, { name: "ok", ...{ ownerId: "otro" } })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await db.games.find("dm", game.id)).toEqual(game);
  });
  it("un UUID duplicado no sobrescribe el primer propietario", async () => {
    const id = randomUUID(), db = await ready(await fixture(kind), () => id);
    const original = await db.games.create("dm-A", "original");
    await expect(db.games.create("dm-B", "intento")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.games.find("dm-A", id)).toEqual(original);
  });
  it("commit espera await y rollback conserva solo trabajo confirmado", async () => {
    const config = await fixture(kind), db = await ready(config);
    await db.transaction(async tx => { await tx.games.create("dm", "uno"); await Promise.resolve(); await tx.games.create("dm", "dos"); });
    await expect(db.transaction(async tx => { await tx.games.create("dm", "revertida"); await Promise.resolve(); throw new Error("fallo"); })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const same = randomUUID(); let seq = 0;
    await db.close();
    const duplicate = await openCatalog(config, { now: () => new Date(), id: () => seq++ < 2 ? same : randomUUID() }); cleanups.push(() => duplicate.close());
    await expect(duplicate.transaction(async tx => { await tx.games.create("dm", "primera"); await tx.games.create("dm", "segunda"); })).rejects.toMatchObject({ code: "CONFLICT" });
    await duplicate.close();
    const again = await openCatalog(config); cleanups.push(() => again.close());
    expect((await again.games.list("dm")).games.map(g => g.name).sort()).toEqual(["dos", "uno"]);
  });
  it("una operación raíz concurrente no entra en la transacción que falla", async () => {
    const db = await ready(await fixture(kind)); const entered = deferred(), release = deferred();
    const tx = db.transaction(async scope => { await scope.games.create("dm", "revertida"); entered.resolve(); await release.promise; throw new Error("rollback"); });
    const observed = expect(tx).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await entered.promise;
    let rootDone = false;
    const outside = db.games.create("dm", "confirmada").then(g => { rootDone = true; return g; });
    await Promise.resolve(); expect(rootDone).toBe(false); release.resolve(); await observed; await outside;
    expect((await db.games.list("dm")).games.map(g => g.name)).toEqual(["confirmada"]);
  });
  it("ámbito de tx, cierre esperando trabajo, idempotencia y ausencia de fugas", async () => {
    const config = await fixture(kind), db = await ready(config); let expired!: CatalogTransaction;
    const entered = deferred(), release = deferred();
    const work = db.transaction(async tx => {
      expired = tx;
      await expect(db.transaction(async () => undefined)).rejects.toMatchObject({ code: "TRANSACTION_SCOPE" });
      await expect(db.games.list("dm")).rejects.toMatchObject({ code: "TRANSACTION_SCOPE" });
      await expect(db.close()).rejects.toMatchObject({ code: "TRANSACTION_SCOPE" });
      await tx.games.create("dm", "confirmada"); entered.resolve(); await release.promise;
    });
    await entered.promise; let closed = false; const closing = db.close().then(() => { closed = true; });
    await expect(db.games.list("dm")).rejects.toMatchObject({ code: "CLOSED" });
    expect(closed).toBe(false); release.resolve(); await work; await closing; await db.close();
    await expect(expired.games.list("dm")).rejects.toMatchObject({ code: "TRANSACTION_SCOPE" });
    const next = await openCatalog(config); cleanups.push(() => next.close()); expect((await next.games.list("dm")).total).toBe(1);
  });
  it("corrupción persistida no se convierte en ausencia ni se sobrescribe al editar", async () => {
    const config = await fixture(kind), db = await ready(config); const game = await db.games.create("dm", "ok"); await db.close();
    await raw(config, c => c.query("UPDATE ttrpg_games SET created_at=$1 WHERE id=$2", ["0000-bad", game.id]));
    const opened = await openCatalog(config); cleanups.push(() => opened.close());
    await expect(opened.games.find("dm", game.id)).rejects.toMatchObject({ code: "CORRUPT" });
    await expect(opened.games.list("dm")).rejects.toMatchObject({ code: "CORRUPT" });
    await expect(opened.games.update("dm", game.id, { name: "tapar" })).rejects.toMatchObject({ code: "CORRUPT" });
  });
  it("migración explícita e idempotente conserva datos y rechaza historial distinto", async () => {
    const config = await fixture(kind);
    await expect(openCatalog(config)).rejects.toMatchObject({ code: "MIGRATION_REQUIRED" });
    expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5]); expect(await migrateCatalog(config)).toEqual([]);
    const db = await openCatalog(config); const game = await db.games.create("dm", "preservada"); await db.close();
    await migrateCatalog(config);
    const next = await openCatalog(config); expect(await next.games.find("dm", game.id)).toEqual(game); await next.close();
    await raw(config, c => c.query("UPDATE ttrpg_control_migrations SET checksum=$1", ["diferente"]));
    await expect(migrateCatalog(config)).rejects.toMatchObject({ code: "SCHEMA_INCOMPATIBLE" });
    await expect(openCatalog(config)).rejects.toMatchObject({ code: "SCHEMA_INCOMPATIBLE" });
  });
  it("rechaza versión futura y base ajena sin modificar centinelas", async () => {
    const config = await fixture(kind); await migrateCatalog(config);
    await raw(config, c => c.query("INSERT INTO ttrpg_control_migrations(version,name,checksum) VALUES(99,'future','x')"));
    await expect(migrateCatalog(config)).rejects.toMatchObject({ code: "SCHEMA_INCOMPATIBLE" });
    const foreign = await fixture(kind);
    await raw(foreign, async c => { await c.query("CREATE TABLE centinela(value TEXT)"); await c.query("INSERT INTO centinela VALUES('intacto')"); });
    await expect(migrateCatalog(foreign)).rejects.toMatchObject({ code: "SCHEMA_INCOMPATIBLE" });
    expect(await raw(foreign, c => c.query("SELECT value FROM centinela"))).toMatchObject({ rows: [{ value: "intacto" }] });
  });
  it("un fallo DDL revierte esquema y registro y permite reintentar", async () => {
    const config = await fixture(kind); await migrateCatalog(config);
    const driver = createDriver(config);
    try { await expect(applyMigrations(driver, [...migrations, { version: 5, name: "fallo-prueba", statements: ["CREATE TABLE rollback_probe(id INTEGER)", "SQL INVALIDO"] }])).rejects.toBeDefined(); }
    finally { await driver.close(); }
    expect(await migrateCatalog(config)).toEqual([]);
    const db = await openCatalog(config); cleanups.push(() => db.close()); expect((await db.games.list("dm")).total).toBe(0);
  });
  it("dos migradores no duplican ni dejan esquema parcial", async () => {
    const config = await fixture(kind);
    const results = await Promise.allSettled([migrateCatalog(config), migrateCatalog(config)]);
    expect(results.filter(r => r.status === "fulfilled").length).toBeGreaterThan(0);
    for (const result of results) if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "UNAVAILABLE" });
    expect(await migrateCatalog(config)).toEqual([]);
    const db = await openCatalog(config); cleanups.push(() => db.close()); await db.games.create("dm", "ok");
  });
});

it("SQLite no toca bases legadas y rechaza symlinks/hardlinks", async () => {
  const config = await fixture("sqlite"); if (config.driver !== "sqlite") throw new Error();
  writeFileSync(join(config.dataDir, "service.sqlite"), "centinela"); await migrateCatalog(config);
  expect(readFileSync(join(config.dataDir, "service.sqlite"), "utf8")).toBe("centinela");
  for (const hard of [false, true]) {
    const unsafe = await fixture("sqlite"); if (unsafe.driver !== "sqlite") throw new Error();
    const target = join(unsafe.dataDir, "ajeno"); writeFileSync(target, "privado", { mode: 0o600 });
    (hard ? linkSync : symlinkSync)(target, join(unsafe.dataDir, "control.sqlite"));
    await expect(migrateCatalog(unsafe)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(readFileSync(target, "utf8")).toBe("privado"); expect(existsSync(join(unsafe.dataDir, "control.lock"))).toBe(false);
  }
});
it("TLS real exige CA y hostname; credencial inválida se sanitiza y no hace fallback", async () => {
  const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
  expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5]);
  await expect(openCatalog({ ...config, caFile: undefined })).rejects.toMatchObject({ code: "UNAVAILABLE" });
  // 127.1 resuelve a loopback, pero no figura en el SAN del certificado de prueba.
  const host = new URL(config.url); host.hostname = "127.1";
  await expect(openCatalog({ ...config, url: host.href })).rejects.toMatchObject({ code: "UNAVAILABLE" });
  const wrong = new URL(config.url); wrong.password = "wrong-test-secret";
  try { await openCatalog({ ...config, url: wrong.href }); throw new Error("La contraseña errónea funcionó"); }
  catch (error) { expect(error).toMatchObject({ code: "UNAVAILABLE" }); expect(String(error)).not.toContain("wrong-test-secret"); expect(String(error)).not.toContain("postgresql:"); }
  const reopened = await openCatalog(config); await reopened.close();
});

function commandEnv(config: DatabaseConfig): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("TTRPG_") || key.startsWith("PG") || key === "NODE_EXTRA_CA_CERTS" || key === "NODE_TLS_REJECT_UNAUTHORIZED") delete env[key];
  return { ...env, TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_TLS: config.tls, TTRPG_DB_CA_FILE: config.caFile }) };
}
const exec = promisify(execFile);
function requireBuild(): void {
  if (!existsSync(resolve("out/api/db-migrate.mjs")) || !existsSync(resolve("out/api/index.mjs"))) throw new Error("Ejecuta pnpm build:api antes de test:db (se verifican comandos compilados).");
  if (existsSync(resolve(".env"))) throw new Error("Ejecuta los contratos en un checkout sin .env privado; solo se admite configuración sintética explícita.");
}
for (const kind of ["sqlite", "postgres"] as const) it(`comando pnpm db:migrate compilado ${kind}, repetición sin pendientes`, async () => {
  requireBuild(); const config = await fixture(kind), env = commandEnv(config);
  const first = await exec("pnpm", ["db:migrate"], { env, timeout: 15000 });
  expect(first.stdout).toContain(`Catálogo ${kind}: migraciones 1, 2, 3, 4, 5 aplicadas`);
  const second = await exec("pnpm", ["db:migrate"], { env, timeout: 15000 });
  expect(second.stdout).toContain("sin migraciones pendientes");
  if (config.driver === "postgres") { expect(env.TTRPG_DATA_DIR).toBeUndefined(); expect(first.stdout + first.stderr).not.toContain(config.url); }
});
it("start:api rechaza combinaciones productivas antes de datos/socket y no filtra URL", async () => {
  requireBuild(); const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-guard-"))); cleanups.push(async () => { rmSync(root, { recursive: true, force: true }); });
  for (const deployment of ["local", "production"] as const) {
    try { await exec("pnpm", ["start:api"], { env: { ...commandEnv({ ...config, deployment }), TTRPG_DATA_DIR: join(root, "no-crear") }, timeout: 10000 }); throw new Error("Arranque inesperado"); }
    catch (error) {
      const result = error as { code?: number; stdout?: string; stderr?: string };
      expect(result.code).not.toBe(0); expect(result.stderr).toContain("Falta migrar"); expect(result.stdout).not.toContain("lista.");
      expect(result.stderr).not.toContain(config.url); expect(existsSync(join(root, "no-crear"))).toBe(false);
    }
  }
  await expect(exec("pnpm", ["start:api"], { env: { ...commandEnv({ driver: "sqlite", deployment: "local", dataDir: join(root, "no-crear") }), TTRPG_DEPLOYMENT: "production" }, timeout: 10000 })).rejects.toMatchObject({ code: 1 });
  expect(existsSync(join(root, "no-crear"))).toBe(false);
});
it("API compilada local conserva login, guardado y reapertura de escena sin migrar catálogo", async () => {
  requireBuild(); const config = await fixture("sqlite"); if (config.driver !== "sqlite") throw new Error();
  const key = randomUUID(), playerKey = randomUUID();
  const env = { ...commandEnv(config), TTRPG_HOST: "127.0.0.1", TTRPG_PORT: "0", TTRPG_PUBLIC_ORIGIN: "http://127.0.0.1:8787", TTRPG_DM_KEY: key, TTRPG_PLAYER_KEY: playerKey };
  async function start() {
    const child = spawn(process.execPath, [resolve("out/api/index.mjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
    const stopped = new Promise<number | null>(resolve => child.once("exit", resolve));
    let output = "";
    const port = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("API no arrancó")); }, 8000);
      child.stdout.on("data", chunk => { output += String(chunk); const match = /Puerto: (\d+)/.exec(output); if (match) { clearTimeout(timeout); resolve(Number(match[1])); } });
      child.once("exit", () => { clearTimeout(timeout); reject(new Error("API terminó antes de escuchar")); });
    });
    const stop = async () => { if (child.exitCode === null) child.kill("SIGTERM"); expect(await stopped).toBe(0); };
    cleanups.push(stop);
    return { port, stop };
  }
  async function call(port: number, path: string, method = "GET", body?: unknown, cookie = "") {
    return new Promise<Response>((resolve, reject) => {
      const req = request(`http://127.0.0.1:${port}/api/v1${path}`, { method, agent: false, headers: { Host: "127.0.0.1:8787", Origin: "http://127.0.0.1:8787", Cookie: cookie, "Content-Type": "application/json" } }, res => {
        const chunks: Buffer[] = [];
        res.on("data", chunk => chunks.push(chunk)); res.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers }));
        });
      }); req.on("error", reject); req.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
  const first = await start();
  expect((await call(first.port, "/health")).status).toBe(200);
  const login = await call(first.port, "/auth/login", "POST", { key }); expect(login.status).toBe(200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const saved = await call(first.port, "/scenes", "POST", { name: "Legado intacto", scene: createDefaultScene() }, cookie); expect(saved.status).toBe(201);
  const resource = (await saved.json()).resource;
  await first.stop();
  const second = await start();
  const login2 = await call(second.port, "/auth/login", "POST", { key }); const cookie2 = login2.headers.get("set-cookie")!.split(";")[0];
  const loaded = await call(second.port, `/scenes/${resource.id}`, "GET", undefined, cookie2);
  expect(loaded.status).toBe(200); expect((await loaded.json()).resource.scene).toEqual(resource.scene);
  await second.stop(); expect(existsSync(join(config.dataDir, "control.sqlite"))).toBe(false);
});

it("variables PG heredadas no cambian destino, TLS, contraseña ni search_path", async () => {
  const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
  const overrides = { PGHOST: "invalid.example", PGPORT: "1", PGDATABASE: "ajena", PGUSER: "ajeno", PGPASSWORD: decodeURIComponent(new URL(config.url).password), PGOPTIONS: "-c search_path=pg_catalog", PGSSLMODE: "no-verify", PGSSLNEGOTIATION: "direct", PGREPLICATION: "true" };
  const original = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, overrides);
    expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5]);
    await expect(openCatalog({ ...config, caFile: undefined })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const empty = new URL(config.url); empty.password = "";
    await expect(openCatalog({ ...config, url: empty.href })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const db = await openCatalog(config); await db.close();
  } finally { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

it("un cliente adquirido con idle timeout rechaza sin derribar Node, revierte y se recupera", async () => {
  const config = await fixture("postgres");
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-timeout-probe-")));
  cleanups.push(async () => { rmSync(directory, { recursive: true, force: true }); });
  // Bundle temporal de las fuentes actuales; solo este fixture lo ejecuta.
  // Resolver dependencias desde el checkout sin copiar credenciales ni instalar nada.
  symlinkSync(resolve("node_modules"), join(directory, "node_modules"));
  const buildConfig = { build: {
    ssr: resolve("src/infrastructure/server/database/test-fixtures/idle-timeout-probe.ts"),
    target: "node24", outDir: join(directory, "bundle"),
    rollupOptions: { output: { entryFileNames: "probe.mjs" } }
  } };
  const configFile = join(directory, "vite-probe.config.mjs");
  writeFileSync(configFile, `export default ${JSON.stringify(buildConfig)};`);
  await exec("pnpm", ["exec", "vite", "build", "--config", configFile, "--logLevel", "silent"], { timeout: 10000 });
  const result = await exec(process.execPath, [join(directory, "bundle/probe.mjs")], { env: commandEnv(config), timeout: 18000 });
  expect(result.stdout).toBe("TIMEOUT_RECOVERED_ROLLBACK_CLOSED\n");
  expect(result.stderr).not.toMatch(/Unhandled|idle-in-transaction|password|postgresql:\/\//i);
  // La base es exclusivamente nuestra; no se cancelan backends de otras sesiones.
  const admin = postgresPool(adminConfig as Extract<DatabaseConfig, { driver: "postgres" }>);
  try {
    const database = decodeURIComponent(new URL((config as Extract<DatabaseConfig, { driver: "postgres" }>).url).pathname.slice(1));
    await expect.poll(async () => Number((await admin.query("SELECT count(*) AS total FROM pg_stat_activity WHERE datname=$1", [database])).rows[0].total), { timeout: 2000 }).toBe(0);
  } finally { await admin.end(); }
}, 25000);
