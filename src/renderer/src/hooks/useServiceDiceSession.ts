import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { defaultDiceDraft, expandDice, type D20Mode, type DiceContext, type DiceDraft, type DiceEnvelope, type DiceRollRequest, type DiceSimulation } from "../../../domain/dice/dice";
import { DiceRollAudio } from "../../../render/audio/DiceRollAudio";
import type { ServiceDiceView } from "../../../shared/api/service-dice-client";
import type { ServiceDiceAck, ServiceDiceBegin, ServiceDiceHistoryPage, ServiceDicePresentation, ServiceDicePrivatePresentation } from "../../../shared/contracts/service-dice";
import { useTtrpgClient } from "../client/ClientProvider";

const emptyView: ServiceDiceView = { supported: false, connected: false, audience: null, state: null, error: "" };
const unknownOperationMessage = "No se pudo confirmar la operación. Reintenta para reconciliarla sin volver a lanzar los dados.";

type DicePresentation = ServiceDicePresentation | ServiceDicePrivatePresentation;
type PendingDiceOperation = {
  readonly beginRequestId: string;
  readonly completeRequestId: string;
  readonly failRequestId: string;
  readonly input: Omit<ServiceDiceBegin, "requestId">;
  readonly mode: D20Mode | null;
  readonly channel: "public" | "private";
  readonly contextToken: string;
  readonly showPlayerResult: boolean;
  readonly generation: number;
  readonly abort: AbortController;
  rollId?: string;
  simulation?: DiceSimulation;
  stage: "begin" | "complete" | "fail";
};

