import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import * as driverModule from "../database/driver";
import { guestAuthority } from "./guest-authority";
import { setup, cleanup, context, expected, invitationSecret } from "./fixtures";
import { systemSeeds, GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { ownedGames } from "../../../application/services/owned-games";
afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Bordes009 ${kind}`, () => {
  it("commit incierto no entrega token ni presenta rollback; invalida presencia y replay no recupera identidad", async () => {
    const s = await setup(kind), start = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    await s.service.close(); await s.second.close(); await s.identity.close(); await s.unit.close();
    const original = driverModule.createDriver; let armed = true, forgotten = false;
    const spy = vi.spyOn(driverModule, "createDriver").mockImplementation(config => {
      const driver = original(config);
      return { ...driver, acquire: async () => { const c = await driver.acquire(); return { ...c, query: async (sql, values) => { const result = await c.query(sql, values); if (sql === "COMMIT" && armed) { armed = false; throw new Error("Confirmación perdida sintética"); } return result; } }; } };
    });
    const guests = await guestAuthority(s.config, { has: () => !forgotten, mark() {}, forget() { forgotten = true; }, clear() {} }, s.now); spy.mockRestore(); cleanup.push(() => guests.close());
    const key = randomUUID(), input = { secret: invitationSecret(start), alias: "incierto" };
    await expect(guests.admit(s.a1.id, input, key, null)).rejects.toMatchObject({ code: "UNAVAILABLE" }); expect(forgotten).toBe(true);
    await expect(guests.admit(s.a1.id, input, key, null)).rejects.toMatchObject({ code: "ADMISSION_ALREADY_PROCESSED" });
    await guests.close();
    const driver = original(s.config); try { const c = await driver.acquire(); try { for (const table of ["guest_participants", "guest_credentials", "guest_operations"]) expect(Number((await c.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n)).toBe(1); } finally { c.release(); } } finally { await driver.close(); }
  });
  it("presupuesto de admisión, histórico y replay expirado; heartbeat no registra operaciones", async () => {
    const s = await setup(kind), key = randomUUID(), start = await s.service.start(s.aCookie, s.a1.id, null, 1, key), input = { secret: invitationSecret(start), alias: "cupos" };
    const admitted = await s.service.guests.admit(s.a1.id, input, randomUUID(), null);
    const count = () => s.unit.transaction(async c => Number((await c.query("SELECT COUNT(*) AS n FROM owned_operations")).rows[0].n));
    const originalDeadline = start.opening!.leaseExpiresAt; s.advance(-1000);
    expect((await s.service.heartbeat(s.aCookie, s.a1.id, context(start))).opening?.leaseExpiresAt).toBe(originalDeadline); s.advance(1000);
    const before = await count(); for (let n = 0; n < 3; n++) await s.service.heartbeat(s.aCookie, s.a1.id, context(start)); expect(await count()).toBe(before);
    await s.unit.transaction(c => c.query("UPDATE guest_operations SET result_bytes=1048576"));
    await expect(s.service.guests.admit(s.a1.id, input, randomUUID(), null)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await s.unit.transaction(c => c.query("UPDATE guest_operations SET expires_at=$1", [s.now().toISOString()]));
    const second = await s.service.guests.admit(s.a1.id, input, randomUUID(), null); expect(second.guest.discriminator).toBe(2);
    await s.service.guests.leave(s.a1.id, admitted.token!); await s.service.guests.leave(s.a1.id, second.token!);
    await s.unit.transaction(async c => { for (let n = 3; n <= 1000; n++) await c.query("INSERT INTO guest_participants(id,game_id,opening_id,generation,alias,discriminator,state,created_at,left_at) VALUES($1,$2,$3,1,'histórico',$4,'left',$5,$6)", [randomUUID(), s.a1.id, start.opening!.id, n, s.now().toISOString(), s.now().toISOString()]); });
    await expect(s.service.guests.admit(s.a1.id, input, randomUUID(), null)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const reopened = await s.service.start(s.aCookie, s.a1.id, expected(start), 1, randomUUID(), true);
    await s.unit.transaction(c => c.query("UPDATE owned_operations SET expires_at=$1 WHERE operation_id=$2", [s.now().toISOString(), key]));
    await expect(s.service.start(s.aCookie, s.a1.id, null, 1, key)).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect((await s.service.status(s.aCookie, s.a1.id)).opening?.id).toBe(reopened.opening?.id);
  });
  it("versiones distintas del mismo sistema conservan hash incluso deshabilitadas; eliminar no deja autoridad", async () => {
    const s = await setup(kind), next = { systemId: "generic", version: 2 }, definition = structuredClone(systemSeeds[0].definition);
    definition.presentations[0].markdown = "# Versión dos";
    await s.identity.authorized(s.adminCookie, "admin", async (_, tx) => { await tx.systems.draft(next, definition, 0); await tx.systems.publish(next, 1); });
    const game = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.games.create(s.a.id, "A versión2", next));
    const before = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.links.resolve(s.a1.id));
    await s.identity.authorized(s.adminCookie, "admin", async (_, tx) => { const v = await tx.systems.get(GENERIC_SYSTEM); await tx.systems.availability(GENERIC_SYSTEM, "disabled", v.revision); });
    const old = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID()), newer = await s.service.start(s.aCookie, game.id, null, 1, randomUUID());
    const guest = await s.service.guests.admit(s.a1.id, { secret: invitationSecret(old), alias: "versión1" }, randomUUID(), null);
    expect(guest.guest.systemRef).toEqual(GENERIC_SYSTEM); expect(newer.systemRef).toEqual(next);
    expect((await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.links.resolve(s.a1.id))).hash).toBe(before.hash);
    await expect(s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.games.create(s.a.id, "nuevo prohibido", GENERIC_SYSTEM))).rejects.toMatchObject({ code: "DISABLED" });
    await s.identity.authorized(s.aCookie, "dm", (_, tx) => ownedGames(s.a.id, tx).delete(s.a1.id, 1));
    await expect(s.service.guests.authorized(s.a1.id, guest.token!, async g => g)).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
  });
});
