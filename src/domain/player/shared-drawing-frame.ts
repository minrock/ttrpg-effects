import type { SceneDocument } from "../sessions/scene-document";
/** Identidad y reglas de la publicación; cámaras y aspecto de grilla son locales. */
export function matchesPublishedDrawingFrame(local: SceneDocument, published: SceneDocument, sourceSceneId: string | null): boolean {
  if (local.id !== sourceSceneId || local.activeMapId !== published.activeMapId) return false;
  const frame = (scene: SceneDocument) => [scene.map.position.x, scene.map.position.y, scene.map.scale,
    scene.grid.cellSizeWorld, scene.grid.layout, scene.grid.unit, scene.grid.distancePerCell, scene.grid.metricDistancePerCell,
    scene.settings.diagonalMode, scene.settings.snapToGrid, scene.compassOrientation];
  const expected = frame(published); return frame(local).every((value, i) => value === expected[i]);
}
