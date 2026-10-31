import process from "node:process";
import { createServer, request } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const backend = await import(pathToFileURL(resolve("out/api/invitation-backend.mjs")).href);
let raw = ""; for await (const chunk of process.stdin) raw += chunk;
const config = JSON.parse(raw), origin = "http://localhost:8787", secret = randomBytes(32).toString("base64url");
const identity = await backend.openIdentity(config, { publicOrigin: origin, secret });
const invitations = await backend.openInvitations(config, identity, origin);
const auth = backend.createIdentityHttp(identity, origin), owned = backend.createOwnedHttp(identity, origin), guest = backend.createInvitationHttp(invitations, identity, origin);
const server = createServer((req, res) => { void (backend.isInvitationPath(req.url.split("?")[0]) ? guest : req.url.startsWith("/api/v1/identity/") ? auth : owned)(req, res); });
try {
  const temporary = "Temporal para humo compilado 009", permanent = "Definitiva para humo compilado 009";
  await identity.bootstrap({ email: "admin@example.test", name: "Operador", password: temporary });
  async function activate(email) { const a = await identity.login(email, temporary, email); await identity.changePassword(a.cookie, temporary, permanent); return (await identity.login(email, permanent, email)).cookie; }
  const admin = await activate("admin@example.test"), dm = await identity.createDm(admin, { email: "dm@example.test", name: "DM", password: temporary }), cookie = await activate(dm.email);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  async function http(path, method, data, headers = {}) { return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method, headers: { host: "localhost:8787", origin, "content-type": "application/json", "idempotency-key": randomUUID(), ...headers } }, res => { let body = ""; res.on("data", b => body += b); res.on("end", () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null, cookie: res.headers["set-cookie"]?.[0] })); }); req.on("error", reject); req.end(data === undefined ? undefined : JSON.stringify(data));
  }); }
  const game = await http("/api/v1/dm/games", "POST", { name: "Compilada", systemRef: { systemId: "generic", version: 1 } }, { cookie }); assert.equal(game.status, 201);
  const id = game.body.game.id, dmPath = `/api/v1/dm/games/${id}`, publicPath = `/api/v1/games/${id}`;
  const start = await http(dmPath + "/opening/start", "POST", { expectedOpening: null }, { cookie, "if-match": "1" }); assert.equal(start.status, 201);
  const original = start.body.invitationUrl.split("#invitacion=")[1], ctx = { openingId: start.body.opening.id, generation: start.body.opening.generation };
  const joined = await http(publicPath + "/admission", "POST", { secret: original, alias: "Humo" }); assert.equal(joined.status, 201); assert.ok(joined.cookie.includes("HttpOnly"));
  const rotated = await http(dmPath + "/invitation/rotate", "POST", { ...ctx, expectedInvitationVersion: 1 }, { cookie, "if-match": "1" }); assert.equal(rotated.status, 200);
  assert.equal((await http(publicPath + "/admission", "POST", { secret: original, alias: "Anterior" })).status, 401);
  assert.equal((await http(publicPath + "/admission", "POST", { secret: rotated.body.invitationUrl.split("#invitacion=")[1], alias: "Nuevo" })).status, 201);
  const session = await http(publicPath + "/guest/session", "GET", undefined, { cookie: joined.cookie }); assert.equal(session.status, 200); assert.equal(session.body.participantId, joined.body.participantId);
  assert.equal((await http(dmPath + "/opening/close", "POST", ctx, { cookie, "if-match": "1" })).status, 204);
  assert.equal((await http(publicPath + "/guest/session", "GET", undefined, { cookie: joined.cookie })).status, 401);
  process.stdout.write("API compilada009: emitir/canjear/rotar/viejo/nuevo/sesión/cierre PASS\n");
} catch { process.stderr.write("Humo compilado009 falló.\n"); process.exitCode = 1; }
finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await invitations.close(); await identity.close(); }
