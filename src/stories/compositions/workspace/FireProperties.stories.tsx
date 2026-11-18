import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { updateAnimatedFireEffect, type FirePatch } from "../../../domain/effects/fire";
import { FireProperties, FireTools } from "../../../renderer/src/components/FireProperties";
import { storyFire, storyGrid, storySettings } from "./fixtures";

function FireExample() {
  const [effect, setEffect] = useState(storyFire);
  const [active, setActive] = useState<"line" | "cone" | "circle" | "paint" | null>(null);
  const [tool, setTool] = useState("Sin herramienta activa");
  return <><FireTools active={active} onSelect={value => { setActive(value); setTool(`Fuego: ${value}`); }} /><FireProperties effect={effect} grid={storyGrid} settings={storySettings} onChange={(patch: FirePatch) => setEffect(current => updateAnimatedFireEffect(current, patch))} /><button type="button" onClick={() => { setEffect(storyFire); setActive(null); setTool("Reiniciado"); }}>Reiniciar</button><p role="status">{tool}</p></>;
}

const meta = {
  title: "Composiciones/FireProperties",
  component: FireProperties,
  tags: ["autodocs"],
  args: { effect: storyFire, grid: storyGrid, settings: storySettings, onChange: () => undefined },
  parameters: { uiContext: "editor", controls: { disable: true }, docs: { description: { component: "Herramientas y propiedades de fuego. Fuente: `components/FireProperties.tsx`; consumidor: inspector del editor. Los cambios aplican parches de dominio a un fixture en memoria." } } }
} satisfies Meta<typeof FireProperties>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Editables: Story = { render: () => <FireExample /> };
