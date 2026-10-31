import { LoginQuota } from "../infrastructure/server/identity/password";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { IdentityError, type IdentityService, type DmAction } from "../application/services/identity";
import { json } from "./request-body";
import { HttpError } from "./errors";
const login = z.object({ email: z.string().max(254), password: z.string().max(256) }).strict();
const create = login.extend({ name: z.string().max(200) });
const password = z.object({ currentPassword: z.string().max(256), newPassword: z.string().max(256) }).strict();
const temporary = z.object({ password: z.string().max(256) }).strict();
const empty = z.object({}).strict();
const statuses = { INVALID_INPUT: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, PASSWORD_CHANGE_REQUIRED: 403, CONFLICT: 409, NOT_FOUND: 404, RATE_LIMITED: 429, UNAVAILABLE: 503 } as const;
function send(res: ServerResponse, status: number, value?: unknown) {
  res.statusCode = status;
  if (value !== undefined) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); } else res.end();
}
export function createIdentityHttp(identity: IdentityService, origin: string) {
  const credentialQuota = new LoginQuota();
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (req.headers.host !== new URL(origin).host) throw new HttpError(403, "INVALID_HOST", "El host no está permitido.");
      if ((req.headers.origin !== undefined && req.headers.origin !== origin) || (req.method !== "GET" && req.headers.origin !== origin)) throw new HttpError(403, "INVALID_ORIGIN", "El origen no está permitido.");
      const url = new URL(req.url ?? "/", origin), path = url.pathname.slice("/api/v1/identity".length), cookie = req.headers.cookie ?? "";
      if (!url.pathname.startsWith("/api/v1/identity/")) throw new HttpError(404, "NOT_FOUND", "La ruta no existe.");
      const allowed = path === "/session" ? ["GET"] : path === "/admin/dms" ? ["GET", "POST"] : ["POST"];
      if (!allowed.includes(req.method ?? "")) throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible.");
      if ([...url.searchParams.keys()].some(key => path !== "/admin/dms" || req.method !== "GET" || !["limit", "offset"].includes(key)) || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length > 1)) throw new IdentityError("INVALID_INPUT");
      const rate = (identifier: string) => credentialQuota.consume(req.socket.remoteAddress ?? "unknown", identifier);
      const payload = async <T>(schema: z.ZodType<T>): Promise<T> => { const result = schema.safeParse(await json(req, res, 8192)); if (!result.success) throw new IdentityError("INVALID_INPUT"); return result.data; };
      if (path === "/login") {
        const input = await payload(login); rate(input.email.trim().toLowerCase()); const result = await identity.login(input.email, input.password, req.socket.remoteAddress ?? "unknown");
        res.setHeader("Set-Cookie", result.cookie); send(res, 200, { ok: true, ...result.identity }); return;
      }
      if (path === "/session") { send(res, 200, { ok: true, ...await identity.session(cookie) }); return; }
      if (path === "/logout" || path === "/logout-all") {
        await payload(empty); await identity.logout(cookie, path === "/logout-all"); res.setHeader("Set-Cookie", identity.clearCookie()); send(res, 204); return;
      }
      if (path === "/password") {
        await identity.session(cookie); const input = await payload(password);
        rate("password:" + (await identity.session(cookie)).account.id);
        await identity.changePassword(cookie, input.currentPassword, input.newPassword); res.setHeader("Set-Cookie", identity.clearCookie()); send(res, 204); return;
      }
      if (path === "/admin/dms" || /^\/admin\/dms\/[^/]+\/(disable|enable|password|revoke-sessions)$/.test(path)) {
        // Antes del cuerpo y otra vez dentro de la transacción al confirmar.
        await identity.authorized(cookie, "admin", async () => undefined);
        if (path === "/admin/dms") {
          if (req.method === "GET") {
            const integer = (key: string, fallback: number) => { const raw = url.searchParams.get(key); if (raw !== null && !/^\d+$/.test(raw)) throw new IdentityError("INVALID_INPUT"); return raw === null ? fallback : Number(raw); };
            send(res, 200, { ok: true, ...await identity.listDms(cookie, integer("limit", 50), integer("offset", 0)) });
          } else { const input = await payload(create); rate(input.email.trim().toLowerCase()); send(res, 201, { ok: true, account: await identity.createDm(cookie, input) }); }
          return;
        }
        const [, , , id, action] = path.split("/");
        if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new IdentityError("INVALID_INPUT");
        const input = action === "password" ? await payload(temporary) : (await payload(empty), undefined);
        if (action === "password") rate("reset:" + id);
        await identity.administer(cookie, id, action as DmAction, input?.password); send(res, 204); return;
      }
      throw new HttpError(404, "NOT_FOUND", "La ruta no existe.");
    } catch (error) {
      const failure = error instanceof IdentityError ? { status: statuses[error.code], code: error.code, message: error.message } : error instanceof HttpError ? error : { status: 503, code: "UNAVAILABLE", message: "No se pudo completar la operación de identidad." };
      if (!req.complete) res.setHeader("Connection", "close");
      if (failure.status === 429) res.setHeader("Retry-After", "60");
      send(res, failure.status, { ok: false, error: { code: failure.code, message: failure.message } });
    }
  };
}
