import { isAbsolute } from "node:path";
import { isIP } from "node:net";

export type Deployment = "local" | "production";
export type DatabaseConfig =
  | { driver: "sqlite"; deployment: Deployment; dataDir: string }
  | { driver: "postgres"; deployment: Deployment; url: string; tls: "verify-full" | "disable"; caFile?: string };
function invalid(variable: string): never { throw new Error(`${variable}: configuración de persistencia inválida.`); }
function loopback(host: string): boolean {
  return host === "localhost" || host === "[::1]" || (isIP(host) === 4 && host.split(".")[0] === "127");
}
export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const deployment = env.TTRPG_DEPLOYMENT ?? "local";
  const driver = env.TTRPG_DB_DRIVER ?? "sqlite";
  if (deployment !== "local" && deployment !== "production") invalid("TTRPG_DEPLOYMENT");
  if (driver !== "sqlite" && driver !== "postgres") invalid("TTRPG_DB_DRIVER");
  if (deployment === "production" && (driver !== "postgres" || env.TTRPG_DB_DRIVER !== "postgres")) invalid("TTRPG_DB_DRIVER");
  if (driver === "sqlite") {
    if (env.TTRPG_DATABASE_URL !== undefined || env.TTRPG_DB_TLS !== undefined || env.TTRPG_DB_CA_FILE !== undefined) invalid("TTRPG_DB_DRIVER");
    const dataDir = env.TTRPG_DATA_DIR ?? "";
    if (!isAbsolute(dataDir)) invalid("TTRPG_DATA_DIR");
    return { driver, deployment, dataDir };
  }
  const value = env.TTRPG_DATABASE_URL ?? "";
  let url: URL;
  try { url = new URL(value); } catch { invalid("TTRPG_DATABASE_URL"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || !/^\/[^/]+$/.test(url.pathname) || url.search || url.hash || /[?#]/.test(value)) invalid("TTRPG_DATABASE_URL");
  try {
    for (const part of [url.username, url.password, url.pathname.slice(1)]) {
      if ([...decodeURIComponent(part)].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) invalid("TTRPG_DATABASE_URL");
    }
  } catch { invalid("TTRPG_DATABASE_URL"); }
  if (url.port && (!Number.isInteger(Number(url.port)) || Number(url.port) < 1 || Number(url.port) > 65535)) invalid("TTRPG_DATABASE_URL");
  const tls = env.TTRPG_DB_TLS ?? "verify-full";
  if (tls !== "verify-full" && tls !== "disable") invalid("TTRPG_DB_TLS");
  if (tls === "disable" && (deployment !== "local" || !loopback(url.hostname))) invalid("TTRPG_DB_TLS");
  const caFile = env.TTRPG_DB_CA_FILE;
  if (caFile !== undefined && (tls !== "verify-full" || !isAbsolute(caFile))) invalid("TTRPG_DB_CA_FILE");
  return { driver, deployment, url: value, tls, ...(caFile === undefined ? {} : { caFile }) };
}
export function validateDatabaseConfig(config: DatabaseConfig): DatabaseConfig {
  return readDatabaseConfig(config.driver === "sqlite" ? {
    TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, TTRPG_DATA_DIR: config.dataDir
  } : {
    TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, TTRPG_DATABASE_URL: config.url,
    TTRPG_DB_TLS: config.tls, TTRPG_DB_CA_FILE: config.caFile
  });
}
export function assertLegacyDatabase(config: Pick<DatabaseConfig, "driver" | "deployment">): void {
  if (config.deployment !== "local" || config.driver !== "sqlite") {
    throw new Error("TTRPG_DB_DRIVER/TTRPG_DEPLOYMENT: la API legada solo admite local + sqlite. Falta migrar el almacenamiento funcional; db:migrate sí admite PostgreSQL.");
  }
}
