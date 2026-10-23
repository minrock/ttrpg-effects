import { ImageUp, X } from "lucide-react";
import { useEffect, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import type { MapImageReplacementPolicy } from "../../../../domain/map/map-image-replacement";
import type { MapImageDimensions } from "../../../../domain/map/map-image";
import type { ReplacementDraft } from "../../hooks/useMapImageReplacement";

interface Props {
  readonly draft: ReplacementDraft;
  readonly error: string | null;
  readonly onConfirm: (policy: MapImageReplacementPolicy) => void;
  readonly onCancel: () => void;
}

export function ReplaceMapImageModal({ draft, error, onConfirm, onCancel }: Props): JSX.Element {
  const [policy, setPolicy] = useState<MapImageReplacementPolicy>(draft.preserveError === null ? "preserve-world-size" : "keep-scale");
  const [acknowledged, setAcknowledged] = useState(false);
  const dialog = useRef<HTMLElement | null>(null);
  const needsAcknowledgement = policy === "keep-scale" && (
    draft.previous.imageSize?.width !== draft.imageSize.width || draft.previous.imageSize?.height !== draft.imageSize.height
  );

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent): void {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); onCancel(); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex='0']") ?? []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => { document.removeEventListener("keydown", onKeyDown, true); previousFocus?.focus(); };
  }, [onCancel]);

  return createPortal(
    <div className="modal-backdrop map-image-replacement-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section ref={dialog} className="map-image-replacement" role="dialog" aria-modal="true" aria-labelledby="replace-map-title">
        <header>
          <div><h2 id="replace-map-title">Actualizar imagen</h2><p>{draft.mapName}</p></div>
          <button type="button" className="map-image-replacement__close" aria-label="Cancelar actualizacion" title="Cancelar" onClick={onCancel}><X aria-hidden="true" /></button>
        </header>
        <div className="map-image-replacement__previews">
          <ImagePreview label="Actual" url={draft.previousUrl} path={draft.previous.imagePath} size={draft.previous.imageSize} />
          <ImagePreview label="Nueva" url={draft.previewUrl ?? draft.imageUrl} path={draft.imagePath} size={draft.imageSize} />
        </div>
        <fieldset>
          <legend>Tamano del mapa</legend>
          <label><input type="radio" name="image-size-policy" checked={policy === "preserve-world-size"} disabled={draft.preserveError !== null} onChange={() => { setPolicy("preserve-world-size"); setAcknowledged(false); }} />Conservar tamano actual</label>
          <label><input type="radio" name="image-size-policy" checked={policy === "keep-scale"} onChange={() => { setPolicy("keep-scale"); setAcknowledged(false); }} />Mantener escala actual ({Number((draft.previous.scale * 100).toFixed(2))}%)</label>
        </fieldset>
        {draft.preserveError !== null && <p className="map-image-replacement__warning" role="status">{draft.preserveError}</p>}
        {needsAcknowledgement && <label className="map-image-replacement__acknowledge"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.currentTarget.checked)} />Acepto que el fondo cambie de tamano y pueda quedar desalineado con los marcadores.</label>}
        {error !== null && <p role="alert" className="map-image-replacement__warning">{error}</p>}
        <footer>
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="map-image-replacement__apply" disabled={needsAcknowledgement && !acknowledged} onClick={() => onConfirm(policy)}><ImageUp aria-hidden="true" />Actualizar imagen</button>
        </footer>
      </section>
    </div>, document.body
  );
}

function ImagePreview({ label, url, path, size }: { label: string; url: string | null; path: string | null; size?: MapImageDimensions }): JSX.Element {
  const [failed, setFailed] = useState(false);
  return <figure>
    <figcaption>{label}</figcaption>
    <div className="map-image-replacement__image">
      {url !== null && !failed ? <img src={url} alt={`${label}: ${path?.split(/[\\/]/).at(-1) ?? "mapa"}`} onError={() => setFailed(true)} /> : <span>Imagen no disponible</span>}
    </div>
    <strong title={path ?? undefined}>{path?.split(/[\\/]/).at(-1) ?? "Sin archivo"}</strong>
    <small>{size ? `${size.width} x ${size.height} px` : "Dimensiones desconocidas"}</small>
  </figure>;
}
