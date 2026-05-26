import { useEffect, useMemo, useState, type DragEvent, type JSX } from "react";
import {
  CombatTrackerError,
  createCombatCandidates,
  createCombatParticipant,
  startCombat,
  type CombatCandidate,
  type CombatParticipant,
  type CombatTracker
} from "../../../../domain/combat/combat-tracker";
import type { SceneAside } from "../../../../domain/sessions/scene-aside";

interface CombatSetupModalProps {
  readonly aside: SceneAside;
  readonly tracker: CombatTracker;
  readonly onStart: (tracker: CombatTracker) => void;
  readonly onUpdate: (tracker: CombatTracker) => void;
  readonly onClose: () => void;
}

type DragPayload =
  | { readonly kind: "candidate"; readonly id: string }
  | { readonly kind: "participant"; readonly id: string };

const dragMimeType = "application/x-ttrpg-combat";

export function CombatSetupModal({
  aside,
  tracker,
  onStart,
  onUpdate,
  onClose
}: CombatSetupModalProps): JSX.Element {
  const candidates = useMemo(() => createCombatCandidates(aside), [aside]);
  const [draft, setDraft] = useState<readonly CombatParticipant[]>(() => tracker.participants);
  const [error, setError] = useState<string | null>(null);
  const isActiveCombat = tracker.active;

  useEffect(() => {
    setDraft(tracker.participants);
  }, [tracker]);

  const selectedKeys = useMemo(
    () => new Set(draft.map((participant) => `${participant.entityType}:${participant.entityId}`)),
    [draft]
  );
  const canStart = draft.length >= 2;

  const addCandidate = (candidate: CombatCandidate): void => {
    const key = `${candidate.entityType}:${candidate.entityId}`;
    if (selectedKeys.has(key)) return;
    setDraft((current) => [
      ...current,
      createCombatParticipant(candidate, 0, {
        enteredRound: isActiveCombat ? tracker.round : 0,
        activeFromRound: isActiveCombat ? tracker.round + 1 : 0
      })
    ]);
    setError(null);
  };

  const removeParticipant = (participantId: string): void => {
    setDraft((current) => current.filter((participant) => participant.id !== participantId));
  };

  const moveParticipant = (participantId: string, direction: -1 | 1): void => {
    setDraft((current) => {
      const index = current.findIndex((participant) => participant.id === participantId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [participant] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, participant);
      return copy;
    });
  };

  const reorderParticipant = (participantId: string, targetId: string): void => {
    if (participantId === targetId) return;
    setDraft((current) => {
      const fromIndex = current.findIndex((participant) => participant.id === participantId);
      const toIndex = current.findIndex((participant) => participant.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const copy = [...current];
      const [participant] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, participant);
      return copy;
    });
  };

  const updateInitiative = (participantId: string, initiative: number): void => {
    setDraft((current) =>
      current.map((participant) =>
        participant.id === participantId ? { ...participant, initiative } : participant
      )
    );
  };

  const handleDropOnTurner = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const payload = readDragPayload(event);
    if (payload?.kind !== "candidate") return;
    const candidate = candidates.find((item) => item.id === payload.id);
    if (candidate !== undefined) {
      addCandidate(candidate);
    }
  };

  const handleDropOnParticipant = (
    event: DragEvent<HTMLElement>,
    targetParticipantId: string
  ): void => {
    event.preventDefault();
    const payload = readDragPayload(event);
    if (payload?.kind === "participant") {
      reorderParticipant(payload.id, targetParticipantId);
      return;
    }
    if (payload?.kind === "candidate") {
      const candidate = candidates.find((item) => item.id === payload.id);
      if (candidate === undefined) return;
      const participant = createCombatParticipant(candidate, 0, {
        enteredRound: isActiveCombat ? tracker.round : 0,
        activeFromRound: isActiveCombat ? tracker.round + 1 : 0
      });
      if (selectedKeys.has(`${participant.entityType}:${participant.entityId}`)) return;
      setDraft((current) => {
        const targetIndex = current.findIndex((item) => item.id === targetParticipantId);
        if (targetIndex < 0) return [...current, participant];
        const copy = [...current];
        copy.splice(targetIndex, 0, participant);
        return copy;
      });
    }
  };

  const handleSubmit = (): void => {
    setError(null);
    try {
      if (!isActiveCombat) {
        onStart(startCombat(draft));
        onClose();
        return;
      }

      const currentParticipantExists = draft.some((participant) => participant.id === tracker.currentParticipantId);
      const fallbackCurrent = draft.find((participant) => (
        !participant.defeated && participant.activeFromRound <= tracker.round
      ))?.id ?? null;
      onUpdate({
        ...tracker,
        participants: draft,
        currentParticipantId: currentParticipantExists ? tracker.currentParticipantId : fallbackCurrent
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof CombatTrackerError ? caught.message : "No se pudo guardar la batalla.");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="combat-setup-modal" role="dialog" aria-modal="true" aria-label="Configurar batalla">
        <header className="combat-setup-modal__header">
          <div>
            <h2>{isActiveCombat ? "Editar batalla" : "Iniciar batalla"}</h2>
            <p>
              Arrastra entidades al turnero, captura iniciativa y ordena manualmente los empates.
            </p>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </header>

        <div className="combat-setup-modal__body">
          <section className="combat-setup-column" aria-label="Disponibles">
            <h3>Disponibles</h3>
            <div className="combat-candidate-list">
              {candidates.length === 0 ? (
                <p className="combat-empty">No hay monstruos, NPCs o personajes en la escena.</p>
              ) : (
                candidates.map((candidate) => {
                  const isSelected = selectedKeys.has(`${candidate.entityType}:${candidate.entityId}`);
                  return (
                    <article
                      key={candidate.id}
                      className={`combat-candidate${isSelected ? " is-selected" : ""}`}
                      draggable={!isSelected}
                      onDragStart={(event) => writeDragPayload(event, { kind: "candidate", id: candidate.id })}
                    >
                      <ParticipantThumb imagePath={candidate.imagePath} name={candidate.name} />
                      <div>
                        <strong>{candidate.name}</strong>
                        <span>{getParticipantTypeLabel(candidate.entityType)}</span>
                      </div>
                      <button type="button" onClick={() => addCandidate(candidate)} disabled={isSelected}>
                        {isSelected ? "Agregado" : "Agregar"}
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section
            className="combat-setup-column"
            aria-label="Turnero"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnTurner}
          >
            <h3>Turnero ({draft.length})</h3>
            <div className="combat-draft-list">
              {draft.length === 0 ? (
                <p className="combat-empty">Arrastra aqui los participantes de la batalla.</p>
              ) : (
                draft.map((participant, index) => (
                  <article
                    key={participant.id}
                    className="combat-draft-participant"
                    draggable
                    onDragStart={(event) => writeDragPayload(event, { kind: "participant", id: participant.id })}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDropOnParticipant(event, participant.id)}
                  >
                    <span className="combat-draft-participant__order">{index + 1}</span>
                    <ParticipantThumb imagePath={participant.imagePath} name={participant.name} />
                    <div className="combat-draft-participant__main">
                      <strong>{participant.name}</strong>
                      <span>
                        {getParticipantTypeLabel(participant.entityType)}
                        {participant.activeFromRound > tracker.round ? ` · entra ronda ${participant.activeFromRound}` : ""}
                      </span>
                    </div>
                    <label>
                      Iniciativa
                      <input
                        type="number"
                        value={Number.isFinite(participant.initiative) ? participant.initiative : 0}
                        onChange={(event) => updateInitiative(participant.id, Number(event.target.value))}
                      />
                    </label>
                    <div className="combat-draft-participant__actions">
                      <button type="button" onClick={() => moveParticipant(participant.id, -1)} disabled={index === 0}>↑</button>
                      <button type="button" onClick={() => moveParticipant(participant.id, 1)} disabled={index === draft.length - 1}>↓</button>
                      <button type="button" onClick={() => removeParticipant(participant.id)}>Quitar</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {error !== null ? <p className="combat-setup-modal__error">{error}</p> : null}
        <footer className="combat-setup-modal__footer">
          <span>{canStart ? "Listo para guardar." : "Necesitas al menos dos participantes."}</span>
          <button type="button" onClick={handleSubmit} disabled={!canStart}>
            {isActiveCombat ? "Guardar batalla" : "Iniciar batalla"}
          </button>
        </footer>
      </section>
    </div>
  );
}

interface ParticipantThumbProps {
  readonly imagePath: string | null;
  readonly name: string;
}

function ParticipantThumb({ imagePath, name }: ParticipantThumbProps): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (imagePath === null) {
      setImageUrl(null);
      return () => {
        mounted = false;
      };
    }
    void window.ttrpg?.resolveAsideUrl(imagePath).then((url) => {
      if (mounted) {
        setImageUrl(url ?? null);
      }
    });
    return () => {
      mounted = false;
    };
  }, [imagePath]);

  return (
    <div className="combat-participant-thumb" aria-hidden="true">
      {imageUrl === null ? <span>{name.trim().charAt(0).toUpperCase() || "?"}</span> : <img src={imageUrl} alt="" />}
    </div>
  );
}

function writeDragPayload(event: DragEvent<HTMLElement>, payload: DragPayload): void {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(dragMimeType, JSON.stringify(payload));
}

function readDragPayload(event: DragEvent<HTMLElement>): DragPayload | null {
  const raw = event.dataTransfer.getData(dragMimeType);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DragPayload;
    if (parsed.kind === "candidate" || parsed.kind === "participant") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function getParticipantTypeLabel(type: CombatCandidate["entityType"]): string {
  if (type === "monster") return "Monstruo";
  if (type === "npc") return "NPC";
  return "Personaje";
}
