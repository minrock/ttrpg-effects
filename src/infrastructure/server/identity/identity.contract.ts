import { GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { promisify } from "node:util";
import { spawn, execFile } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer, request, type Server } from "node:http";
import { readDatabaseConfig, type DatabaseConfig } from "../database/config";
import { createDriver, postgresPool, type SqlConnection } from "../database/driver";
import { applyMigrations, migrations } from "../database/migrations";
import { migrateCatalog } from "../database";
import { openIdentity } from "./index";
import { passwordCodec } from "./password";
import type { IdentityService } from "../../../application/services/identity";
import { createIdentityHttp } from "../../../server/identity-http";
import { createApi } from "../../../server/http";
import { runIdentityCommand } from "../../../server/identity-commands";

if (!process.env.TTRPG_TEST_DATABASE_URL || !process.env.TTRPG_TEST_DB_CA_FILE) throw new Error("test:identity requiere PostgreSQL temporal real y TLS: TTRPG_TEST_DATABASE_URL y TTRPG_TEST_DB_CA_FILE.");
const admin = readDatabaseConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DEPLOYMENT: "production", TTRPG_DATABASE_URL: process.env.TTRPG_TEST_DATABASE_URL, TTRPG_DB_CA_FILE: process.env.TTRPG_TEST_DB_CA_FILE });
if (admin.driver !== "postgres") throw new Error("Motor incorrecto");
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
const origin = "http://localhost:8787", secret = randomBytes(32).toString("base64url");
const initial = "frase inicial privada 123", changed = "frase distinta privada 456", dmPassword = "contraseña temporal DM 789";
const adminInput = { email: "admin@example.test", name: "Administración Ñ", password: initial };
function token(cookie: string) { return cookie.split(";")[0]; }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }
async function fixture(kind: "sqlite" | "postgres", migrate = true) {
  let config: DatabaseConfig;
  if (kind === "sqlite") {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-identity-")));
    cleanup.push(async () => { rmSync(directory, { recursive: true, force: true }); }); config = { driver: kind, deployment: "local", dataDir: directory };
  } else {
    const name = `ttrpg_test_${randomUUID().replaceAll("-", "")}`, pool = postgresPool(admin as Extract<DatabaseConfig, { driver: "postgres" }>);
    try { await pool.query(`CREATE DATABASE "${name}"`); } finally { await pool.end(); }
    cleanup.push(async () => { const pool = postgresPool(admin as Extract<DatabaseConfig, { driver: "postgres" }>); try { await pool.query(`DROP DATABASE "${name}"`); } finally { await pool.end(); } });
    const url = new URL((admin as Extract<DatabaseConfig, { driver: "postgres" }>).url); url.pathname = "/" + name; config = { ...admin, url: url.href } as DatabaseConfig;
  }
  if (migrate) { await migrateCatalog(config); expect(await migrateCatalog(config)).toEqual([]); }
  return config;
}
async function raw<T>(config: DatabaseConfig, work: (c: SqlConnection) => Promise<T>) {
  const d = createDriver(config); try { const c = await d.acquire(); try { return await work(c); } finally { c.release(); } } finally { await d.close(); }
}
async function open(config: DatabaseConfig, overrideSecret = secret) { const service = await openIdentity(config, { secret: overrideSecret, publicOrigin: origin }); cleanup.push(() => service.close()); return service; }
async function activeAdmin(service: IdentityService) {
  await service.bootstrap(adminInput);
  const first = await service.login(adminInput.email, initial, "bootstrap");
  expect(first.identity.account).toMatchObject({ role: "admin", enabled: true, mustChangePassword: true, emailVerified: false });
  await expect(service.createDm(token(first.cookie), { email: "denied@example.test", name: "X", password: dmPassword })).rejects.toMatchObject({ code: "PASSWORD_CHANGE_REQUIRED" });
  await service.changePassword(token(first.cookie), initial, changed);
  await expect(service.session(token(first.cookie))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  return token((await service.login(adminInput.email, changed, "admin")).cookie);
}
async function listen(service: IdentityService): Promise<number> {
  const handler = createIdentityHttp(service, origin);
  const server = createServer({ maxHeaderSize: 16384 }, (req, res) => {
    if (req.url === "/api/v1/health") { res.end("ok"); return; }
    void handler(req, res);
  });
  cleanup.push(() => new Promise<void>(r => { server.close(() => r()); server.closeAllConnections(); }));
  return bind(server);
}
async function bind(server: Server) { await new Promise<void>(r => server.listen(0, "127.0.0.1", r)); const address = server.address(); if (!address || typeof address === "string") throw new Error(); return address.port; }
function http(port: number, path: string, method = "GET", body?: unknown, cookie?: string, extra: Record<string, string> = {}) {
  return new Promise<{ status: number; body: string; cookie: string[] }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method, headers: { host: "localhost:8787", origin, "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra } }, res => {
      let text = ""; res.setEncoding("utf8"); res.on("data", data => { text += data; }); res.on("end", () => resolve({ status: res.statusCode!, body: text, cookie: res.headers["set-cookie"] ?? [] }));
    }); req.on("error", reject); if (body !== undefined) req.write(JSON.stringify(body)); req.end();
  });
}
for (const kind of ["sqlite", "postgres"] as const) describe(`Identidad real ${kind}`, () => {
  it("bootstrap, cambio, alta DM, sesiones y recuperación persisten usando Better Auth", async () => {
    const config = await fixture(kind); let service = await open(config);
    const cookie = await activeAdmin(service);
    const dm = await service.createDm(cookie, { email: "  Dm+uno@Example.test  ", name: "  DM 日本語  ", password: dmPassword });
    expect(dm).toMatchObject({ email: "dm+uno@example.test", name: "DM 日本語", role: "dm", enabled: true, mustChangePassword: true, emailVerified: false });
    expect((await service.listDms(cookie, 1, 0)).accounts).toEqual([dm]);
    expect(await service.listDms(cookie, 1, 10)).toEqual({ accounts: [], total: 1 });
    await expect(service.createDm(cookie, { email: "DM+UNO@example.test", name: "Duplicado", password: dmPassword })).rejects.toMatchObject({ code: "CONFLICT" });
    const login = await service.login(dm.email, dmPassword, "dm");
    expect(login.cookie).toContain("HttpOnly; SameSite=Strict; Max-Age=28800"); expect(login.cookie).toContain("Path=/api/v1");
    expect(login.cookie).not.toContain("ttrpg_session");
    expect(await service.session(token(login.cookie))).toEqual(login.identity);
    await service.close(); service = await open(config);
    expect((await service.session(token(login.cookie))).account.id).toBe(dm.id);
    await service.changePassword(token(login.cookie), dmPassword, changed);
    await expect(service.login(dm.email, dmPassword, "dm")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const dmActive = token((await service.login(dm.email, changed, "dm")).cookie);
    await expect(service.listDms(dmActive, 20, 0)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await service.administer(cookie, dm.id, "disable");
    await expect(service.session(dmActive)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await service.administer(cookie, dm.id, "enable");
    await expect(service.session(dmActive)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await service.administer(cookie, dm.id, "password", initial);
    await service.recoverAdmin(adminInput.email, initial);
    await expect(service.session(cookie)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await service.close();
    const rows = await raw(config, async c => ({ accounts: (await c.query("SELECT password FROM identity_account")).rows, audit: (await c.query("SELECT actor,target,action,result FROM identity_audit")).rows }));
    expect(rows.accounts).toHaveLength(2); expect(rows.accounts.every(row => String(row.password).startsWith("scrypt$v1$131072$8$1$"))).toBe(true);
    expect(rows.accounts[0].password).not.toBe(rows.accounts[1].password);
    expect(JSON.stringify(rows.audit)).not.toContain(initial); expect(rows.audit.some(row => row.action === "recover-admin")).toBe(true);
  });
});
for (const kind of ["sqlite", "postgres"] as const) describe(`Seguridad/transacciones ${kind}`, () => {
  it("dos composiciones revocan inmediatamente, expiran, rotan secreto y no restauran sesiones", async () => {
    const config = await fixture(kind), one = await open(config), cookie = await activeAdmin(one), two = await open(config);
    expect((await two.session(cookie)).account.role).toBe("admin");
    await two.logout(cookie, true); await expect(one.session(cookie)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const first = await one.login(adminInput.email, changed, "first"), second = await two.login(adminInput.email, changed, "second");
    expect(token(first.cookie)).not.toBe(token(second.cookie));
    await one.close(); await two.close();
    expect((await raw(config, c => c.query("SELECT id FROM identity_session"))).rows).toHaveLength(2);
    await raw(config, c => c.query('UPDATE identity_session SET "expiresAt"=$1', [new Date(Date.now() - 1000).toISOString()]));
    const restarted = await open(config); await expect(restarted.session(token(second.cookie))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const fresh = token((await restarted.login(adminInput.email, changed, "fresh")).cookie);
    const rotated = await open(config, randomBytes(32).toString("base64url"));
    await expect(rotated.session(fresh)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(restarted.session(fresh)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await rotated.close(); await restarted.close();
    expect((await raw(config, c => c.query("SELECT id FROM identity_session"))).rows).toHaveLength(0);
  });
  it("login en hash no sobrevive a disable/reset y autorización en hash no sobrevive logout", async () => {
    const config = await fixture(kind), one = await open(config), adminCookie = await activeAdmin(one), two = await open(config);
    const dm = await one.createDm(adminCookie, { email: "race@example.test", name: "Carrera", password: dmPassword });
    const entered = deferred(), release = deferred(), originalVerify = passwordCodec.verify;
    vi.spyOn(passwordCodec, "verify").mockImplementationOnce(async input => { entered.resolve(); await release.promise; return originalVerify(input); });
    const pending = one.login(dm.email, dmPassword, "race"); await entered.promise;
    await two.administer(adminCookie, dm.id, "disable"); await two.administer(adminCookie, dm.id, "enable"); release.resolve();
    await expect(pending).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await two.administer(adminCookie, dm.id, "enable");
    const entered2 = deferred(), release2 = deferred();
    vi.spyOn(passwordCodec, "verify").mockImplementationOnce(async input => { entered2.resolve(); await release2.promise; return originalVerify(input); });
    const pending2 = one.login(dm.email, dmPassword, "race"); await entered2.promise;
    await two.administer(adminCookie, dm.id, "password", initial); release2.resolve();
    await expect(pending2).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const entered3 = deferred(), release3 = deferred(), originalHash = passwordCodec.hash;
    vi.spyOn(passwordCodec, "hash").mockImplementationOnce(async input => { entered3.resolve(); await release3.promise; return originalHash(input); });
    const lateCreate = one.createDm(adminCookie, { email: "late@example.test", name: "Tardío", password: dmPassword }); await entered3.promise;
    await two.logout(adminCookie); release3.resolve();
    await expect(lateCreate).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("bootstrap y unicidad se serializan; fallo posterior revierte usuario/credencial/auditoría", async () => {
    const config = await fixture(kind), one = await open(config), two = await open(config);
    const bootstrap = await Promise.allSettled([one.bootstrap(adminInput), two.bootstrap({ ...adminInput, email: "other@example.test" })]);
    expect(bootstrap.filter(result => result.status === "fulfilled")).toHaveLength(1);
    await one.close(); await two.close();
    await raw(config, c => c.query(kind === "sqlite" ? "CREATE TRIGGER reject_identity_audit BEFORE INSERT ON identity_audit BEGIN SELECT RAISE(ABORT,'test'); END" : "ALTER TABLE identity_audit ADD CONSTRAINT test_fail CHECK (action='bootstrap')"));
    const service = await open(config);
    const winner = bootstrap.find(result => result.status === "fulfilled"); if (!winner || winner.status !== "fulfilled") throw new Error();
    const limited = token((await service.login(winner.value.email, initial, "winner")).cookie);
    await expect(service.changePassword(limited, initial, changed)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect((await service.session(limited)).account.mustChangePassword).toBe(true);
    await service.close();
    const state = await raw(config, c => c.query("SELECT password FROM identity_account"));
    expect(await passwordCodec.verify({ hash: String(state.rows[0].password), password: initial })).toBe(true);
    expect(await passwordCodec.verify({ hash: String(state.rows[0].password), password: changed })).toBe(false);
  });
  it("unidad autenticada comparte rollback006 y no permite usar recursos expirados", async () => {
    const config = await fixture(kind), service = await open(config), adminCookie = await activeAdmin(service);
    await service.createDm(adminCookie, { email: "tx@example.test", name: "DM transaccional", password: dmPassword });
    const first = await service.login("tx@example.test", dmPassword, "tx");
    await service.changePassword(first.cookie, dmPassword, changed);
    const cookie = (await service.login("tx@example.test", changed, "tx")).cookie;
    let expired: import("../../../application/services/game-catalog").CatalogTransaction | undefined;
    await expect(service.authorized(cookie, "dm", async (principal, tx) => { expired = tx; await tx.games.create(principal.account.id, "rollback", GENERIC_SYSTEM); throw new Error("fail"); })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(expired!.games.create("owner", "late", GENERIC_SYSTEM)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(await service.authorized(cookie, "dm", async (principal, tx) => (await tx.games.list(principal.account.id)).total)).toBe(0);
  });
  it("HTTP cerrado, DTO mínimo, CSRF, permisos, temporal, paginación, límite chunked y cookies", async () => {
    const service = await open(await fixture(kind)), adminCookie = await activeAdmin(service), port = await listen(service);
    const anonymous = await http(port, "/api/v1/identity/admin/dms", "POST", { password: "large" }); expect(anonymous.status).toBe(401);
    for (const path of ["/sign-up/email", "/admin/create-user", "/reset-password", "/impersonate-user"]) {
      expect((await http(port, "/api/v1/identity" + path, "POST", { email: "hack@example.test", password: dmPassword, role: "admin" })).status).toBe(404);
    }
    for (const extra of ([{ origin: "null" }, { origin: "https://elsewhere.test" }, { host: "elsewhere.test" }, { origin: "" }] as Record<string, string>[])) expect((await http(port, "/api/v1/identity/login", "POST", { email: adminInput.email, password: changed }, undefined, extra)).status).toBe(403);
    const login = await http(port, "/api/v1/identity/login", "POST", { email: adminInput.email, password: changed, role: "admin" }); expect(login.status).toBe(400);
    const create = await http(port, "/api/v1/identity/admin/dms", "POST", { email: "http@example.test", name: "DM", password: dmPassword }, adminCookie);
    expect(create.status).toBe(201); expect(create.cookie).toHaveLength(0); expect(create.body).not.toContain(dmPassword);
    const dm = JSON.parse(create.body).account;
    const dmLogin = await http(port, "/api/v1/identity/login", "POST", { email: dm.email, password: dmPassword }, "ttrpg_identity.session_token=imposed");
    expect(dmLogin.status).toBe(200); expect(dmLogin.body).not.toContain("token"); expect(dmLogin.body).not.toContain("password");
    const dmCookie = token(dmLogin.cookie[0]);
    expect((await http(port, "/api/v1/identity/admin/dms", "GET", undefined, dmCookie)).status).toBe(403);
    expect((await http(port, "/api/v1/identity/admin/dms?limit=101", "GET", undefined, adminCookie)).status).toBe(400);
    expect((await http(port, "/api/v1/identity/admin/dms?limit=1&limit=2", "GET", undefined, adminCookie)).status).toBe(400);
    expect((await http(port, "/api/v1/identity/admin/dms", "POST", { email: "oversize@example.test", name: "A".repeat(9000), password: dmPassword }, adminCookie)).status).toBe(413);
    expect((await http(port, "/api/v1/identity/admin/dms/does-not-exist/disable", "POST", {}, adminCookie)).status).toBe(404);
    expect((await http(port, `/api/v1/identity/admin/dms/${JSON.parse((await http(port, "/api/v1/identity/session", "GET", undefined, adminCookie)).body).account.id}/disable`, "POST", {}, adminCookie)).status).toBe(404);
    const logout = await http(port, "/api/v1/identity/logout", "POST", {}, dmCookie); expect(logout.status).toBe(204); expect(logout.cookie[0]).toContain("Max-Age=0");
    expect((await http(port, "/api/v1/identity/logout", "POST", {}, dmCookie)).status).toBe(204);
  });
  it("petición admin detenida durante cuerpo vuelve a validar tras logout", async () => {
    const service = await open(await fixture(kind)), cookie = await activeAdmin(service), port = await listen(service);
    const entered = deferred(); const authorize = service.authorized.bind(service);
    vi.spyOn(service, "authorized").mockImplementation(async (...args) => { const result = await authorize(...args); entered.resolve(); return result; });
    const input = JSON.stringify({ email: "slow-body@example.test", name: "Lento", password: dmPassword });
    const response = new Promise<number>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port, path: "/api/v1/identity/admin/dms", method: "POST", headers: { host: "localhost:8787", origin, cookie, "content-type": "application/json" } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); });
      req.on("error", reject); req.write(input.slice(0, 10));
      // La barrera espía prueba que ya pasó autorización previa y espera el cuerpo.
      void (async () => { await entered.promise; await service.logout(cookie); req.end(input.slice(10)); })().catch(reject);
    });
    expect(await response).toBe(401);
  });
  it("CLI con lector inyectado exige admin, confirma contraseñas y cierra sesión temporal", async () => {
    const service = await open(await fixture(kind)); const output: string[] = [];
    async function run(operation: string, inputs: string[]) {
      await runIdentityCommand(operation, service, { ask: async () => { const value = inputs.shift(); if (value === undefined) throw new Error("EOF"); return value; }, write: message => output.push(message) });
    }
    await run("bootstrap", [adminInput.email, adminInput.name, initial, initial]);
    await run("password", [adminInput.email, initial, changed, changed]);
    await run("provision-dm", [adminInput.email, changed, "cli@example.test", "CLI", dmPassword, dmPassword]);
    await expect(run("provision-dm", ["cli@example.test", dmPassword])).rejects.toThrow("administradora");
    await expect(run("recover-admin", [adminInput.email, "NO"])).rejects.toThrow("cancelada");
    await run("recover-admin", [adminInput.email, "RECUPERAR", initial, initial]);
    expect(output.join(" ")).not.toContain(initial); expect(output.join(" ")).not.toContain(changed); expect(output.join(" ")).not.toContain(dmPassword);
  });
});
describe("Frontera de transición y coste", () => {
  it("identidad nueva nunca autoriza rutas legadas; cookies combinadas conservan autoridades independientes", async () => {
    const config = await fixture("sqlite"), service = await open(config), adminCookie = await activeAdmin(service);
    if (config.driver !== "sqlite") throw new Error();
    const api = createApi({ host: "127.0.0.1", port: 0, dataDir: config.dataDir, publicOrigin: origin, dmKey: "d".repeat(32), playerKey: "p".repeat(32), identity: { secret, publicOrigin: origin } }, { version: "test", identity: service });
    cleanup.push(() => api.close()); const port = await api.listen();
    const dm = await service.createDm(adminCookie, { email: "boundary@example.test", name: "DM", password: dmPassword });
    const accountDm = token((await service.login(dm.email, dmPassword, "boundary")).cookie);
    const legacyDm = token((await http(port, "/api/v1/auth/login", "POST", { key: "d".repeat(32) })).cookie[0]);
    const legacyPlayer = token((await http(port, "/api/v1/auth/login", "POST", { key: "p".repeat(32) })).cookie[0]);
    const cases: [string, string, unknown?][] = [["/scenes", "GET"], ["/assets/" + randomUUID(), "GET"], ["/assets/" + randomUUID(), "HEAD"], ["/assets/resolve", "POST", { references: [] }], ["/libraries/monsters", "GET"], ["/libraries/npcs", "GET"], ["/libraries/player-characters", "GET"], ["/monster-templates", "GET"], ["/scene-links/validate", "POST", {}], ["/table/state", "GET"], ["/table/events", "GET"], ["/dice/state", "GET"], ["/table/publish", "POST", {}], ["/dice/roll", "POST", {}], ["/scenes", "POST", {}]];
    for (const cookie of [undefined, adminCookie, accountDm]) for (const [path, method, body] of cases) {
      const result = await http(port, "/api/v1" + path, method, body, cookie); expect(result.status, path).toBe(401);
      expect(result.body).not.toContain("asset:"); expect(result.body).not.toContain("scene");
    }
    for (const cookie of [legacyDm, legacyPlayer]) expect((await http(port, "/api/v1/identity/session", "GET", undefined, cookie)).status).toBe(401);
    for (const cookie of [legacyDm + "; " + adminCookie, legacyDm + "; " + accountDm]) {
      expect((await http(port, "/api/v1/scenes", "GET", undefined, cookie)).status).toBe(200);
      expect((await http(port, "/api/v1/identity/session", "GET", undefined, cookie)).status).toBe(200);
    }
    expect((await http(port, "/api/v1/scenes", "GET", undefined, legacyPlayer + "; " + adminCookie)).status).toBe(403);
    await http(port, "/api/v1/identity/logout", "POST", {}, adminCookie + "; " + legacyDm);
    expect((await http(port, "/api/v1/scenes", "GET", undefined, legacyDm)).status).toBe(200);
    expect((await http(port, "/api/v1/identity/session", "GET", undefined, adminCookie)).status).toBe(401);
  });
  it("ráfaga con KDF real devuelve429, mantiene health/logout y no enumera usuarios", async () => {
    const config = await fixture("postgres"), service = await open(config), cookie = await activeAdmin(service), port = await listen(service);
    const bulk = await service.createDm(cookie, { email: "burst@example.test", name: "Ráfaga", password: dmPassword });
    const baselineRss = process.memoryUsage().rss; let peakRss = baselineRss;
    const sampler = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 5);
    const entries = Array.from({ length: 12 }, (_, n) => service.login(n % 3 === 2 ? `missing${n}@example.test` : bulk.email, n % 3 === 0 ? dmPassword : changed, `peer${n}`).then(() => "AUTHENTICATED", error => error.code));
    expect((await http(port, "/api/v1/health")).status).toBe(200);
    expect((await http(port, "/api/v1/identity/logout", "POST", {}, cookie)).status).toBe(204);
    const outcomes = await Promise.all(entries); clearInterval(sampler); expect(outcomes.filter(code => code === "AUTHENTICATED")).toHaveLength(1); expect(outcomes.filter(code => code === "UNAUTHORIZED")).toHaveLength(1); expect(outcomes.filter(code => code === "RATE_LIMITED")).toHaveLength(10);
    const diagnostics: Record<string, number> = {};
    for (const [label, email, password] of [["valid", adminInput.email, changed], ["wrong", adminInput.email, initial], ["missing", "diagnostic@example.test", changed]]) {
      const start = performance.now(); await service.login(email, password, "diagnostic").catch(() => undefined); diagnostics[label] = Math.round(performance.now() - start);
    }
    process.stdout.write("KDF diagnóstico ms/RSS delta MiB (no benchmark): " + JSON.stringify({ ...diagnostics, rssPeakDeltaMiB: Math.round((peakRss - baselineRss) / 1024 / 1024) }) + "\n");
    const first = await http(port, "/api/v1/identity/login", "POST", { email: "none@example.test", password: changed });
    const second = await http(port, "/api/v1/identity/login", "POST", { email: adminInput.email, password: initial });
    expect(first.status).toBe(401); expect(second.status).toBe(401); expect(first.body).toBe(second.body);
  });
  it("HTTPS usa cookie propia Secure y rechaza token impuesto", async () => {
    const config = await fixture("postgres"), service = await openIdentity(config, { secret, publicOrigin: "https://example.test" }); cleanup.push(() => service.close());
    await service.bootstrap(adminInput); const result = await service.login(adminInput.email, initial, "https");
    expect(result.cookie).toMatch(/^__Secure-ttrpg_identity.session_token=/); expect(result.cookie).toContain("; Secure"); expect(result.cookie).not.toContain("Domain=");
    await expect(service.session("__Secure-ttrpg_identity.session_token=imposed")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await service.session(token(result.cookie))).account.role).toBe("admin");
  });
});

for (const kind of ["sqlite", "postgres"] as const) it(`CLI compilado ${kind}: PTY sin eco, cancelación, bootstrap/password/provisión/recuperación`, async () => {
  const config = await fixture(kind);
  const env = { TTRPG_DB_DRIVER: kind, TTRPG_DEPLOYMENT: config.deployment, TTRPG_PUBLIC_ORIGIN: origin, TTRPG_AUTH_SECRET: secret,
    ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile!, TTRPG_DB_TLS: "verify-full" }) };
  const operations = [
    { name: "bootstrap", answers: [["Email del primer administrador:", "cancel@example.test\r"], ["Nombre visible:", "Cancelado\r"], ["Contraseña inicial (15–128 caracteres):", "\u0003"]], expected: 1 },
    { name: "bootstrap", answers: [["Email del primer administrador:", adminInput.email + "\r"], ["Nombre visible:", adminInput.name + "\r"], ["Contraseña inicial (15–128 caracteres):", initial + "\r"], ["Confirma la contraseña:", initial + "\r"]] },
    { name: "password", answers: [["Email de la cuenta:", adminInput.email + "\r"], ["Contraseña actual:", initial + "\r"], ["Nueva contraseña:", changed + "\r"], ["Confirma la contraseña:", changed + "\r"]] },
    { name: "provision-dm", answers: [["Email de la cuenta administradora:", adminInput.email + "\r"], ["Contraseña actual:", changed + "\r"], ["Email del nuevo DM:", "tty@example.test\r"], ["Nombre visible del DM:", "TTY DM\r"], ["Contraseña temporal del DM:", dmPassword + "\r"], ["Confirma la contraseña:", dmPassword + "\r"]] },
    { name: "recover-admin", answers: [["Email del administrador existente:", adminInput.email + "\r"], ["Escribe RECUPERAR para confirmar:", "RECUPERAR\r"], ["Nueva contraseña temporal:", initial + "\r"], ["Confirma la contraseña:", initial + "\r"]] }
  ];
  const result = await new Promise<string>((resolve, reject) => {
    const child = spawn("python3", ["src/infrastructure/server/identity/test-fixtures/tty-probe.py"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", error = ""; child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8"); child.stdout.on("data", data => { output += data; }); child.stderr.on("data", data => { error += data; });
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(error)));
    child.stdin.end(JSON.stringify({ env, operations, secrets: [initial, changed, dmPassword] }));
  });
  expect(result).toContain("TTY_NO_ECHO_CLI_OK");
  const rows = await raw(config, async c => ({ users: (await c.query("SELECT email FROM identity_user ORDER BY email")).rows, sessions: (await c.query("SELECT id FROM identity_session")).rows }));
  expect(rows.users.map(row => row.email)).toEqual([adminInput.email, "tty@example.test"]); expect(rows.sessions).toEqual([]);
}, 60000);

it("dos procesos de bootstrap crean exactamente un administrador en cada motor", async () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-bootstrap-probe-")));
  cleanup.push(async () => { rmSync(directory, { recursive: true, force: true }); });
  symlinkSync(resolve("node_modules"), join(directory, "node_modules"));
  const configFile = join(directory, "vite.config.mjs");
  writeFileSync(configFile, `export default ${JSON.stringify({ build: { ssr: resolve("src/infrastructure/server/identity/test-fixtures/bootstrap-probe.ts"), target: "node24", outDir: join(directory, "bundle"), rollupOptions: { output: { entryFileNames: "probe.mjs" } } } })};`);
  const exec = promisify(execFile);
  await exec("pnpm", ["exec", "vite", "build", "--config", configFile, "--logLevel", "silent"], { timeout: 10000 });
  for (const kind of ["sqlite", "postgres"] as const) {
    const config = await fixture(kind);
    const env = { PATH: process.env.PATH, TTRPG_DB_DRIVER: kind, TTRPG_DEPLOYMENT: config.deployment, TTRPG_PUBLIC_ORIGIN: origin, TTRPG_AUTH_SECRET: secret,
      ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile!, TTRPG_DB_TLS: "verify-full" }) };
    const results = await Promise.all([1, 2].map(() => exec(process.execPath, [join(directory, "bundle/probe.mjs")], { env, timeout: 15000 })));
    expect(results.map(result => result.stdout.trim()).sort()).toEqual(["BOOTSTRAP_CREATED", "BOOTSTRAP_REJECTED"]);
    expect(await raw(config, c => c.query("SELECT role FROM identity_user"))).toMatchObject({ rows: [{ role: "admin" }] });
  }
}, 40000);

for (const kind of ["sqlite", "postgres"] as const) it(`migración006→007 ${kind} conserva catálogo y rechaza identidad pendiente`, async () => {
  const config = await fixture(kind, false), driver = createDriver(config);
  try { expect(await applyMigrations(driver, migrations.slice(0, 1))).toEqual([1]); } finally { await driver.close(); }
  const id = randomUUID(), now = new Date().toISOString();
  await raw(config, c => c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)", [id, "legacy-owner", "Conservar", "ready", now, now]));
  await expect(openIdentity(config, { secret, publicOrigin: origin })).rejects.toMatchObject({ code: "MIGRATION_REQUIRED" });
  expect(await migrateCatalog(config)).toEqual([2, 3, 4, 5]); expect(await migrateCatalog(config)).toEqual([]);
  expect((await raw(config, c => c.query("SELECT id FROM ttrpg_games"))).rows).toEqual([{ id }]);
  const service = await open(config); await service.bootstrap(adminInput);
});

it("API compilada activa identidad migrada y rechaza configuración inválida antes de crear datos", async () => {
  const config = await fixture("sqlite"); if (config.driver !== "sqlite") throw new Error();
  const service = await open(config); await service.bootstrap(adminInput); await service.close();
  const baseEnv = { PATH: process.env.PATH, TTRPG_DB_DRIVER: "sqlite", TTRPG_DATA_DIR: config.dataDir, TTRPG_PUBLIC_ORIGIN: origin, TTRPG_HOST: "127.0.0.1", TTRPG_PORT: "0", TTRPG_DM_KEY: "d".repeat(32), TTRPG_PLAYER_KEY: "p".repeat(32), TTRPG_IDENTITY_ENABLED: "true", TTRPG_AUTH_SECRET: secret };
  const child = spawn(process.execPath, ["out/api/index.mjs"], { env: baseEnv, stdio: ["ignore", "pipe", "pipe"] });
  const exited = new Promise<number | null>(resolve => child.on("exit", resolve));
  cleanup.push(async () => { if (child.exitCode === null) child.kill("SIGTERM"); await exited; });
  const port = await new Promise<number>((resolve, reject) => {
    let output = ""; const timer = setTimeout(() => reject(new Error("API no escuchó")), 10000);
    child.stdout.on("data", chunk => { output += String(chunk); const found = /Puerto: (\d+)/.exec(output); if (found) { clearTimeout(timer); resolve(Number(found[1])); } });
    child.on("exit", () => { clearTimeout(timer); reject(new Error("API salió antes de escuchar")); });
  });
  expect((await http(port, "/api/v1/health")).status).toBe(200);
  const login = await http(port, "/api/v1/identity/login", "POST", { email: adminInput.email, password: initial }); expect(login.status).toBe(200);
  expect((await http(port, "/api/v1/scenes", "GET", undefined, token(login.cookie[0]))).status).toBe(401);
  child.kill("SIGTERM"); expect(await exited).toBe(0);
  const untouched = join(config.dataDir, "must-not-exist");
  await expect(promisify(execFile)(process.execPath, ["out/api/index.mjs"], { env: { ...baseEnv, TTRPG_DATA_DIR: untouched, TTRPG_AUTH_SECRET: "invalid" }, timeout: 10000 })).rejects.toMatchObject({ code: 1 });
  expect(existsSync(untouched)).toBe(false);
});
