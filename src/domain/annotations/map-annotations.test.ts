import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import {
  createDefaultMapAnnotations,
  createInformationAreaHighlightBroadcast,
  canDeleteMapAnnotation,
  canTransformMapAnnotation,
  deduplicateInformationAreaCells,
  getInformationAreaColor,
  getMapAnnotationCenter,
  isInformationAreaHighlightBroadcast,
  rasterizeInformationAreaStroke,
  searchMapAnnotations,
  sanitizeInformationAreaHighlightBroadcast,
  stripPrivateMapAnnotationsForPlayer,
  translateInformationArea,
  type MapInformationArea,
  type MapInformationPin
} from "./map-annotations";

const pin: MapInformationPin = {
  id: "room-pin-1",
  kind: "room-pin",
  position: { x: 25, y: 40 },
  title: "Camara secreta",
  content: "Contiene un altar antiguo.",
  locked: false
};

const area: MapInformationArea = {
  id: "information-area-1",
  kind: "information-area",
  areaType: "trap",
  name: "Foso oculto",
  description: "Salvacion de **Destreza**.",
  cells: [
    { x: 0, y: 0, size: 100 },
    { x: 100, y: 0, size: 100 }
  ],
  locked: false
};

describe("map annotations", () => {
  it("creates isolated empty defaults", () => {
    const first = createDefaultMapAnnotations();
    const second = createDefaultMapAnnotations();
    expect(first).toEqual({ pins: [], areas: [] });
    expect(first).not.toBe(second);
  });

  it("deduplicates and rasterizes continuous cells", () => {
    expect(
      deduplicateInformationAreaCells([
        { x: 0, y: 0, size: 100 },
        { x: 0, y: 0, size: 100 },
        { x: 100, y: 0, size: 100 }
      ])
    ).toHaveLength(2);

    const cells = rasterizeInformationAreaStroke(
      [
        { x: 10, y: 10 },
        { x: 290, y: 10 }
      ],
      100
    );
    expect(cells.map((cell) => cell.x)).toEqual([0, 100, 200]);
  });

  it("translates an area and calculates centers", () => {
    expect(getMapAnnotationCenter(pin)).toEqual({ x: 25, y: 40 });
    expect(getMapAnnotationCenter(area)).toEqual({ x: 100, y: 50 });
    expect(translateInformationArea(area, { x: 20, y: -10 }).cells).toEqual([
      { x: 20, y: -10, size: 100 },
      { x: 120, y: -10, size: 100 }
    ]);
  });

  it("searches names, categories and markdown without accents", () => {
    const annotations = { pins: [pin], areas: [area] };
    expect(searchMapAnnotations(annotations, "camara")).toEqual([pin]);
    expect(searchMapAnnotations(annotations, "trampa")).toEqual([area]);
    expect(searchMapAnnotations(annotations, "destreza")).toEqual([area]);
  });

  it("creates minimal valid player highlights", () => {
    const highlight = createInformationAreaHighlightBroadcast(area, "highlight-1");
    expect(highlight).toEqual({
      id: "highlight-1",
      areaId: area.id,
      areaType: "trap",
      cells: area.cells,
      durationMs: 5_000
    });
    expect(isInformationAreaHighlightBroadcast(highlight)).toBe(true);
    expect(isInformationAreaHighlightBroadcast({ ...highlight, description: area.description })).toBe(true);
    expect(sanitizeInformationAreaHighlightBroadcast({ ...highlight, description: area.description })).toEqual(highlight);
    expect(isInformationAreaHighlightBroadcast({ ...highlight, durationMs: 10 })).toBe(false);
  });

  it("removes all private annotations from the player scene", () => {
    const scene = {
      ...createDefaultScene(),
      mapAnnotations: { pins: [pin], areas: [area] }
    };
    expect(stripPrivateMapAnnotationsForPlayer(scene).mapAnnotations).toEqual({ pins: [], areas: [] });
  });

  it("uses stable semantic colors", () => {
    expect(getInformationAreaColor("terrain")).toBe("#6b7d32");
    expect(getInformationAreaColor("trap")).toBe("#b3262e");
  });

  it("blocks movement and deletion only while an annotation is locked", () => {
    expect(canTransformMapAnnotation(pin)).toBe(true);
    expect(canDeleteMapAnnotation(pin)).toBe(true);
    expect(canTransformMapAnnotation({ ...pin, locked: true })).toBe(false);
    expect(canDeleteMapAnnotation({ ...area, locked: true })).toBe(false);
  });
});
