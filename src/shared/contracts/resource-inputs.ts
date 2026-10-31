import { z } from "zod";
export const idSchema = z.uuid();
export const templateIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const name = z.string().trim().min(1).max(200);
const short = z.string().max(200);
const notes = z.string().max(1_000_000);
const imagePath = z.string().max(2048).nullable().optional();
export const loginSchema = z.strictObject({ key: z.string().max(1024) });
export const sceneInputSchema = z.strictObject({ name, scene: z.unknown() });
export const resolveSchema = z.strictObject({ references: z.array(z.string().max(2048)).max(200) });
export const templateSchema = z.strictObject({ template: z.strictObject({
  id: templateIdSchema, name, system: name, markdown: notes, css: z.string().max(200_000),
  builtIn: z.literal(false), updatedAt: z.string().datetime()
}) });
export const npcSchema = z.strictObject({ entry: z.strictObject({ name, imagePath, notes: notes.optional() }) });
export const monsterSchema = z.strictObject({ entry: z.strictObject({
  name, system: name, imagePath, contentMarkdown: notes, templateId: templateIdSchema.nullable().optional()
}) });
export const characterSchema = z.strictObject({ entry: z.strictObject({
  characterName: name, playerName: short.optional(), level: short.optional(), species: short.optional(), classes: short.optional(),
  imagePath, stats: z.strictObject({ strength: short.optional(), constitution: short.optional(), dexterity: short.optional(),
    intelligence: short.optional(), wisdom: short.optional(), charisma: short.optional() }).optional(),
  initiative: short.optional(), armorClass: z.string().regex(/^(?:\d+(?:\s*\/\s*\d+)?)?$/).max(200).optional(),
  passivePerception: short.optional(), hitPoints: short.optional(), spellSaveDc: short.optional(), speeds: short.optional(), notes: notes.optional()
}) });
