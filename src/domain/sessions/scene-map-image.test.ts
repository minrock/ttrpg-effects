import { describe, expect, it } from "vitest";
import { createSceneLabel } from "../labels/labels";
import type { SceneDocument, SceneMapDocument } from "./scene-document";
import { recordMapImageDimensions, replaceSceneMapImage, seedSceneMapImageSize } from "./scene-map-image";
import { addSceneMap, createDefaultSceneMap, createSceneWithMap, setActiveSceneMap, syncActiveMapFromRuntimeFields } from "./scene-maps";
import { parseSceneDocument, parseSceneJson, serializeSceneDocument } from "./scene-schema";

function populatedMap(id: string): SceneMapDocument {
  const base = createDefaultSceneMap({ id, name: `Map ${id}` });
  return {
    ...base,
    compassOrientation: 90,
    backgroundColor: "#123456",
    map: { imagePath: `/maps/${id}.png`, imageSize: { width: 2000, height: 1000 }, position: { x: 37, y: -91 }, scale: 1 },
    camera: { x: 42, y: -17, zoom: 1.75 },
    grid: { ...base.grid, locked: true, unit: "m", layout: "hexagonal", cellSizeWorld: 91 },
    settings: { snapToGrid: false, diagonalMode: "euclidean" },
    darkness: { ...base.darkness, darkvisionEnabled: true, opacity: 0.8 },
    fogOfWar: {
      ...base.fogOfWar,
      enabled: true,
      revealedAreas: [{ id: "reveal", kind: "circle", center: { x: 10, y: 20 }, radius: 77 }],
      obstacles: [{ id: "wall", kind: "wall", points: [{ x: 0, y: 0 }, { x: 80, y: 90 }] }]
    },
    daytimeMask: { strokes: [{ id: "mask", topology: "circular", mode: "paint", points: [{ x: 11, y: 22 }], radius: 50 }] },
    lights: [{ id: "light", kind: "cone", position: { x: 30, y: 40 }, radius: 100, color: "#ffffff", intensity: 0.7, opacity: 0.8, angle: 60, direction: 90, visible: true, snapToGrid: false }],
    effects: [{ id: "magic", kind: "magical-darkness", position: { x: 50, y: 60 }, radius: 100, opacity: 0.8, visible: true }],
    shapes: [{ id: "measure", type: "measurement", points: [{ x: 10, y: 10 }, { x: 110, y: 110 }] }],
    tokens: [{ id: "token", name: "Guardian", type: "monster", imagePath: "/tokens/guardian.png", position: { x: 17, y: 19 }, size: "medium", footprintCells: 1, selectionColor: "#ffffff", badgeNumber: 1, order: 1, visible: true }],
    labels: [createSceneLabel("label", { x: 100, y: 200 })],
    mapAnnotations: {
      pins: [{ id: "pin", kind: "room-pin", position: { x: 80, y: 90 }, title: "Entrance", content: "Secret", locked: true }],
      areas: [{ id: "trap", kind: "information-area", areaType: "trap", name: "Pit", description: "Hidden", cells: [{ x: 0, y: 0, size: 100 }], locked: true }],
      sceneLinks: [{
        id: `link-${id}`, kind: "scene-link", position: { x: 40, y: 60 }, name: "Stairs", locked: true,
        connection: {
          connectionId: "connection", role: id === "a" ? "origin" : "destination",
          origin: { scenePath: "/scene.ttrpgscene", markerId: "link-a", mapId: "a" },
          destination: { scenePath: "/scene.ttrpgscene", markerId: "link-b", mapId: "b" },
          peer: { scenePath: "/scene.ttrpgscene", markerId: id === "a" ? "link-b" : "link-a", mapId: id === "a" ? "b" : "a" }
        }
      }]
    }
  };
}

