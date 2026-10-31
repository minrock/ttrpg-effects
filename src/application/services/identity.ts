import type { AccountDto, IdentitySessionDto } from "../../shared/contracts/identity";
import type { OwnedTransaction } from "./owned-store";
export type IdentityCode = "INVALID_INPUT" | "UNAUTHORIZED" | "FORBIDDEN" | "PASSWORD_CHANGE_REQUIRED" | "CONFLICT" | "NOT_FOUND" | "RATE_LIMITED" | "UNAVAILABLE";
const messages: Record<IdentityCode, string> = {
  INVALID_INPUT: "Los datos de identidad no son válidos.", UNAUTHORIZED: "Credenciales o sesión no válidas.",
  FORBIDDEN: "Esta operación requiere una cuenta administradora activa.", PASSWORD_CHANGE_REQUIRED: "Debes cambiar la contraseña temporal antes de continuar.",
  CONFLICT: "La cuenta ya existe o el bootstrap ya se completó.", NOT_FOUND: "No se encontró la cuenta DM.",
  RATE_LIMITED: "Demasiados intentos. Espera un minuto e intenta de nuevo.", UNAVAILABLE: "No se pudo acceder a identidad. Comprueba la configuración, migraciones y conexión."
};
export class IdentityError extends Error { constructor(readonly code: IdentityCode) { super(messages[code]); } }
export interface NewAccount { email: string; name: string; password: string }
export type DmAction = "disable" | "enable" | "password" | "revoke-sessions";
export interface IdentityService {
  login(email: string, password: string, peer: string): Promise<{ identity: IdentitySessionDto; cookie: string }>;
  session(cookie: string): Promise<IdentitySessionDto>;
  logout(cookie: string, all?: boolean): Promise<void>;
  changePassword(cookie: string, currentPassword: string, newPassword: string): Promise<void>;
  createDm(cookie: string, input: NewAccount): Promise<AccountDto>;
  listDms(cookie: string, limit: number, offset: number): Promise<{ accounts: AccountDto[]; total: number }>;
  administer(cookie: string, id: string, action: DmAction, password?: string): Promise<void>;
  bootstrap(input: NewAccount): Promise<AccountDto>;
  recoverAdmin(email: string, password: string): Promise<void>;
  /** Bloqueo/revalidación y recursos006 en la misma transacción. No usar tx tras el callback. */
  authorized<T>(cookie: string, role: "admin" | "dm" | undefined, work: (identity: IdentitySessionDto, tx: OwnedTransaction) => Promise<T>): Promise<T>;
  clearCookie(): string;
  close(): Promise<void>;
}
