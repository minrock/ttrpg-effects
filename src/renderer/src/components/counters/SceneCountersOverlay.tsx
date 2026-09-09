import { Eye, EyeOff, Minus, Plus, Settings2 } from "lucide-react";
import { useState, type JSX } from "react";
import {
  getSceneCounterVisualProgress,
  type SceneCounter
} from "../../../../domain/counters/scene-counters";

interface SceneCountersOverlayProps {
  readonly counters: readonly SceneCounter[];
  readonly viewRole: "dm" | "player";
  readonly onAdjust?: (counterId: string, delta: number) => void;
  readonly onSetPlayerVisibility?: (counterId: string, isVisibleToPlayers: boolean, isLabelVisibleToPlayers: boolean) => void;
  readonly onManage?: () => void;
}

export function SceneCountersOverlay({
  counters,
  viewRole,
  onAdjust,
  onSetPlayerVisibility,
  onManage
}: SceneCountersOverlayProps): JSX.Element | null {
  const [counterPendingPublication, setCounterPendingPublication] = useState<SceneCounter | null>(null);
  if (counters.length === 0 && viewRole === "player") return null;

  return (
    <section className={`scene-counters-overlay is-${viewRole}`} aria-label="Contadores de escena">
      {viewRole === "dm" ? (
        <button
          type="button"
          className="scene-counters-overlay__manage"
          onClick={onManage}
          title="Administrar contadores de escena"
          aria-label="Administrar contadores de escena"
        >
          <Settings2 size={15} aria-hidden="true" />
        </button>
      ) : null}
      <div className="scene-counters-overlay__stack">
        {counters.map((counter) => (
          <SceneCounterBar
            key={counter.id}
            counter={counter}
            viewRole={viewRole}
            onAdjust={onAdjust}
            onRequestShowToPlayers={() => setCounterPendingPublication(counter)}
            onHideFromPlayers={() => onSetPlayerVisibility?.(counter.id, false, counter.isLabelVisibleToPlayers)}
          />
        ))}
      </div>
      {counterPendingPublication !== null ? (
        <div className="scene-counter-visibility-menu" role="dialog" aria-label={`Mostrar ${counterPendingPublication.label} en Player View`}>
          <strong>Mostrar a jugadores</strong>
          <span>{counterPendingPublication.label}</span>
          <div>
            <button type="button" onClick={() => { onSetPlayerVisibility?.(counterPendingPublication.id, true, false); setCounterPendingPublication(null); }}>
              Solo barra
            </button>
            <button type="button" className="is-primary" onClick={() => { onSetPlayerVisibility?.(counterPendingPublication.id, true, true); setCounterPendingPublication(null); }}>
              Con etiqueta
            </button>
          </div>
          <button type="button" className="scene-counter-visibility-menu__cancel" onClick={() => setCounterPendingPublication(null)}>
            Cancelar
          </button>
        </div>
      ) : null}
    </section>
  );
}

interface SceneCounterBarProps {
  readonly counter: SceneCounter;
  readonly viewRole: "dm" | "player";
  readonly onAdjust?: (counterId: string, delta: number) => void;
  readonly onRequestShowToPlayers?: () => void;
  readonly onHideFromPlayers?: () => void;
}

export function SceneCounterBar({
  counter,
  viewRole,
  onAdjust,
  onRequestShowToPlayers,
  onHideFromPlayers
}: SceneCounterBarProps): JSX.Element {
  const isFixed = counter.kind === "fixed";
  const capacity = counter.capacity ?? 0;
  const visualProgress = getSceneCounterVisualProgress(counter);
  const labelVisible = viewRole === "dm" || counter.isLabelVisibleToPlayers;

  return (
    <article className={`scene-counter-bar is-${counter.mode} is-${counter.kind}`}>
      <header className="scene-counter-bar__header">
        {labelVisible ? <strong title={counter.label}>{counter.label}</strong> : <span aria-hidden="true" />}
        <output aria-label={`${counter.label}: ${counter.value}`}>{counter.value}</output>
      </header>
      <div
        className="scene-counter-bar__progress"
        role="progressbar"
        aria-label={counter.label}
        aria-valuemin={0}
        aria-valuenow={counter.value}
        {...(isFixed ? { "aria-valuemax": capacity } : {})}
      >
        {isFixed ? (
          Array.from({ length: capacity }, (_, index) => (
            <span key={index} className={index < counter.value ? "is-filled" : ""} aria-hidden="true" />
          ))
        ) : (
          <span className="scene-counter-bar__dynamic-fill" style={{ width: `${visualProgress * 100}%` }} aria-hidden="true" />
        )}
      </div>
      {viewRole === "dm" ? (
        <div className="scene-counter-bar__actions">
          <button
            type="button"
            className={counter.isVisibleToPlayers ? "is-player-visible" : ""}
            onClick={counter.isVisibleToPlayers ? onHideFromPlayers : onRequestShowToPlayers}
            title={counter.isVisibleToPlayers ? `Ocultar ${counter.label} de Player View` : `Mostrar ${counter.label} en Player View`}
            aria-label={counter.isVisibleToPlayers ? `Ocultar ${counter.label} de Player View` : `Mostrar ${counter.label} en Player View`}
          >
            {counter.isVisibleToPlayers ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => onAdjust?.(counter.id, -1)} title={`Reducir ${counter.label}`} aria-label={`Reducir ${counter.label}`}>
            <Minus size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onAdjust?.(counter.id, 1)} title={`Aumentar ${counter.label}`} aria-label={`Aumentar ${counter.label}`}>
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </article>
  );
}
