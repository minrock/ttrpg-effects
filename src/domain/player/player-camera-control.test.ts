import { describe, expect, it } from "vitest";
import {
  areCameraSnapshotsEquivalent,
  derivePlayerCameraSyncStatus,
  sanitizePlayerCameraCommand,
  sanitizePlayerCameraReport,
  shouldApplyPlayerCameraReport,
  zoomPlayerCamera,
  type PlayerCameraReport
} from "./player-camera-control";

const primary = { center: { x: 100, y: 200 }, zoom: 1 } as const;

describe("player camera control", () => {
  it("sanitizes valid commands and rejects invalid payloads", () => {
    expect(
      sanitizePlayerCameraCommand({ revision: 2, camera: primary, reason: "recenter" })
    ).toEqual({ revision: 2, camera: primary, reason: "recenter" });
    expect(
      sanitizePlayerCameraCommand({ revision: -1, camera: primary, reason: "recenter" })
    ).toBeNull();
    expect(
      sanitizePlayerCameraCommand({
        revision: 1,
        camera: { center: { x: Number.NaN, y: 0 }, zoom: 1 },
        reason: "move"
      })
    ).toBeNull();
  });

  it("sanitizes reports and rejects malformed revisions", () => {
    expect(
      sanitizePlayerCameraReport({
        reportRevision: 3,
        acknowledgedCommandRevision: 2,
        camera: primary,
        origin: "local-navigation",
        final: true
      })
    ).toEqual({
      reportRevision: 3,
      acknowledgedCommandRevision: 2,
      camera: primary,
      origin: "local-navigation",
      final: true
    });
    expect(
      sanitizePlayerCameraReport({
        reportRevision: 3.5,
        acknowledgedCommandRevision: null,
        camera: primary,
        origin: "local-navigation",
        final: false
      })
    ).toBeNull();
  });

  it("compares position using a screen-space tolerance", () => {
    expect(
      areCameraSnapshotsEquivalent(primary, {
        center: { x: 101.5, y: 200 },
        zoom: 1
      })
    ).toBe(true);
    expect(
      areCameraSnapshotsEquivalent(primary, {
        center: { x: 103, y: 200 },
        zoom: 1
      })
    ).toBe(false);
    expect(
      areCameraSnapshotsEquivalent(
        { center: { x: 100, y: 200 }, zoom: 2 },
        { center: { x: 101.5, y: 200 }, zoom: 2 }
      )
    ).toBe(false);
  });

  it("derives closed, pending, synchronized and desynchronized states", () => {
    expect(
      derivePlayerCameraSyncStatus({
        isPlayerWindowOpen: false,
        primaryCamera: primary,
        effectiveCamera: null,
        pendingCommandRevision: null,
        acknowledgedCommandRevision: null
      })
    ).toBe("closed");
    expect(
      derivePlayerCameraSyncStatus({
        isPlayerWindowOpen: true,
        primaryCamera: primary,
        effectiveCamera: null,
        pendingCommandRevision: 2,
        acknowledgedCommandRevision: 1
      })
    ).toBe("pending");
    expect(
      derivePlayerCameraSyncStatus({
        isPlayerWindowOpen: true,
        primaryCamera: primary,
        effectiveCamera: primary,
        pendingCommandRevision: 2,
        acknowledgedCommandRevision: 2
      })
    ).toBe("synchronized");
    expect(
      derivePlayerCameraSyncStatus({
        isPlayerWindowOpen: true,
        primaryCamera: primary,
        effectiveCamera: { center: { x: 150, y: 200 }, zoom: 1 },
        pendingCommandRevision: null,
        acknowledgedCommandRevision: 2
      })
    ).toBe("desynchronized");
  });

  it("ignores stale reports", () => {
    const report: PlayerCameraReport = {
      reportRevision: 5,
      acknowledgedCommandRevision: 2,
      camera: primary,
      origin: "remote-command",
      final: true
    };

    expect(shouldApplyPlayerCameraReport(4, report)).toBe(true);
    expect(shouldApplyPlayerCameraReport(5, report)).toBe(false);
    expect(shouldApplyPlayerCameraReport(6, report)).toBe(false);
  });

  it("zooms around the primary center and respects camera limits", () => {
    expect(zoomPlayerCamera(primary, "in").center).toEqual(primary.center);
    expect(zoomPlayerCamera(primary, "in").zoom).toBeCloseTo(1.15);
    expect(zoomPlayerCamera(primary, "out").zoom).toBeCloseTo(1 / 1.15);
    expect(zoomPlayerCamera({ ...primary, zoom: 4 }, "in").zoom).toBe(4);
    expect(zoomPlayerCamera({ ...primary, zoom: 0.25 }, "out").zoom).toBe(0.25);
  });
});
