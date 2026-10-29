import { readConfig } from "./config";
import { createApi } from "./http";
import { version } from "../../package.json";

async function main(): Promise<void> {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("El servicio requiere Node.js 24.");
  const config = readConfig(); const api = createApi(config, { version });
  try { await api.listen(); } catch { await api.close(); throw new Error("No se pudo iniciar el servicio. Comprueba el puerto y el almacenamiento."); }
  process.stdout.write(`TTRPG Effects API ${version} lista.\n`);
  let stopping = false;
  const stop = () => { if (stopping) return; stopping = true; void api.close().then(() => process.exit(0)); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
void main().catch((error: unknown) => {
  // Los mensajes nombran variables; nunca registran rutas ni detalles de SQL.
  const message = error instanceof Error && /^(TTRPG_|Un origen|El servicio|No se pudo iniciar)/.test(error.message) ? error.message : "No se pudo abrir el almacenamiento exclusivo del servicio. Comprueba permisos, bloqueo y archivos.";
  process.stderr.write(`${message}\n`); process.exitCode = 1;
});
