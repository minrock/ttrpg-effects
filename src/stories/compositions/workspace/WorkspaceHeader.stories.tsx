import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { WorkspaceHeader } from "../../../renderer/src/components/workspace/WorkspaceHeader";

function HeaderExample() {
  const [lastAction, setLastAction] = useState("Listo");
  const [battleActive, setBattleActive] = useState(false);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [inspectorVisible, setInspectorVisible] = useState(true);
  return <><WorkspaceHeader sceneName="La bóveda de las tres lunas" busy={false} battleActive={battleActive} explorerVisible={explorerVisible} inspectorVisible={inspectorVisible} onSave={() => setLastAction("Guardar escena")} onPlayer={() => setLastAction("Publicar escena para jugadores")} onBattle={() => { setBattleActive(active => !active); setLastAction("Batalla"); }} onCounters={() => setLastAction("Contadores")} onDice={() => setLastAction("Dados")} onExplorer={() => { setExplorerVisible(visible => !visible); setLastAction("Explorador"); }} onInspector={() => { setInspectorVisible(visible => !visible); setLastAction("Inspector"); }} /><button type="button" onClick={() => { setBattleActive(false); setExplorerVisible(true); setInspectorVisible(true); setLastAction("Reiniciado"); }}>Reiniciar</button><p role="status">Acción: {lastAction}</p></>;
}

const meta = {
  title: "Composiciones/WorkspaceHeader",
  component: WorkspaceHeader,
  tags: ["autodocs"],
  args: { sceneName: "Escena", busy: false, battleActive: false, explorerVisible: true, inspectorVisible: true, onSave: () => undefined, onPlayer: () => undefined, onBattle: () => undefined, onCounters: () => undefined, onDice: () => undefined, onExplorer: () => undefined, onInspector: () => undefined },
  parameters: { uiContext: "workspace", controls: { disable: true }, docs: { description: { component: "Cabecera del editor. Fuente: `components/workspace/WorkspaceHeader.tsx`; consumidor: editor DM. En navegador muestra el nombre de la escena como texto y Jugador publica la escena. Las acciones usan estado local sintético." } } }
} satisfies Meta<typeof WorkspaceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Acciones: Story = { render: () => <HeaderExample /> };
