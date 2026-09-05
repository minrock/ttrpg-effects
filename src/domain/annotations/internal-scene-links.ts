import type { MapAnnotations } from "./map-annotations";
import type { MapSceneLinkMarker, SceneLinkConnection } from "./scene-navigation-links";
import { createSceneLinkEndpoint } from "./scene-navigation-links";
import type { SceneDocument, SceneMapDocument } from "../sessions/scene-document";
import { setActiveSceneMap, syncActiveMapFromRuntimeFields, syncRuntimeFieldsFromActiveMap } from "../sessions/scene-maps";

export interface InternalSceneLinkCandidateMap {
  readonly id: string;
  readonly name: string;
  readonly markers: readonly {
    readonly id: string;
    readonly name: string;
    readonly available: boolean;
  }[];
}

export interface ConnectInternalSceneLinkRequest {
  readonly sourceMapId: string;
  readonly sourceMarkerId: string;
  readonly targetMapId: string;
  readonly targetMarkerId: string;
  readonly scenePath: string;
  readonly connectionId: string;
}

export function listInternalSceneLinkCandidateMaps(
  scene: SceneDocument,
  activeMapId: string | null
): readonly InternalSceneLinkCandidateMap[] {
  const syncedScene = syncActiveMapFromRuntimeFields(scene);
  return syncedScene.maps
    .filter((map) => map.id !== activeMapId)
    .map((map) => ({
      id: map.id,
      name: map.name,
      markers: map.mapAnnotations.sceneLinks.map((marker) => ({
        id: marker.id,
        name: marker.name,
        available: marker.connection === null
      }))
    }));
}

export function connectInternalSceneLink(
  scene: SceneDocument,
  request: ConnectInternalSceneLinkRequest
): SceneDocument {
  if (request.sourceMapId === request.targetMapId) {
    throw new Error("La conexion debe apuntar a otro mapa.");
  }

  const syncedScene = syncActiveMapFromRuntimeFields(scene);
  const sourceMap = findMap(syncedScene, request.sourceMapId);
  const targetMap = findMap(syncedScene, request.targetMapId);
  const sourceMarker = findMarker(sourceMap, request.sourceMarkerId);
  const targetMarker = findMarker(targetMap, request.targetMarkerId);

  if (sourceMarker.locked || targetMarker.locked) {
    throw new Error("No se puede conectar un marcador bloqueado.");
  }
  if (targetMarker.connection !== null && targetMarker.connection.peer.markerId !== sourceMarker.id) {
    throw new Error("El marcador destino ya pertenece a otra conexion.");
  }

  const disconnected = disconnectExistingInternalPeer(syncedScene, sourceMarker);
  const origin = createSceneLinkEndpoint(request.scenePath, sourceMarker.id, sourceMap.id);
  const destination = createSceneLinkEndpoint(request.scenePath, targetMarker.id, targetMap.id);
  const sourceConnection: SceneLinkConnection = {
    connectionId: request.connectionId,
    role: "origin",
    origin,
    destination,
    peer: destination
  };
  const targetConnection: SceneLinkConnection = {
    connectionId: request.connectionId,
    role: "destination",
    origin,
    destination,
    peer: origin
  };

  return syncRuntimeFieldsFromActiveMap({
    ...disconnected,
    maps: disconnected.maps.map((map) => {
      if (map.id === sourceMap.id) {
        return replaceMapMarker(map, { ...sourceMarker, connection: sourceConnection });
      }
      if (map.id === targetMap.id) {
        return replaceMapMarker(map, { ...targetMarker, connection: targetConnection });
      }
      return map;
    })
  });
}

export function disconnectInternalSceneLink(
  scene: SceneDocument,
  mapId: string,
  markerId: string
): SceneDocument {
  const syncedScene = syncActiveMapFromRuntimeFields(scene);
  const sourceMap = findMap(syncedScene, mapId);
  const sourceMarker = findMarker(sourceMap, markerId);
  const peer = sourceMarker.connection?.peer ?? null;
  const peerMapId = peer?.mapId;

  return syncRuntimeFieldsFromActiveMap({
    ...syncedScene,
    maps: syncedScene.maps.map((map) => {
      if (map.id === mapId) return replaceMapMarker(map, { ...sourceMarker, connection: null });
      if (peer !== null && peerMapId !== undefined && map.id === peerMapId) {
        return replaceMarkerById(map, peer.markerId, (marker) =>
          marker.connection?.connectionId === sourceMarker.connection?.connectionId
            ? { ...marker, connection: null }
            : marker
        );
      }
      return map;
    })
  });
}

export function replaceActiveMapAnnotations(scene: SceneDocument, annotations: MapAnnotations): SceneDocument {
  const activeMapId = scene.activeMapId;
  if (activeMapId === null) return { ...scene, mapAnnotations: annotations };
  return setActiveSceneMap({
    ...syncActiveMapFromRuntimeFields(scene),
    maps: scene.maps.map((map) => map.id === activeMapId ? { ...map, mapAnnotations: annotations } : map)
  }, activeMapId);
}

function disconnectExistingInternalPeer(scene: SceneDocument, marker: MapSceneLinkMarker): SceneDocument {
  const peer = marker.connection?.peer;
  if (peer?.mapId === undefined) return scene;
  return disconnectInternalSceneLink(scene, peer.mapId, peer.markerId);
}

function findMap(scene: SceneDocument, mapId: string): SceneMapDocument {
  const map = scene.maps.find((candidate) => candidate.id === mapId);
  if (map === undefined) throw new Error("El mapa de conexion ya no existe.");
  return map;
}

function findMarker(map: SceneMapDocument, markerId: string): MapSceneLinkMarker {
  const marker = map.mapAnnotations.sceneLinks.find((candidate) => candidate.id === markerId);
  if (marker === undefined) throw new Error("El punto de conexion ya no existe.");
  return marker;
}

function replaceMapMarker(map: SceneMapDocument, marker: MapSceneLinkMarker): SceneMapDocument {
  return replaceMarkerById(map, marker.id, () => marker);
}

function replaceMarkerById(
  map: SceneMapDocument,
  markerId: string,
  replace: (marker: MapSceneLinkMarker) => MapSceneLinkMarker
): SceneMapDocument {
  return {
    ...map,
    mapAnnotations: {
      ...map.mapAnnotations,
      sceneLinks: map.mapAnnotations.sceneLinks.map((marker) => marker.id === markerId ? replace(marker) : marker)
    }
  };
}
