import { describe, expect, it } from "vitest";
import type { SceneFileStorage } from "../services/scene-file-storage";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { parseSceneJson, serializeSceneDocument } from "../../domain/sessions/scene-schema";
import type { MapSceneLinkMarker } from "../../domain/annotations/scene-navigation-links";
import {
  connectSceneLink,
  disconnectSceneLink,
  listSceneLinkCandidates,
  loadSceneLinkTarget,
  validateSceneLinks
} from "./scene-navigation-links";

const pathA = "/scenes/a.ttrpgscene";
const pathB = "/scenes/b.ttrpgscene";
const pathC = "/scenes/c.ttrpgscene";

describe("scene navigation link use cases", () => {
  it("connects, validates, navigates and disconnects reciprocal files", async () => {
    const markerA = marker("scene-link-a", "Salida", 10, 20);
    const markerB = marker("scene-link-b", "Entrada", 300, 400);
    const storage = createStorage([
      [pathA, sceneJson(markerA)],
      [pathB, sceneJson(markerB)]
    ]);

    const candidates = await listSceneLinkCandidates(storage, pathB);
    expect(candidates.ok && candidates.candidate.markers).toEqual([
      { id: markerB.id, name: markerB.name, position: markerB.position, available: true }
    ]);

    const connected = await connectSceneLink(storage, {
      sourceScenePath: pathA,
      sourceMarkerId: markerA.id,
      targetScenePath: pathB,
      targetMarkerId: markerB.id
    });
    expect(connected.ok).toBe(true);

    const sceneA = parseSceneJson(storage.files.get(pathA) ?? "");
    const sceneB = parseSceneJson(storage.files.get(pathB) ?? "");
    expect(sceneA.mapAnnotations.sceneLinks[0]?.connection?.connectionId).toBe(
      sceneB.mapAnnotations.sceneLinks[0]?.connection?.connectionId
    );

    const validation = await validateSceneLinks(storage, {
      scenePath: pathA,
      markers: sceneA.mapAnnotations.sceneLinks
    });
    expect(validation.ok && validation.statuses[markerA.id]).toEqual({ state: "valid" });

    const navigation = await loadSceneLinkTarget(storage, { scenePath: pathA, markerId: markerA.id });
    expect(navigation.ok && navigation.entryPoint).toEqual(markerB.position);
    expect(navigation.ok && navigation.sceneResult.filePath).toBe(pathB);

    const disconnected = await disconnectSceneLink(storage, { scenePath: pathA, markerId: markerA.id });
    expect(disconnected.ok).toBe(true);
    expect(parseSceneJson(storage.files.get(pathA) ?? "").mapAnnotations.sceneLinks[0]?.connection).toBeNull();
    expect(parseSceneJson(storage.files.get(pathB) ?? "").mapAnnotations.sceneLinks[0]?.connection).toBeNull();
  });

  it("reports a missing peer file as broken", async () => {
    const markerA = marker("scene-link-a", "Salida", 10, 20);
    const markerB = marker("scene-link-b", "Entrada", 300, 400);
    const storage = createStorage([
      [pathA, sceneJson(markerA)],
      [pathB, sceneJson(markerB)]
    ]);
    await connectSceneLink(storage, {
      sourceScenePath: pathA,
      sourceMarkerId: markerA.id,
      targetScenePath: pathB,
      targetMarkerId: markerB.id
    });
    storage.files.delete(pathB);
    const sceneA = parseSceneJson(storage.files.get(pathA) ?? "");
    const validation = await validateSceneLinks(storage, {
      scenePath: pathA,
      markers: sceneA.mapAnnotations.sceneLinks
    });
    expect(validation.ok && validation.statuses[markerA.id]).toEqual({
      state: "broken",
      reason: "file-missing",
      message: "El archivo de escena conectado ya no existe."
    });
  });

  it("frees a remote point that still points to the current marker even if its connection metadata is stale", async () => {
    const markerA = marker("scene-link-a", "Salida", 10, 20);
    const markerB = marker("scene-link-b", "Entrada", 300, 400);
    const storage = createStorage([
      [pathA, sceneJson(markerA)],
      [pathB, sceneJson(markerB)]
    ]);
    await connectSceneLink(storage, {
      sourceScenePath: pathA,
      sourceMarkerId: markerA.id,
      targetScenePath: pathB,
      targetMarkerId: markerB.id
    });

    const sceneB = parseSceneJson(storage.files.get(pathB) ?? "");
    const connectedMarkerB = sceneB.mapAnnotations.sceneLinks[0];
    if (connectedMarkerB?.connection === null || connectedMarkerB === undefined) {
      throw new Error("Expected a connected remote marker.");
    }
    storage.files.set(pathB, serializeSceneDocument(replaceMarker(sceneB, {
      ...connectedMarkerB,
      connection: { ...connectedMarkerB.connection, connectionId: "stale-connection-id" }
    })));

    const disconnected = await disconnectSceneLink(storage, { scenePath: pathA, markerId: markerA.id });

    expect(disconnected.ok).toBe(true);
    expect(parseSceneJson(storage.files.get(pathA) ?? "").mapAnnotations.sceneLinks[0]?.connection).toBeNull();
    expect(parseSceneJson(storage.files.get(pathB) ?? "").mapAnnotations.sceneLinks[0]?.connection).toBeNull();
  });

  it("does not free a remote point that was reassigned to another scene", async () => {
    const markerA = marker("scene-link-a", "Salida", 10, 20);
    const markerB = marker("scene-link-b", "Entrada", 300, 400);
    const storage = createStorage([
      [pathA, sceneJson(markerA)],
      [pathB, sceneJson(markerB)]
    ]);
    await connectSceneLink(storage, {
      sourceScenePath: pathA,
      sourceMarkerId: markerA.id,
      targetScenePath: pathB,
      targetMarkerId: markerB.id
    });

    const sceneB = parseSceneJson(storage.files.get(pathB) ?? "");
    const connectedMarkerB = sceneB.mapAnnotations.sceneLinks[0];
    if (connectedMarkerB?.connection === null || connectedMarkerB === undefined) {
      throw new Error("Expected a connected remote marker.");
    }
    storage.files.set(pathB, serializeSceneDocument(replaceMarker(sceneB, {
      ...connectedMarkerB,
      connection: {
        ...connectedMarkerB.connection,
        peer: { scenePath: pathC, markerId: "scene-link-c" }
      }
    })));

    const disconnected = await disconnectSceneLink(storage, { scenePath: pathA, markerId: markerA.id });

    expect(disconnected.ok && disconnected.warning).toContain("otra conexion");
    expect(parseSceneJson(storage.files.get(pathA) ?? "").mapAnnotations.sceneLinks[0]?.connection).toBeNull();
    expect(parseSceneJson(storage.files.get(pathB) ?? "").mapAnnotations.sceneLinks[0]?.connection?.peer).toEqual({
      scenePath: pathC,
      markerId: "scene-link-c"
    });
  });
});

