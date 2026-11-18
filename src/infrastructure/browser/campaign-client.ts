import { z } from "zod";
import type {
  ArcDto,
  ArcSceneDto,
  CampaignDto,
  CampaignListQuery,
  CampaignPage,
  CampaignPageQuery,
  PreparedEntityListQuery,
  CreateArcInput,
  CreateArcSceneInput,
  CreateCampaignInput,
  CreatePreparedEntityInput,
  PreparedEntityDto,
  ScenePreparationReservationDto,
  UpdateArcInput,
  UpdateCampaignInput,
  UpdatePreparedEntityInput,
  UpdateSceneCoverInput
} from "../../shared/contracts/campaigns";
import {
  arcDtoSchema,
  arcSceneDtoSchema,
  campaignDtoSchema,
  campaignPageSchema
} from "../../shared/contracts/campaigns";
import { preparedEntityDtoSchema, scenePreparationReservationSchema } from "../../shared/contracts/campaigns";
import { HttpTransport } from "./http";
import { Mutations } from "./mutations";
import { selectBrowserFile } from "./files";

const ok = z.literal(true);
const capabilitiesReply = z.object({ ok, version: z.literal(1) });
const campaignReply = z.object({ ok, campaign: campaignDtoSchema });
const arcReply = z.object({ ok, arc: arcDtoSchema });
const sceneReply = z.object({ ok, scene: arcSceneDtoSchema });
const preparedReply = z.object({ ok, prepared: preparedEntityDtoSchema });
const reservationReply = z.object({ ok, reservation: scenePreparationReservationSchema });
const sceneMapsReply = z.object({
  ok,
  resource: z.object({
    scene: z.object({
      maps: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(120) }))
    })
  })
});
const sceneSummarySchema = z.object({ id: z.uuid(), name: z.string().min(1), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const availableScenesReply = z.object({ ok, scenes: z.array(sceneSummarySchema), total: z.number().int().nonnegative() });
const uploadedAssetReply = z.object({ ok, asset: z.object({ id: z.uuid(), reference: z.string(), url: z.string() }).passthrough() });

function query(value: CampaignPageQuery | CampaignListQuery | PreparedEntityListQuery = {}): string {
  const params = new URLSearchParams();
  if (value.limit !== undefined) params.set("limit", String(value.limit));
  if (value.offset !== undefined) params.set("offset", String(value.offset));
  if (value.text) params.set("text", value.text);
  if ("state" in value && value.state) params.set("state", value.state);
  const kind = (value as PreparedEntityListQuery).kind;
  if (kind) params.set("kind", kind);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/** HTTP específico del panel administrativo. No concede capacidades al cliente local. */
export class CampaignClient {
  private readonly mutations: Mutations;
  constructor(private readonly http: HttpTransport, private readonly chooseFile = selectBrowserFile) {
    this.mutations = new Mutations(http);
  }

  capabilities(): Promise<void> {
    return this.http.request("/dm/campaign-capabilities", capabilitiesReply).then(() => undefined);
  }

  async listCampaigns(value: CampaignListQuery = {}): Promise<CampaignPage<CampaignDto>> {
    const reply = await this.http.request(`/dm/campaigns${query(value)}`, z.object({ ok, ...campaignPageSchema(campaignDtoSchema).shape }));
    return reply;
  }
  getCampaign(campaignId: string): Promise<CampaignDto> {
    return this.http.request(`/dm/campaigns/${campaignId}`, campaignReply).then(reply => reply.campaign);
  }
  createCampaign(value: CreateCampaignInput): Promise<CampaignDto> {
    return this.mutations.send("/dm/campaigns", campaignReply, "POST", value).then(reply => reply.campaign);
  }
  updateCampaign(campaignId: string, revision: number, value: UpdateCampaignInput): Promise<CampaignDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}`, campaignReply, "PATCH", value, revision).then(reply => reply.campaign);
  }
  setCampaignState(campaignId: string, revision: number, state: CampaignDto["state"]): Promise<CampaignDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}`, campaignReply, "PATCH", { state }, revision).then(reply => reply.campaign);
  }

  async listArcs(campaignId: string, value: CampaignPageQuery = {}): Promise<CampaignPage<ArcDto>> {
    const reply = await this.http.request(`/dm/campaigns/${campaignId}/arcs${query(value)}`, z.object({ ok, ...campaignPageSchema(arcDtoSchema).shape }));
    return reply;
  }
  getArc(campaignId: string, arcId: string): Promise<ArcDto> {
    return this.http.request(`/dm/campaigns/${campaignId}/arcs/${arcId}`, arcReply).then(reply => reply.arc);
  }
  createArc(campaignId: string, value: CreateArcInput): Promise<ArcDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs`, arcReply, "POST", value).then(reply => reply.arc);
  }
  updateArc(campaignId: string, arcId: string, revision: number, value: UpdateArcInput): Promise<ArcDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}`, arcReply, "PATCH", value, revision).then(reply => reply.arc);
  }

  async listScenes(campaignId: string, arcId: string, value: CampaignPageQuery = {}): Promise<CampaignPage<ArcSceneDto>> {
    const reply = await this.http.request(`/dm/campaigns/${campaignId}/arcs/${arcId}/scenes${query(value)}`, z.object({ ok, ...campaignPageSchema(arcSceneDtoSchema).shape }));
    return reply;
  }
  async listAvailableScenes(offset = 0): Promise<{ readonly scenes: readonly z.infer<typeof sceneSummarySchema>[]; readonly total: number }> {
    return this.http.request(`/dm/scenes?limit=50&offset=${offset}`, availableScenesReply);
  }
  /**
   * El detalle solo se pide para una escena ya autorizada por la asociación
   * campaña/arco. No carga el documento en el editor ni resuelve assets.
   */
  async getSceneMaps(sceneId: string): Promise<readonly { readonly id: string; readonly name: string }[]> {
    const reply = await this.http.request(`/dm/scenes/${sceneId}`, sceneMapsReply);
    return reply.resource.scene.maps;
  }
  attachScene(campaignId: string, arcId: string, sceneId: string): Promise<ArcSceneDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/scenes/${sceneId}`, sceneReply, "POST", {}).then(reply => reply.scene);
  }
  createScene(campaignId: string, arcId: string, value: CreateArcSceneInput): Promise<ArcSceneDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/scenes`, sceneReply, "POST", value).then(reply => reply.scene);
  }
  updateSceneCover(campaignId: string, arcId: string, sceneId: string, revision: number, value: UpdateSceneCoverInput): Promise<ArcSceneDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/scenes/${sceneId}/cover`, sceneReply, "PATCH", value, revision).then(reply => reply.scene);
  }

  /** Catálogo permanente del arco. La instancia táctica se reserva aparte. */
  async listPreparation(campaignId: string, arcId: string, value: PreparedEntityListQuery = {}): Promise<CampaignPage<PreparedEntityDto>> {
    return this.http.request(`/dm/campaigns/${campaignId}/arcs/${arcId}/preparation${query(value)}`, z.object({ ok, ...campaignPageSchema(preparedEntityDtoSchema).shape }));
  }
  getPreparation(campaignId: string, arcId: string, preparedId: string): Promise<PreparedEntityDto> {
    return this.http.request(`/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}`, preparedReply).then(reply => reply.prepared);
  }
  createPreparation(campaignId: string, arcId: string, value: CreatePreparedEntityInput): Promise<PreparedEntityDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/preparation`, preparedReply, "POST", value).then(reply => reply.prepared);
  }
  updatePreparation(campaignId: string, arcId: string, preparedId: string, revision: number, value: UpdatePreparedEntityInput): Promise<PreparedEntityDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}`, preparedReply, "PATCH", value, revision).then(reply => reply.prepared);
  }
  deletePreparation(campaignId: string, arcId: string, preparedId: string, revision: number): Promise<void> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}`, z.object({ ok }), "DELETE", {}, revision).then(() => undefined);
  }
  reservePreparation(campaignId: string, arcId: string, sceneId: string, preparedId: string): Promise<ScenePreparationReservationDto> {
    return this.mutations.send(`/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}/instance`, reservationReply, "POST", { sceneId }).then(reply => reply.reservation);
  }

  async uploadCover(): Promise<string | null> {
    const file = await this.chooseFile("image/png,image/jpeg,image/webp", this.http.sessionSignal);
    if (!file) return null;
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) throw new Error("Formato no admitido. Elige PNG, JPEG o WebP estático.");
    if (file.size > 20 * 1024 * 1024) throw new Error("La imagen supera el límite de 20 MiB.");
    const reply = await this.http.request("/dm/assets", uploadedAssetReply, { method: "POST", headers: { "Content-Type": file.type, "Idempotency-Key": crypto.randomUUID() }, body: file });
    return reply.asset.id;
  }

  clear(): void { this.mutations.clear(); }
}
