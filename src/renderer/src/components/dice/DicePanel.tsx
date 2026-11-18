import { usePortalTarget } from "../../client/PortalTarget";
import { ArrowLeft, ArrowRight, Dices, Eye, EyeOff, RotateCcw, Trash2, Volume2, VolumeX } from "lucide-react";
import { useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { countPhysicalDice, DICE_COLORS, type D20Mode, type DiceDraft } from "../../../../domain/dice/dice";
import type { useDiceSession } from "../../hooks/useDiceSession";
import { DiceResultSummary } from "./DiceResultSummary";
import { Select } from "../ui/Controls";
import { DiceComposer, type DiceComposerState } from "./DiceComposer";
import { D20RollModeDialog } from "./DiceControls";
import "./dice.css";

type DiceController = ReturnType<typeof useDiceSession>;
export function DicePanel({ controller }: { controller: DiceController }): JSX.Element {
  const portalTarget = usePortalTarget();
  const { draft, state, busy, ready, preparing, error, updateDraft } = controller;
  const [askD20, setAskD20] = useState(false);
  const [page, setPage] = useState(0);
  const [composerState, setComposerState] = useState<DiceComposerState>({ count: countPhysicalDice(draft.groups, draft.includeD20 ? "normal" : null), invalidFormula: false, invalidModifier: false, invalidD20Modifier: false, rollDraft: draft });
  const patch = (value: Partial<DiceDraft>): void => updateDraft({ ...draft, ...value });
  const pages = Math.max(1, Math.ceil(state.history.length / 10)), currentPage = Math.min(page, pages - 1);
  const disabled = busy || !ready;
  const launch = (mode: D20Mode | null): void => { void controller.roll(mode, composerState.rollDraft); };
  return <div className="dice-panel" onKeyDown={event => event.stopPropagation()}>
    <fieldset disabled={disabled} className="dice-panel-properties"><legend>Tirada</legend>
      <div className="dice-segmented" aria-label="Visibilidad de la tirada">
        <button type="button" aria-pressed={draft.visibility === "hidden"} onClick={() => patch({ visibility: "hidden" })}><EyeOff size={16} /> Oculta</button>
        <button type="button" aria-pressed={draft.visibility === "open"} onClick={() => patch({ visibility: "open" })}><Eye size={16} /> Abierta</button>
      </div>
      {draft.visibility === "open" && <label className="dice-toggle" title="Oculta etiquetas y totales, no los numeros impresos en los dados"><span>Mostrar resultado a jugadores</span><input type="checkbox" checked={draft.showPlayerResult} onChange={event => patch({ showPlayerResult: event.target.checked })} /></label>}
      <div className="dice-field-label">Color sin tipo / d20</div>
      <div className="dice-swatches" role="group" aria-label="Color de los dados">
        <button type="button" className="dice-swatch dice-swatch-multi" title="Por tipo de dado" aria-label="Por tipo de dado" aria-pressed={draft.appearance.color === "multi"} onClick={() => patch({ appearance: { ...draft.appearance, color: "multi" } })} />
        {DICE_COLORS.map(([id, label, color]) => <button type="button" key={id} className="dice-swatch" style={{ backgroundColor: color }} title={label} aria-label={label} aria-pressed={draft.appearance.color === id} onClick={() => patch({ appearance: { ...draft.appearance, color: id } })} />)}
      </div>
      <label className="dice-field"><span>Material</span><Select value={draft.appearance.material} onChange={event => patch({ appearance: { ...draft.appearance, material: event.target.value as DiceDraft["appearance"]["material"] } })}><option value="resin">Resina</option><option value="matte">Mate</option><option value="metal">Metal</option></Select></label>
      <label className="dice-field dice-force"><span>Fuerza <output>{draft.force.toFixed(1)}</output></span><input aria-label="Fuerza de lanzamiento" type="range" min="0.5" max="1.6" step="0.1" value={draft.force} onChange={event => patch({ force: event.target.valueAsNumber })} /></label>
      {(["dm", "player"] as const).map(view => {
        const label = view === "dm" ? "Tamano en DM" : "Tamano en Player", scale = controller.diceSizes.sizes[view];
        return <div key={view} className="dice-size-control">
          <label className="dice-field dice-force"><span>{label}<output>{Math.round(scale * 100)}%</output></span><input type="range" aria-label={label} min="1" max="2.5" step="0.25" value={scale} disabled={!controller.diceSizes.ready} onChange={event => void controller.diceSizes.setSize({ view, scale: event.target.valueAsNumber })} /></label>
          <button type="button" className="dice-icon-button" aria-label={`Restablecer ${label.toLowerCase()}`} title={`Restablecer ${label.toLowerCase()} (100%)`} disabled={!controller.diceSizes.ready || scale === 1} onClick={() => void controller.diceSizes.setSize({ view, scale: 1 })}><RotateCcw size={16} aria-hidden="true" /></button>
        </div>;
      })}
    </fieldset>
    <label className="dice-toggle dice-sound-control"><span>{controller.soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}Sonido de dados</span><input type="checkbox" checked={controller.soundEnabled} onChange={event => controller.setSoundEnabled(event.target.checked)} /></label>
    <DiceComposer draft={draft} disabled={disabled} onDraftChange={updateDraft} onStateChange={setComposerState} />
    {error && <p className="dice-error" role="alert">{error}</p>}
    {!ready && !error && <p className="dice-status" role="status">Mesa de dados no disponible</p>}
    <button type="button" className="dice-roll-button" disabled={disabled || composerState.count === 0 || (draft.includeD20 ? composerState.invalidD20Modifier : composerState.invalidFormula || composerState.invalidModifier)} onClick={() => { setPage(0); if (draft.includeD20) setAskD20(true); else launch(null); }}><Dices size={19} /><span>{preparing ? "Preparando..." : busy ? "Rodando..." : "Lanzar"}</span>{draft.visibility === "hidden" ? <EyeOff size={16} aria-label="Oculta" /> : <Eye size={16} aria-label="Abierta" />}</button>
    <section className="dice-history" aria-label="Historial de tiradas"><header><h3>Tiradas recientes <small>{state.history.length} / 500</small></h3><button type="button" className="dice-icon-button" aria-label="Limpiar historial" title="Limpiar historial" disabled={!state.history.length || busy} onClick={() => { if (window.confirm("Limpiar el historial de tiradas de esta sesion?")) void controller.clearHistory(); }}><Trash2 size={16} /></button></header>
      {state.history.length === 0 && <p className="dice-status">Sin tiradas</p>}
      <ol>{state.history.slice(currentPage * 10, currentPage * 10 + 10).map(entry => <li key={entry.id}>
        <div className="dice-history-meta"><span title={entry.request.draft.visibility === "open" ? "Abierta" : "Oculta"}>{entry.request.draft.visibility === "open" ? <Eye size={14} /> : <EyeOff size={14} />}{entry.request.draft.visibility === "open" ? "Abierta" : "Oculta"}</span><time>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div>
        <div className="dice-history-origin" title={`${entry.context.sceneName} / ${entry.context.mapName}`}>{entry.context.sceneName} / {entry.context.mapName}</div>
        {entry.result && Date.now() >= entry.settledAt ? <DiceResultSummary result={entry.result} /> : <p className="dice-status">{entry.status === "interrupted" ? "Interrumpida" : entry.status === "failed" ? "No resuelta" : "Rodando..."}</p>}
        {entry.id === state.publicRollId && entry.status === "complete" && Date.now() >= entry.settledAt && <button type="button" className="dice-publish-result" disabled={busy} onClick={() => void controller.showResult(entry.id, !state.publicResultVisible)}>{state.publicResultVisible ? <EyeOff size={14} /> : <Eye size={14} />}{state.publicResultVisible ? "Ocultar resultado" : "Mostrar resultado"}</button>}
      </li>)}</ol>
      {pages > 1 && <nav className="dice-history-pages" aria-label="Paginas del historial"><button type="button" className="dice-icon-button" aria-label="Tiradas mas recientes" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft size={16} /></button><span>{currentPage + 1} / {pages}</span><button type="button" className="dice-icon-button" aria-label="Tiradas anteriores" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}><ArrowRight size={16} /></button></nav>}
    </section>
    {askD20 && createPortal(<D20RollModeDialog draft={draft} onClose={() => setAskD20(false)} onRoll={mode => { setAskD20(false); launch(mode); }} />, portalTarget)}
  </div>;
}

export { D20RollModeDialog, DiceModifierInput } from "./DiceControls";
