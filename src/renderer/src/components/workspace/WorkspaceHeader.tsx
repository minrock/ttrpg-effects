import { rememberDialogFocus, restoreDialogFocus } from "../../client/dialog-focus";
import { useEffect, useRef, type JSX } from "react";
import { ChevronDown, Dices, FilePlus, FolderOpen, Monitor, PanelLeft, PanelRight, Save, Swords, Timer } from "lucide-react";
import logoUrl from "../../../../../assets/logo/ttrpg-effects-icon.png";

interface WorkspaceHeaderProps {
  readonly serviceActions?: { onImport: () => void; onExport: () => void; onLogout: () => void; onTemplates: () => void };
  readonly sceneName: string;
  readonly mapName: string;
  readonly busy: boolean;
  readonly canCreate: boolean;
  readonly battleActive: boolean;
  readonly explorerVisible: boolean;
  readonly inspectorVisible: boolean;
  readonly onNew: () => void;
  readonly onLoad: () => void;
  readonly onSave: () => void | Promise<void>;
  readonly onPlayer: () => void;
  readonly onBattle: () => void;
  readonly onCounters: () => void;
  readonly onDice: () => void;
  readonly onExplorer: () => void;
  readonly onInspector: () => void;
}

export function WorkspaceHeader(props: WorkspaceHeaderProps): JSX.Element {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const run = (action: () => void): void => {
    if (props.serviceActions) rememberDialogFocus(menu.current?.querySelector("summary") ?? null);
    if (menu.current) menu.current.open = false;
    action();
  };
  return <header className="workspace-header">
    <div className="workspace-brand"><img src={logoUrl} alt="" /><strong>TTRPG <span>Effects</span></strong></div>
    <details className="workspace-scene-menu" ref={menu} onKeyDown={event => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
      }
    }}>
      <summary aria-label="Menu de escena" title={props.sceneName}>
        <span><small>{props.sceneName}</small><strong>{props.mapName}</strong></span><ChevronDown size={14} />
      </summary>
      <div className="workspace-scene-actions" aria-label="Acciones de escena">
        <button type="button" disabled={props.busy || !props.canCreate} onClick={() => run(props.onNew)}><FilePlus size={16} />Nueva escena</button>
        <button type="button" disabled={props.busy} onClick={() => run(props.onLoad)}><FolderOpen size={16} />Cargar escena</button>
        <button type="button" disabled={props.busy} onClick={() => run(props.onSave)}><Save size={16} />Guardar escena</button>
        {props.serviceActions && <>
          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onImport)}>Importar archivo .ttrpgscene</button>
          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onExport)}>Exportar archivo .ttrpgscene</button>
          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onTemplates)}>Administrar plantillas</button>
          <p className="service-menu-note">Servicio privado · DM<br />Proyección y dados compartidos disponibles.</p>
          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onLogout)}>Cerrar sesión</button>
        </>}
      </div>
    </details>
    <div className="workspace-header-actions">
      <button type="button" className="workspace-icon" title="Guardar escena" aria-label="Guardar escena" disabled={props.busy} onClick={event => { const target=event.currentTarget; if (props.serviceActions) rememberDialogFocus(target); void Promise.resolve(props.onSave()).finally(() => { if (props.serviceActions) restoreDialogFocus(target); }); }}><Save size={17} /></button>
      <button type="button" className="workspace-icon" title="Batalla" aria-label="Batalla" aria-pressed={props.battleActive} disabled={props.busy} onClick={props.onBattle}><Swords size={17} /></button>
      <button type="button" className="workspace-icon" title="Contadores" aria-label="Contadores" disabled={props.busy} onClick={props.onCounters}><Timer size={17} /></button>
      <button type="button" className="workspace-icon" title="Dados" aria-label="Abrir dados" onClick={props.onDice}><Dices size={17} /></button>
      <span className="workspace-header-separator" />
      <button type="button" className="workspace-icon" title="Explorador" aria-label="Alternar explorador" aria-pressed={props.explorerVisible} onClick={props.onExplorer}><PanelLeft size={17} /></button>
      <button type="button" className="workspace-icon" title="Inspector" aria-label="Alternar inspector" aria-pressed={props.inspectorVisible} onClick={props.onInspector}><PanelRight size={17} /></button>
      <button type="button" className="workspace-present" title={props.serviceActions ? "Publicar vista de jugador" : "Abrir ventana de jugador"} aria-label={props.serviceActions ? "Publicar vista de jugador" : "Abrir ventana de jugador"} disabled={props.busy} onClick={props.onPlayer}><Monitor size={16} /><span>Jugador</span></button>
    </div>
  </header>;
}
