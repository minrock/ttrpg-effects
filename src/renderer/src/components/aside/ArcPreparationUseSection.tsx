import { useEffect, useState } from "react";
import { useTtrpgClient } from "../../client/ClientProvider";
import type { CampaignSelection, ScenePreparationReservationDto } from "../../../../shared/contracts/campaigns";
import { failureMessage } from "../../../../web/service-model";

/** Consulta y uso táctico: la ficha permanente se edita desde el panel del arco. */
export function ArcPreparationUseSection({ selection, onUse, unavailableMessage }: { readonly selection?: CampaignSelection; readonly onUse?: (reservation: ScenePreparationReservationDto) => void; readonly unavailableMessage?: string }) {
  const client = useTtrpgClient();
  const [items, setItems] = useState<readonly import("../../../../shared/contracts/campaigns").PreparedEntityDto[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [busyId, setBusyId] = useState<string | null>(null);
  const arcPreparation = client?.arcPreparation;
  useEffect(() => {
    let live = true;
    if (!selection || !onUse) { setLoading(false); setError(""); return () => { live = false; }; }
    if (!arcPreparation) { setLoading(false); setError("La preparación del arco no está disponible en este cliente."); return () => { live = false; }; }
    setLoading(true); setError("");
    void (async () => {
      const all: import("../../../../shared/contracts/campaigns").PreparedEntityDto[] = [];
      let offset = 0;
      while (live) {
        const page = await arcPreparation.list({ campaignId: selection.campaignId, arcId: selection.arcId }, { limit: 100, offset });
        all.push(...page.items);
        offset += page.items.length;
        if (offset >= page.total || page.items.length === 0) break;
      }
      if (live) setItems(all);
    })().catch(cause => { if (live) setError(failureMessage(cause)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [arcPreparation, onUse, selection?.arcId, selection?.campaignId]);
  const usePrepared = async (preparedId: string) => {
    if (!arcPreparation || !selection || !onUse) return;
    setBusyId(preparedId); setError("");
    try { onUse(await arcPreparation.reserve(selection, preparedId, crypto.randomUUID())); }
    catch (cause) { setError(failureMessage(cause)); }
    finally { setBusyId(null); }
  };
  const unavailable = !selection || !onUse;
  return <section className="interface-explorer-section" aria-labelledby="arc-prepared-title"><h3 id="arc-prepared-title">Preparados en el arco</h3><p className="interface-explorer-hint">Estas fichas son permanentes. Usarlas crea una instancia independiente en esta escena.</p>{unavailable ? <p role="status">{unavailableMessage ?? "Guarda la escena antes de usar una ficha preparada."}</p> : loading ? <p role="status">Cargando preparación…</p> : error ? <p role="alert">{error}</p> : items.length === 0 ? <p>No hay fichas preparadas para este arco.</p> : <ul className="interface-explorer-list">{items.map(item => <li key={item.id}><strong>{item.name}</strong><span>{item.kind === "monster" ? "Monstruo" : "NPC"}</span><button disabled={busyId !== null} onClick={() => void usePrepared(item.id)}>{busyId === item.id ? "Reservando…" : "Usar en esta escena"}</button></li>)}</ul>}</section>;
}