function populatedScene(): SceneDocument {
  const base = addSceneMap(createSceneWithMap(populatedMap("a")), populatedMap("b"), false);
  return {
    ...base,
    sceneAside: {
      ...base.sceneAside,
      monsters: [{ id: "guardian", name: "Guardian", imagePath: null, visibleToPlayer: false, notes: "Hidden", templateId: null }],
      npcs: [{ id: "guide", name: "Guide", imagePath: null, visibleToPlayer: true, notes: "Helpful" }],
      notes: [{ id: "note", parentId: null, name: "Plan", content: "Do not lose this" }]
    },
    counters: [{ id: "counter", label: "Time", mode: "countdown", kind: "fixed", capacity: 6, value: 4, isVisibleToPlayers: true, isLabelVisibleToPlayers: false }],
    combatTracker: {
      active: true, currentParticipantId: "participant", round: 3,
      participants: [{ id: "participant", entityType: "monster", entityId: "guardian", name: "Guardian", imagePath: null, initiative: 18, defeated: false, enteredRound: 0, activeFromRound: 0 }]
    },
    daytimeFilter: { enabled: true, preset: "night", coverage: "painted" }
  };
}

const replacement = { imagePath: "/maps/revised.png", imageSize: { width: 3000, height: 1500 }, policy: "preserve-world-size" } as const;

