// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CampaignClient } from "../../infrastructure/browser/campaign-client";
import type { ArcDto, CampaignDto } from "../../shared/contracts/campaigns";
import { CampaignPanel } from "./CampaignPanel";

const campaignId = "11111111-1111-4111-8111-111111111111";
const arcId = "22222222-2222-4222-8222-222222222222";
const sceneId = "33333333-3333-4333-8333-333333333333";
const createdSceneId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-11-13T00:00:00.000Z";
const campaign = (state: CampaignDto["state"] = "active"): CampaignDto => ({ id: campaignId, name: "Brumas", description: "Una campaña", coverAssetId: null, state, systemRef: { systemId: "generic", version: 1 }, revision: 1, createdAt: timestamp, updatedAt: timestamp });
const arc: ArcDto = { id: arcId, campaignId, name: "Llegada", description: "Primer arco", coverAssetId: null, revision: 1, createdAt: timestamp, updatedAt: timestamp, sceneCount: 1 };
let host: HTMLDivElement, root: Root;
function page<T>(items: readonly T[]) { return { items, total: items.length, limit: 50, offset: 0 }; }
function client(state: CampaignDto["state"] = "active") {
  const scene = { sceneId, arcId, campaignId, name: "El puente", revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 1, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" as const }, writeBlock: null };
  return {
    listCampaigns: vi.fn(async () => page([campaign(state)])), getCampaign: vi.fn(async () => campaign(state)),
    listArcs: vi.fn(async () => page([arc])), getArc: vi.fn(async () => arc),
    listScenes: vi.fn(async () => page([scene])),
    setCampaignState: vi.fn(async (_id: string, _revision: number, next: CampaignDto["state"]) => campaign(next)), uploadCover: vi.fn(), createCampaign: vi.fn(), updateCampaign: vi.fn(), createArc: vi.fn(), updateArc: vi.fn(), updateSceneCover: vi.fn(), getSceneMaps: vi.fn(async () => [{ id: "mapa-1", name: "Mapa 1" }]), createScene: vi.fn(async () => ({ ...scene, sceneId: createdSceneId, name: "Nueva escena" }))
  } as unknown as CampaignClient;
}
beforeEach(() => { class ResizeObserverFixture { observe() {} unobserve() {} disconnect() {} } Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: ResizeObserverFixture }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
async function render(element: ReactNode) { await act(async () => root.render(element)); await act(async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); }); }
async function click(label: string) { const button = [...host.querySelectorAll("button")].find(entry => entry.textContent === label); expect(button).toBeTruthy(); await act(async () => button!.click()); }

it("muestra catálogo con estado textual y navega de campaña a arcos", async () => {
  const api = client(), navigate = vi.fn();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "campaigns" }} onNavigate={navigate} onSelectScene={vi.fn()}/>);
  expect(host.textContent).toContain("Campañas"); expect(host.textContent).toContain("Activa"); expect(host.textContent).toContain("generic · versión 1");
  await click("Ver arcos de Brumas");
  expect(navigate).toHaveBeenCalledWith({ level: "arcs", campaignId });
});

