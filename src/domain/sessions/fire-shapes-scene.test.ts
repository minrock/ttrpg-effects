import { describe, expect, it } from "vitest";
import { createAnimatedFireEffect, createDrawnFireEffect, createCellFireZone } from "../effects/fire";
import { createPlayerSceneSnapshot } from "../player/player-window";
import { sanitizePlayerWindowSnapshot } from "../player/player-window-snapshot";
import { createDefaultScene } from "./default-scene";
import { addSceneMap, createDefaultSceneMap, setActiveSceneMap, syncActiveMapFromRuntimeFields } from "./scene-maps";
import { parseSceneDocument, parseSceneJson, serializeSceneDocument } from "./scene-schema";
import { listSceneObjects } from "./scene-objects";

const effects = (["line", "cone", "circle"] as const).map(shape => createDrawnFireEffect(shape, shape, { x: 10, y: 20 }, { x: 310, y: 420 }, 80));
describe("fire shape persistence", () => {
  it("round trips mixed old/new zones across maps and the player IPC boundary", () => {
    const old = createAnimatedFireEffect("old", { x: 0, y: 0 });
    const cells = { ...old, id: "painted", zone: createCellFireZone([{ x: 0, y: 0, size: 100, layout: "hexagonal" }]) };
    const first = syncActiveMapFromRuntimeFields({ ...createDefaultScene(), effects: [...effects, old, cells] });
    const second = addSceneMap(first, createDefaultSceneMap({ id: "map-2", effects: [] }));
    const restored = setActiveSceneMap(parseSceneJson(serializeSceneDocument(second)), "map-1");
    expect(restored.effects).toEqual(first.effects); expect(restored.version).toBe(2);
    const snapshot = { scene: createPlayerSceneSnapshot(restored), mapImageUrl: null, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 1 }, showDmFogOverlay: false };
    expect(sanitizePlayerWindowSnapshot(snapshot)?.scene.effects).toEqual(first.effects);
    expect(serializeSceneDocument(restored)).not.toMatch(/effectDraft|uFuel|texture|pointer/);
  });
  it("rejects invalid imports and does not accept a configurable cone aperture", () => {
    for (const zone of [
      { kind: "line", end: effects[0]!.position, width: 100 }, { kind: "line", end: { x: Infinity, y: 0 }, width: 100 },
      { kind: "line", end: { x: 100, y: 100 }, width: 0 }, { kind: "cone", radius: 0, direction: 90 },
      { kind: "line", end: { x: 1.7e308, y: 1.7e308 }, width: 100 },
      { kind: "cone", radius: 100, direction: NaN }, { kind: "cone", radius: 100, direction: 90, aperture: 90 }
    ]) expect(() => parseSceneDocument({ ...createDefaultScene(), effects: [{ ...effects[0]!, zone }] })).toThrow();
    const parsed = parseSceneDocument({ ...createDefaultScene(), effects: [{ ...effects[1]!, zone: { kind: "cone", radius: 100, direction: -90 } }] });
    expect(parsed.effects[0]).toMatchObject({ zone: { direction: 270 } });
  });
  it("shows useful names and centers for the scene object tree", () => {
    const objects = listSceneObjects([], effects, []);
    expect(objects.map(item => item.label)).toEqual(["Fuego Linea · line", "Fuego Cono · cone", "Fuego Circulo · circle"]);
    expect(objects[0]?.center).toEqual({ x: 160, y: 220 });
  });
});
