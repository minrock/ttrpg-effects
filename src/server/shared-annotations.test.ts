import { afterEach, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request } from "node:http";
import { migrateCatalog } from "../infrastructure/server/database";
import { openModerationBackend } from "./moderation-backend";
import { createDefaultScene } from "../domain/sessions/default-scene";
import { annotationStateSchema, type AnnotationCommand, type AnnotationState } from "../shared/contracts/shared-annotations";
import { contextualStateSchema, type ContextualEvent } from "../shared/contracts/moderation";
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const close of cleanup.splice(0).reverse()) await close(); });
const origin = "http://localhost:8787";
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "ttrpg-annotations-"))); cleanup.push(() => rm(root, { recursive: true, force: true }));
  const config = { driver: "sqlite" as const, deployment: "local" as const, dataDir: root }; await migrateCatalog(config);
  const backend = await openModerationBackend(config, { publicOrigin: origin, secret: randomBytes(32).toString("base64url") }); cleanup.push(() => backend.close());
  const password = "solo pruebas efimeras 55", account = await backend.identity.createAdminLocal({ email: "test@example.test", name: "DM", password }, { mustChangePassword: false });
  const adminCookie = (await backend.identity.login(account.email, password, "test")).cookie;
  const dm = await backend.identity.createDm(adminCookie, { email: "dm@example.test", name: "DM", password });
  const initialCookie = (await backend.identity.login(dm.email, password, "dm")).cookie;
  await backend.identity.changePassword(initialCookie, password, password + " nueva");
  const dmCookie = (await backend.identity.login(dm.email, password + " nueva", "dm")).cookie;
  const game = await backend.identity.authorized(dmCookie, "dm", (_, tx) => tx.games.create(dm.id, "Mesa", { systemId: "generic", version: 1 }));
  const start = await backend.invitations.start(dmCookie, game.id, null, 1, randomUUID());
  const opening = { openingId: start.opening!.id, generation: start.opening!.generation };
  const invite = start.invitationUrl!.split("#invitacion=")[1];
  const guests = await Promise.all(["Ana", "Ana"].map(alias => backend.invitations.guests.admit(game.id, { secret: invite, alias }, randomUUID(), null)));
  const server = createServer((req, res) => { void backend.handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error(); const port = address.port;
  cleanup.push(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const path = (dm: boolean, suffix: string) => `/api/v1/${dm ? "dm/" : ""}games/${game.id}/table/${suffix}`;
  async function http(dm: boolean, cookie: string, suffix: string, payload?: unknown) {
    return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port, path: path(dm, suffix), method: payload === undefined ? "GET" : "POST", headers: { host: "localhost:8787", origin, cookie, "content-type": "application/json" } }, res => { let body = ""; res.on("data", b => { body += b; }); res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(body) })); }); req.on("error", reject); req.end(payload === undefined ? undefined : JSON.stringify(payload));
    });
  }
  const scene = createDefaultScene(), snap = { scene, camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false };
  expect((await http(true, dmCookie, "scene", { ...opening, command: { requestId: randomUUID(), context: null, payload: snap } })).status).toBe(200);
  const query = `?openingId=${opening.openingId}&generation=${opening.generation}&annotationsVersion=1`;
  async function stream(dm: boolean, cookie: string, negotiate = true, focus = false) {
    const events: ContextualEvent[] = []; let ended = false; const listeners = new Set<() => void>();
    const req = request({ host: "127.0.0.1", port, path: path(dm, "events") + (negotiate ? query + (focus ? "&focusVersion=1" : "") : focus ? `?openingId=${opening.openingId}&generation=${opening.generation}&focusVersion=1` : ""), headers: { host: "localhost:8787", origin, cookie } }, res => { let buffer = ""; res.on("data", b => { buffer += b; let end: number; while ((end = buffer.indexOf("\n\n")) >= 0) { const block = buffer.slice(0, end); buffer = buffer.slice(end + 2); const data = block.split("\n").find(l => l.startsWith("data: ")); if (data) events.push(JSON.parse(data.slice(6))); } for (const fn of listeners) fn(); }); res.on("close", () => { ended = true; for (const fn of listeners) fn(); }); }); req.on("error", () => { ended = true; }); req.end(); cleanup.push(async () => { req.destroy(); });
    const until = async (predicate: () => boolean) => { if (predicate()) return; await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { listeners.delete(check); reject(new Error(`Sin evento SSE esperado (${dm ? "DM" : "jugador"}): ${events.map(e => e.type).join(",")}; cerrado=${ended}`)); }, 5000); const check = () => { if (predicate()) { clearTimeout(timer); listeners.delete(check); resolve(); } }; listeners.add(check); }); };
    await until(() => events.some(e => e.type === "bootstrap"));
    return { events, until, close() { req.destroy(); }, get ended() { return ended; }, state: events.find(e => e.type === "bootstrap")!.state! };
  }
  const cookies = guests.map(g => `ttrpg_guest=${g.token}`);
  const state = async (dm: boolean, cookie: string) => { const response = await http(dm, cookie, "state" + query); expect(response.status).toBe(200); return contextualStateSchema.parse((response.body as { state: unknown }).state); };
  return { ...backend, http, stream, state, cookies, guests, game, opening, dmCookie, scene };
}
it("HTTP/SSE SQLite real: DM y dos jugadores, replay, ownership, negociación, reconexión y expulsión", async () => {
  const f = await fixture(), legacy = await f.stream(true, f.dmCookie, false);
  const dm = await f.stream(true, f.dmCookie), a = await f.stream(false, f.cookies[0]), b = await f.stream(false, f.cookies[1]);
  expect(legacy.state.annotations).toBeUndefined();
  const geometry = { type: "measurement" as const, points: [{ x: 0, y: 0 }, { x: 100, y: 40 }] }, id = randomUUID();
  const send = (index: number, command: AnnotationCommand, requestId = randomUUID()) => f.http(false, f.cookies[index], "annotations", { ...f.opening, command: { requestId, context: a.state.context, connectionId: index ? b.state.connectionId : a.state.connectionId, payload: command } });
  const command = { action: "create" as const, id, geometry }, requestId = randomUUID();
  expect((await send(0, command, requestId)).status).toBe(200);
  expect((await send(0, command, requestId)).status).toBe(200);
  const items = (events: ContextualEvent[]) => { const last = events.filter(e => e.type === "annotations").at(-1); return last ? annotationStateSchema.parse(last.payload).items : []; };
  await Promise.all([dm, a, b].map(st => st.until(() => items(st.events).length === 1)));
  expect(items(dm.events)[0]).toMatchObject({ id, revision: 1, author: { alias: "Ana", discriminator: 1 } });
  expect(items(a.events)[0].author.publicId).toBe(a.state.annotations!.self);
  const latencies: number[] = [];
  for (let n = 0; n < 10; n++) {
    const started = performance.now(), revision = n + 2;
    expect((await send(0, { action: "update", id, revision: revision - 1, geometry: { ...geometry, points: [{ x: 0, y: 0 }, { x: 100 + n, y: 40 }] } })).status).toBe(200);
    await Promise.all([dm, a, b].map(st => st.until(() => items(st.events)[0]?.revision === revision)));
    latencies.push(performance.now() - started);
  }
  expect(Math.max(...latencies)).toBeLessThan(500);
  console.info(`SDD55 HTTP/SSE: diez ediciones con tres conexiones; máximo ${Math.ceil(Math.max(...latencies))} ms.`);

  expect(items(b.events)[0].author.publicId).not.toBe(b.state.annotations!.self);
  expect(legacy.events.some(e => e.type === "annotations")).toBe(false);
  expect(JSON.stringify(items(b.events))).not.toContain(f.guests[0].guest.participantId);
  expect((await send(1, { action: "delete", id, revision: 1 })).status).toBe(403);
  expect((await send(0, { ...command, author: { alias: "DM" } } as AnnotationCommand)).status).toBe(400);
  expect((await send(0, { action: "update", id, revision: 0, geometry })).status).toBe(409);
  const second = randomUUID(); expect((await send(1, { action: "create", id: second, geometry: { type: "circle", points: [{ x: 30, y: 50 }], radius: 25 } })).status).toBe(200);
  a.close(); const reconnected = await f.stream(false, f.cookies[0]); expect(reconnected.state.annotations!.items).toHaveLength(2);
  const state = await f.state(true, f.dmCookie); expect(state.annotations!.sceneId).toBe(f.scene.id); expect(state.snapshot!.scene.shapes).toEqual([]);
  await f.service.kick(f.dmCookie, f.game.id, f.guests[0].guest.participantId, { ...f.opening, expectedInvitationVersion: 1 }, 1, randomUUID());
  await b.until(() => items(b.events).length === 1 && items(b.events)[0].id === second);
  expect((await send(0, { action: "create", id: randomUUID(), geometry })).status).toBe(401);
  expect((await f.state(false, f.cookies[1])).annotations!.items).toHaveLength(1);
  const clear = await f.http(true, f.dmCookie, "annotations", { ...f.opening, command: { requestId: randomUUID(), context: state.context, payload: { action: "clear-all" } } }); expect(clear.status).toBe(200);
  expect((clear.body as { annotations: AnnotationState }).annotations.items).toEqual([]);
}, 30000);

