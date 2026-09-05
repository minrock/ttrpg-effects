import { clampZoom } from "../map/camera";
import { normalizeCompassOrientation, type CompassOrientation } from "../map/compass-orientation";
import {
  normalizeCameraSnapshot,
  type ViewportCameraSnapshot
} from "./player-window";

export const PLAYER_CAMERA_POSITION_TOLERANCE_PX = 2;
export const PLAYER_CAMERA_ZOOM_TOLERANCE = 0.002;
export const PLAYER_CAMERA_ZOOM_FACTOR = 1.15;

export type PlayerCameraCommandReason =
  | "open"
  | "move"
  | "zoom"
  | "recenter"
  | "scene-change";

export type PlayerCameraReportOrigin =
  | "local-navigation"
  | "remote-command"
  | "initialization";

export type PlayerCameraSyncStatus =
  | "closed"
  | "pending"
  | "synchronized"
  | "desynchronized";

export interface PlayerCameraCommand {
  readonly revision: number;
  readonly camera: ViewportCameraSnapshot;
  readonly reason: PlayerCameraCommandReason;
}

export interface PlayerCameraReport {
  readonly reportRevision: number;
  readonly acknowledgedCommandRevision: number | null;
  readonly camera: ViewportCameraSnapshot;
  readonly origin: PlayerCameraReportOrigin;
  readonly final: boolean;
  readonly viewport?: PlayerViewportReport;
}

export type PlayerViewportOrientation = "landscape" | "portrait";

export interface PlayerViewportReport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly orientation: PlayerViewportOrientation;
  readonly mapId?: string;
}

export interface PlayerViewportPreview {
  readonly center: ViewportCameraSnapshot["center"];
  readonly width: number;
  readonly height: number;
  readonly corners: readonly [
    ViewportCameraSnapshot["center"],
    ViewportCameraSnapshot["center"],
    ViewportCameraSnapshot["center"],
    ViewportCameraSnapshot["center"]
  ];
}

export interface PlayerCameraSyncInput {
  readonly isPlayerWindowOpen: boolean;
  readonly primaryCamera: ViewportCameraSnapshot;
  readonly effectiveCamera: ViewportCameraSnapshot | null;
  readonly pendingCommandRevision: number | null;
  readonly acknowledgedCommandRevision: number | null;
}

export interface PlayerCameraControlViewState {
  readonly primaryCamera: ViewportCameraSnapshot;
  readonly effectiveCamera: ViewportCameraSnapshot | null;
  readonly status: PlayerCameraSyncStatus;
  readonly viewport?: PlayerViewportReport;
  readonly primaryPreview?: PlayerViewportPreviewState;
}

export interface PlayerViewportPreviewState {
  readonly visible: boolean;
  readonly fading: boolean;
}

export type PlayerViewportPreviewVisibilityInput = Pick<
  PlayerCameraControlViewState,
  "effectiveCamera" | "status" | "viewport"
>;

export function sanitizePlayerCameraCommand(value: unknown): PlayerCameraCommand | null {
  if (!isRecord(value) || !isNonNegativeInteger(value.revision) || !isCommandReason(value.reason)) {
    return null;
  }

  const camera = sanitizeCamera(value.camera);
  if (camera === null) {
    return null;
  }

  return {
    revision: value.revision,
    camera,
    reason: value.reason
  };
}

export function sanitizePlayerCameraReport(value: unknown): PlayerCameraReport | null {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.reportRevision) ||
    !isNullableNonNegativeInteger(value.acknowledgedCommandRevision) ||
    !isReportOrigin(value.origin) ||
    typeof value.final !== "boolean"
  ) {
    return null;
  }

  const camera = sanitizeCamera(value.camera);
  if (camera === null) {
    return null;
  }

  const viewport = sanitizePlayerViewportReport(value.viewport);
  return {
    reportRevision: value.reportRevision,
    acknowledgedCommandRevision: value.acknowledgedCommandRevision,
    camera,
    origin: value.origin,
    final: value.final,
    ...(viewport === null ? {} : { viewport })
  };
}

export function sanitizePlayerViewportReport(value: unknown): PlayerViewportReport | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.width !== "number" ||
    !Number.isFinite(value.width) ||
    value.width <= 0 ||
    typeof value.height !== "number" ||
    !Number.isFinite(value.height) ||
    value.height <= 0
  ) {
    return null;
  }

  const width = Math.max(1, Math.floor(value.width));
  const height = Math.max(1, Math.floor(value.height));
  const devicePixelRatio =
    typeof value.devicePixelRatio === "number" &&
    Number.isFinite(value.devicePixelRatio) &&
    value.devicePixelRatio > 0
      ? value.devicePixelRatio
      : 1;
  const mapId = typeof value.mapId === "string" && value.mapId.trim() !== "" ? value.mapId : undefined;

  return {
    width,
    height,
    devicePixelRatio,
    orientation: width >= height ? "landscape" : "portrait",
    ...(mapId === undefined ? {} : { mapId })
  };
}

