// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiceContext, DicePresentation, DiceSimulation, PhysicalDie } from "../../../domain/dice/dice";
import { browserDiceSimulation } from "../../../infrastructure/dice/browser-dice-simulation";
import { DiceRollAudio } from "../../../render/audio/DiceRollAudio";
import { LabDice } from "./LabDice";

const renderer = vi.hoisted(() => ({ present: vi.fn(), dispose: vi.fn(), setSize: vi.fn() }));
vi.mock("../../../render/three/dice/DiceOverlayRenderer", () => ({ DiceOverlayRenderer: class {
  present = renderer.present; dispose = renderer.dispose; setSize = renderer.setSize;
} }));
vi.mock("../../../infrastructure/dice/browser-dice-simulation", () => ({ browserDiceSimulation: { prepare: vi.fn() } }));
vi.mock("../../../render/audio/DiceRollAudio", () => ({ DiceRollAudio: vi.fn(class {
  unlock = vi.fn(); present = vi.fn(); stop = vi.fn(); dispose = vi.fn(); setEnabled = vi.fn();
}) }));
vi.mock("../hooks/useDiceSession", () => { throw new Error("The lab must not load the Electron dice hook."); });

const context: DiceContext = { token: "lab-map", sceneId: "lab", mapId: "map", sceneName: "Demo", mapName: "Map" };
function simulation(dice: readonly PhysicalDie[], values: readonly number[] = dice.map(die => die.type === "d100" ? 100 : die.type === "d10" ? 10 : 4)): DiceSimulation {
  return {
    values: dice.map((die, index) => ({ id: die.id, value: values[index] })),
    replay: { frameCount: 31, stepMs: 1000 / 30, durationMs: 1000, frames: Array.from({ length: dice.length * 31 }, () => [0, 0, 1, 0, 0, 0, 1]).flat() }
  };
}

