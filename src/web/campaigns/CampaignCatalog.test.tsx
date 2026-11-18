// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpTransport } from "../../infrastructure/browser/http";
import { CampaignCatalog } from "./CampaignCatalog";

const campaignId = "11111111-1111-4111-8111-111111111111";
const arcId = "22222222-2222-4222-8222-222222222222";
const sceneId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-11-13T00:00:00.000Z";
const records = vi.hoisted(() => ({ get: vi.fn(async () => null), record: vi.fn(async () => true) }));

vi.mock("../../infrastructure/browser/campaign-recents", () => ({ IndexedDbCampaignRecents: class { get = records.get; record = records.record; clear = vi.fn(); } }));
vi.mock("../GameCatalog", () => ({ GameCatalog: () => <div>Legado</div> }));

const campaign = { id: campaignId, name: "Brumas", description: "", coverAssetId: null, state: "active", systemRef: { systemId: "generic", version: 1 }, revision: 1, createdAt: timestamp, updatedAt: timestamp };
const arc = { id: arcId, campaignId, name: "Llegada", description: "", coverAssetId: null, revision: 1, createdAt: timestamp, updatedAt: timestamp, sceneCount: 1 };
const scene = { sceneId, arcId, campaignId, name: "El puente", revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 1, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

let host: HTMLDivElement;
let root: Root;
let failScenes = false;
function fetchFixture(url: string): Promise<Response> {
  const path = url.replace("/api/v1", "").split("?")[0];
  if (path === "/dm/campaign-capabilities") return Promise.resolve(response({ ok: true, version: 1 }));
  if (path === "/dm/systems/selectable") return Promise.resolve(response({ ok: true, systems: [] }));
  if (path === "/dm/campaigns") return Promise.resolve(response({ ok: true, items: [campaign], total: 1, limit: 50, offset: 0 }));
  if (path === `/dm/campaigns/${campaignId}`) return Promise.resolve(response({ ok: true, campaign }));
  if (path === `/dm/campaigns/${campaignId}/arcs`) return Promise.resolve(response({ ok: true, items: [arc], total: 1, limit: 50, offset: 0 }));
  if (path === `/dm/campaigns/${campaignId}/arcs/${arcId}`) return Promise.resolve(response({ ok: true, arc }));
  if (path === `/dm/campaigns/${campaignId}/arcs/${arcId}/scenes`) return Promise.resolve(failScenes ? response({ ok: false, error: { code: "NETWORK", message: "Sin conexión" } }, 503) : response({ ok: true, items: [scene], total: 1, limit: 50, offset: 0 }));
  if (path === `/dm/scenes/${sceneId}`) return Promise.resolve(response({ ok: true, resource: { scene: { maps: [{ id: "mapa-1", name: "Mapa 1" }] } } }));
  throw new Error(`Ruta no prevista: ${url}`);
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  records.get.mockReset().mockResolvedValue(null);
  records.record.mockReset().mockResolvedValue(true);
  failScenes = false;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.stubGlobal("fetch", vi.fn(fetchFixture));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function settle() { await act(async () => { for (let index = 0; index < 16; index++) await Promise.resolve(); }); }
async function render(accountId = "account-a") { await act(async () => root.render(<CampaignCatalog http={new HttpTransport(fetch)} accountId={accountId} onLegacyOpen={vi.fn()} onSelectScene={vi.fn()}/>)); await settle(); }
async function click(label: string) { const button = [...host.querySelectorAll("button")].find(entry => entry.textContent === label); expect(button).toBeTruthy(); await act(async () => button!.click()); await settle(); }
async function enterScenes() { await click("Ver arcos de Brumas"); await click("Ver escenas de Llegada"); }

it("registra solo tras cargar el arco y vuelve a registrar al salir y reentrar al mismo arco", async () => {
  await render();
  await enterScenes();
  expect(records.record).toHaveBeenCalledTimes(1);
  await click("Campañas");
  await enterScenes();
  expect(records.record).toHaveBeenCalledTimes(2);
});

it("no registra un arco cuando falla la carga de sus escenas", async () => {
  await render();
  await click("Ver arcos de Brumas");
  failScenes = true;
  await click("Ver escenas de Llegada");
  expect(host.textContent).toContain("Sin conexión");
  expect(records.record).not.toHaveBeenCalled();
});

it("una entrada a detalle de otra escena del mismo arco vuelve a registrar después de cargar", async () => {
  campaign.state = "inactive";
  try {
    await render();
    await enterScenes();
    expect(records.record).toHaveBeenCalledTimes(1);
    await click("Ver detalles de El puente");
    expect(host.textContent).toContain("Mapa 1");
    expect(records.record).toHaveBeenCalledTimes(2);
  } finally {
    campaign.state = "active";
  }
});

it("un reciente de la cuenta anterior que responde tarde no resalta la cuenta nueva", async () => {
  let resolveOld: ((value: { arcId: string; visitedAt: string } | null) => void) | undefined;
  (records.get as unknown as { mockImplementation(value: (scope: { readonly accountId: string }) => Promise<{ arcId: string; visitedAt: string } | null>): void }).mockImplementation((scope: { readonly accountId: string }): Promise<{ arcId: string; visitedAt: string } | null> => scope.accountId === "account-a" ? new Promise<{ arcId: string; visitedAt: string } | null>(resolve => { resolveOld = resolve; }) : Promise.resolve(null));
  await render("account-a");
  await click("Ver arcos de Brumas");
  await render("account-b");
  resolveOld?.({ arcId, visitedAt: timestamp });
  await settle();
  expect(host.textContent).not.toContain("Visitado recientemente");
});

it("un fallo al persistir el reciente no lo resalta al volver a la lista de arcos", async () => {
  records.record.mockResolvedValue(false);
  await render();
  await enterScenes();
  expect(records.record).toHaveBeenCalledTimes(1);
  await click("Brumas");
  expect(host.textContent).not.toContain("Visitado recientemente");
});
