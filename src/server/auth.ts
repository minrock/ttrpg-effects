import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { ServiceRole } from "../shared/contracts/http-api";
import { LIMITS, type ServerConfig } from "./config";
import { HttpError } from "./errors";

interface Session { readonly role: ServiceRole; readonly expiresAt: number }
export class Auth {
  private readonly sessions = new Map<string, Session>();
  private readonly rates = new Map<string, { count: number; end: number }>();
  constructor(private readonly config: ServerConfig, private readonly now: () => number) {}
  token(req: IncomingMessage): string {
    return (req.headers.cookie ?? "").split(";").map((v) => v.trim()).find((v) => v.startsWith("ttrpg_session="))?.slice(14) ?? "";
  }
  get(req: IncomingMessage): Session | undefined {
    const token = this.token(req);
    const value = this.sessions.get(token);
    if (value && value.expiresAt <= this.now()) { this.sessions.delete(token); return undefined; }
    return value;
  }
  require(req: IncomingMessage): Session {
    const session = this.get(req);
    if (!session) throw new HttpError(401, "UNAUTHORIZED", "Inicia sesión para continuar.");
    return session;
  }
  logout(req: IncomingMessage): void { this.sessions.delete(this.token(req)); }
  login(req: IncomingMessage, key: string): { token: string; session: Session } {
    const digest = (value: string) => createHash("sha256").update(value).digest();
    const dm = timingSafeEqual(digest(key), digest(this.config.dmKey));
    const player = timingSafeEqual(digest(key), digest(this.config.playerKey));
    if (!dm && !player) throw new HttpError(401, "UNAUTHORIZED", "La clave no es válida.");
    for (const [token, value] of this.sessions) if (value.expiresAt <= this.now()) this.sessions.delete(token);
    this.logout(req);
    if (this.sessions.size >= LIMITS.sessions) throw new HttpError(429, "RATE_LIMITED", "Hay demasiadas sesiones. Intenta más tarde.");
    const token = randomBytes(32).toString("hex");
    const session: Session = { role: dm ? "dm" : "player", expiresAt: this.now() + LIMITS.sessionMs };
    this.sessions.set(token, session);
    return { token, session };
  }
  cookie(token: string): string {
    return `ttrpg_session=${token}; HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=${token ? LIMITS.sessionMs / 1000 : 0}${this.config.publicOrigin.startsWith("https:") ? "; Secure" : ""}`;
  }
  rate(req: IncomingMessage, login = false): void {
    const now = this.now();
    for (const [key, value] of this.rates) if (value.end <= now) this.rates.delete(key);
    const key = `${login ? "login" : "all"}:${req.socket.remoteAddress ?? "unknown"}`;
    const value = this.rates.get(key) ?? { count: 0, end: now + 60_000 };
    if (!this.rates.has(key) && this.rates.size >= LIMITS.rateEntries) throw new HttpError(429, "RATE_LIMITED", "Demasiadas conexiones. Intenta más tarde.");
    this.rates.set(key, value);
    value.count++;
    if (value.count > (login ? LIMITS.loginPerMinute : LIMITS.requestsPerMinute)) throw new HttpError(429, "RATE_LIMITED", "Demasiadas solicitudes. Espera un minuto.");
  }
}
