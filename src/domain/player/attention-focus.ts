import { z } from "zod";
import { clampZoom } from "../map/camera";
import type { PlayerWindowSnapshot, ViewportCameraSnapshot } from "./player-window";
const coordinate = z.number().finite().min(-1e8).max(1e8);
export const focusPointSchema = z.object({ x: coordinate, y: coordinate }).strict();
export const attentionFocusRequestSchema = z.object({
  requestId: z.uuid(), sceneId: z.string().max(160), frame: z.string().max(2000), position: focusPointSchema
}).strict();
export const attentionFocusEventSchema = z.object({
  id: z.uuid(), frame: z.string().max(2000), position: focusPointSchema,
  issuedAt: z.number().finite(), expiresAt: z.number().finite()
}).strict().refine(value => value.expiresAt > value.issuedAt && value.expiresAt - value.issuedAt <= 5000);
export type AttentionFocusRequest = z.infer<typeof attentionFocusRequestSchema>;
export type AttentionFocusEvent = z.infer<typeof attentionFocusEventSchema>;
export type AttentionFocusResult = { ok: true; delivered: number; incompatible: number; notReady: number } | { ok: false; error: string };
/** Geometría pública; ni cámara, ni detalles privados, ni rutas de assets. */
export function attentionFrame(snapshot: Pick<PlayerWindowSnapshot, "scene" | "cameraSyncKey" | "mapNavigationKey">): string {
  const s = snapshot.scene;
  return JSON.stringify([snapshot.mapNavigationKey ?? null, snapshot.cameraSyncKey ?? 0, s.activeMapId, s.map.position, s.map.scale,
    s.grid.cellSizeWorld, s.grid.layout, s.grid.unit, s.grid.distancePerCell, s.grid.metricDistancePerCell,
    s.settings.diagonalMode, s.settings.snapToGrid, s.compassOrientation]);
}
export function focusCamera(camera: ViewportCameraSnapshot, position: AttentionFocusEvent["position"]): ViewportCameraSnapshot {
  return { center: { ...position }, zoom: camera.zoom };
}
/** Ajuste inicial al área útil propia; los cambios de mapa conservan el zoom numérico. */
export function localEntryCamera(snapshot: PlayerWindowSnapshot, viewport: { width: number; height: number }, previous?: ViewportCameraSnapshot): ViewportCameraSnapshot {
  const map = snapshot.scene.map, size = map.imageSize;
  const width = (size?.width ?? 0) * map.scale, height = (size?.height ?? 0) * map.scale;
  const center = previous && snapshot.playerEntryPoint ? snapshot.playerEntryPoint : map.imagePath !== null && snapshot.mapImageUrl !== null
    ? { ...map.position } : { x: 0, y: 0 };
  const rotated = snapshot.scene.compassOrientation === 90 || snapshot.scene.compassOrientation === 270;
  const zoom = previous?.zoom ?? (width > 0 && height > 0 ? clampZoom(Math.min(viewport.width / (rotated ? height : width), viewport.height / (rotated ? width : height)) * .9) : 1);
  return { center, zoom };
}
