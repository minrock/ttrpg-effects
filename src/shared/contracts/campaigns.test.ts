import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import {
  CAMPAIGN_PAGE_DEFAULT_LIMIT, arcSceneDtoSchema, campaignDtoSchema, campaignListQuerySchema, campaignPageSchema,
  campaignTransferRecordSchema, createArcSceneInputSchema, createCampaignInputSchema, createPreparedEntityInputSchema, preparedEntityListQuerySchema,
  preparedEntityDtoSchema, scenePreparationReservationSchema
} from "./campaigns";

const ids = {
  campaign: "11111111-1111-4111-8111-111111111111",
  arc: "22222222-2222-4222-8222-222222222222",
  scene: "33333333-3333-4333-8333-333333333333",
  asset: "44444444-4444-4444-8444-444444444444",
  prepared: "55555555-5555-4555-8555-555555555555"
};
const timestamp = "2026-11-13T00:00:00.000Z";

describe("contratos de campañas", () => {
  it("fija gameId como identidad de campaña y la referencia de sistema retenida", () => {
    const result = campaignDtoSchema.parse({ id: ids.campaign, name: " Campaña ", description: "", coverAssetId: null, state: "active", systemRef: { systemId: "generic", version: 1 }, revision: 1, createdAt: timestamp, updatedAt: timestamp });
    expect(result).toMatchObject({ id: ids.campaign, name: "Campaña", systemRef: { systemId: "generic", version: 1 } });
    expect(createCampaignInputSchema.safeParse({ name: "X", description: "", coverAssetId: null, systemRef: { systemId: "generic", version: 1 }, ownerId: "forjado" }).success).toBe(false);
  });

  it("conserva la referencia de portada fallida y bloqueos de escritura autorizados", () => {
    const item = arcSceneDtoSchema.parse({ sceneId: ids.scene, arcId: ids.arc, campaignId: ids.campaign, name: "Escena", revision: 3, coverRevision: 2, customCoverAssetId: ids.asset, mapCount: 2, map0ImagePath: `asset:${ids.asset}`, map0AssetId: ids.asset, cover: { source: "custom", assetId: ids.asset, availability: "missing" }, writeBlock: { code: "SCENE_SHARED_INACTIVE", campaignId: ids.campaign } });
    expect(item.cover).toEqual({ source: "custom", assetId: ids.asset, availability: "missing" });
    expect(item).toMatchObject({ mapCount: 2, map0AssetId: ids.asset });
    expect(item.writeBlock?.code).toBe("SCENE_SHARED_INACTIVE");
  });

  it("pagina a 50 por defecto y no permite ampliar el límite", () => {
    expect(campaignListQuerySchema.parse({})).toMatchObject({ limit: CAMPAIGN_PAGE_DEFAULT_LIMIT, offset: 0 });
    expect(campaignListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(campaignPageSchema(campaignDtoSchema).safeParse({ items: [], total: 0, limit: 100, offset: 0 }).success).toBe(true);
  });

  it("restringe el filtro de preparación a NPC o monstruo sin alterar la página", () => {
    expect(preparedEntityListQuerySchema.parse({ kind: "npc" })).toMatchObject({ kind: "npc", limit: 50, offset: 0 });
    expect(preparedEntityListQuerySchema.safeParse({ kind: "todo" }).success).toBe(false);
  });

  it("mantiene procedencia separada de la copia y binding exacto del monstruo", () => {
    const item = preparedEntityDtoSchema.parse({ id: ids.prepared, arcId: ids.arc, kind: "monster", name: "Goblin", imagePath: null, notes: "Notas", templateId: "generic-markdown", binding: { scope: "catalog", systemId: "generic", version: 1, templateId: "generic-markdown" }, revision: 1, createdAt: timestamp, updatedAt: timestamp, provenance: { sceneId: ids.scene, kind: "monster", entityId: "legacy-goblin" } });
    expect(item.provenance).toEqual({ sceneId: ids.scene, kind: "monster", entityId: "legacy-goblin" });
    expect(preparedEntityDtoSchema.safeParse({ ...item, provenance: { ...item.provenance!, kind: "npc" } }).success).toBe(false);
    expect(preparedEntityDtoSchema.parse({ ...item, templateId: null, name: "x".repeat(201), notes: "n".repeat(1_000_001), provenance: { ...item.provenance!, entityId: "legacy-" + "x".repeat(300) } })).toMatchObject({ kind: "monster", templateId: null });
  });

  it("describe reserva v2 y transporta la tumba fuera del DTO público", () => {
    const reservation = scenePreparationReservationSchema.parse({ sceneId: ids.scene, preparedId: ids.prepared, entityId: "instance-1", snapshot: { version: 2, kind: "npc", name: "Guía", imagePath: null, notes: "Privado" }, binding: null });
    expect(campaignTransferRecordSchema.parse({ type: "scene-preparation-instance", owner: "dm", value: reservation })).toMatchObject({ type: "scene-preparation-instance", value: { entityId: "instance-1" } });
    expect(campaignTransferRecordSchema.parse({ type: "prepared-entity", owner: "dm", value: { id: ids.prepared, arcId: ids.arc, kind: "npc", name: "Guía", imagePath: null, notes: "", revision: 2, createdAt: timestamp, updatedAt: timestamp, provenance: null }, deletedAt: timestamp })).toMatchObject({ deletedAt: timestamp });
    const monsterSnapshot = { version: 2 as const, kind: "monster" as const, name: "M", imagePath: null, notes: "", templateId: null, binding: { scope: "catalog" as const, systemId: "generic", version: 1, templateId: "generic-markdown" } };
    expect(scenePreparationReservationSchema.safeParse({ ...reservation, snapshot: monsterSnapshot, binding: null }).success).toBe(false);
    expect(scenePreparationReservationSchema.safeParse({ ...reservation, snapshot: monsterSnapshot, binding: { scope: "catalog", systemId: "dnd-55e", version: 1, templateId: "generic-markdown" } }).success).toBe(false);
  });

  it("separa datos retenidos de inputs nuevos y crea escena con bindings en la misma orden", () => {
    expect(createPreparedEntityInputSchema.safeParse({ kind: "npc", name: "", imagePath: null, notes: "" }).success).toBe(false);
    expect(createPreparedEntityInputSchema.safeParse({ kind: "monster", name: "M", imagePath: null, notes: "", templateId: "generic-markdown" }).success).toBe(false);
    expect(createArcSceneInputSchema.parse({ name: "Escena nueva", scene: createDefaultScene(), bindings: { monsters: {} } }).scene.version).toBe(2);
  });
});
