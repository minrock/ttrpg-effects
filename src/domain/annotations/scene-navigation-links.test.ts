import { describe, expect, it } from "vitest";
import {
  createReciprocalSceneLinkMarkers,
  disconnectSceneLinkMarker,
  validateReciprocalSceneLink,
  type MapSceneLinkMarker
} from "./scene-navigation-links";

const source: MapSceneLinkMarker = {
  id: "scene-link-1",
  kind: "scene-link",
  position: { x: 10, y: 20 },
  name: "Escalera norte",
  locked: false,
  connection: null
};
const target: MapSceneLinkMarker = {
  id: "scene-link-2",
  kind: "scene-link",
  position: { x: 300, y: 400 },
  name: "Entrada sur",
  locked: false,
  connection: null
};

describe("scene navigation links", () => {
  it("creates reciprocal origin and destination endpoints", () => {
    const [origin, destination] = createReciprocalSceneLinkMarkers(
      source,
      "/maps/a.ttrpgscene",
      target,
      "/maps/b.ttrpgscene",
      "connection-1"
    );

    expect(origin.connection?.role).toBe("origin");
    expect(destination.connection?.role).toBe("destination");
    expect(origin.connection?.peer).toEqual({ scenePath: "/maps/b.ttrpgscene", markerId: target.id });
    expect(destination.connection?.peer).toEqual({ scenePath: "/maps/a.ttrpgscene", markerId: source.id });
    expect(validateReciprocalSceneLink(origin, "/maps/a.ttrpgscene", destination, "/maps/b.ttrpgscene")).toBe(true);
    expect(validateReciprocalSceneLink(destination, "/maps/b.ttrpgscene", origin, "/maps/a.ttrpgscene")).toBe(true);
  });

  it("rejects mismatched connection identities", () => {
    const [origin, destination] = createReciprocalSceneLinkMarkers(
      source,
      "/maps/a.ttrpgscene",
      target,
      "/maps/b.ttrpgscene",
      "connection-1"
    );
    const mismatched = {
      ...destination,
      connection: destination.connection === null
        ? null
        : { ...destination.connection, connectionId: "connection-2" }
    };
    expect(validateReciprocalSceneLink(origin, "/maps/a.ttrpgscene", mismatched, "/maps/b.ttrpgscene")).toBe(false);
  });

  it("disconnects without losing marker properties", () => {
    const [origin] = createReciprocalSceneLinkMarkers(
      source,
      "/maps/a.ttrpgscene",
      target,
      "/maps/b.ttrpgscene",
      "connection-1"
    );
    expect(disconnectSceneLinkMarker(origin)).toEqual({ ...source, connection: null });
  });
});
