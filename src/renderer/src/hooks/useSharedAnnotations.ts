import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTtrpgClient } from "../client/ClientProvider";
import { shapeAnnotationGeometry, type AnnotationCommand, type AnnotationView, type SharedAnnotation } from "../../../shared/contracts/shared-annotations";
import type { SceneShape } from "../../../domain/sessions/scene-document";
const empty: AnnotationView = { connected: false, supported: false, state: null, snapshot: null, context: null, error: "" };
const noopSubscribe = () => () => {};
export const annotationShape = (item: SharedAnnotation): SceneShape => ({ ...item.geometry, id: `shared-${item.id}` });
export const annotationId = (id: string) => id.replace(/^shared-/, "");
export function useSharedAnnotations() {
  const api = useTtrpgClient()?.annotations;
  const view = useSyncExternalStore(api?.subscribe ?? noopSubscribe, api?.getSnapshot ?? (() => empty));
  const [pending, setPending] = useState<ReadonlyMap<string, SceneShape | null>>(new Map());
  const [error, setError] = useState("");
  const current = useRef({ api, view }); current.current = { api, view };
  const version = useRef(0), chain = useRef(Promise.resolve());
  const preview = useRef<AnnotationCommand | null>(null), previewBusy = useRef(false), lastPreview = useRef(0), lastPreviewValue = useRef("");
  const pendingVersions = useRef(new Map<string, number>()), pendingCounter = useRef(0);
  useEffect(() => {
    version.current++; preview.current = null; pendingVersions.current.clear(); setPending(new Map()); setError(""); chain.current = Promise.resolve();
  }, [view.context, view.connected, api]);
  const run = useCallback((command: AnnotationCommand) => {
    const { api } = current.current; const view = api?.getSnapshot() ?? empty;
    if (!api || !view.connected || !view.supported) return Promise.reject(new Error("Espera la conexión para compartir dibujos."));
    return api.command(command);
  }, []);
  useEffect(() => {
    if (!api || !view.connected || !view.supported) return;
    const timer = setInterval(() => {
      if (previewBusy.current || !preview.current || Date.now() - lastPreview.current < 120) return;
      const encoded = JSON.stringify(preview.current);
      if (encoded === lastPreviewValue.current && Date.now() - lastPreview.current < 1000) return;
      lastPreviewValue.current = encoded;
      const value = preview.current, generation = version.current; previewBusy.current = true; lastPreview.current = Date.now();
      void run(value).catch(e => { if (generation === version.current) { preview.current = null; setError(e instanceof Error ? e.message : "No se pudo compartir el borrador."); } }).finally(() => { previewBusy.current = false; });
    }, 125);
    return () => clearInterval(timer);
  }, [api, view.connected, view.supported, run]);
  const cancel = useCallback(() => {
    const hadPreview = preview.current !== null; preview.current = null;
    if (hadPreview && current.current.view.connected) void run({ action: "cancel-preview" }).catch(() => {});
  }, [run]);
  const showPreview = useCallback((shape: SceneShape | null) => {
    if (!shape) { cancel(); return; }
    const id = annotationId(shape.id);
    let geometry; try { geometry = shapeAnnotationGeometry(shape); } catch { return; }
    if (!current.current.view.connected || !current.current.view.supported) return;
    const item = current.current.api?.getSnapshot().state?.items.find(i => i.id === id);
    if (item && item.author.publicId !== current.current.view.state?.self) return;
    preview.current = { action: "preview", id, revision: item?.revision ?? 0, geometry };
  }, [cancel]);
  const save = useCallback((shape: SceneShape) => {
    const generation = version.current, id = annotationId(shape.id), ticket = ++pendingCounter.current;
    preview.current = null; pendingVersions.current.set(id, ticket);
    setPending(p => new Map(p).set(id, shape)); setError("");
    chain.current = chain.current.catch(() => {}).then(async () => {
      if (generation !== version.current || pendingVersions.current.get(id) !== ticket) return;
      const geometry = shapeAnnotationGeometry(shape), item = current.current.api?.getSnapshot().state?.items.find(i => i.id === id);
      await run(item && item.revision > 0 ? { action: "update", id, revision: item.revision, geometry } : { action: "create", id, geometry });
    }).catch(e => { if (generation === version.current) setError(e instanceof Error ? e.message : "No se pudo guardar el dibujo."); }).finally(() => {
      if (generation === version.current && pendingVersions.current.get(id) === ticket) { pendingVersions.current.delete(id); setPending(p => { const next = new Map(p); next.delete(id); return next; }); }
    });
  }, [run]);
  const remove = useCallback((shapeId: string) => {
    const id = annotationId(shapeId), generation = version.current; preview.current = null;
    pendingVersions.current.delete(id); setPending(p => new Map(p).set(id, null));
    chain.current = chain.current.catch(() => {}).then(async () => {
      if (generation !== version.current) return;
      const item = current.current.api?.getSnapshot().state?.items.find(i => i.id === id);
      if (item && item.revision > 0) await run({ action: "delete", id, revision: item.revision });
      else await run({ action: "cancel-preview" });
    }).catch(e => { if (generation === version.current) setError(e instanceof Error ? e.message : "No se pudo borrar el dibujo."); }).finally(() => { if (generation === version.current) setPending(p => { const next = new Map(p); next.delete(id); return next; }); });
  }, [run]);
  const clear = useCallback(() => {
    preview.current = null; pendingVersions.current.clear();
    const generation = version.current;
    chain.current = chain.current.catch(() => {}).then(async () => { if (generation === version.current) await run({ action: "clear-own" }); }).catch(e => { if (generation === version.current) setError(e.message); });
  }, [run]);
  const [expiryTick, tickExpiry] = useState(0);
  const received = useRef({ state: view.state, at: Date.now() });
  if (received.current.state !== view.state) received.current = { state: view.state, at: Date.now() };
  useEffect(() => {
    if (!view.state?.items.some(item => item.preview)) return;
    const timer = setInterval(() => tickExpiry(value => value + 1), 125);
    return () => clearInterval(timer);
  }, [view.state]);
  const items = useMemo(() => {
    const elapsed = Date.now() - received.current.at;
    return (view.state?.items ?? []).flatMap(item => {
      if (!item.preview || (item.expiresAt ?? 0) - (view.state?.serverTime ?? 0) > elapsed) return [item];
      return item.committedGeometry ? [{ ...item, geometry: item.committedGeometry, preview: false, measurementLabel: undefined }] : [];
    });
  }, [view.state, expiryTick]);
  const owned = useMemo(() => {
    const own = new Map(items.filter(i => i.author.publicId === view.state?.self && (!i.preview || i.revision > 0)).map(i => [i.id, { ...annotationShape(i), ...(i.committedGeometry ?? {}) }]));
    // No reproducir el eco del gesto remoto encima del preview Pixi local.
    for (const [id, shape] of pending) { if (shape) own.set(id, shape); else own.delete(id); }
    return [...own.values()];
  }, [items, view.state?.self, pending]);
  const bridge = useMemo(() => api ? { shapes: owned, enabled: view.connected && view.supported, save, remove, clear, cancel } : undefined, [api, owned, view.connected, view.supported, save, remove, clear, cancel]);
  const presentedView = useMemo(() => view.state ? { ...view, state: { ...view.state, items } } : view, [view, items]);
  return { api, view: presentedView, items, owned, bridge, showPreview, cancel, error: error || view.error };
}
