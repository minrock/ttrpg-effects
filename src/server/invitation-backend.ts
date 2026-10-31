/** Composición backend compartida con el artefacto API; no monta el ServiceStore legado. */
export { openIdentity } from "../infrastructure/server/identity";
export { openInvitations } from "../infrastructure/server/invitations";
export { createInvitationHttp, isInvitationPath } from "./invitation-http";
export { createOwnedHttp } from "./owned-http";
export { createIdentityHttp } from "./identity-http";
export { openModerationBackend } from "./moderation-backend";
