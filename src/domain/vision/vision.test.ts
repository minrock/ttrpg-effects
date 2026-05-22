import { describe, expect, it } from "vitest";
import { createLightSource, updateLightSource } from "../lighting/lights";
import {
  addRevealedArea,
  clearRevealedAreas,
  createCircleRevealArea,
  createDefaultFogOfWar,
  createStrokeRevealArea,
  createWallObstacle,
  getVisibleAreasFromLights,
  simplifyStrokePoints,
  updateFogOfWar
} from "./vision";

describe("vision and fog of war", () => {
  it("creates a disabled fog layer by default", () => {
    expect(createDefaultFogOfWar()).toMatchObject({
      enabled: false,
      opacity: 0.92,
      color: "#000000",
      revealRadius: 50,
      revealedAreas: [],
      obstacles: []
    });
  });

  it("creates circular manual reveal areas", () => {
    expect(
      createCircleRevealArea({
        id: "reveal-1",
        center: { x: 12, y: 24 },
        radius: 160
      })
    ).toEqual({
      id: "reveal-1",
      kind: "circle",
      center: { x: 12, y: 24 },
      radius: 160
    });
  });

  it("adds and clears revealed areas immutably", () => {
    const fog = createDefaultFogOfWar();
    const area = createCircleRevealArea({
      id: "reveal-1",
      center: { x: 0, y: 0 },
      radius: 100
    });
    const withArea = addRevealedArea(fog, area);

    expect(withArea.revealedAreas).toEqual([area]);
    expect(fog.revealedAreas).toEqual([]);
    expect(clearRevealedAreas(withArea).revealedAreas).toEqual([]);
  });

  it("creates stroke reveal areas from simplified brush points", () => {
    expect(
      createStrokeRevealArea({
        id: "reveal-stroke-1",
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 2 },
          { x: 100, y: 0 }
        ],
        radius: 50
      })
    ).toEqual({
      id: "reveal-stroke-1",
      kind: "stroke",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      radius: 50
    });
  });

  it("simplifies stroke points with radius-aware spacing", () => {
    expect(
      simplifyStrokePoints(
        [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 20, y: 0 },
          { x: 35, y: 0 }
        ],
        40
      )
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 35, y: 0 }
    ]);
  });

  it("clamps editable fog values", () => {
    expect(updateFogOfWar(createDefaultFogOfWar(), { opacity: 2, revealRadius: -1 })).toMatchObject({
      opacity: 1,
      revealRadius: 1
    });
  });

  it("creates wall obstacles for future line-of-sight blocking", () => {
    expect(createWallObstacle("wall-1", { x: 0, y: 0 }, { x: 100, y: 20 })).toEqual({
      id: "wall-1",
      kind: "wall",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 20 }
      ]
    });
  });

  it("derives visible areas from active lights", () => {
    const visibleLight = createLightSource("light-1", "point", { x: 10, y: 20 });
    const hiddenLight = updateLightSource(createLightSource("light-2", "point", { x: 0, y: 0 }), {
      visible: false
    });
    const coneLight = updateLightSource(createLightSource("light-3", "cone", { x: 30, y: 40 }), {
      direction: 90
    });

    expect(getVisibleAreasFromLights([visibleLight, hiddenLight, coneLight])).toEqual([
      {
        id: "vision-light-1",
        kind: "circle",
        center: { x: 10, y: 20 },
        radius: visibleLight.radius
      },
      {
        id: "vision-light-3",
        kind: "cone",
        center: { x: 30, y: 40 },
        radius: coneLight.radius,
        angle: 60,
        direction: 90
      }
    ]);
  });
});
