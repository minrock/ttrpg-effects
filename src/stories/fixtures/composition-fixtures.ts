import { createDefaultMapAnnotations, type MapAnnotations } from "../../domain/annotations/map-annotations";
import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import { createDefaultSceneMap } from "../../domain/sessions/scene-maps";
import type { SceneObjectEntry } from "../../domain/sessions/scene-objects";
import type { ArcDto, ArcSceneDto, CampaignDto } from "../../shared/contracts/campaigns";

export const storyCampaignId = "11111111-1111-4111-8111-111111111111";
export const storyArcId = "22222222-2222-4222-8222-222222222222";
export const storySceneId = "33333333-3333-4333-8333-333333333333";
export const storyTimestamp = "2026-11-13T00:00:00.000Z";

export const storyCampaign = (state: CampaignDto["state"] = "active"): CampaignDto => ({
  id: storyCampaignId, name: "Brumas de Miraval", description: "Investigación entre ruinas inundadas.", coverAssetId: null,
  state, systemRef: { systemId: "generic", version: 1 }, revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp
});
export const storyArc: ArcDto = { id: storyArcId, campaignId: storyCampaignId, name: "La llegada", description: "Primer arco", coverAssetId: null, revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, sceneCount: 1 };
export const storyScene: ArcSceneDto = { sceneId: storySceneId, arcId: storyArcId, campaignId: storyCampaignId, name: "El puente hundido", revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 0, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null };

export const storyMaps = [
  createDefaultSceneMap({ id: "mapa-entrada", name: "Entrada" }),
  createDefaultSceneMap({ id: "mapa-cripta", name: "Cripta inundada" })
];
export const storyObjects: readonly SceneObjectEntry[] = [
  { id: "fire-1", collection: "effects", group: "Efectos", label: "Fuego circular · fire-1", visible: true, center: { x: 120, y: 80 } },
  { id: "light-1", collection: "lights", group: "Efectos", label: "Luz puntual · light-1", visible: false, center: { x: 210, y: 120 } },
  { id: "shape-1", collection: "shapes", group: "Areas", label: "Círculo · shape-1", visible: true, center: { x: 340, y: 180 } }
];
export const storyAnnotations: MapAnnotations = {
  ...createDefaultMapAnnotations(),
  pins: [{ id: "pin-puente", kind: "room-pin", title: "Puente hundido", content: "La corriente oculta una llave.", position: { x: 40, y: 60 }, locked: false }],
  areas: [
    { id: "terrain-agua", kind: "information-area", areaType: "terrain", name: "Agua profunda", description: "Terreno difícil", cells: [{ x: 0, y: 0, size: 100 }], locked: false },
    { id: "trap-red", kind: "information-area", areaType: "trap", name: "Red de pesca", description: "Trampa", cells: [{ x: 100, y: 0, size: 100 }], locked: true }
  ],
  sceneLinks: [{ id: "link-cripta", kind: "scene-link", name: "Bajada a la cripta", position: { x: 200, y: 140 }, locked: false, connection: null }]
};
export const storyTemplate: MonsterTemplate = { id: "story-template", name: "Vigía anfibio", system: "Genérico", markdown: "# {{Nombre}}\n\n**CA** {{CA}}\n\n## Acción\n**Mordisco.** {{Daño}}", css: ".monster-card { border: 1px solid #71809a; padding: 12px; }", builtIn: false, updatedAt: storyTimestamp };
