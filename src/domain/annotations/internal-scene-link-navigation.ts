import type { SceneDocument } from "../sessions/scene-document";
import type { ViewportCameraSnapshot } from "../player/player-window";
import { normalizeCameraSnapshot } from "../player/player-window";
import type { MapSceneLinkMarker } from "./scene-navigation-links";

export interface InternalSceneLinkNavigationTarget {
  readonly mapId: string;
  readonly mapName: string;
  readonly marker: MapSceneLinkMarker;
  readonly camera: ViewportCameraSnapshot;
}

export function resolveInternalSceneLinkNavigationTarget(
  scene: SceneDocument,
  sourceMarker: MapSceneLinkMarker
): InternalSceneLinkNavigationTarget | null {
  const peer = sourceMarker.connection?.peer;
  if (peer?.mapId === undefined) return null;

  const targetMap = scene.maps.find((map) => map.id === peer.mapId);
  const targetMarker = targetMap?.mapAnnotations.sceneLinks.find((marker) => marker.id === peer.markerId);
  if (targetMap === undefined || targetMarker === undefined) return null;

  return {
    mapId: targetMap.id,
    mapName: targetMap.name,
    marker: targetMarker,
    camera: normalizeCameraSnapshot({
      center: targetMarker.position,
      zoom: targetMap.camera.zoom
    })
  };
}

/** Los destinos internos se validan contra la edición actual, incluso antes de guardar. */
export function validateInternalSceneLink(scene:SceneDocument, marker:MapSceneLinkMarker):import('./scene-navigation-links').SceneLinkValidationStatus {
  if(!marker.connection)return {state:'unlinked'};
  const target=resolveInternalSceneLinkNavigationTarget(scene,marker);
  if(!target)return {state:'broken',reason:'marker-missing',message:'El mapa o punto de destino ya no existe en esta escena.'};
  const reciprocal=target.marker.connection;
  if(!reciprocal || reciprocal.connectionId!==marker.connection.connectionId ||
    reciprocal.peer.mapId!==scene.activeMapId || reciprocal.peer.markerId!==marker.id){
    return {state:'broken',reason:'connection-mismatch',message:'El punto de destino ya no mantiene una conexión recíproca.'};
  }
  return {state:'valid'};
}
