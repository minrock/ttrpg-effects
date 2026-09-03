import { describe, expect, it } from "vitest";
import {
  createTacticalShape,
  createPathShape,
  moveShape,
  movePathPoint,
  rotateLinearShape,
  setLinearShapeEnd,
  setRectangleCorner,
  setShapeRadius,
  updateShape
} from "./shapes";

const grid = { cellSizeWorld: 100 };

describe("hex shape interaction", () => {
  const hexGrid = { ...grid, layout: "hexagonal" as const };
  it("creates and moves shapes at upper-left vertices while measurements use centers", () => {
    const circle = createTacticalShape({ id: "c", kind: "circle", position: { x: 0, y: 0 }, grid: hexGrid, settings: { snapToGrid: true } });
    expect(circle.points[0].x).toBeCloseTo(-50);
    expect(circle.points[0].y).toBeCloseTo(-100 / (2 * Math.sqrt(3)));
    expect(moveShape(circle, circle.points[0], hexGrid).points).toEqual(circle.points);
    const line = createTacticalShape({ id: "m", kind: "measurement", position: { x: 8, y: 9 }, grid: hexGrid, settings: { snapToGrid: false } });
    expect(line.points).toEqual([{ x: 0, y: 0 }, { x: 300, y: 0 }]);
    const updated = setLinearShapeEnd(line, { x: 52, y: 90 }, hexGrid);
    expect(updated.points[1].x).toBeCloseTo(50);
    expect(updated.points[1].y).toBeCloseTo(50 * Math.sqrt(3));
    const moved = moveShape(updated, { x: 97, y: 3 }, hexGrid);
    expect(moved.points[0]).toEqual({ x: 100, y: 0 });
  });
  it("moves an entire path by a hex-lattice translation", () => {
    const path = createPathShape({ id: "p", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] });
    const moved = moveShape(path, { x: 52, y: 88 }, hexGrid);
    expect(moved.points[0].x).toBeCloseTo(50);
    expect(moved.points[1].x).toBeCloseTo(150);
    expect(moved.points[0].y).toBeCloseTo(50 * Math.sqrt(3));
    expect(moved.points[1].y).toBeCloseTo(moved.points[0].y);
  });
});

