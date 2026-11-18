// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DiceSimulation } from "../../../domain/dice/dice";
import { serviceDiceDmFixture, serviceDicePlayerFixture } from "../../../shared/contracts/service-dice.fixtures";
import type { ServiceDiceAck, ServiceDiceHistoryPage } from "../../../shared/contracts/service-dice";
import type { ServiceDiceClient, ServiceDiceView } from "../../../shared/api/service-dice-client";

const simulation = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock("../../../infrastructure/dice/browser-dice-simulation", () => ({ browserDiceSimulation: simulation }));
vi.mock("../../../render/audio/DiceRollAudio", () => ({ DiceRollAudio: class { unlock = vi.fn(); setEnabled = vi.fn(); present = vi.fn(); stop = vi.fn(); dispose = vi.fn(); } }));

let client: { serviceDice?: ServiceDiceClient } | null = null;
vi.mock("../client/ClientProvider", () => ({ useTtrpgClient: () => client }));
import { useServiceDiceSession } from "./useServiceDiceSession";

const rollId = "22222222-2222-4222-8222-222222222222";
const simulationValue: DiceSimulation = { replay: { frameCount: 2, stepMs: 16, durationMs: 16, frames: [] }, values: [] };
let host: HTMLDivElement, root: Root, controller: ReturnType<typeof useServiceDiceSession>;
let view: ServiceDiceView, listener: (() => void) | undefined;
let dice: ServiceDiceClient;

function ack(requestId: string, roll = rollId): ServiceDiceAck { return { ok: true, version: 1, requestId, rollId: roll, outcome: "accepted", publicSequence: 4 }; }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function makeService(): ServiceDiceClient {
  return {
    getSnapshot: () => view,
    subscribe: next => { listener = next; return () => { listener = undefined; }; },
    begin: vi.fn(async (_input, requestId) => ack(requestId)),
    complete: vi.fn(async (_rollId, _simulation, requestId) => ack(requestId)),
    fail: vi.fn(async (_rollId, requestId) => ack(requestId)),
    dismiss: vi.fn(async (_rollId, requestId) => ack(requestId)),
    history: vi.fn(async () => ({ ...serviceDicePlayerFixture.public.history, offset: 0, entries: [] })),
    operation: vi.fn(async () => null)
  };
}
function View() { controller = useServiceDiceSession(); return <output>{controller.historyPage?.offset}</output>; }
async function flush(): Promise<void> { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  view = { supported: true, connected: true, audience: "player", state: serviceDicePlayerFixture, error: "" };
  dice = makeService(); client = { serviceDice: dice };
  simulation.prepare.mockReset(); simulation.prepare.mockResolvedValue(simulationValue);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); client = null; });

it("reconcilia un ACK perdido de begin antes de una sola simulación física", async () => {
  vi.mocked(dice.begin).mockRejectedValueOnce(new Error("red"));
  vi.mocked(dice.operation).mockImplementation(async requestId => ack(requestId));
  await act(async () => root.render(<View />));
  await act(async () => { await controller.run(null); });
  expect(dice.begin).toHaveBeenCalledTimes(1);
  expect(dice.operation).toHaveBeenCalledWith(vi.mocked(dice.begin).mock.calls[0][1]);
  expect(simulation.prepare).toHaveBeenCalledTimes(1);
  expect(dice.complete).toHaveBeenCalledTimes(1);
  expect(vi.mocked(dice.begin).mock.calls[0][1]).not.toBe(vi.mocked(dice.complete).mock.calls[0][2]);
  expect(controller.uncertain).toBe(false);
});

it("permanece operativo tras el remonte de efectos de StrictMode", async () => {
  await act(async () => root.render(<StrictMode><View /></StrictMode>));
  await act(async () => { await controller.run(null); });
  expect(simulation.prepare).toHaveBeenCalledTimes(1);
  expect(dice.complete).toHaveBeenCalledTimes(1);
});

it("conserva la simulación y el ID de complete incierto para reintento explícito", async () => {
  vi.mocked(dice.complete).mockRejectedValueOnce(new Error("red"));
  await act(async () => root.render(<View />));
  await act(async () => { await controller.run(null); });
  expect(controller.uncertain).toBe(true);
  expect(simulation.prepare).toHaveBeenCalledTimes(1);
  const first = vi.mocked(dice.complete).mock.calls[0];
  await act(async () => { await controller.retry(); });
  const second = vi.mocked(dice.complete).mock.calls[1];
  expect(second[2]).toBe(first[2]);
  expect(second[1]).toBe(first[1]);
  expect(simulation.prepare).toHaveBeenCalledTimes(1);
  expect(controller.uncertain).toBe(false);
});