export function areCameraSnapshotsEquivalent(
  left: ViewportCameraSnapshot,
  right: ViewportCameraSnapshot,
  positionTolerancePx = PLAYER_CAMERA_POSITION_TOLERANCE_PX,
  zoomTolerance = PLAYER_CAMERA_ZOOM_TOLERANCE
): boolean {
  const normalizedLeft = normalizeCameraSnapshot(left);
  const normalizedRight = normalizeCameraSnapshot(right);
  const comparisonZoom = Math.max(normalizedLeft.zoom, normalizedRight.zoom);
  const distancePx =
    Math.hypot(
      normalizedLeft.center.x - normalizedRight.center.x,
      normalizedLeft.center.y - normalizedRight.center.y
    ) * comparisonZoom;

  return (
    distancePx <= Math.max(0, positionTolerancePx) &&
    Math.abs(normalizedLeft.zoom - normalizedRight.zoom) <= Math.max(0, zoomTolerance)
  );
}

export function derivePlayerCameraSyncStatus({
  isPlayerWindowOpen,
  primaryCamera,
  effectiveCamera,
  pendingCommandRevision,
  acknowledgedCommandRevision
}: PlayerCameraSyncInput): PlayerCameraSyncStatus {
  if (!isPlayerWindowOpen) {
    return "closed";
  }

  if (
    pendingCommandRevision !== null &&
    (acknowledgedCommandRevision === null || acknowledgedCommandRevision < pendingCommandRevision)
  ) {
    return "pending";
  }

  if (effectiveCamera === null) {
    return "pending";
  }

  return areCameraSnapshotsEquivalent(primaryCamera, effectiveCamera)
    ? "synchronized"
    : "desynchronized";
}

export function shouldApplyPlayerCameraReport(
  currentReportRevision: number,
  report: PlayerCameraReport
): boolean {
  return report.reportRevision > currentReportRevision;
}

export function zoomPlayerCamera(
  camera: ViewportCameraSnapshot,
  direction: "in" | "out"
): ViewportCameraSnapshot {
  const normalized = normalizeCameraSnapshot(camera);
  const factor = direction === "in" ? PLAYER_CAMERA_ZOOM_FACTOR : 1 / PLAYER_CAMERA_ZOOM_FACTOR;

  return {
    center: normalized.center,
    zoom: clampZoom(normalized.zoom * factor)
  };
}

export function calculatePlayerViewportPreview(
  camera: ViewportCameraSnapshot,
  viewport: PlayerViewportReport,
  compassOrientation: CompassOrientation
): PlayerViewportPreview {
  const normalizedCamera = normalizeCameraSnapshot(camera);
  const normalizedViewport = sanitizePlayerViewportReport(viewport) ?? {
    width: 1,
    height: 1,
    devicePixelRatio: 1,
    orientation: "landscape" as const
  };
  const width = normalizedViewport.width / normalizedCamera.zoom;
  const height = normalizedViewport.height / normalizedCamera.zoom;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const rotationRadians = normalizeCompassOrientation(compassOrientation) * (Math.PI / 180);
  const offsets = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ] as const;
  const corners = offsets.map((offset) => rotateOffsetAroundCenter(normalizedCamera.center, offset, rotationRadians));

  return {
    center: normalizedCamera.center,
    width,
    height,
    corners: [corners[0], corners[1], corners[2], corners[3]]
  };
}

export function shouldShowPrimaryViewportPreview({
  status,
  viewport
}: PlayerViewportPreviewVisibilityInput): boolean {
  return viewport !== undefined && status !== "desynchronized" && status !== "closed";
}

export function shouldShowAuxiliaryViewportPreview({
  effectiveCamera,
  status,
  viewport
}: PlayerViewportPreviewVisibilityInput): boolean {
  return viewport !== undefined && effectiveCamera !== null && status === "desynchronized";
}

function rotateOffsetAroundCenter(
  center: ViewportCameraSnapshot["center"],
  offset: ViewportCameraSnapshot["center"],
  radians: number
): ViewportCameraSnapshot["center"] {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: center.x + offset.x * cos - offset.y * sin,
    y: center.y + offset.x * sin + offset.y * cos
  };
}

function sanitizeCamera(value: unknown): ViewportCameraSnapshot | null {
  if (!isRecord(value) || !isRecord(value.center)) {
    return null;
  }

  if (
    typeof value.center.x !== "number" ||
    !Number.isFinite(value.center.x) ||
    typeof value.center.y !== "number" ||
    !Number.isFinite(value.center.y) ||
    typeof value.zoom !== "number" ||
    !Number.isFinite(value.zoom) ||
    value.zoom <= 0
  ) {
    return null;
  }

  return normalizeCameraSnapshot({
    center: { x: value.center.x, y: value.center.y },
    zoom: value.zoom
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullableNonNegativeInteger(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isCommandReason(value: unknown): value is PlayerCameraCommandReason {
  return (
    value === "open" ||
    value === "move" ||
    value === "zoom" ||
    value === "recenter" ||
    value === "scene-change"
  );
}

function isReportOrigin(value: unknown): value is PlayerCameraReportOrigin {
  return value === "local-navigation" || value === "remote-command" || value === "initialization";
}
