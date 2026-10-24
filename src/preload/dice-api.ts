import type { DiceContext, DiceDraft, DiceEnvelope, DiceReply, DiceRollRequest, DiceSessionState, DiceSimulation } from "../domain/dice/dice";

export interface DiceApi {
  updateDiceContext(context: DiceContext): Promise<DiceReply<DiceSessionState>>;
  updateDicePreferences(draft: DiceDraft): Promise<DiceReply<DiceDraft>>;
  beginDiceRoll(request: DiceRollRequest): Promise<DiceReply<{ rollId: string }>>;
  completeDiceRoll(rollId: string, simulation: DiceSimulation): Promise<DiceReply<DiceSessionState>>;
  failDiceRoll(rollId: string): Promise<DiceReply<DiceSessionState>>;
  getDmDiceSession(): Promise<DiceReply<DiceSessionState>>;
  clearDiceHistory(): Promise<DiceReply<DiceSessionState>>;
  dismissDiceRoll(rollId: string): Promise<DiceReply<DiceSessionState>>;
  setDiceResultVisibility(rollId: string, visible: boolean): Promise<DiceReply<DiceSessionState>>;
  getPublicDiceState(): Promise<DiceReply<DiceEnvelope>>;
  reportDiceRenderStatus(rollId: string, ok: boolean): Promise<unknown>;
  onDicePresentation(handler: (value: DiceEnvelope) => void): () => void;
  onDiceRenderError(handler: (message: string) => void): () => void;
}
