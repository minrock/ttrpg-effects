/** Valores del contrato009; el reloj pertenece al servidor. */
export const FRESH_MS = 30_000, LEASE_MS = 150_000, ACCESS_MS = 8 * 3_600_000;
export function normalizeAlias(value: string): string {
  const alias = value.trim().normalize("NFC");
  if (!alias || [...alias].length > 40 || new TextEncoder().encode(alias).length > 160 || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) throw new Error("Alias inválido");
  return alias;
}
export function presenceState(opening: { state: string; lastHeartbeatAt: string; leaseExpiresAt: string }, now: number, present: boolean): "fresh" | "reconnecting" | "expired" {
  if (opening.state !== "open" || now >= Date.parse(opening.leaseExpiresAt)) return "expired";
  return present && now < Date.parse(opening.lastHeartbeatAt) + FRESH_MS ? "fresh" : "reconnecting";
}
