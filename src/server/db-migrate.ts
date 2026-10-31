import { DataError } from "../infrastructure/server/owned/transfer-errors";
import { readDatabaseConfig } from "../infrastructure/server/database/config";
import { migrateCatalog } from "../infrastructure/server/database";
import { CatalogError } from "../application/services/game-catalog";

async function main(): Promise<void> {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("El servicio requiere Node.js 24.");
  const config = readDatabaseConfig();
  const applied = await migrateCatalog(config);
  process.stdout.write(`Catálogo ${config.driver}: ${applied.length ? `migraciones ${applied.join(", ")} aplicadas` : "sin migraciones pendientes"}.\n`);
}
void main().catch((error: unknown) => {
  const message = error instanceof DataError ? `[${error.code}] ${error.message}` : error instanceof CatalogError ? error.message : error instanceof Error && /^(TTRPG_|El servicio)/.test(error.message) ? error.message : "No se pudieron aplicar las migraciones. Comprueba configuración y acceso.";
  process.stderr.write(`${message}\n`); process.exitCode = 1;
});
