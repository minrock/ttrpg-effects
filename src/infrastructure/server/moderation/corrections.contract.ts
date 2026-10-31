import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { IncomingMessage, ServerResponse, request } from "node:http";
import { setup, cleanup, context, invitationSecret, http, deferred, snapshot, png, stream } from "./fixtures";
import { contextualTableClient } from "../../browser/contextual-table-client";
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
function network(port: number, cookie: string): typeof fetch {
  return (path, init) => new Promise<Response>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: String(path), method: init?.method ?? "GET", headers: { ...Object.fromEntries(new Headers(init?.headers)), host: "localhost:8787", origin: "http://localhost:8787", cookie } }, res => {
      const headers = new Headers(); for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      resolve(new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, { status: res.statusCode, headers }));
    });
    const abort = () => req.destroy(new Error("Petición cancelada"));
    init?.signal?.addEventListener("abort", abort, { once: true }); req.on("close", () => init?.signal?.removeEventListener("abort", abort)); req.on("error", reject);
    if (init?.signal?.aborted) abort(); else req.end(typeof init?.body === "string" ? init.body : undefined);
  });
}
for (const kind of ["sqlite", "postgres"] as const) describe(`Correcciones ronda1 ${kind}`, () => {
  it("cerrar durante autorización SSE no registra fantasma; principal, promoción y reemplazo conservan cupos", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    const guests = await Promise.all(["cancelado", "principal", "siguiente"].map(alias => s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias }, randomUUID(), null)));
    const reached = deferred(), release = deferred(), closed = deferred(), finished = deferred(); let calls = 0;
    const original = s.invitations.guests.authorized.bind(s.invitations.guests);
    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => {
      const held = token === guests[0].token && ++calls === 2;
      if (held) { reached.resolve(); await release.promise; }
      const result = await original(game, token, work); if (held) finished.resolve(); return result;
    });
    const emit = ServerResponse.prototype.emit;
    vi.spyOn(ServerResponse.prototype, "emit").mockImplementation(function (this: ServerResponse, ...args: Parameters<typeof emit>) { const value = emit.apply(this, args); if (args[0] === "close" && this.req.headers.cookie === `ttrpg_guest=${guests[0].token}`) closed.resolve(); return value; });
    const registration = vi.spyOn(s.runtimes, "register"), interval = vi.spyOn(globalThis, "setInterval");
    const cancelled = stream(s.port, s.a1.id, `ttrpg_guest=${guests[0].token}`); await reached.promise; cancelled.close(); await closed.promise; release.resolve(); await finished.promise;
    const ctx = await s.identity.authorized(s.aCookie, "dm", (actor, tx) => s.runtimes.context(tx, actor.account.id, s.a1.id));
    expect(registration).not.toHaveBeenCalled(); expect(interval).not.toHaveBeenCalled(); expect(s.runtimes.connected(ctx, guests[0].guest.participantId)).toBe(false); expect(s.runtimes.state(ctx)).toBeNull(); expect(s.runtimes.presenceSequence(ctx)).toBe(0);
    const table = s.runtimes.runtime(ctx), connect = (index: number) => stream(s.port, s.a1.id, `ttrpg_guest=${guests[index].token}`);
    const first = connect(1); await first.until(() => first.events.some(e => e.type === "bootstrap")); const second = connect(2); await second.until(() => second.events.some(e => e.type === "bootstrap"));
    expect(table.primary?.participant).toBe(guests[1].guest.participantId); expect(table.connectionCount).toBe(2);
    const bootstraps = second.events.filter(e => e.type === "bootstrap").length; first.close(); await second.until(() => second.events.filter(e => e.type === "bootstrap").length > bootstraps);
    expect(table.primary?.participant).toBe(guests[2].guest.participantId); expect(table.connectionCount).toBe(1); expect(s.runtimes.connected(ctx, guests[1].guest.participantId)).toBe(false);
    const replacement = connect(2); await replacement.until(() => replacement.events.some(e => e.type === "bootstrap")); await second.until(() => second.ended); expect(table.connectionCount).toBe(1);
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    // Una nueva conexión permite observar la limpieza del cierre normal sin sleeps.
    const live = connect(0); await live.until(() => live.events.some(e => e.type === "bootstrap"));
    const count = live.events.filter(e => e.type === "bootstrap").length; replacement.close(); await live.until(() => live.events.filter(e => e.type === "bootstrap").length > count);
    expect(clearIntervalSpy).toHaveBeenCalled(); expect(table.connectionCount).toBe(1); expect(table.primary?.participant).toBe(guests[0].guest.participantId);
  });
  it("64 cuerpos invitados no impiden kick ajeno; expulsión cancela lectores antes del ACK y conserva otro", async () => {
    const s = await setup(kind), a = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), b = await s.invitations.start(s.bCookie, s.b1.id, null, 1, randomUUID());
    const target = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(a), alias: "objetivo" }, randomUUID(), null), attacker = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(b), alias: "lento" }, randomUUID(), null), survivor = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(b), alias: "sobrevive" }, randomUUID(), null);
    const reached = deferred(), survivorReached = deferred(); let registered = 0, rejected = 0, cancelled = 0;
    const original = s.runtimes.request.bind(s.runtimes);
    vi.spyOn(s.runtimes, "request").mockImplementation((...args) => { const release = original(...args); if (args[4] === attacker.guest.participantId) { registered++; if (registered + rejected === 64) reached.resolve(); } if (args[4] === survivor.guest.participantId) survivorReached.resolve(); return release; });
    const destroy = IncomingMessage.prototype.destroy;
    vi.spyOn(IncomingMessage.prototype, "destroy").mockImplementation(function (this: IncomingMessage, ...args) { if (this.headers.cookie === `ttrpg_guest=${attacker.token}` && !this.destroyed) cancelled++; return destroy.apply(this, args); });
    const requests = Array.from({ length: 64 }, () => { const req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.b1.id}/table/ready`, method: "POST", headers: { host: "localhost:8787", origin: "http://localhost:8787", cookie: `ttrpg_guest=${attacker.token}`, "content-type": "application/json", "content-length": 256 } }, res => { res.resume(); expect(res.statusCode).toBe(429); rejected++; if (registered + rejected === 64) reached.resolve(); }); req.on("error", () => {}); req.flushHeaders(); return req; });
    cleanup.push(async () => { requests.forEach(req => req.destroy()); }); await reached.promise; expect(registered).toBe(4); expect(rejected).toBe(60);
    const payload = JSON.stringify({ ids: [] }); let survivorRequest!: ReturnType<typeof request>;
    const survivorResult = new Promise<number>((resolve, reject) => { survivorRequest = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.b1.id}/assets/resolve`, method: "POST", headers: { host: "localhost:8787", origin: "http://localhost:8787", cookie: `ttrpg_guest=${survivor.token}`, "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); survivorRequest.on("error", reject); survivorRequest.flushHeaders(); });
    cleanup.push(async () => { survivorRequest.destroy(); }); await survivorReached.promise;
    const kick = (cookie: string, game: string, id: string, start: typeof a) => http(s.port, `/api/v1/dm/games/${game}/participants/${id}/kick`, cookie, "POST", { ...context(start), expectedInvitationVersion: 1 }, { "if-match": "1" });
    expect((await kick(s.aCookie, s.a1.id, target.guest.participantId, a)).status).toBe(200);
    expect((await kick(s.bCookie, s.b1.id, attacker.guest.participantId, b)).status).toBe(200); expect(cancelled).toBeGreaterThanOrEqual(4); expect(s.runtimes.pendingRequests).toBe(1);
    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/state`, s.aCookie)).status).toBe(200);
    expect(survivorRequest.destroyed).toBe(false); survivorRequest.end(payload); expect(await survivorResult).toBe(200);
  });
  it("bootstrap se reconstruye tras publicación concurrente y el cliente real puede confirmar y reportar", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "bootstrap" }, randomUUID(), null);
    const entered = deferred(), release = deferred(), ready = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests); let calls = 0;
    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { if (token === guest.token && ++calls === 3) { entered.resolve(); await release.promise; } return original(game, token, work); });
    const client = contextualTableClient({ ...context(start), gameId: s.a1.id, audience: "player" }, () => {}, network(s.port, `ttrpg_guest=${guest.token}`)); cleanup.push(async () => client.clear());
    client.api.onPlayerScene(() => ready.resolve()); client.start("player"); await entered.promise;
    const asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...context(start), command: { requestId: randomUUID(), context: null, payload: snapshot(asset) } })).status).toBe(200);
    release.resolve(); await ready.promise; expect(client.getStatus().published).toBe(true);
    const view = await client.api.getPlayerWindowState(); expect(view.snapshot?.mapImageUrl).toBeTruthy();
    await client.api.reportPlayerMapImageStatus({ imageUrl: view.snapshot!.mapImageUrl!, ok: true });
    const contentReady = await client.api.notifyPlayerContentReady(); expect(contentReady.ok, JSON.stringify(contentReady)).toBe(true);
    expect(await client.api.reportPlayerCamera({ reportRevision: 1, acknowledgedCommandRevision: null, camera: { center: { x: 10, y: 20 }, zoom: 1 }, origin: "initialization", final: true })).toMatchObject({ ok: true });
  });
  it("reconexión DM de apertura vieja termina; lecturas fijadas y cliente nuevo siguen independientes", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
    await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...context(start), command: { requestId: randomUUID(), context: null, payload: snapshot(asset) } });
    const terminal = vi.fn(), ready = deferred(), ended = deferred(), client = contextualTableClient({ ...context(start), gameId: s.a1.id, audience: "dm" }, reason => { terminal(reason); ended.resolve(); }, network(s.port, s.aCookie)); cleanup.push(async () => client.clear());
    client.api.onPlayerScene(() => ready.resolve()); client.start("dm"); await ready.promise; client.stop(); expect(client.getStatus().published).toBe(true);
    const next = await s.invitations.start(s.aCookie, s.a1.id, { id: start.opening!.id, generation: 1, revision: 1 }, 1, randomUUID(), true);
    const query = `?openingId=${start.opening!.id}&generation=1`;
    for (const path of ["table/state", "dice/session", "dice/sizes"]) { const result = await http(s.port, `/api/v1/dm/games/${s.a1.id}/${path}${query}`, s.aCookie); expect(result.status).toBe(409); expect(result.json.error).toMatchObject({ code: "OPENING_CHANGED" }); }
    client.start("dm"); await ended.promise; expect(client.getStatus().published).toBe(false); expect(terminal).toHaveBeenCalledExactlyOnceWith("access-ended");
    const freshReady = deferred(), fresh = contextualTableClient({ ...context(next), gameId: s.a1.id, audience: "dm" }, () => {}, network(s.port, s.aCookie)); cleanup.push(async () => fresh.clear()); fresh.subscribeStatus(() => { if (fresh.getStatus().phase === "connected") freshReady.resolve(); }); fresh.start("dm"); await freshReady.promise; expect(fresh.getStatus().phase).toBe("connected");
  });
});
