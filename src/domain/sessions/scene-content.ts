import { createDefaultScene } from "./default-scene";
import type { AnySceneDocument } from "./scene-document";
import { migrateSceneDocument, syncActiveMapFromRuntimeFields } from "./scene-maps";

export function hasSceneContent(
  scene: AnySceneDocument,
  tacticalElementsCount = 0
): boolean {
  const syncedScene = syncActiveMapFromRuntimeFields(migrateSceneDocument(scene));
  const defaultScene = createDefaultScene();

  return (
    syncedScene.map.imagePath !== null ||
    syncedScene.lights.length > 0 ||
    syncedScene.effects.length > 0 ||
    syncedScene.shapes.length > 0 ||
    syncedScene.tokens.length > 0 ||
    syncedScene.labels.length > 0 ||
    syncedScene.mapAnnotations.pins.length > 0 ||
    syncedScene.mapAnnotations.areas.length > 0 ||
    syncedScene.mapAnnotations.sceneLinks.length > 0 ||
    syncedScene.combatTracker.active ||
    tacticalElementsCount > 0 ||
    syncedScene.fogOfWar.revealedAreas.length > 0 ||
    syncedScene.fogOfWar.obstacles.length > 0 ||
    !isSameValue(syncedScene.grid, defaultScene.grid) ||
    !isSameValue(syncedScene.darkness, defaultScene.darkness) ||
    !isSameValue(syncedScene.fogOfWar, defaultScene.fogOfWar) ||
    !isSameValue(syncedScene.settings, defaultScene.settings)
  );
}

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
