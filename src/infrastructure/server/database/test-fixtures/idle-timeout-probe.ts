// Subproceso de regresión: no se publica como entrada de aplicación.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { CatalogError } from "../../../../application/services/game-catalog";
import { migrateCatalog, openCatalog } from "../index";
import { readDatabaseConfig } from "../config";

async function run(): Promise<void> {
  const config = readDatabaseConfig();
  await migrateCatalog(config);
  const db = await openCatalog(config);
  let rejected = false;
  try {
    try {
      await db.transaction(async tx => {
        await tx.games.create("timeout-probe", "No debe persistir");
        // Política real del driver: 10 s. No cambiar la configuración del servidor.
        await delay(11_000);
      });
    } catch (error) {
      assert(error instanceof CatalogError);
      assert.equal(error.code, "UNAVAILABLE");
      assert.equal(error.message, new CatalogError("UNAVAILABLE").message);
      rejected = true;
    }
    assert(rejected, "El COMMIT no debe confirmar después de perder la conexión");
    assert.equal((await db.games.list("timeout-probe")).total, 0);
    await db.transaction(async tx => { await tx.games.create("timeout-probe", "Recuperada"); });
  } finally { await db.close(); await db.close(); }
  const reopened = await openCatalog(config);
  try {
    const rows = await reopened.games.list("timeout-probe");
    assert.equal(rows.total, 1);
    assert.equal(rows.games[0].name, "Recuperada");
  } finally { await reopened.close(); }
  process.stdout.write("TIMEOUT_RECOVERED_ROLLBACK_CLOSED\n");
}
void run().catch(() => {
  // El padre verifica exit/stdout/stderr; no imprimir objetos ni secretos del fixture.
  process.stderr.write("Falló la regresión aislada del timeout.\n");
  process.exitCode = 1;
});
