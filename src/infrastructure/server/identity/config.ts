export interface IdentityConfig { readonly secret: string; readonly publicOrigin: string }
export function validateIdentityConfig(config: IdentityConfig): void {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(config.secret) || new Set(config.secret).size < 16) throw new Error("TTRPG_AUTH_SECRET requiere un secreto aleatorio independiente de al menos 32 bytes en base64url.");
  let origin: URL;
  try { origin = new URL(config.publicOrigin); } catch { throw new Error("TTRPG_PUBLIC_ORIGIN inválido."); }
  if (origin.origin !== config.publicOrigin || !["http:", "https:"].includes(origin.protocol) || (origin.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) throw new Error("TTRPG_PUBLIC_ORIGIN requiere HTTPS fuera de loopback y un origen exacto.");
}
export function readIdentityConfig(env: NodeJS.ProcessEnv = process.env, required = false): IdentityConfig | undefined {
  const enabled = env.TTRPG_IDENTITY_ENABLED ?? "true";
  if (enabled !== "true") throw new Error("TTRPG_IDENTITY_ENABLED: retira el selector legado o usa true; configura TTRPG_AUTH_SECRET y ejecuta pnpm db:migrate.");
  void required;
  const config = { secret: env.TTRPG_AUTH_SECRET ?? "", publicOrigin: env.TTRPG_PUBLIC_ORIGIN ?? "" };
  validateIdentityConfig(config);
  if ([env.TTRPG_DM_KEY, env.TTRPG_PLAYER_KEY].includes(config.secret)) throw new Error("TTRPG_AUTH_SECRET debe ser independiente de las claves legadas.");
  return config;
}
