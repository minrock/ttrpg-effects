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

  it("returns a friendly error for invalid JSON", () => {
    expect(() => parseSceneJson("{ nope")).toThrow("JSON valido");
  });
});
