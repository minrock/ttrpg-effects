import type { ReadStream, WriteStream } from "node:tty";
export class PromptCancelled extends Error { constructor() { super("Operación cancelada. No se completó la provisión."); } }
export interface IdentityPrompts { ask(label: string, secret?: boolean): Promise<string>; write(message: string): void }
/** Sin argv/env de contraseñas. TTY real, eco controlado, restauración en todo camino. */
export function terminalPrompts(input: ReadStream = process.stdin, output: WriteStream = process.stdout): IdentityPrompts {
  return {
    write: message => { output.write(message + "\n"); },
    ask(label, secret = false) {
      if (!input.isTTY || !output.isTTY) return Promise.reject(new Error("Se requiere una terminal TTY interactiva; no se admiten contraseñas por pipe, argumentos ni variables."));
      return new Promise((resolve, reject) => {
        let value = ""; const previousRaw = input.isRaw; const previousEncoding = input.readableEncoding;
        const cleanup = () => {
          input.off("data", data); input.off("end", cancel); input.off("error", cancel);
          process.off("SIGINT", cancel); process.off("SIGTERM", cancel);
          input.setRawMode(previousRaw); input.setEncoding(previousEncoding ?? "utf8"); input.pause(); output.write("\n");
        };
        const cancel = () => { cleanup(); value = ""; reject(new PromptCancelled()); };
        const data = (chunk: string) => {
          for (const character of chunk) {
            if (character === "\u0003" || character === "\u0004" || character === "\u001b") { cancel(); return; }
            if (character === "\r" || character === "\n") { cleanup(); resolve(value); value = ""; return; }
            if (character === "\u007f" || character === "\b") { value = [...value].slice(0, -1).join(""); if (!secret) output.write("\b \b"); continue; }
            if (character.charCodeAt(0) < 32) continue;
            if (Buffer.byteLength(value + character, "utf8") > 2048) { cleanup(); value = ""; reject(new Error("Entrada demasiado larga.")); return; }
            value += character; if (!secret) output.write(character);
          }
        };
        input.setEncoding("utf8"); input.setRawMode(true); input.resume(); input.on("data", data); input.once("end", cancel); input.once("error", cancel);
        process.once("SIGINT", cancel); process.once("SIGTERM", cancel);
        output.write(label + ": ");
      });
    }
  };
}
