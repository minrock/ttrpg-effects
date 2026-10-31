import { systemRefSchema, GENERIC_SYSTEM } from "../systems/system-catalog";
import { z } from "zod";

const hasControl = (value: string) => [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);

export const ownerIdSchema = z.string().min(1).max(128).refine(value => value === value.trim() && !hasControl(value));
export const gameNameSchema = z.string().refine(value => !hasControl(value) && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)).transform(value => value.trim()).pipe(z.string().min(1).max(200));
export const gameIdSchema = z.uuid();
export const gameStateSchema = z.enum(["ready", "archived"]);
const timestamp = z.iso.datetime({ precision: 3 });
export const gameMetadataSchema = z.object({
  systemRef: systemRefSchema.default(GENERIC_SYSTEM), id: gameIdSchema, ownerId: ownerIdSchema, name: gameNameSchema, state: gameStateSchema,
  createdAt: timestamp, updatedAt: timestamp, revision: z.number().int().min(1).default(1)
}).strict().refine(value => value.updatedAt >= value.createdAt);
export type GameMetadata = z.infer<typeof gameMetadataSchema>;
export type GameState = GameMetadata["state"];
