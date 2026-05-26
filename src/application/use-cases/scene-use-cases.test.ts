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

  it("saves virtual tokens inside scene JSON", async () => {
    let savedJson = "";
    const scene = {
      ...createDefaultScene(),
      tokens: [
        {
          id: "token-1",
          name: "Goblin",
          type: "Goblin",
          imagePath: "/tokens/goblin.png",
          position: { x: 150, y: 150 },
          size: "small" as const,
          footprintCells: 1 as const,
          selectionColor: "#fff0a8",
          badgeNumber: 1,
          order: 1,
          visible: true
        }
      ]
    };
    const storage: SceneFileStorage = {
      saveSceneJson: async (json) => {
        savedJson = json;
        return "/tmp/example.ttrpgscene";
      },
      loadSceneJson: async () => null,
      fileExists: async () => true
    };

    const result = await saveSceneUseCase(storage, scene);

    expect(result).toMatchObject({ ok: true, filePath: "/tmp/example.ttrpgscene" });
    expect(JSON.parse(savedJson)).toMatchObject({
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
    });
  });

  it("passes the current scene file path as save dialog suggestion", async () => {
    let suggestedFilePath: string | null | undefined;
    const storage: SceneFileStorage = {
      saveSceneJson: async (_json, options) => {
        suggestedFilePath = options?.suggestedFilePath;
        return "/tmp/current-scene.ttrpgscene";
      },
      loadSceneJson: async () => null,
      fileExists: async () => true
    };

    const result = await saveSceneUseCase(storage, createDefaultScene(), {
      suggestedFilePath: "/tmp/current-scene.ttrpgscene"
    });

    expect(result).toMatchObject({ ok: true, filePath: "/tmp/current-scene.ttrpgscene" });
    expect(suggestedFilePath).toBe("/tmp/current-scene.ttrpgscene");
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

  it("loads existing token images through storage-provided URLs", async () => {
    const scene = {
      ...createDefaultScene(),
      tokens: [
        {
          id: "token-1",
          name: "Goblin",
          type: "Goblin",
          imagePath: "/tokens/goblin.png",
          position: { x: 150, y: 150 },
          size: "small" as const,
          footprintCells: 1 as const,
          selectionColor: "#fff0a8",
          badgeNumber: 1,
          order: 1,
          visible: true
        }
      ]
    };
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/example.ttrpgscene",
        json: serializeSceneDocument(scene)
      }),
      fileExists: async () => true,
      getTokenImageUrl: async (filePath) => `map-asset://${filePath}`
    };

    const result = await loadSceneUseCase(storage);

    expect(result).toMatchObject({
      ok: true,
      tokenImageUrls: {
        "token-1": "map-asset:///tokens/goblin.png"
      }
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

  it("reports a scene-format-outdated warning when sceneAside is absent", async () => {
    // Simulate a scene file saved before spec 26 (no sceneAside field)
    const parsed = JSON.parse(serializeSceneDocument(createDefaultScene())) as Record<string, unknown>;
    delete parsed["sceneAside"];
    const oldJson = JSON.stringify(parsed);

    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({ filePath: "/tmp/old.ttrpgscene", json: oldJson }),
      fileExists: async () => true
    };

    const result = await loadSceneUseCase(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Scene still loads correctly with defaults
    expect(result.scene.sceneAside).toEqual({ monsters: [], npcs: [], playerCharacters: [], notes: [] });
    // And emits the resave warning
    expect(result.warnings).toMatchObject([{ code: "scene-format-outdated" }]);
  });

  it("does not emit scene-format-outdated warning for current-format scenes", async () => {
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/current.ttrpgscene",
        json: serializeSceneDocument(createDefaultScene())
      }),
      fileExists: async () => true
    };

    const result = await loadSceneUseCase(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((w) => w.code === "scene-format-outdated")).toBe(false);
  });

  it("reports a scene-format-outdated warning when playerCharacters is absent from sceneAside", async () => {
    const parsed = JSON.parse(serializeSceneDocument(createDefaultScene())) as Record<string, unknown>;
    const aside = parsed["sceneAside"] as Record<string, unknown>;
    delete aside["playerCharacters"];

    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/old-aside.ttrpgscene",
        json: JSON.stringify(parsed)
      }),
      fileExists: async () => true
    };

    const result = await loadSceneUseCase(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.sceneAside?.playerCharacters).toEqual([]);
    expect(result.warnings).toMatchObject([{ code: "scene-format-outdated" }]);
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
