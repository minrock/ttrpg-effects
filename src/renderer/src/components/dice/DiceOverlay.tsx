import { useTtrpgApi } from "../../client/ClientProvider";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type JSX } from "react";
import { X } from "lucide-react";
import type { DiceEnvelope } from "../../../../domain/dice/dice";
import { CRITICAL_CELEBRATION_MS, criticalIsActive } from "../../../../domain/dice/critical";
import type { DiceOverlayRenderer } from "../../../../render/three/dice/DiceOverlayRenderer";
import { DiceResultSummary } from "./DiceResultSummary";
import "./dice.css";

export function DiceOverlay({ envelope, finalFrame = null, size = 1, onDismiss, reportRenderStatus = true }: { envelope: DiceEnvelope; finalFrame?: readonly number[] | null; size?: number; onDismiss?: (rollId: string) => void; reportRenderStatus?: boolean }): JSX.Element {
  const diceApi = useTtrpgApi("dice");
  const host = useRef<HTMLDivElement>(null), renderer = useRef<DiceOverlayRenderer | null>(null);
  const latest = useRef(envelope.presentation); latest.current = envelope.presentation;
  const latestFinalFrame = useRef(finalFrame); latestFinalFrame.current = finalFrame;
  const latestSize = useRef(size); latestSize.current = size;
  const [effectiveSize, setEffectiveSize] = useState(size);
  const summary = useRef<HTMLDivElement>(null);
  const [measuredSummarySpace, setMeasuredSummarySpace] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [failed, setFailed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const value = envelope.presentation;
  const settled = value !== null && now >= value.settledAt;
  useLayoutEffect(() => {
    const element = summary.current;
    if (!element) { setMeasuredSummarySpace(0); return; }
    const measure = (): void => setMeasuredSummarySpace(Math.ceil(element.getBoundingClientRect().height + (parseFloat(getComputedStyle(element).bottom) || 0) + 12));
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [value, settled]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const viewport = host.current?.parentElement;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setViewportWidth(viewport.clientWidth));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (value?.replay || finalFrame) setLoaded(true);
    setNow(Date.now());
    if (!value) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, value.settledAt - Date.now()) + 10);
    const criticalTimer = value.critical ? setTimeout(() => setNow(Date.now()), Math.max(0, value.settledAt + CRITICAL_CELEBRATION_MS - Date.now()) + 10) : undefined;
    return () => { clearTimeout(timer); clearTimeout(criticalTimer); };
  }, [value, finalFrame]);
  useEffect(() => {
    if (!loaded || !host.current) return;
    let cancelled = false;
    const fail = (): void => { if (cancelled) return; setFailed(true); const rollId = latest.current?.rollId; if (reportRenderStatus && rollId) void diceApi?.reportDiceRenderStatus?.(rollId, false); };
    void import("../../../../render/three/dice/DiceOverlayRenderer").then(({ DiceOverlayRenderer: Renderer }) => {
      if (cancelled || !host.current) return;
      renderer.current = new Renderer(host.current, fail, setEffectiveSize);
      renderer.current.setSize(latestSize.current);
      if (latestFinalFrame.current) renderer.current.present(latest.current, latestFinalFrame.current);
      else renderer.current.present(latest.current);
    }).catch(fail);
    return () => { cancelled = true; renderer.current?.dispose(); renderer.current = null; };
  }, [loaded, diceApi, reportRenderStatus]);
  useEffect(() => { renderer.current?.setSize(size); }, [size]);
  // Reduced motion has no rolling RAF; the shared settle time still starts its static celebration.
  useEffect(() => { try { if (finalFrame) renderer.current?.present(value, finalFrame); else renderer.current?.present(value); } catch { setFailed(true); if (reportRenderStatus && value) void diceApi?.reportDiceRenderStatus?.(value.rollId, false); } }, [value, finalFrame, settled, diceApi, reportRenderStatus]);
  const visible = value !== null;
  const groups = value?.result?.groups.length ?? 0;
  const columns = Math.max(1, Math.floor((Math.min(680, viewportWidth - 36) - 18) / 158));
  const modifierSpace = value?.result?.groups.some(group => (group.modifier ?? 0) !== 0) || (value?.result?.d20?.modifier ?? 0) !== 0 ? 20 : 0;
  const summarySpace = Math.max(measuredSummarySpace, Math.max(145, Math.ceil((groups + (value?.result?.d20 ? 1 : 0)) / columns) * ((groups > 3 ? 42 : 60) + modifierSpace) + 112) + (onDismiss ? 28 : 0));
  return <div className={`dice-overlay${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
    <div ref={host} className="dice-overlay-stage" style={{ bottom: summarySpace }} hidden={failed} />
    {visible && (value.replay || finalFrame) && !failed && effectiveSize < size - .005 && <output className="dice-size-limit" aria-label={`Tamano visible ${Math.round(effectiveSize * 100)}%, solicitado ${Math.round(size * 100)}%`}>{Math.round(effectiveSize * 100)}% / {Math.round(size * 100)}%</output>}
    {criticalIsActive(value, now) && <div key={value!.rollId} className="dice-critical-announcement" role="status" aria-live="polite" style={{ animationDuration: `${CRITICAL_CELEBRATION_MS}ms`, animationDelay: `${Math.min(0, value!.settledAt - now)}ms` }}>{"Cr\u00edtico"}</div>}
    {visible && value.result && now >= value.settledAt && <div ref={summary} className={`dice-overlay-summary${onDismiss ? " is-dismissible" : ""}`} style={{ "--dice-summary-columns": Math.min(columns, Math.max(1, groups + (value.result.d20 ? 1 : 0))) } as CSSProperties}>
      {onDismiss && <button type="button" className="dice-overlay-close" aria-label="Cerrar resultados y retirar dados" title="Cerrar resultados y retirar dados" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onDismiss(value.rollId); }}><X size={18} aria-hidden="true" /></button>}
      <div role="status" aria-live="polite"><DiceResultSummary result={value.result} compact={value.result.groups.length > 3} /></div>
    </div>}
  </div>;
}
