import { describe, expect, it } from "vitest";
import {
  createSceneToken,
  getNextTokenBadgeNumber,
  getTokenFootprintCells,
  snapTokenToGrid
} from "./tokens";
import type { SceneGrid, SceneToken } from "../sessions/scene-document";

const grid: SceneGrid = {
  enabled: true,
  locked: true,
  cellSizeWorld: 100,
  opacity: 0.35,
  unit: "ft",
  distancePerCell: 5,
  metricDistancePerCell: 1.5
};

describe("tokens", () => {
  it("maps DnD token sizes to grid footprints", () => {
    expect(getTokenFootprintCells("tiny")).toBe(1);
    expect(getTokenFootprintCells("small")).toBe(1);
    expect(getTokenFootprintCells("medium")).toBe(1);
    expect(getTokenFootprintCells("large")).toBe(2);
    expect(getTokenFootprintCells("huge")).toBe(3);
    expect(getTokenFootprintCells("gargantuan")).toBe(4);
  });

  it("assigns the next badge for repeated token names", () => {
    const tokens: SceneToken[] = [
      token("goblin-1", "Goblin", 1),
      token("goblin-2", "Goblin", 2),
      token("orc-1", "Orc", 1)
    ];

    expect(getNextTokenBadgeNumber(tokens, "goblin")).toBe(3);
    expect(getNextTokenBadgeNumber(tokens, "Orc")).toBe(2);
    expect(getNextTokenBadgeNumber(tokens, "Dragon")).toBe(1);
  });

  it("does not continue badges for same type when names differ", () => {
    const tokens: SceneToken[] = [
      { ...token("wolf-1", "Wolf Alpha", 1), type: "Wolf" }
    ];

    expect(getNextTokenBadgeNumber(tokens, "Wolf Beta")).toBe(1);
  });

  it("creates tokens with stable footprint, badge and order", () => {
    const first = token("wolf-1", "Wolf", 1);
    const created = createSceneToken({
      id: "wolf-2",
      name: "Wolf",
      type: "Wolf",
      imagePath: "/tmp/wolf.png",
      position: { x: 10, y: 20 },
      size: "large",
      tokens: [first]
    });

    expect(created).toMatchObject({
      id: "wolf-2",
      footprintCells: 2,
      badgeNumber: 2,
      order: 2,
      visible: true,
      selectionColor: "#fff0a8"
    });
  });

  it("snaps token centers to the footprint block", () => {
    expect(snapTokenToGrid({ x: 110, y: 145 }, grid, 1)).toEqual({ x: 150, y: 150 });
    expect(snapTokenToGrid({ x: 110, y: 145 }, grid, 2)).toEqual({ x: 200, y: 200 });
  });
});

function token(id: string, type: string, badgeNumber: number): SceneToken {
  return {
    id,
    name: type,
    type,
    imagePath: `/tmp/${id}.png`,
    position: { x: 0, y: 0 },
    size: "medium",
    footprintCells: 1,
    selectionColor: "#fff0a8",
    badgeNumber,
    order: badgeNumber,
    visible: true
  };
}
