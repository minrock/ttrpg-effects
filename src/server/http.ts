import { isModerationPath } from "./moderation-http";
import { isInvitationPath } from "./invitation-http";
import { createServer } from "node:http";
import { openModerationBackend } from "./moderation-backend";
import { validateServiceConfig, LIMITS, type ServerConfig } from "./config";
import { createStaticHandler } from "./static-files";
import { HttpError, missing } from "./errors";
/** Único listener del producto: autoridad contextual, sin ServiceStore ni claves globales. */
export async function openServiceApi(config: ServerConfig, version: string) {
  validateServiceConfig(config);
  const serve = config.webDir ? createStaticHandler(config.webDir) : null;
  const backend = await openModerationBackend(config.database, config.identity);
  const rates=new Map<string,{count:number;until:number}>();
  const server = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    void (async () => {
      if (req.headers.host !== new URL(config.publicOrigin).host) throw new HttpError(403, "INVALID_HOST", "Host no permitido.");
      if (req.headers.origin !== undefined && req.headers.origin !== config.publicOrigin || !["GET", "HEAD"].includes(req.method ?? "GET") && req.headers.origin !== config.publicOrigin) throw new HttpError(403, "INVALID_ORIGIN", "Origen no permitido.");
      const raw = (req.url ?? "/").split("?")[0];
      let path: string; try { path = decodeURIComponent(raw); } catch { throw missing(); }
      if (/%(?:2f|5c)/i.test(raw) || /[%\\\0]/.test(path) || path.split("/").some(p => p === "." || p === "..")) throw missing();
      // Mesa y admisión conservan las cuotas y reserva DM de sus handlers.
      if(!isModerationPath(path)&&!isInvitationPath(path)){
      const at=Date.now();for(const [key,value] of rates)if(value.until<=at)rates.delete(key);
      const peer=req.socket.remoteAddress??"unknown",rate=rates.get(peer)??{count:0,until:at+60000};
      if(!rates.has(peer)&&rates.size>=LIMITS.rateEntries||++rate.count>LIMITS.requestsPerMinute){res.setHeader("Retry-After","60");throw new HttpError(429,"RATE_LIMITED","Espera un minuto antes de reintentar.");}rates.set(peer,rate);
      }
      if (path === "/api/v1/health" && req.method === "GET" && !req.url?.includes("?")) {
        res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true, status: "ok", version })); return;
      }
      if (path.startsWith("/api/v1/identity/") || path.startsWith("/api/v1/dm/") || path.startsWith("/api/v1/games/") || path.startsWith("/api/v1/admin/systems")) { await backend.handler(req, res); return; }
      if (path.startsWith("/api") || !serve) throw missing();
      serve(req, res, path);
    })().catch((error: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      const failure = error instanceof HttpError ? error : new HttpError(503, "UNAVAILABLE", "Servicio no disponible. Reintenta.");
      if (!req.complete) res.setHeader("Connection", "close");
      res.writeHead(failure.status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: { code: failure.code, message: failure.message } }));
    });
  });
  server.headersTimeout = LIMITS.headersMs; server.requestTimeout = LIMITS.bodyMs; server.keepAliveTimeout = 5000;
  server.maxConnections = 100; server.maxRequestsPerSocket = 100;
  let closed = false;
  return { server, backend,
    async listen() { await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(config.port, config.host, () => { server.off("error", reject); resolve(); }); }); const address = server.address(); if (!address || typeof address === "string") throw new Error("No se pudo iniciar el servicio."); return address.port; },
    async close() { if (closed) return; closed = true; await backend.close(); await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
  };
}
