import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MonsterTemplateFields } from "../../../renderer/src/components/aside/MonsterTemplateFields";
import { storyTemplate } from "../../fixtures/composition-fixtures";
const meta = { title: "Composiciones/MonsterTemplateFields", component: MonsterTemplateFields, tags: ["autodocs"], parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/aside/MonsterTemplateFields.tsx`. Consumidor: gestor de plantillas; los cambios y la previsualización permanecen dentro de la historia." } } } } satisfies Meta<typeof MonsterTemplateFields>;
export default meta; type Story = StoryObj<typeof meta>;
function EditableTemplate() { const [template, setTemplate] = useState(storyTemplate); return <MonsterTemplateFields template={template} onChange={setTemplate} />; }
export const Editable: Story = { parameters: { controls: { disable: true }, docs: { description: { story: "Fixture interactivo aislado; Reload restablece el estado sintético." } } }, args: { template: storyTemplate, onChange: () => undefined }, render: () => <EditableTemplate /> };
