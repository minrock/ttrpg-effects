import { describe, expect, it } from "vitest";
import {
  areCameraSnapshotsEquivalent,
  calculatePlayerViewportPreview,
  derivePlayerCameraSyncStatus,
  sanitizePlayerCameraCommand,
  sanitizePlayerCameraReport,
  sanitizePlayerViewportReport,
  shouldShowAuxiliaryViewportPreview,
  shouldApplyPlayerCameraReport,
  shouldShowPrimaryViewportPreview,
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
        final: true,
        viewport: { width: 1280.8, height: 720.2, devicePixelRatio: 2, mapId: "map-a" }
      })
    ).toEqual({
      reportRevision: 3,
      acknowledgedCommandRevision: 2,
      camera: primary,
      origin: "local-navigation",
      final: true,
      viewport: { width: 1280, height: 720, devicePixelRatio: 2, orientation: "landscape", mapId: "map-a" }
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

  it("sanitizes viewport reports without requiring them for legacy camera reports", () => {
    expect(sanitizePlayerViewportReport({ width: 700, height: 1100, devicePixelRatio: 2 })).toEqual({
      width: 700,
      height: 1100,
      devicePixelRatio: 2,
      orientation: "portrait"
    });
    expect(sanitizePlayerViewportReport({ width: 0, height: 1100 })).toBeNull();
    expect(sanitizePlayerCameraReport({
      reportRevision: 4,
      acknowledgedCommandRevision: null,
      camera: primary,
      origin: "initialization",
      final: true
    })?.viewport).toBeUndefined();
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

  it("calculates the player viewport footprint in world coordinates", () => {
    const preview = calculatePlayerViewportPreview(
      { center: { x: 100, y: 200 }, zoom: 2 },
      { width: 800, height: 600, devicePixelRatio: 1, orientation: "landscape", mapId: "map-a" },
      0
    );

    expect(preview.width).toBe(400);
    expect(preview.height).toBe(300);
    expect(preview.corners).toEqual([
      { x: -100, y: 50 },
      { x: 300, y: 50 },
      { x: 300, y: 350 },
      { x: -100, y: 350 }
    ]);
  });

  it("rotates the viewport footprint around the camera center for compass orientation", () => {
    const preview = calculatePlayerViewportPreview(
      { center: { x: 0, y: 0 }, zoom: 1 },
      { width: 400, height: 200, devicePixelRatio: 1, orientation: "landscape" },
      90
    );

    expect(preview.corners[0].x).toBeCloseTo(100);
    expect(preview.corners[0].y).toBeCloseTo(-200);
    expect(preview.corners[1].x).toBeCloseTo(100);
    expect(preview.corners[1].y).toBeCloseTo(200);
    expect(preview.corners[2].x).toBeCloseTo(-100);
    expect(preview.corners[2].y).toBeCloseTo(200);
    expect(preview.corners[3].x).toBeCloseTo(-100);
    expect(preview.corners[3].y).toBeCloseTo(-200);
  });

  it("keeps viewport preview visibility tied to sync state", () => {
    const viewport = { width: 1280, height: 720, devicePixelRatio: 1, orientation: "landscape" as const };
    expect(shouldShowPrimaryViewportPreview({ status: "synchronized", effectiveCamera: primary, viewport })).toBe(true);
    expect(shouldShowPrimaryViewportPreview({ status: "pending", effectiveCamera: primary, viewport })).toBe(true);
    expect(shouldShowPrimaryViewportPreview({ status: "desynchronized", effectiveCamera: primary, viewport })).toBe(false);
    expect(shouldShowPrimaryViewportPreview({ status: "synchronized", effectiveCamera: primary })).toBe(false);

    expect(shouldShowAuxiliaryViewportPreview({ status: "desynchronized", effectiveCamera: primary, viewport })).toBe(true);
    expect(shouldShowAuxiliaryViewportPreview({ status: "pending", effectiveCamera: primary, viewport })).toBe(false);
    expect(shouldShowAuxiliaryViewportPreview({ status: "desynchronized", effectiveCamera: null, viewport })).toBe(false);
  });
});
