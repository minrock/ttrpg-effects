import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { HeaderDropdown } from "../../../web/HeaderDropdown";
import { CampaignSceneMenu } from "../../../web/CampaignSceneMenu";
import { HttpTransport } from "../../../infrastructure/browser/http";

const campaignId = "11111111-1111-4111-8111-111111111111";
const arcId = "22222222-2222-4222-8222-222222222222";
const sceneId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-11-15T00:00:00.000Z";

function SceneMenuExample({ mode = "ready" }: { mode?: "ready" | "error" | "loading" | "empty" | "long" }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({ campaignId, arcId, sceneId });
  const http = useMemo(() => new HttpTransport(async input => {
    const path = String(input);
    if (mode === "loading") return new Promise<Response>(() => undefined);
    if (mode === "error") return new Response(JSON.stringify({ ok: false, error: { code: "UNAVAILABLE", message: "Servicio sintético no disponible" } }), { status: 503, headers: { "content-type": "application/json" } });
    if (mode === "empty") return new Response(JSON.stringify({ ok: true, items: [], total: 0, limit: 100, offset: 0 }), { headers: { "content-type": "application/json" } });
    if (path.includes("/arcs?") || path.endsWith("/arcs")) return new Response(JSON.stringify({ ok: true, items: [{ id: arcId, campaignId, name: "Arco del faro", description: "", coverAssetId: null, revision: 1, createdAt: timestamp, updatedAt: timestamp, sceneCount: 2 }], total: 1, limit: 100, offset: 0 }), { headers: { "content-type": "application/json" } });
    const scenes = [
      { sceneId, arcId, campaignId, name: "El faro derruido", revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 1, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null },
      { sceneId: "44444444-4444-4444-8444-444444444444", arcId, campaignId, name: "Una escena con un nombre muy largo que conserva lectura dentro del menú", revision: 1, coverRevision: 0, customCoverAssetId: null, mapCount: 0, map0ImagePath: null, map0AssetId: null, cover: { source: "placeholder" }, writeBlock: null }
    ];
    if (mode === "long") for (let index = 0; index < 18; index++) scenes.push({ ...scenes[0], sceneId: `55555555-5555-4555-8555-${String(index).padStart(12, "0")}`, name: `Escena extensa ${index + 1}` });
    return new Response(JSON.stringify({ ok: true, items: scenes, total: scenes.length, limit: 100, offset: 0 }), { headers: { "content-type": "application/json" } });
  }), [mode]);
  return <header className="account-bar" style={{ minHeight: 44 }}><div className="header-context"><div className="game-heading"><HeaderDropdown title="Opciones de partida" label={<span className="game-heading-title">Campaña de ejemplo · Sistema v1</span>} className="header-game" onOpenChange={setOpen}>
    <p className="header-dropdown-heading">Partida</p>
    <button type="button">Campañas</button>
    <CampaignSceneMenu http={http} campaignId={campaignId} currentSelection={selected} open={open} onSelect={async next => { setSelected(next); return true; }} />
    <div className="header-dropdown-divider" />
    <button type="button">Reabrir partida</button><button type="button" className="header-danger">Cerrar partida</button>
  </HeaderDropdown></div></div></header>;
}

const meta = {
  title: "Composiciones/CampaignSceneMenu",
  component: CampaignSceneMenu,
  tags: ["autodocs"],
  args: { http: new HttpTransport(fetch), campaignId, currentSelection: { campaignId, arcId, sceneId }, open: false, onSelect: async () => false },
  parameters: { uiContext: "administration", layout: "fullscreen", controls: { disable: true }, docs: { description: { component: "Selector de escenas del menú de campaña. Fuente: `web/CampaignSceneMenu.tsx`; usa el marco de cabecera sin padding de página, metadatos sintéticos paginados y conserva las acciones de campaña fuera del listado desplazable." } } }
} satisfies Meta<typeof CampaignSceneMenu>;

export default meta;
type Story = StoryObj<typeof meta>;
export const ActualYTextoLargo: Story = { render: () => <SceneMenuExample /> };
export const Cargando: Story = { render: () => <SceneMenuExample mode="loading" /> };
export const Vacio: Story = { render: () => <SceneMenuExample mode="empty" /> };
export const ListaLarga: Story = { render: () => <SceneMenuExample mode="long" /> };
export const ErrorRecuperable: Story = { render: () => <SceneMenuExample mode="error" /> };
