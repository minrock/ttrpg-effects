import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RightSidebarTabs } from "../../../renderer/src/components/dice/RightSidebarTabs";

function TabsExample({ initialValue, showTable }: { readonly initialValue: "properties" | "dice" | "table"; readonly showTable: boolean }) {
  const normalizedInitial = !showTable && initialValue === "table" ? "properties" : initialValue;
  const [value, setValue] = useState(normalizedInitial);
  return <><RightSidebarTabs value={value} onChange={setValue} showTable={showTable} /><section id="right-panel-properties" role="tabpanel" aria-labelledby="right-tab-properties" hidden={value !== "properties"}>Propiedades de la escena sintética.</section><section id="right-panel-dice" role="tabpanel" aria-labelledby="right-tab-dice" hidden={value !== "dice"}>Dados sintéticos disponibles.</section>{showTable && <section id="right-panel-table" role="tabpanel" aria-labelledby="right-tab-table" hidden={value !== "table"}>Mesa sintética disponible.</section>}<button type="button" onClick={() => setValue(normalizedInitial)}>Reiniciar</button><p role="status">Panel activo: {value}</p></>;
}

const meta = {
  title: "Composiciones/RightSidebarTabs",
  component: RightSidebarTabs,
  tags: ["autodocs"],
  args: { value: "properties", onChange: () => undefined, showTable: true },
  parameters: { uiContext: "editor", docs: { description: { component: "Composición de navegación del panel derecho. Fuente: `components/dice/RightSidebarTabs.tsx`; consumidor: editor DM. Flechas, Inicio y Fin cambian la pestaña y conservan el foco." } } }
} satisfies Meta<typeof RightSidebarTabs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Interactiva: Story = { render: args => <TabsExample key={`${args.value}:${args.showTable}`} initialValue={args.value} showTable={args.showTable ?? false} /> };
