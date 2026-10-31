import { canonicalUuid, secretSchema } from "../shared/contracts/invitations";
/** Invocar antes de fetch/imports opcionales. Solo memoria; 011 conecta la pantalla. */
export function captureInvitation(location: Pick<Location, "pathname" | "search" | "hash">, history: Pick<History, "replaceState" | "state">) {
  const fragment = location.hash;
  history.replaceState(history.state, "", location.pathname + location.search);
  const gameId = /^\/jugar\/([^/]+)$/.exec(location.pathname)?.[1];
  const candidate = /^#invitacion=([A-Za-z0-9_-]+)$/.exec(fragment)?.[1];
  let secret = canonicalUuid.safeParse(gameId).success && secretSchema.safeParse(candidate).success ? candidate : undefined;
  return { gameId: secret ? gameId! : null, available: () => secret !== undefined, consume() { const value = secret; secret = undefined; return value; }, cancel() { secret = undefined; } };
}
