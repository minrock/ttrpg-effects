import { readSystem } from "../owned/system-repository";
import type { CommitEffects } from "../../../application/services/owned-store";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { InvitationError, type GuestAuthority, type GuestTransaction } from "../../../application/services/invitations";
import type { Presence } from "../../../application/services/host-invitations";
import type { DatabaseConfig } from "../database/config";
import type { SqlConnection } from "../database/driver";
import { identityDatabase } from "../identity/database";
import { ACCESS_MS, presenceState } from "../../../domain/invitations/invitation";
import { admissionSchema, canonicalUuid, guestSchema, type GuestDto } from "../../../shared/contracts/invitations";
import { alias, digest, gameContext, generateSecret, invitation, invitationDigest, latest, matches, parse, readParticipant, sponsor, tokenDigest, validToken } from "./records";
export async function guestAuthority(database: DatabaseConfig, presence: Presence, now: () => Date, onLeave: (game: string, participant: string) => void = () => {}, allows: (context: import("../../../application/services/game-runtime").GameContext, id: string) => boolean = () => false): Promise<GuestAuthority> {
  const unit = await identityDatabase(database);
  const transaction = <T>(game: string, work: (connection: SqlConnection, effects: CommitEffects) => Promise<T>) => unit.transaction(work, outcome => { if (outcome === "uncertain") presence.forget(game); });
  const validGame = (game: string) => { if (!canonicalUuid.safeParse(game).success) throw new InvitationError("INVALID_INPUT"); };
  async function principal(c: SqlConnection, game: string, token: string | null): Promise<GuestDto> {
    if (!validToken(token)) throw new InvitationError("GUEST_UNAUTHORIZED");
    const row = (await c.query("SELECT * FROM guest_credentials WHERE game_id=$1 AND token_hash=$2", [game, tokenDigest(game, token)])).rows[0];
    if (!row) throw new InvitationError("GUEST_UNAUTHORIZED");
    const credential = parse(z.object({ token_hash: z.string().regex(/^[a-f0-9]{64}$/), participant_id: canonicalUuid, game_id: canonicalUuid, opening_id: canonicalUuid, generation: z.number().int().min(1), expires_at: z.iso.datetime(), revoked_at: z.iso.datetime().nullable() }).strict(), row);
    const time = now(); if (credential.revoked_at || credential.expires_at <= time.toISOString()) throw new InvitationError("GUEST_UNAUTHORIZED");
    const p = (await c.query("SELECT * FROM guest_participants WHERE id=$1", [credential.participant_id])).rows[0]; if (!p) throw new InvitationError("UNAVAILABLE"); const participant = readParticipant(p);
    if (Date.parse(credential.expires_at) - Date.parse(participant.created_at) !== ACCESS_MS) throw new InvitationError("UNAVAILABLE");
    const opening = await latest(c, game);
    if (!opening || participant.state !== "admitted" || participant.game_id !== game || participant.opening_id !== opening.id || participant.generation !== opening.generation || credential.opening_id !== opening.id || credential.generation !== opening.generation) throw new InvitationError("GUEST_UNAUTHORIZED");
    const systemRef = await gameContext(c, opening, time, "GUEST_UNAUTHORIZED");
    const status = presenceState(opening, time.getTime(), presence.has(opening) && await sponsor(c, opening, time));
    if (status === "expired") throw new InvitationError("GUEST_UNAUTHORIZED");
    return parse(guestSchema, { participantId: participant.id, gameId: game, openingId: opening.id, generation: opening.generation, alias: participant.alias, discriminator: participant.discriminator, systemRef, expiresAt: credential.expires_at, status });
  }
  async function optional(c: SqlConnection, game: string, token: string | null) { try { return await principal(c, game, token); } catch (error) { if (error instanceof InvitationError && error.code === "GUEST_UNAUTHORIZED") return null; throw error; } }
  async function audit(c: SqlConnection, guest: GuestDto, action: "admit" | "leave") { await c.query("INSERT INTO invitation_audit(id,actor,game_id,opening_id,action,at,result) VALUES($1,$2,$3,$4,$5,$6,'success')", [randomUUID(), guest.participantId, guest.gameId, guest.openingId, action, now().toISOString()]); }
  async function revoke(c: SqlConnection, guest: GuestDto) {
    const at = now().toISOString(); await c.query("UPDATE guest_credentials SET revoked_at=$1 WHERE participant_id=$2 AND revoked_at IS NULL", [at, guest.participantId]);
    await c.query("UPDATE guest_participants SET state='left',left_at=$1 WHERE id=$2 AND state='admitted'", [at, guest.participantId]); await audit(c, guest, "leave");
  }
  async function verifyInvitation(c: SqlConnection, game: string, secret: string) {
    const opening = await latest(c, game), record = opening && await invitation(c, game, opening.id);
    if (!opening || !record || record.generation !== opening.generation || !matches(record.secret_hash, invitationDigest(game, opening.id, record.version, secret)) || record.expires_at <= now().toISOString()) throw new InvitationError("INVITATION_UNAVAILABLE");
    await gameContext(c, opening, now(), "INVITATION_UNAVAILABLE");
    return opening;
  }
  async function fresh(c: SqlConnection, opening: NonNullable<Awaited<ReturnType<typeof latest>>>) {
    if (presenceState(opening, now().getTime(), presence.has(opening)) !== "fresh" || !await sponsor(c, opening, now())) throw new InvitationError("HOST_UNAVAILABLE");
  }
  return {
    async admit(game, input, requestId, token) {
      validGame(game); if (!admissionSchema.safeParse(input).success || !canonicalUuid.safeParse(requestId).success) throw new InvitationError("INVALID_INPUT");
      input = { ...input, alias: alias(input.alias) };
      const fingerprint = digest("admission", JSON.stringify([input.alias, digest("admission-secret", input.secret)]));
      return transaction(game, async (c, effects) => {
        const existing = await optional(c, game, token);
        const opening = existing ? await latest(c, game) : await verifyInvitation(c, game, input.secret);
        if (!opening) throw new InvitationError("INVITATION_UNAVAILABLE");
        const at = now(); await c.query("DELETE FROM guest_operations WHERE opening_id=$1 AND expires_at<=$2", [opening.id, at.toISOString()]);
        const prior = (await c.query("SELECT * FROM guest_operations WHERE game_id=$1 AND opening_id=$2 AND operation_id=$3", [game, opening.id, requestId])).rows[0];
        if (prior && prior.fingerprint !== fingerprint) throw new InvitationError("OPERATION_CONTENT_CONFLICT");
        if (existing) {
          if (existing.alias !== input.alias) throw new InvitationError("ALIAS_CONFLICT");
          if (prior && prior.participant_id !== existing.participantId) { await verifyInvitation(c, game, input.secret); throw new InvitationError("ADMISSION_ALREADY_PROCESSED"); }
          effects.beforeCommit(async () => { await principal(c, game, token); }); return { guest: existing, replayed: true };
        }
        if (prior) throw new InvitationError("ADMISSION_ALREADY_PROCESSED");
        await fresh(c, opening);
        const budget = (await c.query("SELECT COUNT(*) AS count,COALESCE(SUM(result_bytes),0) AS bytes,MAX(expires_at) AS retry FROM guest_operations WHERE opening_id=$1", [opening.id])).rows[0];
        const total = Number((await c.query("SELECT COUNT(*) AS count FROM guest_participants WHERE opening_id=$1", [opening.id])).rows[0].count);
        const active = Number((await c.query("SELECT COUNT(DISTINCT p.id) AS count FROM guest_participants p JOIN guest_credentials c ON c.participant_id=p.id WHERE p.opening_id=$1 AND p.state='admitted' AND c.revoked_at IS NULL AND c.expires_at>$2", [opening.id, at.toISOString()])).rows[0].count);
        if (total >= 1000 || active >= 64 || Number(budget.count) >= 1000 || Number(budget.bytes) >= 1048576) throw new InvitationError("RATE_LIMITED", String(budget.retry ?? new Date(at.getTime() + 60000).toISOString()));
        const id = randomUUID(), access = generateSecret(), expiry = new Date(at.getTime() + ACCESS_MS).toISOString();
        await c.query("INSERT INTO guest_participants(id,game_id,opening_id,generation,alias,discriminator,state,created_at,left_at) VALUES($1,$2,$3,$4,$5,$6,'admitted',$7,NULL)", [id, game, opening.id, opening.generation, input.alias, total + 1, at.toISOString()]);
        await c.query("INSERT INTO guest_credentials(token_hash,participant_id,game_id,opening_id,generation,expires_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6,NULL)", [tokenDigest(game, access), id, game, opening.id, opening.generation, expiry]);
        const guest = await principal(c, game, access), bytes = Buffer.byteLength(JSON.stringify(guest));
        if (Number(budget.bytes) + bytes > 1048576) throw new InvitationError("RATE_LIMITED", String(budget.retry));
        await c.query("INSERT INTO guest_operations(game_id,opening_id,generation,operation_id,fingerprint,participant_id,expires_at,result_bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [game, opening.id, opening.generation, requestId, fingerprint, id, new Date(at.getTime() + 86400000).toISOString(), bytes]);
        await audit(c, guest, "admit");
        effects.beforeCommit(async () => { const current = await verifyInvitation(c, game, input.secret); await fresh(c, current); await principal(c, game, access); });
        return { guest, token: access, replayed: false };
      });
    },
    async authorized(game, token, work) {
      validGame(game);
      return transaction(game, async (c, effects) => {
        const captured = await principal(c, game, token); let active = true, left = false, rejected = false, failure: unknown;
        const pending: Promise<unknown>[] = [];
        const run = <T>(action: () => Promise<T>): Promise<T> => {
          if (!active) return Promise.reject(new InvitationError("UNAVAILABLE"));
          const task = Promise.resolve().then(action).catch(error => { if (!rejected) { rejected = true; failure = error; } throw error; });
          pending.push(task.catch(() => undefined)); return task;
        };
        const tx: GuestTransaction = {
          transport: () => run(async () => {
            const guest = await principal(c, game, token), opening = (await latest(c, game))!;
            const system = readSystem((await c.query("SELECT * FROM system_versions WHERE system_id=$1 AND version=$2", [guest.systemRef.systemId, guest.systemRef.version])).rows[0]);
            return { context: { ownerId: opening.hostAccountId, gameId: game, openingId: opening.id, generation: opening.generation, leaseExpiresAt: opening.leaseExpiresAt }, system: { ref: guest.systemRef, definition: system.definition, hash: system.hash, availability: system.availability } };
          }),
          asset: id => run(async () => {
            if (!canonicalUuid.safeParse(id).success) throw new InvitationError("INVALID_INPUT");
            await principal(c, game, token); const opening = (await latest(c, game))!;
            const context = { ownerId: opening.hostAccountId, gameId: game, openingId: opening.id, generation: opening.generation };
            if (!allows(context, id)) return null;
            effects.beforeCommit(async () => { if (!allows(context, id)) throw new InvitationError("GUEST_UNAUTHORIZED"); });
            const row = (await c.query("SELECT mime,bytes,sha256,byte_length FROM owned_assets WHERE owner_id=$1 AND id=$2", [opening.hostAccountId, id])).rows[0];
            if (!row) return null;
            if (!(row.bytes instanceof Uint8Array) || !["image/png", "image/jpeg", "image/webp"].includes(String(row.mime)) || row.bytes.length !== row.byte_length || createHash("sha256").update(row.bytes).digest("hex") !== row.sha256) throw new InvitationError("UNAVAILABLE");
            return { mime: String(row.mime), bytes: row.bytes };
          }),
          deliver: (effect, uncertain) => run(async () => {
            await principal(c, game, token);
            effects.beforeCommit(async () => { await principal(c, game, token); });
            effects.afterCommit(effect, uncertain);
          }),
          session: () => run(() => principal(c, game, token)),
          leave: () => run(async () => { if (left) return; await principal(c, game, token); await revoke(c, captured); left = true; effects.afterCommit(() => onLeave(game, captured.participantId), () => onLeave(game, captured.participantId)); })
        };
        try {
          const result = await work(structuredClone(captured), tx);
          for (let seen = 0; seen < pending.length;) { const batch = pending.slice(seen); seen = pending.length; await Promise.all(batch); }
          active = false; await Promise.all(pending);
          if (rejected) throw failure;
          if (!left) await principal(c, game, token);
          active = false; return result;
        } finally { active = false; await Promise.all(pending); }
      });
    },
    async leave(game, token) { validGame(game); await transaction(game, async (c, effects) => { const guest = await optional(c, game, token); if (guest) { await revoke(c, guest); effects.afterCommit(() => onLeave(game, guest.participantId), () => onLeave(game, guest.participantId)); } }); },
    close: () => unit.close()
  };
}
