import type { IdentityService } from "../../../application/services/identity";
import { hostInvitations, type Presence } from "../../../application/services/host-invitations";
import type { DatabaseConfig } from "../database/config";
import type { Opening } from "../../../application/services/owned-store";
import { generateSecret, invitationDigest } from "./records";
import { guestAuthority } from "./guest-authority";
export async function openInvitations(database: DatabaseConfig, identity: IdentityService, publicOrigin: string, now = () => new Date()) {
  const origin = new URL(publicOrigin);
  if (origin.origin !== publicOrigin || !["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) throw new Error("Origen de invitación inválido");
  const contacts = new Map<string, Pick<Opening, "id" | "hostSessionId" | "lastHeartbeatAt" | "leaseExpiresAt">>();
  const presence: Presence = {
    has(opening) { const value = contacts.get(opening.gameId); return value?.id === opening.id && value.hostSessionId === opening.hostSessionId && value.lastHeartbeatAt === opening.lastHeartbeatAt; },
    mark(opening) { for (const [game, value] of contacts) if (value.leaseExpiresAt <= now().toISOString()) contacts.delete(game); contacts.set(opening.gameId, { id: opening.id, hostSessionId: opening.hostSessionId, lastHeartbeatAt: opening.lastHeartbeatAt, leaseExpiresAt: opening.leaseExpiresAt }); },
    forget(game) { contacts.delete(game); }, clear() { contacts.clear(); }
  };
  const guests = await guestAuthority(database, presence, now);
  return hostInvitations(identity, guests, presence, { generate: generateSecret, hash: invitationDigest }, publicOrigin, now);
}
