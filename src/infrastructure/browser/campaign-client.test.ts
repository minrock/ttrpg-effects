// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { CampaignClient } from "./campaign-client";
import { HttpTransport, ServiceError } from "./http";

const campaignId = "11111111-1111-4111-8111-111111111111";
const assetId = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-11-13T00:00:00.000Z";
const campaign = { id: campaignId, name: "Brumas", description: "", coverAssetId: null, state: "active", systemRef: { systemId: "generic", version: 1 }, revision: 1, createdAt: timestamp, updatedAt: timestamp };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

it("consulta campañas con paginación y conserva If-Match e idempotencia al actualizar", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(response({ ok: true, items: [campaign], total: 1, limit: 50, offset: 0 }))
    .mockResolvedValueOnce(response({ ok: true, campaign: { ...campaign, name: "Brumas II", revision: 2 } }));
  const client = new CampaignClient(new HttpTransport(fetcher));
  await expect(client.listCampaigns({ state: "active", limit: 50, offset: 0 })).resolves.toMatchObject({ total: 1, items: [{ id: campaignId }] });
  await client.updateCampaign(campaignId, 1, { name: "Brumas II" });
  expect(fetcher.mock.calls[0][0]).toBe("/api/v1/dm/campaigns?limit=50&offset=0&state=active");
  const options = fetcher.mock.calls[1][1] as RequestInit;
  expect(new Headers(options.headers).get("If-Match")).toBe("1");
  expect(new Headers(options.headers).get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  expect(options.body).toBe(JSON.stringify({ name: "Brumas II" }));
});

it("usa la capacidad explícita y no interpreta un 401 como catálogo legado", async () => {
  const fetcher = vi.fn().mockResolvedValue(response({ ok: false, error: { code: "UNAUTHORIZED", message: "Acceso inválido" } }, 401));
  const client = new CampaignClient(new HttpTransport(fetcher));
  await expect(client.capabilities()).rejects.toMatchObject({ code: "UNAUTHORIZED" satisfies ServiceError["code"] });
  expect(fetcher.mock.calls[0][0]).toBe("/api/v1/dm/campaign-capabilities");
});

it("sube una portada antes de asociar su identificador, sin rutas locales", async () => {
  const choose = vi.fn(async () => new File([new Uint8Array([1, 2])], "portada.png", { type: "image/png" }));
  const fetcher = vi.fn().mockResolvedValue(response({ ok: true, asset: { id: assetId, reference: `asset:${assetId}`, url: `/api/v1/dm/assets/${assetId}` } }));
  const client = new CampaignClient(new HttpTransport(fetcher), choose);
  await expect(client.uploadCover()).resolves.toBe(assetId);
  expect(fetcher.mock.calls[0][0]).toBe("/api/v1/dm/assets");
  expect(new Headers(fetcher.mock.calls[0][1].headers).get("Content-Type")).toBe("image/png");
  expect(fetcher.mock.calls[0][1].body).toBeInstanceOf(File);
});

it("cancelar el selector de portada no emite carga ni un nuevo identificador", async () => {
  const choose = vi.fn(async () => null);
  const fetcher = vi.fn();
  const client = new CampaignClient(new HttpTransport(fetcher), choose);
  await expect(client.uploadCover()).resolves.toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});

it("asocia una escena existente sin clonar su contenido", async () => {
  const fetcher = vi.fn().mockResolvedValue(response({ ok: true, scene: { sceneId: "33333333-3333-4333-8333-333333333333", arcId: "22222222-2222-4222-8222-222222222222", campaignId, name: "Puente", revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 0, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null } }));
  const client = new CampaignClient(new HttpTransport(fetcher));
  await expect(client.attachScene(campaignId, "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333")).resolves.toMatchObject({ name: "Puente" });
  expect(fetcher.mock.calls[0][0]).toBe(`/api/v1/dm/campaigns/${campaignId}/arcs/22222222-2222-4222-8222-222222222222/scenes/33333333-3333-4333-8333-333333333333`);
  expect(fetcher.mock.calls[0][1].method).toBe("POST");
});

it("lee los nombres e IDs de mapas solo para el detalle de una escena autorizada", async () => {
  const fetcher = vi.fn().mockResolvedValue(response({ ok: true, resource: { scene: { maps: [{ id: "mapa-puente", name: "Puente roto" }, { id: "mapa-torre", name: "Torre" }] } } }));
  const client = new CampaignClient(new HttpTransport(fetcher));
  await expect(client.getSceneMaps("33333333-3333-4333-8333-333333333333")).resolves.toEqual([{ id: "mapa-puente", name: "Puente roto" }, { id: "mapa-torre", name: "Torre" }]);
  expect(fetcher.mock.calls[0][0]).toBe("/api/v1/dm/scenes/33333333-3333-4333-8333-333333333333");
});

it("administra preparación con filtro, revisión, idempotencia, borrado y reserva de instancia", async () => {
  const arcId = "22222222-2222-4222-8222-222222222222";
  const preparedId = "55555555-5555-4555-8555-555555555555";
  const sceneId = "33333333-3333-4333-8333-333333333333";
  const prepared = { id: preparedId, arcId, kind: "npc" as const, name: "Vigía", imagePath: null, notes: "", revision: 1, createdAt: timestamp, updatedAt: timestamp, provenance: null };
  const fetcher = vi.fn()
    .mockResolvedValueOnce(response({ ok: true, items: [prepared], total: 1, limit: 50, offset: 0 }))
    .mockResolvedValueOnce(response({ ok: true, prepared }))
    .mockResolvedValueOnce(response({ ok: true }))
    .mockResolvedValueOnce(response({ ok: true, reservation: { sceneId, preparedId, entityId: "npc-vigia", snapshot: { version: 2, kind: "npc", name: "Vigía", imagePath: null, notes: "" }, binding: null } }));
  const client = new CampaignClient(new HttpTransport(fetcher));
  await expect(client.listPreparation(campaignId, arcId, { kind: "npc" })).resolves.toMatchObject({ total: 1, items: [{ name: "Vigía" }] });
  await client.updatePreparation(campaignId, arcId, preparedId, 1, { kind: "npc", notes: "Alerta" });
  await client.deletePreparation(campaignId, arcId, preparedId, 2);
  await client.reservePreparation(campaignId, arcId, sceneId, preparedId);
  expect(fetcher.mock.calls[0][0]).toBe(`/api/v1/dm/campaigns/${campaignId}/arcs/${arcId}/preparation?kind=npc`);
  expect(new Headers(fetcher.mock.calls[1][1].headers).get("If-Match")).toBe("1");
  expect(fetcher.mock.calls[2][0]).toBe(`/api/v1/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}`);
  expect(fetcher.mock.calls[2][1].method).toBe("DELETE");
  expect(new Headers(fetcher.mock.calls[2][1].headers).get("If-Match")).toBe("2");
  expect(new Headers(fetcher.mock.calls[2][1].headers).get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  expect(fetcher.mock.calls[3][0]).toBe(`/api/v1/dm/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}/instance`);
  expect(fetcher.mock.calls[3][1].body).toBe(JSON.stringify({ sceneId }));
});
