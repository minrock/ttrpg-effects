import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Select } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/Select", component: Select, tags: ["autodocs"], args: { value: "serif", "aria-label": "Fuente", onChange: fn(), children: <><option value="serif">Serif</option><option value="sans">Sans serif</option></> }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidor: `App`." } } } } satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledSelect({ label = "Fuente", ...args }: React.ComponentProps<typeof Select> & { readonly label?: string }) { const [value, setValue] = useState(String(args.value ?? "")); return <div className="sidebar-accordion-content"><label>{label} <Select {...args} value={value} onChange={(event) => { setValue(event.currentTarget.value); args.onChange?.(event); }} /></label></div>; }
export const Default: Story = { render: ControlledSelect };
export const Disabled: Story = { args: { disabled: true } };
export const Material: Story = { args: { value: "resin", "aria-label": "Material", children: <><option value="resin">Resina</option><option value="matte">Mate</option><option value="metal">Metal</option><option value="long">Material con un nombre deliberadamente largo</option></> }, render: args => <div style={{ width: 282 }}><ControlledSelect {...args} label="Material" /></div> };
export const MaterialEstrecho: Story = { args: { ...Material.args, value: "long" }, render: args => <div style={{ width: 180 }}><ControlledSelect {...args} label="Material" /></div> };
