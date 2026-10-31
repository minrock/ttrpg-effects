import { z } from "zod";
import { API_PREFIX } from "../../shared/contracts/http-api";
export class ServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 0, readonly retryAfter = 0) { super(message); }
}
const publicIdentity = new Set(["/identity/login", "/identity/logout", "/identity/session", "/auth/login", "/auth/logout", "/auth/session"]);
const unboundIdentity = new Set(["/identity/login", "/identity/logout"]);
const failure = z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });
export const sessionSchema = z.object({ ok: z.literal(true), role: z.enum(["dm", "player"]), expiresAt: z.string().datetime() });
export class HttpTransport {
  private generation = 0;
  private lifecycle = new AbortController();
  get sessionSignal(): AbortSignal { return this.lifecycle.signal; }
  private blocked = false;
  private principalId?: string;
  get accountId(): string | undefined { return this.principalId; }
  clearAccount(): void { this.invalidate(); this.principalId = undefined; }
  bindAccount(id: string): void { if (this.principalId !== id) { this.invalidate(); this.principalId = id; } this.resume(); }
  private headers(path: string, supplied?: HeadersInit): Headers { const headers = new Headers(supplied); if (this.principalId && !unboundIdentity.has(path)) headers.set("X-TTRPG-Account", this.principalId); return headers; }
  private retryNotBefore = 0;
  private checkRetry(){const seconds=Math.ceil((this.retryNotBefore-Date.now())/1000);if(seconds>0)throw new ServiceError("RATE_LIMITED",`Espera ${seconds} segundos antes de reintentar.`,429,seconds);}
  private retryAfter(response:Response){const value=Number(response.headers.get("Retry-After")??0);const seconds=Number.isFinite(value)?Math.max(1,Math.min(3600,value)):1;if(response.status===429)this.retryNotBefore=Date.now()+seconds*1000;return seconds;}
  private readonly pending = new Set<AbortController>();
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly expired: () => void = () => {}, private readonly prefix = API_PREFIX, private readonly readQuery = "") {}
  invalidate(): void { this.lifecycle.abort(); this.lifecycle = new AbortController(); this.generation++; this.blocked = true; for (const request of this.pending) request.abort(); this.pending.clear(); }
  resume(): void { this.blocked = false; }
  async request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) throw new ServiceError("INVALID_PATH", "Ruta inválida.");
    if (this.blocked && !publicIdentity.has(path)) throw new ServiceError("UNAUTHORIZED", "La sesión expiró. Vuelve a acceder para guardar.", 401);
    this.checkRetry();
    const generation = this.generation;
    const controller = new AbortController(); this.pending.add(controller);
    try {
      const fetchRequest = this.fetcher;
      const response = await fetchRequest(this.prefix + path + ((init.method ?? "GET") === "GET" ? this.readQuery : ""), { ...init, credentials: "same-origin", headers: this.headers(path, init.headers), signal: controller.signal });
      if (generation !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
      if (response.status === 401 && (!publicIdentity.has(path) || path === "/identity/session" && !!this.principalId)) { this.invalidate(); this.expired(); }
      const bodyGeneration = this.generation;
      if (!response.ok) {
        let details: z.infer<typeof failure> | undefined;
        try { details = failure.parse(await response.json()); } catch { /* El status conserva su semántica aunque el proxy devuelva HTML. */ }
        if(details?.error.code === "PASSWORD_CHANGE_REQUIRED") { this.invalidate(); this.expired(); }
        if (this.readQuery && ([403, 404].includes(response.status) || response.status === 409 && details?.error.code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
        if (bodyGeneration !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
        throw new ServiceError(details?.error.code ?? `HTTP_${response.status}`, details?.error.message ?? ({ 401: "La sesión expiró. Vuelve a acceder.", 403: "No tienes permiso para esta operación.", 404: "El recurso ya no existe.", 413: "El archivo supera el límite permitido." }[response.status] ?? "El servicio no pudo completar la operación. Reintenta."), response.status, this.retryAfter(response));
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
    this.checkRetry();
    const generation = this.generation;
    const fetchRequest = this.fetcher;
    const response = await fetchRequest(this.prefix + path + this.readQuery, { credentials: "same-origin", signal, headers: this.headers(path, cursor ? { "Last-Event-ID": cursor } : {}) });
    if (generation !== this.generation) { await response.body?.cancel(); throw new ServiceError("STALE", "La mesa pertenece a una sesión anterior."); }
    if (response.status === 401) { this.invalidate(); this.expired(); }
    if (!response.ok) {
      let code = "STREAM";
      if (this.readQuery && response.status === 409) { try { code = failure.parse(await response.json()).error.code; } catch { /* Conflicto sin causa contextual verificable. */ } }
      if (this.readQuery && ([403, 404].includes(response.status) || code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
      throw new ServiceError(code, "No se pudo conectar la mesa.", response.status,this.retryAfter(response));
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
