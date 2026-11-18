import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RichTextPreview } from "../../../renderer/src/components/aside/RichTextPreview";
const checklist = "# Preparación\n\n- [x] Situar el mapa\n- [ ] Añadir la emboscada";
const meta = { title: "Composiciones/RichTextPreview", component: RichTextPreview, tags: ["autodocs"], parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/aside/RichTextPreview.tsx`. Consumidor: notas de escena; el checklist editable actualiza solo el estado de la historia." } } } } satisfies Meta<typeof RichTextPreview>;
export default meta; type Story = StoryObj<typeof meta>;
function EditablePreview() { const [markdown, setMarkdown] = useState(checklist); return <RichTextPreview markdown={markdown} mode="dm-editable" onChange={setMarkdown} />; }
export const Editable: Story = { parameters: { controls: { disable: true }, docs: { description: { story: "Fixture interactivo aislado; Reload restablece el estado sintético." } } }, args: { markdown: checklist, mode: "dm-editable", onChange: () => undefined }, render: () => <EditablePreview /> };
export const Readonly: Story = { args: { markdown: checklist, mode: "readonly" } };
export const Empty: Story = { args: { markdown: "", emptyFallback: "Todavía no hay notas para esta escena." } };
