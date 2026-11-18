import { describe, expect, it, vi } from "vitest";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { serializeSceneDocument } from "../../domain/sessions/scene-schema";
import { systemSeeds, type ResolvedSystem, type SystemVersion } from "../../domain/systems/system-catalog";
import { createBrowserClient } from "./browser-client";
import { HttpTransport } from "./http";
import { BrowserTableClient } from "./table-client";

const campaignId = "11111111-1111-4111-8111-111111111111";
const arcId = "22222222-2222-4222-8222-222222222222";
const originalSceneId = "01010101-0101-4101-8101-010101010101";
const importedSceneId = "44444444-4444-4444-8444-444444444444";
const preparedId = "55555555-5555-4555-8555-555555555555";
const firstSceneId = "66666666-6666-4666-8666-666666666666";
const scopedSceneId = "77777777-7777-4777-8777-777777777777";
const foreignSceneId = "88888888-8888-4888-8888-888888888888";
const now = "2026-11-17T00:00:00.000Z";
const seed = systemSeeds[0]!;
const configuration: ResolvedSystem = { ref: seed.ref, definition: seed.definition, hash: "configuration-hash", availability: "enabled" };
const version: SystemVersion = { systemId: seed.ref.systemId, version: seed.ref.version, state: "published", createdAt: now, publishedAt: now, revision: 1, availability: "enabled", definition: seed.definition, hash: "version-hash", templates: { "generic-markdown": { availability: "enabled", revision: 1 } } };

function reply(body: unknown): Response { return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }); }
function arcScene(sceneId: string, name: string) { return { sceneId, arcId, campaignId, name, revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 0, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null }; }

describe("BrowserClient contextual", () => {
  it("crea/importa en el arco y reserva de inmediato solo para el nuevo recurso", async () => {
    const bodies: Array<{ path: string; value: Record<string, unknown> }> = [];
    let sequence = 0;
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const path = String(input);
      if (path.includes("/definitions/scenes/")) return reply({ ok: true, templates: [], monsters: {} });
      if (path.endsWith(`/campaigns/${campaignId}/arcs/${arcId}/preparation/${preparedId}/instance`) && init?.method === "POST") {
        const { sceneId } = JSON.parse(String(init.body)) as { sceneId: string };
        return reply({ ok: true, reservation: { sceneId, preparedId, entityId: "npc-vigia", snapshot: { version: 2, kind: "npc", name: "Vigía", imagePath: null, notes: "" }, binding: null } });
      }
      if ((path.endsWith("/scenes") || path.endsWith("/scenes/import")) && init?.method === "POST") {
        const value = JSON.parse(String(init.body)) as Record<string, unknown>;
        bodies.push({ path, value });
        const id = sequence++ === 0 ? "33333333-3333-4333-8333-333333333333" : importedSceneId;
        return reply({ ok: true, resource: { id, name: String(value.name), createdAt: now, updatedAt: now, revision: 1, bindings: { monsters: {} }, scene: value.scene, warnings: [], missingImages: [] } });
      }
      throw new Error(`Ruta inesperada: ${init?.method ?? "GET"} ${path}`);
    });
    const http = new HttpTransport(fetcher, () => undefined, "/api/v1/dm");
    const browser = createBrowserClient(http, { selectScene: async () => null, sceneName: async () => "Escena nueva" }, async () => new File([serializeSceneDocument(createDefaultScene())], "importada.ttrpgscene", { type: "application/json" }), { gameId: campaignId, arcId, configuration, version, table: new BrowserTableClient(http) });

    await expect(browser.client.arcPreparation!.reserve({ campaignId, arcId, sceneId: originalSceneId }, preparedId, crypto.randomUUID())).rejects.toThrow("Guarda o importa la escena");
    const copied = await browser.client.api.saveScene(createDefaultScene());
    expect(copied).toMatchObject({ ok: true, filePath: "scene:33333333-3333-4333-8333-333333333333" });
    await expect(browser.client.arcPreparation!.reserve({ campaignId, arcId, sceneId: "33333333-3333-4333-8333-333333333333" }, preparedId, crypto.randomUUID())).resolves.toMatchObject({ sceneId: "33333333-3333-4333-8333-333333333333" });
    expect((await browser.importFile()).ok).toBe(true);
    const preparation = browser.client.arcPreparation!;
    await expect(preparation.reserve({ campaignId, arcId, sceneId: importedSceneId }, preparedId, crypto.randomUUID())).resolves.toMatchObject({ sceneId: importedSceneId });
    await expect(preparation.reserve({ campaignId, arcId, sceneId: originalSceneId }, preparedId, crypto.randomUUID())).rejects.toThrow("escena guardada del arco actual");

    expect(bodies).toHaveLength(2);
    expect(bodies).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "/api/v1/dm/scenes", value: expect.objectContaining({ campaignId, arcId }) }),
      expect.objectContaining({ path: "/api/v1/dm/scenes/import", value: expect.objectContaining({ campaignId, arcId }) })
    ]));
  });

  it("pagina solo las escenas del arco y rechaza cargar una escena ajena antes de hidratarla", async () => {
    const requests: string[] = [];
    const scopedPath = `/api/v1/dm/campaigns/${campaignId}/arcs/${arcId}/scenes`;
    let selected = scopedSceneId;
    const scene = createDefaultScene();
    const fetcher = vi.fn<typeof fetch>(async input => {
      const url = new URL(String(input), "http://fixture.local"); requests.push(`${url.pathname}${url.search}`);
      if (url.pathname.includes("/definitions/scenes/")) return reply({ ok: true, templates: [], monsters: {} });
      if (url.pathname === scopedPath) {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const items = offset === 0 ? [arcScene(firstSceneId, "Primera del arco")] : [arcScene(scopedSceneId, "Segunda del arco")];
        return reply({ ok: true, items, total: 2, limit: Number(url.searchParams.get("limit") ?? 50), offset });
      }
      if (url.pathname === `/api/v1/dm/scenes/${scopedSceneId}`) return reply({ ok: true, resource: { id: scopedSceneId, name: "Segunda del arco", createdAt: now, updatedAt: now, revision: 1, bindings: { monsters: {} }, scene, warnings: [], missingImages: [] } });
      throw new Error(`Ruta inesperada: ${url.pathname}${url.search}`);
    });
    const http = new HttpTransport(fetcher, () => undefined, "/api/v1/dm");
    const browser = createBrowserClient(http, { selectScene: async () => `scene:${selected}`, sceneName: async () => null }, undefined, { gameId: campaignId, arcId, configuration, version, table: new BrowserTableClient(http) });

    await expect(browser.listScenes(0)).resolves.toEqual({ scenes: [{ id: firstSceneId, name: "Primera del arco" }], total: 2 });
    const loaded = await browser.client.api.loadScene();
    expect(loaded).toMatchObject({ ok: true, filePath: `scene:${scopedSceneId}` });
    expect(requests).toContain(`${scopedPath}?limit=50&offset=0`);
    expect(requests.filter(request => request === `${scopedPath}?limit=100&offset=1`).length).toBe(2);
    expect(requests).not.toContain("/api/v1/dm/scenes?limit=50&offset=0");

    selected = foreignSceneId;
    const foreign = await browser.client.api.loadScene();
    expect(foreign).toMatchObject({ ok: false, error: "La escena seleccionada no pertenece al arco actual." });
    expect(requests).not.toContain(`/api/v1/dm/scenes/${foreignSceneId}`);
  });
});
