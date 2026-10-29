import { z } from "zod";
import { assetUrl } from "../../shared/contracts/service-references";

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

export const browserMapImageReplacementResultSchema = z.union([
  mapImageReplacementResultSchema,
  z.object({ status: z.literal("ready"), imagePath: z.string(), imageUrl: z.string() }).refine(value => assetUrl(value.imagePath) === value.imageUrl && assetUrl(value.imagePath) !== null)
]);
