import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { defaultDiceDraft, type DiceDraft } from "../../../domain/dice/dice";
import { ServiceDicePanel, type ServiceDiceHistoryEntry, type ServiceDicePanelProps } from "../../../renderer/src/components/dice/ServiceDicePanel";
import { storyDiceResult } from "./fixtures";

const ana = { id: "player-ana", label: "Ana · 4821", kind: "player" } as const;
const dm = { id: "dm", label: "DM", kind: "dm" } as const;
const history: readonly ServiceDiceHistoryEntry[] = [
  { id: "roll-ana", author: ana, visibility: "public", createdAt: Date.UTC(2026, 10, 15, 12, 4), status: "complete", result: storyDiceResult, isPresented: true },
  { id: "roll-dm", author: dm, visibility: "hidden", createdAt: Date.UTC(2026, 10, 15, 12, 1), status: "complete", result: storyDiceResult }
];

function Example(props: ServiceDicePanelProps) {
  const [draft, setDraft] = useState<DiceDraft>(props.draft);
  const [entries, setEntries] = useState(props.history);
  const [presentation, setPresentation] = useState(props.presentation ?? null);
  const [occupancy, setOccupancy] = useState(props.occupancy);
  return <ServiceDicePanel {...props} draft={draft} history={entries} presentation={presentation} occupancy={occupancy} onDraftChange={setDraft} onRoll={() => undefined} onDismiss={id => { setEntries(current => current.map(entry => entry.id === id ? { ...entry, isPresented: false } : entry)); setPresentation(current => current?.rollId === id ? null : current); setOccupancy(current => current?.rollId === id ? null : current); }} />;
}

const base = defaultDiceDraft();
const meta = {
  title: "Composiciones/DicePanel",
  component: ServiceDicePanel,
  tags: ["autodocs"],
  parameters: { uiContext: "editor", docs: { description: { component: "Compositor controlado de dados de servicio con fixtures de rol. No monta App, PlayerApp, clientes, PixiJS, Three, IPC ni red." } } }
} satisfies Meta<typeof ServiceDicePanel>;
export default meta;
type Story = StoryObj<typeof meta>;
const playerArgs: ServiceDicePanelProps = { role: "player", capabilities: { chooseVisibility: false, showMapResult: false, clearHistory: false, closeAny: false }, draft: { ...base, visibility: "open" }, history: history.filter(entry => entry.visibility === "public"), occupancy: null, selfAuthorId: ana.id, ready: true, onDraftChange: () => undefined, onRoll: () => undefined, onDismiss: () => undefined };
const dmArgs: ServiceDicePanelProps = { role: "dm", capabilities: { chooseVisibility: true, showMapResult: true, clearHistory: true, closeAny: true }, draft: { ...base, visibility: "open", groups: [{ id: "fire", damageType: "fire", dice: { d6: 2 }, modifier: 3 }] }, history, occupancy: { rollId: "roll-ana", author: ana, phase: "settled" }, presentation: { rollId: "roll-ana", author: ana, visibility: "public", result: storyDiceResult }, selfAuthorId: "dm", ready: true, onDraftChange: () => undefined, onRoll: () => undefined, onDismiss: () => undefined, onClearHistory: () => undefined, onMapResultVisibleChange: () => undefined };

export const Jugador: Story = { args: playerArgs, render: () => <Example {...playerArgs} /> };
export const JugadorEnEspera: Story = { args: { ...playerArgs, occupancy: { rollId: "roll-bruno", author: { id: "player-bruno", label: "Bruno · 1258", kind: "player" }, phase: "rolling" } }, render: () => <Example {...playerArgs} occupancy={{ rollId: "roll-bruno", author: { id: "player-bruno", label: "Bruno · 1258", kind: "player" }, phase: "rolling" }} /> };
export const DmConHistorial: Story = { args: dmArgs, render: () => <Example {...dmArgs} /> };
export const JugadorAutorPuedeCerrar: Story = { args: { ...playerArgs, presentation: { rollId: "roll-ana", author: ana, visibility: "public", result: storyDiceResult }, occupancy: { rollId: "roll-ana", author: ana, phase: "settled" } }, render: args => <Example {...args} /> };
export const JugadorAjenoNoPuedeCerrar: Story = { args: { ...playerArgs, presentation: { rollId: "roll-bruno", author: { id: "player-bruno", label: "Bruno · 1258", kind: "player" }, visibility: "public", result: storyDiceResult }, occupancy: { rollId: "roll-bruno", author: { id: "player-bruno", label: "Bruno · 1258", kind: "player" }, phase: "settled" } }, render: args => <Example {...args} /> };
export const DmVeOcultaConPublica: Story = { args: { ...dmArgs, draft: { ...dmArgs.draft, visibility: "hidden" }, presentation: { rollId: "roll-dm", author: dm, visibility: "hidden", result: storyDiceResult } }, render: args => <Example {...args} /> };
export const CierrePendienteConError: Story = { args: { ...dmArgs, pendingDismissId: "roll-ana", dismissError: "No se pudo cerrar la tirada. Vuelve a intentarlo." }, render: args => <Example {...args} /> };
export const PrepararSinPublicacion: Story = { args: { ...playerArgs, ready: false }, render: args => <Example {...args} /> };
export const ErrorDeServicio: Story = { args: { ...playerArgs, history: [], error: "No se pudo reservar la mesa. Comprueba la conexión y vuelve a intentarlo." }, render: () => <Example {...playerArgs} history={[]} error="No se pudo reservar la mesa. Comprueba la conexión y vuelve a intentarlo." /> };
export const VersionIncompatible: Story = { args: { ...playerArgs, history: [], error: "Esta mesa usa una versión de dados compartidos incompatible." }, render: args => <Example {...args} /> };
