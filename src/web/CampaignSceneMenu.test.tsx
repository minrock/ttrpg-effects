// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignSceneMenu, loadCampaignSceneGroups } from "./CampaignSceneMenu";
import { CampaignClient } from "../infrastructure/browser/campaign-client";
import { HttpTransport } from "../infrastructure/browser/http";

const campaignId = "11111111-1111-4111-8111-111111111111";
const otherCampaignId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const arcA = "22222222-2222-4222-8222-222222222222";
const arcB = "33333333-3333-4333-8333-333333333333";
const scene = "44444444-4444-4444-8444-444444444444";
const at = "2026-11-15T00:00:00.000Z";
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const arc = (id: string, name: string) => ({ id, campaignId, name, description: "", coverAssetId: null, revision: 1, createdAt: at, updatedAt: at, sceneCount: 1 });
const row = (arcId: string, sceneId: string, name: string) => ({ sceneId, arcId, campaignId, name, revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 0, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null });

it("carga todas las páginas, conserva la misma escena en arcos distintos y no mezcla campañas", async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path.includes(`/campaigns/${campaignId}/arcs?`) && path.includes("offset=0")) return reply({ ok: true, items: [arc(arcA, "Primer arco")], total: 2, limit: 100, offset: 0 });
    if (path.includes(`/campaigns/${campaignId}/arcs?`) && path.includes("offset=1")) return reply({ ok: true, items: [arc(arcB, "Segundo arco")], total: 2, limit: 100, offset: 1 });
    if (path.includes(`/arcs/${arcA}/scenes`)) return reply({ ok: true, items: [row(arcA, scene, "Ruinas")], total: 1, limit: 100, offset: 0 });
    if (path.includes(`/arcs/${arcB}/scenes`)) return reply({ ok: true, items: [row(arcB, scene, "Ruinas")], total: 1, limit: 100, offset: 0 });
    return reply({ ok: false, error: { code: "NOT_FOUND", message: "Ruta inesperada" } }, 404);
  });
  const groups = await loadCampaignSceneGroups(new CampaignClient(new HttpTransport(fetcher)), campaignId);
  expect(groups).toHaveLength(2);
  expect(groups.map(group => group.arc.campaignId)).toEqual([campaignId, campaignId]);
  expect(groups.map(group => group.scenes[0]?.sceneId)).toEqual([scene, scene]);
  expect(fetcher.mock.calls.some(([url]) => String(url).includes(otherCampaignId))).toBe(false);
});

it("avanza arcos y escenas después del límite de 100 sin cargar documentos", async () => {
  const calls: string[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input); calls.push(path);
    if (path.includes(`/campaigns/${campaignId}/arcs?`) && path.includes("offset=0")) return reply({ ok: true, items: [arc(arcA, "Primer arco")], total: 2, limit: 100, offset: 0 });
    if (path.includes(`/campaigns/${campaignId}/arcs?`) && path.includes("offset=1")) return reply({ ok: true, items: [arc(arcB, "Segundo arco")], total: 2, limit: 100, offset: 1 });
    if (path.includes(`/arcs/${arcA}/scenes`) && path.includes("offset=0")) return reply({ ok: true, items: Array.from({ length: 100 }, (_, index) => row(arcA, `44444444-4444-4444-8444-${String(index).padStart(12, "0")}`, `Escena ${index}`)), total: 101, limit: 100, offset: 0 });
    if (path.includes(`/arcs/${arcA}/scenes`) && path.includes("offset=100")) return reply({ ok: true, items: [row(arcA, scene, "Escena 101")], total: 101, limit: 100, offset: 100 });
    if (path.includes(`/arcs/${arcB}/scenes`)) return reply({ ok: true, items: [], total: 0, limit: 100, offset: 0 });
    return reply({ ok: false, error: { code: "NOT_FOUND", message: "Ruta inesperada" } }, 404);
  });
  const groups = await loadCampaignSceneGroups(new CampaignClient(new HttpTransport(fetcher)), campaignId);
  expect(groups.map(group => group.scenes.length)).toEqual([101, 0]);
  expect(calls.filter(path => path.includes("/arcs?")).every(path => path.includes("limit=100"))).toBe(true);
  expect(calls.some(path => path.includes(`/arcs/${arcA}/scenes?limit=100&offset=100`))).toBe(true);
  expect(calls.some(path => path.includes("/dm/scenes?"))).toBe(false);
});

