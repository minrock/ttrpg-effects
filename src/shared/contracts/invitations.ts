import { z } from "zod";
import { systemRefSchema } from "../../domain/systems/system-catalog";
export const canonicalUuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const positive = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const secretSchema = z.string().regex(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/);
export const openingContextSchema = z.object({ openingId: canonicalUuid, generation: positive }).strict();
export const expectedOpeningSchema = z.object({ id: canonicalUuid, generation: positive, revision: positive }).strict();
export const startSchema = z.object({ expectedOpening: expectedOpeningSchema.nullable() }).strict();
export const rotateSchema = openingContextSchema.extend({ expectedInvitationVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) });
export const admissionSchema = z.object({ secret: secretSchema, alias: z.string().max(320) }).strict();
export const guestSchema = z.object({ participantId: canonicalUuid, gameId: canonicalUuid, openingId: canonicalUuid, generation: positive, alias: z.string(), discriminator: positive, systemRef: systemRefSchema, expiresAt: z.iso.datetime(), status: z.enum(["fresh", "reconnecting"]) }).strict();
export type GuestDto = z.infer<typeof guestSchema>;
export type ExpectedOpening = z.infer<typeof expectedOpeningSchema>;
export type OpeningContext = z.infer<typeof openingContextSchema>;
export interface InvitationMetadata { version: number; createdAt: string; expiresAt: string }
