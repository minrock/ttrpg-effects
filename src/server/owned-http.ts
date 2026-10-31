import { SystemError } from "../application/services/system-catalog";
import { systemRefSchema, systemIdSchema, systemDefinitionSchema, availabilitySchema, resourceBindingsSchema } from "../domain/systems/system-catalog";
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { IdentityError, type IdentityService } from "../application/services/identity";
import { CatalogError } from "../application/services/game-catalog";
import { OwnedError, type OwnedTransaction, type ResourceKind } from "../application/services/owned-store";
import { ownedGames } from "../application/services/owned-games";
import { saveMonsterLibraryEntryUseCase } from "../application/use-cases/monster-library";
import { saveNpcLibraryEntryUseCase, savePlayerCharacterLibraryEntryUseCase } from "../application/use-cases/entity-library";
import { builtInMonsterTemplates } from "../domain/monster-templates/monster-template";
import { gameNameSchema, gameStateSchema } from "../domain/games/game-metadata";
import { ImageValidationService } from "../infrastructure/server/image-validation";
import { OwnedSceneService } from "./owned-scene-service";
import { OwnedSceneLinksService } from "./owned-scene-links";
import { connectSchema, linkSchema, validateLinksSchema, sceneReference } from "./scene-links";
import { body, json } from "./request-body";
import { HttpError, missing, invalid } from "./errors";
import { LIMITS } from "./config";
import { characterSchema, monsterSchema, npcSchema, parse, query, routeId, sceneInputSchema, resolveSchema, numberQuery } from "./schemas";
const operation = z.uuid();
const revision = z.number().int().min(1);
const revisions = z.record(z.uuid(), revision);
function send(res: ServerResponse, status: number, value: unknown) { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); }
interface Result { status?: number; value?: unknown; location?: string; asset?: { mime: string; bytes: Uint8Array }; exportId?: string }
/** Composición aislada compartida por la transición local y el arnés HTTP multi-DB; jamás abre ServiceStore. */
export function createOwnedHttp(identity: IdentityService, origin: string, now = Date.now) {
  const images = new ImageValidationService();
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    try {
      if (req.headers.host !== new URL(origin).host) throw new HttpError(403, "INVALID_HOST", "El host no está permitido.");
      const method = req.method ?? "GET", mutating = !["GET", "HEAD"].includes(method);
      if ((req.headers.origin !== undefined && req.headers.origin !== origin) || (mutating && req.headers.origin !== origin)) throw new HttpError(403, "INVALID_ORIGIN", "El origen no está permitido.");
      const rawPath = (req.url ?? "/").split("?")[0];
      if (/%|\\|\0/.test(rawPath) || rawPath.split("/").some(part => part === "." || part === "..")) throw new HttpError(400, "INVALID_PATH", "La ruta no es válida.");
      const url = new URL(req.url ?? "/", origin);
      if (/%|\\|\0/.test(url.pathname) || !url.pathname.startsWith("/api/v1/dm/") && !url.pathname.startsWith("/api/v1/admin/systems")) throw missing();
      const permission = url.pathname.startsWith("/api/v1/admin/") ? "admin" : "dm";
      const parts = url.pathname.slice(`/api/v1/${permission}/`.length).split("/");
      const cookie = req.headers.cookie ?? "";
      await identity.authorized(cookie, permission, async () => undefined);
      const upload = parts.length === 1 && parts[0] === "assets" && method === "POST";
      let bytes: Buffer | undefined, payload: unknown;
      if (upload) { bytes = await body(req, res, LIMITS.imageBytes); await images.validate(bytes, req.headers["content-type"] ?? ""); }
      else if (mutating) payload = await json(req, res);
      const isReadPost = method === "POST" && ((parts[0] === "assets" && parts[1] === "resolve") || (parts[0] === "scene-links" && ["validate", "navigate"].includes(parts[1])));
      const operationId = mutating && !isReadPost ? parse(operation, req.headers["idempotency-key"]) : undefined;
      const rawRevision = req.headers["if-match"];
      if (rawRevision !== undefined && (typeof rawRevision !== "string" || !/^(?:\d+|"\d+")$/.test(rawRevision))) throw invalid();
      const expectedRevision = rawRevision === undefined ? undefined : Number(rawRevision.replace(/^"(\d+)"$/, "$1"));
      const expected = (creation = false) => creation ? (expectedRevision === undefined || expectedRevision === 0 ? 0 : (() => { throw invalid(); })()) : parse(revision, expectedRevision);
      const result = await identity.authorized(cookie, permission, async (principal, tx): Promise<Result> => {
        const scenes = new OwnedSceneService(tx, now), games = ownedGames(principal.account.id, tx);
        const run = async (): Promise<Result> => {
          if (parts[0] === "systems") {
            query(url, []);
            if (parts.length === 2 && parts[1] === "selectable" && method === "GET") return { value: { ok: true, systems: await tx.systems.selectable() } };
            if (parts.length === 1 && method === "GET") return { value: { ok: true, systems: await tx.systems.list() } };
            if (permission === "admin" && parts.length === 1 && method === "POST") { const input = parse(z.strictObject({ systemId: systemIdSchema, name: z.string().min(1).max(200) }), payload); await tx.systems.create(input.systemId,input.name); return { status: 201, value: { ok: true } }; }
            if (parts[2] !== "versions" || !/^[1-9][0-9]*$/.test(parts[3] ?? "")) throw missing();
            const ref = parse(systemRefSchema, { systemId: parts[1], version: Number(parts[3]) });
            if (parts.length === 4 && method === "GET") return { value: { ok: true, version: await tx.systems.get(ref) } };
            if (permission !== "admin") throw missing();
            if (parts.length === 4 && method === "PUT") return { value: { ok: true, version: await tx.systems.draft(ref, parse(systemDefinitionSchema,payload), expectedRevision === 0 ? 0 : expected()) } };
            if (parts.length === 5 && parts[4] === "publish" && method === "POST") { parse(z.strictObject({}),payload); return { value: { ok: true, version: await tx.systems.publish(ref,expected()) } }; }
            if ((parts.length === 5 && parts[4] === "availability" || parts.length === 7 && parts[4] === "templates" && parts[6] === "availability") && method === "PATCH") { const input = parse(z.strictObject({ availability: availabilitySchema }),payload); return { value: { ok: true, version: await tx.systems.availability(ref,input.availability,expected(),parts.length === 7 ? parts[5] : undefined) } }; }
            throw missing();
          }
          if (permission === "admin") throw missing();
          if (parts[0] === "definitions" && parts.length === 3 && method === "GET") {
            query(url, []); const kind=parse(z.enum(["scenes","monsters"]),parts[1]);const item=await tx.resources.get(kind,routeId(parts[2]));if(!item)throw missing();
            const refs=[...(item.bindings?.root?[item.bindings.root]:[]),...Object.values(item.bindings?.monsters??{})];
            const unique=[...new Map(refs.map(ref=>[JSON.stringify(ref),ref])).entries()];
            const templates=await Promise.all(unique.map(([,ref])=>tx.systems.definition(ref)));
            const indices=new Map(unique.map(([key],index)=>[key,index]));
            const monsters=Object.fromEntries(Object.entries(item.bindings?.monsters??{}).map(([id,ref])=>[id,indices.get(JSON.stringify(ref))!]));
            return {value:{ok:true,templates,monsters}};
          }
          if (parts[0] === "games") {
            if (parts.length === 1 && method === "GET") { query(url, ["limit", "offset"]); return { value: { ok: true, ...await games.list({ limit: numberQuery(url, "limit", 50, 1, 100), offset: numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER) }) } }; }
            query(url, []);
            if (parts.length === 1 && method === "POST") { const input = parse(z.strictObject({ name: gameNameSchema, systemRef: systemRefSchema }), payload); const game = await games.create(input.name, input.systemRef); return { status: 201, location: `/api/v1/dm/games/${game.id}`, value: { ok: true, game } }; }
            if (parts.length === 3 && parts[2] === "configuration" && method === "GET") return { value: { ok: true, configuration: await tx.links.resolve(routeId(parts[1])) } };
            if (parts.length === 3 && parts[2] === "resources" && method === "POST") { const input = parse(z.strictObject({ kind: z.enum(["scenes","monsters","npcs","player-characters"]), resourceId: z.uuid() }),payload); await tx.links.link(routeId(parts[1]),input.kind,input.resourceId); return { value: { ok: true } }; }
            if (parts.length !== 2) throw missing(); const key = routeId(parts[1]);
            if (method === "GET") { const game = await games.find(key); if (!game) throw missing(); return { value: { ok: true, game } }; }
            if (method === "PATCH") { const patch = parse(z.strictObject({ name: gameNameSchema.optional(), state: gameStateSchema.optional() }).refine(p => Object.keys(p).length > 0), payload); return { value: { ok: true, game: await games.update(key, patch, expected()) } }; }
            if (method === "DELETE") { parse(z.strictObject({}), payload); await games.delete(key, expected()); return { value: { ok: true } }; }
          }
          if (parts[0] === "scenes") {
            if (parts.length === 1 && method === "GET") { query(url, ["limit", "offset"]); const list = await tx.resources.list("scenes", { limit: numberQuery(url, "limit", 50, 1, 100), offset: numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER) }); return { value: { ok: true, scenes: list.items.map(({ value: v, revision }) => ({ id: v.id, name: v.name, createdAt: v.createdAt, updatedAt: v.updatedAt, revision })), total: list.total } }; }
            query(url, []);
            if ((parts.length === 1 || parts.length === 2 && parts[1] === "import") && method === "POST") { const input = parse(sceneInputSchema.extend({ bindings: resourceBindingsSchema.optional() }), payload); const resource = await scenes.save(input.name, input.scene, undefined, 0, input.bindings); return { status: 201, location: `/api/v1/dm/scenes/${resource.id}`, value: { ok: true, resource } }; }
            const key = routeId(parts[1]);
            if (parts.length === 4 && parts[2] === "links" && parts[3] === "candidates" && method === "GET") return { value: await new OwnedSceneLinksService(scenes).candidates(sceneReference(key)) };
            if (parts.length === 3 && parts[2] === "export" && method === "GET") return { value: (await scenes.get(key)).scene, exportId: key };
            if (parts.length !== 2) throw missing();
            if (method === "GET") return { value: { ok: true, resource: await scenes.get(key) } };
            if (method === "PUT") { const input = parse(sceneInputSchema.extend({ bindings: resourceBindingsSchema.optional() }), payload); return { value: { ok: true, resource: await scenes.save(input.name, input.scene, key, expected(), input.bindings) } }; }
            if (method === "DELETE") { parse(z.strictObject({}), payload); await tx.resources.remove("scenes", key, expected()); return { value: { ok: true } }; }
          }
          if (parts[0] === "assets") {
            query(url, []);
            if (upload && bytes) { const key = randomUUID(), mime = req.headers["content-type"]!; await tx.assets.create(key, mime, bytes); return { status: 201, value: { ok: true, asset: { id: key, reference: `asset:${key}`, url: `/api/v1/dm/assets/${key}`, mimeType: mime, byteLength: bytes.length } } }; }
            if (parts.length !== 2) throw missing();
            if (parts[1] === "resolve" && method === "POST") { const input = parse(resolveSchema, payload); return { value: { ok: true, assets: await Promise.all(input.references.map(async reference => ({ reference, url: await scenes.resolve(reference) }))) } }; }
            if (["GET", "HEAD"].includes(method)) { const asset = await tx.assets.get(routeId(parts[1])); if (!asset) throw missing(); return { asset }; }
          }
          if (parts[0] === "monster-templates") {
            if (parts.length === 1 && method === "GET") { query(url, ["limit", "offset"]); const list = await tx.resources.list("templates", { limit: numberQuery(url, "limit", 50, 1, 100), offset: numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER) }); return { value: { ok: true, builtIn: builtInMonsterTemplates, templates: list.items.map(r => ({ ...r.value, revision: r.revision, bindings: r.bindings })), total: list.total } }; }
            query(url, []); if (parts.length !== 2) throw missing(); const key = routeId(parts[1], true), builtIn = builtInMonsterTemplates.find(t => t.id === key);
            if (method === "GET") { const item = await tx.resources.get("templates", key); if (!item && !builtIn) throw missing(); return { value: { ok: true, template: item ? { ...item.value, revision: item.revision } : builtIn } }; }
            throw new SystemError("IMMUTABLE");
          }
          if (parts[0] === "libraries" && ["monsters", "npcs", "player-characters"].includes(parts[1])) {
            const kind = parts[1] as Exclude<ResourceKind, "scenes" | "templates">;
            if (parts.length === 2 && method === "GET") { query(url, ["text", "limit", "offset"]); const list = await tx.resources.list(kind, { text: url.searchParams.get("text") ?? "", limit: numberQuery(url, "limit", 50, 1, 100), offset: numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER) }); return { value: { ok: true, entries: list.items.map(r => ({ ...r.value, revision: r.revision, bindings: r.bindings })), total: list.total } }; }
            query(url, []); if (parts.length !== 2 && parts.length !== 3) throw missing(); const key = parts.length === 3 ? routeId(parts[2]) : undefined;
            if (key && method === "GET") { const entry = await tx.resources.get(kind, key); if (!entry) throw missing(); return { value: { ok: true, entry: { ...entry.value, revision: entry.revision, bindings: entry.bindings } } }; }
            if ((!key && method === "POST") || (key && method === "PUT")) {
              if (key && !await tx.resources.get(kind, key)) throw missing();
              const resourceInput = parse(z.object({ bindings: resourceBindingsSchema.optional() }).passthrough(), payload);
              const { bindings, ...entryPayload } = resourceInput;
              const rev = expected(!key), options = { createId: randomUUID, now: () => new Date(now()) };
              const repository = <K extends typeof kind>(k: K) => ({
                search: async (query: { text: string; limit?: number }) => (await tx.resources.list(k, query)).items.map(r => r.value),
                findById: async (id: string) => (await tx.resources.get(k, id))?.value ?? null,
                save: async (entry: Parameters<OwnedTransaction["resources"]["put"]>[1]) => (await tx.resources.put(k, entry as never, rev, bindings)).value
              });
              const entry = kind === "monsters" ? await saveMonsterLibraryEntryUseCase(repository("monsters"), { ...parse(monsterSchema, entryPayload).entry, id: key }, options) : kind === "npcs" ? await saveNpcLibraryEntryUseCase(repository("npcs"), { ...parse(npcSchema, entryPayload).entry, id: key }, options) : await savePlayerCharacterLibraryEntryUseCase(repository("player-characters"), { ...parse(characterSchema, entryPayload).entry, id: key }, options);
              return { status: key ? 200 : 201, value: { ok: true, entry: { ...entry, revision: rev + 1, bindings: (await tx.resources.get(kind, entry.id))?.bindings } } };
            }
          }
          if (parts[0] === "scene-links" && parts.length === 2 && method === "POST") {
            query(url, []);
            if (parts[1] === "connect") { const input = parse(connectSchema.extend({ expectedRevisions: revisions }), payload), { expectedRevisions, ...command } = input; return { value: await new OwnedSceneLinksService(scenes, expectedRevisions).connect(command) }; }
            if (parts[1] === "disconnect") { const input = parse(linkSchema.extend({ expectedRevisions: revisions }), payload), { expectedRevisions, ...command } = input; return { value: await new OwnedSceneLinksService(scenes, expectedRevisions).disconnect(command) }; }
            if (parts[1] === "validate") return { value: await new OwnedSceneLinksService(scenes).validate(parse(validateLinksSchema, payload)) };
            if (parts[1] === "navigate") return { value: await new OwnedSceneLinksService(scenes).navigate(parse(linkSchema, payload)) };
          }
          throw missing();
        };
        return operationId ? tx.operation(operationId, url.pathname, { method, query: url.search, payload: payload ?? null, revision: expectedRevision ?? null, mime: upload ? req.headers["content-type"] : null, bytes: bytes ? createHash("sha256").update(bytes).digest("hex") : null }, run) : run();
      });
      if (result.asset) { res.setHeader("Content-Type", result.asset.mime); res.setHeader("Content-Length", result.asset.bytes.length); res.end(method === "HEAD" ? undefined : result.asset.bytes); return; }
      if (result.location) res.setHeader("Location", result.location);
      if (result.exportId) res.setHeader("Content-Disposition", `attachment; filename="scene-${result.exportId}.ttrpgscene"`);
      send(res, result.status ?? 200, result.value);
    } catch (error) {
      const failure = error instanceof HttpError ? error : error instanceof IdentityError ? { status: ({ INVALID_INPUT: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, PASSWORD_CHANGE_REQUIRED: 403, CONFLICT: 409, NOT_FOUND: 404, RATE_LIMITED: 429, UNAVAILABLE: 503 })[error.code], code: error.code, message: error.message } : error instanceof OwnedError || error instanceof CatalogError || error instanceof SystemError ? { status: error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : ["CONFLICT", "REVISION_CONFLICT", "OPERATION_CONTENT_CONFLICT", "TEMPLATE_REFERENCED", "IMMUTABLE", "DISABLED", "INCOMPATIBLE"].includes(error.code) ? 409 : error.code === "OPERATION_BUDGET" ? 429 : error.code === "RESULT_TOO_LARGE" ? 413 : error.code === "VALIDATION" ? 422 : error.code === "CORRUPT" ? 500 : 503, code: error.code, message: error.message } : { status: 503, code: "UNAVAILABLE", message: "No se pudo completar la operación." };
      if (!req.complete) res.setHeader("Connection", "close");
      send(res, failure.status, { ok: false, error: { code: failure.code, message: failure.message, ...(error instanceof OwnedError && error.retryAt ? { retryAt: error.retryAt } : {}) } });
    }
  };
}
