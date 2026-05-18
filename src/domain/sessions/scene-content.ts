import { createDefaultScene } from "./default-scene";
import type { SceneDocument } from "./scene-document";

export function hasSceneContent(
  scene: SceneDocument,
  tacticalElementsCount = 0
): boolean {
  const defaultScene = createDefaultScene();

  return (
    scene.map.imagePath !== null ||
    scene.lights.length > 0 ||
    scene.effects.length > 0 ||
    scene.shapes.length > 0 ||
    tacticalElementsCount > 0 ||
    scene.fogOfWar.revealedAreas.length > 0 ||
    scene.fogOfWar.obstacles.length > 0 ||
    !isSameValue(scene.grid, defaultScene.grid) ||
    !isSameValue(scene.darkness, defaultScene.darkness) ||
    !isSameValue(scene.fogOfWar, defaultScene.fogOfWar) ||
    !isSameValue(scene.settings, defaultScene.settings)
  );
}

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