it("presenta la hoja de detalle como texto y conserva ancestros navegables", async () => {
  const api = client(), navigate = vi.fn();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scene-details", campaignId, arcId, sceneId }} onNavigate={navigate} onSelectScene={vi.fn()}/>);
  const breadcrumbs = host.querySelector('nav[aria-label="Ruta de campañas"]');
  expect(breadcrumbs).toBeTruthy();
  const current = breadcrumbs!.querySelector('[aria-current="page"]');
  expect(current?.tagName).toBe("SPAN"); expect(current?.textContent).toBe("El puente"); expect(breadcrumbs!.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  const ancestors = [...breadcrumbs!.querySelectorAll("button")];
  expect(ancestors.map(button => button.textContent)).toEqual(["Campañas", "Brumas", "Llegada"]);
  expect(ancestors.every(button => button.type === "button")).toBe(true);
  await act(async () => ancestors[1]!.click());
  expect(navigate).toHaveBeenCalledWith({ level: "arcs", campaignId });
});

it("usa un texto neutro para el detalle de escena mientras falla su carga", async () => {
  const api = client();
  (api as unknown as { listScenes: ReturnType<typeof vi.fn> }).listScenes.mockRejectedValue(new Error("Sin conexión"));
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scene-details", campaignId, arcId, sceneId }} onNavigate={vi.fn()} onSelectScene={vi.fn()}/>);
  const current = host.querySelector('nav[aria-label="Ruta de campañas"] [aria-current="page"]');
  expect(current?.tagName).toBe("SPAN"); expect(current?.textContent).toBe("Detalle de escena");
});

it("una campaña inactiva conserva consulta de escena y no emite apertura", async () => {
  const api = client("inactive"), select = vi.fn(), navigate = vi.fn();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scenes", campaignId, arcId }} onNavigate={navigate} onSelectScene={select}/>);
  expect(host.textContent).toContain("Solo consulta");
  await click("Ver detalles de El puente");
  expect(navigate).toHaveBeenCalledWith({ level: "scene-details", campaignId, arcId, sceneId });
  expect(select).not.toHaveBeenCalled();
});

it("reactivar confirma la transición y conserva el valor remoto confirmado", async () => {
  const api = client("inactive");
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "arcs", campaignId }} onNavigate={vi.fn()} onSelectScene={vi.fn()}/>);
  const settings = host.querySelector<HTMLButtonElement>('[aria-label="Ajustes de Brumas"]'); expect(settings).toBeTruthy();
  await act(async () => settings!.click());
  const toggle = host.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Campaña activa"]'); expect(toggle).toBeTruthy();
  expect(toggle?.getAttribute("aria-checked")).toBe("false");
  await act(async () => toggle!.click());
  expect(host.querySelector("dialog")?.textContent).toContain("volverá a permitir");
  await click("Reactivar");
  expect((api as unknown as { setCampaignState: ReturnType<typeof vi.fn> }).setCampaignState).toHaveBeenCalledWith(campaignId, 1, "active");
});

it("una escena del arco activo abre el editor sin estados heredados de compartirla", async () => {
  const api = client(), select = vi.fn(), navigate = vi.fn();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scenes", campaignId, arcId }} onNavigate={navigate} onSelectScene={select}/>);
  expect(host.textContent).not.toContain("también pertenece a una campaña inactiva");
  expect(host.textContent).not.toContain("Ver campaña inactiva");
  await click("Abrir editor de El puente");
  expect(select).toHaveBeenCalledWith({ campaignId, arcId, sceneId });
});

it("el detalle inactivo carga una vez el listado textual de mapas sin abrir el editor", async () => {
  const api = client("inactive"), select = vi.fn();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scene-details", campaignId, arcId, sceneId }} onNavigate={vi.fn()} onSelectScene={select}/>);
  expect(host.textContent).toContain("Mapa 1");
  expect(host.textContent).not.toContain("mapa-1");
  expect((api as unknown as { getSceneMaps: ReturnType<typeof vi.fn> }).getSceneMaps).toHaveBeenCalledWith(sceneId);
  expect(select).not.toHaveBeenCalled();
});

it("cancelar la selección de portada conserva la portada que ya tenía la campaña", async () => {
  const api = client();
  const existing = { ...campaign(), coverAssetId: "44444444-4444-4444-8444-444444444444" };
  (api as unknown as { listCampaigns: ReturnType<typeof vi.fn>; getCampaign: ReturnType<typeof vi.fn>; uploadCover: ReturnType<typeof vi.fn> }).listCampaigns.mockResolvedValue(page([existing]));
  (api as unknown as { getCampaign: ReturnType<typeof vi.fn> }).getCampaign.mockResolvedValue(existing);
  (api as unknown as { uploadCover: ReturnType<typeof vi.fn> }).uploadCover.mockResolvedValue(null);
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "arcs", campaignId }} onNavigate={vi.fn()} onSelectScene={vi.fn()}/>);
  const settings = host.querySelector<HTMLButtonElement>('[aria-label="Ajustes de Brumas"]'); expect(settings).toBeTruthy();
  await act(async () => settings!.click());
  const before = host.querySelector<HTMLImageElement>("dialog .campaign-cover"); expect(before?.src).toContain(existing.coverAssetId);
  await click("Elegir imagen");
  const after = host.querySelector<HTMLImageElement>("dialog .campaign-cover"); expect(after?.src).toContain(existing.coverAssetId);
});

