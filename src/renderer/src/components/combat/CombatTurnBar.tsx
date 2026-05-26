import { useEffect, useMemo, useState, type JSX } from "react";
import {
  getNextActiveParticipant,
  isParticipantActiveInRound,
  type CombatParticipant,
  type CombatTracker
} from "../../../../domain/combat/combat-tracker";

interface CombatTurnBarProps {
  readonly tracker: CombatTracker;
  readonly viewRole: "dm" | "player";
  readonly onNextTurn?: () => void;
  readonly onEditCombat?: () => void;
  readonly onEndCombat?: () => void;
  readonly onToggleDefeated?: (participantId: string, defeated: boolean) => void;
}

export function CombatTurnBar({
  tracker,
  viewRole,
  onNextTurn,
  onEditCombat,
  onEndCombat,
  onToggleDefeated
}: CombatTurnBarProps): JSX.Element | null {
  const nextParticipant = useMemo(() => getNextActiveParticipant(tracker), [tracker]);
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  if (!tracker.active) {
    return null;
  }

  return (
    <section className="combat-turn-bar" aria-label="Turnero de combate">
      <div className="combat-turn-bar__meta">
        <strong>Ronda {tracker.round}</strong>
        <span>{tracker.participants.length} participantes</span>
      </div>
      <div className="combat-turn-bar__participants">
        {tracker.participants.map((participant) => (
          <CombatTurnParticipant
            key={participant.id}
            participant={participant}
            round={tracker.round}
            isCurrent={participant.id === tracker.currentParticipantId}
            isNext={participant.id === nextParticipant?.id}
            viewRole={viewRole}
            isExpanded={viewRole === "dm" && expandedParticipantId === participant.id}
            onToggleExpanded={() => {
              if (viewRole === "dm") {
                setExpandedParticipantId((current) => (
                  current === participant.id ? null : participant.id
                ));
              }
            }}
            onToggleDefeated={onToggleDefeated}
          />
        ))}
      </div>
      {viewRole === "dm" ? (
        <div className="combat-turn-bar__actions">
          <button type="button" onClick={onNextTurn}>
            Siguiente
          </button>
          <button type="button" onClick={onEditCombat}>
            Editar
          </button>
          <button type="button" className="is-danger" onClick={onEndCombat}>
            Finalizar
          </button>
        </div>
      ) : null}
    </section>
  );
}

interface CombatTurnParticipantProps {
  readonly participant: CombatParticipant;
  readonly round: number;
  readonly isCurrent: boolean;
  readonly isNext: boolean;
  readonly isExpanded: boolean;
  readonly viewRole: "dm" | "player";
  readonly onToggleExpanded: () => void;
  readonly onToggleDefeated?: (participantId: string, defeated: boolean) => void;
}

function CombatTurnParticipant({
  participant,
  round,
  isCurrent,
  isNext,
  isExpanded,
  viewRole,
  onToggleExpanded,
  onToggleDefeated
}: CombatTurnParticipantProps): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const isPending = participant.activeFromRound > round;
  const isActive = isParticipantActiveInRound(participant, round);

  useEffect(() => {
    let mounted = true;
    if (participant.imagePath === null) {
      setImageUrl(null);
      return () => {
        mounted = false;
      };
    }

    void window.ttrpg?.resolveAsideUrl(participant.imagePath).then((url) => {
      if (mounted) {
        setImageUrl(url ?? null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [participant.imagePath]);

  const className = [
    "combat-turn-card",
    isCurrent ? "is-current" : "",
    isNext && isActive ? "is-next" : "",
    participant.defeated ? "is-defeated" : "",
    isPending ? "is-pending" : "",
    isExpanded ? "is-expanded" : ""
  ].filter(Boolean).join(" ");

  return (
    <article className={className} aria-label={participant.name}>
      <button
        type="button"
        className="combat-turn-card__avatar"
        title={participant.name}
        aria-expanded={viewRole === "dm" ? isExpanded : undefined}
        onClick={viewRole === "dm" ? onToggleExpanded : undefined}
      >
        {imageUrl === null ? (
          <span>{getParticipantInitial(participant.name)}</span>
        ) : (
          <img src={imageUrl} alt="" />
        )}
        <small aria-label={`Iniciativa ${participant.initiative}`}>{participant.initiative}</small>
      </button>
      <span className="combat-turn-card__tooltip" role="tooltip">
        {participant.name}
      </span>
      {isPending ? <span className="combat-turn-card__pending">R{participant.activeFromRound}</span> : null}
      {viewRole === "dm" && isExpanded ? (
        <div className="combat-turn-card__expanded">
          <strong>{participant.name}</strong>
          <button
            type="button"
            className="combat-turn-card__toggle"
            onClick={(event) => {
              event.stopPropagation();
              onToggleDefeated?.(participant.id, !participant.defeated);
            }}
          >
            {participant.defeated ? "↩ Reincorporar" : "🗑 Eliminar"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function getParticipantInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
