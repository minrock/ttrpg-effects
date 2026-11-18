import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { TextInput } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/TextInput", component: TextInput, tags: ["autodocs"], args: { value: "Nombre de escena", "aria-label": "Nombre", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidores: `App` y `MonsterTemplateFields`." } } } } satisfies Meta<typeof TextInput>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledText(args: React.ComponentProps<typeof TextInput>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><label>Nombre <TextInput {...args} onChange={(event) => { updateArgs({ value: event.currentTarget.value }); args.onChange?.(event); }} /></label></div>; }
export const Default: Story = { render: ControlledText };
export const Invalid: Story = { render: ControlledText, args: { "aria-invalid": true, value: "", placeholder: "Este campo es obligatorio" } };
