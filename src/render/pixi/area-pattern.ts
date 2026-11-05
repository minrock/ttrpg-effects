import { Container, Graphics, Text } from "pixi.js";
import type { SceneShape } from "../../domain/sessions/scene-document";
import { getSelectedShapeEmojis } from "../../domain/shapes/shape-emojis";

/** El presupuesto se aplica antes de recorrer celdas, incluso con radios extremos. */
export function areaPatternCells(shape: SceneShape, size: number, budget: number) {
  const anchor = shape.points[0], radius = shape.radius ?? size;
  if (!anchor || !Number.isFinite(size) || size <= 0 || !Number.isFinite(radius) || radius <= 0 || budget <= 0) return [];
  const stride = Math.max(1, Math.ceil((radius * 2 / size + 2) / Math.sqrt(budget)));
  const step = size * stride;
  const left = Math.floor((anchor.x - radius) / step), top = Math.floor((anchor.y - radius) / step);
  const right = Math.floor((anchor.x + radius) / step), bottom = Math.floor((anchor.y + radius) / step);
  const cells: { x: number; y: number; size: number; dark: boolean }[] = [];
  for (let row = top; row <= bottom && cells.length < budget; row++) for (let col = left; col <= right && cells.length < budget; col++) {
    cells.push({ x: col * step, y: row * step, size: step, dark: ((row + col) % 2 + 2) % 2 === 0 });
  }
  return cells;
}
export function drawAreaPattern(shape: SceneShape, size: number, budget: number): Container {
  const container = new Container(), tiles = new Graphics(), mask = new Graphics();
  container.label = "area-checkerboard";
  const origin = shape.points[0], radius = shape.radius ?? size, emoji = getSelectedShapeEmojis(shape.emoji)[0];
  if (!origin || !emoji) return container;
  if (shape.type === "circle") mask.circle(origin.x, origin.y, radius).fill(0xffffff);
  else {
    const direction = (shape.direction ?? 0) * Math.PI / 180, half = (shape.angle ?? 60) * Math.PI / 360;
    mask.moveTo(origin.x, origin.y).arc(origin.x, origin.y, radius, direction - half, direction + half).closePath().fill(0xffffff);
  }
  container.addChild(tiles);
  const cells = areaPatternCells(shape, size, Math.max(0, budget));
  const compact = radius * 2 < size;
  for (const cell of cells) {
    tiles.rect(cell.x, cell.y, cell.size, cell.size).fill({ color: shape.color ?? (shape.type === "circle" ? "#7fb8ff" : "#79e1bf"), alpha: cell.dark ? .24 : .07 });
    if (!cell.dark || compact) continue;
    const text = new Text({ text: emoji, style: { fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif", fontSize: Math.min(46, size * .46), fill: 0xffffff } });
    text.anchor.set(.5); text.alpha = .85; text.position.set(cell.x + cell.size / 2, cell.y + cell.size / 2); container.addChild(text);
  }
  if (compact && budget > 0) {
    const direction = (shape.direction ?? 0) * Math.PI / 180, offset = shape.type === "cone" ? radius * .5 : 0;
    const text = new Text({ text: emoji, style: { fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif", fontSize: Math.min(46, radius * (shape.type === "cone" ? .45 : 1)), fill: 0xffffff } });
    text.anchor.set(.5); text.position.set(origin.x + Math.cos(direction) * offset, origin.y + Math.sin(direction) * offset); container.addChild(text);
  }
  container.addChild(mask); container.mask = mask;
  return container;
}
