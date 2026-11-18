import type { Meta, StoryObj } from "@storybook/react-vite";
import { waitFor, fn, expect, userEvent, within } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { Radio } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/Radio", component: Radio, tags: ["autodocs"], args: { name: "map-size", checked: true, "aria-label": "Conservar tamaño actual", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidor: `ReplaceMapImageModal`. Representa una elección exclusiva." } } } } satisfies Meta<typeof Radio>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledRadio(args: React.ComponentProps<typeof Radio>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><fieldset><legend>Tamaño del mapa</legend><label><Radio {...args} checked={args.checked} onChange={(event) => { updateArgs({ checked: true }); args.onChange?.(event); }} />Conservar tamaño actual</label><label><Radio name={args.name} checked={!args.checked} onChange={(event) => { updateArgs({ checked: false }); args.onChange?.(event); }} />Mantener escala actual</label></fieldset></div>; }
export const Default: Story = { render: ControlledRadio, play: async ({ canvasElement }) => { const next = within(canvasElement).getByRole("radio", { name: "Mantener escala actual" }); await userEvent.click(next); await waitFor(() => expect(within(canvasElement).getByRole("radio", { name: "Mantener escala actual" })).toBeChecked()); } };
export const Disabled: Story = { args: { disabled: true } };
