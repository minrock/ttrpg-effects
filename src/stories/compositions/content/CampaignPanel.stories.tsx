import { Menu } from "lucide-react";
import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CampaignClient } from "../../../infrastructure/browser/campaign-client";
import { HttpTransport } from "../../../infrastructure/browser/http";
import { CampaignPanel } from "../../../web/campaigns/CampaignPanel";
import { AdminShell } from "../../../web/AdminShell";
import type { ArcDto, CampaignDto, PreparedEntityDto } from "../../../shared/contracts/campaigns";
import { storyArc, storyArcId, storyCampaign, storyCampaignId, storyScene, storyTimestamp } from "../../fixtures/composition-fixtures";

type Scenario = "normal" | "empty" | "failure" | "readonly" | "exclusive";
type Route = React.ComponentProps<typeof CampaignPanel>["route"];
const secondCampaignId = "44444444-4444-4444-8444-444444444444";
const secondArcId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondSceneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function reply(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
function error(message: string, status = 400): Response { return reply({ ok: false, error: { code: "STORY_ROUTE", message } }, status); }
function storyClient(scenario: Scenario): CampaignClient {
  const campaigns: CampaignDto[] = scenario === "empty" ? [] : [storyCampaign(scenario === "readonly" ? "inactive" : "active"), { ...storyCampaign("inactive"), id: secondCampaignId, name: "Archivo de Miraval", revision: 2 }];
  const arcs: ArcDto[] = scenario === "empty" ? [] : [
    { ...storyArc },
    ...(scenario === "exclusive" ? [{ ...storyArc, id: secondArcId, name: "La llegada · otro frente", description: "Un arco paralelo con su propia escena.", sceneCount: 1 }] : [])
  ];
  let campaignSequence = 5, arcSequence = 6, sceneSequence = 7;
  const scenes = scenario === "empty" ? [] : [
    { ...storyScene },
    ...(scenario === "exclusive" ? [{ ...storyScene, sceneId: secondSceneId, arcId: secondArcId }] : [])
  ];
  const prepared: PreparedEntityDto[] = scenario === "empty" ? [] : [{ id: "88888888-8888-4888-8888-888888888888", arcId: storyArcId, kind: "npc", name: "Asha la vigía", imagePath: null, notes: "Conoce el puerto inundado.", revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, provenance: null }, { id: "99999999-9999-4999-8999-999999999999", arcId: storyArcId, kind: "monster", name: "Vigía anfibio", imagePath: null, notes: "Protege el umbral.", templateId: "vigia", binding: { scope: "catalog", systemId: "generic", version: 1, templateId: "vigia" }, revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, provenance: null }];
  const fetcher: typeof fetch = async (input, init) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, "http://storybook.local");
    const path = url.pathname.replace(/^\/api\/v1(?:\/dm)?/, "");
    const method = init?.method ?? "GET";
    if (scenario === "failure") return error("Error sintético del transporte.", 503);
    const payload = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
    if (path === "/campaigns" && method === "GET") {
      const state = url.searchParams.get("state"); const items = campaigns.filter(item => state === null || item.state === state);
      return reply({ ok: true, items, total: items.length, limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0) });
    }
    if (path === "/campaigns" && method === "POST") {
      const campaign: CampaignDto = { ...storyCampaign(), id: `55555555-5555-4555-8555-${String(campaignSequence++).padStart(12, "0")}`, name: String(payload.name ?? "Nueva campaña"), description: String(payload.description ?? ""), coverAssetId: payload.coverAssetId as string | null ?? null, systemRef: payload.systemRef as CampaignDto["systemRef"], revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp }; campaigns.push(campaign); return reply({ ok: true, campaign });
    }
    const campaignMatch = /^\/campaigns\/([^/]+)$/.exec(path);
    if (campaignMatch) { const campaign = campaigns.find(item => item.id === campaignMatch[1]); if (!campaign) return error("Campaña no encontrada.", 404); if (method === "GET") return reply({ ok: true, campaign }); if (method === "PATCH") { Object.assign(campaign, payload, { revision: campaign.revision + 1, updatedAt: storyTimestamp }); return reply({ ok: true, campaign }); } }
    const arcsMatch = /^\/campaigns\/([^/]+)\/arcs$/.exec(path);
    if (arcsMatch && method === "GET") { const items = arcs.filter(item => item.campaignId === arcsMatch[1]); return reply({ ok: true, items, total: items.length, limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0) }); }
    if (arcsMatch && method === "POST") { const arc: ArcDto = { ...storyArc, id: `66666666-6666-4666-8666-${String(arcSequence++).padStart(12, "0")}`, campaignId: arcsMatch[1]!, name: String(payload.name ?? "Nuevo arco"), description: String(payload.description ?? ""), coverAssetId: payload.coverAssetId as string | null ?? null, revision: 1, sceneCount: 0 }; arcs.push(arc); return reply({ ok: true, arc }); }
    const arcMatch = /^\/campaigns\/([^/]+)\/arcs\/([^/]+)$/.exec(path);
    if (arcMatch) { const arc = arcs.find(item => item.id === arcMatch[2] && item.campaignId === arcMatch[1]); if (!arc) return error("Arco no encontrado.", 404); if (method === "GET") return reply({ ok: true, arc }); if (method === "PATCH") { Object.assign(arc, payload, { revision: arc.revision + 1, updatedAt: storyTimestamp }); return reply({ ok: true, arc }); } }
    const scenesMatch = /^\/campaigns\/([^/]+)\/arcs\/([^/]+)\/scenes$/.exec(path);
    if (scenesMatch && method === "GET") { const items = scenes.filter(item => item.campaignId === scenesMatch[1] && item.arcId === scenesMatch[2]); return reply({ ok: true, items, total: items.length, limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0) }); }
    if (scenesMatch && method === "POST") { const scene = { ...storyScene, sceneId: `77777777-7777-4777-8777-${String(sceneSequence++).padStart(12, "0")}`, campaignId: scenesMatch[1]!, arcId: scenesMatch[2]!, name: String(payload.name ?? "Nueva escena"), revision: 1, mapCount: 1 }; scenes.push(scene); const arc = arcs.find(item => item.id === scenesMatch[2] && item.campaignId === scenesMatch[1]); if (arc) Object.assign(arc, { sceneCount: arc.sceneCount + 1, revision: arc.revision + 1, updatedAt: storyTimestamp }); return reply({ ok: true, scene }); }
    const preparation = /^\/campaigns\/([^/]+)\/arcs\/([^/]+)\/preparation$/.exec(path);
    if (preparation && method === "GET") { const kind = url.searchParams.get("kind"); const items = prepared.filter(item => item.arcId === preparation[2] && (!kind || item.kind === kind)); return reply({ ok: true, items, total: items.length, limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0) }); }
    const coverScene = /^\/campaigns\/([^/]+)\/arcs\/([^/]+)\/scenes\/([^/]+)\/cover$/.exec(path);
    if (coverScene && method === "PATCH") { const scene = scenes.find(item => item.sceneId === coverScene[3]); if (!scene) return error("Escena no encontrada.", 404); const customCoverAssetId = payload.customCoverAssetId as string | null; Object.assign(scene, { customCoverAssetId, coverRevision: scene.coverRevision + 1, cover: customCoverAssetId ? { source: "custom", assetId: customCoverAssetId, availability: "ready" } : { source: "placeholder" } }); return reply({ ok: true, scene }); }
    const sceneDetail = /^\/scenes\/([^/]+)$/.exec(path);
    if (sceneDetail && method === "GET") { const scene = scenes.find(item => item.sceneId === sceneDetail[1]); if (!scene) return error("Escena no encontrada.", 404); return reply({ ok: true, resource: { scene: { maps: scene.mapCount > 0 ? [{ id: "mapa-1", name: "Mapa 1" }] : [] } } }); }
    return error(`Ruta sintética no permitida: ${method} ${path}${url.search}`);
  };
  return new CampaignClient(new HttpTransport(fetcher), async () => null);
}
const systems = [{ name: "Genérico", ref: { systemId: "generic", version: 1 }, templates: [{ id: "vigia", name: "Vigía anfibio" }] }];
function InteractiveCampaignPanel({ scenario, initialRoute = { level: "campaigns" } as Route }: { readonly scenario: Scenario; readonly initialRoute?: Route }) {
  const client = useMemo(() => storyClient(scenario), [scenario]); const [route, setRoute] = useState<Route>(initialRoute); const [selection, setSelection] = useState("");
  return <AdminShell role="dm">{({ navigationSlot, navigationOpen, toggleNavigation, navigationTriggerRef, navigationId, onNavigation }) => <><header className="account-bar admin-shell-header"><button ref={navigationTriggerRef} type="button" className="header-navigation admin-navigation-trigger" aria-controls={navigationId} aria-expanded={navigationOpen} aria-label={navigationOpen ? "Ocultar navegación" : "Mostrar navegación"} onClick={toggleNavigation}><Menu size={20} aria-hidden="true"/></button><span className="header-brand">TTRPG <span>Effects</span></span><div className="header-context"><span className="header-section">Campañas</span></div></header><main className="service-page admin-service-page"><CampaignPanel client={client} systems={systems} route={route} onNavigate={setRoute} onSelectScene={(value) => setSelection(value.sceneId)} navigationSlot={navigationSlot} onNavigation={onNavigation}/>{selection ? <p role="status">Escena sintética seleccionada: {selection}</p> : null}</main></>}</AdminShell>;
}
const meta = { title: "Composiciones/CampaignPanel", component: CampaignPanel, tags: ["autodocs"], parameters: { uiContext: "administration", layout: "fullscreen", docs: { description: { component: "Fuente: `web/campaigns/CampaignPanel.tsx`. `CampaignClient` y `HttpTransport` son reales; el fetcher cerrado mantiene arrays sintéticos y rechaza rutas no previstas. La preparación usa una colección sintética local por tipo; no monta editor, API ni selector de archivos." } } } } satisfies Meta<typeof CampaignPanel>;
export default meta; type Story = StoryObj<typeof meta>;
const idle = { client: storyClient("normal"), systems, route: { level: "campaigns" } as Route, onNavigate: () => undefined, onSelectScene: () => undefined };
export const Normal: Story = { parameters: { controls: { disable: true }, docs: { description: { story: "Recarga para reiniciar el cliente y sus arrays sintéticos." } } }, args: idle, render: () => <InteractiveCampaignPanel scenario="normal" /> };
export const Empty: Story = { parameters: { controls: { disable: true } }, args: { ...idle, client: storyClient("empty") }, render: () => <InteractiveCampaignPanel scenario="empty" /> };
export const Failure: Story = { parameters: { controls: { disable: true } }, args: { ...idle, client: storyClient("failure") }, render: () => <InteractiveCampaignPanel scenario="failure" /> };
export const Readonly: Story = { parameters: { controls: { disable: true } }, args: { ...idle, client: storyClient("readonly"), route: { level: "arcs", campaignId: storyCampaignId } }, render: () => <InteractiveCampaignPanel scenario="readonly" initialRoute={{ level: "arcs", campaignId: storyCampaignId }} /> };
export const EscenasPropias: Story = { name: "Escenas propias por arco", parameters: { controls: { disable: true }, docs: { description: { story: "Dos arcos de una campaña contienen escenas homónimas con IDs distintos. Abre cada arco para comprobar que solo muestra su propia escena." } } }, args: { ...idle, client: storyClient("exclusive"), route: { level: "arcs", campaignId: storyCampaignId } }, render: () => <InteractiveCampaignPanel scenario="exclusive" initialRoute={{ level: "arcs", campaignId: storyCampaignId }} /> };

export const NPCs: Story = { name: "NPCs", args: idle, parameters: { controls: { disable: true } }, render: () => <InteractiveCampaignPanel scenario="normal" initialRoute={{ level: "npcs", campaignId: storyCampaignId, arcId: storyArcId }}/> };
export const Monstruos: Story = { args: idle, parameters: { controls: { disable: true } }, render: () => <InteractiveCampaignPanel scenario="normal" initialRoute={{ level: "monsters", campaignId: storyCampaignId, arcId: storyArcId }}/> };
