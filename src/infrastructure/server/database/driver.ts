import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Client, Pool, type PoolClient } from "pg";
import { CatalogError } from "../../../application/services/game-catalog";
import type { DatabaseConfig } from "./config";

export type Row = Record<string, unknown>;
export interface SqlConnection {
  query(sql: string, values?: readonly (string | number | null | Uint8Array)[]): Promise<{ rows: Row[]; changes: number }>;
  release(discard?: boolean): void;
}
export interface SqlDriver { kind: "sqlite" | "postgres"; acquire(): Promise<SqlConnection>; close(): Promise<void> }

function openSqlite(directory: string): SqlDriver {
  const root = resolve(directory);
  // Validar ancestros antes de crear nada. Un directorio existente también debe ser privado.
  let parent = root;
  while (!existsSync(parent)) parent = dirname(parent);
  if (realpathSync(parent) !== parent) throw new Error();
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (realpathSync(root) !== root || !lstatSync(root).isDirectory() || (lstatSync(root).mode & 0o077) !== 0) throw new Error();
  const lockPath = join(root, "control.lock");
  const lock = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  let db: DatabaseSync | undefined;
  try {
    const file = join(root, "control.sqlite");
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      try {
        const stat = lstatSync(file + suffix);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) !== 0) throw new Error();
      } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    }
    const fd = openSync(file, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    try { if (fstatSync(fd).nlink !== 1) throw new Error(); } finally { closeSync(fd); }
    db = new DatabaseSync(file);
    db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;");
    const connection: SqlConnection = {
      async query(sql, values = []) {
        const statement = db!.prepare(sql.replace(/\$\d+/g, "?"));
        if (statement.columns().length) return { rows: statement.all(...values) as Row[], changes: 0 };
        return { rows: [], changes: Number(statement.run(...values).changes) };
      },
      release() {}
    };
    return { kind: "sqlite", async acquire() { return connection; }, async close() { try { db!.close(); } finally { closeSync(lock); unlinkSync(lockPath); } } };
  } catch (error) {
    try { db?.close(); } finally { closeSync(lock); unlinkSync(lockPath); }
    throw error;
  }
}
// pg-pool retira un cliente cuyo connect falla sin esperar su socket. Un error
// SCRAM generado localmente puede dejar al backend esperando hasta su timeout.
// Cerrar explícitamente el transporte fallido antes de devolverlo al pool.
class ManagedClient extends Client {
  connect(): Promise<Client>;
  connect(callback: ((error: Error) => void) | ((error: null, client: Client) => void)): void;
  connect(callback?: ((error: Error) => void) | ((error: null, client: Client) => void)): Promise<Client> | void {
    const connected = super.connect().catch(async error => {
      this.connection.stream.destroy();
      await this.end().catch(() => undefined);
      throw error;
    });
    if (!callback) return connected;
    const done = callback as (error: Error | null, client?: Client) => void;
    void connected.then(client => done(null, client), error => done(error));
  }
}
export function postgresPool(config: Extract<DatabaseConfig, { driver: "postgres" }>): Pool {
  const url = new URL(config.url);
  // Pasar todos los campos explícitamente evita defaults PG* y opciones TLS en connectionString.
  const pool = new Pool({
    Client: ManagedClient,
    host: url.hostname.replace(/^\[|\]$/g, ""), port: Number(url.port || 5432), user: decodeURIComponent(url.username),
    password: () => decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)),
    ssl: config.tls === "disable" ? false : { rejectUnauthorized: true, ...(config.caFile ? { ca: readFileSync(config.caFile, "utf8") } : {}) },
    max: 4, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000,
    statement_timeout: 5000, query_timeout: 6000, lock_timeout: 5000, idle_in_transaction_session_timeout: 10000,
    options: "-c search_path=public", client_encoding: "UTF8", sslnegotiation: "postgres", ...{ replication: "false" }, application_name: "ttrpg-control", keepAlive: true
  });
  // pg emite error en clientes ociosos; no registrar el Error con credenciales/detalles SQL.
  pool.on("error", () => undefined);
  return pool;
}
function wrap(client: PoolClient): SqlConnection {
  // El listener de pg.Pool solo protege clientes ociosos. Durante un préstamo,
  // un error entre consultas debe invalidar la conexión sin terminar Node.
  let failed = false, ended = false, released = false;
  const onError = () => { failed = true; };
  const cleanup = () => { client.removeListener("error", onError); client.removeListener("end", onEnd); };
  const onEnd = () => { failed = true; ended = true; if (released) cleanup(); };
  client.on("error", onError);
  client.on("end", onEnd);
  return {
    async query(sql, values = []) {
      if (failed || released) throw new CatalogError("UNAVAILABLE");
      const result = await client.query(sql, [...values]);
      if (failed) throw new CatalogError("UNAVAILABLE");
      return { rows: result.rows as Row[], changes: result.rowCount ?? 0 };
    },
    release(discard = false) {
      failed ||= discard;
      if (released) return;
      released = true;
      // true descarta el cliente roto. No devolverlo a la lista de ociosos.
      // Mantener el listener hasta end para cubrir errores tardíos del socket.
      client.release(failed);
      if (!failed || ended) cleanup();
    }
  };
}
export function createDriver(config: DatabaseConfig): SqlDriver {
  if (config.driver === "sqlite") return openSqlite(config.dataDir);
  const pool = postgresPool(config);
  return { kind: "postgres", async acquire() { return wrap(await pool.connect()); }, async close() { await pool.end(); } };
}
