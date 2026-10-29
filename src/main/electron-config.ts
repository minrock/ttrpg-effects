import { isIP } from "node:net";

export type ElectronConfig = { mode: "local" } | { mode: "service"; origin: string };
export function isLoopback(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  return isIP(hostname) === 4 && hostname.split(".")[0] === "127";
}
export function serviceOrigin(value: string | undefined): string {
  let url: URL;
  try { url = new URL(value ?? ""); } catch { throw new Error("TTRPG_SERVICE_URL requiere un origen válido."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash || /[?#]/.test(value ?? "")) {
    throw new Error("TTRPG_SERVICE_URL debe contener solo esquema, host y puerto.");
  }
  if (url.protocol !== "https:" && !isLoopback(url.hostname)) throw new Error("TTRPG_SERVICE_URL remoto requiere HTTPS.");
  return url.origin;
}
export function readElectronConfig(env: NodeJS.ProcessEnv = process.env): ElectronConfig {
  const mode = env.TTRPG_ELECTRON_MODE ?? "local";
  if (mode === "local") return { mode };
  if (mode === "service") return { mode, origin: serviceOrigin(env.TTRPG_SERVICE_URL) };
  throw new Error("TTRPG_ELECTRON_MODE debe ser local o service.");
}
