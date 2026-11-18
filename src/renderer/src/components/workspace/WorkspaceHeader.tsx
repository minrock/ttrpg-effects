import { rememberDialogFocus, restoreDialogFocus } from "../../client/dialog-focus";
import { useEffect, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Dices, Monitor, PanelLeft, PanelRight, Save, Swords, Timer } from "lucide-react";
import logoUrl from "../../../../../assets/logo/ttrpg-effects-icon.png";

interface WorkspaceHeaderProps {
  readonly portalTarget?: HTMLElement | null;
  readonly enabled?: boolean;
  readonly sceneName: string;
  readonly busy: boolean;
  readonly battleActive: boolean;
  readonly explorerVisible: boolean;
  readonly inspectorVisible: boolean;
  readonly onSave: () => void | Promise<void>;
  readonly onPlayer: () => void;
  readonly onBattle: () => void;
  readonly onCounters: () => void;
  readonly onDice: () => void;
  readonly onExplorer: () => void;
  readonly onInspector: () => void;
}

export function WorkspaceHeader(props: WorkspaceHeaderProps): JSX.Element {
  const tools = useRef<HTMLDivElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => {
    const closeOutside = (event: Event): void => {
      if (event.target instanceof Node) {
        if (!tools.current?.contains(event.target)) setToolsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("focusin", closeOutside); };
  }, []);
  const Container = props.portalTarget ? "div" : "header";
  const content = <Container className="workspace-header">
    {!props.portalTarget && <div className="workspace-brand"><img src={logoUrl} alt="" /><strong>TTRPG <span>Effects</span></strong></div>}
    <div className="workspace-scene-name" title={props.sceneName}><span>{props.sceneName}</span></div>
    <div className="workspace-tools-menu" ref={tools} onKeyDown={event => {
      if (event.key === "Escape" && toolsOpen) {
        event.preventDefault(); event.stopPropagation(); setToolsOpen(false); tools.current?.querySelector<HTMLButtonElement>(".workspace-tools-trigger")?.focus();
      }
    }}>
      {props.portalTarget && <button type="button" className="workspace-icon workspace-tools-trigger" aria-label="Herramientas del editor" title="Herramientas del editor" aria-expanded={toolsOpen} onClick={() => setToolsOpen(open => !open)}><MoreHorizontal size={18}/></button>}
      <div className={`workspace-header-actions${toolsOpen ? " is-open" : ""}`} onClickCapture={event => {
        if (toolsOpen && event.target instanceof Element && event.target.closest("button:not(:disabled)")) {
          setToolsOpen(false); tools.current?.querySelector<HTMLButtonElement>(".workspace-tools-trigger")?.focus();
        }
      }}>
      <button type="button" className="workspace-icon" title="Guardar escena" aria-label="Guardar escena" disabled={props.busy} onClick={event => { const target=props.portalTarget && toolsOpen ? tools.current?.querySelector<HTMLButtonElement>(".workspace-tools-trigger") ?? event.currentTarget : event.currentTarget; rememberDialogFocus(target); void Promise.resolve(props.onSave()).finally(() => restoreDialogFocus(target)); }}><Save size={17} /></button>
      <button type="button" className="workspace-icon" title="Batalla" aria-label="Batalla" aria-pressed={props.battleActive} disabled={props.busy} onClick={props.onBattle}><Swords size={17} /></button>
      <button type="button" className="workspace-icon" title="Contadores" aria-label="Contadores" disabled={props.busy} onClick={props.onCounters}><Timer size={17} /></button>
      <button type="button" className="workspace-icon" title="Dados" aria-label="Abrir dados" onClick={props.onDice}><Dices size={17} /></button>
      <span className="workspace-header-separator" />
      <button type="button" className="workspace-icon" title="Explorador" aria-label="Alternar explorador" aria-pressed={props.explorerVisible} onClick={props.onExplorer}><PanelLeft size={17} /></button>
      <button type="button" className="workspace-icon" title="Inspector" aria-label="Alternar inspector" aria-pressed={props.inspectorVisible} onClick={props.onInspector}><PanelRight size={17} /></button>
      <button type="button" className="workspace-present" title="Publicar escena para jugadores" aria-label="Publicar escena para jugadores" disabled={props.busy} onClick={props.onPlayer}><Monitor size={16} /><span>Jugador</span></button>
    </div>
    </div>
  </Container>;
  return props.portalTarget ? createPortal(<div className="vtt-interface service-editor-chrome" hidden={props.enabled===false} inert={props.enabled===false} onKeyDown={event=>event.stopPropagation()}>{content}</div>, props.portalTarget) : content;
}
