import type { FireCell } from "../../domain/effects/fire";
import type { SceneFireEffect } from "../../domain/sessions/scene-document";
import { getGridCellCenter } from "../../domain/grid/grid-cell";

export const MAX_FIRE_FLAMES_PER_EFFECT = 256;
export const MAX_FIRE_FLAMES_PER_VIEWPORT = 2048;

export interface FireFlamePlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly rotation: number;
  readonly mirror: boolean;
  readonly phase: number;
  readonly alpha: number;
}

// Power-of-two tiers avoid invalidating every existing fire for every new effect.
export function getFireFlameBudget(effectCount: number): number {
  const tier = 2 ** Math.ceil(Math.log2(Math.max(1, effectCount)));
  return Math.max(1, Math.min(MAX_FIRE_FLAMES_PER_EFFECT, Math.floor(MAX_FIRE_FLAMES_PER_VIEWPORT / tier)));
}

export function createFireFlameLayout(
  effect: SceneFireEffect,
  cellSizeWorld: number,
  budget = MAX_FIRE_FLAMES_PER_EFFECT
): FireFlamePlacement[] {
  const limit = Math.max(1, Math.min(MAX_FIRE_FLAMES_PER_EFFECT, Math.floor(budget)));
  const random = seededRandom(effect.id);
  const result: FireFlamePlacement[] = [];
  const spacing = Math.max(4, cellSizeWorld * 0.56);
  const add = (x: number, y: number, width: number): void => {
    result.push({
      x, y,
      width: width * (0.82 + random() * 0.36),
      rotation: (random() - 0.5) * 0.32,
      mirror: random() > 0.5,
      phase: Math.floor(random() * 32),
      alpha: 0.92 + random() * 0.08
    });
  };

  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;
    const inner = effect.zone.mode === "open" ? radius * effect.zone.innerRadiusRatio : 0;
    const area = Math.PI * (radius * radius - inner * inner);
    const count = Math.max(1, Math.min(limit, Math.ceil(area / (spacing * spacing))));
    const width = Math.sqrt(area / count) * 1.7;
    const angleOffset = random() * Math.PI * 2;
    for (let index = 0; index < count; index++) {
      // Stratified radial coverage with a golden-angle spiral avoids aligned rows.
      const r = Math.sqrt(inner * inner + (radius * radius - inner * inner) * (index + 0.2 + random() * 0.6) / count);
      const angle = angleOffset + index * 2.399963229728653 + (random() - 0.5) * 0.5;
      add(effect.position.x + Math.cos(angle) * r, effect.position.y + Math.sin(angle) * r, width);
    }
  } else if (effect.zone.cells.length > 0) {
    // Group occupied cells spatially when needed; never scan the empty bounding box.
    const groups = groupFireCells(effect.zone.cells, Math.max(1, Math.floor(limit / 4)));
    for (const cells of groups) {
      let area = 0;
      for (const cell of cells) area += cell.size * cell.size;
      const count = Math.min(Math.max(1, Math.ceil(area / (spacing * spacing))), Math.floor(limit / groups.length));
      const width = Math.sqrt(area / count) * 1.7;
      for (let index = 0; index < count; index++) {
        const cell = cells[Math.min(cells.length - 1, Math.floor((index + random()) * cells.length / count))]!;
        // Keep anchors in painted cells, but allow the complete flame to overhang.
        if (cell.layout === "hexagonal") {
          const center = getGridCellCenter(cell);
          const angle = random() * Math.PI * 2;
          const radius = Math.sqrt(random()) * cell.size * 0.45;
          add(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, width);
        } else {
          add(cell.x + cell.size * (0.15 + random() * 0.7), cell.y + cell.size * (0.15 + random() * 0.7), width);
        }
      }
    }
  }

  // Draw upper flames first so overlap reads naturally instead of by cell order.
  return result.sort((a, b) => a.y - b.y || a.x - b.x);
}

function groupFireCells(cells: readonly FireCell[], limit: number): readonly (readonly FireCell[])[] {
  let left = Infinity;
  let top = Infinity;
  let minSize = Infinity;
  let area = 0;
  for (const cell of cells) {
    left = Math.min(left, cell.x);
    top = Math.min(top, cell.y);
    minSize = Math.min(minSize, cell.size);
    area += cell.size * cell.size;
  }
  if (cells.length <= limit) return cells.map((cell) => [cell]);
  let step = Math.max(minSize, Math.sqrt(area / limit));
  for (let attempt = 0; attempt < 32; attempt++) {
    const groups = new Map<string, FireCell[]>();
    for (const cell of cells) {
      const key = `${Math.floor((cell.x - left) / step)}:${Math.floor((cell.y - top) / step)}`;
      const group = groups.get(key);
      if (group) group.push(cell);
      else groups.set(key, [cell]);
    }
    if (groups.size <= limit) return [...groups.values()];
    step *= 2;
  }
  // Extremely dispersed coordinates must not turn a redraw into an unbounded search.
  const groups: FireCell[][] = Array.from({ length: limit }, () => []);
  cells.forEach((cell, index) => groups[Math.floor(index * limit / cells.length)]!.push(cell));
  return groups;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state |= 0;
    state = state + 0x6d2b79f5 | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
