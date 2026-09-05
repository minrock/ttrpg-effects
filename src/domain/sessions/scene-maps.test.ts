import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./default-scene";
import {
  addSceneMap,
  canSaveScene,
  createDefaultSceneMap,
  createEmptyScene,
  hasSceneMapContent,
  removeSceneMap,
  setActiveMapCompassOrientation,
  setActiveSceneMap,
  syncActiveMapFromRuntimeFields
} from "./scene-maps";

describe("scene map document helpers", () => {
  it("keeps draft scenes unsaveable until they contain a map", () => {
    const draft = createEmptyScene();

    expect(draft.maps).toEqual([]);
    expect(draft.activeMapId).toBeNull();
    expect(canSaveScene(draft)).toBe(false);
    expect(canSaveScene(addSceneMap(draft, createDefaultSceneMap()))).toBe(true);
  });

  it("stores runtime changes in the active map without leaking to inactive maps", () => {
    const first = createDefaultSceneMap({ id: "map-1", name: "Entrada" });
    const second = createDefaultSceneMap({ id: "map-2", name: "Cripta" });
    const scene = addSceneMap(addSceneMap(createEmptyScene(), first), second);
    const changedSecond = syncActiveMapFromRuntimeFields({
      ...scene,
      map: { ...scene.map, imagePath: "/maps/crypt.png" },
      grid: { ...scene.grid, lineWidth: 3 }
    });

    expect(changedSecond.maps.find((map) => map.id === "map-2")?.map.imagePath).toBe("/maps/crypt.png");
    expect(changedSecond.maps.find((map) => map.id === "map-2")?.grid.lineWidth).toBe(3);
    expect(changedSecond.maps.find((map) => map.id === "map-1")?.map.imagePath).toBeNull();
    expect(changedSecond.maps.find((map) => map.id === "map-1")?.grid.lineWidth).toBe(1);
  });

  it("switches and removes the active map predictably", () => {
    const first = createDefaultSceneMap({ id: "map-1", name: "Entrada" });
    const second = createDefaultSceneMap({ id: "map-2", name: "Cripta" });
    const scene = addSceneMap(addSceneMap(createEmptyScene(), first), second);

    const selectedFirst = setActiveSceneMap(scene, "map-1");
    expect(selectedFirst.id).toBe("map-1");
    expect(selectedFirst.name).toBe("Entrada");

    const removedFirst = removeSceneMap(selectedFirst, "map-1");
    expect(removedFirst.activeMapId).toBe("map-2");
    expect(removedFirst.id).toBe("map-2");
    expect(removedFirst.maps.map((map) => map.id)).toEqual(["map-2"]);
  });

  it("detects meaningful content inside a map", () => {
    expect(hasSceneMapContent(createDefaultScene().maps[0])).toBe(false);
    expect(hasSceneMapContent(createDefaultSceneMap({ map: { imagePath: "/maps/a.png", position: { x: 0, y: 0 }, scale: 1 } }))).toBe(true);
  });

  it("stores compass orientation per active map", () => {
    const first = createDefaultSceneMap({ id: "map-1", name: "Entrada" });
    const second = createDefaultSceneMap({ id: "map-2", name: "Cripta" });
    const scene = setActiveSceneMap(addSceneMap(addSceneMap(createEmptyScene(), first), second), "map-1");
    const orientedFirst = setActiveMapCompassOrientation(scene, 90);
    const orientedSecond = setActiveMapCompassOrientation(setActiveSceneMap(orientedFirst, "map-2"), 180);

    expect(orientedSecond.maps.find((map) => map.id === "map-1")?.compassOrientation).toBe(90);
    expect(orientedSecond.maps.find((map) => map.id === "map-2")?.compassOrientation).toBe(180);
    expect(setActiveSceneMap(orientedSecond, "map-1").compassOrientation).toBe(90);
  });
});
