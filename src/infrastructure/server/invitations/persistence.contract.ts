import { createNpcLibraryEntry } from "../../../domain/entity-library/entity-library";
import { searchText } from "../owned/records";
import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { cpSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fixture, setup, context, invitationSecret, origin, secret } from "./fixtures";
import { directory, raw, accounts, admin } from "../owned/fixtures";
import { migrateCatalog } from "../database";
import { openIdentity } from "../identity";
import { openInvitations } from ".";
import { invalidateRestoredAccess } from "./restore-access";
import { postgresPool } from "../database/driver";
import { exportOwned, importTransfer } from "../owned/transfer";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Persistencia009 ${kind}`, () => {
  it("migración4→5 conserva checksums/cuenta/partida/bindings/publicación y no emite invitación", async () => {
    const config = await fixture(kind, 4), owner = "historical-dm", game = randomUUID(), opening = randomUUID(), resource = randomUUID(), at = new Date().toISOString();
    const npc = createNpcLibraryEntry({ name: "Histórico", notes: "Conservado", imagePath: null }, { id: resource, now: new Date(at) });
    const before = await raw(config, async c => {
      await c.query('INSERT INTO identity_user(id,name,email,"emailVerified","createdAt","updatedAt",role,enabled,"mustChangePassword","authVersion") VALUES($1,$2,$3,$4,$5,$6,\'dm\',$7,$8,0)', [owner, "Anterior", "anterior@example.test", kind === "sqlite" ? 0 : "false", at, at, kind === "sqlite" ? 1 : "true", kind === "sqlite" ? 0 : "false"]);
      await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,system_id,system_version) VALUES($1,$2,'Anterior','ready',$3,$4,'generic',1)", [game, owner, at, at]);
      await c.query("UPDATE system_versions SET availability='disabled' WHERE system_id='generic' AND version=1");
      await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,'npcs',$2,'Histórico',$3,$4,$5,$6,1,$7,$8)", [owner, resource, searchText("npcs", npc), Buffer.from(resource).toString("hex"), at, at, JSON.stringify(npc), '{"monsters":{}}']);
      await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,'npcs',$3)", [owner, game, resource]);
      await c.query("INSERT INTO game_openings(id,game_id,generation,state,host_account_id,host_session_id,created_at,closed_at,last_heartbeat_at,lease_expires_at,revision) VALUES($1,$2,1,'open',$3,'old-session',$4,NULL,$5,$6,1)", [opening, game, owner, at, at, new Date(Date.now() + 150000).toISOString()]);
      const records = []; for (const table of ["ttrpg_control_migrations", "identity_user", "ttrpg_games", "owned_resources", "game_resources", "system_versions", "game_openings"]) records.push((await c.query(`SELECT * FROM ${table}`)).rows); return records;
    });
    expect(await migrateCatalog(config)).toEqual([5, 6]); expect(await migrateCatalog(config)).toEqual([]);
    await raw(config, async c => {
      const after = []; for (const table of ["ttrpg_control_migrations", "identity_user", "ttrpg_games", "owned_resources", "game_resources", "system_versions", "game_openings"]) after.push((await c.query(`SELECT * FROM ${table}`)).rows);
      after[0] = after[0].slice(0, 4); expect(after).toEqual(before); expect((await c.query("SELECT * FROM game_invitations")).rows).toEqual([]);
      await expect(c.query("INSERT INTO guest_participants(id,game_id,opening_id,generation,alias,discriminator,state,created_at) VALUES($1,$2,$3,99,'x',1,'admitted',$4)", [randomUUID(), game, opening, at])).rejects.toBeTruthy();
    });
  });
  it("apertura008 requiere heartbeat y versión0 explícita; corrupción no tiene fallback", async () => {
    const s = await setup(kind), old = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.openings.start(s.a1.id, 1));
    expect((await s.service.status(s.aCookie, s.a1.id)).invitation).toBeNull();
    const ctx = { openingId: old.id, generation: old.generation, expectedInvitationVersion: 0 };
    await expect(s.service.rotate(s.aCookie, s.a1.id, ctx, 1, randomUUID())).rejects.toMatchObject({ code: "HOST_UNAVAILABLE" });
    await expect(s.service.heartbeat(s.aCookie, s.a1.id, ctx)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await s.service.heartbeat(s.aCookie, s.a1.id, { openingId: old.id, generation: old.generation });
    const result = await s.service.rotate(s.aCookie, s.a1.id, ctx, 1, randomUUID());
    expect(result.invitation?.version).toBe(1);
    await s.unit.transaction(c => c.query("UPDATE system_versions SET hash=$1 WHERE system_id='generic' AND version=1", ["0".repeat(64)]));
    await expect(s.service.guests.admit(s.a1.id, { secret: invitationSecret(result), alias: "corrupto" }, randomUUID(), null)).rejects.toMatchObject({ code: "CORRUPT" });
  });
  it("restart conserva hashes/revocaciones; copia integral se invalida antes de servir; export no contiene acceso", async () => {
    const s = await setup(kind), start = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID()), invited = await s.service.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "copia" }, randomUUID(), null);
    const left = await s.service.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "salida persistida" }, randomUUID(), null); await s.service.guests.leave(s.a1.id, left.token!);
    const exported = join(directory(), "content"); await exportOwned(s.config, exported);
    const manifest = readFileSync(join(exported, "manifest.json"), "utf8"); expect(manifest).not.toContain("guest"); expect(manifest).not.toContain("opening");
    const target = await fixture(kind), destination = await accounts(target); await importTransfer(target, exported, { ownerMap: { [s.a.id]: destination.a.id, [s.b.id]: destination.b.id } });
    await destination.identity.authorized(destination.aCookie, "dm", async (_, tx) => { expect(await tx.openings.current(s.a1.id)).toBeNull(); });
    await destination.identity.close();
    await s.service.close(); await s.second.close(); await s.identity.close(); await s.unit.close();
    const identity = await openIdentity(s.config, { publicOrigin: origin, secret }); cleanup.push(() => identity.close()); const resumed = await openInvitations(s.config, identity, origin, s.now); cleanup.push(() => resumed.close());
    expect((await resumed.guests.authorized(s.a1.id, invited.token!, async g => g)).participantId).toBe(invited.guest.participantId);
    await expect(resumed.guests.authorized(s.a1.id, left.token!, async g => g)).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
    await expect(resumed.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "restart" }, randomUUID(), null)).rejects.toMatchObject({ code: "HOST_UNAVAILABLE" });
    await resumed.close(); await identity.close();
    let restored = s.config;
    if (s.config.driver === "sqlite") { const dir = directory(); cpSync(join(s.config.dataDir, "control.sqlite"), join(dir, "control.sqlite")); restored = { ...s.config, dataDir: dir }; }
    else {
      const name = `ttrpg_test_${randomUUID().replaceAll("-", "")}`, pool = postgresPool(admin), source = new URL(s.config.url).pathname.slice(1);
      try { await pool.query(`CREATE DATABASE "${name}" TEMPLATE "${source}"`); } finally { await pool.end(); }
      cleanup.push(async () => { const p = postgresPool(admin); try { await p.query(`DROP DATABASE "${name}"`); } finally { await p.end(); } });
      const url = new URL(s.config.url); url.pathname = "/" + name; restored = { ...s.config, url: url.href };
    }
    await invalidateRestoredAccess(restored);
    const restoredIdentity = await openIdentity(restored, { publicOrigin: origin, secret }); cleanup.push(() => restoredIdentity.close()); const service = await openInvitations(restored, restoredIdentity, origin, s.now); cleanup.push(() => service.close());
    await expect(service.guests.authorized(s.a1.id, invited.token!, async g => g)).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
    await expect(service.heartbeat(s.aCookie, s.a1.id, context(start))).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });
});
