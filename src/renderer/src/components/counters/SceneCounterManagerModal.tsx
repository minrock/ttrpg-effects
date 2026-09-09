import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type JSX } from "react";
import {
  SceneCounterError,
  type CreateSceneCounterInput,
  type SceneCounter,
  type SceneCounterKind,
  type SceneCounterMode,
  type UpdateSceneCounterInput
} from "../../../../domain/counters/scene-counters";

interface SceneCounterManagerModalProps {
  readonly counters: readonly SceneCounter[];
  readonly onCreate: (input: Omit<CreateSceneCounterInput, "id">) => void;
  readonly onUpdate: (id: string, input: UpdateSceneCounterInput) => void;
  readonly onDelete: (id: string) => void;
  readonly onClose: () => void;
}

interface CounterDraft {
  readonly label: string;
  readonly mode: SceneCounterMode;
  readonly kind: SceneCounterKind;
  readonly capacity: string;
  readonly value: string;
  readonly isVisibleToPlayers: boolean;
  readonly isLabelVisibleToPlayers: boolean;
}

const newDraft = (): CounterDraft => ({
  label: "",
  mode: "progress",
  kind: "fixed",
  capacity: "4",
  value: "0",
  isVisibleToPlayers: false,
  isLabelVisibleToPlayers: false
});

export function SceneCounterManagerModal({
  counters,
  onCreate,
  onUpdate,
  onDelete,
  onClose
}: SceneCounterManagerModalProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CounterDraft>(newDraft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const selected = counters.find((counter) => counter.id === selectedId) ?? null;
    if (selected === null) {
      setSelectedId(null);
      setDraft(newDraft());
      return;
    }
    setDraft(toDraft(selected));
  }, [counters, selectedId]);

  const isNew = selectedId === null;

  function selectNew(): void {
    setSelectedId(null);
    setDraft(newDraft());
    setError(null);
  }

  function save(): void {
    try {
      const input = toInput(draft);
      if (isNew) {
        onCreate({ ...input, initialValue: input.value });
      } else {
        onUpdate(selectedId, input);
      }
      setError(null);
      if (isNew) selectNew();
    } catch (caught) {
      setError(caught instanceof SceneCounterError ? caught.message : "No fue posible guardar el contador.");
    }
  }

  function remove(): void {
    if (selectedId === null) return;
    const counter = counters.find((candidate) => candidate.id === selectedId);
    if (counter === undefined || !window.confirm(`Eliminar el contador "${counter.label}"?`)) return;
    onDelete(selectedId);
    selectNew();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="scene-counter-manager" role="dialog" aria-modal="true" aria-labelledby="scene-counter-manager-title" onClick={(event) => event.stopPropagation()}>
        <header className="scene-counter-manager__header">
          <div>
            <small>Escena</small>
            <h2 id="scene-counter-manager-title">Contadores</h2>
          </div>
          <button type="button" className="scene-counter-manager__close" onClick={onClose} aria-label="Cerrar contadores"><X aria-hidden="true" /></button>
        </header>
        <div className="scene-counter-manager__body">
          <aside className="scene-counter-manager__list" aria-label="Contadores existentes">
            {counters.map((counter) => (
              <button
                key={counter.id}
                type="button"
                className={counter.id === selectedId ? "is-active" : ""}
                onClick={() => { setSelectedId(counter.id); setError(null); }}
              >
                <strong>{counter.label}</strong>
                <span>{counter.mode === "countdown" ? "Countdown" : "Progreso"} · {counter.value}</span>
              </button>
            ))}
            <button type="button" className="scene-counter-manager__new" onClick={selectNew}>
              <Plus size={15} aria-hidden="true" /> Nuevo contador
            </button>
          </aside>
          <div className="scene-counter-manager__form">
            <label>
              Etiqueta
              <input value={draft.label} maxLength={120} autoFocus={isNew} onChange={(event) => setDraft({ ...draft, label: event.currentTarget.value })} />
            </label>
            <div className="scene-counter-manager__field-row">
              <label>
                Direccion
                <select value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.currentTarget.value as SceneCounterMode })}>
                  <option value="progress">Progreso</option>
                  <option value="countdown">Countdown</option>
                </select>
              </label>
              <label>
                Tipo
                <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.currentTarget.value as SceneCounterKind })}>
                  <option value="fixed">Con espacios</option>
                  <option value="dynamic">Dinamico</option>
                </select>
              </label>
            </div>
            <div className="scene-counter-manager__field-row">
              {draft.kind === "fixed" ? (
                <label>
                  Espacios
                  <input type="number" min="1" step="1" value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: event.currentTarget.value })} />
                </label>
              ) : null}
              {!isNew || draft.kind === "dynamic" ? (
                <label>
                  {isNew ? "Valor inicial" : "Valor"}
                  <input type="number" min="0" step="1" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.currentTarget.value })} />
                </label>
              ) : null}
            </div>
            {error !== null ? <p className="form-error">{error}</p> : null}
            <footer className="scene-counter-manager__footer">
              {!isNew ? <button type="button" className="is-danger" onClick={remove}><Trash2 size={15} aria-hidden="true" /> Eliminar</button> : <span />}
              <button type="button" className="is-primary" onClick={save}>{isNew ? "Crear contador" : "Guardar cambios"}</button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}

function toDraft(counter: SceneCounter): CounterDraft {
  return {
    label: counter.label,
    mode: counter.mode,
    kind: counter.kind,
    capacity: String(counter.capacity ?? 4),
    value: String(counter.value),
    isVisibleToPlayers: counter.isVisibleToPlayers,
    isLabelVisibleToPlayers: counter.isLabelVisibleToPlayers
  };
}

function toInput(draft: CounterDraft): Omit<CreateSceneCounterInput, "id"> & UpdateSceneCounterInput {
  const capacity = Number(draft.capacity);
  const value = Number(draft.value);
  if (!Number.isInteger(value) || value < 0) throw new SceneCounterError("El valor debe ser un entero igual o mayor a cero.");
  if (draft.kind === "fixed" && (!Number.isInteger(capacity) || capacity < 1)) {
    throw new SceneCounterError("Los espacios deben ser un entero mayor a cero.");
  }
  return {
    label: draft.label,
    mode: draft.mode,
    kind: draft.kind,
    value,
    ...(draft.kind === "fixed" ? { capacity } : {}),
    isVisibleToPlayers: draft.isVisibleToPlayers,
    isLabelVisibleToPlayers: draft.isLabelVisibleToPlayers
  };
}
