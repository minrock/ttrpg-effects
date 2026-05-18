import { describe, expect, it } from "vitest";
import type { SceneFileStorage } from "../services/scene-file-storage";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { serializeSceneDocument } from "../../domain/sessions/scene-schema";
import { loadSceneUseCase } from "./load-scene";
import { saveSceneUseCase } from "./save-scene";

describe("scene use cases", () => {
  it("saves valid scene JSON through storage", async () => {
    let savedJson = "";
    const storage: SceneFileStorage = {
      saveSceneJson: async (json) => {
        savedJson = json;
        return "/tmp/example.ttrpgscene";
      },
      loadSceneJson: async () => null,
      fileExists: async () => true
    };

    const result = await saveSceneUseCase(storage, createDefaultScene());

    expect(result).toMatchObject({ ok: true, filePath: "/tmp/example.ttrpgscene" });
    expect(JSON.parse(savedJson)).toMatchObject({ version: 1 });
  });

  it("loads a scene and reports missing map image as a warning", async () => {
    const scene = {
      ...createDefaultScene(),
      map: {
        ...createDefaultScene().map,
        imagePath: "/missing/map.png"
      }
    };
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/example.ttrpgscene",
        json: serializeSceneDocument(scene)
      }),
      fileExists: async () => false
    };

    const result = await loadSceneUseCase(storage);

    expect(result).toMatchObject({
      ok: true,
      filePath: "/tmp/example.ttrpgscene",
      warnings: [{ code: "map-image-missing", path: "/missing/map.png" }]
    });
  });

  it("loads an existing scene map through a storage-provided URL", async () => {
    const scene = {
      ...createDefaultScene(),
      map: {
        ...createDefaultScene().map,
        imagePath: "/maps/dungeon.png"
      }
    };
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/example.ttrpgscene",
        json: serializeSceneDocument(scene)
      }),
      fileExists: async () => true,
      getMapImageUrl: async (filePath) => `map-asset://${filePath}`
    };

    const result = await loadSceneUseCase(storage);

    expect(result).toMatchObject({
      ok: true,
      filePath: "/tmp/example.ttrpgscene",
      mapImageUrl: "map-asset:///maps/dungeon.png"
    });
  });

  it("does not request a map URL when the referenced map is missing", async () => {
    const scene = {
      ...createDefaultScene(),
      map: {
        ...createDefaultScene().map,
        imagePath: "/missing/map.png"
      }
    };
    let requestedMapUrl = false;
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/example.ttrpgscene",
        json: serializeSceneDocument(scene)
      }),
      fileExists: async () => false,
      getMapImageUrl: async () => {
        requestedMapUrl = true;
        return "map-asset:///missing/map.png";
      }
    };

    await loadSceneUseCase(storage);

    expect(requestedMapUrl).toBe(false);
  });

  it("returns a recoverable error for invalid scene JSON", async () => {
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/broken.ttrpgscene",
        json: "{ broken"
      }),
      fileExists: async () => true
    };

    const result = await loadSceneUseCase(storage);

    expect(result).toMatchObject({ ok: false });
  });
});