it("detecta una página sin progreso como error recuperable", async () => {
  const client = new CampaignClient(new HttpTransport(async () => reply({ ok: true, items: [], total: 1, limit: 100, offset: 0 })));
  await expect(loadCampaignSceneGroups(client, campaignId)).rejects.toThrow("No se pudo completar el listado de escenas");
});

let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

it("muestra el error parcial sin filas antiguas y reintenta sin cerrar", async () => {
  let attempt = 0;
  const http = new HttpTransport(async input => {
    attempt++;
    if (attempt === 1) return reply({ ok: false, error: { code: "UNAVAILABLE", message: "Fallo sintético" } }, 503);
    const path = String(input);
    if (path.includes("/arcs?") || path.endsWith("/arcs")) return reply({ ok: true, items: [arc(arcA, "Arco")], total: 1, limit: 100, offset: 0 });
    return reply({ ok: true, items: [row(arcA, scene, "Escena recuperada")], total: 1, limit: 100, offset: 0 });
  });
  await act(async () => root.render(<CampaignSceneMenu http={http} campaignId={campaignId} open currentSelection={undefined} onSelect={async () => true} />));
  await vi.waitFor(() => expect(host.querySelector('[role="alert"]')?.textContent).toContain("Fallo sintético"));
  const retry = [...host.querySelectorAll("button")].find(button => button.textContent === "Reintentar")!;
  expect(retry.dataset.dropdownKeepOpen).toBe("true");
  await act(async () => retry.click());
  await vi.waitFor(() => expect(host.textContent).toContain("Escena recuperada"));
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it("cerrar mientras una página espera no inicia páginas posteriores ni restaura filas", async () => {
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
  const http = new HttpTransport(fetcher);
  await act(async () => root.render(<CampaignSceneMenu http={http} campaignId={campaignId} open currentSelection={undefined} onSelect={async () => true} />));
  await act(async () => root.render(<CampaignSceneMenu http={http} campaignId={campaignId} open={false} currentSelection={undefined} onSelect={async () => true} />));
  await act(async () => resolve(reply({ ok: true, items: [arc(arcA, "No debe aparecer")], total: 2, limit: 100, offset: 0 })));
  await act(async () => { for (let index = 0; index < 4; index++) await Promise.resolve(); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(host.textContent).toBe("");
});

it("una respuesta tardía no roba foco si ya salió del disparador", async () => {
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    if (String(input).includes("/scenes")) return Promise.resolve(reply({ ok: true, items: [row(arcA, scene, "Actual")], total: 1, limit: 100, offset: 0 }));
    return new Promise<Response>(done => { resolve = done; });
  });
  const http = new HttpTransport(fetcher);
  await act(async () => root.render(<><details className="header-dropdown" open><summary>Opciones</summary><div className="header-dropdown-panel"><CampaignSceneMenu http={http} campaignId={campaignId} open currentSelection={{ campaignId, arcId: arcA, sceneId: scene }} onSelect={async () => true} /></div></details><button type="button">Campañas</button></>));
  const trigger = host.querySelector("summary")!, campaigns = [...host.querySelectorAll("button")].find(button => button.textContent === "Campañas")!;
  trigger.focus(); campaigns.focus();
  await act(async () => resolve(reply({ ok: true, items: [arc(arcA, "Arco")], total: 1, limit: 100, offset: 0 })));
  await vi.waitFor(() => expect(host.textContent).toContain("Actual"));
  expect(document.activeElement).toBe(campaigns);
});
