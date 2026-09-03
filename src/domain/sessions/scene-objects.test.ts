import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./default-scene";
import { createAnimatedFireEffect } from "../effects/fire";
import { listSceneObjects, removeSceneObject } from "./scene-objects";

describe("scene objects index", () => {
  it("includes hidden effects and all area types with identifiable names", () => {
    const entries = listSceneObjects([], [{ ...createAnimatedFireEffect("fire-1", { x: 2, y: 3 }), visible: false }], [
      { id: "rect-1", type: "rectangle", points: [{ x: 100, y: 200 }], width: 300, height: 600 },
      { id: "path-1", type: "path", points: [{ x: 0, y: 0 }, { x: 100, y: 200 }] }
    ]);
    expect(entries[0]).toMatchObject({ id: "fire-1", visible: false, group: "Efectos" });
    expect(entries[1]?.center).toEqual({ x: 100, y: 200 });
    expect(entries[2]?.center).toEqual({ x: 50, y: 100 });
    expect(new Set(entries.map((entry) => entry.label)).size).toBe(3);
  });
  it("deletes the requested collection/id without depending on canvas selection", () => {
    const scene = { ...createDefaultScene(), effects: [createAnimatedFireEffect("first", { x: 0, y: 0 }), createAnimatedFireEffect("second", { x: 50, y: 50 })] };
    const next = removeSceneObject(scene, { collection: "effects", id: "second" });
    expect(next.effects.map((item) => item.id)).toEqual(["first"]);
    expect(next.shapes).toBe(scene.shapes);
    expect(scene.effects).toHaveLength(2);
    expect(removeSceneObject(next, { collection: "effects", id: "second" })).toBe(next);
  });
});
