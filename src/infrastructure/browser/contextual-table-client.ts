import { BrowserTableClient } from "./table-client";
import { HttpTransport } from "./http";
import { canonicalUuid } from "../../shared/contracts/invitations";
export function contextualTableClient(context: { gameId: string; openingId: string; generation: number; audience: "dm" | "player"; accountId?: string }, terminal: (reason: "access-ended" | "replaced" | "unavailable") => void, fetcher: typeof fetch = fetch, roster?: () => void) {
  canonicalUuid.parse(context.gameId); canonicalUuid.parse(context.openingId);
  if (!Number.isSafeInteger(context.generation) || context.generation < 1) throw new Error("Contexto inválido.");
  // Cada instancia posee su transporte, aborts, cursor, cola y deduplicación.
  const immutable = Object.freeze({ ...context });
  const http = new HttpTransport(fetcher, () => client.accessEnded(), `/api/v1/${context.audience === "dm" ? "dm/" : ""}games/${context.gameId}`, `?openingId=${context.openingId}&generation=${context.generation}`);
  if (context.audience === "dm" && context.accountId) http.bindAccount(context.accountId);
  const client = new BrowserTableClient(http, { ...immutable, terminal, roster });
  return client;
}
