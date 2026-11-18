import type { Meta, StoryObj } from "@storybook/react-vite";
import { DiceResultSummary } from "../../../renderer/src/components/dice/DiceResultSummary";
import { storyDiceResult } from "./fixtures";

const meta = {
  title: "Composiciones/DiceResultSummary",
  component: DiceResultSummary,
  tags: ["autodocs"],
  args: { result: storyDiceResult },
  parameters: { uiContext: "editor", docs: { description: { component: "Resumen numérico de una tirada ya resuelta. Fuente: `components/dice/DiceResultSummary.tsx`; consumidor: panel de dados. No monta el motor Three ni la superposición de dados." } } }
} satisfies Meta<typeof DiceResultSummary>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Resultado: Story = {};
export const Compacto: Story = { args: { compact: true } };
