import type { DiceSimulationPort } from "../../application/services/dice-simulation";
import type { DiceReply, DiceSimulation } from "../../domain/dice/dice";

export const browserDiceSimulation: DiceSimulationPort = {
  prepare(dice, force, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new Error("Tirada interrumpida.")); return; }
      const worker = new Worker(new URL("./dice-simulation.worker.ts", import.meta.url), { type: "module" });
      const cleanup = (): void => { clearTimeout(timeout); signal.removeEventListener("abort", abort); worker.terminate(); };
      const abort = (): void => { cleanup(); reject(new Error("Tirada interrumpida.")); };
      const timeout = setTimeout(() => { cleanup(); reject(new Error("La simulacion tardo demasiado. Vuelve a intentar.")); }, 15000);
      signal.addEventListener("abort", abort, { once: true });
      worker.onmessage = (event: MessageEvent<DiceReply<DiceSimulation>>): void => { cleanup(); if (event.data.ok) resolve(event.data.value); else reject(new Error(event.data.error)); };
      worker.onerror = (): void => { cleanup(); reject(new Error("No se pudo iniciar el motor de dados.")); };
      worker.postMessage({ dice, force });
    });
  }
};
