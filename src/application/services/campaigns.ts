import type {
  ArcDto, ArcSceneDto, AttachSceneInput, CampaignDto, CampaignListQuery, CampaignPage, CampaignPageQuery, CreateArcInput, CreateArcSceneInput, CreateCampaignInput,
  SetCampaignStateInput, UpdateArcInput, UpdateCampaignInput, UpdateSceneCoverInput
} from "../../shared/contracts/campaigns";

/** Repositorio ligado a la transacción y al propietario ya autorizado; no acepta ownerId del cliente. */
export interface CampaignRepository {
  list(query: CampaignListQuery): Promise<CampaignPage<CampaignDto>>;
  get(campaignId: string): Promise<CampaignDto | null>;
  create(input: CreateCampaignInput, idempotencyKey: string): Promise<CampaignDto>;
  update(campaignId: string, input: UpdateCampaignInput, expectedRevision: number, idempotencyKey: string): Promise<CampaignDto>;
  setState(campaignId: string, input: SetCampaignStateInput, expectedRevision: number, idempotencyKey: string): Promise<CampaignDto>;
  listArcs(campaignId: string, query: CampaignPageQuery): Promise<CampaignPage<ArcDto>>;
  getArc(campaignId: string, arcId: string): Promise<ArcDto | null>;
  createArc(campaignId: string, input: CreateArcInput, idempotencyKey: string): Promise<ArcDto>;
  updateArc(campaignId: string, arcId: string, input: UpdateArcInput, expectedRevision: number, idempotencyKey: string): Promise<ArcDto>;
  listScenes(campaignId: string, arcId: string, query: CampaignPageQuery): Promise<CampaignPage<ArcSceneDto>>;
  resolveSceneArc(campaignId: string, arcId?: string): Promise<ArcDto>;
  findSceneArc(campaignId: string, sceneId: string): Promise<ArcDto>;
  assertSceneParent(sceneId: string, campaignId?: string, arcId?: string): Promise<void>;
  assertCampaignWritable(campaignId: string): Promise<void>;
  linkScene(campaignId: string, arcId: string, sceneId: string): Promise<ArcSceneDto>;
  createScene(campaignId: string, arcId: string, input: CreateArcSceneInput, idempotencyKey: string): Promise<ArcSceneDto>;
  attachScene(campaignId: string, arcId: string, input: AttachSceneInput, idempotencyKey: string): Promise<ArcSceneDto>;
  updateSceneCover(campaignId: string, arcId: string, sceneId: string, input: UpdateSceneCoverInput, expectedCoverRevision: number, idempotencyKey: string): Promise<ArcSceneDto>;
}
