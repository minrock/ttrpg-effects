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
