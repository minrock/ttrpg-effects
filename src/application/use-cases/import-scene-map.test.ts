import { describe, expect, it } from "vitest";
import type { SceneFileStorage } from "../services/scene-file-storage";
import { createReciprocalSceneLinkMarkers, type MapSceneLinkMarker } from "../../domain/annotations/scene-navigation-links";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { LEGACY_SCENE_DOCUMENT_VERSION } from "../../domain/sessions/scene-document";
import { serializeSceneDocument } from "../../domain/sessions/scene-schema";
import { importSceneMapUseCase } from "./import-scene-map";

const pathA = "/tmp/import/a.ttrpgscene";
const pathB = "/tmp/import/b.ttrpgscene";

describe("import scene as map use case", () => {
  it("adds the imported active map and merges scene-level content", async () => {
    const currentScene = {
      ...createDefaultScene(),
      sceneAside: {
        monsters: [],
        npcs: [],
        playerCharacters: [],
        notes: [{ id: "note-1", parentId: null, name: "Base", content: "" }]
      }
    };
    const importedScene = {
      ...createDefaultScene(),
      map: {
        ...createDefaultScene().map,
        imagePath: "/maps/imported.png"
      },
      sceneAside: {
        monsters: [],
        npcs: [],
        playerCharacters: [],
        notes: [
          { id: "note-1", parentId: null, name: "Duplicada", content: "" },
          { id: "note-2", parentId: null, name: "Importada", content: "" }
        ]
      }
    };
    const storage = createStorage(serializeSceneDocument(importedScene));

    const result = await importSceneMapUseCase(storage, currentScene);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.maps).toHaveLength(2);
    expect(result.scene.activeMapId).toBe("map-2");
    expect(result.scene.map.imagePath).toBe("/maps/imported.png");
    expect(result.scene.sceneAside.notes.map((note) => note.id)).toEqual(["note-1", "note-2"]);
    expect(result.mapImageUrl).toBe("map-asset:///maps/imported.png");
  });

  it("rejects imported scenes without a map image", async () => {
    const storage = createStorage(serializeSceneDocument(createDefaultScene()));

    const result = await importSceneMapUseCase(storage, createDefaultScene());

    expect(result).toMatchObject({
      ok: false,
      error: "El archivo importado no contiene un mapa valido."
    });
  });

  it("imports legacy linked scene files as remapped internal maps", async () => {
    const [markerA, markerB] = createReciprocalSceneLinkMarkers(
      marker("scene-link-a", "Salida", 10, 20),
      pathA,
      marker("scene-link-b", "Entrada", 300, 400),
      pathB,
      "connection-1"
    );
    const storage = createGraphStorage([
      [pathA, legacySceneJson(markerA, "/maps/a.png")],
      [pathB, legacySceneJson(markerB, "/maps/b.png")]
    ]);

    const result = await importSceneMapUseCase(storage, createDefaultScene());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.maps.map((map) => [map.id, map.map.imagePath])).toEqual([
      ["map-1", null],
      ["map-2", "/maps/a.png"],
      ["map-3", "/maps/b.png"]
    ]);
    expect(result.scene.activeMapId).toBe("map-2");
    expect(result.scene.mapAnnotations.sceneLinks[0]?.connection?.peer).toMatchObject({
      markerId: "scene-link-b",
      mapId: "map-3"
    });
    expect(result.scene.maps[2]?.mapAnnotations.sceneLinks[0]?.connection?.peer).toMatchObject({
      markerId: "scene-link-a",
      mapId: "map-2"
    });
  });
});

function createStorage(importedJson: string): SceneFileStorage {
  return {
    saveSceneJson: async () => null,
    loadSceneJson: async () => null,
    selectSceneJsonPath: async () => "/tmp/imported.ttrpgscene",
    loadSceneJsonFromPath: async (filePath) => ({ filePath, json: importedJson }),
    fileExists: async () => true,
    getMapImageUrl: async (filePath) => `map-asset://${filePath}`
  };
}

function marker(id: string, name: string, x: number, y: number): MapSceneLinkMarker {
  return { id, kind: "scene-link", position: { x, y }, name, locked: false, connection: null };
}

function legacySceneJson(sceneLink: MapSceneLinkMarker, imagePath: string): string {
  const { maps, activeMapId, id, name, ...legacyScene } = createDefaultScene();
  void maps;
  void activeMapId;
  void id;
  void name;
  return `${JSON.stringify({
    ...legacyScene,
    version: LEGACY_SCENE_DOCUMENT_VERSION,
    map: { ...legacyScene.map, imagePath },
    mapAnnotations: { ...legacyScene.mapAnnotations, sceneLinks: [sceneLink] }
  })}\n`;
}

function createGraphStorage(entries: readonly (readonly [string, string])[]): SceneFileStorage {
  const files = new Map(entries);
  return {
    saveSceneJson: async () => null,
    loadSceneJson: async () => null,
    selectSceneJsonPath: async () => pathA,
    loadSceneJsonFromPath: async (filePath) => {
      const json = files.get(filePath);
      if (json === undefined) throw new Error(`Missing ${filePath}`);
      return { filePath, json };
    },
    fileExists: async () => true,
    getMapImageUrl: async (filePath) => `map-asset://${filePath}`
  };
}
