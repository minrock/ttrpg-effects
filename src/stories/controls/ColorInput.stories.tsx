import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { ColorInput } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/ColorInput", component: ColorInput, tags: ["autodocs"], args: { value: "#ff8a3d", "aria-label": "Color del fuego", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidor: `FireProperties`." } } } } satisfies Meta<typeof ColorInput>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledColor(args: React.ComponentProps<typeof ColorInput>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><label>Color <ColorInput {...args} onChange={(event) => { updateArgs({ value: event.currentTarget.value }); args.onChange?.(event); }} /></label></div>; }
export const Default: Story = { render: ControlledColor };
export const Disabled: Story = { args: { disabled: true } };
