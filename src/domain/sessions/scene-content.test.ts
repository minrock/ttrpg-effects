import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./default-scene";
import { hasSceneContent } from "./scene-content";

describe("scene content detection", () => {
  it("treats the default scene as empty", () => {
    expect(hasSceneContent(createDefaultScene())).toBe(false);
  });

  it("detects loaded map content", () => {
    const scene = {
      ...createDefaultScene(),
      map: {
        imagePath: "/maps/dungeon.png",
        position: { x: 0, y: 0 },
        scale: 1
      }
    };

    expect(hasSceneContent(scene)).toBe(true);
  });

  it("detects scene elements", () => {
    expect(
      hasSceneContent({
        ...createDefaultScene(),
        lights: [
          {
            id: "light-1",
            kind: "point",
            position: { x: 0, y: 0 },
            radius: 100,
            color: "#fff2c0",
            intensity: 0.8,
            opacity: 0.7,
            angle: 360,
            direction: 0,
            visible: true,
            snapToGrid: true
          }
        ]
      })
    ).toBe(true);

    expect(hasSceneContent({ ...createDefaultScene(), effects: [createFireEffect()] })).toBe(true);
    expect(
      hasSceneContent({
        ...createDefaultScene(),
        combatTracker: {
          active: true,
          participants: [],
          currentParticipantId: null,
          round: 0
        }
      })
    ).toBe(true);
    expect(
      hasSceneContent({
        ...createDefaultScene(),
        shapes: [
          {
            id: "shape-1",
            type: "circle",
            points: [{ x: 0, y: 0 }],
            radius: 100
          }
        ]
      })
    ).toBe(true);

    expect(
      hasSceneContent({
        ...createDefaultScene(),
        labels: [
          {
            id: "label-1",
            type: "label",
            text: "Altar",
            position: { x: 0, y: 0 },
            fontFamily: "system-ui, sans-serif",
            color: "#fff0a8",
            opacity: 1,
            shadow: {
              enabled: true,
              color: "#101315",
              blur: 4
            }
          }
        ]
      })
    ).toBe(true);

    expect(
      hasSceneContent({
        ...createDefaultScene(),
        mapAnnotations: {
          pins: [{
            id: "room-pin-1",
            kind: "room-pin",
            position: { x: 0, y: 0 },
            title: "Altar",
            content: "Informacion privada",
            locked: false
          }],
          areas: []
        }
      })
    ).toBe(true);
  });

  it("detects legacy tactical elements outside the scene document", () => {
    expect(hasSceneContent(createDefaultScene(), 1)).toBe(true);
  });

  it("detects fog, darkness, grid and settings changes", () => {
    expect(
      hasSceneContent({
        ...createDefaultScene(),
        fogOfWar: {
          ...createDefaultScene().fogOfWar,
          revealedAreas: [
            {
              id: "reveal-1",
              kind: "circle",
              center: { x: 0, y: 0 },
              radius: 50
            }
          ]
        }
      })
    ).toBe(true);

    expect(
      hasSceneContent({
        ...createDefaultScene(),
        darkness: {
          ...createDefaultScene().darkness,
          darkvisionEnabled: true
        }
      })
    ).toBe(true);

    expect(
      hasSceneContent({
        ...createDefaultScene(),
        grid: {
          ...createDefaultScene().grid,
          cellSizeWorld: 80
        }
      })
    ).toBe(true);

    expect(
      hasSceneContent({
        ...createDefaultScene(),
        settings: {
          ...createDefaultScene().settings,
          snapToGrid: false
        }
      })
    ).toBe(true);
  });
});

function createFireEffect() {
  return {
    id: "fire-1",
    kind: "fire" as const,
    position: { x: 0, y: 0 },
    zone: {
      kind: "circle" as const,
      mode: "closed" as const,
      radius: 100,
      innerRadiusRatio: 0.4
    },
    scale: 1,
    opacity: 0.7,
    color: "#ff3030",
    visible: true,
    emitsLight: true,
    lightRadius: 150
  };
}
