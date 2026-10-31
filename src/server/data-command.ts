import { readFileSync } from "node:fs";
import { backupLegacy, restoreLegacy, exportLegacy, exportOwned, inspectTransfer, importTransfer, verifyTransfer } from "../infrastructure/server/owned/transfer";
import { DataError } from "../infrastructure/server/owned/transfer-errors";
import { readDatabaseConfig } from "../infrastructure/server/database/config";
export const dataUsage = "Uso: pnpm data backup-legacy|restore-legacy|export-legacy --source DIRECTORIO --target NUEVO; export-owned --target NUEVO; inspect --bundle PAQUETE; import|verify --bundle PAQUETE [--owner DM --game-name PARTIDA | --owner-map ARCHIVO].";
export async function runDataCommand(argv: string[], signal?: AbortSignal): Promise<unknown> {
  const [command, ...args] = argv;
  const allowed: Record<string, string[]> = { "backup-legacy": ["--source", "--target"], "restore-legacy": ["--source", "--target"], "export-legacy": ["--source", "--target"], "export-owned": ["--target"], inspect: ["--bundle"], import: ["--bundle", "--owner", "--game-name", "--owner-map"], verify: ["--bundle", "--owner", "--owner-map"] };
  if (!allowed[command] || args.length % 2) throw new DataError("USAGE");
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) { if (!allowed[command].includes(args[i]) || options[args[i]] || !args[i + 1] || args[i + 1].startsWith("--")) throw new DataError("USAGE"); options[args[i]] = args[i + 1]; }
  const required = (key: string) => { if (!options[key]) throw new DataError("USAGE"); return options[key]; };
  if (signal?.aborted) throw new DataError("CANCELLED");
  if (command === "backup-legacy") return backupLegacy(required("--source"), required("--target"));
  if (command === "restore-legacy") return restoreLegacy(required("--source"), required("--target"));
  if (command === "export-legacy") return exportLegacy(required("--source"), required("--target"));
  if (command === "export-owned") { const target = required("--target"); return exportOwned(readDatabaseConfig(), target); }
  const bundle = required("--bundle");
  if (command === "inspect") { const result = await inspectTransfer(bundle); return { version: result.version, dataset: result.dataset, counts: result.counts }; }
  if (options["--owner-map"] && (options["--owner"] || options["--game-name"])) throw new DataError("USAGE");
  const ownerMap: unknown = options["--owner-map"] ? JSON.parse(readFileSync(options["--owner-map"], "utf8")) : undefined;
  if (ownerMap !== undefined && (ownerMap === null || typeof ownerMap !== "object" || Array.isArray(ownerMap) || Object.values(ownerMap).some(v => typeof v !== "string"))) throw new DataError("OWNER_INVALID");
  const settings = { owner: options["--owner"], gameName: options["--game-name"], ownerMap: ownerMap as Record<string, string> | undefined, signal };
  return command === "verify" ? verifyTransfer(readDatabaseConfig(), bundle, settings) : importTransfer(readDatabaseConfig(), bundle, settings);
}
