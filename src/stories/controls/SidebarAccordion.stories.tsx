import { CircleDot } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { waitFor, fn, expect, userEvent, within } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { SidebarAccordion } from "../../renderer/src/components/SidebarAccordion";

const meta = { title: "Composiciones/SidebarAccordion", component: SidebarAccordion, tags: ["autodocs"], args: { id: "story-accordion", icon: <CircleDot aria-hidden="true" />, title: "Controles con una etiqueta deliberadamente larga", isOpen: true, onToggle: fn(), children: "Contenido del panel." }, argTypes: { onToggle: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/SidebarAccordion.tsx`. Consumidor: `App`. Conserva `id/icon/title/isOpen/onToggle/children`." } } } } satisfies Meta<typeof SidebarAccordion>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledAccordion(args: React.ComponentProps<typeof SidebarAccordion>) { const [, updateArgs] = useArgs(); return <SidebarAccordion {...args} onToggle={() => { updateArgs({ isOpen: !args.isOpen }); args.onToggle(); }} />; }
export const Default: Story = { render: ControlledAccordion, play: async ({ canvasElement }) => { const button = within(canvasElement).getByRole("button", { name: /controles/i }); await userEvent.tab(); await expect(button).toHaveFocus(); await userEvent.keyboard("{Enter}"); await waitFor(() => expect(within(canvasElement).getByRole("button", { name: /controles/i })).toHaveAttribute("aria-expanded", "false")); } };
