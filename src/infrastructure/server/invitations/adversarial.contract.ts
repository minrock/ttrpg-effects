import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import * as database from "../identity/database";
import type { SqlConnection } from "../database/driver";
import { openInvitations } from ".";
import { setup, cleanup, context, expected, invitationSecret, origin, deferred } from "./fixtures";
import { http } from "../owned/fixtures";
import type { InvitationService } from "../../../application/services/invitations";
async function instrument(s: Awaited<ReturnType<typeof setup>>, intercept: (sql: string, result: Awaited<ReturnType<SqlConnection["query"]>>) => Promise<void>) {
  const original = database.identityDatabase;
  const spy = vi.spyOn(database, "identityDatabase").mockImplementation(async config => {
    const unit = await original(config);
    return { ...unit, transaction: (work, failed) => unit.transaction((c, effects) => work({ ...c, query: async (sql, values) => { const result = await c.query(sql, values); await intercept(sql, result); return result; } }, effects), failed) };
  });
  let service: InvitationService;
  try { service = await openInvitations(s.config, s.identity, origin, s.now); } finally { spy.mockRestore(); }
  cleanup.push(() => service.close()); return service;
}
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Adversarial009 ${kind}`, () => {
  it("join bloqueado frente a rotate/close/reopen/disable: sin credencial sobreviviente indebida", async () => {
    const s = await setup(kind);
    for (const transition of ["rotate", "close", "reopen", "disable"] as const) {
      if (transition !== "rotate") { const session = await s.identity.login(s.a.email, "contraseña definitiva de pruebas 008", transition); s.aCookie = session.cookie; }
      const status = await s.service.status(s.aCookie, s.a1.id), started = await s.service.start(s.aCookie, s.a1.id, expected(status), 1, randomUUID(), status.opening !== null);
      const entered = deferred(), release = deferred(); let armed = true;
      const service = await instrument(s, async sql => { if (armed && sql.startsWith("INSERT INTO guest_participants")) { armed = false; entered.resolve(); await release.promise; } });
      await service.heartbeat(s.aCookie, s.a1.id, context(started));
      const join = service.guests.admit(s.a1.id, { secret: invitationSecret(started), alias: transition }, randomUUID(), null); await entered.promise;
      const change = transition === "rotate" ? service.rotate(s.aCookie, s.a1.id, { ...context(started), expectedInvitationVersion: 1 }, 1, randomUUID()) : transition === "close" ? service.end(s.aCookie, s.a1.id, context(started), 1, randomUUID()) : transition === "reopen" ? service.start(s.aCookie, s.a1.id, expected(started), 1, randomUUID(), true) : s.identity.administer(s.adminCookie, s.a.id, "disable");
      release.resolve(); const admitted = await join; await change;
      if (transition === "rotate") expect((await service.guests.authorized(s.a1.id, admitted.token!, async g => g)).participantId).toBe(admitted.guest.participantId);
      else await expect(service.guests.authorized(s.a1.id, admitted.token!, async g => g)).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
      await expect(service.guests.admit(s.a1.id, { secret: invitationSecret(started), alias: "después" }, randomUUID(), null)).rejects.toMatchObject({ code: "INVITATION_UNAVAILABLE" });
      await service.close();
      if (transition === "disable") await s.identity.administer(s.adminCookie, s.a.id, "enable");
    }
  });
  it("rotación confirmada antes de join, rollback intermedio y revalidación temporal final", async () => {
    const s = await setup(kind), start = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    const rotated = await s.service.rotate(s.aCookie, s.a1.id, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID());
    await expect(s.service.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "viejo" }, randomUUID(), null)).rejects.toMatchObject({ code: "INVITATION_UNAVAILABLE" });
    for (const reason of [undefined, null, false, 0, ""]) {
      const service = await instrument(s, async sql => { if (sql.startsWith("INSERT INTO guest_participants")) throw reason; });
      await service.heartbeat(s.aCookie, s.a1.id, context(start));
      await expect(service.guests.admit(s.a1.id, { secret: invitationSecret(rotated), alias: "rollback" }, randomUUID(), null)).rejects.toMatchObject({ code: "UNAVAILABLE" }); await service.close();
    }
    const late = await instrument(s, async sql => { if (sql.startsWith("INSERT INTO guest_participants")) s.advance(30000); }); await late.heartbeat(s.aCookie, s.a1.id, context(start));
    await expect(late.guests.admit(s.a1.id, { secret: invitationSecret(rotated), alias: "deadline" }, randomUUID(), null)).rejects.toMatchObject({ code: "HOST_UNAVAILABLE" });
    expect(await s.unit.transaction(async c => { const counts = []; for (const table of ["guest_participants", "guest_credentials", "guest_operations"]) counts.push(Number((await c.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n)); return counts; })).toEqual([0, 0, 0]);
  });
  it("rechazos falsy atrapados en capacidad invitada no confirman leave parcial", async () => {
    const s = await setup(kind), start = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    const guest = await s.service.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "rollback" }, randomUUID(), null);
    for (const reason of [undefined, null, false, 0, ""]) for (const mode of ["catch", "settled", "unawaited"]) {
      const service = await instrument(s, async sql => { if (sql.startsWith("UPDATE guest_participants")) throw reason; });
      await expect(service.guests.authorized(s.a1.id, guest.token!, async (_, tx) => { const failure = tx.leave(); if (mode === "catch") await failure.catch(() => undefined); else if (mode === "settled") await Promise.allSettled([failure]); else void failure.catch(() => undefined); })).rejects.toMatchObject({ code: "UNAVAILABLE" });
      expect((await service.guests.authorized(s.a1.id, guest.token!, async g => g)).participantId).toBe(guest.guest.participantId); await service.close();
    }
  });
  it("body lento revalida revocación, chunked acotado, Origin y secret no logueado", async () => {
    const s = await setup(kind), start = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined), logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const path = `/api/v1/dm/games/${s.a1.id}/invitation/rotate`, payload = JSON.stringify({ ...context(start), expectedInvitationVersion: 1 });
    const initialRead = deferred();
    const original = s.identity.authorized.bind(s.identity); let first = true;
    const spy = vi.spyOn(s.identity, "authorized").mockImplementation(async (...args) => { const value = await original(...args); if (first) { first = false; initialRead.resolve(); } return value; });
    let req!: ReturnType<typeof request>;
    const response = new Promise<number>((resolve, reject) => {
      req = request({ host: "127.0.0.1", port: s.port, path, method: "POST", headers: { host: "localhost:8787", origin, cookie: s.aCookie, "content-type": "application/json", "idempotency-key": randomUUID(), "if-match": "1", "content-length": Buffer.byteLength(payload) } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); req.on("error", reject); req.write(payload.slice(0, 1));
    });
    await initialRead.promise; await s.identity.logout(s.aCookie); req.end(payload.slice(1)); expect(await response).toBe(401); spy.mockRestore();
    const raw = async (method: string, body: string | undefined, extra: Record<string, string> = {}) => new Promise<number>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.a1.id}/${method === "GET" ? "guest/session" : "admission"}`, method, headers: { host: "localhost:8787", "content-type": "application/json", "idempotency-key": randomUUID(), ...extra } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); req.on("error", reject); req.end(body);
    });
    expect(await raw("POST", "{}", {})).toBe(403); expect(await raw("POST", "{}", { origin: "null" })).toBe(403); expect(await raw("POST", "{}", { origin: "https://elsewhere.test" })).toBe(403); expect(await raw("GET", undefined)).toBe(401);
    expect(await raw("POST", JSON.stringify({ alias: "x".repeat(9000), secret: invitationSecret(start) }), { origin, "transfer-encoding": "chunked" })).toBe(413);
    const responseMalformed = await http(s.port, `/api/v1/games/${s.a1.id}/admission`, "", "POST", { secret: invitationSecret(start), alias: "a", ownerId: s.b.id }); expect(responseMalformed.status).toBe(400);
    expect(JSON.stringify([logs.mock.calls, errors.mock.calls])).not.toContain(invitationSecret(start));
  });
});
