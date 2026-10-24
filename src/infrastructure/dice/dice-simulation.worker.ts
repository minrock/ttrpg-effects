import type { PhysicalDie } from "../../domain/dice/dice";
import { simulateDice } from "./dice-simulation";

self.onmessage = (event: MessageEvent<{ dice: PhysicalDie[]; force: number }>): void => {
  try {
    const random = (): number => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    self.postMessage({ ok: true, value: simulateDice(event.data.dice, event.data.force, random) });
  } catch (error) { self.postMessage({ ok: false, error: error instanceof Error ? error.message : "No fue posible calcular la tirada." }); }
};
