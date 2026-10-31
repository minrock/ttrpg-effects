import { z } from "zod";
import { canonicalUuid, openingContextSchema, rotateSchema } from "./invitations";
import { systemRefSchema, moduleManifestSchema } from "../../domain/systems/system-catalog";
import { tableEventSchema, tableStateSchema } from "./table";
export const participantState = z.enum(["connected", "reconnecting", "revoked", "left", "expired"]);
export const rosterQuerySchema = openingContextSchema.extend({ generation: z.coerce.number().int().min(1), limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(1000).default(0), state: participantState.optional() }).strict();
export type RosterQuery = z.infer<typeof rosterQuerySchema>;
export interface Participant { participantId: string; alias: string; discriminator: number; admission: "admitted" | "left" | "revoked"; presence: z.infer<typeof participantState>; admittedAt: string }
export interface Roster { openingId: string; generation: number; status: "open" | "closed" | "expired"; items: Participant[]; total: number; revision: number; presenceSequence: number }
export const kickSchema = rotateSchema;
export const transportContextSchema = openingContextSchema.extend({ gameId: canonicalUuid, systemRef: systemRefSchema, systemHash: z.string().regex(/^[a-f0-9]{64}$/), modules: moduleManifestSchema, audience: z.enum(["dm", "player"]) }).strict();
export const contextualEventSchema = tableEventSchema.extend({ protocolVersion: z.literal(2), ...transportContextSchema.shape, type: z.enum([...tableEventSchema.shape.type.options, "roster", "terminal"]), terminal: z.enum(["access-ended", "replaced", "unavailable"]).optional() }).strict();
export type ContextualEvent = z.infer<typeof contextualEventSchema>;
export const contextualStateSchema = tableStateSchema.extend({ protocolVersion: z.literal(2), ...transportContextSchema.shape }).strict();
export const contextualMutationSchema = openingContextSchema.extend({ command: z.unknown(), sceneResourceId: canonicalUuid.optional() }).strict();
