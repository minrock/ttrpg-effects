import { z } from "zod";
import { API_PREFIX } from "../../shared/contracts/http-api";
export class ServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 0) { super(message); }
}
const failure = z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });
export const sessionSchema = z.object({ ok: z.literal(true), role: z.enum(["dm", "player"]), expiresAt: z.string().datetime() });
export class HttpTransport {
  private generation = 0;
  private lifecycle = new AbortController();
  get sessionSignal(): AbortSignal { return this.lifecycle.signal; }
  private blocked = false;
  private readonly pending = new Set<AbortController>();
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly expired: () => void = () => {}, private readonly prefix = API_PREFIX, private readonly readQuery = "") {}
  invalidate(): void { this.lifecycle.abort(); this.lifecycle = new AbortController(); this.generation++; this.blocked = true; for (const request of this.pending) request.abort(); this.pending.clear(); }
  resume(): void { this.blocked = false; }
  async request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) throw new ServiceError("INVALID_PATH", "Ruta inválida.");
    if (this.blocked && !path.startsWith("/auth/")) throw new ServiceError("UNAUTHORIZED", "La sesión expiró. Vuelve a acceder para guardar.", 401);
    const generation = this.generation;
    const controller = new AbortController(); this.pending.add(controller);
    try {
      const fetchRequest = this.fetcher;
      const response = await fetchRequest(this.prefix + path + ((init.method ?? "GET") === "GET" ? this.readQuery : ""), { ...init, credentials: "same-origin", signal: controller.signal });
      if (generation !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
      if (response.status === 401 && !path.startsWith("/auth/")) { this.invalidate(); this.expired(); }
      const bodyGeneration = this.generation;
      if (!response.ok) {
        let details: z.infer<typeof failure> | undefined;
        try { details = failure.parse(await response.json()); } catch { /* El status conserva su semántica aunque el proxy devuelva HTML. */ }
        if (this.readQuery && ([403, 404].includes(response.status) || response.status === 409 && details?.error.code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
        if (bodyGeneration !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
        throw new ServiceError(details?.error.code ?? `HTTP_${response.status}`, details?.error.message ?? ({ 401: "La sesión expiró. Vuelve a acceder.", 403: "No tienes permiso para esta operación.", 404: "El recurso ya no existe.", 413: "El archivo supera el límite permitido." }[response.status] ?? "El servicio no pudo completar la operación. Reintenta."), response.status);
      }
      let raw: unknown;
      try { raw = response.status === 204 ? undefined : response.headers.get("content-type")?.includes("application/json") ? await response.json() : null; }
      catch { if (generation !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior."); throw new ServiceError("INVALID_RESPONSE", "El servicio devolvió JSON inválido. Reintenta."); }
      if (generation !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ServiceError("INVALID_RESPONSE", "El servicio devolvió una respuesta inválida. Reintenta.");
      return parsed.data;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(generation !== this.generation ? "STALE" : "NETWORK", generation !== this.generation ? "Operación cancelada por cambio de sesión." : "No se pudo conectar con el servicio. Comprueba la conexión y reintenta.");
    } finally { this.pending.delete(controller); }
  }
  async stream(path: string, signal: AbortSignal, cursor?: string): Promise<Response> {
    if (this.blocked) throw new ServiceError("UNAUTHORIZED", "La sesión expiró.", 401);
    const fetchRequest = this.fetcher;
    const response = await fetchRequest(this.prefix + path + this.readQuery, { credentials: "same-origin", signal, headers: cursor ? { "Last-Event-ID": cursor } : {} });
    if (response.status === 401) { this.invalidate(); this.expired(); }
    if (!response.ok) {
      let code = "STREAM";
      if (this.readQuery && response.status === 409) { try { code = failure.parse(await response.json()).error.code; } catch { /* Conflicto sin causa contextual verificable. */ } }
      if (this.readQuery && ([403, 404].includes(response.status) || code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
      throw new ServiceError(code, "No se pudo conectar la mesa.", response.status);
    }
    if (!response.headers.get("content-type")?.includes("text/event-stream")) throw new ServiceError("STREAM", "El servicio devolvió un stream inválido.");
    return response;
  }
  json<T>(path: string, schema: z.ZodType<T>, method: string, payload?: unknown): Promise<T> {
    return this.request(path, schema, { method, ...(payload === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }) });
  }
}
export async function result<T>(operation: () => Promise<T>): Promise<T | { readonly ok: false; readonly error: string }> {
  try { return await operation(); } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo completar la operación." }; }
}
