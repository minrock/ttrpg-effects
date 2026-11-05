import { describe, expect, it } from "vitest";
import { copyArea, moveShape, setAreaLocked, updateShape } from "./shapes";
import type { SceneShape } from "../sessions/scene-document";
import { createDefaultScene } from "../sessions/default-scene";
import { parseSceneJson, serializeSceneDocument } from "../sessions/scene-schema";
import { removeSceneObject } from "../sessions/scene-objects";
import { sanitizePlayerWindowSnapshot } from "../player/player-window-snapshot";
const area: SceneShape = { id: "circle", type: "circle", points: [{ x: 0, y: 20 }], radius: 40, emoji: "❄️", color: "#abcdef", areaPattern: "checkerboard" };
describe("áreas contextuales", () => {
  it("bloquea todas las transformaciones y borrado hasta desbloquear", () => {
    const locked = setAreaLocked(area, true);
    expect(moveShape(locked, { x: 90, y: 90 })).toBe(locked);
    expect(updateShape(locked, { radius: 100, color: "#000000", emoji: "" })).toBe(locked);
    expect(() => copyArea(locked, "copy", 100)).toThrow("Desbloquea");
    const scene = { ...createDefaultScene(), shapes: [locked] };
    expect(removeSceneObject(scene, { id: locked.id, collection: "shapes" })).toBe(scene);
    expect(updateShape(setAreaLocked(locked, false), { radius: 100 }).radius).toBe(100);
  });
  it("copia geometría y estilo sin referencias compartidas y valida límites", () => {
    const copy = copyArea(area, "copy", 100);
    expect(copy).toMatchObject({ id: "copy", color: area.color, areaPattern: "checkerboard", locked: false, radius: 40, points: [{ x: 100, y: 120 }] });
    expect(copy.points[0]).not.toBe(area.points[0]);
    expect(() => copyArea({ ...area, points: [{ x: 1e7, y: 0 }] }, "copy", 100)).toThrow("límites");
    expect(() => updateShape(area, { color: "url(hostil)" })).toThrow("color");
  });
  it("guarda estilo y bloqueo y los conserva al proyectar; escenas previas no se reinterpretan", () => {
    const scene = { ...createDefaultScene(), shapes: [setAreaLocked(area, true)] };
    const restored = parseSceneJson(serializeSceneDocument(scene));
    expect(restored.shapes[0]).toMatchObject({ color: "#abcdef", locked: true, areaPattern: "checkerboard" });
    const snapshot = sanitizePlayerWindowSnapshot({ scene: restored, camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false });
    expect(snapshot?.scene.shapes[0]).toMatchObject({ locked: true, areaPattern: "checkerboard" });
    const legacy = { ...scene, shapes: [{ id: "old", type: "circle" as const, points: [{ x: 1, y: 2 }], radius: 30, emoji: "❄️💨" }] };
    expect(parseSceneJson(serializeSceneDocument(legacy)).shapes).toEqual(legacy.shapes);
  });
});
