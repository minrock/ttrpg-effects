import { describe, expect, it } from "vitest";
import { createDefaultSceneMap, createEmptyScene, syncRuntimeFieldsFromActiveMap } from "../sessions/scene-maps";
import type { MapSceneLinkMarker } from "./scene-navigation-links";
import {
  connectInternalSceneLink,
  disconnectInternalSceneLink,
  listInternalSceneLinkCandidateMaps
} from "./internal-scene-links";

describe("internal scene links", () => {
  it("lists markers from loaded maps excluding the active map", () => {
    const scene = testScene();

    expect(listInternalSceneLinkCandidateMaps(scene, "map-1")).toEqual([
      {
        id: "map-2",
        name: "Cripta",
        markers: [{ id: "scene-link-b", name: "Entrada", available: true }]
      }
    ]);
  });

  it("connects two markers inside the same scene by map id", () => {
    const connected = connectInternalSceneLink(testScene(), {
      sourceMapId: "map-1",
      sourceMarkerId: "scene-link-a",
      targetMapId: "map-2",
      targetMarkerId: "scene-link-b",
      scenePath: "/tmp/current.ttrpgscene",
      connectionId: "connection-1"
    });

    expect(connected.mapAnnotations.sceneLinks[0]?.connection?.peer).toEqual({
      scenePath: "/tmp/current.ttrpgscene",
      markerId: "scene-link-b",
      mapId: "map-2"
    });
    expect(connected.maps[1]?.mapAnnotations.sceneLinks[0]?.connection?.peer).toEqual({
      scenePath: "/tmp/current.ttrpgscene",
      markerId: "scene-link-a",
      mapId: "map-1"
    });
  });

  it("disconnects both sides of an internal link", () => {
    const connected = connectInternalSceneLink(testScene(), {
      sourceMapId: "map-1",
      sourceMarkerId: "scene-link-a",
      targetMapId: "map-2",
      targetMarkerId: "scene-link-b",
      scenePath: "/tmp/current.ttrpgscene",
      connectionId: "connection-1"
    });

    const disconnected = disconnectInternalSceneLink(connected, "map-1", "scene-link-a");

    expect(disconnected.mapAnnotations.sceneLinks[0]?.connection).toBeNull();
    expect(disconnected.maps[1]?.mapAnnotations.sceneLinks[0]?.connection).toBeNull();
  });
});

function testScene() {
  return syncRuntimeFieldsFromActiveMap({
    ...createEmptyScene(),
    activeMapId: "map-1",
    maps: [
      createDefaultSceneMap({
        id: "map-1",
        name: "Entrada",
        mapAnnotations: { pins: [], areas: [], sceneLinks: [marker("scene-link-a", "Salida")] }
      }),
      createDefaultSceneMap({
        id: "map-2",
        name: "Cripta",
        mapAnnotations: { pins: [], areas: [], sceneLinks: [marker("scene-link-b", "Entrada")] }
      })
    ]
  });
}

function marker(id: string, name: string): MapSceneLinkMarker {
  return {
    id,
    kind: "scene-link",
    position: { x: 0, y: 0 },
    name,
    locked: false,
    connection: null
  };
}
