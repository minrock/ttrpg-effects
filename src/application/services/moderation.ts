import type { IdentityService } from "./identity";
import { OwnedError } from "./owned-store";
import type { InvitationSecrets } from "./host-invitations";
import { InvitationError } from "./invitations";
import { canonicalUuid, type OpeningContext } from "../../shared/contracts/invitations";
import { kickSchema, rosterQuerySchema, type RosterQuery, type Roster } from "../../shared/contracts/moderation";
import type { GameRuntimeRegistry } from "./game-runtime";
export function moderation(identity: IdentityService, runtimes: GameRuntimeRegistry, secrets: InvitationSecrets, origin: string, guard: () => Promise<void> = async () => {}, now = Date.now) {
  const valid = (...ids: string[]) => { if (ids.some(id => !canonicalUuid.safeParse(id).success)) throw new InvitationError("INVALID_INPUT"); };
  return {
    async roster(cookie: string, game: string, query: RosterQuery): Promise<Roster> {
      valid(game); query = rosterQuerySchema.parse(query);
      return identity.authorized(cookie, "dm", async (actor, tx) => {
        const own = await tx.games.find(actor.account.id, game), opening = own ? await tx.openings.current(game) : null;
        if (!own) throw new OwnedError("NOT_FOUND");
        if (!opening || opening.id !== query.openingId || opening.generation !== query.generation) throw new InvitationError("REVISION_CONFLICT");
        const ctx = { ownerId: actor.account.id, gameId: game, openingId: opening.id, generation: opening.generation };
        const status = opening.state === "closed" ? "closed" : Date.parse(opening.leaseExpiresAt) <= now() ? "expired" : "open";
        const data = await tx.invitations.participants(game, ctx.openingId);
        const all = data.items.map(p => ({ ...p, presence: p.admission === "admitted" && status !== "open" ? "expired" as const : p.presence === "reconnecting" && runtimes.connected(ctx, p.participantId) ? "connected" as const : p.presence }));
        const items = all.filter(p => !query.state || p.presence === query.state);
        return { openingId: opening.id, generation: opening.generation, status, items: items.slice(query.offset, query.offset + query.limit), total: items.length, revision: data.revision, presenceSequence: runtimes.presenceSequence(ctx) };
      });
    },
    async kick(cookie: string, game: string, target: string, input: OpeningContext & { expectedInvitationVersion: number }, revision: number, request: string) {
      valid(game, target, request); input = kickSchema.parse(input);
      if (!Number.isSafeInteger(revision) || revision < 1) throw new InvitationError("INVALID_INPUT");
      let secret: string | undefined;
      const result = await identity.authorized(cookie, "dm", async (actor, tx) => {
        tx.effects.beforeCommit(guard);
        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
        return tx.operation(request, `kick:${game}:${input.openingId}:${input.generation}`, { target, input, revision }, async () => {
          const ctx = await runtimes.context(tx, actor.account.id, game);
          if (ctx.openingId !== input.openingId || ctx.generation !== input.generation) throw new InvitationError("REVISION_CONFLICT");
          const roster = await tx.invitations.participants(game, ctx.openingId), participant = roster.items.find(p => p.participantId === target);
          if (!participant) throw new OwnedError("NOT_FOUND");
          const prior = await tx.invitations.current(game, ctx.openingId);
          if (!prior) throw new InvitationError("UNAVAILABLE");
          if (participant.admission === "revoked") return { participantId: target, outcome: "already-revoked" as const, previousPresence: participant.presence, revision: roster.revision, invitation: prior };
          const opening = await tx.openings.current(game);
          if (opening?.revision !== revision || prior.version !== input.expectedInvitationVersion) throw new InvitationError("REVISION_CONFLICT");
          await tx.invitations.revoke(game, ctx.openingId, target, prior.version + 1);
          secret = secrets.generate();
          const invitation = await tx.invitations.issue(game, ctx.openingId, prior.version, secrets.hash(game, ctx.openingId, prior.version + 1, secret));
          tx.effects.beforeCommit(async () => { const current = await runtimes.context(tx, actor.account.id, game); if (current.openingId !== ctx.openingId || current.generation !== ctx.generation) throw new InvitationError("REVISION_CONFLICT"); });
          tx.effects.afterCommit(() => { runtimes.revoke(ctx, target); }, () => runtimes.discard(ctx));
          return { participantId: target, outcome: "revoked" as const, previousPresence: runtimes.connected(ctx, target) ? "connected" as const : participant.presence, revision: roster.revision + 1, invitation };
        });
      });
      return { ...result, secretAvailable: secret !== undefined, replayed: secret === undefined, ...(secret ? { invitationUrl: `${origin}/jugar/${game}#invitacion=${secret}` } : {}) };
    }
  };
}
