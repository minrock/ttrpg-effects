import type { Meta, StoryObj } from "@storybook/react-vite";
import { waitFor, fn, expect, userEvent, within } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { SharedSwitch } from "../../renderer/src/components/SharedSwitch";

const meta = { title: "Controles/SharedSwitch", component: SharedSwitch, tags: ["autodocs"], args: { checked: true, ariaLabel: "Campaña activa", onCheckedChange: fn() }, argTypes: { onCheckedChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/SharedSwitch.tsx`; patrón UI-001. Consumidor: ajustes de campaña. Solo representa encendido/apagado." } } } } satisfies Meta<typeof SharedSwitch>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledSwitch(args: React.ComponentProps<typeof SharedSwitch>) { const [, updateArgs] = useArgs(); return <div className="switch-control"><span>Campaña activa</span><SharedSwitch {...args} onCheckedChange={(checked) => { updateArgs({ checked }); args.onCheckedChange(checked); }} /></div>; }
export const Default: Story = { render: ControlledSwitch, play: async ({ canvasElement }) => { const button = within(canvasElement).getByRole("switch", { name: "Campaña activa" }); await userEvent.tab(); await expect(button).toHaveFocus(); await userEvent.keyboard(" "); await waitFor(() => expect(within(canvasElement).getByRole("switch", { name: "Campaña activa" })).toHaveAttribute("data-state", "unchecked")); } };
export const Disabled: Story = { args: { disabled: true } };
