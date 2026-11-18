import type { URL } from "node:url";
import type { OwnedTransaction } from "../application/services/owned-store";
import { missing } from "./errors";
import { parse, query, routeId } from "./schemas";
import { arcIdSchema, campaignIdSchema, preparedEntityListQuerySchema, createPreparedEntityInputSchema, preparedEntityIdSchema, updatePreparedEntityInputSchema, expectedRevisionSchema } from "../shared/contracts/campaigns";
import { z } from "zod";

interface Result { status?: number; value?: unknown; location?: string }
const pageQuery = (url: URL) => parse(preparedEntityListQuerySchema, { limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined, offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined, text: url.searchParams.get("text") ?? undefined, kind: url.searchParams.get("kind") ?? undefined });
const expected = (value: number | undefined) => parse(expectedRevisionSchema, value);

export async function arcPreparationRoute(tx: OwnedTransaction, url: URL, method: string, parts: readonly string[], payload: unknown, expectedRevision: number | undefined): Promise<Result | null> {
  if (parts[0] !== "campaigns" || parts[2] !== "arcs" || parts[4] !== "preparation") return null;
  const campaignId = routeId(parts[1]), arcId = routeId(parts[3]); parse(campaignIdSchema, campaignId); parse(arcIdSchema, arcId);
  if (parts.length === 5) {
    if (method === "GET") { query(url, ["limit", "offset", "text", "kind"]); const value = await tx.arcPreparation.list(campaignId, arcId, pageQuery(url)); return { value: { ok: true, ...value } }; }
    if (method === "POST") { query(url, []); const prepared = await tx.arcPreparation.create(campaignId, arcId, parse(createPreparedEntityInputSchema, payload), "owned-http"); return { status: 201, location: `/api/v1/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${prepared.id}`, value: { ok: true, prepared } }; }
    return null;
  }
  const preparedId = routeId(parts[5]); parse(preparedEntityIdSchema, preparedId);
  if (parts.length === 6) {
    if (method === "GET") { query(url, []); const prepared = await tx.arcPreparation.get(campaignId, arcId, preparedId); if (!prepared) throw missing(); return { value: { ok: true, prepared } }; }
    if (method === "PATCH") { query(url, []); const prepared = await tx.arcPreparation.update(campaignId, arcId, preparedId, parse(updatePreparedEntityInputSchema, payload), expected(expectedRevision), "owned-http"); return { value: { ok: true, prepared } }; }
    if (method === "DELETE") { query(url, []); parse(z.strictObject({}), payload); await tx.arcPreparation.remove(campaignId, arcId, preparedId, expected(expectedRevision), "owned-http"); return { value: { ok: true } }; }
    return null;
  }
  if (parts.length === 7 && parts[6] === "instance" && method === "POST") {
    query(url, []); const input = parse(z.strictObject({ sceneId: z.uuid() }), payload); const reservation = await tx.arcPreparation.reserveInstance(campaignId, arcId, preparedId, input.sceneId, "owned-http"); return { value: { ok: true, reservation } };
  }
  return null;
}
