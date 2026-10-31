import { Buffer } from "node:buffer";
import { setTimeout, clearTimeout } from "node:timers";
import process from "node:process";
import { createServer, request } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { openModerationBackend } from "../../../../../out/api/invitation-backend.mjs";
let raw = ""; for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw), origin = "http://localhost:8787", secret = randomBytes(32).toString("base64url"), sockets = [];
let backend, server;
async function listen() { server = createServer((req, res) => { void backend.handler(req, res); }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); }
async function stop() { sockets.splice(0).forEach(s => s.destroy()); await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await backend.close(); }
async function http(path, cookie, method = "GET", data, headers = {}) { return new Promise((resolve, reject) => {
  const req = request({ host: "127.0.0.1", port: server.address().port, path, method, headers: { host: "localhost:8787", origin, cookie, "content-type": "application/json", "idempotency-key": randomUUID(), ...headers } }, res => { const chunks = []; res.on("data", chunk => chunks.push(chunk)); res.on("end", () => { const bytes = Buffer.concat(chunks); let body; try { body = JSON.parse(bytes.toString()); } catch { /* assets */ } resolve({ status: res.statusCode, body, bytes, cookie: res.headers["set-cookie"]?.[0] }); }); }); req.on("error", reject); req.end(data === undefined ? undefined : JSON.stringify(data));
}); }
function stream(game, cookie) {
  let ended = false, bytes = "", count = 0; const events = [], waiters = [];
  const changed = () => { for (const f of [...waiters]) f(); };
  const req = request({ host: "127.0.0.1", port: server.address().port, path: `/api/v1/games/${game}/table/events`, headers: { host: "localhost:8787", origin, cookie } }, res => { sockets.push(res); let buffer = ""; res.on("data", chunk => { bytes += chunk; buffer += chunk; let end; while ((end = buffer.indexOf("\n\n")) >= 0) { const block = buffer.slice(0, end); buffer = buffer.slice(end + 2); const data = block.split("\n").find(line => line.startsWith("data: ")); if (data) { events.push(JSON.parse(data.slice(6))); count++; } } changed(); }); const done = () => { ended = true; changed(); }; res.on("end", done); res.on("close", done); }); sockets.push(req); req.end();
  const until = predicate => predicate() ? Promise.resolve() : new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error("Tiempo de stream")), 10000); const check = () => { if (predicate()) { clearTimeout(timeout); waiters.splice(waiters.indexOf(check), 1); resolve(); } }; waiters.push(check); });
  return { events, until, get ended() { return ended; }, get bytes() { return bytes; }, get count() { return count; } };
}
try {
  backend = await openModerationBackend(input.config, { publicOrigin: origin, secret }); await listen();
  const temporary = "Temporal suficientemente larga 010", permanent = "Definitiva suficientemente larga 010";
  await backend.identity.bootstrap({ email: "admin@example.test", name: "Admin", password: temporary });
  const activate = async email => { const first = await backend.identity.login(email, temporary, email); await backend.identity.changePassword(first.cookie, temporary, permanent); return (await backend.identity.login(email, permanent, email)).cookie; };
  const admin = await activate("admin@example.test"), dm = await backend.identity.createDm(admin, { email: "dm@example.test", name: "DM", password: temporary }), cookie = await activate(dm.email);
  const game = await http("/api/v1/dm/games", cookie, "POST", { name: "Compilada010", systemRef: { systemId: "generic", version: 1 } }); assert.equal(game.status, 201);
  const id = game.body.game.id, dmPath = `/api/v1/dm/games/${id}`, path = `/api/v1/games/${id}`;
  const opened = await http(dmPath + "/opening/start", cookie, "POST", { expectedOpening: null }, { "if-match": "1" }); assert.equal(opened.status, 201);
  const ctx = { openingId: opened.body.opening.id, generation: opened.body.opening.generation }, oldSecret = opened.body.invitationUrl.split("#invitacion=")[1];
  const guests = []; for (const alias of ["Ana", "Ana", "Tercero"]) { const guest = await http(path + "/admission", "", "POST", { alias, secret: oldSecret }); assert.equal(guest.status, 201); guests.push(guest); }
  await backend.identity.authorized(cookie, "dm", (_, tx) => tx.assets.create(input.asset, "image/png", Buffer.from(input.png, "base64")));
  const cmd = async (family, action, payload, mapContext = null) => http(dmPath + `/${family}/${action}`, cookie, "POST", { ...ctx, command: { requestId: randomUUID(), context: mapContext, payload } });
  const published = await cmd("table", "scene", input.snapshot); assert.equal(published.status, 200); const map = published.body.state.context;
  await cmd("dice", "context", { token: map, sceneId: "scene", mapId: "map", sceneName: "PRIVADO_DADOS_010", mapName: "PRIVADO_DADOS_010" }, map);
  const begun = await cmd("dice", "begin", { requestId: randomUUID(), contextToken: map, draft: input.draft, d20: null }, map); assert.equal(begun.status, 200);
  assert.equal((await cmd("dice", "complete", { rollId: begun.body.value.rollId, simulation: input.simulation }, map)).status, 200);
  const streams = guests.map(g => stream(id, g.cookie)); await Promise.all(streams.map(s => s.until(() => s.count > 0)));
  assert.ok(streams[1].events[0].state.dice.presentation); assert.ok(!streams[1].bytes.includes("PRIVADO")); const epoch = streams[1].events[0].epoch;
  const kickId = randomUUID();
  const kicked = await http(dmPath + `/participants/${guests[0].body.participantId}/kick`, cookie, "POST", { ...ctx, expectedInvitationVersion: 1 }, { "if-match": "1", "idempotency-key": kickId }); assert.equal(kicked.status, 200);
  await streams[0].until(() => streams[0].ended); assert.equal(streams[1].ended, false); assert.equal(streams[2].ended, false);
  assert.equal((await http(path + "/table/state", guests[0].cookie)).status, 401); assert.equal((await http(path + `/assets/${input.asset}`, guests[0].cookie)).status, 401);
  assert.equal((await http(path + `/assets/${input.asset}`, guests[1].cookie)).status, 200);
  assert.equal((await http(path + "/admission", "", "POST", { alias: "Viejo", secret: oldSecret })).status, 401);
  assert.equal((await http(path + "/admission", "", "POST", { alias: "Nuevo", secret: kicked.body.invitationUrl.split("#invitacion=")[1] })).status, 201);
  await stop(); backend = await openModerationBackend(input.config, { publicOrigin: origin, secret }); await listen();
  const replay = await http(dmPath + `/participants/${guests[0].body.participantId}/kick`, cookie, "POST", { ...ctx, expectedInvitationVersion: 1 }, { "if-match": "1", "idempotency-key": kickId }); assert.equal(replay.status, 200); assert.equal(replay.body.secretAvailable, false); assert.equal(replay.body.invitationUrl, undefined); assert.equal(replay.body.invitation.version, 2);
  const restarted = await http(path + "/table/state", guests[1].cookie); assert.equal(restarted.status, 200); assert.notEqual(restarted.body.state.epoch, epoch); assert.equal(restarted.body.state.snapshot, null); assert.equal(restarted.body.state.dice.presentation, null);
  assert.equal((await http(dmPath + "/opening/heartbeat", cookie, "POST", ctx)).status, 200); assert.equal((await cmd("table", "scene", input.snapshot)).status, 200);
  process.stdout.write("API compilada010: mapa/dado/SSE/kick/401/supervivientes/enlaces/restart PASS\n");
} catch (error) { process.stderr.write("Humo compilado010 falló: " + error.message + "\n"); process.exitCode = 1; }
finally { if (backend && server) await stop(); }
