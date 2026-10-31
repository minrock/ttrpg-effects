import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommitEffects } from "../../../application/services/owned-store";
import { OwnedError } from "../../../application/services/owned-store";
import { ApplicationError } from "../../../application/services/application-error";
import { CatalogError } from "../../../application/services/game-catalog";
import { AsyncLocalStorage } from "node:async_hooks";
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler, type DatabaseConnection, type CompiledQuery, type QueryResult, type Driver } from "kysely";
import { IdentityError } from "../../../application/services/identity";
import { createDriver, type SqlConnection } from "../database/driver";
import { validateDatabaseConfig, type DatabaseConfig } from "../database/config";
import { verifySchema } from "../database/migrations";
export type TransactionOutcome = "rolled_back" | "uncertain";
/** Kysely oficial sobre la conexión006: toda llamada Better Auth requiere una unidad de trabajo. */
async function createIdentityDatabase(config: DatabaseConfig) {
  validateDatabaseConfig(config);
  if (config.driver === "sqlite" && !existsSync(join(config.dataDir, "control.sqlite"))) throw new CatalogError("MIGRATION_REQUIRED");
  const driver = createDriver(config);
  try { const c = await driver.acquire(); try { await verifySchema(c, driver.kind); } finally { c.release(); } }
  catch (error) { await driver.close(); throw error; }
  const local = new AsyncLocalStorage<{ connection: SqlConnection; active: boolean }>();
  let queue: Promise<unknown> = Promise.resolve(), closing: Promise<void> | undefined;
  const kyselyDriver: Driver = {
    async init() {},
    async acquireConnection(): Promise<DatabaseConnection> {
      const scope = local.getStore();
      if (!scope?.active) throw new IdentityError("UNAVAILABLE");
      return {
        async executeQuery<R>(compiled: CompiledQuery): Promise<QueryResult<R>> {
          if (!scope.active) throw new IdentityError("UNAVAILABLE");
          const values = compiled.parameters.map(value => {
            if (value === null || typeof value === "string" || typeof value === "number") return value;
            if (value instanceof Date) return value.toISOString();
            if (typeof value === "boolean") return driver.kind === "sqlite" ? Number(value) : String(value);
            throw new IdentityError("UNAVAILABLE");
          });
          const result = await scope.connection.query(compiled.sql, values);
          return { rows: result.rows as R[], numAffectedRows: BigInt(result.changes) };
        },
        streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> { throw new IdentityError("UNAVAILABLE"); }
      };
    },
    async beginTransaction() { throw new IdentityError("UNAVAILABLE"); }, async commitTransaction() { throw new IdentityError("UNAVAILABLE"); }, async rollbackTransaction() { throw new IdentityError("UNAVAILABLE"); },
    async releaseConnection() {}, async destroy() {}
  };
  const db = new Kysely<Record<string, never>>({ dialect: {
    createDriver: () => kyselyDriver,
    createAdapter: () => driver.kind === "sqlite" ? new SqliteAdapter() : new PostgresAdapter(),
    createQueryCompiler: () => driver.kind === "sqlite" ? new SqliteQueryCompiler() : new PostgresQueryCompiler(),
    createIntrospector: kysely => driver.kind === "sqlite" ? new SqliteIntrospector(kysely) : new PostgresIntrospector(kysely)
  } });
  return {
    db,
    transaction<T>(work: (connection: SqlConnection, effects: CommitEffects) => Promise<T>, failed?: (outcome: TransactionOutcome) => void): Promise<T> {
      if (closing || local.getStore()) return Promise.reject(new IdentityError("UNAVAILABLE"));
      const operation = queue.then(async () => {
        const connection = await driver.acquire();
        let begun = false, commitAttempted = false, committed = false, locked = false, discard = false;
        const scope = { connection, active: true };
        const checks: Array<() => Promise<void>> = [], effects: Array<{ apply: () => void; uncertain: () => void }> = [];
        let accepting = true;
        const lifecycle: CommitEffects = {
          beforeCommit(check) { if (!accepting) throw new IdentityError("UNAVAILABLE"); checks.push(check); },
          afterCommit(apply, uncertain) { if (!accepting) throw new IdentityError("UNAVAILABLE"); effects.push({ apply, uncertain }); }
        };
        try {
          // El lock de sesión cubre COMMIT y efectos síncronos antes de permitir otra transición.
          if (driver.kind === "postgres") { await connection.query("SELECT pg_advisory_lock(783496102)"); locked = true; }
          await connection.query(driver.kind === "sqlite" ? "BEGIN IMMEDIATE" : "BEGIN"); begun = true;
          const result = await local.run(scope, async () => {
            const value = await work(connection, lifecycle);
            accepting = false;
            for (const check of checks) await check();
            return value;
          });
          scope.active = false;
          commitAttempted = true;
          await connection.query("COMMIT"); begun = false; committed = true;
          for (const effect of effects) effect.apply();
          return result;
        } catch (error) {
          let rolledBack = false;
          if (begun) try { await connection.query("ROLLBACK"); rolledBack = true; } catch { discard = true; }
          const uncertain = commitAttempted || !rolledBack;
          if (uncertain) {
            discard = true;
            for (const effect of effects) try { effect.uncertain(); } catch { /* Limpieza independiente de cada participante. */ }
          }
          failed?.(uncertain ? "uncertain" : "rolled_back");
          if (commitAttempted || committed) throw new IdentityError("UNAVAILABLE");
          throw error instanceof IdentityError || error instanceof OwnedError || error instanceof CatalogError || error instanceof ApplicationError ? error : new IdentityError("UNAVAILABLE");
        } finally {
          accepting = false; scope.active = false;
          if (locked) try { await connection.query("SELECT pg_advisory_unlock(783496102)"); } catch { discard = true; }
          connection.release(discard);
        }
      });
      queue = operation.catch(() => undefined); return operation;
    },
    close(): Promise<void> { closing ??= queue.then(async () => { await db.destroy(); await driver.close(); }); return closing; }
  };
}

// Exclusión física006 conservada: dos composiciones SQLite del mismo proceso comparten
// la conexión y cola, con leases explícitos; un segundo proceso sigue siendo rechazado.
type IdentityDatabase = Awaited<ReturnType<typeof createIdentityDatabase>>;
const sqliteUnits = new Map<string, { ready: Promise<IdentityDatabase>; leases: number; closing?: Promise<void> }>();
export async function identityDatabase(config: DatabaseConfig): Promise<IdentityDatabase> {
  if (config.driver !== "sqlite") return createIdentityDatabase(config);
  const existing = sqliteUnits.get(config.dataDir);
  if (existing?.closing) { await existing.closing; return identityDatabase(config); }
  const entry = existing ?? { ready: createIdentityDatabase(config), leases: 0 };
  if (!existing) sqliteUnits.set(config.dataDir, entry);
  entry.leases++;
  let unit: IdentityDatabase;
  try { unit = await entry.ready; } catch (error) { sqliteUnits.delete(config.dataDir); throw error; }
  let closed: Promise<void> | undefined;
  return { ...unit, transaction: (work, failed) => closed ? Promise.reject(new IdentityError("UNAVAILABLE")) : unit.transaction(work, failed), close() {
    closed ??= (async () => {
      entry.leases--;
      if (!entry.leases) {
        entry.closing = unit.close();
        try { await entry.closing; } finally { sqliteUnits.delete(config.dataDir); }
      }
    })();
    return closed;
  } };
}
