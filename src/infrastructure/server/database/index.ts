import { ApplicationError } from "../../../application/services/application-error";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { CatalogError, type CatalogDatabase, type CatalogTransaction } from "../../../application/services/game-catalog";
import { catalogRepository, type CatalogClock } from "./catalog-repository";
import { validateDatabaseConfig, type DatabaseConfig } from "./config";
import { createDriver, type SqlConnection, type SqlDriver } from "./driver";
import { applyMigrations, verifySchema } from "./migrations";

function safe(error: unknown): CatalogError { return error instanceof CatalogError ? error : new CatalogError("UNAVAILABLE"); }
export async function migrateCatalog(config: DatabaseConfig): Promise<number[]> {
  let driver: SqlDriver | undefined;
  try { driver = createDriver(validateDatabaseConfig(config)); return await applyMigrations(driver); }
  catch (error) { throw error instanceof ApplicationError ? error : safe(error); }
  finally { await driver?.close().catch(() => undefined); }
}
export async function openCatalog(config: DatabaseConfig, clock: CatalogClock = { now: () => new Date(), id: randomUUID }): Promise<CatalogDatabase> {
  let driver: SqlDriver | undefined;
  try {
    driver = createDriver(validateDatabaseConfig(config));
    const connection = await driver.acquire();
    try { await verifySchema(connection, driver.kind); } finally { connection.release(); }
    return compose(driver, clock);
  } catch (error) { await driver?.close().catch(() => undefined); throw safe(error); }
}
function compose(driver: SqlDriver, clock: CatalogClock): CatalogDatabase {
  let queue: Promise<unknown> = Promise.resolve();
  let closing: Promise<void> | undefined;
  const context = new AsyncLocalStorage<boolean>();
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    if (context.getStore()) return Promise.reject(new CatalogError("TRANSACTION_SCOPE"));
    if (closing) return Promise.reject(new CatalogError("CLOSED"));
    const next = queue.then(work).catch(error => { throw safe(error); });
    queue = next.catch(() => undefined);
    return next;
  }
  const execute = <T>(work: (connection: SqlConnection) => Promise<T>) => enqueue(async () => {
    const connection = await driver.acquire();
    try { return await work(connection); } finally { connection.release(); }
  });
  return {
    games: catalogRepository(execute, clock),
    transaction<T>(work: (tx: CatalogTransaction) => Promise<T>): Promise<T> {
      return enqueue(async () => {
        const connection = await driver.acquire();
        let active = true, begun = false;
        let failure: unknown;
        const pending: Promise<unknown>[] = [];
        const tx = { games: catalogRepository(<R>(action: (c: SqlConnection) => Promise<R>): Promise<R> => {
          if (!active) return Promise.reject(new CatalogError("TRANSACTION_SCOPE"));
          const operation = action(connection).catch(error => { failure = safe(error); throw failure; });
          // Observar también operaciones no esperadas por el consumidor antes de COMMIT.
          pending.push(operation.catch(() => undefined));
          return operation;
        }, clock) };
        try {
          await connection.query(driver.kind === "sqlite" ? "BEGIN IMMEDIATE" : "BEGIN"); begun = true;
          const result = await context.run(true, () => work(tx));
          active = false;
          await Promise.all(pending);
          if (failure) throw failure;
          await connection.query("COMMIT"); begun = false;
          return result;
        } catch (error) {
          active = false; await Promise.all(pending);
          if (begun) await connection.query("ROLLBACK").catch(() => undefined);
          throw error;
        } finally { active = false; connection.release(); }
      });
    },
    close(): Promise<void> {
      if (context.getStore()) return Promise.reject(new CatalogError("TRANSACTION_SCOPE"));
      closing ??= queue.then(() => driver.close()).catch(error => { throw safe(error); });
      return closing;
    }
  };
}
