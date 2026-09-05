import { describe, expect, it } from "vitest";
import type { SceneFileStorage } from "../services/scene-file-storage";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { serializeSceneDocument } from "../../domain/sessions/scene-schema";
import { createDefaultSceneMap } from "../../domain/sessions/scene-maps";
import {
  createDynamicLightEffect,
  createDynamicLightSavePayload
} from "../../domain/effects/dynamic-light";
import { SCENE_DOCUMENT_VERSION, type SceneMapDocument } from "../../domain/sessions/scene-document";
import { loadSceneUseCase } from "./load-scene";
import { saveSceneToPathUseCase, saveSceneUseCase } from "./save-scene";

function firstSavedMap(json: string): SceneMapDocument {
  const savedScene = JSON.parse(json) as { maps: SceneMapDocument[] };
  const map = savedScene.maps[0];
  if (map === undefined) throw new Error("Expected saved scene to include a map.");
  return map;
}

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
    expect(JSON.parse(savedJson)).toMatchObject({ version: SCENE_DOCUMENT_VERSION });
  });

  it("persists dynamic lights inside scene JSON", async () => {
    let savedJson = "";
    const dynamicLight = createDynamicLightEffect("dynamic-light-1", { x: 80, y: 120 });
    const scene = {
      ...createDefaultScene(),
      effects: [createDynamicLightSavePayload(dynamicLight, 100)]
    };
    const storage: SceneFileStorage = {
      saveSceneJson: async (json) => {
        savedJson = json;
        return "/tmp/dynamic-light.ttrpgscene";
      },
      loadSceneJson: async () => null,
      fileExists: async () => true
    };

    const result = await saveSceneUseCase(storage, scene);

    expect(result).toMatchObject({ ok: true, filePath: "/tmp/dynamic-light.ttrpgscene" });
    const savedMap = firstSavedMap(savedJson);
    expect(savedMap).toMatchObject({ effects: [dynamicLight] });
    expect(savedMap.effects[0]).not.toHaveProperty("radius");
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
    expect(firstSavedMap(savedJson)).toMatchObject({
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

  it("saves an existing scene directly to its path without invoking the save dialog", async () => {
    const updates: { readonly filePath: string; readonly json: string }[] = [];
    let dialogInvoked = false;
    const storage: SceneFileStorage = {
      saveSceneJson: async () => {
        dialogInvoked = true;
        return null;
      },
      loadSceneJson: async () => null,
      replaceSceneJsonFiles: async (files) => {
        updates.push(...files);
      },
      fileExists: async () => true
    };

    const result = await saveSceneToPathUseCase(
      storage,
      createDefaultScene(),
      "/tmp/current-scene.ttrpgscene"
    );

    expect(result).toMatchObject({ ok: true, filePath: "/tmp/current-scene.ttrpgscene" });
    expect(dialogInvoked).toBe(false);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.filePath).toBe("/tmp/current-scene.ttrpgscene");
    expect(JSON.parse(updates[0]?.json ?? "")).toMatchObject({ version: SCENE_DOCUMENT_VERSION });
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

  it("opens current-format scenes on the first map in scene order", async () => {
    const firstMap = createDefaultSceneMap({
      id: "map-1",
      name: "Entrada",
      camera: { x: 10, y: 20, zoom: 1.25 }
    });
    const secondMap = createDefaultSceneMap({
      id: "map-2",
      name: "Cripta",
      camera: { x: 900, y: 800, zoom: 0.5 }
    });
    const scene = {
      ...createDefaultScene(),
      maps: [firstMap, secondMap],
      activeMapId: "map-2",
      ...secondMap
    };
    const storage: SceneFileStorage = {
      saveSceneJson: async () => null,
      loadSceneJson: async () => ({
        filePath: "/tmp/current.ttrpgscene",
        json: serializeSceneDocument(scene)
      }),
      fileExists: async () => true
    };

    const result = await loadSceneUseCase(storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.activeMapId).toBe("map-1");
    expect(result.scene.name).toBe("Entrada");
    expect(result.scene.camera).toEqual(firstMap.camera);
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
