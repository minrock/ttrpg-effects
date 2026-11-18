import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SceneMapsSection } from "../../../renderer/src/components/aside/SceneMapsSection";
import { storyMaps } from "../../fixtures/composition-fixtures";

const meta = { title: "Composiciones/SceneMapsSection", component: SceneMapsSection, tags: ["autodocs"], parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/aside/SceneMapsSection.tsx`. Consumidor: panel lateral de escena; selección, nombre y orden se conservan en estado local sintético." } } } } satisfies Meta<typeof SceneMapsSection>;
export default meta;
type Story = StoryObj<typeof meta>;
function InteractiveMaps() {
  const [maps, setMaps] = useState(storyMaps); const [activeMapId, setActiveMapId] = useState(maps[0]?.id ?? null); const [nextId, setNextId] = useState(3); const [notice, setNotice] = useState("");
  return <><SceneMapsSection maps={maps} activeMapId={activeMapId} onSelect={setActiveMapId} onRename={(id, name) => setMaps(value => value.map(map => map.id === id ? { ...map, name } : map))} onReorder={(ids) => setMaps(ids.map(id => maps.find(map => map.id === id)!).filter(Boolean))} onDelete={(id) => setMaps(value => { const next = value.filter(map => map.id !== id); if (activeMapId === id) setActiveMapId(next[0]?.id ?? null); return next; })} onAddMap={() => { const id = `mapa-${nextId}`; setNextId(value => value + 1); setMaps(value => [...value, { ...storyMaps[0]!, id, name: `Mapa ${nextId}` }]); }} onReplaceMapImage={(id) => setNotice(`Imagen sintética para ${id}.`)} /><p role="status">{notice}</p></>;
}
export const Normal: Story = { parameters: { controls: { disable: true }, docs: { description: { story: "Fixture interactivo aislado; Reload restablece el estado sintético." } } }, args: { maps: storyMaps, activeMapId: "mapa-entrada", onSelect: () => undefined, onRename: () => undefined, onReorder: () => undefined, onDelete: () => undefined, onAddMap: () => undefined, onReplaceMapImage: () => undefined }, render: () => <InteractiveMaps /> };
export const Empty: Story = { args: { maps: [], activeMapId: null, onSelect: () => undefined, onRename: () => undefined, onReorder: () => undefined, onDelete: () => undefined, onAddMap: () => undefined, onReplaceMapImage: () => undefined } };
export const ReplacingImage: Story = { args: { maps: storyMaps, activeMapId: "mapa-entrada", onSelect: () => undefined, onRename: () => undefined, onReorder: () => undefined, onDelete: () => undefined, onAddMap: () => undefined, onReplaceMapImage: () => undefined, isReplacingImage: true } };
