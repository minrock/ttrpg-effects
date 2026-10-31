import { ACCESS_MS } from "../../../domain/invitations/invitation";
import { InvitationError, type InvitationRepository } from "../../../application/services/invitations";
import { OwnedError } from "../../../application/services/owned-store";
import type { Execute, CatalogClock } from "../database/catalog-repository";
import { invitation, latest, metadata, sponsor, readParticipant } from "./records";
export function hostInvitationRepository(run: Execute, owner: string, clock: CatalogClock): InvitationRepository {
  const scoped: Execute = work => run(work);
  const own = async (c: Parameters<Parameters<Execute>[0]>[0], gameId: string, openingId: string) => {
    const row = (await c.query("SELECT id FROM ttrpg_games WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL", [gameId, owner])).rows[0];
    if (!row) throw new OwnedError("NOT_FOUND");
    const opening = await latest(c, gameId); if (!opening || opening.id !== openingId) throw new InvitationError("REVISION_CONFLICT"); return opening;
  };
  return {
    participants: (gameId, openingId) => scoped(async c => {
      await own(c, gameId, openingId);
      const rows = (await c.query("SELECT * FROM guest_participants WHERE game_id=$1 AND opening_id=$2 ORDER BY created_at,id", [gameId, openingId])).rows;
      const items = [];
      for (const row of rows) {
        const p = readParticipant(row);
        const live = (await c.query("SELECT token_hash FROM guest_credentials WHERE participant_id=$1 AND revoked_at IS NULL AND expires_at>$2 LIMIT 1", [p.id, clock.now().toISOString()])).rows.length > 0;
        items.push({ participantId: p.id, alias: p.alias, discriminator: p.discriminator, admission: p.state, presence: p.state === "admitted" ? live ? "reconnecting" as const : "expired" as const : p.state, admittedAt: p.created_at });
      }
      const revision = Number((await c.query("SELECT (SELECT COUNT(*) FROM moderation_audit WHERE opening_id=$1) + (SELECT COUNT(*) FROM invitation_audit WHERE opening_id=$2 AND action IN ('admit','leave')) AS n", [openingId, openingId])).rows[0].n);
      return { items, revision };
    }),
    revoke: (gameId, openingId, participantId, invitationVersion) => scoped(async c => {
      await own(c, gameId, openingId);
      const row = (await c.query("SELECT * FROM guest_participants WHERE id=$1 AND game_id=$2 AND opening_id=$3", [participantId, gameId, openingId])).rows[0];
      if (!row) throw new OwnedError("NOT_FOUND");
      const p = readParticipant(row); if (p.state === "revoked") return false;
      const at = clock.now().toISOString();
      await c.query("UPDATE guest_participants SET state='revoked',left_at=$1 WHERE id=$2", [at, participantId]);
      await c.query("UPDATE guest_credentials SET revoked_at=$1 WHERE participant_id=$2 AND revoked_at IS NULL", [at, participantId]);
      await c.query("INSERT INTO moderation_audit(id,actor,game_id,opening_id,participant_id,invitation_version,at,result) VALUES($1,$2,$3,$4,$5,$6,$7,'revoked')", [clock.id(), owner, gameId, openingId, participantId, invitationVersion, at]);
      return true;
    }),
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