function marker(id: string, name: string, x: number, y: number): MapSceneLinkMarker {
  return { id, kind: "scene-link", position: { x, y }, name, locked: false, connection: null };
}

function sceneJson(sceneLink: MapSceneLinkMarker): string {
  const scene = createDefaultScene();
  return serializeSceneDocument({
    ...scene,
    mapAnnotations: { ...scene.mapAnnotations, sceneLinks: [sceneLink] }
  });
}

function replaceMarker(
  scene: ReturnType<typeof parseSceneJson>,
  sceneLink: MapSceneLinkMarker
): ReturnType<typeof parseSceneJson> {
  return {
    ...scene,
    mapAnnotations: { ...scene.mapAnnotations, sceneLinks: [sceneLink] }
  };
}

function createStorage(entries: readonly (readonly [string, string])[]): SceneFileStorage & { files: Map<string, string> } {
  const files = new Map(entries);
  return {
    files,
    saveSceneJson: async () => null,
    loadSceneJson: async () => null,
    loadSceneJsonFromPath: async (filePath) => {
      const json = files.get(filePath);
      if (json === undefined) throw new Error("ENOENT");
      return { filePath, json };
    },
    replaceSceneJsonFiles: async (updates) => {
      for (const update of updates) files.set(update.filePath, update.json);
    },
    fileExists: async (filePath) => files.has(filePath)
  };
}
