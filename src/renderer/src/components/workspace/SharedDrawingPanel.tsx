import { PublishedDrawingPreview } from "./PublishedDrawingPreview";
import { useCallback, useEffect, useState } from "react";
import type { SharedAnnotationsClient, AnnotationView } from "../../../../shared/contracts/shared-annotations";
import "./shared-drawings.css";
export function SharedDrawingPanel({ api, view, aligned, player = false }: { api: SharedAnnotationsClient; view: AnnotationView; aligned: boolean; player?: boolean }) {
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const closePreview = useCallback(() => setPreview(false), []);
  useEffect(() => { setConfirm(false); setPreview(false); setError(""); }, [view.context, view.connected]);
  const items = view.state?.items ?? [];
  const available = view.connected && view.supported;
  const perform = async (work: () => Promise<void>) => { setBusy(true); setError(""); try { await work(); setConfirm(false); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo retirar el dibujo."); } finally { setBusy(false); } };
  return <aside className={`shared-drawings${player ? " shared-drawings--player" : ""}`} onKeyDown={event => { if (event.key !== "Escape" || confirm || preview) event.stopPropagation(); if (event.key === "Escape") setConfirm(false); }}>
    {preview && <PublishedDrawingPreview view={view} close={closePreview}/>}
    <details><summary>{player ? "Visible para la mesa" : "Dibujos de jugadores"} · {items.length}</summary>
      <p role="status">{!view.connected ? "Reconectando; dibujo compartido no disponible." : !view.supported ? "Este servicio requiere actualizarse para compartir dibujos." : aligned ? "Las mediciones y áreas son visibles para toda la mesa." : "Dibujos en el mapa publicado. Abre su vista sin modificar tu borrador."}</p>
      {!player && !aligned && view.snapshot && <button disabled={!available} onClick={() => setPreview(true)}>Ver mapa publicado</button>}
      {items.map(item => <div key={item.id} className="shared-drawings__item"><span tabIndex={0} title={item.author.alias}>{item.author.alias} #{item.author.discriminator} · {item.geometry.type === "measurement" ? "Medición" : item.geometry.type === "path" ? "Camino" : "Área"}{item.preview ? " · dibujando" : ""}</span>
        {(!player || item.author.publicId === view.state?.self) && item.revision > 0 && <button disabled={!available || busy} aria-label={`Retirar dibujo de ${item.author.alias} #${item.author.discriminator}`} onClick={() => void perform(() => api.command({ action: "delete", id: item.id, revision: item.revision }))}>Retirar</button>}</div>)}
      {!player && items.length > 0 && (confirm ? <div role="group" aria-label="Confirmar limpieza de dibujos"><p>Se retirarán los dibujos de jugadores. La escena guardada no cambia.</p><button autoFocus disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button><button disabled={!available || busy} onClick={() => void perform(() => api.command({ action: "clear-all" }))}>Confirmar limpieza</button></div> : <button disabled={!available || busy} onClick={() => setConfirm(true)}>Limpiar dibujos de jugadores</button>)}
      <p role="alert">{error || view.error}</p>
    </details>
  </aside>;
}
