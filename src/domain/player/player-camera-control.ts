import { clampZoom } from "../map/camera";
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
}

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

  return {
    reportRevision: value.reportRevision,
    acknowledgedCommandRevision: value.acknowledgedCommandRevision,
    camera,
    origin: value.origin,
    final: value.final
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