describe("tactical shapes", () => {
  it("creates measurement freely even when snap is enabled", () => {
    expect(
      createTacticalShape({
        id: "measurement-1",
        kind: "measurement",
        position: { x: 149, y: 49 },
        grid,
        settings: { snapToGrid: true }
      })
    ).toEqual({
      id: "measurement-1",
      type: "measurement",
      points: [
        { x: 149, y: 49 },
        { x: 449, y: 49 }
      ]
    });
  });

  it("snaps rectangle top-left corner to grid, not center", () => {
    // Click at (149, 49) with snap ON → top-left snaps to (100, 0)
    // Width=300, height=200 → center at (100+150, 0+100) = (250, 100)
    const shape = createTacticalShape({
      id: "rect-1",
      kind: "rectangle",
      position: { x: 149, y: 49 },
      grid,
      settings: { snapToGrid: true }
    });

    expect(shape).toMatchObject({ type: "rectangle", width: 300, height: 200 });
    expect(shape.points[0]).toEqual({ x: 250, y: 100 });
  });

  it("creates circle, cone, and rectangle defaults in world units", () => {
    expect(
      createTacticalShape({
        id: "circle-1",
        kind: "circle",
        position: { x: 0, y: 0 },
        grid,
        settings: { snapToGrid: false }
      })
    ).toMatchObject({ type: "circle", radius: 100 });

    expect(
      createTacticalShape({
        id: "cone-1",
        kind: "cone",
        position: { x: 0, y: 0 },
        grid,
        settings: { snapToGrid: false }
      })
    ).toMatchObject({ type: "cone", radius: 300, angle: 60, direction: 0 });

    expect(
      createTacticalShape({
        id: "rectangle-1",
        kind: "rectangle",
        position: { x: 0, y: 0 },
        grid,
        settings: { snapToGrid: false }
      })
    ).toMatchObject({ type: "rectangle", width: 300, height: 200 });
  });

  it("moves all points by the anchor delta", () => {
    const shape = createTacticalShape({
      id: "measurement-1",
      kind: "measurement",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    expect(moveShape(shape, { x: 50, y: -20 }).points).toEqual([
      { x: 50, y: -20 },
      { x: 350, y: -20 }
    ]);
  });

  it("changes linear shape end point", () => {
    const shape = createTacticalShape({
      id: "measurement-1",
      kind: "measurement",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    expect(setLinearShapeEnd(shape, { x: 40, y: 30 }).points).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 30 }
    ]);
  });

  it("rotates linear shapes while preserving length", () => {
    const shape = createTacticalShape({
      id: "measurement-1",
      kind: "measurement",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    const rotated = rotateLinearShape(shape, 90);

    expect(rotated.points[0]).toEqual({ x: 0, y: 0 });
    expect(rotated.points[1].x).toBeCloseTo(0);
    expect(rotated.points[1].y).toBeCloseTo(300);
  });

  it("updates dimensions while keeping values positive", () => {
    const shape = createTacticalShape({
      id: "rect-1",
      kind: "rectangle",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    expect(updateShape(shape, { width: -20, height: 50 })).toMatchObject({
      width: 1,
      height: 50
    });
  });

  it("updates and clears optional shape emoji", () => {
    const shape = createTacticalShape({
      id: "circle-1",
      kind: "circle",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    const withEmoji = updateShape(shape, { emoji: " ❄️💨 " });
    expect(withEmoji.emoji).toBe("❄️💨");

    expect(updateShape(withEmoji, { emoji: undefined }).emoji).toBeUndefined();
  });

  it("creates a path shape with ordered distinct points", () => {
    expect(
      createPathShape({
        id: "path-1",
        points: [
          { x: 50, y: 50 },
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 150, y: 150 }
        ]
      })
    ).toEqual({
      id: "path-1",
      type: "path",
      points: [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 }
      ]
    });
  });

  it("moves a path point while keeping point order", () => {
    const shape = createPathShape({
      id: "path-1",
      points: [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 }
      ]
    });

    expect(movePathPoint(shape, 1, { x: 230, y: 260 }, 100).points).toEqual([
      { x: 50, y: 50 },
      { x: 250, y: 250 },
      { x: 150, y: 150 }
    ]);
  });

  it("keeps a two-point path valid when a point is dragged onto the other point", () => {
    const shape = createPathShape({
      id: "path-1",
      points: [
        { x: 50, y: 50 },
        { x: 150, y: 50 }
      ]
    });

    expect(movePathPoint(shape, 1, { x: 50, y: 50 }).points).toEqual(shape.points);
  });

  it("rejects paths with fewer than two distinct points", () => {
    expect(() =>
      createPathShape({
        id: "path-1",
        points: [
          { x: 50, y: 50 },
          { x: 50, y: 50 }
        ]
      })
    ).toThrow("Path shapes must contain at least two distinct points.");
  });

  it("setShapeRadius clamps to minimum 10 for circle", () => {
    const shape = createTacticalShape({
      id: "circle-1",
      kind: "circle",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    expect(setShapeRadius(shape, 200).radius).toBe(200);
    expect(setShapeRadius(shape, 5).radius).toBe(10);
  });

  it("setShapeRadius clamps to minimum 10 for cone", () => {
    const shape = createTacticalShape({
      id: "cone-1",
      kind: "cone",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    expect(setShapeRadius(shape, 150).radius).toBe(150);
    expect(setShapeRadius(shape, 3).radius).toBe(10);
  });

  it("setRectangleCorner resizes keeping opposite corner fixed", () => {
    // Rectangle centered at (0,0), 300x200 → corners at (±150, ±100)
    const shape = createTacticalShape({
      id: "rect-1",
      kind: "rectangle",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    // Drag top-left corner (index 0) to (-200, -150)
    // Fixed corner (index 2 = bottom-right) stays at (150, 100)
    const resized = setRectangleCorner(shape, 0, { x: -200, y: -150 });

    expect(resized.width).toBe(350);
    expect(resized.height).toBe(250);
    // New center = midpoint of (-200,-150) and (150,100)
    expect(resized.points[0].x).toBeCloseTo(-25);
    expect(resized.points[0].y).toBeCloseTo(-25);
  });

  it("setRectangleCorner enforces minimum 10 width and height", () => {
    const shape = createTacticalShape({
      id: "rect-1",
      kind: "rectangle",
      position: { x: 0, y: 0 },
      grid,
      settings: { snapToGrid: false }
    });

    // Drag bottom-right (index 2) to nearly the same x as left side → min width
    const resized = setRectangleCorner(shape, 2, { x: -148, y: 100 });

    expect(resized.width).toBe(10);
  });
});
