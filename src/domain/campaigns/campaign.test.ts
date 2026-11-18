import { describe, expect, it } from "vitest";
import { campaignFromGame, campaignStateFromGame, gameStateFromCampaign } from "./campaign";

const game = { id: "11111111-1111-4111-8111-111111111111", ownerId: "dm", name: "Partida", state: "ready" as const, systemRef: { systemId: "generic", version: 1 }, revision: 3, createdAt: "2026-11-13T00:00:00.000Z", updatedAt: "2026-11-13T00:00:00.000Z" };

describe("campaña compatible con partida", () => {
  it("traduce estados sin crear una segunda identidad o revisión", () => {
    expect(campaignStateFromGame("ready")).toBe("active");
    expect(campaignStateFromGame("archived")).toBe("inactive");
    expect(gameStateFromCampaign("active")).toBe("ready");
    expect(gameStateFromCampaign("inactive")).toBe("archived");
    expect(campaignFromGame(game, { description: "", coverAssetId: null })).toMatchObject({ id: game.id, revision: 3, state: "active" });
  });
});
