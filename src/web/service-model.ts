import { z } from "zod";
import { systemRefSchema, systemDefinitionSchema, availabilitySchema } from "../domain/systems/system-catalog";
import { gameMetadataSchema } from "../domain/games/game-metadata";
export const ok = z.literal(true);
export const accountSchema = z.object({ id:z.string(), email:z.string(), name:z.string(), role:z.enum(["admin","dm"]), enabled:z.boolean(), mustChangePassword:z.boolean(), emailVerified:z.boolean(), createdAt:z.string(), updatedAt:z.string() });
export const identitySchema = z.object({ ok, account:accountSchema, sessionId:z.string(), expiresAt:z.string() });
export const gameReply = z.object({ok,game:gameMetadataSchema});
export const gamesReply = z.object({ok,games:z.array(gameMetadataSchema),total:z.number()});
export const versionSchema = z.object({systemId:z.string(),version:z.number(),state:z.enum(["draft","published"]),createdAt:z.string(),publishedAt:z.string().nullable(),revision:z.number(),availability:availabilitySchema,definition:systemDefinitionSchema,hash:z.string(),templates:z.record(z.string(),z.object({availability:availabilitySchema,revision:z.number()}))});
export const systemsReply = z.object({ok,systems:z.array(z.object({systemId:z.string(),name:z.string(),versions:z.array(versionSchema)}))});
export const selectableReply = z.object({ok,systems:z.array(z.object({ref:systemRefSchema,name:z.string(),templates:z.array(z.object({id:z.string(),name:z.string()}))}))});
export const configurationReply = z.object({ok,configuration:z.object({ref:systemRefSchema,definition:systemDefinitionSchema,hash:z.string(),availability:availabilitySchema})});
export const openingSchema = z.object({id:z.string(),gameId:z.string(),generation:z.number(),revision:z.number(),state:z.enum(["open","closed"])}).passthrough();
export const openingReply = z.object({ok,opening:openingSchema.nullable(),invitation:z.object({version:z.number(),createdAt:z.string(),expiresAt:z.string()}).nullable(),systemRef:systemRefSchema,status:z.enum(["fresh","reconnecting","expired","absent"]),invitationUrl:z.string().optional(),secretAvailable:z.boolean().optional(),replayed:z.boolean().optional()});
export type OpeningReply = z.infer<typeof openingReply>;
export const rosterReply = z.object({ok,openingId:z.string(),generation:z.number(),status:z.enum(["open","closed","expired"]),items:z.array(z.object({participantId:z.string(),alias:z.string(),discriminator:z.number(),admission:z.enum(["admitted","left","revoked"]),presence:z.enum(["connected","reconnecting","revoked","left","expired"]),admittedAt:z.string()})),total:z.number(),revision:z.number(),presenceSequence:z.number()});
export const kickReply = z.object({ok,participantId:z.string(),outcome:z.enum(["revoked","already-revoked"]),secretAvailable:z.boolean(),replayed:z.boolean(),invitationUrl:z.string().optional()}).passthrough();
export { Mutations } from "../infrastructure/browser/mutations";
export function failureMessage(error:unknown){return error instanceof Error?error.message:"No se pudo completar la operación.";}