it("libera un fallo físico con fail estable sin ejecutar una segunda física", async () => {
  simulation.prepare.mockRejectedValueOnce(new Error("WebGL"));
  vi.mocked(dice.fail).mockRejectedValueOnce(new Error("red"));
  await act(async () => root.render(<View />));
  await act(async () => { await controller.run(null); });
  expect(controller.uncertain).toBe(true);
  const firstFailId = vi.mocked(dice.fail).mock.calls[0][1];
  await act(async () => { await controller.retry(); });
  expect(vi.mocked(dice.fail).mock.calls[1][1]).toBe(firstFailId);
  expect(simulation.prepare).toHaveBeenCalledTimes(1);
  expect(controller.uncertain).toBe(false);
});

it("descarta un begin tardío después de cambiar el contexto público", async () => {
  const begin = deferred<ServiceDiceAck>();
  vi.mocked(dice.begin).mockReturnValueOnce(begin.promise);
  await act(async () => root.render(<View />));
  act(() => { void controller.run(null); });
  view = { ...view, state: { ...serviceDicePlayerFixture, public: { ...serviceDicePlayerFixture.public, publishedContext: { ...serviceDicePlayerFixture.public.publishedContext!, token: "44444444-4444-4444-8444-444444444444" } } } };
  await act(async () => listener?.());
  begin.resolve(ack(vi.mocked(dice.begin).mock.calls[0][1]));
  await flush();
  expect(simulation.prepare).not.toHaveBeenCalled();
  expect(dice.complete).not.toHaveBeenCalled();
  expect(controller.preparing).toBe(false);
});

it("reutiliza el requestId de cierre mientras su ACK sigue incierto", async () => {
  await act(async () => root.render(<View />));
  vi.mocked(dice.dismiss).mockRejectedValueOnce(new Error("red"));
  vi.mocked(dice.operation).mockResolvedValueOnce(null);
  await act(async () => { await controller.dismiss(rollId); });
  await act(async () => { await controller.dismiss(rollId); });
  expect(vi.mocked(dice.dismiss).mock.calls[0][1]).toBe(vi.mocked(dice.dismiss).mock.calls[1][1]);
  expect(controller.dismissError).toBeNull();
});

it("mantiene el cierre público operativo si cambia el contexto privado mientras su respuesta se resuelve", async () => {
  if (serviceDiceDmFixture.audience !== "dm") throw new Error("El fixture DM debe contener el canal privado.");
  const prepare = deferred<DiceSimulation>(), dismiss = deferred<ServiceDiceAck>();
  view = { supported: true, connected: true, audience: "dm", state: serviceDiceDmFixture, error: "" };
  dice = makeService(); client = { serviceDice: dice };
  simulation.prepare.mockReturnValueOnce(prepare.promise);
  vi.mocked(dice.dismiss).mockReturnValueOnce(dismiss.promise);
  await act(async () => root.render(<View />));
  await act(async () => controller.setDraft({ ...controller.draft, visibility: "hidden" }));
  act(() => { void controller.run(null); });
  await flush();
  expect(simulation.prepare).toHaveBeenCalledOnce();
  act(() => { void controller.dismiss(rollId); });
  expect(controller.pendingDismissId).toBe(rollId);
  const firstRequestId = vi.mocked(dice.dismiss).mock.calls[0][1];
  view = { ...view, state: { ...serviceDiceDmFixture, private: { ...serviceDiceDmFixture.private, context: { ...serviceDiceDmFixture.private.context!, token: "99999999-9999-4999-8999-999999999999" } } } };
  await act(async () => listener?.());
  dismiss.resolve(ack(firstRequestId));
  await flush();
  expect(controller.pendingDismissId).toBeNull();
  await act(async () => { await controller.dismiss(rollId); });
  expect(vi.mocked(dice.dismiss).mock.calls).toHaveLength(2);
  expect(vi.mocked(dice.dismiss).mock.calls[1][1]).not.toBe(firstRequestId);
});

