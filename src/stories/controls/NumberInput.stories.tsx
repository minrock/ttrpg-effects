import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { NumberInput } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/NumberInput", component: NumberInput, tags: ["autodocs"], args: { min: 0, max: 100, step: 0.25, value: 12.5, "aria-label": "Radio", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidores: `FireProperties` y `LightningProperties`. Mantiene `valueAsNumber`." } } } } satisfies Meta<typeof NumberInput>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledNumber(args: React.ComponentProps<typeof NumberInput>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><label>Radio <NumberInput {...args} onChange={(event) => { updateArgs({ value: event.currentTarget.value }); args.onChange?.(event); }} /></label></div>; }
export const Default: Story = { render: ControlledNumber };
export const Disabled: Story = { args: { disabled: true } };
