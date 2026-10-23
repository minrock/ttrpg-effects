import { z } from "zod";

const reportSchema = z.object({
  imageUrl: z.string().min(1).max(16384),
  ok: z.boolean(),
  error: z.string().max(500).optional()
});

export type PlayerMapImageStatus = z.infer<typeof reportSchema>;

export function sanitizePlayerMapImageStatus(value: unknown): PlayerMapImageStatus | null {
  const result = reportSchema.safeParse(value);
  return result.success ? result.data : null;
}
