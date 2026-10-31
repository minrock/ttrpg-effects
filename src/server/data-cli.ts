import { runDataCommand, dataUsage } from "./data-command";
import { dataDiagnostic, dataFailure } from "../infrastructure/server/owned/transfer-errors";
const controller = new AbortController();
const cancel = () => controller.abort();
process.once("SIGINT", cancel); process.once("SIGTERM", cancel);
try {
  const result = await runDataCommand(process.argv.slice(2), controller.signal);
  if (result !== undefined) console.log(JSON.stringify(result));
  console.log("Operación de datos completada. La configuración y las credenciales se conservan por separado.");
} catch (error) {
  const failure = dataFailure(error);
  console.error(dataDiagnostic(failure));
  if (failure.code === "USAGE") console.error(dataUsage);
  process.exitCode = failure.code === "CANCELLED" ? 130 : 1;
} finally { process.removeListener("SIGINT", cancel); process.removeListener("SIGTERM", cancel); }
