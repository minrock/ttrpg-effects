import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MapAnnotationsTree } from "../../../renderer/src/components/annotations/MapAnnotationsTree";
import { storyAnnotations } from "../../fixtures/composition-fixtures";

const meta = { title: "Composiciones/MapAnnotationsTree", component: MapAnnotationsTree, tags: ["autodocs"], parameters: { uiContext: "editor", docs: { description: { component: "Fuente: `components/annotations/MapAnnotationsTree.tsx`. Consumidor: herramientas de anotación del mapa; no inicia Pixi ni carga escenas." } } } } satisfies Meta<typeof MapAnnotationsTree>;
export default meta;
type Story = StoryObj<typeof meta>;

function InteractiveAnnotations() {
  const [annotations, setAnnotations] = useState(storyAnnotations);
  const [selected, setSelected] = useState<string | null>("pin-puente");
  const [notice, setNotice] = useState("Selecciona una anotación para verla en el fixture.");
  const toggleLock = (id: string): void => setAnnotations(value => ({
    ...value,
    pins: value.pins.map(item => item.id === id ? { ...item, locked: !item.locked } : item),
    areas: value.areas.map(item => item.id === id ? { ...item, locked: !item.locked } : item),
    sceneLinks: value.sceneLinks.map(item => item.id === id ? { ...item, locked: !item.locked } : item)
  }));
  const deleteArea = (id: string): void => {
    setAnnotations(value => ({ ...value, areas: value.areas.filter(item => item.id !== id) }));
    setSelected(current => current === id ? null : current);
    setNotice("Área eliminada del fixture sintético.");
  };
  return <><MapAnnotationsTree annotations={annotations} selectedElementId={selected} onSelect={(item) => { setSelected(item.id); setNotice(`Seleccionada: ${item.id}.`); }} onGoTo={(item) => { setSelected(item.id); setNotice(`Ir a ${item.id} es una acción sintética.`); }} onEdit={(item) => setNotice(`Editar ${item.id} requiere el modal del producto.`)} onToggleLock={(item) => { toggleLock(item.id); setNotice(`Bloqueo actualizado para ${item.id}.`); }} onHighlightArea={(id) => setNotice(`Resaltado sintético de ${id}.`)} onDeleteArea={deleteArea} activeTool="select" onStartPin={() => setNotice("Herramienta Pin seleccionada de forma sintética.")} onStartArea={() => setNotice("Herramienta Área seleccionada de forma sintética.")} onStartSceneLink={() => setNotice("Herramienta Conexión seleccionada de forma sintética.")} sceneLinkStatuses={{ "link-cripta": { state: "unlinked" } }} /><p role="status">{notice}</p></>;
}

const callbacks = { onSelect: fn(), onGoTo: fn(), onEdit: fn(), onToggleLock: fn(), onHighlightArea: fn(), onDeleteArea: fn(), onStartPin: fn(), onStartArea: fn(), onStartSceneLink: fn() };
export const Normal: Story = { parameters: { controls: { disable: true }, docs: { description: { story: "Fixture interactivo aislado: bloqueo y borrado actualizan datos locales. Editar, ir a, resaltar e iniciar herramientas solo muestran estado sintético; Reload restablece el fixture." } } }, args: { annotations: storyAnnotations, selectedElementId: "pin-puente", activeTool: "select", ...callbacks }, render: () => <InteractiveAnnotations /> };
export const Empty: Story = { args: { annotations: { pins: [], areas: [], sceneLinks: [] }, selectedElementId: null, activeTool: "select", ...callbacks } };
