import { describe, expect, it } from "vitest";
import type { SceneFileStorage } from "../services/scene-file-storage";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { createReciprocalSceneLinkMarkers, type MapSceneLinkMarker } from "../../domain/annotations/scene-navigation-links";
import { LEGACY_SCENE_DOCUMENT_VERSION } from "../../domain/sessions/scene-document";
import { loadSceneUseCase } from "./load-scene";

const pathA = "/tmp/linked/a.ttrpgscene";
const pathB = "/tmp/linked/b.ttrpgscene";

describe("linked legacy scene loading", () => {
  it("loads reciprocal legacy scene links as internal maps without cycling", async () => {
    const [markerA, markerB] = createReciprocalSceneLinkMarkers(
      marker("scene-link-a", "Salida", 10, 20),
      pathA,
      marker("scene-link-b", "Entrada", 300, 400),
      pathB,
      "connection-1"
    );
    const storage = createStorage([
      [pathA, legacySceneJson(markerA, "/maps/a.png")],
      [pathB, legacySceneJson(markerB, "/maps/b.png")]
    ]);

    const result = await loadSceneUseCase(storage, { filePath: pathA });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.maps.map((map) => [map.id, map.name, map.map.imagePath])).toEqual([
      ["map-1", "a", "/maps/a.png"],
      ["map-2", "b", "/maps/b.png"]
    ]);
    expect(result.scene.mapAnnotations.sceneLinks[0]?.connection?.peer).toMatchObject({
      scenePath: pathA,
      markerId: "scene-link-b",
      mapId: "map-2"
    });
    expect(result.scene.maps[1]?.mapAnnotations.sceneLinks[0]?.connection?.peer).toMatchObject({
      scenePath: pathA,
      markerId: "scene-link-a",
      mapId: "map-1"
    });
    expect(result.mapImageUrls).toEqual({
      "map-1": "map-asset:///maps/a.png",
      "map-2": "map-asset:///maps/b.png"
    });
    expect(result.warnings.some((warning) => warning.code === "scene-format-outdated")).toBe(true);
  });
});

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

function createStorage(entries: readonly (readonly [string, string])[]): SceneFileStorage {
  const files = new Map(entries);
  return {
    saveSceneJson: async () => null,
    loadSceneJson: async () => null,
    loadSceneJsonFromPath: async (filePath) => {
      const json = files.get(filePath);
      if (json === undefined) throw new Error(`Missing ${filePath}`);
      return { filePath, json };
    },
    fileExists: async (filePath) => filePath.endsWith(".png") || files.has(filePath),
    getMapImageUrl: async (filePath) => `map-asset://${filePath}`
  };
}
