import { ZodError } from "zod";
import type { DiceContext } from "../domain/dice/dice";
import { ServiceDiceError, type ServiceDiceActor } from "../application/services/service-dice-session";
import type { TableSession } from "../application/services/table-session";
import {
  serviceDiceBeginSchema,
  serviceDiceClearHistorySchema,
  serviceDiceCompleteSchema,
  serviceDiceDismissSchema,
  serviceDiceFailSchema,
  serviceDicePrivateContextSchema,
  serviceDiceVisibilitySchema
} from "../shared/contracts/service-dice";
import { HttpError } from "./errors";

/** El actor se deriva de Scope; ningún campo del cuerpo participa en autoridad. */
export function serviceDiceActor(role: "dm" | "player", ownerId: string, participant?: { id: string; alias: string; discriminator: number }): ServiceDiceActor {
  if (role === "dm") return { id: ownerId, role, author: { kind: "dm" } };
  if (!participant) throw new HttpError(403, "FORBIDDEN", "La admisión de jugador ya no está activa.");
  return { id: participant.id, role, author: { kind: "player", publicId: participant.id, alias: participant.alias, discriminator: participant.discriminator } };
}

export function executeServiceDiceAction(table: TableSession, actor: ServiceDiceActor, action: string, command: unknown) {
  try {
    switch (action) {
      case "begin": return table.serviceDice.begin(actor, serviceDiceBeginSchema.parse(command));
      case "complete": { const value = serviceDiceCompleteSchema.parse(command); return table.serviceDice.complete(actor, value.rollId, value.simulation, value.requestId); }
      case "fail": { const value = serviceDiceFailSchema.parse(command); return table.serviceDice.fail(actor, value.rollId, value.requestId); }
      case "dismiss": { const value = serviceDiceDismissSchema.parse(command); return table.serviceDice.dismiss(actor, value.rollId, value.requestId); }
      case "private-context": { const value = serviceDicePrivateContextSchema.parse(command); return table.serviceDice.setPrivateContextCommand(actor, value.context as DiceContext, value.requestId); }
      case "visibility": { const value = serviceDiceVisibilitySchema.parse(command); return table.serviceDice.setMapResultVisibility(actor, value.rollId, value.visible, value.requestId); }
      case "clear-history": { const value = serviceDiceClearHistorySchema.parse(command); return table.serviceDice.clearHistory(actor, value.requestId); }
      default: throw new HttpError(404, "NOT_FOUND", "No se encontró la acción de dados.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof ZodError) throw new HttpError(400, "INVALID_INPUT", "Los datos de dados no son válidos.");
    if (error instanceof ServiceDiceError) {
      const status = error.code === "FORBIDDEN" ? 403 : error.code === "DICE_RATE_LIMITED" ? 429 : 409;
      throw new HttpError(status, error.code, error.message);
    }
    throw error;
  }
}
