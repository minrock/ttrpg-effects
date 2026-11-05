import { expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import { publicTableProjection } from "../../application/services/public-table-projection";
import { matchesPublishedDrawingFrame } from "./shared-drawing-frame";
it("la proyección pública usa otro id: compara origen y marco, permite cámaras/imagen/aspecto distintos", () => {
  const local = createDefaultScene();
  const published = publicTableProjection({ scene: local, camera: { center: { x: 500, y: 500 }, zoom: 2 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false }).snapshot.scene;
  expect(matchesPublishedDrawingFrame(local, published, local.id)).toBe(true);
  expect(matchesPublishedDrawingFrame({ ...local, grid: { ...local.grid, opacity: 0.1 }, map: { ...local.map, imagePath: "otra-imagen" } }, published, local.id)).toBe(true);
  expect(matchesPublishedDrawingFrame({ ...local, id: "escena-privada" }, published, local.id)).toBe(false);
  expect(matchesPublishedDrawingFrame({ ...local, map: { ...local.map, scale: 2 } }, published, local.id)).toBe(false);
  expect(matchesPublishedDrawingFrame({ ...local, grid: { ...local.grid, unit: "m" } }, published, local.id)).toBe(false);
});
