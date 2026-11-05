import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { setup, cleanup, context, invitationSecret, http, stream } from "./fixtures";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { annotationStateSchema } from "../../../shared/contracts/shared-annotations";
import { contextualStateSchema } from "../../../shared/contracts/moderation";
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Dibujos compartidos SDD55 ${kind}`, () => {
  it("deriva autor, mantiene la credencial superviviente y retira dibujos al revocar", async () => {
    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID());
    const guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "Autor real" }, randomUUID(), null);
    const opening = context(start), base = `/api/v1/games/${s.a1.id}/table/`, cookie = `ttrpg_guest=${guest.token}`;
    const scene = createDefaultScene();
    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...opening, command: { requestId: randomUUID(), context: null, payload: { scene, mapImageUrl: null, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 1 }, showDmFogOverlay: false } } })).status).toBe(200);
    const st = stream(s.port, s.a1.id, cookie); await st.until(() => st.events.some(e => e.type === "bootstrap"));
    const connectionId = st.events.find(e => e.type === "bootstrap")!.state!.connectionId;
    const query = `?openingId=${opening.openingId}&generation=${opening.generation}&annotationsVersion=1`;
    const state = contextualStateSchema.parse((await http(s.port, base + "state" + query, cookie)).json.state);
    const result = await http(s.port, base + "annotations", cookie, "POST", { ...opening, command: { requestId: randomUUID(), context: state.context, connectionId, payload: { action: "create", id: randomUUID(), geometry: { type: "circle", points: [{ x: 0, y: 0 }], radius: 20 } } } });
    expect(result.status).toBe(200); const layer = annotationStateSchema.parse(result.json.annotations);
    expect(layer.items[0].author.alias).toBe("Autor real"); expect(JSON.stringify(layer)).not.toContain(guest.guest.participantId);
    // Una credencial válida no observada por SSE también conserva la autoría.
    const later = new Date(Date.parse(guest.guest.expiresAt) + 60000).toISOString();
    await s.unit.transaction(c => c.query("INSERT INTO guest_credentials(token_hash,participant_id,game_id,opening_id,generation,expires_at,revoked_at) SELECT $1,participant_id,game_id,opening_id,generation,$2,NULL FROM guest_credentials WHERE participant_id=$3 LIMIT 1", ["f".repeat(64), later, guest.guest.participantId]));
    const authority = await s.invitations.guests.authorized(s.a1.id, guest.token!, (_, tx) => tx.transport());
    expect(authority.participantExpiresAt).toBe(later);
    await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...opening, expectedInvitationVersion: 1 }, 1, randomUUID());
    const dm = contextualStateSchema.parse((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/state` + query, s.aCookie)).json.state);
    expect(dm.annotations!.items).toEqual([]);
    expect((await http(s.port, base + "state" + query, cookie)).status).toBe(401);
  });
});
