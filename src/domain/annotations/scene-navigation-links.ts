import type { WorldPoint } from "../shared/coordinates";

export type SceneLinkRole = "origin" | "destination";

export interface SceneLinkEndpointReference {
  readonly scenePath: string;
  readonly markerId: string;
  readonly mapId?: string;
}

export interface SceneLinkConnection {
  readonly connectionId: string;
  readonly role: SceneLinkRole;
  readonly origin: SceneLinkEndpointReference;
  readonly destination: SceneLinkEndpointReference;
  readonly peer: SceneLinkEndpointReference;
}

export interface MapSceneLinkMarker {
  readonly id: string;
  readonly kind: "scene-link";
  readonly position: WorldPoint;
  readonly name: string;
  readonly locked: boolean;
  readonly connection: SceneLinkConnection | null;
}

export type SceneLinkBrokenReason =
  | "file-missing"
  | "scene-invalid"
  | "marker-missing"
  | "connection-mismatch"
  | "read-failed";

export type SceneLinkValidationStatus =
  | { readonly state: "unlinked" }
  | { readonly state: "validating" }
  | { readonly state: "valid" }
  | {
      readonly state: "broken";
      readonly reason: SceneLinkBrokenReason;
      readonly message: string;
    };

export interface SceneLinkCandidateMarker {
  readonly id: string;
  readonly name: string;
  readonly position: WorldPoint;
  readonly available: boolean;
}

export interface SceneLinkCandidateFile {
  readonly filePath: string;
  readonly markers: readonly SceneLinkCandidateMarker[];
}

export interface ConnectSceneLinkRequest {
  readonly sourceScenePath: string;
  readonly sourceMarkerId: string;
  readonly targetScenePath: string;
  readonly targetMarkerId: string;
}

export interface DisconnectSceneLinkRequest {
  readonly scenePath: string;
  readonly markerId: string;
}

export interface ValidateSceneLinksRequest {
  readonly scenePath: string;
  readonly markers: readonly MapSceneLinkMarker[];
}

export interface LoadSceneLinkTargetRequest {
  readonly scenePath: string;
  readonly markerId: string;
}

export function createReciprocalSceneLinkMarkers(
  source: MapSceneLinkMarker,
  sourceScenePath: string,
  target: MapSceneLinkMarker,
  targetScenePath: string,
  connectionId: string
): readonly [MapSceneLinkMarker, MapSceneLinkMarker] {
  const origin = endpoint(sourceScenePath, source.id);
  const destination = endpoint(targetScenePath, target.id);

  return [
    {
      ...source,
      connection: {
        connectionId,
        role: "origin",
        origin,
        destination,
        peer: destination
      }
    },
    {
      ...target,
      connection: {
        connectionId,
        role: "destination",
        origin,
        destination,
        peer: origin
      }
    }
  ];
}

export function disconnectSceneLinkMarker(marker: MapSceneLinkMarker): MapSceneLinkMarker {
  return { ...marker, connection: null };
}

export function renameSceneLinkMarker(
  marker: MapSceneLinkMarker,
  name: string
): MapSceneLinkMarker {
  return { ...marker, name };
}

export function validateReciprocalSceneLink(
  local: MapSceneLinkMarker,
  localScenePath: string,
  remote: MapSceneLinkMarker,
  remoteScenePath: string
): boolean {
  const localConnection = local.connection;
  const remoteConnection = remote.connection;
  if (localConnection === null || remoteConnection === null) return false;
  if (localConnection.connectionId !== remoteConnection.connectionId) return false;
  if (localConnection.role === remoteConnection.role) return false;
  if (!sameEndpoint(localConnection.origin, remoteConnection.origin)) return false;
  if (!sameEndpoint(localConnection.destination, remoteConnection.destination)) return false;
  if (!sameEndpoint(localConnection.peer, endpoint(remoteScenePath, remote.id))) return false;
  if (!sameEndpoint(remoteConnection.peer, endpoint(localScenePath, local.id))) return false;

  const expectedLocal =
    localConnection.role === "origin" ? localConnection.origin : localConnection.destination;
  const expectedRemote =
    remoteConnection.role === "origin" ? remoteConnection.origin : remoteConnection.destination;

  return (
    sameEndpoint(expectedLocal, endpoint(localScenePath, local.id)) &&
    sameEndpoint(expectedRemote, endpoint(remoteScenePath, remote.id))
  );
}

export function getSceneLinkPeer(marker: MapSceneLinkMarker): SceneLinkEndpointReference | null {
  return marker.connection?.peer ?? null;
}

export function isSceneLinkMarkerConnectedTo(
  marker: MapSceneLinkMarker,
  scenePath: string,
  markerId: string
): boolean {
  const peer = getSceneLinkPeer(marker);
  return peer !== null && sameEndpoint(peer, endpoint(scenePath, markerId));
}

export function replaceSceneLinkMarker(
  markers: readonly MapSceneLinkMarker[],
  marker: MapSceneLinkMarker
): readonly MapSceneLinkMarker[] {
  return markers.map((candidate) => candidate.id === marker.id ? marker : candidate);
}

export function createSceneLinkEndpoint(
  scenePath: string,
  markerId: string,
  mapId?: string
): SceneLinkEndpointReference {
  return mapId === undefined ? { scenePath, markerId } : { scenePath, markerId, mapId };
}

function endpoint(scenePath: string, markerId: string): SceneLinkEndpointReference {
  return createSceneLinkEndpoint(scenePath, markerId);
}

function sameEndpoint(left: SceneLinkEndpointReference, right: SceneLinkEndpointReference): boolean {
  return left.scenePath === right.scenePath && left.markerId === right.markerId && left.mapId === right.mapId;
}