it("reintenta una portada fallida remitiendo la misma URL autorizada", async () => {
  const api = client();
  const existing = { ...campaign(), coverAssetId: "44444444-4444-4444-8444-444444444444" };
  (api as unknown as { listCampaigns: ReturnType<typeof vi.fn> }).listCampaigns.mockResolvedValue(page([existing]));
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "campaigns" }} onNavigate={vi.fn()} onSelectScene={vi.fn()}/>);
  const first = host.querySelector<HTMLImageElement>(".campaign-cover"); expect(first).toBeTruthy();
  const src = first!.getAttribute("src"); expect(src).toContain(existing.coverAssetId);
  await act(async () => first!.dispatchEvent(new Event("error")));
  expect(host.querySelector('[aria-label="Portada de Brumas no disponible"]')).toBeTruthy();
  await click("Reintentar portada");
  const retry = host.querySelector<HTMLImageElement>(".campaign-cover");
  expect(retry).not.toBe(first); expect(retry?.getAttribute("src")).toBe(src); expect(retry?.src).not.toContain("retry=");
});

it("crear una escena del arco enfoca su tarjeta tras el ACK sin selector global", async () => {
  const api = client();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scenes", campaignId, arcId }} onNavigate={vi.fn()} onSelectScene={vi.fn()}/>);
  expect(host.textContent).not.toContain("Asociar escena");
  expect(host.querySelector("select")).toBeNull();
  await click("Crear escena");
  expect(document.activeElement).toBe(host.querySelector("dialog input"));
  const create = [...host.querySelectorAll<HTMLButtonElement>("dialog button")].find(button => button.textContent === "Crear escena");
  expect(create).toBeTruthy();
  await act(async () => create!.click());
  await act(async () => { for (let index = 0; index < 4; index++) await Promise.resolve(); });
  expect(host.querySelector("dialog")).toBeNull();
  expect(document.activeElement?.textContent).toContain("Nueva escena");
  expect((api as unknown as { createScene: ReturnType<typeof vi.fn> }).createScene).toHaveBeenCalledOnce();
});

it("al volver a un arco espera las tarjetas cargadas y restaura el foco en la escena", async () => {
  const api = client();
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "scenes", campaignId, arcId }} returnSceneId={sceneId} onNavigate={vi.fn()} onSelectScene={vi.fn()}/>);
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  expect(document.activeElement?.textContent).toContain("El puente");
});

it("proyecta una única hoja contextual al host del sidebar y navega sin recargar el panel", async () => {
  const api = client(), navigate = vi.fn(), navigation = document.createElement("div"); host.append(navigation);
  await render(<CampaignPanel client={api} systems={[]} route={{ level: "npcs", campaignId, arcId }} onNavigate={navigate} onSelectScene={vi.fn()} navigationSlot={navigation} onNavigation={vi.fn()}/>);
  const current = navigation.querySelectorAll('[aria-current="page"]');
  expect(current).toHaveLength(1); expect(current[0]?.textContent).toBe("NPCs");
  const scenes = [...navigation.querySelectorAll("button")].find(button => button.textContent === "Escenas"); expect(scenes).toBeTruthy();
  await act(async () => scenes!.click());
  expect(navigate).toHaveBeenCalledWith({ level: "scenes", campaignId, arcId });
  expect((api as unknown as { listCampaigns: ReturnType<typeof vi.fn> }).listCampaigns).toHaveBeenCalledTimes(1);
});
