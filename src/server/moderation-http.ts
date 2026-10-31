import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z, ZodError } from "zod";
import type { IdentityService } from "../application/services/identity";
import { IdentityError } from "../application/services/identity";
import { InvitationError, type InvitationService } from "../application/services/invitations";
import { OwnedError, type OwnedTransaction } from "../application/services/owned-store";
import type { GameContext, GameRuntimeRegistry } from "../application/services/game-runtime";
import type { moderation } from "../application/services/moderation";
import type { RuntimeLease } from "../infrastructure/server/moderation/runtime-lease";
import { resolveCompiledModules, type ResolvedSystem } from "../domain/systems/system-catalog";
import { canonicalUuid, openingContextSchema } from "../shared/contracts/invitations";
import { contextualMutationSchema, kickSchema, rosterQuerySchema } from "../shared/contracts/moderation";
import { mutationSchema, tablePayloads, type TableEvent } from "../shared/contracts/table";
import { json } from "./request-body";
import { HttpError } from "./errors";
import { readGuestCookie } from "./invitation-http";
import { executeTableCommand } from "./table-actions";
interface Scope { context: GameContext; system: ResolvedSystem; participant?: string; expiresAt?: string; roster?: string; deliver(effect: () => void): Promise<void>; assets: OwnedTransaction["assets"]["get"]; publish?: (snapshot: ReturnType<typeof tablePayloads.scene.parse>, resource?: string, operation?: { owner: string; id: string; fingerprint: string }) => Promise<void> }
export const isModerationPath = (path: string) => /^\/api\/v1\/(dm\/)?games\/[^/]+\/(participants|table|dice|assets)(\/|$)/.test(path);
export function createModerationHttp(identity: IdentityService, invitations: InvitationService, service: ReturnType<typeof moderation>, registry: GameRuntimeRegistry, lease: RuntimeLease, origin: string, now = Date.now) {
  let authenticating = 0; const authenticatingByCookie = new Map<string, number>();
  const send = (res: ServerResponse, value: unknown) => { if (res.destroyed) return; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); };
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "no-referrer"); res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    let authenticatingSlot = false, authenticationKey = "", releaseRequest = () => {};
    const requestAbort = new AbortController();
    const cancelRequest = () => { releaseRequest(); requestAbort.abort(); req.destroy(); res.destroy(); };
    const releaseAuthentication = () => { if (authenticatingSlot) { authenticatingSlot = false; authenticating--; const count = (authenticatingByCookie.get(authenticationKey) ?? 1) - 1; if (count) authenticatingByCookie.set(authenticationKey, count); else authenticatingByCookie.delete(authenticationKey); } };
    try {
      if (req.headers.host !== new URL(origin).host || req.headers.origin !== undefined && req.headers.origin !== origin || !["GET", "HEAD"].includes(req.method ?? "") && req.headers.origin !== origin) throw new HttpError(403, "FORBIDDEN", "El origen no está permitido.");
      authenticationKey = createHash("sha256").update(req.headers.cookie ?? "").digest("hex");
      if (authenticating + registry.pendingRequests >= 64 || (authenticatingByCookie.get(authenticationKey) ?? 0) >= 4) throw new InvitationError("RATE_LIMITED");
      authenticating++; authenticatingSlot = true; authenticatingByCookie.set(authenticationKey, (authenticatingByCookie.get(authenticationKey) ?? 0) + 1);
      const url = new URL(req.url!, origin), match = /^\/api\/v1\/(dm\/)?games\/([^/]+)\/(participants|table|dice|assets)(?:\/(.+))?$/.exec(url.pathname);
      if (!match || /[%\\\0]/.test(url.pathname)) throw new InvitationError("INVALID_INPUT");
      const [, dm, game, family, action = ""] = match; canonicalUuid.parse(game);
      const cookie = req.headers.cookie ?? ""; if (cookie.length > 8192) throw new InvitationError("INVALID_INPUT");
      const names = cookie.split(";").map(s => s.trim().split("=", 1)[0]); if (new Set(names).size !== names.length) throw new InvitationError("INVALID_INPUT");
      const role = dm ? "dm" as const : "player" as const, token = dm ? null : readGuestCookie(cookie);
      let key = createHash("sha256").update(dm ? cookie : token ?? "").digest("hex");
      const query = Object.fromEntries(url.searchParams); if ([...url.searchParams.keys()].length !== Object.keys(query).length) throw new InvitationError("INVALID_INPUT");
      const authorize = async (work: (scope: Scope) => Promise<void>) => {
        await lease.check(); let deliveryFailure: unknown; let deliveryFailed = false;
        const deliver = (effect: () => void) => { lease.assert(); try { effect(); } catch (error) { deliveryFailure = error; deliveryFailed = true; } };
        if (dm) await identity.authorized(cookie, "dm", async (actor, tx) => {
          key = actor.sessionId;
          const context = await registry.context(tx, actor.account.id, game), system = await tx.links.resolve(game);
          const roster = await tx.invitations.participants(game, context.openingId);
          tx.effects.beforeCommit(async () => { await lease.check(); const next = await registry.context(tx, actor.account.id, game); if (next.openingId !== context.openingId || next.generation !== context.generation) throw new InvitationError("REVISION_CONFLICT"); });
          await work({ context, system, expiresAt: actor.expiresAt, roster: `${roster.revision}:${roster.items.length}:${registry.presenceSequence(context)}`, assets: id => tx.assets.get(id), publish: (snapshot, resource, operation) => registry.publish(tx, context, snapshot, resource, operation), async deliver(effect) { tx.effects.afterCommit(() => { deliver(effect); }, () => registry.discard(context)); } });
        }); else await invitations.guests.authorized(game, token, async (guest, tx) => {
          const { context, system } = await tx.transport();
          await work({ context, system, participant: guest.participantId, expiresAt: guest.expiresAt, assets: id => tx.asset(id), deliver: async effect => { await tx.deliver(() => { deliver(effect); }, () => registry.discard(context)); } });
        });
        if (deliveryFailed) throw deliveryFailure;
      };
      const establishingStream = family === "table" && action === "events" && req.method === "GET";
      let captured: GameContext | undefined;
      if (family !== "participants") await authorize(async scope => { captured = scope.context; if (!establishingStream) await scope.deliver(() => { releaseAuthentication(); releaseRequest = registry.request(scope.context, scope.participant ?? key, role, cancelRequest, scope.participant, scope.expiresAt); }); });
      else { let quotaFailure: unknown; await identity.authorized(cookie, "dm", async (actor, tx) => {
        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
        const opening = await tx.openings.current(game);
        tx.effects.beforeCommit(() => lease.check());
        tx.effects.afterCommit(() => { releaseAuthentication(); try { releaseRequest = registry.request({ ownerId: actor.account.id, gameId: game, openingId: opening?.id ?? game, generation: opening?.generation ?? 0 }, actor.sessionId, "dm", cancelRequest, undefined, actor.expiresAt); } catch (error) { quotaFailure = error; } }, cancelRequest);
      }); if (quotaFailure) throw quotaFailure; }
      // El establecimiento SSE conserva su cupo transitorio hasta pasar al registro de streams; no es un lector de body.
      if (!establishingStream) releaseAuthentication();
      if (requestAbort.signal.aborted || res.destroyed) return;
      const same = (ctx: GameContext) => { if (ctx.openingId !== captured!.openingId || ctx.generation !== captured!.generation) throw new HttpError(409, "OPENING_CHANGED", "La apertura de esta mesa finalizó."); };
      const metadata = (scope: Scope) => { resolveCompiledModules(scope.system.definition.manifest); return { gameId: game, openingId: scope.context.openingId, generation: scope.context.generation, systemRef: scope.system.ref, systemHash: scope.system.hash, modules: scope.system.definition.manifest, audience: role }; };
      if (family === "participants") {
        if (!dm) throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");
        if (req.method === "GET" && !action) { const roster = await service.roster(cookie, game, rosterQuerySchema.parse(query)); send(res, { ok: true, ...roster }); return; }
        if (req.method !== "POST" || !/^([a-f0-9-]{36})\/kick$/.test(action) || url.search) throw new InvitationError("INVALID_INPUT");
        const rawRevision = req.headers["if-match"]; if (typeof rawRevision !== "string" || !/^(?:[1-9][0-9]*|"[1-9][0-9]*")$/.test(rawRevision)) throw new InvitationError("INVALID_INPUT");
        const result = await service.kick(cookie, game, action.split("/")[0], kickSchema.parse(await json(req, res, 8192, requestAbort.signal)), Number(rawRevision.replaceAll('"', "")), canonicalUuid.parse(req.headers["idempotency-key"]));
        send(res, { ok: true, ...result }); return;
      }
      if (Object.keys(query).length) { const expected = openingContextSchema.extend({ generation: z.coerce.number().int().min(1) }).parse(query); if (expected.openingId !== captured!.openingId || expected.generation !== captured!.generation) throw new HttpError(409, "OPENING_CHANGED", "La apertura de esta mesa finalizó."); }
      if (family === "table" && action === "events" && req.method === "GET") {
        const cursor = req.headers["last-event-id"];
        if (cursor !== undefined && (typeof cursor !== "string" || cursor.length > 200 || !/^[a-f0-9-]{36}:[a-f0-9-]{36}:\d{1,16}:[a-f0-9-]{36}:(dm|player):\d{1,16}$/.test(cursor))) throw new InvitationError("INVALID_INPUT");
        let transportClosed = res.destroyed || res.writableEnded, dispose = () => {};
        const disconnected = () => { transportClosed = true; releaseAuthentication(); dispose(); };
        res.on("close", disconnected);
        try { await authorize(async scope => {
          same(scope.context);
          await scope.deliver(() => {
            if (transportClosed || res.destroyed || res.writableEnded) return;
            // El cierre puede ser llamado por la reserva antes de crear el transporte.
            let closed = false, connection: { id: string; close(): void } | undefined, timer: ReturnType<typeof setInterval> | undefined;
            let release = () => {}, pendingBytes = 0, heartbeatPending = false, chain = Promise.resolve(), roster = scope.roster, deliveredSequence = -1;
            const table = registry.runtime(scope.context);
            const drains = new Set<ReturnType<typeof setTimeout>>();
            const close = (reason?: "access-ended" | "replaced" | "unavailable") => {
              if (closed) return; closed = true; clearInterval(timer); for (const drain of drains) clearTimeout(drain); release(); connection?.close();
              res.off("close", disconnected);
              if (reason && res.headersSent && !res.destroyed) {
                const state = table.state(role);
                const terminal = { protocolVersion: 2, ...metadata(scope), epoch: state.epoch, context: state.context, revision: state.revision, serverTime: now(), sequence: table.transportSequence(role), type: "terminal", terminal: reason };
                if (res.writableLength === 0) res.end(`event: table\ndata: ${JSON.stringify(terminal)}\n\n`); else res.destroy();
              } else if (res.headersSent && !res.destroyed && !res.writableEnded) res.end();
            };
            dispose = () => close();
            const unusable = () => transportClosed || res.destroyed || res.writableEnded;
            const write = (bytes: string) => { if (closed) return; if (unusable()) { close(); return; } if (res.writableLength + Buffer.byteLength(bytes) > 2 * 1024 * 1024) { close(); return; } if (!res.write(bytes)) { const drain = setTimeout(() => { drains.delete(drain); if (res.writableLength) close(); }, 5000); drains.add(drain); drain.unref(); } };
            const queue = (event?: TableEvent) => {
              if (closed || !event && heartbeatPending) return;
              if (unusable()) { close(); return; }
              if (!event) heartbeatPending = true;
              const size = event ? Buffer.byteLength(JSON.stringify(event)) : 0;
              if (pendingBytes + size > 2 * 1024 * 1024) { close(); return; } pendingBytes += size;
              chain = chain.then(async () => {
                if (closed) return;
                await authorize(async current => { same(current.context); await current.deliver(() => {
                  if (closed) return;
                  const table = registry.runtime(current.context);
                  if (event) {
                    const frame = event.type === "bootstrap" ? { ...event, epoch: table.epoch, context: table.context, revision: table.revision, serverTime: now(), sequence: table.transportSequence(role), state: table.state(role, connection!.id) } : event;
                    if (frame.epoch !== table.epoch || frame.context !== table.context || frame.revision < table.revision || frame.sequence <= deliveredSequence) return;
                    deliveredSequence = frame.sequence;
                    const value = { ...frame, protocolVersion: 2, ...metadata(current) };
                    write(`id: ${game}:${current.context.openingId}:${current.context.generation}:${frame.epoch}:${role}:${frame.sequence}\nevent: table\ndata: ${JSON.stringify(value)}\n\n`);
                  } else { write(`: heartbeat ${now()}\n\n`); if (dm && roster !== current.roster) { roster = current.roster; write(`event: table\ndata: ${JSON.stringify({ protocolVersion: 2, ...metadata(current), epoch: table.epoch, context: table.context, revision: table.revision, serverTime: now(), type: "roster", sequence: table.transportSequence(role), payload: { revision: roster } })}\n\n`); } }
                }); });
              }).catch(() => close("access-ended")).finally(() => { pendingBytes -= size; if (!event) heartbeatPending = false; });
            };
            try {
              release = registry.register(scope.context, key, role, close, scope.participant);
              releaseAuthentication();
              if (unusable()) { close(); return; }
              res.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive", "X-Accel-Buffering": "no" }); res.flushHeaders();
              if (unusable()) { close(); return; }
              connection = table.connect(key, role, queue, scope.participant);
              // connect puede cerrar sincrónicamente si el bootstrap excede la cola.
              if (closed || unusable()) { connection.close(); close(); return; }
              timer = setInterval(() => queue(), 1000); timer.unref();
            } catch (error) { close(); throw error; }
          });
        }); } catch (error) { dispose(); throw error; }
        finally { if (transportClosed || !res.headersSent) res.off("close", disconnected); }
        return;
      }
      if (family === "assets") {
        if (dm) throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");
        if (action === "resolve" && req.method === "POST") {
          const input = z.object({ ids: z.array(canonicalUuid).max(100) }).strict().parse(await json(req, res, 16384, requestAbort.signal));
          await authorize(async scope => { same(scope.context); await scope.deliver(() => send(res, { ok: true, assets: Object.fromEntries(input.ids.map(id => [id, registry.allows(scope.context, `asset:${id}`) ? `/api/v1/games/${game}/assets/${id}` : null])) })); }); return;
        }
        canonicalUuid.parse(action); if (!["GET", "HEAD"].includes(req.method ?? "")) throw new InvitationError("INVALID_INPUT");
        let bytes: Uint8Array | undefined, revision = -1;
        let releaseTransfer = () => {};
        const closeTransfer = () => { releaseTransfer(); res.destroy(); };
        await authorize(async scope => {
          same(scope.context); const table = registry.runtime(scope.context); if (!table.allows(`asset:${action}`)) throw new OwnedError("NOT_FOUND");
          revision = table.revision; const asset = await scope.assets(action); if (!asset) throw new OwnedError("NOT_FOUND"); bytes = asset.bytes;
          await scope.deliver(() => { if (table.revision !== revision || !table.allows(`asset:${action}`)) throw new OwnedError("NOT_FOUND"); releaseTransfer = registry.track(scope.context, scope.participant!, closeTransfer); res.once("close", () => releaseTransfer()); res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", bytes!.length); if (req.method === "HEAD") res.end(); });
        });
        if (req.method === "HEAD") return;
        for (let offset = 0; offset < bytes!.length && !res.destroyed; offset += 65536) {
          let draining = false;
          await authorize(async scope => { same(scope.context); await scope.deliver(() => { const table = registry.runtime(scope.context); if (table.revision !== revision || !table.allows(`asset:${action}`)) throw new OwnedError("NOT_FOUND"); draining = !res.write(bytes!.subarray(offset, offset + 65536)); }); });
          if (draining) await new Promise<void>(resolve => { const done = () => { clearTimeout(timeout); res.off("drain", done); res.off("close", done); resolve(); }; const timeout = setTimeout(() => { res.destroy(); done(); }, 5000); res.once("drain", done); res.once("close", done); });
        }
        releaseTransfer(); res.end(); return;
      }
      if (req.method === "GET") {
        await authorize(async scope => { same(scope.context); await scope.deliver(() => {
          const table = registry.runtime(scope.context);
          if (family === "table" && action === "state") send(res, { ok: true, state: { ...table.state(role), protocolVersion: 2, ...metadata(scope) } });
          else if (family === "dice" && action === "public") send(res, { ok: true, value: table.dice.getPublicState() });
          else if (family === "dice" && action === "sizes") send(res, { ok: true, value: table.sizes(role) });
          else if (family === "dice" && action === "session" && dm) send(res, { ok: true, value: table.dice.getDmState() });
          else throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");
        }); }); return;
      }
      if (req.method !== "POST") throw new InvitationError("INVALID_INPUT");
      const tableActions = dm ? ["scene", "camera", "camera-command", "pointer", "area-highlight"] : ["camera-report", "ready", "map-image-status"];
      const diceActions = dm ? ["context", "preferences", "begin", "complete", "fail", "dismiss", "visibility", "clear-history", "size", "render-status"] : ["render-status"];
      if (!(family === "table" ? tableActions : diceActions).includes(action)) throw new HttpError(403, "FORBIDDEN", "La operación no está permitida.");
      const input = contextualMutationSchema.parse(await json(req, res, undefined, requestAbort.signal));
      if (input.openingId !== captured!.openingId || input.generation !== captured!.generation) throw new HttpError(409, "OPENING_CHANGED", "La apertura de esta mesa finalizó.");
      const command = mutationSchema.parse(input.command);
      const scenePayload = family === "table" && action === "scene" ? tablePayloads.scene.parse(command.payload) : null;
      await authorize(async scope => {
        same(scope.context);
        if (family === "table" && action === "scene") {
          await scope.publish!(scenePayload, input.sceneResourceId, { owner: key, id: command.requestId, fingerprint: createHash("sha256").update(JSON.stringify(input)).digest("hex") });
          await scope.deliver(() => send(res, { ok: true, state: { ...registry.runtime(scope.context).state(role), protocolVersion: 2, ...metadata(scope) } }));
        } else await scope.deliver(() => send(res, executeTableCommand(registry.runtime(scope.context), key, family, action, role, command)));
      });
    } catch (error) {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      const status = error instanceof HttpError ? error.status : error instanceof ZodError ? 400 : error instanceof InvitationError ? ({ GUEST_UNAUTHORIZED: 401, INVALID_INPUT: 400, REVISION_CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, RATE_LIMITED: 429 }[error.code as "GUEST_UNAUTHORIZED"] ?? 503) : error instanceof IdentityError ? ({ UNAUTHORIZED: 401, FORBIDDEN: 403, PASSWORD_CHANGE_REQUIRED: 403 }[error.code as "UNAUTHORIZED"] ?? 503) : error instanceof OwnedError ? ({ NOT_FOUND: 404, VALIDATION: 400, CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, OPERATION_BUDGET: 429 }[error.code as "NOT_FOUND"] ?? 503) : 503;
      res.statusCode = status; if (!req.complete) res.setHeader("Connection", "close");
      send(res, { ok: false, error: { code: status === 503 ? "UNAVAILABLE" : status === 400 ? "INVALID_INPUT" : error instanceof Error && "code" in error ? String((error as { code: string }).code) : "UNAVAILABLE", message: status === 503 ? "No se pudo completar la operación. Consulta el estado antes de reintentar." : status === 400 ? "Los datos no son válidos." : (error as Error).message } });
    } finally { releaseAuthentication(); releaseRequest(); }
  };
}
