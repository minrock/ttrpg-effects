import { useCallback, useEffect, useRef, useState, type ComponentProps, type JSX } from "react";
import { createPortal } from "react-dom";
import { DiceRollSession } from "../../../application/services/dice-roll-session";
import { draftSchema, expandDice, requestSchema, type D20Mode, type DiceContext, type DiceDraft } from "../../../domain/dice/dice";
import { DiceRollAudio } from "../../../render/audio/DiceRollAudio";
import { DiceOverlay } from "../components/dice/DiceOverlay";
import { DicePanel } from "../components/dice/DicePanel";
import { startCanvasVerification } from "./canvas-verification";

type DiceController = ComponentProps<typeof DicePanel>["controller"];

function useLabDiceController(context: DiceContext): DiceController {
  const alive = useRef(false);
  const [session] = useState(() => new DiceRollSession((role, envelope) => {
    // Player envelopes stay inside this demo session; only DM reaches the viewport.
    if (role === "dm" && alive.current) {
      setState(current => envelope.revision > current.envelope.revision ? { ...current, envelope } : current);
    }
  }));
  const [state, setState] = useState(() => session.getDmState());
  const [sizes, setSizes] = useState(() => session.getSizes());
  const [ready, setReady] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const soundEnabledRef = useRef(true);
  const audio = useRef<DiceRollAudio | null>(null);
  const controller = useRef<AbortController | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;

  const refresh = useCallback((): void => {
    if (!alive.current) return;
    setState(session.getDmState());
    setNow(Date.now());
  }, [session]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
      controller.current = null;
      session.interrupt();
      audio.current?.dispose();
      audio.current = null;
    };
  }, [session]);

  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    session.interrupt();
    audio.current?.stop();
    setPreparing(false);
    setReady(false);
    setError(null);
    try {
      session.setContext(contextRef.current);
      refresh();
      setReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo abrir la mesa de dados.");
    }
  }, [context.token, session, refresh]);

  useEffect(() => {
    if (state.busyUntil <= Date.now()) return;
    const timer = setTimeout(refresh, state.busyUntil - Date.now() + 20);
    return () => clearTimeout(timer);
  }, [state.busyUntil, refresh]);

  useEffect(() => {
    const presentation = state.envelope.presentation;
    audio.current?.present(presentation?.contextToken === context.token ? presentation : null);
  }, [state.envelope.presentation, context.token]);

  const action = async (operation: () => void): Promise<void> => {
    if (!alive.current) return;
    try {
      operation();
      refresh();
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible completar la accion.");
    }
  };

  const updateDraft = (next: DiceDraft): void => {
    const parsed = draftSchema.safeParse(next);
    if (!parsed.success) {
      setError("Maximo 24 piezas fisicas; cantidades enteras no negativas y modificadores enteros entre -9999 y 9999.");
      return;
    }
    void action(() => { session.setDraft(parsed.data); });
  };

  const roll = async (d20: D20Mode | null, selection: DiceDraft = state.draft): Promise<void> => {
    if (!alive.current || !ready || controller.current || session.getDmState().busyUntil > Date.now()) return;
    const captured = contextRef.current;
    const abort = new AbortController();
    controller.current = abort;
    let rollId: string | null = null;
    const current = (): boolean => !abort.signal.aborted && alive.current && captured.token === contextRef.current.token;
    setPreparing(true);
    setError(null);
    try {
      const request = requestSchema.parse({ requestId: crypto.randomUUID(), contextToken: captured.token, draft: selection, d20 });
      // Unlock synchronously in the launch gesture, before imports or worker awaits.
      audio.current ??= new DiceRollAudio();
      audio.current.setEnabled(soundEnabledRef.current);
      audio.current.unlock();
      session.setContext(captured);
      rollId = session.begin(request).rollId;
      refresh();
      await import("../../../render/three/dice/DiceOverlayRenderer");
      if (!current()) return;
      const { browserDiceSimulation } = await import("../../../infrastructure/dice/browser-dice-simulation");
      if (!current()) return;
      const simulation = await browserDiceSimulation.prepare(expandDice(request), request.draft.force, abort.signal);
      if (!current()) return;
      session.complete(rollId, simulation);
      refresh();
    } catch (caught) {
      if (current()) {
        if (rollId) session.fail(rollId);
        refresh();
        setError(caught instanceof Error && !caught.message.startsWith("[") ? caught.message : "Seleccion de dados invalida.");
      }
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        if (alive.current) setPreparing(false);
      }
    }
  };

  return {
    state, draft: state.draft, ready, busy: preparing || state.busyUntil > now, preparing, error, roll, updateDraft,
    soundEnabled,
    setSoundEnabled: enabled => {
      soundEnabledRef.current = enabled;
      setSoundEnabledState(enabled);
      audio.current?.setEnabled(enabled);
    },
    diceSizes: { sizes, ready, error: null, setSize: change => action(() => { setSizes(session.setSize(change)); }) },
    clearHistory: () => action(() => session.clearHistory()),
    dismiss: rollId => action(() => session.dismiss(rollId)),
    showResult: (rollId, visible) => action(() => session.setResultVisibility(rollId, visible))
  };
}

// Keep LabDice mounted across tabs; active controls only the panel, not the session or overlay.
export function LabDice({ active, viewport, context }: { active: boolean; viewport: HTMLElement | null; context: DiceContext }): JSX.Element {
  const controller = useLabDiceController(context);
  const envelope = controller.state.envelope;
  useEffect(() => {
    if (!viewport || !envelope.presentation || new URLSearchParams(window.location.search).get("verify") !== "1") return;
    let frame = 0, attempts = 0;
    let stop: (() => void) | undefined;
    const inspect = () => {
      const stage = viewport.querySelector<HTMLElement>(".dice-overlay-stage");
      if (stage?.querySelector("canvas")) stop = startCanvasVerification(stage, [], true);
      else if (++attempts < 120) frame = requestAnimationFrame(inspect);
    };
    frame = requestAnimationFrame(inspect);
    return () => { cancelAnimationFrame(frame); stop?.(); };
  }, [viewport, envelope.presentation?.rollId]);
  const localEnvelope = envelope.presentation && envelope.presentation.contextToken !== context.token ? { ...envelope, presentation: null } : envelope;
  return <>
    {active && <DicePanel controller={controller} />}
    {viewport && createPortal(<DiceOverlay envelope={localEnvelope} size={controller.diceSizes.sizes.dm} onDismiss={rollId => void controller.dismiss(rollId)} />, viewport)}
  </>;
}
