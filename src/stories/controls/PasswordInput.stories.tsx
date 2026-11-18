import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useArgs } from "storybook/preview-api";
import { PasswordInput } from "../../web/AccountAccess";

const meta = { title: "Controles/PasswordInput", component: PasswordInput, tags: ["autodocs"], args: { label: "Contraseña", value: "secreto-sintético", onChange: fn() }, argTypes: { onChange: { action: "cambió" } }, parameters: { uiContext: "service", docs: { description: { component: "Fuente y consumidor: `web/AccountAccess.tsx`. Se reutiliza sin cambiar su contrato." } } } } satisfies Meta<typeof PasswordInput>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledPassword(args: React.ComponentProps<typeof PasswordInput>) { const [, updateArgs] = useArgs(); return <div className="service-access"><section><PasswordInput {...args} onChange={(value) => { updateArgs({ value }); args.onChange(value); }} /></section></div>; }
export const Default: Story = { render: ControlledPassword };
export const Invalid: Story = { args: { invalid: true, describedBy: "password-error" }, render: function InvalidPassword(args) { const [, updateArgs] = useArgs(); return <div className="service-access"><section><PasswordInput {...args} onChange={(value) => { updateArgs({ value }); args.onChange(value); }} /><p id="password-error" role="alert">La contraseña no es válida.</p></section></div>; } };
