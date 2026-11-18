import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { Textarea } from "../../renderer/src/components/ui/Controls";

const meta = { title: "Controles/Textarea", component: Textarea, tags: ["autodocs"], args: { rows: 5, value: "Describe la ficha con texto largo.", "aria-label": "Markdown", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/ui/Controls.tsx`. Consumidor: `MonsterTemplateFields`." } } } } satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledTextarea(args: React.ComponentProps<typeof Textarea>) { const [, updateArgs] = useArgs(); return <div className="sidebar-accordion-content"><label>Markdown <Textarea {...args} onChange={(event) => { updateArgs({ value: event.currentTarget.value }); args.onChange?.(event); }} /></label></div>; }
export const Default: Story = { render: ControlledTextarea };
export const Disabled: Story = { args: { disabled: true } };
