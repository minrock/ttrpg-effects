/** Arnés histórico exclusivo de pruebas; no está conectado ni incluido en el artefacto de producto. */
import { createInvitationHttp, isInvitationPath } from "./invitation-http";
import type { InvitationService } from "../application/services/invitations";
import { body, json } from "./request-body";
import { createOwnedHttp } from "./owned-http";
import { createIdentityHttp } from "./identity-http";
import type { IdentityService } from "../application/services/identity";
import { createTableHttp } from "./table-http";
import { createStaticHandler } from "./static-files";
import { SceneLinksService, connectSchema, linkSchema, validateLinksSchema, sceneReference } from "./scene-links";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../shared/contracts/http-api";
import { builtInMonsterTemplates } from "../domain/monster-templates/monster-template";
import { saveMonsterLibraryEntryUseCase, searchMonsterLibraryUseCase } from "../application/use-cases/monster-library";
import { saveNpcLibraryEntryUseCase, savePlayerCharacterLibraryEntryUseCase, searchNpcLibraryUseCase, searchPlayerCharacterLibraryUseCase } from "../application/use-cases/entity-library";
import { deleteMonsterTemplateUseCase, listMonsterTemplatesUseCase, saveMonsterTemplateUseCase } from "../application/use-cases/monster-templates";
import { ServiceStore } from "../infrastructure/server/service-store";
import { ImageValidationService } from "../infrastructure/server/image-validation";
import { StoredDataError } from "../infrastructure/server/persisted-records";
import { Auth } from "./auth";
import { LIMITS, validateConfig, type ServerConfig } from "./config";
import { HttpError, invalid, missing } from "./errors";
import { SceneService } from "./scene-service";
import { characterSchema, loginSchema, monsterSchema, npcSchema, numberQuery, parse, query, resolveSchema, routeId, sceneInputSchema, templateSchema } from "./schemas";

