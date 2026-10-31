import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { InvitationError, type InvitationService } from "../application/services/invitations";
import { IdentityError, type IdentityService } from "../application/services/identity";
import { OwnedError } from "../application/services/owned-store";
import { CatalogError } from "../application/services/game-catalog";
import { HttpError } from "./errors";
import { json } from "./request-body";
import { admissionSchema, canonicalUuid, openingContextSchema, rotateSchema, secretSchema, startSchema } from "../shared/contracts/invitations";
export function guestCookie(game: string, token: string, secure: boolean) { return `ttrpg_guest=${token}; Path=/api/v1/games/${game}/; HttpOnly; SameSite=Strict; Max-Age=${token ? 28800 : 0}${secure ? "; Secure" : ""}`; }
export function readGuestCookie(raw: string): string | null {
  if (raw.length > 8192) throw new InvitationError("INVALID_INPUT");
  const values = raw.split(";").map(v => v.trim()).filter(v => v.split("=", 1)[0] === "ttrpg_guest");
  if (values.length > 1) throw new InvitationError("INVALID_INPUT");
  if (!values.length) return null;
  const token = values[0].slice("ttrpg_guest=".length); if (!secretSchema.safeParse(token).success) throw new InvitationError("GUEST_UNAUTHORIZED"); return token;
}
export class AdmissionQuota {
  private readonly entries = new Map<string, { count: number; until: number }>();
  constructor(private readonly now = Date.now, private readonly capacity = 10000) {}
  consume(peer: string, game: string): void {
    const at = this.now(); for (const [key, value] of this.entries) if (value.until <= at) this.entries.delete(key);
    const keys = [[`ip:${peer}`, 10], [`game:${game}`, 60]] as const;
    if (this.entries.size + keys.filter(([key]) => !this.entries.has(key)).length > this.capacity) throw new InvitationError("RATE_LIMITED", new Date(at + 60000).toISOString());
    let blocked = false;
    for (const [key, limit] of keys) { const value = this.entries.get(key) ?? { count: 0, until: at + 60000 }; value.count = Math.min(value.count + 1, limit + 1); this.entries.set(key, value); blocked ||= value.count > limit; }
    if (blocked) throw new InvitationError("RATE_LIMITED", new Date(at + 60000).toISOString());
  }
  get size() { return this.entries.size; }
}
const statuses = { INVALID_INPUT: 400, INVITATION_UNAVAILABLE: 401, GUEST_UNAUTHORIZED: 401, HOST_UNAVAILABLE: 409, REVISION_CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, ADMISSION_ALREADY_PROCESSED: 409, ALIAS_CONFLICT: 409, RATE_LIMITED: 429, UNAVAILABLE: 503 } as const;
export function isInvitationPath(path: string) { return /^\/api\/v1\/games\//.test(path) || /^\/api\/v1\/dm\/games\/[^/]+\/(opening|invitation)(\/|$)/.test(path); }
export function createInvitationHttp(service: InvitationService, identity: IdentityService, origin: string, now = Date.now) {
  const quota = new AdmissionQuota(now); let inFlight = 0;
  const send = (res: ServerResponse, status: number, value?: unknown) => { res.statusCode = status; if (value !== undefined) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); } else res.end(); };
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"); res.setHeader("Referrer-Policy", "no-referrer");
    let entered = false;
    try {
      if (req.headers.host !== new URL(origin).host) throw new HttpError(403, "INVALID_HOST", "El host no está permitido.");
      if (req.headers.origin !== undefined && req.headers.origin !== origin || req.method !== "GET" && req.headers.origin !== origin) throw new HttpError(403, "INVALID_ORIGIN", "El origen no está permitido.");
      const path = (req.url ?? "").split("?")[0], match = /^\/api\/v1\/(dm\/)?games\/([^/]+)\/(.+)$/.exec(path);
      if (!match) throw new HttpError(404, "NOT_FOUND", "La ruta no existe.");
      const [, dm, game, action] = match;
      if (!dm && action === "admission") quota.consume(req.socket.remoteAddress ?? "unknown", game.slice(0, 128));
      if (inFlight >= 64) throw new InvitationError("RATE_LIMITED"); inFlight++; entered = true;
      if (!canonicalUuid.safeParse(game).success || new URL(req.url!, origin).search || /[%\\\0]/.test(path)) throw new InvitationError("INVALID_INPUT");
      const cookie = req.headers.cookie ?? ""; if (cookie.length > 8192) throw new InvitationError("INVALID_INPUT");
      // Rechazar credenciales ambiguas también antes de la lectura Better Auth.
      const names = cookie.split(";").map(p => p.trim().split("=", 1)[0]).filter(Boolean); if (new Set(names).size !== names.length) throw new InvitationError("INVALID_INPUT");
      if (dm) await identity.authorized(cookie, "dm", async () => undefined);
      const read = async <T>(schema: z.ZodType<T>) => { const result = schema.safeParse(await json(req, res, 8192)); if (!result.success) throw new InvitationError("INVALID_INPUT"); return result.data; };
      const revision = () => { const raw = req.headers["if-match"]; if (typeof raw !== "string" || !/^(?:[1-9][0-9]*|"[1-9][0-9]*")$/.test(raw)) throw new InvitationError("INVALID_INPUT"); const value = Number(raw.replaceAll('"', "")); if (!Number.isSafeInteger(value)) throw new InvitationError("INVALID_INPUT"); return value; };
      const key = () => { const result = canonicalUuid.safeParse(req.headers["idempotency-key"]); if (!result.success) throw new InvitationError("INVALID_INPUT"); return result.data; };
      if (req.method === "GET") {
        if (dm && action === "opening") { send(res, 200, { ok: true, ...await service.status(cookie, game) }); return; }
        if (!dm && action === "guest/session") { const guest = await service.guests.authorized(game, readGuestCookie(cookie), async value => value); send(res, 200, { ok: true, ...guest }); return; }
        throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible.");
      }
      if (req.method !== "POST") throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible.");
      if (dm) {
        if (action === "opening/start" || action === "opening/reopen") { const input = await read(startSchema), result = await service.start(cookie, game, input.expectedOpening, revision(), key(), action.endsWith("reopen")); send(res, result.replayed ? 200 : 201, { ok: true, ...result }); return; }
        if (action === "opening/heartbeat") { const input = await read(openingContextSchema); send(res, 200, { ok: true, ...await service.heartbeat(cookie, game, input) }); return; }
        if (action === "invitation/rotate") { const input = await read(rotateSchema); send(res, 200, { ok: true, ...await service.rotate(cookie, game, input, revision(), key()) }); return; }
        if (action === "opening/close") { const input = await read(openingContextSchema); await service.end(cookie, game, input, revision(), key()); send(res, 204); return; }
      } else {
        if (action === "admission") { const input = await read(admissionSchema), result = await service.guests.admit(game, input, key(), readGuestCookie(cookie)); if (result.token) res.setHeader("Set-Cookie", guestCookie(game, result.token, origin.startsWith("https:"))); send(res, result.replayed ? 200 : 201, { ok: true, ...result.guest, replayed: result.replayed }); return; }
        if (action === "guest/leave") { await read(z.object({}).strict()); await service.guests.leave(game, readGuestCookie(cookie)); res.setHeader("Set-Cookie", guestCookie(game, "", origin.startsWith("https:"))); send(res, 204); return; }
      }
      throw new HttpError(404, "NOT_FOUND", "La ruta no existe.");
    } catch (error) {
      const status = error instanceof InvitationError ? statuses[error.code] : error instanceof IdentityError ? ({ UNAUTHORIZED: 401, FORBIDDEN: 403, PASSWORD_CHANGE_REQUIRED: 403 }[error.code as "UNAUTHORIZED"] ?? 503) : error instanceof OwnedError ? ({ NOT_FOUND: 404, FORBIDDEN: 403, CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, OPERATION_BUDGET: 429, VALIDATION: 400 }[error.code as "NOT_FOUND"] ?? 503) : error instanceof CatalogError && error.code === "REVISION_CONFLICT" ? 409 : error instanceof HttpError ? error.status : 503;
      const code = error instanceof OwnedError && error.code === "CONFLICT" ? "REVISION_CONFLICT" : status === 503 ? "UNAVAILABLE" : error instanceof Error && "code" in error ? String(error.code) : "UNAVAILABLE";
      if (!req.complete) res.setHeader("Connection", "close");
      const retryAt = error instanceof InvitationError || error instanceof OwnedError ? error.retryAt : undefined;
      if (status === 429) res.setHeader("Retry-After", String(retryAt ? Math.max(1, Math.ceil((Date.parse(retryAt) - now()) / 1000)) : 60));
      send(res, status, { ok: false, error: { code, message: status === 503 ? "No se pudo completar la operación. Consulta el estado antes de reintentar." : code === "FORBIDDEN" ? "Esta operación requiere al DM propietario de la partida." : (error as Error).message, ...(retryAt ? { retryAt } : {}) } });
    } finally { if (entered) inFlight--; }
  };
}
