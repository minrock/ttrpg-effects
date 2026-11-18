import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, expect, userEvent, within } from "storybook/test";
import { Button } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/Button", component: Button, tags: ["autodocs"], args: { type: "button", children: "Guardar", onClick: fn() }, argTypes: { onClick: { action: "activado" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidor: `MonsterTemplateFields`. Conserva el botón nativo y sus atributos." } } } } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { render: (args) => <div className="sidebar-accordion-content"><Button {...args}/></div>, play: async ({ canvasElement, args }) => { const button = within(canvasElement).getByRole("button", { name: "Guardar" }); await userEvent.tab(); await expect(button).toHaveFocus(); await userEvent.keyboard("{Enter}"); await expect(args.onClick).toHaveBeenCalledTimes(1); } };
export const Disabled: Story = { args: { disabled: true, children: "Guardando…" } };
