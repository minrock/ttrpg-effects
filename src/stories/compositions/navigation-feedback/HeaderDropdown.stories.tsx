import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { HeaderDropdown } from "../../../web/HeaderDropdown";

function DropdownExample() {
  const [action, setAction] = useState("Sin acción todavía");
  return <><HeaderDropdown title="Menú de campaña" label="Campaña de ejemplo"><button type="button" onClick={() => setAction("Configuración abierta")}>Configuración</button><button type="button" onClick={() => setAction("Sesión cerrada")}>Cerrar sesión</button></HeaderDropdown><p role="status">{action}</p></>;
}

const meta = {
  title: "Composiciones/HeaderDropdown",
  component: HeaderDropdown,
  tags: ["autodocs"],
  args: { title: "Menú", label: "Menú", children: <button type="button">Acción</button> },
  parameters: { uiContext: "service", controls: { disable: true }, docs: { description: { component: "Menú contextual del servicio. Fuente: `web/HeaderDropdown.tsx`; consumidores: cabeceras de cuenta y partida. Escape lo cierra y devuelve el foco al disparador." } } }
} satisfies Meta<typeof HeaderDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivo: Story = { render: () => <DropdownExample /> };
