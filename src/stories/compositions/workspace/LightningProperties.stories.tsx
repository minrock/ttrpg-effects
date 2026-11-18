import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { updateLightningEffect, type LightningPatch } from "../../../domain/effects/lightning";
import { LightningProperties, LightningTools } from "../../../renderer/src/components/LightningProperties";
import { storyGrid, storyLightning, storySettings } from "./fixtures";

function LightningExample() {
  const [effect, setEffect] = useState(storyLightning);
  const [active, setActive] = useState<"line" | "cone" | "circle" | null>(null);
  const [tool, setTool] = useState("Sin herramienta activa");
  return <><LightningTools active={active} onSelect={value => { setActive(value); setTool(`Relámpago: ${value}`); }} /><LightningProperties effect={effect} grid={storyGrid} settings={storySettings} onChange={(patch: LightningPatch) => setEffect(current => updateLightningEffect(current, patch, 0))} /><button type="button" onClick={() => { setEffect(storyLightning); setActive(null); setTool("Reiniciado"); }}>Reiniciar</button><p role="status">{tool}</p></>;
}

const meta = {
  title: "Composiciones/LightningProperties",
  component: LightningProperties,
  tags: ["autodocs"],
  args: { effect: storyLightning, grid: storyGrid, settings: storySettings, onChange: () => undefined },
  parameters: { uiContext: "editor", controls: { disable: true }, docs: { description: { component: "Herramientas y propiedades de relámpago. Fuente: `components/LightningProperties.tsx`; consumidor: inspector del editor. Los cambios aplican parches de dominio a un fixture en memoria." } } }
} satisfies Meta<typeof LightningProperties>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Editables: Story = { render: () => <LightningExample /> };