describe("replace scene map image", () => {
  it.each(["a", "b"])("replaces %s and preserves every other field including unsynced runtime edits", (mapId) => {
    const base = populatedScene();
    const scene = {
      ...base,
      map: { ...base.map, imageRuntimeMetadata: { revision: "loaded-revision" } },
      camera: { x: 501, y: 603, zoom: 2.5 },
      grid: { ...base.grid, cellSizeWorld: 123 },
      tokens: base.tokens.map((token) => ({ ...token, position: { x: -321, y: 654 } })),
      labels: [...base.labels, createSceneLabel("pending-label", { x: 25, y: 35 })],
      daytimeMask: { strokes: [...base.daytimeMask.strokes, ...base.daytimeMask.strokes.map((stroke) => ({ ...stroke, id: "pending-stroke" }))] },
      playerCameraRuntime: { x: 1234, y: 5678, zoom: 0.7, synchronized: false },
      imageRevisionRuntime: "revision-1"
    };
    const before = structuredClone(scene);
    const synced = syncActiveMapFromRuntimeFields(scene);
    const target = synced.maps.find((map) => map.id === mapId)!;
    const expectedMap = { ...target.map, imagePath: replacement.imagePath, imageSize: replacement.imageSize, scale: 2 / 3 };
    const result = replaceSceneMapImage(scene, mapId, replacement);

    expect(result).toEqual({
      ...synced,
      maps: synced.maps.map((map) => map.id === mapId ? { ...map, map: expectedMap } : map),
      ...(mapId === scene.activeMapId ? { map: expectedMap } : {})
    });
    expect(scene).toEqual(before);
    expect(result.activeMapId).toBe("a");
    expect(result.map).toBe(mapId === "a" ? result.maps[0].map : scene.map);
    for (const key of ["camera", "grid", "tokens", "labels", "effects", "lights", "shapes", "settings", "darkness", "fogOfWar", "mapAnnotations", "daytimeMask", "daytimeFilter", "sceneAside", "combatTracker", "counters"] as const) {
      expect(result[key]).toBe(scene[key]);
    }
    expect(result.maps.find((map) => map.id === mapId)?.map.position).toBe(target.map.position);
    expect(setActiveSceneMap(setActiveSceneMap(result, "b"), "a")).toEqual(result);
  });

  it("can refresh the same path and repair a missing old image with explicit keep-scale", () => {
    const scene = populatedScene();
    const samePath = replaceSceneMapImage(scene, "a", { ...replacement, imagePath: scene.map.imagePath! });
    expect(samePath.map.imagePath).toBe(scene.map.imagePath);
    expect(samePath.map.imageSize).toEqual(replacement.imageSize);
    const { imageSize: _imageSize, ...mapWithoutDimensions } = scene.map;
    void _imageSize;
    const missing = { ...scene, map: { ...mapWithoutDimensions, imagePath: "/missing.png", scale: 1.234567 } };
    expect(() => replaceSceneMapImage(missing, "a", replacement)).toThrow("anteriores");
    const repaired = replaceSceneMapImage(missing, "a", { ...replacement, imageSize: { width: 100, height: 300 }, policy: "keep-scale" });
    expect(repaired.map.scale).toBe(1.234567);
    expect(repaired.map.position).toBe(scene.map.position);
  });

  it("does not mutate the scene on a deleted target or invalid replacement", () => {
    const scene = populatedScene();
    const before = structuredClone(scene);
    expect(() => replaceSceneMapImage(scene, "deleted", replacement)).toThrow("no existe");
    expect(() => replaceSceneMapImage(scene, "a", { ...replacement, imagePath: "  " })).toThrow("ruta");
    expect(() => replaceSceneMapImage(scene, "a", { ...replacement, imageSize: { width: 0, height: 1 } })).toThrow("dimensiones");
    expect(() => replaceSceneMapImage(scene, "a", { ...replacement, imageSize: { width: 3000, height: 3000 } })).toThrow("proporcion");
    expect(scene).toEqual(before);
  });

  it.each(["a", "b"])("seeds %s dimensions without rounding scale or changing unrelated fields", (mapId) => {
    const base = populatedScene();
    const { imageSize: _imageSize, ...mapWithoutDimensions } = base.map;
    void _imageSize;
    const image = { ...mapWithoutDimensions, scale: 1.234567891234 };
    const scene = {
      ...base,
      map: mapId === "a" ? image : base.map,
      maps: base.maps.map((map) => map.id === mapId ? { ...map, map: image } : map)
    };
    const size = { width: 2000, height: 1000 };
    const seeded = seedSceneMapImageSize(scene, mapId, size);
    const synced = syncActiveMapFromRuntimeFields(scene);
    expect(seeded).toEqual({
      ...synced,
      maps: synced.maps.map((map) => map.id === mapId ? { ...map, map: { ...image, imageSize: size } } : map),
      ...(mapId === "a" ? { map: { ...image, imageSize: size } } : {})
    });
    expect(seedSceneMapImageSize(seeded, mapId, { width: 4000, height: 2000 })).toBe(seeded);
    expect(parseSceneJson(serializeSceneDocument(seeded)).maps.find((map) => map.id === mapId)?.map.scale).toBe(image.scale);
    expect(() => seedSceneMapImageSize(scene, "deleted", size)).toThrow("no existe");
    expect(() => seedSceneMapImageSize(scene, mapId, { width: 0, height: 1 })).toThrow("dimensiones");
  });

  it.each(["a", "b"])("records decoded dimensions for %s only while its path is current", (mapId) => {
    const base = populatedScene();
    const { imageSize: _imageSize, ...mapWithoutDimensions } = base.maps.find((map) => map.id === mapId)!.map;
    void _imageSize;
    const image = { ...mapWithoutDimensions, scale: 1.234567891234 };
    const scene = {
      ...base,
      map: mapId === "a" ? image : base.map,
      camera: { x: 234, y: 345, zoom: 1.987654 },
      maps: base.maps.map((map) => map.id === mapId ? { ...map, map: image } : map)
    };
    const size = { width: 2000, height: 1000 };
    expect(recordMapImageDimensions(scene, "deleted", image.imagePath!, size)).toBe(scene);
    expect(recordMapImageDimensions(scene, mapId, "/obsolete.png", size)).toBe(scene);
    const result = recordMapImageDimensions(scene, mapId, image.imagePath!, size);
    expect(result).toEqual(seedSceneMapImageSize(scene, mapId, size));
    expect(result.maps[0].camera).toBe(scene.camera);
    expect(result.camera).toBe(scene.camera);
    expect(result.activeMapId).toBe(scene.activeMapId);
    expect(recordMapImageDimensions(result, mapId, image.imagePath!, { width: 3000, height: 1500 })).toBe(result);
    expect(() => recordMapImageDimensions(scene, mapId, image.imagePath!, { width: 0, height: 1 })).toThrow("dimensiones");
  });

  it("checks the active runtime path and dimensions instead of stale stored values", () => {
    const base = populatedScene();
    const imageSize = { width: 3000, height: 1500 };
    const { imageSize: _imageSize, ...withoutSize } = base.map;
    void _imageSize;
    const scene = { ...base, map: { ...withoutSize, imagePath: "/current.png" } };
    expect(recordMapImageDimensions(scene, "a", base.map.imagePath!, imageSize)).toBe(scene);
    const recorded = recordMapImageDimensions(scene, "a", "/current.png", imageSize);
    expect(recorded.map.imageSize).toEqual(imageSize);
    expect(recorded.maps[0].map).toBe(recorded.map);
    const staleStoredSize = { ...recorded, maps: scene.maps };
    expect(recordMapImageDimensions(staleStoredSize, "a", "/current.png", { width: 10, height: 10 })).toBe(staleStoredSize);
  });
});

