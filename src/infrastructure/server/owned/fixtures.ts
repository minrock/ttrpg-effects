import { identityDatabase } from "../identity/database";
import type { MonsterTemplate } from "../../../domain/monster-templates/monster-template";
import { stable, definitionHash } from "./system-data";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, request } from "node:http";
import { readDatabaseConfig, type DatabaseConfig } from "../database/config";
import { createDriver, postgresPool, type SqlConnection } from "../database/driver";
import { migrateCatalog } from "../database";
import { applyMigrations, migrations } from "../database/migrations";
import { openIdentity } from "../identity";
import type { IdentityService } from "../../../application/services/identity";
import { createOwnedHttp } from "../../../server/owned-http";
import { createIdentityHttp } from "../../../server/identity-http";
export const cleanup: Array<() => Promise<void>> = [];
export const origin = "http://localhost:8787", secret = randomBytes(32).toString("base64url");
export const initial = "contraseña temporal de pruebas 008", changed = "contraseña definitiva de pruebas 008";
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
if (!process.env.TTRPG_TEST_DATABASE_URL || !process.env.TTRPG_TEST_DB_CA_FILE) throw new Error("test:owned requiere PostgreSQL temporal real con TLS. No hay modo con skips.");
export const admin = readDatabaseConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DEPLOYMENT: "production", TTRPG_DATABASE_URL: process.env.TTRPG_TEST_DATABASE_URL, TTRPG_DB_CA_FILE: process.env.TTRPG_TEST_DB_CA_FILE }) as Extract<DatabaseConfig, { driver: "postgres" }>;
export function directory() { const root = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-owned-"))); cleanup.push(async () => rmSync(root, { recursive: true, force: true })); return root; }
export async function fixture(kind: "sqlite" | "postgres", version = migrations.length): Promise<DatabaseConfig> {
  let config: DatabaseConfig;
  if (kind === "sqlite") config = { driver: kind, deployment: "local", dataDir: directory() };
  else {
    const name = `ttrpg_test_${randomUUID().replaceAll("-", "")}`, pool = postgresPool(admin);
    try { await pool.query(`CREATE DATABASE "${name}"`); } finally { await pool.end(); }
    cleanup.push(async () => { const pool = postgresPool(admin); try { await pool.query(`DROP DATABASE "${name}"`); } finally { await pool.end(); } });
    const url = new URL(admin.url); url.pathname = "/" + name; config = { ...admin, url: url.href };
  }
  if (version === migrations.length) await migrateCatalog(config); else { const driver = createDriver(config); try { await applyMigrations(driver,migrations.slice(0,version)); } finally { await driver.close(); } } return config;
}
export async function raw<T>(config: DatabaseConfig, work: (c: SqlConnection) => Promise<T>): Promise<T> { const driver = createDriver(config); try { const c = await driver.acquire(); try { return await work(c); } finally { c.release(); } } finally { await driver.close(); } }
export async function open(config: DatabaseConfig) { const identity = await openIdentity(config, { publicOrigin: origin, secret }); cleanup.push(() => identity.close()); return identity; }
export async function accounts(config: DatabaseConfig) {
  const identity = await open(config); await identity.bootstrap({ email: "admin@example.test", name: "Administración", password: initial });
  const activate = async (email: string) => { const first = await identity.login(email, initial, email); await identity.changePassword(first.cookie, initial, changed); return (await identity.login(email, changed, email)).cookie; };
  const adminCookie = await activate("admin@example.test"), a = await identity.createDm(adminCookie, { email: "a@example.test", name: "DM Ñ A", password: initial }), b = await identity.createDm(adminCookie, { email: "b@example.test", name: "DM 日本 B", password: initial });
  const aCookie = await activate(a.email), bCookie = await activate(b.email); return { identity, adminCookie, a, b, aCookie, bCookie };
}
export async function listen(identity: IdentityService) {
  const owned = createOwnedHttp(identity, origin), auth = createIdentityHttp(identity, origin);
  const server = createServer((req, res) => { void (req.url?.startsWith("/api/v1/identity/") ? auth : owned)(req, res); });
  cleanup.push(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error(); return address.port;
}
export async function http(port: number, path: string, cookie: string, method = "GET", payload?: unknown, extra: Record<string, string> = {}) {
  return new Promise<{ status: number; json: Record<string, unknown>; bytes: Buffer; headers: import("node:http").IncomingHttpHeaders }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: path.startsWith("/api/v1/") ? path : "/api/v1/dm" + path, method, headers: { host: "localhost:8787", origin, cookie, "content-type": "application/json", "idempotency-key": randomUUID(), ...(payload === undefined ? {} : { "content-length": String(Buffer.byteLength(Buffer.isBuffer(payload) ? payload : JSON.stringify(payload))) }), ...extra } }, res => {
      const chunks: Buffer[] = []; res.on("data", chunk => chunks.push(chunk)); res.on("end", () => { const bytes = Buffer.concat(chunks); let json = {}; try { json = JSON.parse(bytes.toString()); } catch { /* bytes or HEAD */ } resolve({ status: res.statusCode!, json, bytes, headers: res.headers }); });
    }); req.on("error", reject); req.end(payload === undefined ? undefined : Buffer.isBuffer(payload) ? payload : JSON.stringify(payload));
  });
}

/** Fixture de datos históricos; nunca accesible por el puerto de producto. */
export async function retainHistoricalTemplate(config: DatabaseConfig, owner: string, value: MonsterTemplate) {
  const unit = await identityDatabase(config); try { await unit.transaction(async c=>{ await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body) VALUES($1,'templates',$2,$3,$4,$5,$6,$7,1,$8)",[owner,value.id,value.name,value.name.normalize("NFC").toLowerCase(),Buffer.from(value.id).toString("hex"),value.updatedAt,value.updatedAt,stable(value)]);await c.query("INSERT INTO retained_templates(owner_id,id,version,hash,body) VALUES($1,$2,1,$3,$4)",[owner,value.id,definitionHash(value),stable(value)]); }); } finally { await unit.close(); }
}
