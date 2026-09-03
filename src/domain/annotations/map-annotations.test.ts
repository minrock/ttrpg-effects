import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import { getGridCellAtPoint, getGridCellKey, getGridCellNeighbors } from "../grid/grid-cell";
import {
  createDefaultMapAnnotations,
  createInformationAreaHighlightBroadcast,
  canDeleteMapAnnotation,
  removeInformationArea,
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
  it("paints connected hex cells and preserves topology through moving and player highlights", () => {
    const grid = { cellSizeWorld: 100, layout: "hexagonal" as const };
    const cells = rasterizeInformationAreaStroke([{ x: -201, y: -10 }, { x: 251, y: 80 }], grid);
    expect(cells.length).toBeGreaterThan(4);
    expect(cells.every(cell => cell.layout === "hexagonal")).toBe(true);
    expect(getGridCellKey(cells[0])).toBe(getGridCellKey(getGridCellAtPoint({ x: -201, y: -10 }, grid)));
    expect(getGridCellKey(cells[cells.length - 1])).toBe(getGridCellKey(getGridCellAtPoint({ x: 251, y: 80 }, grid)));
    for (let i = 1; i < cells.length; i++) {
      expect(getGridCellNeighbors(cells[i - 1]).map(getGridCellKey)).toContain(getGridCellKey(cells[i]));
    }
    const moved = translateInformationArea({ ...area, cells }, { x: 17, y: -35 });
    expect(moved.cells[0]).toEqual({ ...cells[0], x: cells[0].x + 17, y: cells[0].y - 35 });
    const highlight = createInformationAreaHighlightBroadcast(moved, "hex-highlight");
    expect(sanitizeInformationAreaHighlightBroadcast(highlight)).toEqual(highlight);
    expect(sanitizeInformationAreaHighlightBroadcast({ ...highlight, cells: [{ ...cells[0], layout: "invalid" }] })).toBeNull();
  });

  it("creates isolated empty defaults", () => {
    const first = createDefaultMapAnnotations();
    const second = createDefaultMapAnnotations();
    expect(first).toEqual({ pins: [], areas: [], sceneLinks: [] });
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
    const annotations = { pins: [pin], areas: [area], sceneLinks: [] };
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
      mapAnnotations: { pins: [pin], areas: [area], sceneLinks: [] }
    };
    expect(stripPrivateMapAnnotationsForPlayer(scene).mapAnnotations).toEqual({ pins: [], areas: [], sceneLinks: [] });
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

  it("deletes only the requested area, preserving other scene collections", () => {
    const scene = createDefaultScene();
    const hexArea = { ...area, id: "hex-area", cells: [getGridCellAtPoint({ x: 0, y: 0 }, { cellSizeWorld: 100, layout: "hexagonal" })] };
    const current = { ...scene, mapAnnotations: { ...scene.mapAnnotations, pins: [pin], areas: [area, hexArea] } };
    const removed = removeInformationArea(current, hexArea.id);
    expect(removed.mapAnnotations.areas).toEqual([area]);
    expect(current.mapAnnotations.areas).toHaveLength(2);
    expect(removed.mapAnnotations.pins).toBe(current.mapAnnotations.pins);
    expect(removed.mapAnnotations.sceneLinks).toBe(current.mapAnnotations.sceneLinks);
    expect(removed.effects).toBe(current.effects);
    expect(removed.shapes).toBe(current.shapes);
    expect(removed.lights).toBe(current.lights);
    expect(removed.tokens).toBe(current.tokens);
    expect(removeInformationArea(removed, area.id).mapAnnotations.areas).toEqual([]);
  });

  it("does not delete locked or missing areas", () => {
    const scene = createDefaultScene();
    const current = { ...scene, mapAnnotations: { ...scene.mapAnnotations, areas: [{ ...area, locked: true }] } };
    expect(removeInformationArea(current, area.id)).toBe(current);
    expect(removeInformationArea(current, "missing")).toBe(current);
  });
});
