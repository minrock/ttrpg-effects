import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { adjustSceneCounter } from "../../../domain/counters/scene-counters";
import { SceneCountersOverlay } from "../../../renderer/src/components/counters/SceneCountersOverlay";
import { storyCounters } from "./fixtures";

function CounterStage({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: 320, overflow: "hidden", background: "linear-gradient(135deg, #23383b, #121719)" }}>
      {children}
    </div>
  );
}

function CountersExample() {
  const [counters, setCounters] = useState(storyCounters);
  return <CounterStage><SceneCountersOverlay counters={counters} viewRole="dm" onAdjust={(id, delta) => setCounters(current => adjustSceneCounter(current, id, delta))} onSetPlayerVisibility={(id, visible, labels) => setCounters(current => current.map(counter => counter.id === id ? { ...counter, isVisibleToPlayers: visible, isLabelVisibleToPlayers: labels } : counter))} /><button type="button" style={{ position: "absolute", right: 16, bottom: 16 }} onClick={() => setCounters(storyCounters)}>Reiniciar</button></CounterStage>;
}

const meta = {
  title: "Composiciones/SceneCounterBar",
  component: SceneCountersOverlay,
  tags: ["autodocs"],
  args: { counters: storyCounters, viewRole: "dm" },
  parameters: { uiContext: "workspace", controls: { disable: true }, docs: { description: { component: "Barras de contadores de escena. Fuente: `components/counters/SceneCountersOverlay.tsx`; consumidor: editor DM y Player View. Ajusta y publica únicamente datos sintéticos." } } }
} satisfies Meta<typeof SceneCountersOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;
export const GestionDM: Story = { render: () => <CountersExample /> };
export const VistaJugador: Story = { render: () => <CounterStage><SceneCountersOverlay counters={storyCounters.filter(counter => counter.isVisibleToPlayers)} viewRole="player" /></CounterStage> };
export const SinContadores: Story = { render: () => <CounterStage><SceneCountersOverlay counters={[]} viewRole="dm" /></CounterStage> };
