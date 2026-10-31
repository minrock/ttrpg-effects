import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { TableSession } from "../application/services/table-session";
import { type TableEvent } from "../shared/contracts/table";
import type { Auth } from "./auth";
import { HttpError, invalid, missing } from "./errors";
import { executeTableCommand } from "./table-actions";
import type { ServiceRole } from "../shared/contracts/http-api";

const dmOnly = () => new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
export function createTableHttp(auth: Auth, now: () => number, publicOrigin: string) {
  const table = new TableSession(now, randomUUID);
  const streams = new Map<string, () => void>();
  const owner = (req: IncomingMessage) => createHash("sha256").update(auth.token(req)).digest("hex");
  function stream(req: IncomingMessage, res: ServerResponse, role: ServiceRole) {
    const cursor = req.headers["last-event-id"];
    if (cursor !== undefined && (typeof cursor !== "string" || !/^[a-f0-9-]{36}:(dm|player):\d{1,16}$/.test(cursor))) throw invalid("Cursor inválido.");
    const key = owner(req);
    streams.get(key)?.();
    if (streams.size >= 64) throw new HttpError(429, "RATE_LIMITED", "La mesa admite hasta 64 conexiones.");
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    let closed = false;
    const drains = new Set<ReturnType<typeof setTimeout>>();
    const close = () => { if (closed) return; closed = true; clearInterval(heartbeat); for (const timer of drains) clearTimeout(timer); connection.close(); if (streams.get(key) === close) streams.delete(key); res.off("close", close); res.end(); };
    const write = (event: TableEvent) => {
      if (closed) return;
      // Sin cola de aplicación: desconectar consumidores que no drenan su buffer.
      const bytes = `id: ${table.epoch}:${role}:${event.sequence}\nevent: table\ndata: ${JSON.stringify(event)}\n\n`;
      if (res.writableLength > 2 * 1024 * 1024) { queueMicrotask(close); return; }
      if (!res.write(bytes)) { const timer = setTimeout(() => { drains.delete(timer); if (res.writableLength > 0) close(); }, 5000); drains.add(timer); timer.unref(); }
    };
    streams.set(key, close); res.on("close", close);
    const connection = table.connect(key, role, write);
    const heartbeat = setInterval(() => {
      if (!auth.get(req)) { close(); return; }
      res.write(`: heartbeat ${now()}\n\n`);
      if (res.writableLength > 65536) close();
    }, 1000);
    heartbeat.unref();
  }

  return {
    table, stream, execute: (req: IncomingMessage, family: string, action: string, role: ServiceRole, raw: unknown) => executeTableCommand(table, owner(req), family, action, role, raw, publicOrigin),
    read(family: string, action: string, role: ServiceRole) {
      if (family === "table" && action === "state") return { ok: true, state: table.state(role) };
      if (family === "dice" && action === "public") return { ok: true, value: table.dice.getPublicState() };
      if (family === "dice" && action === "sizes") return { ok: true, value: table.sizes(role) };
      if (family === "dice" && action === "session") { if (role !== "dm") throw dmOnly(); return { ok: true, value: table.dice.getDmState() }; }
      throw missing();
    },
    revoke(req: IncomingMessage) { streams.get(owner(req))?.(); },
    close() { for (const close of streams.values()) close(); },
    validateQuery(url: URL) { for (const key of url.searchParams.keys()) if (!["role", "view"].includes(key)) throw invalid("Consulta inválida."); z.string().max(300).parse(url.search); }
  };
}
