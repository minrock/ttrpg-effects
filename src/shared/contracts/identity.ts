/** Identidad de cuenta; nunca equivale a ServiceRole ni a un participante invitado. */
export interface AccountDto {
  id: string; email: string; name: string; role: "admin" | "dm";
  enabled: boolean; mustChangePassword: boolean; emailVerified: boolean;
  createdAt: string; updatedAt: string;
}
export interface IdentitySessionDto { account: AccountDto; sessionId: string; expiresAt: string }
