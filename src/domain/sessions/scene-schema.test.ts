import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./default-scene";
import { parseSceneDocument, parseSceneJson, serializeSceneDocument } from "./scene-schema";

describe("scene document schema", () => {
  it("accepts the default scene", () => {
    expect(parseSceneDocument(createDefaultScene())).toEqual(createDefaultScene());
  });

  it("serializes scene JSON with version 1", () => {
    const serialized = serializeSceneDocument(createDefaultScene());

    expect(JSON.parse(serialized)).toMatchObject({ version: 1 });
  });

  it("rejects incompatible versions", () => {
    expect(() => parseSceneDocument({ ...createDefaultScene(), version: 999 })).toThrow();
  });

  it("rejects invalid ranges", () => {
    const scene = {
      ...createDefaultScene(),
      grid: {
        ...createDefaultScene().grid,
        opacity: 2
      }
    };

    expect(() => parseSceneDocument(scene)).toThrow();
  });

  it("normalizes map scale when loading scenes", () => {
    const scene = {
      ...createDefaultScene(),
      map: {
        ...createDefaultScene().map,
        scale: 12
      }
    };

    expect(parseSceneDocument(scene).map.scale).toBe(4);
  });

  it("adds darkvision disabled to older v1 scenes", () => {
    const legacyScene = {
      ...createDefaultScene(),
      darkness: {
        enabled: true,
        opacity: 0.65,
        color: "#000000"
      }
    };

    expect(parseSceneDocument(legacyScene).darkness.darkvisionEnabled).toBe(false);
  });

  it("adds an inactive combat tracker to older v1 scenes", () => {
    const legacyScene = Object.fromEntries(
      Object.entries(createDefaultScene()).filter(([key]) => key !== "combatTracker")
    );

    expect(parseSceneDocument(legacyScene).combatTracker).toEqual({
      active: false,
      participants: [],
      currentParticipantId: null,
      round: 0
    });
  });

  it("preserves enabled darkvision in scene darkness", () => {
    const scene = {
      ...createDefaultScene(),
      darkness: {
        ...createDefaultScene().darkness,
        darkvisionEnabled: true
      }
    };

    expect(parseSceneDocument(scene).darkness.darkvisionEnabled).toBe(true);
  });

  it("accepts lights and fire effects with complete properties", () => {
    const scene = {
      ...createDefaultScene(),
      lights: [
        {
          id: "light-1",
          kind: "cone",
          position: { x: 10, y: 20 },
          radius: 260,
          color: "#ffd28a",
          intensity: 0.8,
          opacity: 0.7,
          angle: 65,
          direction: 45,
          visible: true,
          snapToGrid: false
        }
      ],
      effects: [
        {
          id: "fire-1",
          kind: "fire",
          position: { x: -30, y: 80 },
          zone: {
            kind: "circle",
            mode: "closed",
            radius: 90,
            innerRadiusRatio: 0
          },
          scale: 1,
          opacity: 0.95,
          color: "#ff7a38",
          visible: true,
          emitsLight: true,
          lightRadius: 150
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("adds a default circular zone to older fire effects", () => {
    const scene = {
      ...createDefaultScene(),
      effects: [
        {
          id: "fire-1",
          kind: "fire",
          position: { x: 0, y: 0 },
          scale: 1,
          opacity: 0.95,
          color: "#ff7a38",
          visible: true,
          emitsLight: true,
          lightRadius: 150
        }
      ]
    };

    expect(parseSceneDocument(scene).effects[0]).toMatchObject({
      zone: {
        kind: "circle",
        mode: "closed",
        radius: 90,
        innerRadiusRatio: 0
      }
    });
  });

  it("accepts painted cell fire zones", () => {
    const scene = {
      ...createDefaultScene(),
      effects: [
        {
          id: "fire-1",
          kind: "fire",
          position: { x: 20, y: 20 },
          zone: {
            kind: "cells",
            radius: 50,
            cells: [
              { x: 0, y: 0, size: 80 },
              { x: 80, y: 0, size: 80 }
            ]
          },
          scale: 1,
          opacity: 0.95,
          color: "#ff7a38",
          visible: true,
          emitsLight: true,
          lightRadius: 150
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("accepts magical darkness effects", () => {
    const scene = {
      ...createDefaultScene(),
      effects: [
        {
          id: "magical-darkness-1",
          kind: "magical-darkness",
          position: { x: 40, y: -20 },
          radius: 150,
          opacity: 0.35,
          visible: true
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("rejects invalid magical darkness ranges", () => {
    const scene = {
      ...createDefaultScene(),
      effects: [
        {
          id: "magical-darkness-1",
          kind: "magical-darkness",
          position: { x: 0, y: 0 },
          radius: 0,
          opacity: 2,
          visible: true
        }
      ]
    };

    expect(() => parseSceneDocument(scene)).toThrow();
  });

  it("accepts water effects", () => {
    const scene = {
      ...createDefaultScene(),
      effects: [
        {
          id: "water-river-1",
          kind: "water",
          variant: "river",
          position: { x: 50, y: 0 },
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ],
          width: 80,
          lineRotation: 0,
          patternRotation: 30,
          hue: 15,
          saturation: 1.2,
          opacity: 0.8,
          visible: true
        },
        {
          id: "water-body-1",
          kind: "water",
          variant: "water-body",
          position: { x: 50, y: 50 },
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 0 }
          ],
          lineRotation: 0,
          patternRotation: 45,
          hue: 0,
          saturation: 1,
          opacity: 0.8,
          visible: true
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("accepts tactical shapes with optional dimensions", () => {
    const scene = {
      ...createDefaultScene(),
      shapes: [
        {
          id: "measurement-1",
          type: "measurement",
          points: [
            { x: 0, y: 0 },
            { x: 300, y: 0 }
          ]
        },
        {
          id: "path-1",
          type: "path",
          points: [
            { x: 50, y: 50 },
            { x: 150, y: 50 },
            { x: 150, y: 150 }
          ]
        },
        {
          id: "circle-1",
          type: "circle",
          points: [{ x: 10, y: 20 }],
          radius: 100
        },
        {
          id: "cone-1",
          type: "cone",
          points: [{ x: 10, y: 20 }],
          radius: 300,
          angle: 60,
          direction: 45
        },
        {
          id: "rectangle-1",
          type: "rectangle",
          points: [{ x: 0, y: 0 }],
          width: 300,
          height: 200
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("accepts virtual tokens in scenes", () => {
    const scene = {
      ...createDefaultScene(),
      tokens: [
        {
          id: "token-1",
          name: "Goblin",
          type: "Goblin",
          imagePath: "/tokens/goblin.png",
          position: { x: 150, y: 150 },
          size: "small",
          footprintCells: 1,
          selectionColor: "#fff0a8",
          badgeNumber: 1,
          order: 1,
          visible: true
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("adds empty tokens to older v1 scenes", () => {
    const legacyScene = { ...createDefaultScene() } as Record<string, unknown>;
    delete legacyScene.tokens;

    expect(parseSceneDocument(legacyScene).tokens).toEqual([]);
  });

  it("adds visible true to older persisted tokens", () => {
    const scene = {
      ...createDefaultScene(),
      tokens: [
        {
          id: "token-1",
          name: "Goblin",
          type: "Goblin",
          imagePath: "/tokens/goblin.png",
          position: { x: 150, y: 150 },
          size: "small",
          footprintCells: 1,
          selectionColor: "#fff0a8",
          badgeNumber: 1,
          order: 1
        }
      ]
    };

    expect(parseSceneDocument(scene).tokens[0].visible).toBe(true);
  });

  it("accepts DM-only labels in scenes", () => {
    const scene = {
      ...createDefaultScene(),
      labels: [
        {
          id: "label-1",
          type: "label",
          text: "Entrada secreta",
          position: { x: 120, y: -40 },
          fontFamily: "Georgia, serif",
          color: "#fff0a8",
          opacity: 0.85,
          shadow: {
            enabled: true,
            color: "#101315",
            blur: 6
          }
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("adds empty labels to older v1 scenes", () => {
    const legacyScene = { ...createDefaultScene() } as Record<string, unknown>;
    delete legacyScene.labels;

    expect(parseSceneDocument(legacyScene).labels).toEqual([]);
  });

  it("rejects persisted paths with fewer than two points", () => {
    const scene = {
      ...createDefaultScene(),
      shapes: [
        {
          id: "path-1",
          type: "path",
          points: [{ x: 50, y: 50 }]
        }
      ]
    };

    expect(() => parseSceneDocument(scene)).toThrow();
  });

  it("accepts optional emojis on tactical shapes", () => {
    const scene = {
      ...createDefaultScene(),
      shapes: [
        {
          id: "measurement-1",
          type: "measurement",
          emoji: "⚡",
          points: [
            { x: 0, y: 0 },
            { x: 300, y: 0 }
          ]
        },
        {
          id: "circle-1",
          type: "circle",
          emoji: "❄️",
          points: [{ x: 10, y: 20 }],
          radius: 100
        }
      ]
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("keeps older tactical shapes without emojis valid", () => {
    const scene = {
      ...createDefaultScene(),
      shapes: [
        {
          id: "circle-1",
          type: "circle",
          points: [{ x: 10, y: 20 }],
          radius: 100
        }
      ]
    };

    expect(parseSceneDocument(scene).shapes[0].emoji).toBeUndefined();
  });

  it("silently drops legacy line shapes from older scenes", () => {
    const scene = {
      ...createDefaultScene(),
      shapes: [
        {
          id: "line-old",
          type: "line",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 }
          ]
        },
        {
          id: "measurement-1",
          type: "measurement",
          points: [
            { x: 0, y: 0 },
            { x: 300, y: 0 }
          ]
        }
      ]
    };

    const parsed = parseSceneDocument(scene);

    expect(parsed.shapes).toHaveLength(1);
    expect(parsed.shapes[0].id).toBe("measurement-1");
  });

  it("adds default fog of war data to older v1 scenes", () => {
    const legacyScene = { ...createDefaultScene() } as Record<string, unknown>;
    delete legacyScene.fogOfWar;

    expect(parseSceneDocument(legacyScene)).toMatchObject({
      fogOfWar: createDefaultScene().fogOfWar
    });
  });

  it("accepts fog of war revealed areas and wall obstacles", () => {
    const scene = {
      ...createDefaultScene(),
      fogOfWar: {
        enabled: true,
        opacity: 0.95,
        color: "#000000",
        revealRadius: 160,
        revealedAreas: [
          {
            id: "reveal-1",
            kind: "circle",
            center: { x: 20, y: 30 },
            radius: 120
          },
          {
            id: "reveal-stroke-1",
            kind: "stroke",
            points: [
              { x: 40, y: 50 },
              { x: 80, y: 90 }
            ],
            radius: 60
          }
        ],
        obstacles: [
          {
            id: "wall-1",
            kind: "wall",
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 }
            ]
          }
        ]
      }
    };

    expect(parseSceneDocument(scene)).toEqual(scene);
  });

  it("preserves monster template ids in the DM aside", () => {
    const scene = {
      ...createDefaultScene(),
      sceneAside: {
        monsters: [
          {
            id: "dragon-rojo",
            name: "Dragon rojo adulto",
            imagePath: null,
            visibleToPlayer: false,
            notes: "# Dragon rojo adulto",
            templateId: "dnd-55e-statblock"
          }
        ],
        npcs: [],
        notes: []
      }
    };

    expect(parseSceneDocument(scene).sceneAside?.monsters[0]?.templateId).toBe("dnd-55e-statblock");
  });

  it("loads older monsters without template ids", () => {
    const scene = {
      ...createDefaultScene(),
      sceneAside: {
        monsters: [
          {
            id: "goblin",
            name: "Goblin",
            imagePath: null,
            visibleToPlayer: false,
            notes: ""
          }
        ],
        npcs: [],
        notes: []
      }
    };

    expect(parseSceneDocument(scene).sceneAside?.monsters[0]?.templateId).toBeNull();
  });

  it("returns a friendly error for invalid JSON", () => {
    expect(() => parseSceneJson("{ nope")).toThrow("JSON valido");
  });
});
