import { useCallback, useEffect, useRef, useState, type RefObject, type SetStateAction } from "react";
import { prepareMapImageReplacementUseCase } from "../../../application/use-cases/prepare-map-image-replacement";
import { computeReplacementScale, type MapImageReplacementPolicy } from "../../../domain/map/map-image-replacement";
import type { MapImageDimensions } from "../../../domain/map/map-image";
import type { SceneDocument, SceneMap, SceneMapDocument } from "../../../domain/sessions/scene-document";
import { recordMapImageDimensions, replaceSceneMapImage } from "../../../domain/sessions/scene-map-image";
import { syncActiveMapFromRuntimeFields } from "../../../domain/sessions/scene-maps";
import { prepareMapImageResource, type PreparedMapImageResource } from "../../../render/pixi/map-image-resource";

interface RuntimeImage { readonly imagePath: string; readonly imageUrl: string; readonly decoded?: boolean }

export interface ReplacementDraft {
  readonly mapId: string;
  readonly mapName: string;
  readonly previous: SceneMap;
  readonly previousUrl: string | null;
  readonly imagePath: string;
  readonly imageUrl: string;
  readonly previewUrl: string | null;
  readonly imageSize: MapImageDimensions;
  readonly preserveError: string | null;
}

interface ReplacementJob {
  readonly generation: number;
  readonly mapId: string;
  readonly fingerprint: string;
  readonly leases: PreparedMapImageResource[];
  draft?: ReplacementDraft;
}

interface Options {
  scene: SceneDocument;
  sceneRef: RefObject<SceneDocument>;
  setScene: (value: SetStateAction<SceneDocument>) => void;
  mapImageUrl: string | null;
  setMapImageUrl: (url: string | null) => void;
  onFeedback: (message: string) => void;
  onApplied: () => void;
}

function fingerprint(map: SceneMap): string {
  return JSON.stringify([map.imagePath, map.position.x, map.position.y, map.scale]);
}

