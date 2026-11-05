// @vitest-environment jsdom
import { expect, it } from "vitest";
import { areaPatternCells, drawAreaPattern } from "./area-pattern";
import type { SceneShape } from "../../domain/sessions/scene-document";
const shape: SceneShape = { id: "a", type: "cone", radius: 200, angle: 60, direction: 45, points: [{ x: 0, y: 0 }], emoji: "❄️", areaPattern: "checkerboard" };
it("damero regular anclado al mundo y presupuesto previo para áreas extremas", () => {
  const cells = areaPatternCells(shape, 100, 256);
  expect(cells.every(c => c.x % 100 === 0 && c.y % 100 === 0 && c.size === 100)).toBe(true);
  expect(areaPatternCells({ ...shape, radius: 1e9 }, .01, 256).length).toBeLessThanOrEqual(256);
  expect(areaPatternCells(shape, 100, 0)).toEqual([]);
  const moved = areaPatternCells({ ...shape, points: [{ x: 20, y: 20 }] }, 100, 256);
  expect(moved.find(c => c.x === 0 && c.y === 0)).toEqual(cells.find(c => c.x === 0 && c.y === 0));
});
it("recorta celdas y emojis mediante máscara y libera la representación", () => {
  const drawing = drawAreaPattern(shape, 100, 20);
  expect(drawing.mask).toBeTruthy(); expect(drawing.children.length).toBeLessThanOrEqual(22);
  drawing.destroy({ children: true }); expect(drawing.destroyed).toBe(true);
});
