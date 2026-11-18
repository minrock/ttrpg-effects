import type { URL } from "node:url";
import type { OwnedTransaction } from "../application/services/owned-store";
import { OwnedError } from "../application/services/owned-store";
import { invalid, missing } from "./errors";
import { parse, query, routeId } from "./schemas";
import {
  attachSceneInputSchema, campaignIdSchema, campaignListQuerySchema, campaignPageQuerySchema, campaignPatchInputSchema,
  createArcInputSchema, createArcSceneInputSchema, createCampaignInputSchema, expectedCoverRevisionSchema, expectedRevisionSchema,
  updateArcInputSchema, updateSceneCoverInputSchema
} from "../shared/contracts/campaigns";

interface CampaignRouteResult { status?: number; value?: unknown; location?: string }

const expected = (value: number | undefined, cover = false) => {
  const schema = cover ? expectedCoverRevisionSchema : expectedRevisionSchema;
  if (value === undefined) throw invalid("If-Match es obligatorio.");
  return parse(schema, value);
};
const pageQuery = (url: URL, schema: typeof campaignListQuerySchema | typeof campaignPageQuerySchema) => parse(schema, {
  limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
  offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined,
  text: url.searchParams.get("text") ?? undefined,
  ...(schema === campaignListQuerySchema ? { state: url.searchParams.get("state") ?? undefined } : {})
});

/** Rutas privadas de campaña. La autorización y la idempotencia viven en owned-http/OwnedTransaction. */
export async function campaignRoute(tx: OwnedTransaction, url: URL, method: string, parts: readonly string[], payload: unknown, expectedRevision: number | undefined): Promise<CampaignRouteResult | null> {
  if (parts[0] === "campaign-capabilities") {
    if (parts.length === 1 && method === "GET") { query(url, []); return { value: { ok: true, version: 1 } }; }
    return null;
  }
  if (parts[0] !== "campaigns") return null;
  if (parts.length === 1) {
    if (method === "GET") { query(url, ["limit", "offset", "text", "state"]); const value = await tx.campaigns.list(pageQuery(url, campaignListQuerySchema)); return { value: { ok: true, ...value } }; }
    if (method === "POST") { query(url, []); const campaign = await tx.campaigns.create(parse(createCampaignInputSchema, payload), "owned-http"); return { status: 201, location: `/api/v1/dm/campaigns/${campaign.id}`, value: { ok: true, campaign } }; }
    return null;
  }
  const campaignId = routeId(parts[1]); parse(campaignIdSchema, campaignId);
  if (parts.length === 2) {
    if (method === "GET") { query(url, []); const campaign = await tx.campaigns.get(campaignId); if (!campaign) throw missing(); return { value: { ok: true, campaign } }; }
    if (method === "PATCH") {
      query(url, []); const input = parse(campaignPatchInputSchema, payload);
      const campaign = "state" in input ? await tx.campaigns.setState(campaignId, input, expected(expectedRevision), "owned-http") : await tx.campaigns.update(campaignId, input, expected(expectedRevision), "owned-http");
      return { value: { ok: true, campaign } };
    }
    return null;
  }
  if (parts[2] !== "arcs") return null;
  if (parts.length === 3) {
    if (method === "GET") { query(url, ["limit", "offset", "text"]); const value = await tx.campaigns.listArcs(campaignId, pageQuery(url, campaignPageQuerySchema)); return { value: { ok: true, ...value } }; }
    if (method === "POST") { query(url, []); const arc = await tx.campaigns.createArc(campaignId, parse(createArcInputSchema, payload), "owned-http"); return { status: 201, location: `/api/v1/dm/campaigns/${campaignId}/arcs/${arc.id}`, value: { ok: true, arc } }; }
    return null;
  }
  const arcId = routeId(parts[3]);
  if (parts.length === 4) {
    if (method === "GET") { query(url, []); const arc = await tx.campaigns.getArc(campaignId, arcId); if (!arc) throw missing(); return { value: { ok: true, arc } }; }
    if (method === "PATCH") { query(url, []); const arc = await tx.campaigns.updateArc(campaignId, arcId, parse(updateArcInputSchema, payload), expected(expectedRevision), "owned-http"); return { value: { ok: true, arc } }; }
    return null;
  }
  if (parts[4] !== "scenes") return null;
  if (parts.length === 5) {
    if (method === "GET") { query(url, ["limit", "offset", "text"]); const value = await tx.campaigns.listScenes(campaignId, arcId, pageQuery(url, campaignPageQuerySchema)); return { value: { ok: true, ...value } }; }
    if (method === "POST") {
      query(url, []); const input = parse(createArcSceneInputSchema, payload), campaign = await tx.campaigns.get(campaignId);
      if (!campaign) throw missing(); if (campaign.state !== "active") throw new OwnedError("CAMPAIGN_INACTIVE");
      const scene = await tx.campaigns.createScene(campaignId, arcId, input, "owned-http");
      return { status: 201, location: `/api/v1/dm/campaigns/${campaignId}/arcs/${arcId}/scenes/${scene.sceneId}`, value: { ok: true, scene } };
    }
    return null;
  }
  const sceneId = routeId(parts[5]);
  if (parts.length === 6 && method === "POST") { query(url, []); const scene = await tx.campaigns.attachScene(campaignId, arcId, parse(attachSceneInputSchema, { sceneId }), "owned-http"); return { value: { ok: true, scene } }; }
  if (parts.length === 7 && parts[6] === "cover" && method === "PATCH") { query(url, []); const scene = await tx.campaigns.updateSceneCover(campaignId, arcId, sceneId, parse(updateSceneCoverInputSchema, payload), expected(expectedRevision, true), "owned-http"); return { value: { ok: true, scene } }; }
  return null;
}
