import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { createApi } from "./legacy-http.fixture";
import { LIMITS, readConfig, type ServerConfig } from "./config";
import { createDefaultScene } from "../domain/sessions/default-scene";
import { createDefaultSceneMap, createSceneWithMap } from "../domain/sessions/scene-maps";
import { parseSceneJson } from "../domain/sessions/scene-schema";
import { builtInMonsterTemplates, createEmptyMonsterTemplate } from "../domain/monster-templates/monster-template";
import type { SceneResource } from "../shared/contracts/http-api";

const origin = "http://127.0.0.1:8787";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
let dir: string; let api: ReturnType<typeof createApi>; let base: string; let config: ServerConfig; let time: number; let dm: string; let player: string;
async function start() { api = createApi(config, { version: "3.3.0", now: () => time }); base = `http://127.0.0.1:${await api.listen()}/api/v1`; }
async function call(path: string, method = "GET", payload?: unknown, cookie = dm, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { Host: new URL(origin).host, Origin: origin, ...extra };
  if (cookie) headers.Cookie = cookie;
  if (payload !== undefined) { headers["Content-Type"] ??= "application/json"; headers["Content-Length"] = String(Buffer.byteLength(payload instanceof Buffer ? payload : JSON.stringify(payload))); }
  if (headers.Origin === "omit") delete headers.Origin;
  return new Promise<Response>((resolve, reject) => {
    const req = request(base + path, { method, headers, agent: false }, (res) => {
      const chunks: Buffer[] = []; res.on("data", (chunk) => chunks.push(chunk)); res.on("end", () => {
        const responseHeaders = new Headers(); for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
        resolve(new Response(res.statusCode === 204 ? null : Buffer.concat(chunks), { status: res.statusCode, headers: responseHeaders }));
      });
    }); req.on("error", reject); req.end(payload === undefined ? undefined : payload instanceof Buffer ? payload : JSON.stringify(payload));
  });
}
async function login(key: string, cookie = "") {
  const response = await call("/auth/login", "POST", { key }, cookie);
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")!.split(";")[0];
}
async function saveScene(scene = createDefaultScene(), name = "Mesa") {
  const response = await call("/scenes", "POST", { name, scene });
  expect(response.status).toBe(201);
  return (await response.json()).resource as SceneResource;
}
beforeEach(async () => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-api-test-"))); time = Date.parse("2026-10-28T12:00:00Z");
  config = { host: "127.0.0.1", port: 0, dataDir: dir, publicOrigin: origin, dmKey: "d".repeat(32), playerKey: "p".repeat(32) };
  await start(); dm = await login(config.dmKey); player = await login(config.playerKey);
});
afterEach(async () => { await api?.close(); rmSync(dir, { recursive: true, force: true }); });

