import type { SceneDocument, SceneMapDocument } from "./scene-document";
import { createDefaultSceneMap, createSceneWithMap } from "./scene-maps";

export function createDefaultScene(): SceneDocument {
  return createSceneWithMap(createDefaultSceneMap());
}

export function createDefaultSceneMapDocument(input?: Parameters<typeof createDefaultSceneMap>[0]): SceneMapDocument {
  return createDefaultSceneMap(input);
}
