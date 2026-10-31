import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { accounts, cleanup, fixture, origin, secret } from "../owned/fixtures";
import { openIdentity } from "../identity";
import { identityDatabase } from "../identity/database";
import { openInvitations } from ".";
import { createInvitationHttp, isInvitationPath } from "../../../server/invitation-http";
import { createOwnedHttp } from "../../../server/owned-http";
import { createIdentityHttp } from "../../../server/identity-http";
import { GENERIC_SYSTEM, DND_SYSTEM } from "../../../domain/systems/system-catalog";
export { cleanup, origin, secret, fixture };
export async function setup(kind: "sqlite" | "postgres") {
  const config = await fixture(kind), a = await accounts(config); await a.identity.close();
  let time = Date.now(); const now = () => new Date(time), clock = { now, id: randomUUID };
  const identity = await openIdentity(config, { publicOrigin: origin, secret }, clock); cleanup.push(() => identity.close());
  const service = await openInvitations(config, identity, origin, now); cleanup.push(() => service.close());
  const second = await openIdentity(config, { publicOrigin: origin, secret }, clock); cleanup.push(() => second.close());
  const unit = await identityDatabase(config); cleanup.push(() => unit.close());
  const a1 = await identity.authorized(a.aCookie, "dm", (_, tx) => tx.games.create(a.a.id, "A1", GENERIC_SYSTEM));
  const a2 = await identity.authorized(a.aCookie, "dm", (_, tx) => tx.games.create(a.a.id, "A2", DND_SYSTEM));
  const b1 = await identity.authorized(a.bCookie, "dm", (_, tx) => tx.games.create(a.b.id, "B1", GENERIC_SYSTEM));
  const host = createInvitationHttp(service, identity, origin, () => time), owned = createOwnedHttp(identity, origin), auth = createIdentityHttp(identity, origin);
  const server = createServer((req, res) => { void (isInvitationPath((req.url ?? "").split("?")[0]) ? host : req.url?.startsWith("/api/v1/identity/") ? auth : owned)(req, res); });
  cleanup.push(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error();
  return { ...a, config, identity, second, service, now, unit, a1, a2, b1, port: address.port, advance(ms: number) { time += ms; }, setTime(value: number) { time = value; } };
}
export const invitationSecret = (value: { invitationUrl?: string }) => value.invitationUrl!.split("#invitacion=")[1];
export const context = (value: { opening: { id: string; generation: number } | null }) => ({ openingId: value.opening!.id, generation: value.opening!.generation });
export const expected = (value: { opening: { id: string; generation: number; revision: number } | null }) => value.opening && ({ id: value.opening.id, generation: value.opening.generation, revision: value.opening.revision });
export function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }
