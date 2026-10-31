import { randomUUID } from "node:crypto";
import type { DatabaseConfig } from "../infrastructure/server/database/config";
import type { IdentityConfig } from "../infrastructure/server/identity/config";
import { openIdentity } from "../infrastructure/server/identity";
import { openInvitations } from "../infrastructure/server/invitations";
import { generateSecret, invitationDigest } from "../infrastructure/server/invitations/records";
import { runtimeLease } from "../infrastructure/server/moderation/runtime-lease";
import { GameRuntimeRegistry } from "../application/services/game-runtime";
import { moderation } from "../application/services/moderation";
import { createModerationHttp, isModerationPath } from "./moderation-http";
import { createInvitationHttp, isInvitationPath } from "./invitation-http";
import { createIdentityHttp } from "./identity-http";
import { createOwnedHttp } from "./owned-http";
import type { IncomingMessage, ServerResponse } from "node:http";
export async function openModerationBackend(database: DatabaseConfig, config: IdentityConfig, now = () => new Date()) {
  const lease = await runtimeLease(database);
  const runtimes = new GameRuntimeRegistry(() => now().getTime(), randomUUID); lease.onLost(() => runtimes.clear());
  try {
    const identity = await openIdentity(database, config, { now, id: randomUUID }, { openingInvalidated: game => runtimes.discardGame(game), accountDisabled: owner => runtimes.discardOwner(owner), sessionRevoked: (owner, session) => runtimes.revokeHost(owner, session) });
    try {
      const invitations = await openInvitations(database, identity, config.publicOrigin, now, (game, participant) => runtimes.leave(game, participant), game => runtimes.discardGame(game), (context, id) => runtimes.allows(context, `asset:${id}`), opening => runtimes.renew(opening));
      const service = moderation(identity, runtimes, { generate: generateSecret, hash: invitationDigest }, config.publicOrigin, () => lease.check(), () => now().getTime());
      const contextual = createModerationHttp(identity, invitations, service, runtimes, lease, config.publicOrigin, () => now().getTime());
      const invited = createInvitationHttp(invitations, identity, config.publicOrigin, () => now().getTime()), auth = createIdentityHttp(identity, config.publicOrigin), owned = createOwnedHttp(identity, config.publicOrigin);
      const timer = setInterval(() => { runtimes.expire(); void lease.check().catch(() => runtimes.clear()); }, 1000); timer.unref();
      return { identity, invitations, service, runtimes,
        async handler(req: IncomingMessage, res: ServerResponse) {
          try { await lease.check(); } catch { res.writeHead(503, { "Cache-Control": "no-store" }); res.end(); return; }
          const path = (req.url ?? "").split("?")[0];
          await (isModerationPath(path) ? contextual : isInvitationPath(path) ? invited : path.startsWith("/api/v1/identity/") ? auth : owned)(req, res);
        },
        async close() { clearInterval(timer); runtimes.clear(); await invitations.close(); await identity.close(); await lease.close(); }
      };
    } catch (error) { await identity.close(); throw error; }
  } catch (error) { await lease.close(); throw error; }
}
