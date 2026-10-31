import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError } from "./errors";
import { LIMITS } from "./config";
export async function body(req: IncomingMessage, res: ServerResponse, limit: number, signal?: AbortSignal): Promise<Buffer> {
  const length = Number(req.headers["content-length"] ?? 0);
  if (length > limit) { res.setHeader("Connection", "close"); throw new HttpError(413, "PAYLOAD_TOO_LARGE", "El contenido supera el límite permitido."); }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0; let oversized = false;
    const clean = () => { clearTimeout(timer); req.off("data", data); req.off("end", end); req.off("error", error); req.off("aborted", aborted); signal?.removeEventListener("abort", aborted); };
    const error = () => { clean(); reject(new HttpError(400, "INVALID_BODY", "No se pudo completar la carga.")); };
    const aborted = () => error();
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) { oversized = true; chunks.length = 0; }
      else chunks.push(chunk);
    };
    const end = () => { clean(); if (oversized) reject(new HttpError(413, "PAYLOAD_TOO_LARGE", "El contenido supera el límite permitido.")); else resolve(Buffer.concat(chunks)); };
    const timer = setTimeout(() => { clean(); req.pause(); res.setHeader("Connection", "close"); reject(new HttpError(408, "REQUEST_TIMEOUT", "La carga tardó demasiado.")); }, LIMITS.bodyMs);
    if (signal?.aborted) { aborted(); return; }
    signal?.addEventListener("abort", aborted, { once: true });
    req.on("data", data); req.on("end", end); req.on("error", error); req.on("aborted", aborted);
  });
}
export async function json(req: IncomingMessage, res: ServerResponse, limit: number = LIMITS.jsonBytes, signal?: AbortSignal): Promise<unknown> {
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Se requiere Content-Type application/json.");
  const bytes = await body(req, res, limit, signal);
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new HttpError(400, "INVALID_JSON", "El JSON no es válido."); }
}
