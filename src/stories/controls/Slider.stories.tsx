import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { fn, expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { Slider } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/Slider", component: Slider, tags: ["autodocs"], args: { min: 0, max: 1, step: 0.05, value: 0.5, "aria-label": "Opacidad", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidores: `FireProperties` y `LightningProperties`. Mantiene `valueAsNumber`." } } } } satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledSlider(args: React.ComponentProps<typeof Slider>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><label>Opacidad <Slider {...args} onChange={(event) => { updateArgs({ value: event.currentTarget.valueAsNumber }); args.onChange?.(event); }} /></label></div>; }
export const Default: Story = { render: ControlledSlider, play: async ({ canvasElement }) => { const slider = within(canvasElement).getByRole("slider", { name: "Opacidad" }); await userEvent.tab(); await expect(slider).toHaveFocus(); fireEvent.change(slider, { target: { value: "0.55" } }); await waitFor(() => expect(within(canvasElement).getByRole("slider", { name: "Opacidad" })).toHaveValue("0.55")); } };
export const Disabled: Story = { args: { disabled: true } };
