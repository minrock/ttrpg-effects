import { ApplicationError } from "./application-error";
import type { Opening } from "./owned-store";
import type { GuestDto, InvitationMetadata, ExpectedOpening, OpeningContext } from "../../shared/contracts/invitations";
import type { SystemRef } from "../../domain/systems/system-catalog";
export type InvitationCode = "INVALID_INPUT" | "INVITATION_UNAVAILABLE" | "GUEST_UNAUTHORIZED" | "HOST_UNAVAILABLE" | "REVISION_CONFLICT" | "OPERATION_CONTENT_CONFLICT" | "ADMISSION_ALREADY_PROCESSED" | "ALIAS_CONFLICT" | "RATE_LIMITED" | "UNAVAILABLE";
const messages: Record<InvitationCode, string> = {
  INVALID_INPUT: "Los datos de entrada no son válidos.", INVITATION_UNAVAILABLE: "El enlace no está disponible. Solicita uno vigente al DM", GUEST_UNAUTHORIZED: "El acceso expiró o ya no está disponible. Solicita un enlace vigente al DM.", HOST_UNAVAILABLE: "El anfitrión está reconectando. Intenta entrar cuando regrese.", REVISION_CONFLICT: "La apertura cambió. Recarga su estado antes de reintentar.", OPERATION_CONTENT_CONFLICT: "La clave de operación ya tiene otro contenido.", ADMISSION_ALREADY_PROCESSED: "La entrada ya fue procesada. Consulta tu sesión o intenta entrar de nuevo con una clave nueva.", ALIAS_CONFLICT: "Ya tienes una identidad en esta apertura. Sal antes de entrar con otro alias.", RATE_LIMITED: "Se alcanzó el límite de entradas. Espera antes de reintentar.", UNAVAILABLE: "No se pudo completar la operación. Consulta el estado antes de reintentar."
};
export class InvitationError extends ApplicationError { constructor(readonly code: InvitationCode, readonly retryAt?: string) { super(messages[code]); } }
/** Privado del DM y prestado solamente dentro de IdentityService.authorized. */
export interface InvitationRepository {
  participants(gameId: string, openingId: string): Promise<{ items: import("../../shared/contracts/moderation").Participant[]; revision: number }>;
  revoke(gameId: string, openingId: string, participantId: string, invitationVersion: number): Promise<boolean>;
  current(gameId: string, openingId: string): Promise<InvitationMetadata | null>;
  issue(gameId: string, openingId: string, expectedVersion: number, hash: string): Promise<InvitationMetadata>;
  sponsor(gameId: string, openingId: string): Promise<boolean>;
  audit(gameId: string, openingId: string, action: "start" | "reopen" | "rotate" | "close"): Promise<void>;
}
/** Capacidad010: no expone repositorios privados ni SQL. DTO no es autoridad. */
export interface GuestTransaction {
  session(): Promise<GuestDto>; leave(): Promise<void>;
  transport(): Promise<{ participantExpiresAt?: string; context: import("./game-runtime").GameContext; system: import("../../domain/systems/system-catalog").ResolvedSystem }>;
  asset(id: string): Promise<{ mime: string; bytes: Uint8Array } | null>;
  deliver(effect: () => void, uncertain: () => void): Promise<void>;
}
export interface GuestAuthority {
  admit(gameId: string, input: { secret: string; alias: string }, requestId: string, token: string | null): Promise<{ guest: GuestDto; token?: string; replayed: boolean }>;
  authorized<T>(gameId: string, token: string | null, work: (guest: GuestDto, tx: GuestTransaction) => Promise<T>): Promise<T>;
  leave(gameId: string, token: string | null): Promise<void>;
  close(): Promise<void>;
}
export interface OpeningStatus { opening: Opening | null; invitation: InvitationMetadata | null; systemRef: SystemRef; status: "fresh" | "reconnecting" | "expired" | "absent" }
export interface InvitationDelivery extends OpeningStatus { replayed: boolean; secretAvailable: boolean; invitationUrl?: string }
export interface InvitationService {
  status(cookie: string, gameId: string): Promise<OpeningStatus>;
  start(cookie: string, gameId: string, expected: ExpectedOpening | null, revision: number, requestId: string, reopen?: boolean): Promise<InvitationDelivery>;
  heartbeat(cookie: string, gameId: string, context: OpeningContext): Promise<OpeningStatus>;
  rotate(cookie: string, gameId: string, context: OpeningContext & { expectedInvitationVersion: number }, revision: number, requestId: string): Promise<InvitationDelivery>;
  end(cookie: string, gameId: string, context: OpeningContext, revision: number, requestId: string): Promise<void>;
  readonly guests: GuestAuthority;
  close(): Promise<void>;
}
