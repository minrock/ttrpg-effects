import { describe, expect, it } from "vitest";
import { createEmptyScene, createDefaultSceneMap, syncRuntimeFieldsFromActiveMap } from "../sessions/scene-maps";
import type { MapSceneLinkMarker } from "./scene-navigation-links";
import { resolveInternalSceneLinkNavigationTarget } from "./internal-scene-link-navigation";

describe("internal scene link navigation", () => {
  it("moves the player camera to the reciprocal marker on the destination map", () => {
    const origin = marker("scene-link-origin", "Salida", 10, 20, "map-2", "scene-link-destination");
    const destination = marker("scene-link-destination", "Entrada", 320, -140, "map-1", "scene-link-origin");
    const scene = syncRuntimeFieldsFromActiveMap({
      ...createEmptyScene(),
      activeMapId: "map-1",
      maps: [
        createDefaultSceneMap({
          id: "map-1",
          name: "Entrada",
          mapAnnotations: { pins: [], areas: [], sceneLinks: [origin] }
        }),
        createDefaultSceneMap({
          id: "map-2",
          name: "Cripta",
          camera: { x: 1000, y: 1000, zoom: 0.75 },
          mapAnnotations: { pins: [], areas: [], sceneLinks: [destination] }
        })
      ]
    });

    const target = resolveInternalSceneLinkNavigationTarget(scene, origin);

    expect(target).toMatchObject({
      mapId: "map-2",
      mapName: "Cripta",
      marker: destination,
      camera: {
        center: { x: 320, y: -140 },
        zoom: 0.75
      }
    });
  });
});

function marker(
  id: string,
  name: string,
  x: number,
  y: number,
  peerMapId: string,
  peerMarkerId: string
): MapSceneLinkMarker {
  return {
    id,
    kind: "scene-link",
    position: { x, y },
    name,
    locked: false,
    connection: {
      connectionId: "connection-1",
      role: "origin",
      origin: { scenePath: "/tmp/a.ttrpgscene", markerId: id },
      destination: { scenePath: "/tmp/a.ttrpgscene", markerId: peerMarkerId, mapId: peerMapId },
      peer: { scenePath: "/tmp/a.ttrpgscene", markerId: peerMarkerId, mapId: peerMapId }
    }
  };
}
