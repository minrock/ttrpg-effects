import { clampZoom, type CameraState } from "../map/camera";
import type { SceneDocument, SceneToken } from "../sessions/scene-document";
import type { WorldPoint } from "../shared/coordinates";
import type { ArcanePointerCreatureSize } from "../pointer/arcane-pointer";
import { stripPrivateMapAnnotationsForPlayer } from "../annotations/map-annotations";

export type ViewportViewRole = "dm" | "player";
export type FogPresentation = "dm-hidden" | "dm-preview" | "player-blocking";
export type HiddenTokenPolicy = "hide" | "show-with-indicator";

export interface ViewportCameraSnapshot {
  readonly center: WorldPoint;
  readonly zoom: number;
}

export interface ArcanePointerBroadcast {
  readonly id: string;
  readonly position: WorldPoint;
  readonly creatureSize: ArcanePointerCreatureSize;
  readonly durationMs: number;
}

export interface PlayerWindowSnapshot {
  readonly scene: SceneDocument;
  readonly mapImageUrl: string | null;
  readonly tokenImageUrls: Readonly<Record<string, string>>;
  readonly camera: ViewportCameraSnapshot;
  readonly cameraSyncKey?: number;
  readonly showDmFogOverlay: boolean;
  readonly informationAreaHighlightResetKey?: number;
}

export function normalizeCameraSnapshot(camera: ViewportCameraSnapshot | null | undefined): ViewportCameraSnapshot {
  const center = camera?.center;
  const x = center?.x;
  const y = center?.y;

  return {
    center: {
      x: typeof x === "number" && Number.isFinite(x) ? x : 0,
      y: typeof y === "number" && Number.isFinite(y) ? y : 0
    },
    zoom: clampZoom(camera?.zoom ?? 1)
  };
}

export function cameraStateToSnapshot(camera: CameraState): ViewportCameraSnapshot {
  return normalizeCameraSnapshot(camera);
}

export function deriveFogPresentation(
  role: ViewportViewRole,
  showDmFogOverlay: boolean
): FogPresentation {
  if (role === "player") {
    return "player-blocking";
  }

  return showDmFogOverlay ? "dm-preview" : "dm-hidden";
}

export function deriveHiddenTokenPolicy(role: ViewportViewRole): HiddenTokenPolicy {
  return role === "player" ? "hide" : "show-with-indicator";
}

export function getTokensForRole(
  tokens: readonly SceneToken[],
  role: ViewportViewRole
): readonly SceneToken[] {
  return role === "player" ? tokens.filter((token) => token.visible) : tokens;
}

export function createPlayerSceneSnapshot(scene: SceneDocument): SceneDocument {
  return {
    ...stripPrivateMapAnnotationsForPlayer(scene),
    labels: []
  };
}
