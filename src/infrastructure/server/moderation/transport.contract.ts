import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { request, ServerResponse } from "node:http";
import sharp from "sharp";
import { setup, cleanup, context, invitationSecret, http, deferred, stream, snapshot } from "./fixtures";
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Frontera de envío010 ${kind}`, () => {
  it("kick antes del primer frame descarta bootstrap en cola y cierra antes del ACK", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "en cola" }, randomUUID(), null);
    const reached = deferred(), release = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests); let calls = 0;
    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { if (token === guest.token && ++calls === 3) { reached.resolve(); await release.promise; } return original(game, token, work); });
    const st = stream(s.port, s.a1.id, `ttrpg_guest=${guest.token}`); await reached.promise;
    const result = await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); expect(result.outcome).toBe("revoked");
    release.resolve(); await st.until(() => st.ended); expect(st.events.map(e => e.type)).toEqual(["terminal"]); expect(st.bytes).not.toContain('"snapshot"');
  });
  it("backpressure real: no encola otro chunk tras kick y resolve/HEAD/range/cookie copiada deniegan", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "descarga" }, randomUUID(), null), asset = randomUUID();
    const image = await sharp(randomBytes(2048 * 1536 * 4), { raw: { width: 2048, height: 1536, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer();
    await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", image));
    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...context(start), command: { requestId: randomUUID(), context: null, payload: snapshot(asset) } })).status).toBe(200);
    const reached = deferred(), originalWrite = ServerResponse.prototype.write, originalEmit = ServerResponse.prototype.emit; let protectedWrites = 0; const blocked = new Set<ServerResponse>();
    vi.spyOn(ServerResponse.prototype, "write").mockImplementation(function (this: ServerResponse, ...args: Parameters<typeof originalWrite>) {
      const result = originalWrite.apply(this, args);
      if (this.req.url?.endsWith(`/assets/${asset}`)) { protectedWrites++; blocked.add(this); reached.resolve(); return false; }
      return result;
    });
    vi.spyOn(ServerResponse.prototype, "emit").mockImplementation(function (this: ServerResponse, ...args: Parameters<typeof originalEmit>) { if (blocked.has(this) && args[0] === "drain") return false; return originalEmit.apply(this, args); });
    let received = 0;
    const ended = new Promise<void>((resolve, reject) => { const req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.a1.id}/assets/${asset}`, headers: { host: "localhost:8787", cookie: `ttrpg_guest=${guest.token}` } }, res => { res.on("data", b => { received += b.length; }); res.on("close", resolve); res.on("error", () => resolve()); }); req.on("error", reject); req.end(); });
    await reached.promise; expect(protectedWrites).toBe(1);
    await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); await ended;
    expect(protectedWrites).toBe(1); expect(received).toBeLessThanOrEqual(65536); vi.restoreAllMocks();
    for (const method of ["GET", "HEAD"]) expect((await http(s.port, `/api/v1/games/${s.a1.id}/assets/${asset}`, `ttrpg_guest=${guest.token}`, method, undefined, { Range: "bytes=0-999", "if-none-match": "*" })).status).toBe(401);
    expect((await http(s.port, `/api/v1/games/${s.a1.id}/assets/resolve`, `ttrpg_guest=${guest.token}`, "POST", { ids: [asset] })).status).toBe(401);
  });
  it("cuota de streams reales reserva DM y libera capacidad al desconectar", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    const guests = await Promise.all(Array.from({ length: 29 }, (_, i) => s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: `quota-${i}` }, randomUUID(), null)));
    const streams = guests.slice(0, 28).map(g => stream(s.port, s.a1.id, `ttrpg_guest=${g.token}`)); await Promise.all(streams.map(st => st.until(() => st.events.length > 0)));
    expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/events`, `ttrpg_guest=${guests[28].token}`)).status).toBe(429);
    const dm = stream(s.port, s.a1.id, s.aCookie, true); await dm.until(() => dm.events.length > 0); expect(dm.ended).toBe(false);
    await s.service.kick(s.aCookie, s.a1.id, guests[0].guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); await streams[0].until(() => streams[0].ended);
    const replacement = stream(s.port, s.a1.id, `ttrpg_guest=${guests[28].token}`); await replacement.until(() => replacement.events.length > 0); expect(replacement.ended).toBe(false);
  });
  it("presencia de B1 no incrementa revisión ni invalida roster/SSE del propietario A1", async () => {
    const s = await setup(kind), a = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), b = await s.invitations.start(s.bCookie, s.b1.id, null, 1, randomUUID());
    const ast = stream(s.port, s.a1.id, s.aCookie, true); await ast.until(() => ast.events.some(e => e.type === "bootstrap"));
    const before = await s.service.roster(s.aCookie, s.a1.id, { ...context(a), limit: 50, offset: 0 });
    const guest = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(b), alias: "B privado" }, randomUUID(), null), bst = stream(s.port, s.b1.id, `ttrpg_guest=${guest.token}`); await bst.until(() => bst.events.length > 0);
    const after = await s.service.roster(s.aCookie, s.a1.id, { ...context(a), limit: 50, offset: 0 }); expect(after).toEqual(before);
    const heartbeats = ast.bytes.split(": heartbeat").length; await ast.until(() => ast.bytes.split(": heartbeat").length > heartbeats);
    expect(ast.events.filter(e => e.type === "roster")).toEqual([]); expect(ast.bytes).not.toContain(s.b1.id); expect(ast.bytes).not.toContain("B privado");
  });
});
