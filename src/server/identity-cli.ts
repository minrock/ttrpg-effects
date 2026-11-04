import { readDatabaseConfig } from "../infrastructure/server/database/config";
import { readIdentityConfig } from "../infrastructure/server/identity/config";
import { openIdentity } from "../infrastructure/server/identity";
import { IdentityError } from "../application/services/identity";
import { CatalogError } from "../application/services/game-catalog";
import { IdentityCommandError, runIdentityCommand } from "./identity-commands";
import { terminalPrompts, PromptCancelled } from "./identity-prompts";
async function main() {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("El servicio requiere Node.js 24.");
  if (process.argv.length !== 3 || !["bootstrap", "create-admin", "provision-dm", "recover-admin", "password"].includes(process.argv[2])) throw new Error("Usa los comandos pnpm identity:* sin argumentos adicionales.");
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Se requiere una terminal TTY interactiva; no se admiten contraseñas por pipe, argumentos ni variables.");
  const identity = await openIdentity(readDatabaseConfig(), readIdentityConfig(process.env, true)!);
  try { await runIdentityCommand(process.argv[2], identity, terminalPrompts()); } finally { await identity.close(); }
}
void main().catch((error: unknown) => {
  const allowed = error instanceof IdentityCommandError || error instanceof IdentityError || error instanceof CatalogError || error instanceof PromptCancelled || error instanceof Error && /^(TTRPG_|El servicio|Usa los|Se requiere|Las contraseñas|Primero ejecuta|La provisión|Entrada demasiado)/.test(error.message);
  process.stderr.write((allowed && error instanceof Error ? error.message : "No se pudo completar la operación. Comprueba configuración, migraciones y acceso; vuelve a intentarlo.") + "\n"); process.exitCode = 1;
});
