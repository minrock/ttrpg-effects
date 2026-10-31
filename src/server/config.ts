import { readIdentityConfig, validateIdentityConfig, type IdentityConfig } from "../infrastructure/server/identity/config";
import { assertLegacyDatabase, readDatabaseConfig, validateDatabaseConfig, type DatabaseConfig } from "../infrastructure/server/database/config";
import { isAbsolute } from "node:path";

export const LIMITS = {
  jsonBytes: 10 * 1024 * 1024, imageBytes: 20 * 1024 * 1024, loginBytes: 4096,
  imagePixels: 40_000_000, imageDecodeSeconds: 15, imageDecodes: 2, sessionMs: 8 * 60 * 60 * 1000, sessions: 1000,
  loginPerMinute: 10, requestsPerMinute: 600, rateEntries: 10_000,
  headersMs: 10_000, bodyMs: 30_000
} as const;
export interface ServerConfig {
  readonly database?: DatabaseConfig;
  readonly identity?: IdentityConfig;
  readonly webDir?: string;
  readonly host: string; readonly port: number; readonly dataDir: string;
  readonly publicOrigin: string; readonly dmKey: string; readonly playerKey: string;
}
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const database = readDatabaseConfig(env);
  assertLegacyDatabase(database);
  const config = {
    database, identity: readIdentityConfig(env),
    webDir: env.TTRPG_WEB_DIR,
    host: env.TTRPG_HOST ?? "127.0.0.1", port: Number(env.TTRPG_PORT ?? "8787"),
    dataDir: env.TTRPG_DATA_DIR ?? "", publicOrigin: env.TTRPG_PUBLIC_ORIGIN ?? "",
    dmKey: env.TTRPG_DM_KEY ?? "", playerKey: env.TTRPG_PLAYER_KEY ?? ""
  };
  validateConfig(config);
  return config;
}
export function validateConfig(c: ServerConfig): void {
  if (c.identity) { validateIdentityConfig(c.identity); if (c.identity.publicOrigin !== c.publicOrigin || [c.dmKey, c.playerKey].includes(c.identity.secret)) throw new Error("TTRPG_AUTH_SECRET/origen debe ser independiente y coherente."); }
  assertLegacyDatabase(c.database ? validateDatabaseConfig(c.database) : { driver: "sqlite", deployment: "local" });
  if (c.webDir !== undefined && !isAbsolute(c.webDir)) throw new Error("TTRPG_WEB_DIR debe ser absoluto.");
  if (!c.host || !Number.isInteger(c.port) || c.port < 0 || c.port > 65535) throw new Error("TTRPG_HOST/TTRPG_PORT inválidos.");
  if (!isAbsolute(c.dataDir)) throw new Error("TTRPG_DATA_DIR debe ser una ruta absoluta exclusiva del servicio.");
  if (c.dmKey.length < 32 || c.playerKey.length < 32 || c.dmKey === c.playerKey || c.dmKey.length > 1024 || c.playerKey.length > 1024) {
    throw new Error("TTRPG_DM_KEY y TTRPG_PLAYER_KEY deben ser distintas y contener entre 32 y 1024 caracteres.");
  }
  let origin: URL;
  try { origin = new URL(c.publicOrigin); } catch { throw new Error("TTRPG_PUBLIC_ORIGIN es obligatorio y debe ser un origen válido."); }
  if (origin.origin !== c.publicOrigin || !["http:", "https:"].includes(origin.protocol)) throw new Error("TTRPG_PUBLIC_ORIGIN debe contener solo esquema, host y puerto.");
  if (origin.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new Error("Un origen remoto requiere HTTPS mediante proxy inverso.");
}