describe("replacement image persistence", () => {
  it.each(["a", "b"])("round-trips %s with exact scale, dimensions, identity, links and content", (mapId) => {
    let scene = replaceSceneMapImage(populatedScene(), mapId, replacement);
    const originalJson = serializeSceneDocument(scene);
    for (let i = 0; i < 5; i += 1) {
      const restored = parseSceneJson(serializeSceneDocument(scene));
      expect(restored).toEqual(scene);
      expect(serializeSceneDocument(restored)).toBe(originalJson);
      expect(restored.maps.find((map) => map.id === mapId)?.map.scale).toBe(2 / 3);
      scene = restored;
    }
    const reverted = replaceSceneMapImage(scene, mapId, { ...replacement, imageSize: { width: 2000, height: 1000 } });
    expect(reverted.maps.find((map) => map.id === mapId)?.map.scale).toBe(1);
    expect(JSON.parse(originalJson).version).toBe(2);
  });

  it("loads V1 and V2 without optional dimensions and migrates V1 dimensions when present", () => {
    const scene = populatedScene();
    const { imageSize: _imageSize, ...legacyMap } = scene.map;
    void _imageSize;
    for (const version of [1, 2]) {
      const legacy = parseSceneDocument({ ...scene, version, map: legacyMap, maps: scene.maps.map((map) => ({ ...map, map: legacyMap })) });
      expect(legacy.map.imageSize).toBeUndefined();
      expect(legacy.maps[0].map.imageSize).toBeUndefined();
    }
    expect(parseSceneDocument({ ...scene, version: 1 }).maps[0].map.imageSize).toEqual(scene.map.imageSize);
  });

  it("rejects invalid persisted dimensions and excludes transient image metadata", () => {
    const scene = populatedScene();
    for (const imageSize of [null, {}, { width: 0, height: 1 }, { width: 1, height: -1 }, { width: 1.5, height: 2 }, { width: Infinity, height: 1 }]) {
      expect(() => parseSceneDocument({ ...scene, map: { ...scene.map, imageSize } })).toThrow();
      expect(() => parseSceneDocument({ ...scene, maps: scene.maps.map((map) => ({ ...map, map: { ...map.map, imageSize } })) })).toThrow();
    }
    const runtimeScene = { ...scene, map: { ...scene.map, imageUrl: "map-asset://temporary", revision: "temporary" } };
    const json = serializeSceneDocument(runtimeScene);
    expect(json).not.toContain("temporary");
    expect(parseSceneJson(json)).toEqual(syncActiveMapFromRuntimeFields(scene));
  });
});
