import { ACCESS_MS } from "../../../domain/invitations/invitation";
import { InvitationError, type InvitationRepository } from "../../../application/services/invitations";
import { OwnedError } from "../../../application/services/owned-store";
import type { Execute, CatalogClock } from "../database/catalog-repository";
import { invitation, latest, metadata, sponsor } from "./records";
export function hostInvitationRepository(run: Execute, owner: string, clock: CatalogClock): InvitationRepository {
  const scoped: Execute = work => run(work);
  const own = async (c: Parameters<Parameters<Execute>[0]>[0], gameId: string, openingId: string) => {
    const row = (await c.query("SELECT id FROM ttrpg_games WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL", [gameId, owner])).rows[0];
    if (!row) throw new OwnedError("NOT_FOUND");
    const opening = await latest(c, gameId); if (!opening || opening.id !== openingId) throw new InvitationError("REVISION_CONFLICT"); return opening;
  };
  return {
    current: (gameId, openingId) => scoped(async c => { await own(c, gameId, openingId); const row = await invitation(c, gameId, openingId); return row ? metadata(row) : null; }),
    issue: (gameId, openingId, expectedVersion, hash) => scoped(async c => {
      const opening = await own(c, gameId, openingId), at = clock.now(), now = at.toISOString(), expiresAt = new Date(at.getTime() + ACCESS_MS).toISOString();
      if (opening.state !== "open" || opening.leaseExpiresAt <= now || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || expectedVersion >= Number.MAX_SAFE_INTEGER || !/^[a-f0-9]{64}$/.test(hash)) throw new InvitationError("REVISION_CONFLICT");
      const prior = await invitation(c, gameId, openingId); if ((prior?.version ?? 0) !== expectedVersion) throw new InvitationError("REVISION_CONFLICT");
      await c.query("INSERT INTO game_invitations(opening_id,game_id,generation,version,secret_hash,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(opening_id) DO UPDATE SET version=excluded.version,secret_hash=excluded.secret_hash,created_at=excluded.created_at,expires_at=excluded.expires_at", [openingId, gameId, opening.generation, expectedVersion + 1, hash, now, expiresAt]);
      return { version: expectedVersion + 1, createdAt: now, expiresAt };
    }),
    sponsor: (gameId, openingId) => scoped(async c => sponsor(c, await own(c, gameId, openingId), clock.now())),
    audit: (gameId, openingId, action) => scoped(async c => { await own(c, gameId, openingId); await c.query("INSERT INTO invitation_audit(id,actor,game_id,opening_id,action,at,result) VALUES($1,$2,$3,$4,$5,$6,'success')", [clock.id(), owner, gameId, openingId, action, clock.now().toISOString()]); })
  };
}
