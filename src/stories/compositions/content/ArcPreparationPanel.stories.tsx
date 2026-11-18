import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import type { CampaignClient } from "../../../infrastructure/browser/campaign-client";
import { ArcPreparationPanel } from "../../../web/campaigns/ArcPreparationPanel";
import { storyArcId, storyCampaign } from "../../fixtures/composition-fixtures";
import { preparationStoryClient, preparationTemplates, storyPreparedMonster, storyPreparedNpc, storyRetainedMonster } from "../../fixtures/preparation-fixtures";

type Scenario = "npcs" | "monsters" | "monster-long" | "retained" | "empty" | "readonly" | "missing-templates" | "failure";
function Example({ scenario }: { readonly scenario: Scenario }) {
  const kind = scenario === "monsters" || scenario === "monster-long" || scenario === "retained" || scenario === "missing-templates" ? "monster" : "npc";
  const client = useMemo(() => scenario === "failure" ? { listPreparation: async () => { throw new Error("Error sintético al cargar la preparación."); } } as unknown as CampaignClient : preparationStoryClient(scenario === "npcs" || scenario === "readonly" ? [storyPreparedNpc] : scenario === "retained" ? [storyRetainedMonster] : scenario === "monsters" || scenario === "monster-long" || scenario === "missing-templates" ? [storyPreparedMonster] : []), [scenario]);
  const campaign = storyCampaign(scenario === "readonly" ? "inactive" : "active");
  const templates = scenario === "missing-templates" ? [] : scenario === "monster-long" ? [...preparationTemplates, ...Array.from({ length: 16 }, (_, index) => ({ id: `larga-${index + 1}`, name: `Plantilla del catálogo ${index + 1}` }))] : preparationTemplates;
  return <main className="service-page admin-service-page"><ArcPreparationPanel client={client} campaign={campaign} arcId={storyArcId} kind={kind} templates={templates} onBack={() => undefined}/></main>;
}
const meta = { title: "Composiciones/ArcPreparationPanel", component: ArcPreparationPanel, tags: ["autodocs"], parameters: { uiContext: "administration", layout: "fullscreen", controls: { disable: true }, docs: { description: { component: "Preparación permanente por arco. Cada historia usa un cliente CRUD en memoria o un fallo sintético: no realiza red, no abre selector de archivos y no monta Pixi ni editor." } } } } satisfies Meta<typeof ArcPreparationPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
const args = { client: preparationStoryClient([storyPreparedNpc]), campaign: storyCampaign(), arcId: storyArcId, kind: "npc" as const, templates: preparationTemplates, onBack: () => undefined };
export const NPCs: Story = { name: "NPCs", args, render: () => <Example scenario="npcs"/> };
export const Monstruos: Story = { args, render: () => <Example scenario="monsters"/> };
export const SelectorDeListaLarga: Story = { args, render: () => <Example scenario="monster-long"/>, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByRole("button", { name: "Agregar monstruo" })); await userEvent.click(canvas.getByRole("combobox", { name: "Plantilla" })); } };
export const PlantillaRetenida: Story = { args, render: () => <Example scenario="retained"/>, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByLabelText("Acciones de Centinela retenido")); await userEvent.click(canvas.getByRole("button", { name: "Editar" })); } };
export const Vacio: Story = { args, render: () => <Example scenario="empty"/> };
export const SoloLectura: Story = { args, render: () => <Example scenario="readonly"/> };
export const SinPlantillas: Story = { args, render: () => <Example scenario="missing-templates"/> };
export const ErrorDeCarga: Story = { args, render: () => <Example scenario="failure"/> };
