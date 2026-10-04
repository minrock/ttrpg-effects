import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import { createLightningEffect } from "../effects/lightning";
import { createPlayerSceneSnapshot } from "./player-window";
import { sanitizePlayerWindowSnapshot } from "./player-window-snapshot";

const lightning = createLightningEffect("l", "circle", { x: 0, y: 0 }, { x: 400, y: 0 }, 1000);
const snapshot = { scene: createPlayerSceneSnapshot({ ...createDefaultScene(), effects: [lightning] }),
  mapImageUrl: null, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 1 }, showDmFogOverlay: false };

describe("player snapshot IPC boundary", () => {
  it("keeps validated geometry, shared guide and animation clock", () => {
    expect(sanitizePlayerWindowSnapshot(snapshot)?.scene.effects).toEqual([lightning]);
    expect(sanitizePlayerWindowSnapshot({ ...snapshot, scene: createDefaultScene() })).not.toBeNull();
  });
  it("rejects malformed scenes, clocks, camera and payloads before publishing", () => {
    for (const value of [null, {}, { ...snapshot, camera: { center: { x: Infinity, y: 0 }, zoom: 1 } },
      { ...snapshot, scene: { ...snapshot.scene, effects: [{ ...lightning, clockOriginMs: -1 }] } },
      { ...snapshot, scene: { ...snapshot.scene, effects: [{ ...lightning, zone: { kind: "circle", radius: 0 } }] } }]) {
      expect(sanitizePlayerWindowSnapshot(value)).toBeNull();
    }
  });
});
