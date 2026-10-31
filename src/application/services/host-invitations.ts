import { InvitationError, type GuestAuthority, type InvitationService, type OpeningStatus } from "./invitations";
import type { IdentityService } from "./identity";
import type { Opening, OwnedTransaction } from "./owned-store";
import { OwnedError } from "./owned-store";
import { presenceState } from "../../domain/invitations/invitation";
import { canonicalUuid, expectedOpeningSchema, openingContextSchema, rotateSchema, type ExpectedOpening, type OpeningContext } from "../../shared/contracts/invitations";
export interface Presence { has(opening: Opening): boolean; mark(opening: Opening): void; forget(gameId: string): void; clear(): void }
export interface InvitationSecrets { generate(): string; hash(game: string, opening: string, version: number, secret: string): string }
export function hostInvitations(identity: IdentityService, guests: GuestAuthority, presence: Presence, secrets: InvitationSecrets, origin: string, now: () => Date): InvitationService {
  const valid = (game: string, revision?: number, request?: string) => { if (!canonicalUuid.safeParse(game).success || revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1) || request !== undefined && !canonicalUuid.safeParse(request).success) throw new InvitationError("INVALID_INPUT"); };
  const inspect = async (tx: OwnedTransaction, game: string): Promise<OpeningStatus> => {
    const opening = await tx.openings.current(game), system = await tx.links.resolve(game);
    const sponsored = opening ? await tx.invitations.sponsor(game, opening.id) : false;
    return { opening, systemRef: system.ref, invitation: opening ? await tx.invitations.current(game, opening.id) : null, status: opening ? presenceState(opening, now().getTime(), presence.has(opening) && sponsored) : "absent" };
  };
  const match = (opening: Opening | null, expected: ExpectedOpening | null) => {
    if (expected === null ? opening !== null : !opening || opening.id !== expected.id || opening.generation !== expected.generation || opening.revision !== expected.revision) throw new InvitationError("REVISION_CONFLICT");
  };
  const live = (opening: Opening | null, context: OpeningContext) => {
    if (!opening || opening.id !== context.openingId || opening.generation !== context.generation || presenceState(opening, now().getTime(), true) === "expired") throw new InvitationError("REVISION_CONFLICT"); return opening;
  };
  const contact = (tx: OwnedTransaction, opening: Opening) => {
    const captured = structuredClone(opening);
    tx.effects.afterCommit(() => presence.mark(captured), () => presence.forget(captured.gameId));
  };
  const final = (tx: OwnedTransaction, opening: Opening, fresh: boolean) => {
    const captured = structuredClone(opening);
    tx.effects.beforeCommit(async () => {
      const current = live(await tx.openings.current(captured.gameId), { openingId: captured.id, generation: captured.generation });
      await tx.links.resolve(captured.gameId);
      if (fresh && (presenceState(current, now().getTime(), true) !== "fresh" || !await tx.invitations.sponsor(current.gameId, current.id))) throw new InvitationError("HOST_UNAVAILABLE");
    });
  };
  const delivery = (result: OpeningStatus, secret: string | undefined, game: string) => ({ ...result, replayed: secret === undefined, secretAvailable: secret !== undefined, ...(secret === undefined ? {} : { invitationUrl: `${origin}/jugar/${game}#invitacion=${secret}` }) });
  return {
    guests,
    async status(cookie, game) { valid(game); return identity.authorized(cookie, "dm", async (_, tx) => inspect(tx, game)); },
    async start(cookie, game, expected, revision, request, reopen = false) {
      valid(game, revision, request); if (!expectedOpeningSchema.nullable().safeParse(expected).success || reopen && !expected) throw new InvitationError("INVALID_INPUT");
      expected = structuredClone(expected); let secret: string | undefined;
      const result = await identity.authorized(cookie, "dm", async (actor, tx) => {
        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
        return tx.operation(request, `${reopen ? "reopen" : "start"}:${game}:${expected?.id ?? "absent"}:${expected?.generation ?? 0}`, { expected, revision }, async () => {
          const old = await tx.openings.current(game); match(old, expected);
          if (!reopen && old && presenceState(old, now().getTime(), false) !== "expired") throw new InvitationError("REVISION_CONFLICT");
          await tx.links.resolve(game);
          const opening = await tx.openings.start(game, revision);
          secret = secrets.generate(); await tx.invitations.issue(game, opening.id, 0, secrets.hash(game, opening.id, 1, secret));
          await tx.invitations.audit(game, opening.id, reopen ? "reopen" : "start");
          contact(tx, opening); final(tx, opening, true);
          return { ...await inspect(tx, game), status: "fresh" as const };
        });
      });
      return delivery(result, secret, game);
    },
    async heartbeat(cookie, game, context) {
      valid(game); if (!openingContextSchema.safeParse(context).success) throw new InvitationError("INVALID_INPUT"); context = structuredClone(context);
      return identity.authorized(cookie, "dm", async (_, tx) => {
        live(await tx.openings.current(game), context);
        const opening = await tx.openings.renew(game, context.openingId, context.generation); contact(tx, opening); final(tx, opening, true);
        return { ...await inspect(tx, game), status: "fresh" as const };
      });
    },
    async rotate(cookie, game, context, revision, request) {
      valid(game, revision, request); if (!rotateSchema.safeParse(context).success) throw new InvitationError("INVALID_INPUT"); context = structuredClone(context); let secret: string | undefined;
      const result = await identity.authorized(cookie, "dm", async (actor, tx) => {
        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
        return tx.operation(request, `rotate:${game}:${context.openingId}:${context.generation}`, { context, revision }, async () => {
          const state = await inspect(tx, game), opening = live(state.opening, context);
          if (opening.revision !== revision) throw new InvitationError("REVISION_CONFLICT");
          if (state.status !== "fresh") throw new InvitationError("HOST_UNAVAILABLE");
          secret = secrets.generate();
          await tx.invitations.issue(game, opening.id, context.expectedInvitationVersion, secrets.hash(game, opening.id, context.expectedInvitationVersion + 1, secret));
          await tx.invitations.audit(game, opening.id, "rotate");
          tx.effects.afterCommit(() => undefined, () => presence.forget(game)); final(tx, opening, true);
          return inspect(tx, game);
        });
      }); return delivery(result, secret, game);
    },
    async end(cookie, game, context, revision, request) {
      valid(game, revision, request); if (!openingContextSchema.safeParse(context).success) throw new InvitationError("INVALID_INPUT"); context = structuredClone(context);
      await identity.authorized(cookie, "dm", async (actor, tx) => {
        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
        await tx.operation(request, `close:${game}:${context.openingId}:${context.generation}`, { context, revision }, async () => {
          await tx.openings.close(game, context.openingId, context.generation, revision); await tx.invitations.audit(game, context.openingId, "close");
          tx.effects.afterCommit(() => presence.forget(game), () => presence.forget(game)); return null;
        });
      });
    },
    async close() { presence.clear(); await guests.close(); }
  };
}
