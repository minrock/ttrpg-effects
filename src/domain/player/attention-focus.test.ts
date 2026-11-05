import { describe, expect, it } from "vitest";
import { attentionFocusRequestSchema, focusCamera, localEntryCamera } from "./attention-focus";
import { createDefaultScene } from "../sessions/default-scene";
import type { PlayerWindowSnapshot } from "./player-window";
const snapshot = (): PlayerWindowSnapshot => ({ scene: createDefaultScene(), camera: { center: { x: 900, y: 700 }, zoom: 3 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false });
describe("cámara propia y foco", () => {
  it.each([.1, .5, 1.5, 4])("conserva el zoom %s y no muta la cámara", zoom => {
    const camera = { center: { x: 20, y: -30 }, zoom };
    expect(focusCamera(camera, { x: -123.45, y: 789.12 })).toEqual({ center: { x: -123.45, y: 789.12 }, zoom });
    expect(camera.center).toEqual({ x: 20, y: -30 });
  });
  it("inicia sin imagen en origen y no hereda la cámara DM", () => expect(localEntryCamera(snapshot(), { width: 400, height: 600 })).toEqual({ center: { x: 0, y: 0 }, zoom: 1 }));
  it.each([0, 90, 180, 270] as const)("ajusta el mapa al área útil con norte %s", compassOrientation => {
    const initial = snapshot();
    const value = { ...initial, mapImageUrl: "map.png", scene: { ...initial.scene, compassOrientation, map: { ...initial.scene.map, imagePath: "map.png", position: { x: 50, y: 60 }, scale: 2, imageSize: { width: 1000, height: 500 } } } };
    const fitted = localEntryCamera(value, { width: 600, height: 400 });
    expect(fitted.center).toEqual({ x: 50, y: 60 }); expect(fitted.zoom).toBeCloseTo(compassOrientation % 180 ? .18 : .27);
    expect(localEntryCamera({ ...value, playerEntryPoint: { x: 23, y: 45 } }, { width: 390, height: 600 }, { center: { x: 0, y: 0 }, zoom: 1.5 })).toEqual({ center: { x: 23, y: 45 }, zoom: 1.5 });
  });
  it("rechaza zoom, coordenadas no finitas y destinos fuera del contrato", () => {
    const request = { requestId: crypto.randomUUID(), sceneId: "", frame: "[]", position: { x: 1, y: 2 } };
    expect(attentionFocusRequestSchema.safeParse(request).success).toBe(true);
    for (const invalid of [{ ...request, zoom: 2 }, { ...request, recipients: ["guest"] }, { ...request, position: { x: Infinity, y: 0 } }, { ...request, position: { x: 1e9, y: 0 } }]) expect(attentionFocusRequestSchema.safeParse(invalid).success).toBe(false);
  });
});
