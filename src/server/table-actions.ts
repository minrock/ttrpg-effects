import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { TableConflict, type TableSession } from "../application/services/table-session";
import { mutationSchema, tablePayloads, dicePayloads } from "../shared/contracts/table";
import type { ServiceRole } from "../shared/contracts/http-api";
import { HttpError, invalid, missing } from "./errors";
import { parse } from "./schemas";
const dmOnly = () => new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
export function executeTableCommand(table: TableSession, key: string, family: string, action: string, role: ServiceRole, raw: unknown, publicOrigin = ""): unknown {
    const playerActions = ["camera-report", "ready", "map-image-status"];
    if (family === "table" && (playerActions.includes(action) ? role !== "player" : role !== "dm")) throw dmOnly();
    if (family === "dice" && action !== "render-status" && role !== "dm") throw dmOnly();
    const command = parse(mutationSchema, raw);
    const fingerprint = createHash("sha256").update(JSON.stringify([family, action, command])).digest("hex");
    try {
      return table.once(key, command.requestId, fingerprint, () => {
        if (!(family === "table" && ["open", "scene"].includes(action)) && !(family === "dice" && ["context", "preferences", "size", "clear-history"].includes(action))) table.check(command.context);
        if (family === "table") {
          switch (action) {
            case "open": { const p = parse(tablePayloads.open, command.payload); if (p.snapshot) table.publish(p.snapshot); return { ok: true, state: table.state(role), playerUrl: publicOrigin + "/?view=player" }; }
            case "scene": table.publish(parse(tablePayloads.scene, command.payload)); break;
            case "camera": table.setCamera(parse(tablePayloads.camera, command.payload)); break;
            case "camera-command": table.setCommand(parse(tablePayloads["camera-command"], command.payload)); break;
            case "camera-report": table.report(key, command.connectionId, parse(tablePayloads["camera-report"], command.payload)); break;
            case "pointer": table.setPointer(parse(tablePayloads.pointer, command.payload)); break;
            case "area-highlight": table.setHighlight(parse(tablePayloads["area-highlight"], command.payload)); break;
            case "ready": parse(tablePayloads.ready, command.payload); table.ready(key, command.connectionId, command.revision); break;
            case "map-image-status": table.imageStatus(key, command.connectionId, command.revision, parse(tablePayloads["map-image-status"], command.payload)); break;
            default: throw missing();
          }
          return action === "scene" ? { ok: true, state: table.state(role) } : { ok: true };
        }
        switch (action) {
          case "context": table.dice.setContext(parse(dicePayloads.context, command.payload)); break;
          case "preferences": return { ok: true, value: table.dice.setDraft(parse(dicePayloads.preferences, command.payload)) };
          case "begin": return { ok: true, value: table.dice.begin(parse(dicePayloads.begin, command.payload)) };
          case "complete": { const p = parse(dicePayloads.complete, command.payload); table.dice.complete(p.rollId, p.simulation); break; }
          case "fail": table.dice.fail(parse(dicePayloads.fail, command.payload).rollId); break;
          case "dismiss": table.dice.dismiss(parse(dicePayloads.dismiss, command.payload).rollId); break;
          case "visibility": { const p = parse(dicePayloads.visibility, command.payload); table.dice.setResultVisibility(p.rollId, p.visible); break; }
          case "clear-history": parse(dicePayloads["clear-history"], command.payload); table.dice.clearHistory(); break;
          case "size": { const p = parse(dicePayloads.size, command.payload); const value = table.dice.setSize(p); table.emit("sizes", value, "dm"); if (p.view === "player") table.emit("sizes", table.sizes("player"), "player"); return { ok: true, value }; }
          case "render-status": {
            const p = parse(dicePayloads["render-status"], command.payload);
            if (role === "player") table.connection(key, command.connectionId);
            const current = role === "dm" ? table.dice.getDmState().envelope : table.dice.getPublicState();
            if (current.presentation?.rollId !== p.rollId) throw new TableConflict("La tirada ya no está visible.");
            if (!p.ok) table.emit("render-error", "No se pudo dibujar la tirada. Se conserva el resultado autorizado.", "dm");
            return { ok: true };
          }
          default: throw missing();
        }
        return { ok: true, value: table.dice.getDmState() };
      }, role);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof TableConflict) throw new HttpError(409, "TABLE_CONFLICT", error.message);
      if (error instanceof ZodError) throw invalid("Los datos de la mesa no son válidos.");
      throw new HttpError(409, "DICE_CONFLICT", error instanceof Error ? error.message : "No se pudo completar la acción.");
    }
  }