describe("local UI lab dice", () => {
  let root: Root, host: HTMLDivElement, viewport: HTMLDivElement;
  const prepare = vi.mocked(browserDiceSimulation.prepare);
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    vi.clearAllMocks();
    prepare.mockReset();
    prepare.mockImplementation(async dice => simulation(dice));
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    host = document.createElement("div");
    viewport = document.createElement("div");
    document.body.append(host, viewport);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove(); viewport.remove();
    vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  });

  const mount = async (active = true, value = context, target: HTMLElement | null = viewport): Promise<void> => {
    await act(async () => root.render(<StrictMode><LabDice active={active} context={value} viewport={target} /></StrictMode>));
  };
  const click = async (selector: string, scope: ParentNode = host): Promise<void> => {
    const button = scope.querySelector<HTMLElement>(selector);
    expect(button).not.toBeNull();
    await act(async () => button!.click());
  };
  const fill = async (selector: string, value: string): Promise<void> => {
    const input = host.querySelector<HTMLInputElement>(selector)!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const waitForPreparation = async (count: number): Promise<void> => {
    await act(async () => { await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(count)); });
  };
  const launch = async (): Promise<void> => {
    const count = prepare.mock.calls.length + 1;
    await click(".dice-panel > .dice-roll-button");
    await waitForPreparation(count);
  };
  const settle = async (): Promise<void> => { await act(async () => vi.advanceTimersByTime(1500)); };
  const audio = (): DiceRollAudio => vi.mocked(DiceRollAudio).mock.results[0].value as DiceRollAudio;
  const presentation = (): DicePresentation => renderer.present.mock.calls.at(-1)![0] as DicePresentation;

  it("keeps a pending roll, draft and history across inactive tabs, then dismisses and clears locally", async () => {
    let complete!: (value: DiceSimulation) => void;
    prepare.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await mount();
    expect(window.ttrpg).toBeUndefined();
    expect(DiceRollAudio).not.toHaveBeenCalled();
    await click('[aria-label="Agregar d6"]');
    await launch();
    expect(audio().unlock).toHaveBeenCalledOnce();
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(true);
    await click(".dice-panel > .dice-roll-button");
    expect(prepare).toHaveBeenCalledOnce();
    const [dice, force, signal] = prepare.mock.calls[0];
    expect(force).toBe(1);
    expect(dice).toMatchObject([{ type: "d6", role: "pool" }]);
    await mount(false);
    expect(host.querySelector(".dice-panel")).toBeNull();
    expect(signal.aborted).toBe(false);
    await act(async () => complete(simulation(dice)));
    await settle();
    expect(viewport.querySelector(".dice-overlay.is-visible")).not.toBeNull();
    expect(host.querySelector(".dice-overlay")).toBeNull();
    expect(viewport.querySelector(".dice-result-total strong")?.textContent).toBe("4");
    expect(audio().present).toHaveBeenLastCalledWith(presentation());
    await mount();
    expect(host.querySelector<HTMLInputElement>('[aria-label="Cantidad d6"]')?.value).toBe("1");
    expect(host.querySelectorAll(".dice-history ol > li")).toHaveLength(1);
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(false);
    await click('[aria-label="Cerrar resultados y retirar dados"]', viewport);
    expect(viewport.querySelector(".dice-overlay.is-visible")).toBeNull();
    expect(audio().present).toHaveBeenLastCalledWith(null);
    expect(host.querySelectorAll(".dice-history ol > li")).toHaveLength(1);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await click('[aria-label="Limpiar historial"]');
    expect(host.querySelectorAll(".dice-history ol > li")).toHaveLength(0);
    expect(window.ttrpg).toBeUndefined();
  });

  it("uses production formulas, percentile results and local visibility without creating a Player overlay", async () => {
    await mount();
    await click('[aria-label="Visibilidad de la tirada"] button:nth-child(2)');
    await click('[aria-label="Modo de composicion"] button:nth-child(2)');
    await fill("#dice-damage-formula", "1d% + 2d6 - 3");
    await fill('[aria-label="Fuerza de lanzamiento"]', "1.4");
    await launch();
    expect(prepare.mock.calls[0][0].map(die => die.type)).toEqual(["d6", "d6", "d100", "d10"]);
    expect(prepare.mock.calls[0][1]).toBe(1.4);
    await settle();
    expect(presentation().result).toMatchObject({ poolTotal: 105, d20: null, groups: [{ modifier: -3, total: 105 }] });
    expect(viewport.querySelector(".dice-result-total strong")?.textContent).toBe("105");
    expect(host.querySelector(".dice-publish-result")?.textContent).toBe("Mostrar resultado");
    await click(".dice-publish-result");
    expect(host.querySelector(".dice-publish-result")?.textContent).toBe("Ocultar resultado");
    expect(document.querySelectorAll(".dice-overlay")).toHaveLength(1);
    expect(prepare).toHaveBeenCalledOnce();
    await click(".dice-publish-result");
    expect(host.querySelector(".dice-publish-result")?.textContent).toBe("Mostrar resultado");
    expect(viewport.querySelector(".dice-result-total strong")?.textContent).toBe("105");
  });

  it("uses the production d20 dialog and resolves advantage independently of the damage draft", async () => {
    prepare.mockImplementationOnce(async dice => simulation(dice, [5, 17]));
    await mount();
    await click('[aria-label="Agregar d6"]');
    await click('[aria-label="Incluir chequeo d20"]');
    await fill('[aria-label="Modificador de d20"]', "-2");
    await click(".dice-panel > .dice-roll-button");
    await click(".dice-mode-options button:nth-child(2)", document);
    await click(".dice-mode-dialog .dice-roll-button", document);
    await waitForPreparation(1);
    await settle();
    expect(prepare.mock.calls[0][0].map(die => die.type)).toEqual(["d20", "d20"]);
    expect(presentation().result).toMatchObject({ groups: [], poolTotal: 0, d20: { mode: "advantage", values: [5, 17], modifier: -2, total: 15 } });
    expect(viewport.querySelector(".dice-result-check > strong")?.textContent).toBe("15");
    await click('[aria-label="Incluir chequeo d20"]');
    expect(host.querySelector<HTMLInputElement>('[aria-label="Cantidad d6"]')?.value).toBe("1");
  });

  it("aborts a changed context and ignores its late completion while a new roll is preparing", async () => {
    let completeOld!: (value: DiceSimulation) => void, completeNew!: (value: DiceSimulation) => void;
    prepare.mockImplementationOnce(() => new Promise(resolve => { completeOld = resolve; }));
    prepare.mockImplementationOnce(() => new Promise(resolve => { completeNew = resolve; }));
    await mount();
    await click('[aria-label="Agregar d6"]');
    await launch();
    const [oldDice, , oldSignal] = prepare.mock.calls[0];
    await mount(true, { ...context, mapName: "Renamed" });
    expect(oldSignal.aborted).toBe(false);
    await mount(true, { ...context, token: "new-map", mapId: "new", mapName: "New map" });
    expect(oldSignal.aborted).toBe(true);
    expect(host.querySelector(".dice-history")?.textContent).toContain("Interrumpida");
    expect(audio().stop).toHaveBeenCalledOnce();
    await launch();
    await act(async () => completeOld(simulation(oldDice)));
    expect(host.querySelector(".dice-panel > .dice-roll-button")?.textContent).toContain("Preparando");
    expect(viewport.querySelector(".dice-overlay.is-visible")).toBeNull();
    await act(async () => completeNew(simulation(prepare.mock.calls[1][0])));
    await settle();
    expect(presentation().contextToken).toBe("new-map");
    expect(host.querySelectorAll(".dice-history ol > li")).toHaveLength(2);
    expect(host.querySelector(".dice-history-origin")?.textContent).toBe("Demo / New map");
    expect(prepare.mock.calls[1][2].aborted).toBe(false);
  });

  it("records a failed worker without inventing results and allows retry", async () => {
    prepare.mockRejectedValueOnce(new Error("Worker unavailable"));
    await mount();
    await click('[aria-label="Agregar d6"]');
    await launch();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Worker unavailable");
    expect(host.querySelector(".dice-history")?.textContent).toContain("No resuelta");
    expect(viewport.querySelector(".dice-overlay.is-visible")).toBeNull();
    await launch();
    await settle();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelectorAll(".dice-history ol > li")).toHaveLength(2);
    expect(viewport.querySelector(".dice-result-total strong")?.textContent).toBe("4");
  });

  it("keeps sizes and mute local, supports a late viewport, and aborts work on unmount", async () => {
    await mount(true, context, null);
    await fill('[aria-label="Tamano en DM"]', "1.5");
    await fill('[aria-label="Tamano en Player"]', "2");
    await click(".dice-sound-control input");
    await click('[aria-label="Agregar d6"]');
    await launch();
    expect(audio().setEnabled).toHaveBeenLastCalledWith(false);
    await settle();
    await mount();
    expect(renderer.setSize).toHaveBeenLastCalledWith(1.5);
    expect(viewport.querySelector(".dice-result-total strong")?.textContent).toBe("4");
    await mount(false);
    await mount();
    expect(host.querySelector<HTMLInputElement>('[aria-label="Tamano en Player"]')?.value).toBe("2");
    expect(host.querySelector<HTMLInputElement>(".dice-sound-control input")?.checked).toBe(false);
    let complete!: (value: DiceSimulation) => void;
    prepare.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await launch();
    const [dice, , signal] = prepare.mock.calls[1];
    await act(async () => root.render(null));
    expect(signal.aborted).toBe(true);
    expect(audio().dispose).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalled();
    await act(async () => complete(simulation(dice)));
    expect(viewport.querySelector(".dice-overlay")).toBeNull();
    expect(host.childElementCount).toBe(0);
  });
});
