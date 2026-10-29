import type { DiceSimulation, PhysicalDie } from "../../domain/dice/dice";

export interface DiceSimulationPort {
  prepare(dice: readonly PhysicalDie[], force: number, signal: AbortSignal): Promise<DiceSimulation>;
}
