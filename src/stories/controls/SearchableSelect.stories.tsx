import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchableSelect, type SearchableSelectOption } from "../../renderer/src/components/ui/SearchableSelect";

const templates: readonly SearchableSelectOption[] = Array.from({ length: 18 }, (_, index) => ({ id: `plantilla-${index + 1}`, name: index === 16 ? "Guardián de la cripta con una denominación deliberadamente extensa" : `Plantilla de ejemplo ${index + 1}` }));
const meta = { title: "Controles/SearchableSelect", component: SearchableSelect, tags: ["autodocs"], args: { label: "Plantilla", options: templates, value: "plantilla-2", onChange: () => undefined }, parameters: { uiContext: "service", docs: { description: { component: "Selector reutilizable con búsqueda local y elección explícita. Consumidor: formulario de monstruos de ArcPreparationPanel; patrón UI-007." } } } } satisfies Meta<typeof SearchableSelect>;
export default meta;
type Story = StoryObj<typeof meta>;
function Controlled(args: React.ComponentProps<typeof SearchableSelect>) { const [value, setValue] = useState(args.value); return <div style={{ maxWidth: 420 }}><SearchableSelect {...args} value={value} onChange={id => { setValue(id); args.onChange(id); }}/></div>; }
export const Seleccionado: Story = { render: Controlled };
export const ListaLarga: Story = { args: { value: null }, render: Controlled };
export const SinOpciones: Story = { args: { options: [], value: null }, render: Controlled };
export const Retenida: Story = { args: { value: null, fallbackLabel: "Plantilla retenida (no disponible)", description: "La plantilla retenida ya no admite usos nuevos; puedes conservar esta ficha sin cambiarla." }, render: Controlled };
export const Deshabilitado: Story = { args: { disabled: true }, render: Controlled };
