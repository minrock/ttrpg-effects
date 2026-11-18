/** Una visita local no contiene fichas, portadas ni ningún otro dato de campaña. */
export interface RecentArcVisit {
  readonly arcId: string;
  readonly visitedAt: string;
}

export const RECENT_ARC_WINDOW_MS = 15 * 24 * 60 * 60 * 1_000;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecentArcId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : null;
}

/**
 * Lee una visita que todavía puede resaltar una tarjeta. Una fecha futura, una
 * fecha inválida y el límite exacto de 15 días no son recientes.
 */
export function readRecentArc(value: unknown, now: number = Date.now()): RecentArcVisit | null {
  if (!Number.isFinite(now) || typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<RecentArcVisit>;
  const arcId = candidate.arcId;
  const visitedAt = candidate.visitedAt;
  const visitTimestamp = timestamp(visitedAt);
  if (!isRecentArcId(arcId) || typeof visitedAt !== "string" || visitTimestamp === null) return null;
  const age = now - visitTimestamp;
  if (age < 0 || age >= RECENT_ARC_WINDOW_MS) return null;
  return { arcId, visitedAt };
}

export function isRecentArc(value: unknown, arcId: string, now: number = Date.now()): boolean {
  return readRecentArc(value, now)?.arcId === arcId;
}
