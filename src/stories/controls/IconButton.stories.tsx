import { Plus } from "lucide-react";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/IconButton", component: IconButton, tags: ["autodocs"], args: { type: "button", "aria-label": "Añadir elemento", title: "Añadir elemento", children: <Plus aria-hidden="true" />, onClick: fn() }, argTypes: { onClick: { action: "activado" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidores: `FireTools` y `LightningTools`. El nombre accesible es obligatorio." } } } } satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { render: (args) => <div className="sidebar-accordion-content"><IconButton {...args}/></div> };
export const Disabled: Story = { args: { disabled: true } };
