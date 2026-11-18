import type { PreparedEntityDto, CampaignPage, PreparedEntityListQuery, CreatePreparedEntityInput, UpdatePreparedEntityInput } from "../../shared/contracts/campaigns";
import type { ScenePreparationReservation } from "../../domain/campaigns/scene-snapshot";

export type { CreatePreparedEntityInput, UpdatePreparedEntityInput } from "../../shared/contracts/campaigns";

/** Igual que CampaignRepository, su implementación queda acotada al owner de la transacción. */
export interface ArcPreparationRepository {
  list(campaignId: string, arcId: string, query: PreparedEntityListQuery): Promise<CampaignPage<PreparedEntityDto>>;
  get(campaignId: string, arcId: string, preparedId: string): Promise<PreparedEntityDto | null>;
  create(campaignId: string, arcId: string, input: CreatePreparedEntityInput, idempotencyKey: string): Promise<PreparedEntityDto>;
  update(campaignId: string, arcId: string, preparedId: string, input: UpdatePreparedEntityInput, expectedRevision: number, idempotencyKey: string): Promise<PreparedEntityDto>;
  remove(campaignId: string, arcId: string, preparedId: string, expectedRevision: number, idempotencyKey: string): Promise<void>;
  reserveInstance(campaignId: string, arcId: string, preparedId: string, sceneId: string, idempotencyKey: string): Promise<ScenePreparationReservation>;
}