it("expulsión con comando en vuelo no confirma ni difunde el dibujo después del ACK", async () => {
  const f = await fixture(), a = await f.stream(false, f.cookies[0]), b = await f.stream(false, f.cookies[1]);
  let release!: () => void, reached!: () => void;
  const paused = new Promise<void>(resolve => { reached = resolve; }), resume = new Promise<void>(resolve => { release = resolve; });
  const original = f.invitations.guests.authorized.bind(f.invitations.guests); let calls = 0;
  vi.spyOn(f.invitations.guests, "authorized").mockImplementation(async (game, token, work) => {
    if (token === f.guests[0].token && ++calls === 2) { reached(); await resume; }
    return original(game, token, work);
  });
  const pending = f.http(false, f.cookies[0], "annotations", { ...f.opening, command: { requestId: randomUUID(), context: a.state.context, connectionId: a.state.connectionId, payload: { action: "create", id: randomUUID(), geometry: { type: "circle", points: [{ x: 0, y: 0 }], radius: 20 } } } }).catch(() => ({ status: 0, body: null }));
  try {
    await paused;
    await f.service.kick(f.dmCookie, f.game.id, f.guests[0].guest.participantId, { ...f.opening, expectedInvitationVersion: 1 }, 1, randomUUID());
  } finally { release(); }
  expect((await pending).status).not.toBe(200);
  expect((await f.state(false, f.cookies[1])).annotations!.items).toEqual([]);
  expect(b.events.filter(e => e.type === "annotations").every(e => annotationStateSchema.parse(e.payload).items.length === 0)).toBe(true);
}, 30000);

