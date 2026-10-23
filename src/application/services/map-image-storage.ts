import { z } from "zod";

export const mapImageReplacementResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    imagePath: z.string().refine((value) => value.trim().length > 0 && !value.includes("\0")),
    imageUrl: z.url().startsWith("map-asset:")
  }),
  z.object({ status: z.literal("cancelled") }),
  z.object({ status: z.literal("error"), error: z.string().min(1) })
]);

export type MapImageReplacementResult = z.infer<typeof mapImageReplacementResultSchema>;

export interface MapImageStorage {
  selectReplacementMapImage(): Promise<MapImageReplacementResult>;
}
