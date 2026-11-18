import type { CampaignDto } from "../../shared/contracts/campaigns";
import type { GameMetadata } from "../games/game-metadata";

/** Traducción deliberada: la campaña no duplica la máquina de estados de ttrpg_games. */
export function campaignStateFromGame(state: GameMetadata["state"]): CampaignDto["state"] {
  return state === "ready" ? "active" : "inactive";
}

export function gameStateFromCampaign(state: CampaignDto["state"]): GameMetadata["state"] {
  return state === "active" ? "ready" : "archived";
}

export function campaignFromGame(game: GameMetadata, details: Pick<CampaignDto, "description" | "coverAssetId">): CampaignDto {
  return {
    id: game.id,
    name: game.name,
    description: details.description,
    coverAssetId: details.coverAssetId,
    state: campaignStateFromGame(game.state),
    systemRef: game.systemRef,
    revision: game.revision,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}
