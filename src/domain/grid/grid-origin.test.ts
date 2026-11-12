import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import { parseSceneDocument, parseSceneJson, serializeSceneDocument } from "../sessions/scene-schema";
import { snapWorldPoint, snapWorldPointToCellCenter, measureDistance } from "../measurement/measurement";
import { getGridCellAtPoint, getGridCellsInBrush, getGridCellCenter } from "./grid-cell";
import { calibrateGrid } from "./grid-calibration";
import { addSceneMap, createDefaultSceneMap, createEmptyScene, setActiveSceneMap, syncActiveMapFromRuntimeFields } from "../sessions/scene-maps";
import { snapTokenToGrid } from "../tokens/tokens";
import { matchesPublishedDrawingFrame } from "../player/shared-drawing-frame";
const base = createDefaultScene();
const grid = { ...base.grid, cellSizeWorld: 100, origin: { x: 23, y: -17 } };

describe("origen persistente de grilla", () => {
  it("alinea casillas, centros, tokens y pintura cuadrada", () => {
    const point = { x: 27, y: -10 };
    expect(getGridCellAtPoint(point, grid)).toEqual({ x: 23, y: -17, size: 100 });
    expect(snapWorldPoint(point, grid)).toEqual(grid.origin);
    expect(snapWorldPointToCellCenter(point, grid)).toEqual({ x: 73, y: 33 });
    expect(snapTokenToGrid(point, grid, 1)).toEqual({ x: 73, y: 33 });
    expect(getGridCellsInBrush({ x: 73, y: 33 }, 1, grid)).toEqual([{ x: 23, y: -17, size: 100 }]);
    expect(getGridCellAtPoint({ x: 22, y: -18 }, grid)).toEqual({ x: -77, y: -117, size: 100 });
  });

  it("traslada hexágonos, snap y medición sin aplicar el origen dos veces", () => {
    const hex = { ...grid, layout: "hexagonal" as const };
    const point = { x: 25, y: -16 };
    for (const center of [getGridCellCenter(getGridCellAtPoint(point, hex)), snapWorldPointToCellCenter(point, hex)]) {
      expect(center.x).toBeCloseTo(hex.origin.x);
      expect(center.y).toBeCloseTo(hex.origin.y);
    }
    const vertex = snapWorldPoint(point, hex);
    expect(snapWorldPoint(vertex, hex)).toEqual(vertex);
    expect(getGridCellsInBrush(hex.origin, 1, hex)).toHaveLength(1);
    expect(measureDistance(hex.origin, { x: 123, y: -17 }, { grid: hex, diagonalMode: "euclidean" }).cells).toBe(1);
  });

  it("conserva el ancla al redimensionar una celda cuadrada y hexagonal", () => {
    const anchor = { x: 170, y: -200 };
    expect(calibrateGrid(grid, anchor, 150)).toMatchObject({ origin: anchor, cellSizeWorld: 150 });
    const hex = calibrateGrid({ ...grid, layout: "hexagonal" }, anchor, 150);
    const cell = getGridCellAtPoint(hex.origin!, hex);
    expect(cell.x).toBeCloseTo(anchor.x); expect(cell.y).toBeCloseTo(anchor.y);
  });

  it("guarda y recupera la posición sin migrar escenas antiguas", () => {
    const scene = { ...base, grid };
    expect(parseSceneJson(serializeSceneDocument(scene)).grid.origin).toEqual(grid.origin);
    expect(parseSceneDocument(base).grid.origin).toBeUndefined();
    expect(() => parseSceneDocument({ ...base, grid: { ...grid, origin: { x: NaN, y: 0 } } })).toThrow();
  });

  it("mantiene orígenes independientes al guardar y alternar mapas", () => {
    let scene = addSceneMap(addSceneMap(createEmptyScene(), createDefaultSceneMap({ id: "uno" })), createDefaultSceneMap({ id: "dos" }));
    scene = syncActiveMapFromRuntimeFields({ ...scene, grid });
    scene = setActiveSceneMap(scene, "uno");
    expect(scene.grid.origin).toBeUndefined();
    scene = syncActiveMapFromRuntimeFields({ ...scene, grid: { ...scene.grid, origin: { x: -40, y: 80 } } });
    const restored = parseSceneJson(serializeSceneDocument(scene));
    expect(restored.grid.origin).toEqual({ x: -40, y: 80 });
    expect(setActiveSceneMap(restored, "dos").grid.origin).toEqual(grid.origin);
  });

  it("impide dibujar contra una publicación con una alineación distinta", () => {
    expect(matchesPublishedDrawingFrame({ ...base, grid }, base, base.id)).toBe(false);
    expect(matchesPublishedDrawingFrame({ ...base, grid }, { ...base, grid }, base.id)).toBe(true);
  });
});
