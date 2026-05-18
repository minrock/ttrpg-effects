import type { SceneGrid, SceneShape, SceneSettings } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import { snapWorldPoint } from "../measurement/measurement";

export type TacticalShapeKind = "measurement" | "circle" | "cone" | "rectangle";

export interface CreateShapeOptions {
  readonly id: string;
  readonly kind: TacticalShapeKind;
  readonly position: WorldPoint;
  readonly grid: Pick<SceneGrid, "cellSizeWorld">;
  readonly settings: Pick<SceneSettings, "snapToGrid">;
}

export type ShapePatch = Partial<
  Pick<SceneShape, "points" | "radius" | "width" | "height" | "angle" | "direction" | "emoji">
>;

export function createTacticalShape({
  id,
  kind,
  position,
  grid,
  settings
}: CreateShapeOptions): SceneShape {
  assertId(id);
  const origin =
    settings.snapToGrid && kind !== "measurement"
      ? snapWorldPoint(position, grid.cellSizeWorld)
      : position;
  assertFinitePoint(origin);

  switch (kind) {
    case "measurement":
      return {
        id,
        type: "measurement",
        points: [origin, { x: origin.x + grid.cellSizeWorld * 3, y: origin.y }]
      };
    case "circle":
      return {
        id,
        type: "circle",
        points: [origin],
        radius: grid.cellSizeWorld
      };
    case "cone":
      return {
        id,
        type: "cone",
        points: [origin],
        radius: grid.cellSizeWorld * 3,
        angle: 60,
        direction: 0
      };
    case "rectangle": {
      const width = grid.cellSizeWorld * 3;
      const height = grid.cellSizeWorld * 2;
      let anchor: WorldPoint;
      if (settings.snapToGrid) {
        const topLeft = snapWorldPoint(position, grid.cellSizeWorld);
        anchor = { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
      } else {
        anchor = position;
      }
      return { id, type: "rectangle", points: [anchor], width, height };
    }
  }
}

export function moveShape(shape: SceneShape, position: WorldPoint, snapCellSize?: number): SceneShape {
  const shouldSnap = snapCellSize !== undefined && shape.type !== "measurement";
  let nextAnchor: WorldPoint;

  if (shouldSnap && shape.type === "rectangle" && shape.width !== undefined && shape.height !== undefined) {
    const halfW = shape.width / 2;
    const halfH = shape.height / 2;
    const snappedCorner = snapWorldPoint({ x: position.x - halfW, y: position.y - halfH }, snapCellSize!);
    nextAnchor = { x: snappedCorner.x + halfW, y: snappedCorner.y + halfH };
  } else {
    nextAnchor = shouldSnap ? snapWorldPoint(position, snapCellSize) : position;
  }
  const currentAnchor = getShapeAnchor(shape);
  const dx = nextAnchor.x - currentAnchor.x;
  const dy = nextAnchor.y - currentAnchor.y;

  return {
    ...shape,
    points: shape.points.map((point) => ({
      x: point.x + dx,
      y: point.y + dy
    }))
  };
}

export function setLinearShapeEnd(shape: SceneShape, endPoint: WorldPoint): SceneShape {
  if (shape.type !== "measurement") {
    return shape;
  }

  assertFinitePoint(endPoint);

  return updateShape(shape, {
    points: [getShapeAnchor(shape), endPoint]
  });
}

export function rotateLinearShape(shape: SceneShape, direction: number): SceneShape {
  if (shape.type !== "measurement") {
    return shape;
  }

  const anchor = getShapeAnchor(shape);
  const endPoint = getShapeEndPoint(shape);

  if (endPoint === null) {
    return shape;
  }

  const length = Math.hypot(endPoint.x - anchor.x, endPoint.y - anchor.y);
  const radians = (normalizeDirection(direction) * Math.PI) / 180;

  return setLinearShapeEnd(shape, {
    x: anchor.x + Math.cos(radians) * length,
    y: anchor.y + Math.sin(radians) * length
  });
}

export function updateShape(shape: SceneShape, patch: ShapePatch): SceneShape {
  const next: SceneShape = {
    ...shape,
    ...patch,
    points: patch.points ?? shape.points,
    radius: patch.radius === undefined ? shape.radius : sanitizePositive(patch.radius),
    width: patch.width === undefined ? shape.width : sanitizePositive(patch.width),
    height: patch.height === undefined ? shape.height : sanitizePositive(patch.height),
    angle: patch.angle === undefined ? shape.angle : sanitizeAngle(patch.angle),
    direction:
      patch.direction === undefined ? shape.direction : normalizeDirection(patch.direction),
    emoji: Object.prototype.hasOwnProperty.call(patch, "emoji")
      ? normalizeEmoji(patch.emoji)
      : shape.emoji
  };

  validateShape(next);
  return next;
}

function normalizeEmoji(emoji: string | undefined): string | undefined {
  if (emoji === undefined) {
    return undefined;
  }

  const normalized = emoji.trim();
  return normalized.length === 0 ? undefined : normalized.slice(0, 8);
}

export function getShapeAnchor(shape: SceneShape): WorldPoint {
  const firstPoint = shape.points[0];

  if (firstPoint === undefined) {
    throw new Error("Shape must contain at least one point.");
  }

  return firstPoint;
}

export function getShapeEndPoint(shape: SceneShape): WorldPoint | null {
  return shape.points[1] ?? null;
}

export function validateShape(shape: SceneShape): void {
  assertId(shape.id);

  if (!["measurement", "circle", "cone", "rectangle"].includes(shape.type)) {
    throw new Error("Unsupported tactical shape type.");
  }

  if (shape.points.length < 1) {
    throw new Error("Shape must contain at least one point.");
  }

  for (const point of shape.points) {
    assertFinitePoint(point);
  }

  if (shape.type === "measurement" && shape.points.length < 2) {
    throw new Error("Linear shapes must contain at least two points.");
  }

  if ((shape.type === "circle" || shape.type === "cone") && sanitizePositive(shape.radius) !== shape.radius) {
    throw new Error("Radial shapes must have a positive radius.");
  }

  if (shape.type === "rectangle") {
    if (sanitizePositive(shape.width) !== shape.width || sanitizePositive(shape.height) !== shape.height) {
      throw new Error("Rectangle shapes must have positive dimensions.");
    }
  }
}

export function setShapeRadius(shape: SceneShape, radius: number): SceneShape {
  if (shape.type !== "circle" && shape.type !== "cone") {
    return shape;
  }

  return updateShape(shape, { radius: Math.max(10, radius) });
}

export function setRectangleCorner(
  shape: SceneShape,
  cornerIndex: 0 | 1 | 2 | 3,
  cursor: WorldPoint
): SceneShape {
  if (shape.type !== "rectangle") {
    return shape;
  }

  const anchor = getShapeAnchor(shape);
  const halfW = (shape.width ?? 1) / 2;
  const halfH = (shape.height ?? 1) / 2;

  const corners: [WorldPoint, WorldPoint, WorldPoint, WorldPoint] = [
    { x: anchor.x - halfW, y: anchor.y - halfH },
    { x: anchor.x + halfW, y: anchor.y - halfH },
    { x: anchor.x + halfW, y: anchor.y + halfH },
    { x: anchor.x - halfW, y: anchor.y + halfH }
  ];

  const fixed = corners[(cornerIndex + 2) % 4];
  const newWidth = Math.max(10, Math.abs(cursor.x - fixed.x));
  const newHeight = Math.max(10, Math.abs(cursor.y - fixed.y));
  const newAnchorX = (cursor.x + fixed.x) / 2;
  const newAnchorY = (cursor.y + fixed.y) / 2;

  return updateShape(moveShape(shape, { x: newAnchorX, y: newAnchorY }), {
    width: newWidth,
    height: newHeight
  });
}

export function normalizeDirection(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((value % 360) + 360) % 360;
}

function sanitizePositive(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    return 1;
  }

  return value;
}

function sanitizeAngle(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) {
    return 1;
  }

  return Math.min(360, Math.max(1, value));
}

function assertId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Shape id cannot be empty.");
  }
}

function assertFinitePoint(point: WorldPoint): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Shape point must be a finite world coordinate.");
  }
}
