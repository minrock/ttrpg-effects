import { Container, Graphics, Text } from "pixi.js";
import type { SceneGrid, SceneLightningEffect, SceneSettings } from "../../domain/sessions/scene-document";
import type { WorldPoint } from "../../domain/shared/coordinates";
import { LIGHTNING_CONE_APERTURE_DEGREES, lightningDirection, lightningLength, lightningMeasure, type LightningHandle } from "../../domain/effects/lightning";
import { getAreaToolUiScale } from "./area-tool-screen-scale";

export function drawLightningGuide(effect: SceneLightningEffect, edited = false): Graphics {
  const graphic = new Graphics();
  const { x, y } = effect.position;
  if (effect.zone.kind === "line") return graphic;
  if (effect.zone.kind === "circle") graphic.circle(x, y, effect.zone.radius);
  else {
    const direction = lightningDirection(effect), half = LIGHTNING_CONE_APERTURE_DEGREES * Math.PI / 360;
    graphic.moveTo(x, y).arc(x, y, effect.zone.radius, direction - half, direction + half).closePath();
  }
  return graphic.fill({ color: 0x75dfe4, alpha: edited ? 0.24 : 0.18 }).stroke({ color: 0xa6f1ef, alpha: edited ? 0.85 : 0.55, width: 2 });
}

export function lightningHandles(effect: SceneLightningEffect, zoom: number): readonly { kind: LightningHandle; point: WorldPoint }[] {
  if (effect.zone.kind === "line") return [{ kind: "start", point: effect.position }, { kind: "end", point: effect.zone.end }];
  const direction = lightningDirection(effect), radius = effect.zone.radius;
  const handles: { kind: LightningHandle; point: WorldPoint }[] = [{ kind: "radius", point: {
    x: effect.position.x + Math.cos(direction) * radius, y: effect.position.y + Math.sin(direction) * radius
  } }];
  if (effect.zone.kind === "cone") {
    const ui = getAreaToolUiScale(zoom);
    const rotationRadius = Math.abs(radius - 64 * ui) < 32 * ui ? radius + 40 * ui : 64 * ui;
    handles.push({ kind: "direction", point: { x: effect.position.x + Math.cos(direction) * rotationRadius, y: effect.position.y + Math.sin(direction) * rotationRadius } });
  }
  return handles;
}

export function hitTestLightningHandle(effect: SceneLightningEffect, point: WorldPoint, zoom: number): LightningHandle | null {
  const nearest = lightningHandles(effect, zoom).map(handle => ({ ...handle, distance: Math.hypot(point.x - handle.point.x, point.y - handle.point.y) })).sort((a, b) => a.distance - b.distance)[0];
  return nearest && nearest.distance <= 16 * getAreaToolUiScale(zoom) ? nearest.kind : null;
}

export function drawLightningEditor(effect: SceneLightningEffect, grid: SceneGrid, settings: SceneSettings, zoom: number, selected: boolean): Container {
  const container = new Container({ label: effect.id });
  const ui = getAreaToolUiScale(zoom);
  const graphic = new Graphics();
  const direction = lightningDirection(effect), length = lightningLength(effect);
  const end = { x: effect.position.x + Math.cos(direction) * length, y: effect.position.y + Math.sin(direction) * length };
  if (effect.zone.kind === "line") graphic.moveTo(effect.position.x, effect.position.y).lineTo(end.x, end.y).stroke({ color: 0xa6f1ef, alpha: 0.45, width: 1.5 * ui });
  if (selected) {
    if (effect.zone.kind !== "line" && (!effect.showGuide || !effect.visible || effect.opacity === 0)) container.addChild(drawLightningGuide(effect, true));
    for (const handle of lightningHandles(effect, zoom)) {
      if (handle.kind === "direction") graphic.circle(effect.position.x, effect.position.y, Math.hypot(handle.point.x - effect.position.x, handle.point.y - effect.position.y))
        .stroke({ color: 0xe9c875, alpha: 0.5, width: 1.5 * ui });
      graphic.circle(handle.point.x, handle.point.y, 7 * ui).fill({ color: handle.kind === "direction" ? 0xe9c875 : 0xa6f1ef }).stroke({ color: 0x172224, width: 2 * ui });
    }
  }
  const label = new Text({ text: lightningMeasure(effect, grid, settings), style: { fontFamily: "system-ui", fontSize: 14, fill: 0xf0ffff, stroke: { color: 0x152023, width: 4 } }, resolution: 2 });
  label.scale.set(ui);
  if (effect.zone.kind === "circle") label.position.set(effect.position.x + 12 * ui, effect.position.y - length - 24 * ui);
  else if (effect.zone.kind === "line") label.position.set((effect.position.x + end.x) / 2 + 10 * ui, (effect.position.y + end.y) / 2 - 28 * ui);
  else label.position.set(end.x + 12 * ui, end.y - 24 * ui);
  container.addChild(graphic, label);
  return container;
}
