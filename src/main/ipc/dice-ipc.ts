import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import { DiceRollSession } from "../../application/services/dice-roll-session";

interface DiceIpcOptions { getDmWindow: () => BrowserWindow | null; getPlayerWindow: () => BrowserWindow | null }
export function registerDiceIpc(options: DiceIpcOptions): () => void {
  const send = (role: "dm" | "player", channel: string, payload: unknown): void => {
    const window = role === "dm" ? options.getDmWindow() : options.getPlayerWindow();
    if (window && !window.isDestroyed()) window.webContents.send(channel, payload);
  };
  const session = new DiceRollSession((role, payload) => send(role, "dice:presentation", payload));
  options.getDmWindow()?.webContents.on("render-process-gone", () => session.interrupt());
  const authorized = (event: IpcMainInvokeEvent, role: "dm" | "player"): boolean => {
    const window = role === "dm" ? options.getDmWindow() : options.getPlayerWindow();
    return Boolean(window && !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame);
  };
  const handle = (channel: string, role: "dm" | "player", action: (value: unknown) => unknown): void => {
    ipcMain.handle(channel, (event, value: unknown) => {
      if (!authorized(event, role)) return { ok: false, error: "Operacion de dados no autorizada." };
      try { return { ok: true, value: action(value) }; }
      catch (error) { return { ok: false, error: error instanceof z.ZodError ? "Datos de tirada invalidos." : error instanceof Error ? error.message : "No fue posible procesar la tirada." }; }
    });
  };
  handle("dice:context", "dm", value => { session.setContext(value); return session.getDmState(); });
  handle("dice:preferences", "dm", value => session.setDraft(value));
  handle("dice:set-size", "dm", value => {
    const sizes = session.setSize(value);
    send("dm", "dice:sizes", sizes); send("player", "dice:sizes", sizes);
    return sizes;
  });
  ipcMain.handle("dice:get-sizes", event => authorized(event, "dm") || authorized(event, "player")
    ? { ok: true, value: session.getSizes() } : { ok: false, error: "Operacion de dados no autorizada." });
  handle("dice:begin", "dm", value => session.begin(value));
  handle("dice:complete", "dm", value => {
    const data = z.object({ rollId: z.string().min(1).max(160), simulation: z.unknown() }).parse(value);
    return session.complete(data.rollId, data.simulation);
  });
  handle("dice:fail", "dm", value => { session.fail(z.string().min(1).max(160).parse(value)); return session.getDmState(); });
  handle("dice:dm-state", "dm", () => session.getDmState());
  handle("dice:clear-history", "dm", () => { session.clearHistory(); return session.getDmState(); });
  handle("dice:dismiss", "dm", value => { session.dismiss(z.string().min(1).max(160).parse(value)); return session.getDmState(); });
  handle("dice:result-visibility", "dm", value => { const data = z.object({ rollId: z.string().max(160), visible: z.boolean() }).parse(value); session.setResultVisibility(data.rollId, data.visible); return session.getDmState(); });
  handle("dice:public-state", "player", () => session.getPublicState());
  ipcMain.handle("dice:render-status", (event, value: unknown) => {
    const isDm = authorized(event, "dm");
    if (!isDm && !authorized(event, "player")) return { ok: false };
    const data = z.object({ rollId: z.string().max(160), ok: z.boolean() }).safeParse(value);
    if (!data.success) return { ok: false };
    const current = isDm ? session.getDmState().envelope : session.getPublicState();
    if (current.presentation?.rollId === data.data.rollId && !data.data.ok) send("dm", "dice:render-error", isDm ? "No se pudo mostrar la animacion 3D. El resultado se conserva." : "Player View no pudo mostrar los dados 3D. El resultado se conserva.");
    return { ok: true };
  });
  const timer = setInterval(() => session.sweep(), 1000);
  timer.unref();
  return () => { clearInterval(timer); session.interrupt(); };
}
