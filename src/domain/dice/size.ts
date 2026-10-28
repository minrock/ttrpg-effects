import { z } from "zod";
import type { DiceReplay } from "./dice";

export const diceSizeChangeSchema = z.object({ view: z.enum(["dm", "player"]), scale: z.number().finite().min(1).max(2.5).multipleOf(.25) });
export type DiceSizeChange = z.infer<typeof diceSizeChangeSchema>;
export interface DiceSizes { readonly revision: number; readonly dm: number; readonly player: number }
export const defaultDiceSizes = (): DiceSizes => ({ revision: 0, dm: 1, player: 1 });
export interface DiceBounds { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number }
export interface DiceViewFit { readonly scale: number; readonly x: number; readonly y: number; readonly halfWidth: number; readonly halfHeight: number }
// Matches the fixed camera at (0, -2, 32), looking at the origin.
export const DICE_VIEW_UP_Y = 32 / Math.hypot(32, 2);
export const DICE_VIEW_UP_Z = 2 / Math.hypot(32, 2);

export function diceReplayBounds(replay: DiceReplay, radii: readonly number[], settled: boolean): DiceBounds | null {
  if (!radii.length || replay.frames.length !== radii.length * replay.frameCount * 7) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let frame = settled ? replay.frameCount - 1 : 0; frame < replay.frameCount; frame++) {
    for (let die = 0; die < radii.length; die++) {
      const offset = (frame * radii.length + die) * 7, radius = radii[die];
      const x = replay.frames[offset], y = replay.frames[offset + 1] * DICE_VIEW_UP_Y + replay.frames[offset + 2] * DICE_VIEW_UP_Z;
      minX = Math.min(minX, x - radius); maxX = Math.max(maxX, x + radius);
      minY = Math.min(minY, y - radius); maxY = Math.max(maxY, y + radius);
    }
  }
  return { minX, maxX, minY, maxY };
}

export function fitDiceView(width: number, height: number, requested: number, bounds: DiceBounds | null): DiceViewFit {
  const aspect = Math.max(1, width) / Math.max(1, height), halfHeight = Math.max(5.8, 9.8 / aspect), halfWidth = halfHeight * aspect;
  if (!bounds) return { scale: requested, x: 0, y: 0, halfWidth, halfHeight };
  const usableX = Math.max(1, width - 48) / Math.max(1, width), usableY = Math.max(1, height - 48) / Math.max(1, height);
  const scale = Math.min(requested, 2 * halfWidth * usableX / Math.max(.001, bounds.maxX - bounds.minX), 2 * halfHeight * usableY / Math.max(.001, bounds.maxY - bounds.minY));
  const halfX = halfWidth * usableX / scale, halfY = halfHeight * usableY / scale;
  // Translate the entire camera, not individual dice: no new visual overlaps or altered poses.
  const x = Math.max(bounds.maxX - halfX, Math.min(0, bounds.minX + halfX));
  const y = Math.max(bounds.maxY - halfY, Math.min(0, bounds.minY + halfY));
  return { scale, x, y, halfWidth, halfHeight };
}
