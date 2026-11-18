import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SceneObjectsTree } from "../../../renderer/src/components/aside/SceneObjectsTree";
import { storyObjects } from "../../fixtures/composition-fixtures";
const meta = { title: "Composiciones/SceneObjectsTree", component: SceneObjectsTree, tags: ["autodocs"], parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/aside/SceneObjectsTree.tsx`. Consumidor: panel lateral; búsqueda, selección y borrado se prueban con datos locales." } } } } satisfies Meta<typeof SceneObjectsTree>;
export default meta; type Story = StoryObj<typeof meta>;
function InteractiveTree() { const [objects, setObjects] = useState(storyObjects); const [selected, setSelected] = useState<string | null>(null); return <SceneObjectsTree objects={objects} selectedElementId={selected} onSelect={(entry) => setSelected(entry.id)} onLocate={(entry) => setSelected(entry.id)} onDelete={(entry) => setObjects(value => value.filter(item => item.id !== entry.id))} />; }
export const Normal: Story = { parameters: { controls: { disable: true }, docs: { description: { story: "Fixture interactivo aislado; Reload restablece el estado sintético." } } }, args: { objects: storyObjects, selectedElementId: null, onSelect: () => undefined, onLocate: () => undefined, onDelete: () => undefined }, render: () => <InteractiveTree /> };
export const Empty: Story = { args: { objects: [], selectedElementId: null, onSelect: () => undefined, onLocate: () => undefined, onDelete: () => undefined } };
