import { useCallback, useEffect, useRef, useState } from "react";
import { defaultDiceDraft, DICE_PROTOCOL_VERSION, draftSchema, expandDice, requestSchema, type D20Mode, type DiceContext, type DiceDraft, type DiceEnvelope, type DiceReply, type DiceSessionState } from "../../../domain/dice/dice";
import type { DiceApi } from "../../../preload/dice-api";

const emptyState = (): DiceSessionState => ({ protocolVersion: DICE_PROTOCOL_VERSION, draft: defaultDiceDraft(), history: [], envelope: { revision: -1, presentation: null }, publicRollId: null, publicResultVisible: false, busyUntil: 0 });
function unwrap<T>(reply: DiceReply<T>): T { if (!reply.ok) throw new Error(reply.error); return reply.value; }
class DiceProtocolMismatchError extends Error {
  constructor() { super("El motor de dados esta desactualizado y no soporta los chequeos y modificadores actuales. Guarda la escena y reinicia Electron antes de lanzar."); }
}
function unwrapSession(reply: DiceReply<DiceSessionState>): DiceSessionState {
  const value = unwrap(reply);
  if (value.protocolVersion !== DICE_PROTOCOL_VERSION) throw new DiceProtocolMismatchError();
  return value;
}
function diceApi(): DiceApi { if (!window.ttrpg?.beginDiceRoll) throw new Error("Mesa de dados no disponible."); return window.ttrpg; }

export function useDiceSession(context: DiceContext) {
  const [state, setState] = useState<DiceSessionState>(emptyState);
  const [draft, setDraft] = useState(defaultDiceDraft);
  const [ready, setReady] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const controller = useRef<AbortController | null>(null);
  const contextRef = useRef(context); contextRef.current = context;
  const hydrated = useRef(false);
  const alive = useRef(true);
  const acceptState = useCallback((value: DiceSessionState): void => {
    setState(current => ({ ...value, envelope: value.envelope.revision >= current.envelope.revision ? value.envelope : current.envelope }));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!window.ttrpg?.onDicePresentation) return;
    const off = window.ttrpg.onDicePresentation(envelope => setState(current => envelope.revision > current.envelope.revision ? { ...current, envelope } : current));
    const offError = window.ttrpg.onDiceRenderError(setError);
    return () => { alive.current = false; controller.current?.abort(); off(); offError(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    controller.current?.abort(); controller.current = null;
    setPreparing(false); setReady(false); setError(null);
    if (!window.ttrpg?.updateDiceContext) return;
    void window.ttrpg.updateDiceContext(contextRef.current).then(reply => {
      if (cancelled) return;
      const next = unwrapSession(reply); acceptState(next);
      if (!hydrated.current) { hydrated.current = true; setDraft(next.draft); }
      setReady(true);
    }).catch(caught => { if (!cancelled) setError(caught instanceof Error ? caught.message : "No se pudo abrir la mesa de dados."); });
    return () => { cancelled = true; };
  }, [context.token, acceptState]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void diceApi().updateDicePreferences(draft).catch(() => setError("No se pudo conservar la seleccion de dados.")); }, 150);
    return () => clearTimeout(timer);
  }, [draft, ready]);
  useEffect(() => {
    if (state.busyUntil <= Date.now()) return;
    const timer = setTimeout(() => setNow(Date.now()), state.busyUntil - Date.now() + 20);
    return () => clearTimeout(timer);
  }, [state.busyUntil]);

  const updateDraft = (next: DiceDraft): void => {
    const parsed = draftSchema.safeParse(next);
    if (!parsed.success) { setError("Maximo 24 piezas fisicas; cantidades enteras no negativas y modificadores enteros entre -9999 y 9999."); return; }
    setDraft(parsed.data); setError(null);
  };
  const roll = async (d20: D20Mode | null, selection: DiceDraft = draft): Promise<void> => {
    if (!ready || controller.current || state.busyUntil > Date.now()) return;
    const captured = contextRef.current, abort = new AbortController(); controller.current = abort;
    let rollId: string | null = null;
    setPreparing(true); setError(null);
    try {
      const request = requestSchema.parse({ requestId: crypto.randomUUID(), contextToken: captured.token, draft: selection, d20 });
      setDraft(request.draft);
      await import("../../../render/three/dice/DiceOverlayRenderer");
      if (abort.signal.aborted) return;
      unwrapSession(await diceApi().updateDiceContext(captured));
      if (abort.signal.aborted) return;
      rollId = unwrap(await diceApi().beginDiceRoll(request)).rollId;
      const { browserDiceSimulation } = await import("../../../infrastructure/dice/browser-dice-simulation");
      const simulation = await browserDiceSimulation.prepare(expandDice(request), request.draft.force, abort.signal);
      if (abort.signal.aborted || captured.token !== contextRef.current.token) return;
      const completed = unwrapSession(await diceApi().completeDiceRoll(rollId, simulation));
      if (!abort.signal.aborted && captured.token === contextRef.current.token && alive.current) acceptState(completed);
    } catch (caught) {
      if (caught instanceof DiceProtocolMismatchError) setReady(false);
      if (rollId) { const reply = await diceApi().failDiceRoll(rollId).catch(() => null); if (reply?.ok && !abort.signal.aborted && alive.current) acceptState(reply.value); }
      if (!abort.signal.aborted && alive.current) setError(caught instanceof Error && !caught.message.startsWith("[") ? caught.message : "Seleccion de dados invalida.");
    } finally { if (controller.current === abort) { controller.current = null; if (alive.current) setPreparing(false); } }
  };
  const action = async (operation: () => Promise<DiceReply<DiceSessionState>>): Promise<void> => {
    try { acceptState(unwrapSession(await operation())); } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible completar la accion."); }
  };
  return { state, draft, ready, busy: preparing || state.busyUntil > now, preparing, error, updateDraft, roll,
    clearHistory: () => action(() => diceApi().clearDiceHistory()),
    dismiss: (rollId: string) => action(() => diceApi().dismissDiceRoll(rollId)),
    showResult: (rollId: string, visible: boolean) => action(() => diceApi().setDiceResultVisibility(rollId, visible)) };
}

export function usePublicDice(sceneMapId: string | null, contextRevision: string, ready: boolean): DiceEnvelope {
  const [envelope, setEnvelope] = useState<DiceEnvelope>({ revision: -1, presentation: null });
  useEffect(() => {
    if (!window.ttrpg?.onDicePresentation) return;
    const accept = (next: DiceEnvelope): void => setEnvelope(current => next.revision >= current.revision ? next : current);
    return window.ttrpg.onDicePresentation(accept);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setEnvelope(current => ({ ...current, presentation: null }));
    if (ready && window.ttrpg?.getPublicDiceState) void window.ttrpg.getPublicDiceState().then(reply => {
      if (!cancelled && reply.ok) setEnvelope(current => reply.value.revision >= current.revision ? reply.value : current);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [sceneMapId, contextRevision, ready]);
  return ready && (!envelope.presentation || envelope.presentation.mapId === (sceneMapId ?? "")) ? envelope : { ...envelope, presentation: null };
}