it("libera el cierre público incierto tras un cambio de contexto privado y conserva su ID de reintento", async () => {
  if (serviceDiceDmFixture.audience !== "dm") throw new Error("El fixture DM debe contener el canal privado.");
  const prepare = deferred<DiceSimulation>(), dismiss = deferred<ServiceDiceAck>();
  view = { supported: true, connected: true, audience: "dm", state: serviceDiceDmFixture, error: "" };
  dice = makeService(); client = { serviceDice: dice };
  simulation.prepare.mockReturnValueOnce(prepare.promise);
  vi.mocked(dice.dismiss).mockReturnValueOnce(dismiss.promise);
  await act(async () => root.render(<View />));
  await act(async () => controller.setDraft({ ...controller.draft, visibility: "hidden" }));
  act(() => { void controller.run(null); });
  await flush();
  act(() => { void controller.dismiss(rollId); });
  const firstRequestId = vi.mocked(dice.dismiss).mock.calls[0][1];
  view = { ...view, state: { ...serviceDiceDmFixture, private: { ...serviceDiceDmFixture.private, context: { ...serviceDiceDmFixture.private.context!, token: "99999999-9999-4999-8999-999999999998" } } } };
  await act(async () => listener?.());
  dismiss.reject(new Error("red"));
  await flush();
  expect(controller.pendingDismissId).toBeNull();
  expect(controller.dismissError).toContain("No se pudo confirmar el cierre");
  await act(async () => { await controller.dismiss(rollId); });
  expect(vi.mocked(dice.dismiss).mock.calls[1][1]).toBe(firstRequestId);
});

it("descarta una página tardía cuando ya se pidió otra revisión/página", async () => {
  const first = deferred<ServiceDiceHistoryPage>(), second = deferred<ServiceDiceHistoryPage>();
  vi.mocked(dice.history).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  await act(async () => root.render(<View />));
  act(() => { void controller.loadHistory(10); void controller.loadHistory(0); });
  second.resolve({ ...serviceDicePlayerFixture.public.history, offset: 0, entries: [] });
  await flush();
  first.resolve({ ...serviceDicePlayerFixture.public.history, offset: 10, total: 11, entries: [] });
  await flush();
  expect(controller.historyPage?.offset).toBe(0);
});

it("conserva borrador y preferencias ante publicación nueva de la misma admisión", async () => {
  await act(async () => root.render(<View />));
  await act(async () => {
    controller.setDraft({ ...controller.draft, force: 1.4, appearance: { color: "ruby", material: "metal" } });
    controller.setSoundEnabled(false); controller.setSize(1.5);
  });
  view = { ...view, state: { ...serviceDicePlayerFixture, public: { ...serviceDicePlayerFixture.public, publishedContext: { ...serviceDicePlayerFixture.public.publishedContext!, token: "44444444-4444-4444-8444-444444444444" } } } };
  await act(async () => listener?.());
  expect(controller.draft.force).toBe(1.4);
  expect(controller.draft.appearance.material).toBe("metal");
  expect(controller.soundEnabled).toBe(false);
  expect(controller.size).toBe(1.5);
});

it("mantiene local el resumen DM, lo congela al reservar y expone el contexto privado tipado", async () => {
  if (serviceDiceDmFixture.audience !== "dm") throw new Error("El fixture DM debe contener el canal privado.");
  const privateContext = serviceDiceDmFixture.private.context;
  const dm = {
    setPrivateContext: vi.fn(async (_context, requestId) => ack(requestId)),
    setMapResultVisibility: vi.fn(async (_rollId, _visible, requestId) => ack(requestId)),
    clearHistory: vi.fn(async requestId => ack(requestId))
  };
  view = { supported: true, connected: true, audience: "dm", state: serviceDiceDmFixture, error: "" };
  dice = { ...makeService(), dm }; client = { serviceDice: dice };
  await act(async () => root.render(<View />));
  await act(async () => { controller.setDraft({ ...controller.draft, visibility: "open" }); await controller.setMapResultVisible(false); });
  expect(controller.mapResultVisible).toBe(false);
  expect(dm.setMapResultVisibility).not.toHaveBeenCalled();
  await act(async () => { await controller.run(null); });
  expect(dm.setMapResultVisibility).toHaveBeenCalledWith(rollId, false, expect.any(String));
  await act(async () => { await controller.setPrivateContext(privateContext!); });
  expect(dm.setPrivateContext).toHaveBeenCalledWith(privateContext, expect.any(String));
});
