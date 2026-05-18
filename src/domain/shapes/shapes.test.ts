import { describe, expect, it } from "vitest";
import { createTacticalShape, moveShape, rotateLinearShape, setLinearShapeEnd, updateShape } from "./shapes";

const grid = { cellSizeWorld: 100 };

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
      id: "line-1",
      kind: "line",
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
});