export function useMapImageReplacement(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const generation = useRef(0);
  const images = useRef(new Map<string, RuntimeImage>());
  const job = useRef<ReplacementJob | null>(null);
  const appliedLease = useRef<{ mapId: string; imageUrl: string; release: () => void } | null>(null);
  const [draft, setDraft] = useState<ReplacementDraft | null>(null);
  const [busyMapId, setBusyMapId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const cancel = useCallback(() => {
    for (const resource of job.current?.leases ?? []) resource.release();
    job.current = null;
    setDraft(null);
    setBusyMapId(null);
    setError(null);
  }, []);

  const resetSession = useCallback((resolved: Readonly<Record<string, string>> = {}, scene?: SceneDocument) => {
    generation.current++;
    cancel();
    appliedLease.current?.release();
    appliedLease.current = null;
    images.current.clear();
    for (const map of scene?.maps ?? []) {
      const imageUrl = resolved[map.id];
      if (imageUrl && map.map.imagePath) images.current.set(map.id, { imageUrl, imagePath: map.map.imagePath });
    }
    setPlayerError(null);
  }, [cancel]);

  const targetForJob = useCallback((pending: ReplacementJob): SceneMapDocument | null => {
    if (job.current !== pending || generation.current !== pending.generation) return null;
    const current = syncActiveMapFromRuntimeFields(latest.current.sceneRef.current);
    const target = current.maps.find((map) => map.id === pending.mapId);
    return target && fingerprint(target.map) === pending.fingerprint ? target : null;
  }, []);

  useEffect(() => {
    if (job.current !== null && targetForJob(job.current) === null) cancel();
  }, [options.scene, cancel, targetForJob]);

  useEffect(() => {
    const pending = appliedLease.current;
    if (pending && (pending.mapId !== options.scene.activeMapId || pending.imageUrl !== options.mapImageUrl)) {
      pending.release();
      appliedLease.current = null;
    }
  }, [options.scene.activeMapId, options.mapImageUrl]);

  // URLs are runtime identities, scoped by map and scene session. A late resolver
  // must not replace a newer selection, including a replacement at the same path.
  useEffect(() => {
    const { activeMapId, map } = options.scene;
    if (activeMapId === null || map.imagePath === null) return;
    if (options.mapImageUrl !== null) {
      const previous = images.current.get(activeMapId);
      images.current.set(activeMapId, { imagePath: map.imagePath, imageUrl: options.mapImageUrl,
        decoded: previous?.imageUrl === options.mapImageUrl && previous.decoded });
      return;
    }
    const cached = images.current.get(activeMapId);
    if (cached?.imagePath === map.imagePath) {
      latest.current.setMapImageUrl(cached.imageUrl);
      return;
    }
    let cancelled = false;
    const session = generation.current;
    void window.ttrpg?.resolveMapUrl(map.imagePath).then((url) => {
      const current = latest.current.sceneRef.current;
      if (cancelled || session !== generation.current || current.activeMapId !== activeMapId
        || current.map.imagePath !== map.imagePath || latest.current.mapImageUrl !== null) return;
      if (url !== null) {
        images.current.set(activeMapId, { imagePath: map.imagePath!, imageUrl: url });
        latest.current.setMapImageUrl(url);
      }
    }).catch(() => { if (!cancelled) latest.current.onFeedback("No se pudo leer la imagen del mapa."); });
    return () => { cancelled = true; };
  }, [options.scene.activeMapId, options.scene.map.imagePath, options.mapImageUrl]);

  const onImageLoaded = useCallback((loaded: MapImageDimensions & { imagePath: string; imageUrl: string }) => {
    const { sceneRef, setScene, mapImageUrl } = latest.current;
    const current = sceneRef.current;
    if (loaded.imageUrl === mapImageUrl && current.activeMapId !== null) {
      images.current.set(current.activeMapId, { imagePath: loaded.imagePath, imageUrl: loaded.imageUrl, decoded: true });
      setScene((scene) => recordMapImageDimensions(scene, current.activeMapId!, loaded.imagePath, loaded));
    }
    if (appliedLease.current?.imageUrl === loaded.imageUrl) {
      appliedLease.current.release();
      appliedLease.current = null;
    }
  }, []);

  const begin = useCallback(async (mapId: string) => {
    if (job.current !== null) return;
    const api = window.ttrpg;
    const current = syncActiveMapFromRuntimeFields(latest.current.sceneRef.current);
    const target = current.maps.find((map) => map.id === mapId);
    if (!api || !target) return;
    const pending: ReplacementJob = { generation: generation.current, mapId, fingerprint: fingerprint(target.map), leases: [] };
    job.current = pending;
    setBusyMapId(mapId);
    setError(null);
    try {
      const result = await prepareMapImageReplacementUseCase(api);
      if (!targetForJob(pending)) { if (job.current === pending) cancel(); return; }
      if (result.status === "cancelled") { cancel(); return; }
      if (result.status === "error") throw new Error(result.error);
      const resource = await prepareMapImageResource(result.imageUrl);
      pending.leases.push(resource);
      if (!targetForJob(pending)) { resource.release(); if (job.current === pending) cancel(); return; }
      let previous = targetForJob(pending)!.map;
      const original = images.current.get(mapId);
      const samePath = previous.imagePath === result.imagePath;
      let originalUrl = original?.imageUrl ?? null;
      if (samePath && (!original?.decoded || latest.current.sceneRef.current.activeMapId !== mapId
        || latest.current.mapImageUrl !== original.imageUrl)) originalUrl = null;
      let previousUrl: string | null = null;
      if (originalUrl === null && previous.imagePath !== null && previous.imagePath !== result.imagePath) {
        originalUrl = await api.resolveMapUrl(previous.imagePath);
      }
      if (originalUrl !== null) {
        try {
          const old = await prepareMapImageResource(originalUrl);
          pending.leases.push(old);
          previousUrl = old.previewUrl ?? null;
          if (!previous.imageSize) previous = { ...previous, imageSize: { width: old.width, height: old.height } };
        } catch { /* A missing original is recoverable with an explicit scale policy. */ }
      }
      if (!targetForJob(pending)) {
        for (const lease of pending.leases) lease.release();
        if (job.current === pending) cancel();
        return;
      }
      const imageSize = { width: resource.width, height: resource.height };
      let preserveError: string | null = null;
      try { computeReplacementScale(previous, imageSize, "preserve-world-size"); }
      catch (caught) { preserveError = caught instanceof Error ? caught.message : "No se puede conservar el tamano."; }
      const next: ReplacementDraft = {
        mapId, mapName: targetForJob(pending)!.name, previous, previousUrl,
        imagePath: result.imagePath, imageUrl: result.imageUrl, previewUrl: resource.previewUrl ?? null, imageSize, preserveError
      };
      pending.draft = next;
      setDraft(next);
    } catch (caught) {
      if (job.current !== pending) return;
      cancel();
      latest.current.onFeedback(caught instanceof Error ? caught.message : "No se pudo preparar la imagen.");
    }
  }, [cancel, targetForJob]);

  const confirm = useCallback((policy: MapImageReplacementPolicy) => {
    const pending = job.current;
    const candidate = pending?.draft;
    if (!pending || !candidate) return;
    if (!targetForJob(pending)) { cancel(); latest.current.onFeedback("El mapa cambio. Vuelve a seleccionar la imagen."); return; }
    try {
      const current = latest.current.sceneRef.current;
      const withDimensions = candidate.previous.imageSize && candidate.previous.imagePath
        ? recordMapImageDimensions(current, candidate.mapId, candidate.previous.imagePath, candidate.previous.imageSize)
        : current;
      const next = replaceSceneMapImage(withDimensions, candidate.mapId, {
        imagePath: candidate.imagePath, imageSize: candidate.imageSize, policy
      });
      images.current.set(candidate.mapId, { imagePath: candidate.imagePath, imageUrl: candidate.imageUrl });
      appliedLease.current?.release();
      appliedLease.current = null;
      if (next.activeMapId === candidate.mapId) {
        const resource = pending.leases.shift();
        if (resource) appliedLease.current = { mapId: candidate.mapId, imageUrl: candidate.imageUrl, release: resource.release };
        latest.current.setMapImageUrl(candidate.imageUrl);
        latest.current.onApplied();
      }
      latest.current.setScene(next);
      latest.current.onFeedback(`Imagen de ${candidate.mapName} actualizada`);
      setPlayerError(null);
      cancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la imagen.");
    }
  }, [cancel, targetForJob]);

  useEffect(() => window.ttrpg?.onPlayerMapImageStatus((status) => {
    if (status.imageUrl !== latest.current.mapImageUrl) return;
    setPlayerError(status.ok ? null : status.error ?? "No se pudo actualizar la imagen en Player View.");
  }), []);

  const retryPlayer = useCallback(async () => {
    cancel();
    const { sceneRef, mapImageUrl } = latest.current;
    const current = sceneRef.current;
    if (current.activeMapId === null || current.map.imagePath === null) return;
    const session = generation.current;
    let url: string | null | undefined;
    try { url = await window.ttrpg?.resolveMapUrl(current.map.imagePath); }
    catch { latest.current.onFeedback("No se pudo reintentar la imagen del jugador."); return; }
    if (!url || session !== generation.current || latest.current.mapImageUrl !== mapImageUrl
      || latest.current.sceneRef.current.activeMapId !== current.activeMapId) return;
    cancel();
    images.current.set(current.activeMapId, { imagePath: current.map.imagePath, imageUrl: url });
    latest.current.setMapImageUrl(url);
    setPlayerError(null);
  }, [cancel]);

  useEffect(() => () => {
    generation.current++;
    for (const resource of job.current?.leases ?? []) resource.release();
    job.current = null;
    appliedLease.current?.release();
  }, []);

  return { draft, busyMapId, error, begin, confirm, cancel, resetSession, onImageLoaded, playerError, retryPlayer };
}
