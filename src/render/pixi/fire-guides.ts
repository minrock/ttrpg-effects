import { Container, Graphics, Text } from "pixi.js";
import type { SceneFireEffect, SceneGrid, SceneSettings } from "../../domain/sessions/scene-document";
import type { WorldPoint } from "../../domain/shared/coordinates";
import { fireDirection, fireEnd, fireLength, fireMeasure, fireOutline, type FireHandle } from "../../domain/effects/fire-shapes";
import { getAreaToolUiScale } from "./area-tool-screen-scale";

export function traceFireFootprint(graphic: Graphics, effect: SceneFireEffect, padding = 0): Graphics {
  if (effect.zone.kind === "circle") return graphic.circle(effect.position.x, effect.position.y, fireLength(effect));
  const points = fireOutline(effect, padding);
  if (points.length) graphic.poly(points.flatMap(p => [p.x, p.y]), true);
  return graphic;
}

export function fireHandles(effect: SceneFireEffect, zoom: number): readonly { kind: FireHandle; point: WorldPoint }[] {
  if (effect.zone.kind === "cells") return [];
  if (effect.zone.kind === "line") return [{ kind: "start", point: effect.position }, { kind: "end", point: fireEnd(effect) }];
  const handles: { kind: FireHandle; point: WorldPoint }[] = [{ kind: "radius", point: fireEnd(effect) }];
  if (effect.zone.kind === "cone") {
    const ui = getAreaToolUiScale(zoom), radius = fireLength(effect), direction = fireDirection(effect);
    const distance = Math.abs(radius - 64 * ui) < 32 * ui ? radius + 40 * ui : 64 * ui;
    handles.push({ kind: "direction", point: { x: effect.position.x + Math.cos(direction) * distance, y: effect.position.y + Math.sin(direction) * distance } });
  }
  return handles;
}

export function hitTestFireHandle(effect: SceneFireEffect, point: WorldPoint, zoom: number): FireHandle | null {
  const nearest = fireHandles(effect, zoom).map(handle => ({ ...handle, distance: Math.hypot(point.x - handle.point.x, point.y - handle.point.y) })).sort((a, b) => a.distance - b.distance)[0];
  return nearest && nearest.distance <= 16 * getAreaToolUiScale(zoom) ? nearest.kind : null;
}

export function drawFireEditor(effect: SceneFireEffect, grid: SceneGrid, settings: SceneSettings, zoom: number, preview = false): Container {
  const container = new Container({ label: effect.id }), ui = getAreaToolUiScale(zoom);
  const graphic = new Graphics();
  const showHandles = preview || effect.zone.kind !== "circle";
  if (showHandles) {
    traceFireFootprint(graphic, effect);
    if (preview) graphic.fill({ color: 0xff8236, alpha: 0.23 });
    graphic.stroke({ color: 0xff9b4f, alpha: 0.85, width: 2 * ui });
  }
  for (const handle of showHandles ? fireHandles(effect, zoom) : []) {
    if (handle.kind === "direction") graphic.circle(effect.position.x, effect.position.y, Math.hypot(handle.point.x - effect.position.x, handle.point.y - effect.position.y))
      .stroke({ color: 0xffe29b, alpha: 0.45, width: ui });
    graphic.circle(handle.point.x, handle.point.y, 7 * ui).fill({ color: handle.kind === "direction" ? 0xffe29b : 0xff9b4f }).stroke({ color: 0x172224, width: 2 * ui });
  }
  const end = fireEnd(effect);
  const label = new Text({ text: fireMeasure(effect, grid, settings), style: { fontFamily: "system-ui", fontSize: 14, fill: 0xfff5e9, stroke: { color: 0x152023, width: 4 } }, resolution: 2 });
  label.scale.set(ui);
  label.position.set(effect.zone.kind === "circle" ? effect.position.x : (effect.position.x + end.x) / 2,
    (effect.zone.kind === "circle" ? effect.position.y - fireLength(effect) : (effect.position.y + end.y) / 2) - 28 * ui);
  container.addChild(graphic, label);
  return container;
}
