import { clampPositive, clampUnit, normalizeHexColor } from "../lighting/lights";
import type { SceneFireEffect } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { getGridCellHeight, getGridCellKey, type GridCell } from "../grid/grid-cell";

export type EffectKind = "fire";
export type FireCircleMode = "closed" | "open";

export type FireZone =
  | {
      readonly kind: "circle";
      readonly mode: FireCircleMode;
      readonly radius: number;
      readonly innerRadiusRatio: number;
    }
  | {
      readonly kind: "cells";
      readonly radius: number;
      readonly cells: readonly FireCell[];
    };

export type FireCell = GridCell;

export type AnimatedFireEffect = SceneFireEffect;

export interface FirePatch {
  readonly position?: WorldPoint;
  readonly zone?: FireZone;
  readonly scale?: number;
  readonly opacity?: number;
  readonly color?: string;
  readonly visible?: boolean;
  readonly emitsLight?: boolean;
  readonly lightRadius?: number;
}

export function createAnimatedFireEffect(id: string, position: WorldPoint): AnimatedFireEffect {
  assertId(id);
  assertFinitePoint(position);

  return {
    id,
    kind: "fire",
    position,
    zone: createCircleFireZone(),
    scale: 1,
    opacity: 0.68,
    color: "#ff3030",
    visible: true,
    emitsLight: true,
    lightRadius: 150
  };
}

export function updateAnimatedFireEffect(
  effect: AnimatedFireEffect,
  patch: FirePatch
): AnimatedFireEffect {
  const nextPosition = patch.position ?? effect.position;
  const zone =
    patch.zone === undefined
      ? translateCellZone(effect.zone, effect.position, nextPosition)
      : sanitizeFireZone(patch.zone);
  const next = {
    ...effect,
    ...patch,
    position: nextPosition,
    zone,
    scale: patch.scale === undefined ? effect.scale : clampPositive(patch.scale, 0.1),
    opacity: patch.opacity === undefined ? effect.opacity : clampUnit(patch.opacity),
    color: patch.color === undefined ? effect.color : normalizeHexColor(patch.color),
    lightRadius:
      patch.lightRadius === undefined ? effect.lightRadius : clampPositive(patch.lightRadius, 1)
  };

  assertFinitePoint(next.position);

  return next;
}

export function moveAnimatedFireEffect(
  effect: AnimatedFireEffect,
  position: WorldPoint
): AnimatedFireEffect {
  return updateAnimatedFireEffect(effect, { position });
}

export function toggleFireVisibility(effect: AnimatedFireEffect): AnimatedFireEffect {
  return updateAnimatedFireEffect(effect, { visible: !effect.visible });
}

export function createCircleFireZone(
  radius = 90,
  mode: FireCircleMode = "closed"
): FireZone {
  return {
    kind: "circle",
    mode,
    radius: clampPositive(radius, 1),
    innerRadiusRatio: mode === "open" ? 0.58 : 0
  };
}

export function createCellFireZone(cells: readonly FireCell[], radius = 25): FireZone {
  const uniqueCells = new Map<string, FireCell>();

  for (const cell of cells) {
    assertFinitePoint(cell);
    const size = clampPositive(cell.size, 1);
    const normalized = {
      ...(cell.layout === undefined ? {} : { layout: cell.layout }),
      x: cell.x,
      y: cell.y,
      size
    };
    uniqueCells.set(getGridCellKey(normalized), normalized);
  }

  if (uniqueCells.size === 0) {
    throw new Error("Cell fire zone needs at least one cell.");
  }

  return {
    kind: "cells",
    radius: clampPositive(radius, 1),
    cells: [...uniqueCells.values()]
  };
}

export function toggleCircleFireMode(effect: AnimatedFireEffect): AnimatedFireEffect {
  if (effect.zone.kind !== "circle") {
    return effect;
  }

  const nextMode: FireCircleMode = effect.zone.mode === "closed" ? "open" : "closed";

  return updateAnimatedFireEffect(effect, {
    zone: createCircleFireZone(effect.zone.radius, nextMode)
  });
}

export function getFireZoneBounds(
  effect: Pick<AnimatedFireEffect, "position" | "zone" | "scale">
): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
  if (effect.zone.kind === "circle") {
    const radius = effect.zone.radius * effect.scale;

    return {
      left: effect.position.x - radius,
      right: effect.position.x + radius,
      top: effect.position.y - radius,
      bottom: effect.position.y + radius
    };
  }

  const xs = effect.zone.cells.flatMap((cell) => [cell.x, cell.x + cell.size]);
  const ys = effect.zone.cells.flatMap((cell) => [cell.y, cell.y + getGridCellHeight(cell)]);

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys)
  };
}

export function sanitizeFireZone(zone: FireZone): FireZone {
  if (zone.kind === "circle") {
    const radius = clampPositive(zone.radius, 1);
    const innerRadiusRatio = clampUnit(zone.innerRadiusRatio);

    return {
      kind: "circle",
      mode: zone.mode,
      radius,
      innerRadiusRatio: zone.mode === "open" ? Math.max(0.05, innerRadiusRatio) : 0
    };
  }

  return createCellFireZone(zone.cells, zone.radius);
}

function translateCellZone(zone: FireZone, from: WorldPoint, to: WorldPoint): FireZone {
  if (zone.kind !== "cells" || (from.x === to.x && from.y === to.y)) {
    return zone;
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return {
    kind: "cells",
    radius: zone.radius,
    cells: zone.cells.map((cell) => ({
      ...cell,
      x: cell.x + dx,
      y: cell.y + dy,
      size: cell.size
    }))
  };
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Fire effect id cannot be empty.");
  }
}

function assertFinitePoint(position: WorldPoint): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Fire effect position must be a finite world coordinate.");
  }
}
