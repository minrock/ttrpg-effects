import type { SceneFireEffect } from "../../domain/sessions/scene-document";
import type { WorldPoint } from "../../domain/shared/coordinates";
import { getAreaToolUiScale } from "./area-tool-screen-scale";

export function getFireResizeTarget(fire: SceneFireEffect, point: WorldPoint, zoom: number): "fire" | "light" | null {
  if (fire.zone.kind !== "circle" || !fire.visible) return null;
  const tolerance = 18 * getAreaToolUiScale(zoom);
  const dx = point.x - fire.position.x;
  const dy = point.y - fire.position.y;
  const radius = fire.zone.radius * fire.scale;
  const fireKnob = Math.hypot(dx - radius, dy);
  const lightKnob = fire.emitsLight ? Math.hypot(dx, dy + fire.lightRadius) : Infinity;
  if (Math.min(fireKnob, lightKnob) <= tolerance) return fireKnob <= lightKnob ? "fire" : "light";
  const distance = Math.hypot(dx, dy);
  const fireRing = Math.abs(distance - radius);
  const lightRing = fire.emitsLight ? Math.abs(distance - fire.lightRadius) : Infinity;
  if (Math.min(fireRing, lightRing) > tolerance) return null;
  return fireRing <= lightRing ? "fire" : "light";
}
