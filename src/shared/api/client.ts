import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import type { CampaignPage, CampaignPageQuery, PreparedEntityDto, PreparedEntitySnapshot, ScenePreparationReservationDto } from "../contracts/campaigns";
import type { TtrpgApi } from "./ttrpg-api";
import type { ServiceDiceClient } from "./service-dice-client";

/** Availability of operations, never authorization or a security boundary. */
export interface ClientCapabilities {
  readonly scenes: boolean;
  readonly images: boolean;
  readonly libraries: boolean;
  readonly templateAdministration?: boolean;
  readonly player: boolean;
  readonly dice: boolean;
}

export interface TtrpgClient {
  readonly api: TtrpgApi;
  readonly annotations?: import("../contracts/shared-annotations").SharedAnnotationsClient;
  readonly serviceDice?: ServiceDiceClient;
  readonly assetReferences?: "service";
  readonly capabilities: ClientCapabilities;
  readonly presentations?: {
    forMonster(id: string, templateId: string | null, available: readonly MonsterTemplate[]): readonly MonsterTemplate[];
    validateLibraryUse(id: string): Promise<void>;
  };
/** Opcional: el cliente conserva sus bibliotecas y no inventa jerarquía remota. */
  readonly arcPreparation?: {
    list(selection: { readonly campaignId: string; readonly arcId: string }, query?: CampaignPageQuery): Promise<CampaignPage<PreparedEntityDto>>;
    snapshot(prepared: PreparedEntityDto): PreparedEntitySnapshot;
    reserve(selection: { readonly campaignId: string; readonly arcId: string; readonly sceneId: string }, preparedId: string, idempotencyKey: string): Promise<ScenePreparationReservationDto>;
  };
}

/** The full contract stays required; only tests/labs may provide partial doubles. */
export function createClient(api: TtrpgApi, capabilities: ClientCapabilities, assetReferences?: "service", presentations?: TtrpgClient["presentations"], annotations?: TtrpgClient["annotations"], arcPreparation?: TtrpgClient["arcPreparation"], serviceDice?: ServiceDiceClient): TtrpgClient {
  return Object.freeze({ api, assetReferences, presentations, annotations, arcPreparation, serviceDice, capabilities: Object.freeze({ ...capabilities }) });
}