function send(res: ServerResponse, status: number, value?: unknown): void {
  res.statusCode = status;
  if (value === undefined) { res.end(); return; }
  res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value));
}
function method(req: IncomingMessage, allowed: readonly string[]): string {
  const value = req.method ?? "GET";
  if (!allowed.includes(value)) throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible para esta ruta.");
  return value;
}
export function createApi(config: ServerConfig, options: { readonly version: string; readonly now?: () => number; readonly identity?: IdentityService; readonly invitations?: InvitationService }) {
  validateConfig(config);
  if (Boolean(config.identity) !== Boolean(options.identity)) throw new Error("TTRPG_IDENTITY_ENABLED requiere composición explícita de identidad migrada.");
  const identityHttp = options.identity ? createIdentityHttp(options.identity, config.publicOrigin) : undefined;
  const now = options.now ?? Date.now;
  const invitationHttp = options.invitations && options.identity ? createInvitationHttp(options.invitations, options.identity, config.publicOrigin, now) : undefined;
  const ownedHttp = options.identity ? createOwnedHttp(options.identity, config.publicOrigin, now) : undefined;
  const serveStatic = config.webDir ? createStaticHandler(config.webDir) : null;
  const store = new ServiceStore(config.dataDir);
  const scenes = new SceneService(store, now);
  const links = new SceneLinksService(scenes, store);
  const imageValidation = new ImageValidationService();
  const auth = new Auth(config, now);
  const realtime = createTableHttp(auth, now, config.publicOrigin);
  const origin = new URL(config.publicOrigin);
  const playerRepository = {
    search: store.entities.searchPlayerCharacters.bind(store.entities), findById: store.entities.findPlayerCharacterById.bind(store.entities), save: store.entities.savePlayerCharacter.bind(store.entities)
  };
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (req.headers.host !== origin.host) throw new HttpError(403, "INVALID_HOST", "El host no está permitido.");
    const mutating = !["GET", "HEAD"].includes(req.method ?? "GET");
    if ((req.headers.origin !== undefined && req.headers.origin !== config.publicOrigin) || (mutating && req.headers.origin !== config.publicOrigin)) throw new HttpError(403, "INVALID_ORIGIN", "El origen no está permitido.");
    auth.rate(req);
    const rawPath = (req.url ?? "").split("?")[0];
    let path: string;
    try { path = decodeURIComponent(rawPath); } catch { throw new HttpError(400, "INVALID_PATH", "La ruta no es válida."); }
    if (/%(?:2f|5c)/i.test(rawPath) || /[%\\\0]/.test(path) || path.split("/").some((part) => part === "." || part === "..")) throw new HttpError(400, "INVALID_PATH", "La ruta no es válida.");
    if (!path.startsWith(API_PREFIX + "/")) {
      if (path === API_PREFIX || path.startsWith("/api/") || !serveStatic) throw missing();
      serveStatic(req, res, path); return;
    }
    const url = new URL(req.url ?? "/", config.publicOrigin);
    const parts = path.slice(API_PREFIX.length + 1).split("/");
    if (parts[0] === "health" && parts.length === 1) { method(req, ["GET"]); query(url, []); send(res, 200, { ok: true, status: "ok", version: options.version }); return; }
    if (parts[0] === "auth" && parts.length === 2) {
      query(url, []);
      if (parts[1] === "login") {
        method(req, ["POST"]); auth.rate(req, true);
        const input = parse(loginSchema, await json(req, res, LIMITS.loginBytes));
        const { token, session } = auth.login(req, input.key); realtime.revoke(req); res.setHeader("Set-Cookie", auth.cookie(token));
        send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return;
      }
      if (parts[1] === "logout") { method(req, ["POST"]); await body(req, res, LIMITS.loginBytes); auth.logout(req); realtime.revoke(req); res.setHeader("Set-Cookie", auth.cookie("")); send(res, 204); return; }
      if (parts[1] === "session") { method(req, ["GET"]); const session = auth.require(req); send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return; }
      throw missing();
    }
    if (isInvitationPath(path) && invitationHttp) { await invitationHttp(req, res); return; }
    if (parts[0] === "identity") { if (!identityHttp) throw missing(); await identityHttp(req, res); return; }
    if (parts[0] === "dm" || parts[0] === "admin" && parts[1] === "systems") { if (!ownedHttp) throw missing(); await ownedHttp(req, res); return; }
    const session = auth.require(req);
    // Volver a validar después de cada espera antes de usar el rol capturado.
    const requireCurrentSession = () => {
      if (auth.require(req) !== session) throw new HttpError(401, "UNAUTHORIZED", "La sesión cambió. Inicia sesión de nuevo.");
    };
    const protectedJson = async () => {
      const input = await json(req, res); requireCurrentSession(); return input;
    };
    if (["table", "dice"].includes(parts[0]) && parts.length === 2) {
      realtime.validateQuery(url);
      if (parts[0] === "table" && parts[1] === "events") { method(req, ["GET"]); realtime.stream(req, res, session.role); return; }
      if (req.method === "GET") { send(res, 200, { ...realtime.read(parts[0], parts[1], session.role), serverTime: now() }); return; }
      method(req, ["POST"]);
      const input = await protectedJson();
      requireCurrentSession();
      send(res, 200, { ...(realtime.execute(req, parts[0], parts[1], session.role, input) as object), serverTime: now() }); return;
    }
    if (parts[0] === "assets" && parts.length === 2) {
      query(url, []);
      if (parts[1] === "resolve") {
        method(req, ["POST"]); const input = parse(resolveSchema, await protectedJson());
        requireCurrentSession();
        send(res, 200, { ok: true, assets: input.references.map(reference => ({ reference, url: session.role === "dm" || realtime.table.allows(reference) ? scenes.resolve(reference) : null })) }); return;
      }
      method(req, ["GET", "HEAD"]); const id = routeId(parts[1]);
      if (session.role !== "dm" && !realtime.table.allows(`asset:${id}`)) throw missing();
      const asset = store.getAsset(id); if (!asset) throw missing();
      res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", asset.bytes.length); res.end(req.method === "HEAD" ? undefined : asset.bytes); return;
    }
    if (session.role !== "dm") throw new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
    if (parts[0] === "scene-links" && parts.length === 2) {
      method(req, ["POST"]); query(url, []); const input = await protectedJson();
      const value = parts[1] === "connect" ? links.connect(parse(connectSchema, input))
        : parts[1] === "disconnect" ? links.disconnect(parse(linkSchema, input))
        : parts[1] === "validate" ? links.validate(parse(validateLinksSchema, input))
        : parts[1] === "navigate" ? links.navigate(parse(linkSchema, input)) : null;
      if (!value) throw missing(); send(res, 200, value); return;
    }
    if (parts[0] === "scenes") {
      if (parts.length === 1 && req.method === "GET") {
        query(url, ["limit", "offset"]);
        const result = store.listScenes(numberQuery(url, "limit", 50, 1, 100), numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER));
        send(res, 200, { ok: true, scenes: result.scenes.map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt })), total: result.total }); return;
      }
      query(url, []);
      if (parts.length === 1 || (parts.length === 2 && parts[1] === "import")) {
        method(req, ["POST"]); const input = parse(sceneInputSchema, await protectedJson()); const resource = scenes.save(input.name, input.scene);
        res.setHeader("Location", `${API_PREFIX}/scenes/${resource.id}`); send(res, 201, { ok: true, resource }); return;
      }
      const id = routeId(parts[1]);
      if (parts.length === 4 && parts[2] === "links" && parts[3] === "candidates") { method(req, ["GET"]); send(res, 200, links.candidates(sceneReference(id))); return; }
      if (parts.length === 3 && parts[2] === "export") { method(req, ["GET"]); const resource = scenes.get(id); res.setHeader("Content-Disposition", `attachment; filename="scene-${id}.ttrpgscene"`); send(res, 200, resource.scene); return; }
      if (parts.length !== 2) throw missing();
      const action = method(req, ["GET", "PUT", "DELETE"]);
      if (action === "GET") send(res, 200, { ok: true, resource: scenes.get(id) });
      else if (action === "DELETE") { if (!store.deleteScene(id)) throw missing(); send(res, 204); }
      else { const input = parse(sceneInputSchema, await protectedJson()); send(res, 200, { ok: true, resource: scenes.save(input.name, input.scene, id) }); }
      return;
    }
    if (parts[0] === "assets") {
      query(url, []);
      if (parts.length === 1) {
        method(req, ["POST"]); const mime = req.headers["content-type"] ?? "";
        if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Solo se admiten PNG, JPEG y WebP.");
        const bytes = await body(req, res, LIMITS.imageBytes); requireCurrentSession(); await imageValidation.validate(bytes, mime); requireCurrentSession();
        const id = randomUUID(); store.saveAsset(id, mime, bytes);
        send(res, 201, { ok: true, asset: { id, reference: `asset:${id}`, url: `${API_PREFIX}/assets/${id}`, mimeType: mime, byteLength: bytes.length } }); return;
      }
      if (parts.length !== 2) throw missing();
      if (parts[1] === "resolve") { method(req, ["POST"]); const input = parse(resolveSchema, await protectedJson());
        requireCurrentSession(); send(res, 200, { ok: true, assets: input.references.map((reference) => ({ reference, url: scenes.resolve(reference) })) }); return; }
      method(req, ["GET"]); const asset = store.getAsset(routeId(parts[1])); if (!asset) throw missing();
      res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", asset.bytes.length); res.end(asset.bytes); return;
    }
    if (parts[0] === "monster-templates") {
      query(url, []);
      if (parts.length === 1) { method(req, ["GET"]); send(res, 200, { ok: true, templates: await listMonsterTemplatesUseCase(store) }); return; }
      if (parts.length !== 2) throw missing();
      const id = routeId(parts[1], true); const action = method(req, ["PUT", "DELETE"]);
      if (builtInMonsterTemplates.some((template) => template.id === id)) throw new HttpError(403, "BUILT_IN_TEMPLATE", "Las plantillas incorporadas no se pueden modificar.");
      if (action === "DELETE") { if (!(await store.listUserTemplates()).some((template) => template.id === id)) throw missing(); requireCurrentSession(); send(res, 200, { ok: true, templates: await deleteMonsterTemplateUseCase(store, id) }); }
      else { const input = parse(templateSchema, await protectedJson()); if (input.template.id !== id) throw invalid("El ID no coincide con la ruta."); send(res, 200, { ok: true, templates: await saveMonsterTemplateUseCase(store, input.template) }); }
      return;
    }
    if (parts[0] === "libraries" && (parts.length === 2 || parts.length === 3)) {
      const kind = parts[1]; if (!["monsters", "npcs", "player-characters"].includes(kind)) throw missing();
      const id = parts.length === 3 ? routeId(parts[2]) : undefined;
      const action = method(req, id ? ["GET", "PUT"] : ["GET", "POST"]);
      if (!id && action === "GET") {
        query(url, ["text", "limit"]); const text = url.searchParams.get("text") ?? ""; if (text.length > 200) throw new HttpError(400, "INVALID_QUERY", "La búsqueda es demasiado larga.");
        const search = { text, limit: numberQuery(url, "limit", 50, 1, 100) };
        const entries = kind === "monsters" ? await searchMonsterLibraryUseCase(store.monsters, search) : kind === "npcs" ? await searchNpcLibraryUseCase(store.entities, search) : await searchPlayerCharacterLibraryUseCase(playerRepository, search);
        requireCurrentSession(); send(res, 200, { ok: true, entries }); return;
      }
      query(url, []);
      if (id) {
        const entry = kind === "monsters" ? await store.monsters.findById(id) : kind === "npcs" ? await store.entities.findById(id) : await playerRepository.findById(id);
        requireCurrentSession(); if (!entry) throw missing(); if (action === "GET") { send(res, 200, { ok: true, entry }); return; }
      }
      const payload = await protectedJson(); const saveOptions = { createId: randomUUID, now: () => new Date(now()) };
      const entry = kind === "monsters" ? await saveMonsterLibraryEntryUseCase(store.monsters, { ...parse(monsterSchema, payload).entry, id }, saveOptions)
        : kind === "npcs" ? await saveNpcLibraryEntryUseCase(store.entities, { ...parse(npcSchema, payload).entry, id }, saveOptions)
          : await savePlayerCharacterLibraryEntryUseCase(playerRepository, { ...parse(characterSchema, payload).entry, id }, saveOptions);
      send(res, id ? 200 : 201, { ok: true, entry }); return;
    }
    throw missing();
  }
  const server = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
    void handle(req, res).catch((error: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      const failure = error instanceof HttpError ? error : error instanceof StoredDataError ? new HttpError(500, "STORAGE_CORRUPT", "El recurso guardado está dañado o es incompatible. Restaura una copia válida y vuelve a intentar.") : new HttpError(500, "INTERNAL_ERROR", "No se pudo completar la operación. Intenta de nuevo.");
      if (failure.status === 429) res.setHeader("Retry-After", "60");
      // Cerrar la conexión si queda un cuerpo sin leer después del rechazo.
      if (!req.complete) res.setHeader("Connection", "close");
      send(res, failure.status, { ok: false, error: { code: failure.code, message: failure.message } });
    });
  });
  server.headersTimeout = LIMITS.headersMs; server.requestTimeout = LIMITS.bodyMs; server.keepAliveTimeout = 5000;
  server.maxConnections = 100; server.maxRequestsPerSocket = 100;
  let closed = false;
  return {
    server,
    async listen(): Promise<number> {
      await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(config.port, config.host, () => { server.off("error", reject); resolve(); }); });
      const address = server.address(); if (!address || typeof address === "string") throw new Error("No se pudo abrir el puerto."); return address.port;
    },
    async close(): Promise<void> {
      if (closed) return; closed = true; realtime.close();
      await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); store.close(); await options.invitations?.close(); await options.identity?.close();
    }
  };
}
