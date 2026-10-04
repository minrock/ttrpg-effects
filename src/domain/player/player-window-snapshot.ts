import { z } from "zod";
import { sceneDocumentV2Schema } from "../sessions/scene-schema";
import { normalizeCameraSnapshot, type PlayerWindowSnapshot } from "./player-window";

const snapshotSchema = z.object({
  scene: sceneDocumentV2Schema,
  mapImageUrl: z.string().nullable(),
  tokenImageUrls: z.record(z.string(), z.string()),
  camera: z.object({ center: z.object({ x: z.number().finite(), y: z.number().finite() }), zoom: z.number().finite().positive() }).transform(normalizeCameraSnapshot),
  cameraSyncKey: z.number().int().nonnegative().optional(),
  showDmFogOverlay: z.boolean(),
  showZoomIndicator: z.boolean().optional(),
  informationAreaHighlightResetKey: z.number().int().nonnegative().optional()
});

export function sanitizePlayerWindowSnapshot(value: unknown): PlayerWindowSnapshot | null {
  const result = snapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}
