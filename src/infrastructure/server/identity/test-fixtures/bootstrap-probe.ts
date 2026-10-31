import { readDatabaseConfig } from "../../database/config";
import { readIdentityConfig } from "../config";
import { openIdentity } from "../index";
async function main() {
  const service = await openIdentity(readDatabaseConfig(), readIdentityConfig(process.env, true)!);
  try {
    await service.bootstrap({ email: "race-admin@example.test", name: "Prueba de carrera", password: "synthetic bootstrap phrase" });
    process.stdout.write("BOOTSTRAP_CREATED\n");
  } finally { await service.close(); }
}
void main().catch(() => { process.stdout.write("BOOTSTRAP_REJECTED\n"); });
