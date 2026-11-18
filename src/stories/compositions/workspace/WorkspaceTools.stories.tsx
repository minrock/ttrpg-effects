import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { InteractionTool } from "../../../domain/interaction/interaction-state";
import { WorkspaceTools } from "../../../renderer/src/components/workspace/WorkspaceTools";

function ToolsExample() {
  const [activeTool, setActiveTool] = useState<InteractionTool>("select");
  const [pan, setPan] = useState(false);
  const [fogCells, setFogCells] = useState(2);
  const [action, setAction] = useState("Seleccionar");
  const select = (tool: InteractionTool, label: string) => { setPan(false); setActiveTool(tool); setAction(label); };
  return <><WorkspaceTools activeTool={activeTool} pan={pan} busy={false} fogEnabled fogCells={fogCells} onPrepare={() => undefined} onSelect={() => select("select", "Seleccionar")} onPan={() => { setActiveTool("select"); setPan(true); setAction("Desplazar mapa"); }} onShape={kind => { setPan(false); setAction(`Figura: ${kind}`); }} onLight={kind => { setPan(false); setAction(`Luz: ${kind}`); }} onDynamicLight={() => setAction("Luz dinámica")} onMagicalDarkness={() => setAction("Oscuridad mágica")} onPath={() => select("path", "Camino")} onWater={() => select("water", "Agua")} onFire={shape => select(shape === "paint" ? "fire-paint" : `fire-${shape}`, `Fuego: ${shape}`)} onLightning={shape => select(`lightning-${shape}`, `Relámpago: ${shape}`)} onPin={() => select("room-pin", "Pin")} onArea={() => select("information-area", "Área de información")} onLink={() => select("scene-link", "Enlace")} onLabel={() => setAction("Texto DM")} onToken={() => setAction("Nuevo token")} onPointer={() => select("arcane-pointer", "Apuntador")} onFog={() => select("fog-reveal", "Revelar niebla")} onFogCells={setFogCells} onSettings={section => setAction(`Ajustes: ${section}`)} onConfirmDrawing={() => select("select", "Dibujo terminado")} /><button type="button" onClick={() => { setActiveTool("select"); setPan(false); setFogCells(2); setAction("Reiniciado"); }}>Reiniciar</button><p role="status">{action}</p></>;
}

const meta = {
  title: "Composiciones/WorkspaceTools",
  component: WorkspaceTools,
  tags: ["autodocs"],
  args: { activeTool: "select", pan: false, busy: false, fogEnabled: true, fogCells: 2, onPrepare: () => undefined, onSelect: () => undefined, onPan: () => undefined, onShape: () => undefined, onLight: () => undefined, onDynamicLight: () => undefined, onMagicalDarkness: () => undefined, onPath: () => undefined, onWater: () => undefined, onFire: () => undefined, onLightning: () => undefined, onPin: () => undefined, onArea: () => undefined, onLink: () => undefined, onLabel: () => undefined, onToken: () => undefined, onPointer: () => undefined, onFog: () => undefined, onFogCells: () => undefined, onSettings: () => undefined, onConfirmDrawing: () => undefined },
  parameters: { uiContext: "workspace", controls: { disable: true }, docs: { description: { component: "Herramientas del mapa. Fuente: `components/workspace/WorkspaceTools.tsx`; consumidor: editor DM. No monta lienzo: cada control actualiza solo el estado sintético de la historia." } } }
} satisfies Meta<typeof WorkspaceTools>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivas: Story = { render: () => <ToolsExample /> };
