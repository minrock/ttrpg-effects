import { describe, expect, it } from "vitest";
import { createLightningEffect, updateLightningEffect } from "../effects/lightning";
import { createPlayerSceneSnapshot } from "../player/player-window";
import { createDefaultScene } from "./default-scene";
import { addSceneMap, createDefaultSceneMap, setActiveSceneMap, syncActiveMapFromRuntimeFields } from "./scene-maps";
import { parseSceneDocument, parseSceneJson, serializeSceneDocument } from "./scene-schema";
import { listSceneObjects, removeSceneObject } from "./scene-objects";

const effects = (["line", "cone", "circle"] as const).map((shape, i) => updateLightningEffect(
  createLightningEffect(`lightning-${i}`, shape, { x: 10, y: 20 }, { x: 310, y: 420 }, 1000),
  { speed: 1.4, intensity: 0.8, opacity: 0.6 }, 3000
));

describe("lightning scene integration", () => {
  it("round-trips all variants and clock fields per map and through player snapshots", () => {
    const first = syncActiveMapFromRuntimeFields({ ...createDefaultScene(), effects });
    const second = addSceneMap(first, createDefaultSceneMap({ id: "map-2", effects: [{ ...effects[0]!, id: "elsewhere", seed: 42 }] }));
    const saved = parseSceneJson(serializeSceneDocument(second));
    expect(saved.version).toBe(2);
    expect(saved.maps.map(map => map.effects)).toEqual([first.effects, second.effects]);
    const restored = setActiveSceneMap(saved, "map-1");
    expect(restored.effects).toEqual(effects);
    expect(createPlayerSceneSnapshot(restored).effects).toEqual(effects);
    expect(serializeSceneDocument(restored)).not.toMatch(/vertices|lightningDraft|pointer|generationMs/);
  });

  it("keeps existing scenes unchanged and derives useful tree names/centers", () => {
    const old = createDefaultScene();
    expect(parseSceneJson(serializeSceneDocument(old))).toEqual(old);
    const entries = listSceneObjects([], effects, []);
    expect(entries.map(item => item.label)).toEqual(["Relampago Linea · lightning-0", "Relampago Cono · lightning-1", "Relampago Circulo · lightning-2"]);
    expect(entries[0]?.center).toEqual({ x: 160, y: 220 });
    expect(removeSceneObject({ ...old, effects }, entries[0]!).effects).toEqual(effects.slice(1));
  });

  it("rejects invalid imported geometry, temporal fields and unsupported aperture", () => {
    const cone = effects[1]!;
    for (const patch of [
      { zone: { kind: "line", end: cone.position } },
      { zone: { kind: "cone", radius: 0, direction: 0 } },
      { zone: { kind: "cone", radius: 100, direction: 0, aperture: 90 } },
      { zone: { kind: "circle", radius: Infinity } },
      { position: { x: NaN, y: 0 } }, { speed: 0 }, { opacity: 2 },
      { seed: -1 }, { seed: 1.5 }, { clockOriginMs: -1 }, { clockOffsetSeconds: Infinity }
    ]) {
      expect(() => parseSceneDocument({ ...createDefaultScene(), effects: [{ ...cone, ...patch }] })).toThrow();
    }
    const normalized = parseSceneDocument({ ...createDefaultScene(), effects: [{ ...cone, zone: { kind: "cone", radius: 100, direction: -90 } }] });
    expect(normalized.effects[0]?.kind === "lightning" && normalized.effects[0].zone).toEqual({ kind: "cone", radius: 100, direction: 270 });
  });
});
