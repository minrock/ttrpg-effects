import type { Meta, StoryObj } from "@storybook/react-vite";
import { FeedbackAlert } from "../../../renderer/src/components/aside/FeedbackAlert";

const meta = {
  title: "Composiciones/FeedbackAlert",
  component: FeedbackAlert,
  tags: ["autodocs"],
  args: { feedback: { kind: "error", message: "No se pudo guardar la escena. Revisa la conexión y vuelve a intentarlo." } },
  parameters: { uiContext: "editor", docs: { description: { component: "Feedback de operaciones del editor. Fuente: `components/aside/FeedbackAlert.tsx`; usa `alert` para errores y `status` para información o éxito." } } }
} satisfies Meta<typeof FeedbackAlert>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Error: Story = {};
export const Exito: Story = { args: { feedback: { kind: "success", message: "La escena se guardó en este dispositivo." } } };
