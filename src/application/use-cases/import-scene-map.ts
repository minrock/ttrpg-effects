import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneDocument, SceneMapDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import type { SceneLinkEndpointReference } from "../../domain/annotations/scene-navigation-links";
import {
  getNextSceneMapId,
  getNextSceneMapName,
  setActiveSceneMap,
  syncActiveMapFromRuntimeFields
} from "../../domain/sessions/scene-maps";
import type { SceneAside } from "../../domain/sessions/scene-aside";
import { loadLinkedLegacySceneGraph } from "./linked-legacy-scenes";

export async function importSceneMapUseCase(
  storage: SceneFileStorage,
  currentScene: SceneDocument
): Promise<SceneOperationResult> {
  if (storage.selectSceneJsonPath === undefined || storage.loadSceneJsonFromPath === undefined) {
    return { ok: false, error: "La importacion de escenas no esta disponible." };
  }

  const filePath = await storage.selectSceneJsonPath();
  if (filePath === null) return { ok: false, error: "Importacion cancelada." };

  try {
    const loaded = await storage.loadSceneJsonFromPath(filePath);
    const imported = await loadLinkedLegacySceneGraph(storage, loaded);
    if (imported.scene.maps.length === 0 || imported.scene.maps.every((map) => map.map.imagePath === null)) {
      return { ok: false, error: "El archivo importado no contiene un mapa valido." };
    }

    const baseScene = syncActiveMapFromRuntimeFields(currentScene);
    const idMap = new Map<string, string>();
    let sceneWithMaps = {
      ...baseScene,
      sceneAside: mergeSceneAside(baseScene.sceneAside, imported.scene.sceneAside)
    };

    for (const sourceMap of imported.scene.maps) {
      const nextId = getNextSceneMapId(sceneWithMaps);
      idMap.set(sourceMap.id, nextId);
      sceneWithMaps = {
        ...sceneWithMaps,
        maps: [
          ...sceneWithMaps.maps,
          {
            ...sourceMap,
            id: nextId,
            name: getNextSceneMapName(sceneWithMaps)
          }
        ],
        activeMapId: sceneWithMaps.activeMapId ?? nextId
      };
    }

    const importedMapIds = new Set(idMap.values());
    const remappedMaps = sceneWithMaps.maps.map((map) =>
      importedMapIds.has(map.id) ? remapImportedMapInternalLinks(map, idMap) : map
    );
    const firstImportedMapId = idMap.get(imported.scene.maps[0]?.id ?? "");
    const activeScene =
      firstImportedMapId === undefined
        ? sceneWithMaps
        : setActiveSceneMap({ ...sceneWithMaps, maps: remappedMaps }, firstImportedMapId);
    const activeMapImageUrl = imported.mapImageUrls[imported.scene.maps[0]?.id ?? ""];

    return {
      ok: true,
      scene: activeScene,
      filePath,
      mapImageUrl: activeMapImageUrl,
      tokenImageUrls: imported.tokenImageUrls,
      warnings: imported.warnings
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo importar la escena como mapa."
    };
  }
}

function remapImportedMapInternalLinks(
  map: SceneMapDocument,
  idMap: ReadonlyMap<string, string>
): SceneMapDocument {
  return {
    ...map,
    mapAnnotations: {
      ...map.mapAnnotations,
      sceneLinks: map.mapAnnotations.sceneLinks.map((marker) =>
        marker.connection === null
          ? marker
          : {
              ...marker,
              connection: {
                ...marker.connection,
                origin: remapEndpoint(marker.connection.origin, idMap),
                destination: remapEndpoint(marker.connection.destination, idMap),
                peer: remapEndpoint(marker.connection.peer, idMap)
              }
            }
      )
    }
  };
}

function remapEndpoint(
  endpoint: SceneLinkEndpointReference,
  idMap: ReadonlyMap<string, string>
): SceneLinkEndpointReference {
  return endpoint.mapId === undefined
    ? endpoint
    : { ...endpoint, mapId: idMap.get(endpoint.mapId) ?? endpoint.mapId };
}

function mergeSceneAside(base: SceneAside, imported: SceneAside): SceneAside {
  return {
    monsters: mergeById(base.monsters, imported.monsters),
    npcs: mergeById(base.npcs, imported.npcs),
    playerCharacters: mergeById(base.playerCharacters, imported.playerCharacters),
    notes: mergeById(base.notes, imported.notes)
  };
}

function mergeById<T extends { readonly id: string }>(base: readonly T[], imported: readonly T[]): readonly T[] {
  const used = new Set(base.map((item) => item.id));
  const merged = [...base];
  for (const item of imported) {
    if (used.has(item.id)) continue;
    used.add(item.id);
    merged.push(item);
  }
  return merged;
}
