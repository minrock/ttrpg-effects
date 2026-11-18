import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { WorkspaceHeader } from "../../../renderer/src/components/workspace/WorkspaceHeader";

function HeaderExample() {
  const [lastAction, setLastAction] = useState("Listo");
  const [battleActive, setBattleActive] = useState(false);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [inspectorVisible, setInspectorVisible] = useState(true);
  return <><WorkspaceHeader sceneName="La bóveda de las tres lunas" mapName="Mapa de la cripta" busy={false} canCreate battleActive={battleActive} explorerVisible={explorerVisible} inspectorVisible={inspectorVisible} serviceActions={{ onImport: () => setLastAction("Importar escena"), onExport: () => setLastAction("Exportar escena"), onLogout: () => setLastAction("Cerrar sesión") }} onNew={() => setLastAction("Nueva escena")} onLoad={() => setLastAction("Cargar escena")} onSave={() => setLastAction("Guardar escena")} onPlayer={() => setLastAction("Publicar escena para jugadores")} onBattle={() => { setBattleActive(active => !active); setLastAction("Batalla"); }} onCounters={() => setLastAction("Contadores")} onDice={() => setLastAction("Dados")} onExplorer={() => { setExplorerVisible(visible => !visible); setLastAction("Explorador"); }} onInspector={() => { setInspectorVisible(visible => !visible); setLastAction("Inspector"); }} /><button type="button" onClick={() => { setBattleActive(false); setExplorerVisible(true); setInspectorVisible(true); setLastAction("Reiniciado"); }}>Reiniciar</button><p role="status">Acción: {lastAction}</p></>;
}

const meta = {
  title: "Composiciones/WorkspaceHeader",
  component: WorkspaceHeader,
  tags: ["autodocs"],
  args: { sceneName: "Escena", mapName: "Mapa", busy: false, canCreate: true, battleActive: false, explorerVisible: true, inspectorVisible: true, onNew: () => undefined, onLoad: () => undefined, onSave: () => undefined, onPlayer: () => undefined, onBattle: () => undefined, onCounters: () => undefined, onDice: () => undefined, onExplorer: () => undefined, onInspector: () => undefined },
  parameters: { uiContext: "workspace", controls: { disable: true }, docs: { description: { component: "Cabecera del editor. Fuente: `components/workspace/WorkspaceHeader.tsx`; consumidor: editor DM. Esta historia usa el contexto de servicio: en navegador muestra únicamente el nombre de la escena como texto y Jugador publica la escena; Electron conserva el menú de escena. Las acciones usan estado local sintético." } } }
} satisfies Meta<typeof WorkspaceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Acciones: Story = { render: () => <HeaderExample /> };