function authorLabel(author: NonNullable<ServiceDicePresentation["author"]>): string { return author.kind === "dm" ? "DM" : `${author.alias} · ${author.discriminator}`; }
function presentationEnvelope(value: DicePresentation | null | undefined, revision: number): DiceEnvelope {
  if (!value) return { revision, presentation: null };
  return { revision, presentation: { rollId: value.rollId, contextToken: value.context.token, sceneId: value.context.sceneId, mapId: value.context.mapId, dice: value.dice, appearance: value.appearance, replay: value.replay, result: value.result, startedAt: value.startedAt, settledAt: value.settledAt, critical: value.critical } };
}
function message(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
/** Solo un fallo sin respuesta final puede reconciliarse por requestId. */
function isUncertain(caught: unknown): boolean {
  if (caught instanceof DOMException && caught.name === "AbortError") return false;
  if (typeof caught !== "object" || caught === null || !("status" in caught)) return true;
  const status = (caught as { status?: unknown }).status;
  return typeof status !== "number" || status === 0 || status >= 500;
}
function isAcknowledged(ack: ServiceDiceAck | null, requestId: string): ack is ServiceDiceAck { return ack !== null && ack.requestId === requestId; }

/** Controller HTTP/SSE: una reserva antecede exactamente una física del iniciador. */
export function useServiceDiceSession() {
  const service = useTtrpgClient()?.serviceDice;
  const subscribe = useCallback((listener: () => void) => service?.subscribe(listener) ?? (() => {}), [service]);
  const snapshot = useCallback(() => service?.getSnapshot() ?? emptyView, [service]);
  const view = useSyncExternalStore(subscribe, snapshot, () => emptyView);
  const state = view.state;
  const publicState = state?.public ?? null;
  const privateState = state?.audience === "dm" ? state.private : null;
  const role = state?.audience ?? "player";
  const publicPresentation = publicState?.presentation ?? null;
  const privatePresentation = privateState?.presentation ?? null;
  const publicEnvelope = useMemo(() => presentationEnvelope(publicPresentation, publicState?.sequence ?? -1), [publicPresentation, publicState?.sequence]);
  const privateEnvelope = useMemo(() => presentationEnvelope(privatePresentation, privateState?.history.revision ?? -1), [privatePresentation, privateState?.history.revision]);
  const [draft, setDraftState] = useState<DiceDraft>(defaultDiceDraft);
  const [preparing, setPreparing] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingDismissId, setPendingDismissId] = useState<string | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [size, setSize] = useState(1);
  const [historyOverride, setHistoryOverride] = useState<ServiceDiceHistoryPage | null>(null);
  const operation = useRef<PendingDiceOperation | null>(null);
  const generation = useRef(0);
  const publicDismissGeneration = useRef(0);
  const mounted = useRef(true);
  const dismissRequests = useRef(new Map<string, string>());
  const historyRequest = useRef(0);
  const contextTokens = useRef<{ public: string | null; private: string | null }>({ public: null, private: null });

  const liveHistoryPage = role === "dm" ? privateState?.history ?? publicState?.history : publicState?.history;
  const historyRevision = liveHistoryPage?.revision;
  const history = (historyOverride ?? liveHistoryPage)?.entries ?? [];
  const error = (localError ?? view.error) || null;
  const audio = useRef<DiceRollAudio | null>(null);
  const soundEnabledRef = useRef(true);
  const initiatedAudio = useRef<{ readonly rollId: string; readonly channel: PendingDiceOperation["channel"] } | null>(null);
  const invalidate = useCallback((channel?: PendingDiceOperation["channel"]): void => {
    const pending = operation.current;
    if (!pending || (channel && pending.channel !== channel)) return;
    generation.current++; pending.abort.abort(); operation.current = null;
    if (initiatedAudio.current?.channel === pending.channel) { audio.current?.stop(); initiatedAudio.current = null; }
    if (mounted.current) { setPreparing(false); setUncertain(false); }
  }, []);
  const invalidateAuthority = useCallback((): void => {
    generation.current++;
    operation.current?.abort.abort(); operation.current = null;
    publicDismissGeneration.current++; dismissRequests.current.clear();
    audio.current?.stop(); initiatedAudio.current = null;
    if (mounted.current) { setPreparing(false); setUncertain(false); setPendingDismissId(null); }
  }, []);

  // Una admisión/instancia nueva tiene preferencias propias. Una publicación nueva no las reinicia.
  useEffect(() => {
    mounted.current = true;
    invalidateAuthority();
    const base = defaultDiceDraft();
    setDraftState(role === "player" ? { ...base, visibility: "open", showPlayerResult: true } : base);
    audio.current?.stop(); initiatedAudio.current = null;
    soundEnabledRef.current = true; setSoundEnabled(true); setSize(1); setLocalError(null); setDismissError(null); setHistoryOverride(null); historyRequest.current++;
  }, [invalidateAuthority, publicState?.selfPublicId, role, service]);
  // El contexto público y el privado son canales independientes del DM.
  useEffect(() => {
    const token = publicState?.publishedContext?.token ?? null;
    if (contextTokens.current.public !== null && contextTokens.current.public !== token) {
      publicDismissGeneration.current++; dismissRequests.current.clear(); setPendingDismissId(null); invalidate("public");
    }
    contextTokens.current.public = token;
  }, [invalidate, publicState?.publishedContext?.token]);
  useEffect(() => {
    const token = privateState?.context?.token ?? null;
    if (contextTokens.current.private !== null && contextTokens.current.private !== token) invalidate("private");
    contextTokens.current.private = token;
  }, [invalidate, privateState?.context?.token]);
  useEffect(() => { historyRequest.current++; setHistoryOverride(current => current?.revision === historyRevision ? current : null); }, [historyRevision, role]);
  useEffect(() => () => { mounted.current = false; invalidateAuthority(); audio.current?.dispose(); audio.current = null; }, [invalidateAuthority]);
  useEffect(() => {
    const initiated = initiatedAudio.current;
    if (!initiated) return;
    const presentation = initiated.channel === "public" ? publicPresentation : privatePresentation;
    if (!presentation || presentation.rollId !== initiated.rollId || !presentation.replay) { audio.current?.stop(); return; }
    audio.current?.present(presentationEnvelope(presentation, 0).presentation);
  }, [privatePresentation, publicPresentation]);

  const current = useCallback((pending: PendingDiceOperation): boolean => mounted.current && operation.current === pending && generation.current === pending.generation && !pending.abort.signal.aborted, []);
  const reconcile = useCallback(async (requestId: string, pending: PendingDiceOperation): Promise<ServiceDiceAck | null> => {
    if (!service || !current(pending)) return null;
    try { const ack = await service.operation(requestId); return current(pending) && isAcknowledged(ack, requestId) ? ack : null; } catch { return null; }
  }, [current, service]);
  const finish = useCallback((pending: PendingDiceOperation): void => { if (!current(pending)) return; operation.current = null; setPreparing(false); setUncertain(false); }, [current]);
  const markUncertain = useCallback((pending: PendingDiceOperation): void => { if (!current(pending)) return; setPreparing(false); setUncertain(true); setLocalError(unknownOperationMessage); }, [current]);

  const attemptFail = useCallback(async (pending: PendingDiceOperation, original: unknown): Promise<void> => {
    if (!service || !pending.rollId || !current(pending)) return;
    pending.stage = "fail";
    try { await service.fail(pending.rollId, pending.failRequestId); finish(pending); setLocalError(message(original, "No se pudo simular la tirada.")); }
    catch (caught) {
      const ack = isUncertain(caught) ? await reconcile(pending.failRequestId, pending) : null;
      if (ack) { finish(pending); setLocalError(message(original, "No se pudo simular la tirada.")); }
      else if (isUncertain(caught)) markUncertain(pending);
      else { finish(pending); setLocalError(message(caught, "No se pudo liberar la reserva de dados.")); }
    }
  }, [current, finish, markUncertain, reconcile, service]);
  const attemptComplete = useCallback(async (pending: PendingDiceOperation): Promise<void> => {
    if (!service || !pending.rollId || !pending.simulation || !current(pending)) return;
    pending.stage = "complete"; setPreparing(true); setUncertain(false); setLocalError(null);
    try { await service.complete(pending.rollId, pending.simulation, pending.completeRequestId); finish(pending); }
    catch (caught) {
      if (!current(pending)) return;
      const ack = isUncertain(caught) ? await reconcile(pending.completeRequestId, pending) : null;
      if (ack) finish(pending);
      else if (isUncertain(caught)) markUncertain(pending);
      else { finish(pending); setLocalError(message(caught, "No se pudo confirmar el resultado de dados.")); }
    }
  }, [current, finish, markUncertain, reconcile, service]);
  const simulate = useCallback(async (pending: PendingDiceOperation): Promise<void> => {
    if (!current(pending)) return;
    setPreparing(true);
    try {
      const { browserDiceSimulation } = await import("../../../infrastructure/dice/browser-dice-simulation");
      if (!current(pending)) return;
      const request: DiceRollRequest = { requestId: pending.beginRequestId, contextToken: pending.contextToken, draft: { ...defaultDiceDraft(), groups: pending.input.selection.groups, includeD20: pending.input.selection.includeD20, d20Modifier: pending.input.selection.d20Modifier, visibility: pending.input.visibility === "public" ? "open" : "hidden", showPlayerResult: pending.input.visibility === "public", appearance: pending.input.selection.appearance, force: pending.input.selection.force }, d20: pending.mode };
      pending.simulation = await browserDiceSimulation.prepare(expandDice(request), pending.input.selection.force, pending.abort.signal);
      if (current(pending)) await attemptComplete(pending);
    } catch (caught) { if (current(pending)) await attemptFail(pending, caught); }
  }, [attemptComplete, attemptFail, current]);
  const attemptBegin = useCallback(async (pending: PendingDiceOperation): Promise<void> => {
    if (!service || !current(pending)) return;
    pending.stage = "begin"; setPreparing(true); setUncertain(false); setLocalError(null);
    try {
      const ack = await service.begin(pending.input, pending.beginRequestId);
      if (!current(pending)) return;
      if (!ack.rollId) throw new Error("El servicio no confirmó la reserva de dados.");
      pending.rollId = ack.rollId;
    } catch (caught) {
      if (!current(pending)) return;
      const ack = isUncertain(caught) ? await reconcile(pending.beginRequestId, pending) : null;
      if (ack?.rollId) pending.rollId = ack.rollId;
      else if (isUncertain(caught) || (caught instanceof Error && caught.message === "El servicio no confirmó la reserva de dados.")) { markUncertain(pending); return; }
      else { finish(pending); setLocalError(message(caught, "No se pudo reservar la mesa de dados.")); return; }
    }
    if (!current(pending) || !pending.rollId) return;
    initiatedAudio.current = { rollId: pending.rollId, channel: pending.channel };
    if (pending.channel === "public" && role === "dm" && !pending.showPlayerResult && service.dm) {
      try { await service.dm.setMapResultVisibility(pending.rollId, false, crypto.randomUUID()); }
      catch (caught) { if (current(pending)) setLocalError(message(caught, "La tirada se reservó, pero no se pudo actualizar el resumen del mapa.")); }
    }
    await simulate(pending);
  }, [current, finish, markUncertain, reconcile, role, service, simulate]);
  const run = useCallback(async (mode: D20Mode | null): Promise<void> => {
    if (!service || !state || !view.supported || !view.connected || operation.current) return;
    const visibility = role === "player" ? "open" : draft.visibility;
    const channel = visibility === "open" ? "public" : "private";
    const contextToken = channel === "public" ? publicState?.publishedContext?.token : privateState?.context?.token;
    if (!contextToken) { setLocalError(channel === "public" ? "Espera una escena publicada para lanzar." : "Selecciona un contexto privado para la tirada oculta."); return; }
    const selection = { groups: draft.groups, includeD20: draft.includeD20, d20Modifier: draft.d20Modifier, appearance: draft.appearance, force: draft.force, d20: mode };
    const pending: PendingDiceOperation = { beginRequestId: crypto.randomUUID(), completeRequestId: crypto.randomUUID(), failRequestId: crypto.randomUUID(), input: { contextToken, visibility: channel === "public" ? "public" : "hidden", selection }, mode, channel, contextToken, showPlayerResult: draft.showPlayerResult, generation: generation.current, abort: new AbortController(), stage: "begin" };
    audio.current ??= new DiceRollAudio();
    audio.current.setEnabled(soundEnabledRef.current);
    audio.current.unlock();
    operation.current = pending;
    await attemptBegin(pending);
  }, [attemptBegin, draft, privateState?.context?.token, publicState?.publishedContext?.token, role, service, state, view.connected, view.supported]);
  const retry = useCallback(async (): Promise<void> => {
    const pending = operation.current;
    if (!pending || !current(pending) || !service) return;
    if (!view.connected || !view.supported) { setLocalError("La conexión no permite reconciliar la tirada todavía."); return; }
    if (pending.stage === "begin") await attemptBegin(pending);
    else if (pending.stage === "complete") await attemptComplete(pending);
    else await attemptFail(pending, new Error("No se pudo simular la tirada."));
  }, [attemptBegin, attemptComplete, attemptFail, current, service, view.connected, view.supported]);

  const dismiss = useCallback(async (rollId: string): Promise<void> => {
    if (!service || pendingDismissId) return;
    const requestId = dismissRequests.current.get(rollId) ?? crypto.randomUUID();
    dismissRequests.current.set(rollId, requestId);
    const dismissPublicGeneration = publicDismissGeneration.current;
    setPendingDismissId(rollId); setDismissError(null);
    try { await service.dismiss(rollId, requestId); if (mounted.current && dismissPublicGeneration === publicDismissGeneration.current) dismissRequests.current.delete(rollId); }
    catch (caught) {
      let ack: ServiceDiceAck | null = null;
      if (isUncertain(caught)) try { ack = await service.operation(requestId); } catch { /* Reintento explícito conserva el mismo ID. */ }
      if (!mounted.current || dismissPublicGeneration !== publicDismissGeneration.current) return;
      if (isAcknowledged(ack, requestId)) dismissRequests.current.delete(rollId);
      else setDismissError(isUncertain(caught) ? "No se pudo confirmar el cierre. Reintenta para reconciliarlo." : message(caught, "No se pudo cerrar la tirada."));
    } finally { if (mounted.current && dismissPublicGeneration === publicDismissGeneration.current) setPendingDismissId(null); }
  }, [pendingDismissId, service]);
  const loadHistory = useCallback(async (offset: number): Promise<void> => {
    if (!service || !liveHistoryPage) return;
    const request = ++historyRequest.current, revision = liveHistoryPage.revision;
    try { const page = await service.history({ offset, limit: 10, revision }); if (mounted.current && request === historyRequest.current && revision === historyRevision && page.revision === revision) setHistoryOverride(page); }
    catch (caught) { if (mounted.current && request === historyRequest.current) setLocalError(message(caught, "No se pudo cargar el historial.")); }
  }, [historyRevision, liveHistoryPage, service]);
  const setDraft = useCallback((next: DiceDraft): void => setDraftState(role === "player" ? { ...next, visibility: "open", showPlayerResult: true } : next), [role]);
  const setSound = useCallback((enabled: boolean): void => { soundEnabledRef.current = enabled; setSoundEnabled(enabled); audio.current?.setEnabled(enabled); }, []);
  const setPrivateContext = useCallback(async (context: DiceContext): Promise<void> => {
    if (!service?.dm) return;
    const contextGeneration = generation.current;
    try { await service.dm.setPrivateContext(context, crypto.randomUUID()); if (mounted.current && contextGeneration === generation.current) setLocalError(null); }
    catch (caught) { if (mounted.current && contextGeneration === generation.current) setLocalError(message(caught, "No se pudo actualizar el contexto privado de dados.")); }
  }, [service]);
  return {
    view, role, draft, setDraft, preparing, uncertain, retry, error, dismiss, pendingDismissId, dismissError, soundEnabled, setSoundEnabled: setSound, size, setSize, run,
    // El consumidor legado usa la pública; los dos canales evitan mezclar contexto DM/publicado.
    envelope: publicEnvelope, publicEnvelope, privateEnvelope, presentation: publicPresentation, publicPresentation, privatePresentation,
    publicFinalFrame: publicPresentation?.finalFrame ?? null, privateFinalFrame: privatePresentation?.finalFrame ?? null,
    occupancy: publicState?.occupancy ?? null, history, historyPage: historyOverride ?? liveHistoryPage, closeAny: role === "dm", selfAuthorId: publicState?.selfPublicId ?? "dm", mapResultVisible: draft.showPlayerResult,
    loadHistory,
    setMapResultVisible: async (visible: boolean) => {
      setDraftState(current => ({ ...current, showPlayerResult: visible }));
      if (publicPresentation?.author.kind !== "dm" || !service?.dm) return;
      const visibilityGeneration = generation.current;
      try {
        await service.dm.setMapResultVisibility(publicPresentation.rollId, visible, crypto.randomUUID());
        if (mounted.current && visibilityGeneration === generation.current) setLocalError(null);
      } catch (caught) {
        if (mounted.current && visibilityGeneration === generation.current) setLocalError(message(caught, "No se pudo actualizar el resumen sobre el mapa."));
      }
    },
    clearHistory: async () => {
      if (!service?.dm) return;
      const clearGeneration = generation.current;
      try {
        await service.dm.clearHistory(crypto.randomUUID());
        if (mounted.current && clearGeneration === generation.current) setLocalError(null);
      } catch (caught) {
        if (mounted.current && clearGeneration === generation.current) setLocalError(message(caught, "No se pudo limpiar el historial."));
      }
    },
    setPrivateContext,
    authorLabel
  };
}