it("foco HTTP/SSE con SQLite: dos jugadores, negociación independiente, permisos, deduplicación y expulsión", async () => {
  const { attentionFrame } = await import("../domain/player/attention-focus");
  const f = await fixture(), a = await f.stream(false, f.cookies[0], true, true), b = await f.stream(false, f.cookies[1], false, true);
  expect(a.state.annotations).toBeDefined(); expect(b.state.annotations).toBeUndefined();
  const ready = async (index: number, stream: typeof a) => expect((await f.http(false, f.cookies[index], "ready", { ...f.opening, command: { requestId: randomUUID(), context: stream.state.context, revision: stream.state.revision, connectionId: stream.state.connectionId, payload: {} } })).status).toBe(200);
  await ready(0, a); await ready(1, b);
  const requestId = randomUUID(), input = { ...f.opening, command: { requestId, context: a.state.context, revision: a.state.revision, payload: { requestId, sceneId: f.scene.id, frame: attentionFrame(a.state.snapshot!), position: { x: 123.45, y: -678.9 } } } };
  expect((await f.http(false, f.cookies[0], "focus", input)).status).toBe(403);
  expect((await f.http(true, f.dmCookie, "focus", input)).body).toEqual({ ok: true, delivered: 2, incompatible: 0, notReady: 0 });
  await Promise.all([a, b].map(st => st.until(() => st.events.some(e => e.type === "focus"))));
  expect((await f.http(true, f.dmCookie, "focus", input)).status).toBe(200);
  expect(a.events.filter(e => e.type === "focus")).toHaveLength(1); expect(b.events.filter(e => e.type === "focus")).toHaveLength(1);
  expect((await f.http(true, f.dmCookie, "focus", { ...input, command: { ...input.command, payload: { ...input.command.payload, position: { x: 0, y: 0 } } } })).status).toBe(409);
  expect((await f.http(true, f.dmCookie, "focus", { ...input, padding: "x".repeat(5000) })).status).toBe(413);
  expect((await f.http(true, f.dmCookie, "camera-command", { ...input, command: { ...input.command, requestId: randomUUID(), payload: { revision: 1, camera: { center: { x: 1, y: 2 }, zoom: 4 }, reason: "zoom" } } })).status).toBe(409);
  await f.service.kick(f.dmCookie, f.game.id, f.guests[0].guest.participantId, { ...f.opening, expectedInvitationVersion: 1 }, 1, randomUUID());
  const state = await f.state(false, f.cookies[1]);
  await ready(1, { ...b, state: { ...state, protocolVersion: 1, connectionId: b.state.connectionId } });
  const next = randomUUID();
  expect((await f.http(true, f.dmCookie, "focus", { ...input, command: { ...input.command, requestId: next, payload: { ...input.command.payload, requestId: next } } })).body).toEqual({ ok: true, delivered: 1, incompatible: 0, notReady: 0 });
  await b.until(() => b.events.filter(e => e.type === "focus").length === 2);
  expect(a.events.filter(e => e.type === "focus")).toHaveLength(1);
  const reconnected = await f.stream(false, f.cookies[1], true, true);
  expect(reconnected.state.cameraCommand).toBeNull(); expect(reconnected.events.some(e => e.type === "focus")).toBe(false);
}, 30000);
