import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DiceResult } from "../../../../domain/dice/dice";

export type DicePublicActor = { readonly id: string; readonly label: string };
export type DicePublicActivity = {
  readonly rollId: string;
  readonly author: DicePublicActor;
  readonly phase: "preparing" | "rolling" | "settled";
  readonly settledAt?: number;
  readonly result: DiceResult | null;
};

/** Estado persistente fuera del canvas y del historial; sigue disponible al cambiar de pestaña. */
export function DicePublicStatus({ activity, selfAuthorId, closeAny, connected = true, pendingDismissId, dismissError, onDismiss }: {
  readonly activity: DicePublicActivity | null;
  readonly selfAuthorId: string | null;
  readonly closeAny: boolean;
  readonly connected?: boolean;
  readonly pendingDismissId?: string | null;
  readonly dismissError?: string | null;
  readonly onDismiss: (rollId: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activity?.settledAt || activity.phase !== "settled") return;
    const receivedAt = Date.now();
    // El bootstrap puede llegar después del montaje: actualiza también cuando la
    // pose ya está asentada, para no conservar un reloj previo como "rodando".
    setNow(receivedAt);
    const wait = activity.settledAt - receivedAt;
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), wait + 10);
    return () => window.clearTimeout(timer);
  }, [activity?.phase, activity?.rollId, activity?.settledAt]);
  if (!activity) return null;
  const canClose = closeAny || activity.author.id === selfAuthorId;
  const isOwner = activity.author.id === selfAuthorId;
  const closing = pendingDismissId === activity.rollId;
  const replayRolling = activity.phase === "settled" && activity.settledAt !== undefined && now < activity.settledAt;
  const phase = activity.phase === "preparing" ? "Preparando tirada" : activity.phase === "rolling" || replayRolling ? "Tirada rodando" : "Tirada en pantalla";
  return <section className="dice-public-status" aria-label="Estado de la tirada pública">
    <div className="dice-public-status__heading"><strong>{phase}</strong><span>{activity.author.label} · Pública</span></div>
    {canClose && <button type="button" className="dice-close-presentation" disabled={closing || !connected} onClick={() => onDismiss(activity.rollId)} aria-label={isOwner ? "Cerrar mi tirada" : `Cerrar tirada de ${activity.author.label}`}><X size={16} aria-hidden="true" />{closing ? "Cerrando…" : isOwner ? "Cerrar mi tirada" : `Cerrar tirada de ${activity.author.label}`}</button>}
    {!connected && canClose && <p className="dice-status" role="status">Reconecta para cerrar la tirada.</p>}
    {dismissError && <p className="dice-error" role="alert">{dismissError}</p>}
  </section>;
}
