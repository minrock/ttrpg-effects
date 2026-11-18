import type { DiceSimulation } from "../../domain/dice/dice";
import type {
  ServiceDiceAck,
  ServiceDiceBegin,
  ServiceDiceHistoryPage,
  ServiceDiceHistoryQuery,
  ServiceDiceState
} from "../contracts/service-dice";

export interface ServiceDiceView {
  readonly supported: boolean;
  readonly connected: boolean;
  readonly audience: "dm" | "player" | null;
  readonly state: ServiceDiceState | null;
  readonly error: string;
}

/** Puerto contextual del servicio. La implementación HTTP no es una autoridad. */
export interface ServiceDiceClient {
  getSnapshot(): ServiceDiceView;
  subscribe(listener: () => void): () => void;
  begin(input: Omit<ServiceDiceBegin, "requestId">, requestId: string): Promise<ServiceDiceAck>;
  complete(rollId: string, simulation: DiceSimulation, requestId: string): Promise<ServiceDiceAck>;
  fail(rollId: string, requestId: string): Promise<ServiceDiceAck>;
  dismiss(rollId: string, requestId: string): Promise<ServiceDiceAck>;
  history(query: ServiceDiceHistoryQuery): Promise<ServiceDiceHistoryPage>;
  operation(requestId: string): Promise<ServiceDiceAck | null>;
  /** Solo existe para una vista DM negociada. */
  readonly dm?: {
    setPrivateContext(context: import("../../domain/dice/dice").DiceContext, requestId: string): Promise<ServiceDiceAck>;
    setMapResultVisibility(rollId: string, visible: boolean, requestId: string): Promise<ServiceDiceAck>;
    clearHistory(requestId: string): Promise<ServiceDiceAck>;
  };
}
