import type { Meta, StoryObj } from "@storybook/react-vite";
import { waitFor, fn, expect, userEvent, within } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { Checkbox } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/Checkbox", component: Checkbox, tags: ["autodocs"], args: { checked: true, "aria-label": "Visible", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidores: propiedades de fuego, relámpago y modal de mapa. No representa un switch." } } } } satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledCheckbox(args: React.ComponentProps<typeof Checkbox>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><label><Checkbox {...args} onChange={(event) => { updateArgs({ checked: event.currentTarget.checked }); args.onChange?.(event); }} />Visible</label></div>; }
export const Default: Story = { render: ControlledCheckbox, play: async ({ canvasElement }) => { const checkbox = within(canvasElement).getByRole("checkbox", { name: "Visible" }); await userEvent.tab(); await expect(checkbox).toHaveFocus(); await userEvent.keyboard(" "); await waitFor(() => expect(within(canvasElement).getByRole("checkbox", { name: "Visible" })).not.toBeChecked()); } };
export const Disabled: Story = { args: { disabled: true } };
