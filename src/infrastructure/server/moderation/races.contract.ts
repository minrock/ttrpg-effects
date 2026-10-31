import { postgresPool } from "../database/driver";
import { defaultDiceDraft } from "../../../domain/dice/dice";
import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { setup, cleanup, context, invitationSecret, http, deferred, stream, png, snapshot } from "./fixtures";
import { systemSeeds } from "../../../domain/systems/system-catalog";
import { ownedGames } from "../../../application/services/owned-games";
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Carreras010 ${kind}`, () => {
  it("body lento no retiene lock; kick gana y los callbacks HTTP/SSE tardíos no entregan datos", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "lento" }, randomUUID(), null);
    const initial = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests);
    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { const result = await original(game, token, work); initial.resolve(); return result; });
    const payload = JSON.stringify({ ...context(start), command: { requestId: randomUUID(), context: null, payload: {}, connectionId: randomUUID(), revision: 0 } });
    let req!: ReturnType<typeof request>;
    const pending = new Promise<number>((resolve) => { req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.a1.id}/table/ready`, method: "POST", headers: { host: "localhost:8787", origin: "http://localhost:8787", cookie: `ttrpg_guest=${guest.token}`, "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); req.on("error", () => resolve(0)); req.flushHeaders(); });
    await initial.promise;
    await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID());
    req.end(payload); expect(await pending).toBe(0);
    const count = await s.unit.transaction(async c => (await c.query("SELECT * FROM moderation_audit")).rows.length); expect(count).toBe(1);
  });
  it("consulta en cola y frame en cola se revalidan; orden anterior al kick queda explícito", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "barrera" }, randomUUID(), null);
    const reached = deferred(), release = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests); let calls = 0;
    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { if (++calls === 2) { reached.resolve(); await release.promise; } return original(game, token, work); });
    const pending = http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${guest.token}`).catch(() => ({ status: 0 }));
    await reached.promise; await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); release.resolve();
    expect((await pending).status).toBe(0);
    const next = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(await s.invitations.rotate(s.aCookie, s.a1.id, { ...context(start), expectedInvitationVersion: 2 }, 1, randomUUID())), alias: "ordenado" }, randomUUID(), null);
    const lock = deferred(), unlock = deferred(); let sent = false;
    const before = s.invitations.guests.authorized(s.a1.id, next.token!, async (_, tx) => { lock.resolve(); await unlock.promise; await tx.deliver(() => { sent = true; }, () => {}); }); await lock.promise;
    const kick = s.service.kick(s.aCookie, s.a1.id, next.guest.participantId, { ...context(start), expectedInvitationVersion: 3 }, 1, randomUUID());
    unlock.resolve(); await before; await kick; expect(sent).toBe(true);
    await expect(s.invitations.guests.authorized(s.a1.id, next.token!, async (_, tx) => tx.deliver(() => { throw new Error("No debe entregar"); }, () => {}))).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
  });
  it("kicks distintos serializan invitación; disable/archive limpian sin resurrección", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), secret = invitationSecret(start), guests = await Promise.all([1, 2].map(() => s.invitations.guests.admit(s.a1.id, { secret, alias: "igual" }, randomUUID(), null)));
    const results = await Promise.allSettled(guests.map(g => s.service.kick(s.aCookie, s.a1.id, g.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID())));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const live = guests[results.findIndex(r => r.status === "rejected")], st = stream(s.port, s.a1.id, `ttrpg_guest=${live.token}`); await st.until(() => st.events.length > 0);
    await s.identity.administer(s.adminCookie, s.a.id, "disable"); await st.until(() => st.ended);
    await s.identity.administer(s.adminCookie, s.a.id, "enable"); expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${live.token}`)).status).toBe(401);
    const bstart = await s.invitations.start(s.bCookie, s.b1.id, null, 1, randomUUID()), b = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(bstart), alias: "b" }, randomUUID(), null), bs = stream(s.port, s.b1.id, `ttrpg_guest=${b.token}`); await bs.until(() => bs.events.length > 0);
    await s.identity.authorized(s.bCookie, "dm", (actor, tx) => ownedGames(actor.account.id, tx).update(s.b1.id, { state: "archived" }, 1)); await bs.until(() => bs.ended);
  });
  it("join que obtiene el lock antes de kick sobrevive; enlace viejo después no admite", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), secret = invitationSecret(start);
    const target = await s.invitations.guests.admit(s.a1.id, { secret, alias: "objetivo" }, randomUUID(), null);
    const reached = deferred(), release = deferred();
    const blocker = s.unit.transaction(async () => { reached.resolve(); await release.promise; }); await reached.promise;
    const join = s.invitations.guests.admit(s.a1.id, { secret, alias: "antes" }, randomUUID(), null);
    // SQLite comparte cola. En PG esperamos la petición real del advisory lock antes de encolar kick.
    if (s.config.driver === "postgres") {
      const pool = postgresPool(s.config);
      try { const deadline = Date.now() + 10000; for (;;) { const waiting = await pool.query("SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=783496102 AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())"); if (waiting.rows.length) break; if (Date.now() >= deadline) throw new Error("Admisión no alcanzó barrera DB"); } } finally { await pool.end(); }
    }
    const kick = s.service.kick(s.aCookie, s.a1.id, target.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID());
    release.resolve(); await blocker; const admitted = await join; await kick;
    expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${admitted.token}`)).status).toBe(200);
    await expect(s.invitations.guests.admit(s.a1.id, { secret, alias: "después" }, randomUUID(), null)).rejects.toBeDefined();
  });
  it("cámaras/dados A1/A2/B1, promoción y callback de apertura vieja aislados", async () => {
    const s = await setup(kind), games = [s.a1, s.a2, s.b1], cookies = [s.aCookie, s.aCookie, s.bCookie], assets = [randomUUID(), randomUUID()];
    await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(assets[0], "image/png", png)); await s.identity.authorized(s.bCookie, "dm", (_, tx) => tx.assets.create(assets[1], "image/png", png));
    const starts = await Promise.all(games.map((game, i) => s.invitations.start(cookies[i], game.id, null, 1, randomUUID()))), mapContexts: string[] = [];
    const guests = await Promise.all(games.map((game, i) => s.invitations.guests.admit(game.id, { alias: "jugador", secret: invitationSecret(starts[i]) }, randomUUID(), null)));
    const streams = guests.map((guest, i) => stream(s.port, games[i].id, `ttrpg_guest=${guest.token}`)); await Promise.all(streams.map(st => st.until(() => st.events.length > 0)));
    const command = (i: number, family: string, action: string, payload: unknown, requestId = randomUUID()) => http(s.port, `/api/v1/dm/games/${games[i].id}/${family}/${action}`, cookies[i], "POST", { ...context(starts[i]), command: { requestId, context: mapContexts[i] ?? null, payload } });
    const reused = randomUUID(), diceRequest = randomUUID();
    for (let i = 0; i < 3; i++) {
      const published = await command(i, "table", "scene", snapshot(assets[i === 2 ? 1 : 0]), reused); expect(published.status).toBe(200); mapContexts[i] = (published.json.state as { context: string }).context;
      expect((await command(i, "table", "camera", { center: { x: i * 100, y: i * 20 }, zoom: i + 1 })).status).toBe(200);
      expect((await command(i, "dice", "context", { token: mapContexts[i], sceneId: "scene", mapId: "map", sceneName: `PRIVADO_DADOS_${i}`, mapName: `PRIVADO_DADOS_${i}` })).status).toBe(200);
      const begun = await command(i, "dice", "begin", { requestId: reused, contextToken: mapContexts[i], draft: { ...defaultDiceDraft(), visibility: i === 0 ? "hidden" : "open", groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, d20: null }, diceRequest);
      expect(begun.status).toBe(200);
      expect((await command(i, "dice", "complete", { rollId: (begun.json.value as { rollId: string }).rollId, simulation: { values: [{ id: "f:d6:0", value: i + 2 }], replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, .5, 0, 0, 0, 1] } } })).status).toBe(200);
    }
    const states = await Promise.all(games.map((g, i) => http(s.port, `/api/v1/games/${g.id}/table/state`, `ttrpg_guest=${guests[i].token}`)));
    for (const [i, result] of states.entries()) { expect(result.json.state).toMatchObject({ camera: { center: { x: i * 100, y: i * 20 }, zoom: i + 1 } }); expect(result.bytes.toString()).not.toContain("PRIVADO"); }
    expect((states[0].json.state as { dice: { presentation: unknown } }).dice.presentation).toBeNull(); expect((states[1].json.state as { dice: { presentation: unknown } }).dice.presentation).not.toBeNull();
    const survivor = await s.invitations.guests.admit(s.a2.id, { alias: "superviviente", secret: invitationSecret(starts[1]) }, randomUUID(), null), survivorStream = stream(s.port, s.a2.id, `ttrpg_guest=${survivor.token}`); await survivorStream.until(() => survivorStream.events.length > 0);
    await s.service.kick(s.aCookie, s.a2.id, guests[1].guest.participantId, { ...context(starts[1]), expectedInvitationVersion: 1 }, 1, randomUUID());
    const after = await http(s.port, `/api/v1/games/${s.a2.id}/table/state`, `ttrpg_guest=${survivor.token}`); expect((after.json.state as { camera: unknown }).camera).toEqual((states[1].json.state as { camera: unknown }).camera); expect((after.json.state as { dice: unknown }).dice).toEqual((states[1].json.state as { dice: unknown }).dice);
    await s.invitations.start(s.aCookie, s.a1.id, { id: starts[0].opening!.id, generation: 1, revision: 1 }, 1, randomUUID(), true);
    expect((await command(0, "table", "camera", { center: { x: 999, y: 999 }, zoom: 1 })).status).toBe(409);
    expect(streams[2].ended).toBe(false); expect(survivorStream.ended).toBe(false);
  });
  it("hash exacto de versiones retenidas; dados y deduplicación independientes", async () => {
    const s = await setup(kind), ref = { systemId: "generic", version: 2 }, definition = structuredClone(systemSeeds[0].definition); definition.presentations[0].markdown = "PRIVADO_SISTEMA_010";
    await s.identity.authorized(s.adminCookie, "admin", async (_, tx) => { await tx.systems.draft(ref, definition, 0); await tx.systems.publish(ref, 1); });
    const game = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.games.create(s.a.id, "A2 versión2", ref));
    const games = [s.a1, game], starts = await Promise.all(games.map(g => s.invitations.start(s.aCookie, g.id, null, 1, randomUUID())));
    await s.identity.authorized(s.adminCookie, "admin", async (_, tx) => { for (const version of [1, 2]) { const current = await tx.systems.get({ systemId: "generic", version }); await tx.systems.availability({ systemId: "generic", version }, "disabled", current.revision); } });
    const asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
    const requestId = randomUUID();
    for (const [i, g] of games.entries()) {
      const guest = await s.invitations.guests.admit(g.id, { alias: "retiene", secret: invitationSecret(starts[i]) }, randomUUID(), null);
      const publish = { ...context(starts[i]), command: { requestId, context: null, payload: snapshot(asset) } };
      expect((await http(s.port, `/api/v1/dm/games/${g.id}/table/scene`, s.aCookie, "POST", publish)).status).toBe(200);
      const state = await http(s.port, `/api/v1/games/${g.id}/table/state`, `ttrpg_guest=${guest.token}`), resolved = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.links.resolve(g.id));
      expect(state.json.state).toMatchObject({ systemRef: { systemId: "generic", version: i + 1 }, systemHash: resolved.hash }); expect(state.bytes.toString()).not.toContain("PRIVADO_SISTEMA_010");
      const retry = await http(s.port, `/api/v1/dm/games/${g.id}/table/scene`, s.aCookie, "POST", publish); expect((retry.json.state as { revision: number }).revision).toBe((state.json.state as { revision: number }).revision);
      expect((await http(s.port, `/api/v1/games/${g.id}/dice/session`, `ttrpg_guest=${guest.token}`)).status).toBe(404);
    }
  });
});
