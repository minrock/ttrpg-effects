import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z, ZodError } from "zod";
import { TableConflict, TableSession } from "../application/services/table-session";
import { mutationSchema, tablePayloads, dicePayloads, type TableEvent } from "../shared/contracts/table";
import type { Auth } from "./auth";
import { HttpError, invalid, missing } from "./errors";
import { parse } from "./schemas";
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
  function execute(req: IncomingMessage, family: string, action: string, role: ServiceRole, raw: unknown): unknown {
    const playerActions = ["camera-report", "ready", "map-image-status"];
    if (family === "table" && (playerActions.includes(action) ? role !== "player" : role !== "dm")) throw dmOnly();
    if (family === "dice" && action !== "render-status" && role !== "dm") throw dmOnly();
    const command = parse(mutationSchema, raw);
    const key = owner(req);
    const fingerprint = createHash("sha256").update(JSON.stringify([family, action, command])).digest("hex");
    try {
      return table.once(key, command.requestId, fingerprint, () => {
        if (!(family === "table" && ["open", "scene"].includes(action)) && !(family === "dice" && ["context", "preferences", "size", "clear-history"].includes(action))) table.check(command.context);
        if (family === "table") {
          switch (action) {
            case "open": { const p = parse(tablePayloads.open, command.payload); if (p.snapshot) table.publish(p.snapshot); return { ok: true, state: table.state(role), playerUrl: publicOrigin + "/?view=player" }; }
            case "scene": table.publish(parse(tablePayloads.scene, command.payload)); break;
            case "camera": table.setCamera(parse(tablePayloads.camera, command.payload)); break;
            case "camera-command": table.setCommand(parse(tablePayloads["camera-command"], command.payload)); break;
            case "camera-report": table.report(key, command.connectionId, parse(tablePayloads["camera-report"], command.payload)); break;
            case "pointer": table.setPointer(parse(tablePayloads.pointer, command.payload)); break;
            case "area-highlight": table.setHighlight(parse(tablePayloads["area-highlight"], command.payload)); break;
            case "ready": parse(tablePayloads.ready, command.payload); table.ready(key, command.connectionId, command.revision); break;
            case "map-image-status": table.imageStatus(key, command.connectionId, command.revision, parse(tablePayloads["map-image-status"], command.payload)); break;
            default: throw missing();
          }
          return action === "scene" ? { ok: true, state: table.state(role) } : { ok: true };
        }
        switch (action) {
          case "context": table.dice.setContext(parse(dicePayloads.context, command.payload)); break;
          case "preferences": return { ok: true, value: table.dice.setDraft(parse(dicePayloads.preferences, command.payload)) };
          case "begin": return { ok: true, value: table.dice.begin(parse(dicePayloads.begin, command.payload)) };
          case "complete": { const p = parse(dicePayloads.complete, command.payload); table.dice.complete(p.rollId, p.simulation); break; }
          case "fail": table.dice.fail(parse(dicePayloads.fail, command.payload).rollId); break;
          case "dismiss": table.dice.dismiss(parse(dicePayloads.dismiss, command.payload).rollId); break;
          case "visibility": { const p = parse(dicePayloads.visibility, command.payload); table.dice.setResultVisibility(p.rollId, p.visible); break; }
          case "clear-history": parse(dicePayloads["clear-history"], command.payload); table.dice.clearHistory(); break;
          case "size": { const p = parse(dicePayloads.size, command.payload); const value = table.dice.setSize(p); table.emit("sizes", value, "dm"); if (p.view === "player") table.emit("sizes", table.sizes("player"), "player"); return { ok: true, value }; }
          case "render-status": {
            const p = parse(dicePayloads["render-status"], command.payload);
            if (role === "player") table.connection(key, command.connectionId);
            const current = role === "dm" ? table.dice.getDmState().envelope : table.dice.getPublicState();
            if (current.presentation?.rollId !== p.rollId) throw new TableConflict("La tirada ya no está visible.");
            if (!p.ok) table.emit("render-error", "No se pudo dibujar la tirada. Se conserva el resultado autorizado.", "dm");
            return { ok: true };
          }
          default: throw missing();
        }
        return { ok: true, value: table.dice.getDmState() };
      }, role);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof TableConflict) throw new HttpError(409, "TABLE_CONFLICT", error.message);
      if (error instanceof ZodError) throw invalid("Los datos de la mesa no son válidos.");
      throw new HttpError(409, "DICE_CONFLICT", error instanceof Error ? error.message : "No se pudo completar la acción.");
    }
  }
  return {
    table, stream, execute,
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