describe("API real privada", () => {
  it("salud, sesión, cookies, rotación, logout y expiración absoluta", async () => {
    expect(await (await call("/health", "GET", undefined, "")).json()).toEqual({ ok: true, status: "ok", version: "3.3.0" });
    const response = await call("/auth/login", "POST", { key: config.dmKey }, dm);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly; SameSite=Strict; Path=\/api\/v1; Max-Age=28800/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const rotated = response.headers.get("set-cookie")!.split(";")[0];
    expect((await call("/auth/session")).status).toBe(401);
    expect((await (await call("/auth/session", "GET", undefined, player)).json()).role).toBe("player");
    expect((await call("/auth/logout", "POST", undefined, rotated)).status).toBe(204);
    expect((await call("/auth/session", "GET", undefined, rotated)).status).toBe(401);
    expect((await call("/auth/logout", "POST", undefined, rotated)).status).toBe(204);
    time += LIMITS.sessionMs;
    expect((await call("/auth/session", "GET", undefined, player)).status).toBe(401);
  });
  it("rechaza elevación de rol, claves erróneas y limita intentos por conexión", async () => {
    expect((await call("/auth/login", "POST", { key: config.playerKey, role: "dm" }, "")).status).toBe(422);
    expect((await call("/scenes", "GET", undefined, player + "; role=dm")).status).toBe(403);
    for (let i = 0; i < 7; i++) expect((await call("/auth/login", "POST", { key: "bad" }, "", { "X-Forwarded-For": `${i}` })).status).toBe(401);
    const limited = await call("/auth/login", "POST", { key: config.dmKey }, "");
    expect(limited.status).toBe(429); expect(limited.headers.get("retry-after")).toBe("60");
    time += 60_001; expect((await call("/auth/login", "POST", { key: config.dmKey }, "")).status).toBe(200);
  });
  it("valida Host y Origin sin confiar en headers de proxy", async () => {
    for (const headers of [{ Origin: "null" }, { Origin: "https://evil.example" }, { Origin: "" }, { Host: "evil.example" }] as Record<string, string>[]) {
      expect((await call("/auth/login", "POST", { key: config.dmKey }, "", headers)).status).toBe(403);
    }
    const absent = await call("/auth/logout", "POST", undefined, dm, { Origin: "omit" });
    expect(absent.status).toBe(403);
    expect((await call("/health", "GET", undefined, "", { Origin: "https://evil.example" })).status).toBe(403);
    expect((await call("/auth/session", "GET", undefined, dm, { Origin: "omit" })).status).toBe(200);
  });
  it.each(["/scenes", "/assets/resolve", "/monster-templates", "/libraries/monsters", "/libraries/npcs", "/libraries/player-characters"])("matriz de autorización %s", async (path) => {
    const method = path === "/assets/resolve" ? "POST" : "GET"; const payload = method === "POST" ? { references: [] } : undefined;
    expect((await call(path, method, payload, "")).status).toBe(401);
    expect((await call(path, method, payload, player)).status).toBe(path === "/assets/resolve" ? 200 : 403);
    expect((await call(path, method, payload)).status).toBe(200);
  });
  it("CRUD, exportación y concurrencia sobreviven reinicio; no hay JSON parcial", async () => {
    const created = await Promise.all(Array.from({ length: 12 }, (_, i) => saveScene(createDefaultScene(), `Mesa ${i}`)));
    expect((await (await call("/scenes?limit=5&offset=0")).json()).total).toBe(12);
    const resource = created[0];
    const writes = await Promise.all(Array.from({ length: 8 }, (_, i) => call(`/scenes/${resource.id}`, "PUT", { name: `Cambio ${i}`, scene: resource.scene })));
    expect(writes.every((response) => response.status === 200)).toBe(true);
    const result = (await (await call(`/scenes/${resource.id}`)).json()).resource;
    expect(result.createdAt).toBe(resource.createdAt); expect(result.name).toMatch(/^Cambio /);
    const exported = await call(`/scenes/${resource.id}/export`);
    expect(exported.headers.get("content-disposition")).toContain(`${resource.id}.ttrpgscene`);
    expect(parseSceneJson(await exported.text())).toEqual(result.scene);
    await api.close(); await start(); dm = await login(config.dmKey);
    expect((await (await call("/scenes")).json()).total).toBe(12);
    expect((await call(`/scenes/${resource.id}`, "DELETE")).status).toBe(204);
    expect((await call(`/scenes/${resource.id}`)).status).toBe(404);
  });
  it("importa v1/v2 y conserva mapas, privados, referencias e imágenes ausentes", async () => {
    const scene = createDefaultScene(); const second = createDefaultSceneMap({ id: "second", name: "Segundo" });
    const multi = { ...scene, maps: [...scene.maps, { ...second, map: { ...second.map, imagePath: "/external/secret.png" } }], sceneAside: { ...scene.sceneAside, npcs: [{ id: "npc", name: "Privado", imagePath: null, visibleToPlayer: false, notes: "secreto DM" }] } };
    const response = await call("/scenes/import", "POST", { name: "Import", scene: multi });
    expect(response.status).toBe(201); const data = (await response.json()).resource;
    expect(data.scene.maps).toHaveLength(2);
    expect(data.missingImages).toContainEqual({ reference: "/external/secret.png", locations: ["maps/second/map"] });
    const legacy = { ...scene, version: 1, maps: undefined, activeMapId: undefined };
    const imported = await call("/scenes/import", "POST", { name: "Legacy", scene: legacy });
    expect(imported.status).toBe(201); const migrated = (await imported.json()).resource;
    expect(migrated.scene.version).toBe(2); expect(migrated.warnings[0].code).toBe("scene-format-outdated");
  });
  it("rechaza escena sin mapas, futura, malformada y cuerpo JSON roto sin publicar", async () => {
    for (const scene of [{ ...createDefaultScene(), version: 99 }, { ...createDefaultScene(), maps: [], activeMapId: null }, {}, null]) expect((await call("/scenes", "POST", { name: "x", scene })).status).toBe(422);
    expect((await call("/scenes", "POST", Buffer.from("{"))).status).toBe(400);
    expect((await (await call("/scenes")).json()).total).toBe(0);
  });
  it("sube, sirve, resuelve y recupera imágenes sin leer referencias del host", async () => {
    const sentinel = join(dir, "sentinel.png"); writeFileSync(sentinel, "private");
    const scene = createSceneWithMap(createDefaultSceneMap({ id: "map-id", name: "Map" }));
    const original = { ...scene, map: { ...scene.map, imagePath: sentinel } };
    const saved = await saveScene(original);
    expect(saved.missingImages[0].reference).toBe(sentinel);
    const response = await call("/assets", "POST", png, dm, { "Content-Type": "image/png" });
    expect(response.status).toBe(201); const { asset } = await response.json();
    const download = await call(`/assets/${asset.id}`);
    expect(download.headers.get("content-type")).toBe("image/png"); expect(download.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await download.arrayBuffer())).toEqual(png);
    expect((await call(`/assets/${asset.id}`, "GET", undefined, player)).status).toBe(404);
    expect((await call(`/assets/${asset.id}`, "GET", undefined, "")).status).toBe(401);
    const resolution = await call("/assets/resolve", "POST", { references: [sentinel, "https://evil.example/image", `asset:${randomUUID()}`, asset.reference] });
    expect((await resolution.json()).assets.map((a: { url: string | null }) => a.url)).toEqual([null, null, null, asset.url]);
    const changed = { ...saved.scene, map: { ...saved.scene.map, imagePath: asset.reference } };
    expect((await call(`/scenes/${saved.id}`, "PUT", { name: saved.name, scene: changed })).status).toBe(200);
    const repaired = (await (await call(`/scenes/${saved.id}`)).json()).resource;
    expect(repaired.missingImages).toEqual([]); expect(repaired.scene.grid).toEqual(saved.scene.grid); expect(repaired.scene.id).toBe(saved.scene.id);
    await call(`/scenes/${saved.id}`, "DELETE"); await api.close(); await start(); dm = await login(config.dmKey);
    expect((await call(`/assets/${asset.id}`)).status).toBe(200); expect(readFileSync(sentinel, "utf8")).toBe("private");
  });
  it.each([["pixel.jpg", "image/jpeg"], ["pixel.webp", "image/webp"]])("imagen real %s, MIME, truncamiento y persistencia", async (file, mime) => {
    const bytes = readFileSync(new URL(`./fixtures/${file}`, import.meta.url));
    const response = await call("/assets", "POST", bytes, dm, { "Content-Type": mime });
    expect(response.status).toBe(201); const { asset } = await response.json();
    expect(Buffer.from(await (await call(`/assets/${asset.id}`)).arrayBuffer())).toEqual(bytes);
    for (const size of [1, 8, Math.floor(bytes.length / 2), bytes.length - 1]) expect((await call("/assets", "POST", bytes.subarray(0, size), dm, { "Content-Type": mime })).status).toBe(422);
  });
  it("deniega todas las mutaciones privadas a anónimos y jugadores", async () => {
    const id = randomUUID();
    const routes = [["/scenes", "POST"], ["/scenes/import", "POST"], [`/scenes/${id}`, "PUT"], [`/scenes/${id}`, "DELETE"], ["/assets", "POST"], ["/monster-templates/custom", "PUT"], ["/monster-templates/custom", "DELETE"], ...["monsters", "npcs", "player-characters"].flatMap((kind) => [[`/libraries/${kind}`, "POST"], [`/libraries/${kind}/${id}`, "PUT"]])];
    for (const [path, action] of routes) {
      expect((await call(path, action, {}, "")).status, `${action} ${path}`).toBe(401);
      expect((await call(path, action, {}, player)).status).toBe(403);
    }
  });
  it("enlaces legacy y referencias en tokens/retratos se conservan sin resolver archivos", async () => {
    const external = join(dir, "sentinel.ttrpgscene"); writeFileSync(external, "SECRET");
    const source = createDefaultScene(); const map = source.maps[0];
    const endpoint = { scenePath: external, markerId: "marker" };
    const scene = { ...source, mapAnnotations: { ...map.mapAnnotations, sceneLinks: [{ id: "marker", kind: "scene-link", position: { x: 1, y: 2 }, name: "Link", locked: false, connection: { connectionId: "connection", role: "origin", origin: endpoint, destination: endpoint, peer: endpoint } }] },
      tokens: [{ id: "token", name: "Token", type: "npc", imagePath: external, position: { x: 1, y: 2 }, size: "medium", footprintCells: 1, selectionColor: "#ffffff", badgeNumber: 1, order: 1, visible: true }],
      sceneAside: { ...source.sceneAside, npcs: [{ id: "npc", name: "NPC", imagePath: "https://localhost:1/do-not-fetch", notes: "DM private", visibleToPlayer: false }] }
    };
    const response = await call("/scenes/import", "POST", { name: "Legacy link", scene }); expect(response.status).toBe(201);
    const resource = (await response.json()).resource;
    expect(resource.warnings.some((warning: { code: string }) => warning.code === "external-link-unresolved")).toBe(true);
    expect(resource.missingImages).toHaveLength(2); expect(resource.scene.sceneAside.npcs[0].notes).toBe("DM private");
    expect(resource.scene.mapAnnotations.sceneLinks[0].connection.peer.scenePath).toBe(external);
    expect(readFileSync(external, "utf8")).toBe("SECRET");
  });
  it("C-1: WebP sin flujo o truncado con tamaños coherentes no publica assets", async () => {
    const incomplete = Buffer.from("5249464612000000574542505650384c060000002f0000000000", "hex");
    const broken = [incomplete];
    for (const file of ["pixel.webp", "pixel-lossless.webp"]) {
      const complete = readFileSync(new URL(`./fixtures/${file}`, import.meta.url));
      const chunkSize = complete.readUInt32LE(16);
      const remaining = Math.max(6, Math.floor(chunkSize / 2));
      const truncated = Buffer.concat([complete.subarray(0, 20 + remaining), Buffer.alloc(remaining % 2)]);
      truncated.writeUInt32LE(truncated.length - 8, 4); truncated.writeUInt32LE(remaining, 16);
      broken.push(truncated);
    }
    for (const bytes of broken) expect((await call("/assets", "POST", bytes, dm, { "Content-Type": "image/webp" })).status).toBe(422);
    const db = new DatabaseSync(join(dir, "service.sqlite"));
    expect(db.prepare("SELECT count(*) AS n FROM assets").get()!.n).toBe(0); db.close();
    const valid = readFileSync(new URL("./fixtures/pixel-lossless.webp", import.meta.url));
    const accepted = await call("/assets", "POST", valid, dm, { "Content-Type": "image/webp" });
    expect(accepted.status).toBe(201); const { asset } = await accepted.json();
    expect(Buffer.from(await (await call(`/assets/${asset.id}`)).arrayBuffer())).toEqual(valid);
  });
  it.each([["interlaced.png", "image/png"], ["animated.webp", "image/webp"]])("UX-01: variante %s explica conversión sin llamarla dañada", async (file, mime) => {
    const bytes = readFileSync(new URL(`./fixtures/${file}`, import.meta.url));
    const response = await call("/assets", "POST", bytes, dm, { "Content-Type": mime });
    expect(response.status).toBe(415);
    const error = (await response.json()).error;
    expect(error.code).toBe("UNSUPPORTED_IMAGE_VARIANT"); expect(error.message).toContain("Convierte"); expect(error.message).not.toContain("dañada");
  });
  it("rechaza MIME falso, SVG, HTML, truncados y dimensiones excesivas", async () => {
    for (const [bytes, mime] of [[Buffer.from("<svg/>"), "image/svg+xml"], [Buffer.from("<html/>"), "image/png"], [png, "image/jpeg"], [png.subarray(0, -3), "image/png"]] as const) {
      const result = await call("/assets", "POST", bytes, dm, { "Content-Type": mime }); expect([415, 422]).toContain(result.status);
    }
  });
  it.each(["monsters", "npcs", "player-characters"])("biblioteca %s guarda/busca/actualiza y persiste", async (kind) => {
    const entry = kind === "monsters" ? { name: "Ogro ' OR 1=1 --", system: "5e", contentMarkdown: "Privado" } : kind === "npcs" ? { name: "Guía", notes: "Privado" } : { characterName: "Heroína", stats: { strength: "+2" } };
    const created = await call(`/libraries/${kind}`, "POST", { entry }); expect(created.status).toBe(201); const saved = (await created.json()).entry;
    expect((await call(`/libraries/${kind}/${saved.id}`, "PUT", { entry })).status).toBe(200);
    expect((await call(`/libraries/${kind}/${randomUUID()}`, "PUT", { entry })).status).toBe(404);
    expect((await call(`/libraries/${kind}`, "POST", { entry: { ...entry, id: randomUUID() } })).status).toBe(422);
    expect((await call(`/libraries/${kind}`, "POST", { entry: { ...entry, notes: 3 } })).status).toBe(422);
    await api.close(); await start(); dm = await login(config.dmKey);
    expect((await (await call(`/libraries/${kind}/${saved.id}`)).json()).entry.id).toBe(saved.id);
    expect((await (await call(`/libraries/${kind}?text=${encodeURIComponent("' OR 1=1 --")}`)).json()).entries).toHaveLength(kind === "monsters" ? 1 : 0);
  });
  it("plantillas persistentes con protección de incorporadas y metadatos", async () => {
    const template = createEmptyMonsterTemplate("custom-template");
    expect((await call(`/monster-templates/${template.id}`, "PUT", { template })).status).toBe(200);
    for (const action of ["PUT", "DELETE"]) expect((await call(`/monster-templates/${builtInMonsterTemplates[0].id}`, action, action === "PUT" ? { template } : undefined)).status).toBe(403);
    expect((await call(`/monster-templates/${template.id}`, "PUT", { template: { ...template, builtIn: true } })).status).toBe(422);
    await api.close(); await start(); dm = await login(config.dmKey);
    expect((await (await call("/monster-templates")).json()).templates.some((t: { id: string }) => t.id === template.id)).toBe(true);
    expect((await call(`/monster-templates/${template.id}`, "DELETE")).status).toBe(200);
  });
  it("queries, métodos, IDs y traversal no acceden a rutas", async () => {
    for (const path of ["/scenes?limit=0", "/scenes?limit=2.3", "/scenes?offset=-1", "/scenes?limit=2&limit=3", "/scenes?path=/etc/passwd", "/assets/%252e%252e", "/assets/%2fetc%2fpasswd", "/assets/a%5cb", "/assets/not-an-id"]) expect((await call(path)).status, path).toBe(400);
    expect((await call("/scenes", "PATCH", {})).status).toBe(405);
    expect((await call(`/scenes/${randomUUID()}`)).status).toBe(404);
    const saved = await saveScene(createDefaultScene(), '../../evil\r\nX-Evil: yes');
    expect((await call(`/scenes/${saved.id}/export`)).headers.get("content-disposition")).not.toContain("evil");
  });
  it("traversal sin normalización del cliente se rechaza antes de buscar archivos", async () => {
    const address = new URL(base);
    for (const segment of ["..", "%2e%2e", "%252e%252e"]) {
      const status = await new Promise<number>((resolve, reject) => {
        const req = request({ hostname: address.hostname, port: address.port, path: `/api/v1/assets/${segment}/sentinel`, headers: { Host: new URL(origin).host, Cookie: dm }, agent: false }, (res) => { res.resume(); resolve(res.statusCode!); });
        req.on("error", reject); req.end();
      });
      expect(status).toBe(400);
    }
  });
  it("límites de DTO impiden normalizar silenciosamente referencias y campos largos", async () => {
    expect((await call("/assets/resolve", "POST", { references: Array(201).fill("missing") })).status).toBe(422);
    expect((await call("/assets/resolve", "POST", { references: ["x".repeat(2049)] })).status).toBe(422);
    const source = createDefaultScene();
    expect((await call("/scenes", "POST", { name: "Map", scene: { ...source, map: { ...source.map, imagePath: "x".repeat(2049) } } })).status).toBe(422);
    expect((await call("/libraries/npcs", "POST", { entry: { name: "x".repeat(201) } })).status).toBe(422);
    expect((await (await call("/scenes")).json()).total).toBe(0);
  });
  it("fallo SQLite devuelve error útil y preserva recursos confirmados", async () => {
    const saved = await saveScene(); const db = new DatabaseSync(join(dir, "service.sqlite"));
    db.exec("CREATE TRIGGER fail_write BEFORE UPDATE ON scenes BEGIN SELECT RAISE(ABORT, 'private-path-and-sql'); END");
    const response = await call(`/scenes/${saved.id}`, "PUT", { name: "Fail", scene: saved.scene });
    expect(response.status).toBe(500); expect(await response.text()).not.toContain("private-path-and-sql"); db.close();
    await api.close(); await start(); dm = await login(config.dmKey);
    expect((await (await call(`/scenes/${saved.id}`)).json()).resource.name).toBe(saved.name);
  });
  it.each(["version", "structure", "identity", "metadata", "dates", "warnings", "json"])("C-2: escena persistida corrupta %s falla tras reiniciar sin sobrescribir ni afectar otras", async (kind) => {
    const good = await saveScene(createDefaultScene(), "Sana"); const bad = await saveScene(createDefaultScene(), "Corrupta");
    await api.close(); const db = new DatabaseSync(join(dir, "service.sqlite"));
    const saved = JSON.parse((db.prepare("SELECT body FROM scenes WHERE id=?").get(bad.id) as { body: string }).body);
    if (kind === "version") saved.scene.version = 99;
    if (kind === "structure") saved.scene = { version: 2, maps: [], sceneAside: {} };
    if (kind === "identity") saved.id = randomUUID();
    if (kind === "dates") saved.createdAt = "not-a-date";
    if (kind === "warnings") saved.warnings = [{ code: "injected", message: "bad" }];
    const corrupted = kind === "json" ? "{" : JSON.stringify(saved);
    db.prepare("UPDATE scenes SET body=? WHERE id=?").run(corrupted, bad.id);
    if (kind === "metadata") db.prepare("UPDATE scenes SET name=? WHERE id=?").run("Otra identidad", bad.id);
    db.close(); await start(); dm = await login(config.dmKey);
    for (const suffix of ["", "/export"]) {
      const response = await call(`/scenes/${bad.id}${suffix}`); expect(response.status).toBe(500);
      expect((await response.json()).error.code).toBe("STORAGE_CORRUPT");
    }
    expect((await call(`/scenes/${bad.id}`, "PUT", { name: "Reemplazo", scene: good.scene })).status).toBe(500);
    expect((await call(`/scenes/${good.id}`)).status).toBe(200);
    expect((await call(`/scenes/${good.id}/export`)).status).toBe(200);
    const check = new DatabaseSync(join(dir, "service.sqlite"));
    expect(check.prepare("SELECT body FROM scenes WHERE id=?").get(bad.id)!.body).toBe(corrupted); check.close();
  });
  it("C-2: solo migra versiones persistidas admitidas y valida metadatos del catálogo", async () => {
    const saved = await saveScene(); await api.close(); const db = new DatabaseSync(join(dir, "service.sqlite"));
    const body = JSON.parse((db.prepare("SELECT body FROM scenes WHERE id=?").get(saved.id) as { body: string }).body);
    body.scene.version = 1; delete body.scene.maps; delete body.scene.activeMapId;
    db.prepare("UPDATE scenes SET body=? WHERE id=?").run(JSON.stringify(body), saved.id); db.close();
    await start(); dm = await login(config.dmKey);
    const migrated = (await (await call(`/scenes/${saved.id}`)).json()).resource;
    expect(migrated.scene.version).toBe(2); expect(migrated.warnings.some((warning: { code: string }) => warning.code === "scene-format-outdated")).toBe(true);
    const bad = new DatabaseSync(join(dir, "service.sqlite")); bad.prepare("UPDATE scenes SET updated_at='not-a-date' WHERE id=?").run(saved.id); bad.close();
    expect((await call("/scenes")).status).toBe(500);
  });
  it.each(["identity", "builtIn", "shape", "date", "json"])("plantilla persistida corrupta %s no sale como éxito ni permite escrituras parciales", async (kind) => {
    const original = createEmptyMonsterTemplate("persisted-template");
    expect((await call(`/monster-templates/${original.id}`, "PUT", { template: original })).status).toBe(200);
    const good = await saveScene(); await api.close(); const db = new DatabaseSync(join(dir, "service.sqlite"));
    const saved = JSON.parse((db.prepare("SELECT body FROM templates WHERE id=?").get(original.id) as { body: string }).body);
    if (kind === "identity") saved.id = "another-template";
    if (kind === "builtIn") saved.builtIn = true;
    if (kind === "shape") saved.markdown = 42;
    if (kind === "date") saved.updatedAt = "bad";
    const corrupted = kind === "json" ? "{" : JSON.stringify(saved);
    db.prepare("UPDATE templates SET body=? WHERE id=?").run(corrupted, original.id); db.close();
    await start(); dm = await login(config.dmKey);
    const response = await call("/monster-templates"); expect(response.status).toBe(500); expect((await response.json()).error.code).toBe("STORAGE_CORRUPT");
    const next = createEmptyMonsterTemplate("new-template");
    expect((await call(`/monster-templates/${next.id}`, "PUT", { template: next })).status).toBe(500);
    expect((await call(`/scenes/${good.id}`)).status).toBe(200);
    const check = new DatabaseSync(join(dir, "service.sqlite"));
    expect(check.prepare("SELECT body FROM templates WHERE id=?").get(original.id)!.body).toBe(corrupted);
    expect(check.prepare("SELECT id FROM templates WHERE id=?").get(next.id)).toBeUndefined(); check.close();
  });
  it("rechaza symlinks y segunda instancia sin tocar centinela", async () => {
    expect(() => createApi(config, { version: "test" })).toThrow();
    await api.close(); const external = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-external-"))); const target = join(external, "sentinel"); writeFileSync(target, "private");
    rmSync(join(dir, "service.sqlite")); symlinkSync(target, join(dir, "service.sqlite"));
    expect(() => createApi(config, { version: "test" })).toThrow(); expect(readFileSync(target, "utf8")).toBe("private");
    rmSync(external, { recursive: true, force: true });
  });
  it("límites reales con Content-Length/chunked y upload abortado no publican assets", async () => {
    const raw = (length: number, declared: boolean) => new Promise<number>((resolve, reject) => {
      const req = request(base + "/assets", { method: "POST", agent: false, headers: { Host: new URL(origin).host, Origin: origin, Cookie: dm, "Content-Type": "image/png", ...(declared ? { "Content-Length": length } : { "Transfer-Encoding": "chunked" }) } }, (res) => { res.resume(); resolve(res.statusCode!); });
      req.on("error", reject); if (declared) req.end(Buffer.alloc(1)); else req.end(Buffer.alloc(length));
    });
    expect(await raw(LIMITS.imageBytes + 1, true).catch((e: Error) => { throw new Error(`declared: ${e.message}`); })).toBe(413);
    expect(await raw(LIMITS.imageBytes + 1, false).catch((e: Error) => { throw new Error(`chunked: ${e.message}`); })).toBe(413);
    expect((await call("/auth/login", "POST", { key: "x".repeat(LIMITS.loginBytes) }, "")).status).toBe(413);
    const db = new DatabaseSync(join(dir, "service.sqlite")); expect(db.prepare("SELECT count(*) AS n FROM assets").get()!.n).toBe(0);
    await new Promise<void>((resolve) => { const req = request(base + "/assets", { method: "POST", agent: false, headers: { Host: new URL(origin).host, Origin: origin, Cookie: dm, "Content-Type": "image/png", "Content-Length": 1000 } }); req.on("error", () => resolve()); req.write(png); setTimeout(() => req.destroy(), 20); });
    expect(db.prepare("SELECT count(*) AS n FROM assets").get()!.n).toBe(0); db.close();
  });
  it("configuración insegura falla antes de escuchar y HTTPS activa Secure", async () => {
    expect(() => readConfig({})).toThrow();
    for (const changed of [{ dmKey: "short" }, { playerKey: config.dmKey }, { publicOrigin: "http://example.com" }, { publicOrigin: "https://example.com/path" }, { port: 65536 }]) expect(() => createApi({ ...config, ...changed }, { version: "test" })).toThrow();
    await api.close(); config = { ...config, publicOrigin: "https://private.example" }; await start();
    const res = await call("/auth/login", "POST", { key: config.dmKey }, "", { Host: "private.example", Origin: "https://private.example" });
    expect(res.status).toBe(200); expect(res.headers.get("set-cookie")).toContain("; Secure");
  });
});
