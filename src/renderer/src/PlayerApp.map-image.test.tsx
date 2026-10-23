// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TtrpgApi } from "../../preload/ttrpg-api";
import type { PlayerWindowSnapshot, ViewportCameraSnapshot } from "../../domain/player/player-window";
import type { PlayerCameraCommand } from "../../domain/player/player-camera-control";
import { createDefaultSceneMap, createSceneWithMap } from "../../domain/sessions/scene-maps";
import type { MapViewport } from "./components/MapViewport";
import { PlayerApp } from "./PlayerApp";

type ViewportProps = ComponentProps<typeof MapViewport>;
const viewport = vi.hoisted(() => ({
  props: null as ViewportProps | null,
  effectiveCamera: null as ViewportCameraSnapshot | null,
  visibleImageUrl: null as string | null,
  applyCamera: vi.fn(), mount: vi.fn(), unmount: vi.fn()
}));

vi.mock("./components/MapViewport", async () => {
  const { useEffect } = await import("react");
  return { MapViewport: (props: ViewportProps) => {
    viewport.props = props;
    useEffect(() => {
      viewport.mount();
      viewport.visibleImageUrl = null;
      return () => { viewport.unmount(); viewport.visibleImageUrl = null; };
    }, []);
    // Match MapViewport's camera dependency: local navigation lives inside the viewport.
    useEffect(() => {
      viewport.effectiveCamera = props.cameraSnapshot ?? null;
      viewport.applyCamera(props.cameraSnapshot);
    }, [props.cameraSnapshot]);
    return null;
  } };
});
vi.mock("./components/aside/PlayerAsideOverlay", () => ({ PlayerAsideOverlay: () => null }));
vi.mock("./components/combat/CombatTurnBar", () => ({ CombatTurnBar: () => null }));
vi.mock("./components/counters/SceneCountersOverlay", () => ({ SceneCountersOverlay: () => null }));

function snapshot(overrides: Partial<PlayerWindowSnapshot> = {}): PlayerWindowSnapshot {
  return {
    scene: createSceneWithMap(createDefaultSceneMap({ id: "a", map: {
      imagePath: "/maps/a.png", position: { x: 50, y: 60 }, scale: 1,
      imageSize: { width: 200, height: 100 }
    } })),
    mapImageUrl: "map-asset:///maps/a.png?revision=old", tokenImageUrls: {},
    camera: { center: { x: 100, y: 200 }, zoom: 1.25 }, cameraSyncKey: 10,
    showDmFogOverlay: false, showZoomIndicator: true, ...overrides
  };
}

describe("PlayerApp map image replacement", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onScene: (value: PlayerWindowSnapshot) => void;
  let onCameraCommand: (value: PlayerCameraCommand) => void;
  const reportCamera = vi.fn<TtrpgApi["reportPlayerCamera"]>();
  const reportImage = vi.fn<TtrpgApi["reportPlayerMapImageStatus"]>();
  const notifyReady = vi.fn<TtrpgApi["notifyPlayerContentReady"]>();
  const offScene = vi.fn(), offCamera = vi.fn(), offPointer = vi.fn(), offHighlight = vi.fn();
  const initial = snapshot();

  function props(): ViewportProps {
    expect(viewport.props).not.toBeNull();
    return viewport.props!;
  }

  async function flushReports(): Promise<void> {
    await act(async () => { await vi.runAllTimersAsync(); });
  }

  async function ready(): Promise<void> {
    const map = props().map!;
    expect(props().onMapImageLoaded).toBeTypeOf("function");
    await act(async () => {
      viewport.visibleImageUrl = map.imageUrl;
      props().onMapImageLoaded!({ imageUrl: map.imageUrl!, imagePath: map.imagePath!, width: 200, height: 100 });
    });
    await flushReports();
  }

  async function fail(error: string): Promise<void> {
    expect(props().onMapImageError).toBeTypeOf("function");
    await act(async () => props().onMapImageError!({ imageUrl: props().map!.imageUrl!, error }));
  }

  async function navigate(camera: ViewportCameraSnapshot): Promise<void> {
    await act(async () => {
      viewport.effectiveCamera = camera;
      props().onCameraChange?.(camera);
      props().onCameraInteractionEnd?.(camera);
    });
    await flushReports();
  }

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.clearAllMocks();
    viewport.props = null;
    viewport.effectiveCamera = null;
    viewport.visibleImageUrl = null;
    reportCamera.mockResolvedValue({ ok: true });
    reportImage.mockResolvedValue(undefined);
    notifyReady.mockResolvedValue({ ok: true });
    const api = {
      getPlayerWindowState: async () => ({ snapshot: initial, camera: null, cameraCommand: null, isOpen: true }),
      onPlayerScene: (handler) => { onScene = handler; return offScene; },
      onPlayerCameraCommand: (handler) => { onCameraCommand = handler; return offCamera; },
      onPlayerPointer: () => offPointer,
      onPlayerInformationAreaHighlight: () => offHighlight,
      reportPlayerCamera: reportCamera, reportPlayerMapImageStatus: reportImage, notifyPlayerContentReady: notifyReady
    } satisfies Partial<TtrpgApi>;
    Object.defineProperty(window, "ttrpg", { configurable: true, value: api });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<PlayerApp />));
    await flushReports();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(window, "ttrpg");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("waits for the initial map and reports readiness for its exact image revision", async () => {
    expect(container.querySelector(".player-loading")).not.toBeNull();
    expect(notifyReady).not.toHaveBeenCalled();
    await ready();
    expect(container.querySelector(".player-loading")).toBeNull();
    expect(notifyReady).toHaveBeenCalledOnce();
    expect(reportImage).toHaveBeenCalledExactlyOnceWith({ imageUrl: initial.mapImageUrl, ok: true });
    expect(props().fogPresentation).toBe("player-blocking");
    expect(props().hiddenTokenPolicy).toBe("hide");
  });

  it("keeps local camera, zoom controls and readiness when replacing the image with the same cameraSyncKey", async () => {
    await ready();
    const cameraProp = props().cameraSnapshot;
    const localCamera = { center: { x: -340, y: 870 }, zoom: 2.5 };
    act(() => container.querySelector<HTMLButtonElement>('[title="Desbloquear zoom local"]')!.click());
    await navigate(localCamera);
    const cameraApplications = viewport.applyCamera.mock.calls.length;
    const replacement = snapshot({
      mapImageUrl: "map-asset:///maps/a.png?revision=new",
      camera: { center: { x: 999, y: 999 }, zoom: 0.5 },
      scene: { ...initial.scene, map: { ...initial.scene.map, scale: 0.5, imageSize: { width: 400, height: 200 } } }
    });
    await act(async () => onScene(replacement));
    expect(props().map?.imageUrl).toBe(replacement.mapImageUrl);
    expect(props().map?.scale).toBe(0.5);
    expect(props().cameraSnapshot).toBe(cameraProp);
    expect(viewport.effectiveCamera).toEqual(localCamera);
    expect(viewport.applyCamera).toHaveBeenCalledTimes(cameraApplications);
    expect(props().isZoomLocked).toBe(false);
    expect(container.querySelector(".player-zoom-indicator")?.textContent).toContain("250%");
    expect(container.querySelector(".player-loading")).toBeNull();
    expect(viewport.mount).toHaveBeenCalledOnce();
    expect(viewport.unmount).not.toHaveBeenCalled();
    expect(viewport.visibleImageUrl).toBe(initial.mapImageUrl);
    await ready();
    expect(notifyReady).toHaveBeenCalledOnce();
    expect(reportImage).toHaveBeenLastCalledWith({ imageUrl: replacement.mapImageUrl, ok: true });
    expect(reportCamera).toHaveBeenLastCalledWith(expect.objectContaining({ camera: localCamera }));
  });

  it("retains a remotely commanded effective camera on later same-key image snapshots", async () => {
    await ready();
    const commanded = { center: { x: 700, y: -800 }, zoom: 3 };
    await act(async () => onCameraCommand({ revision: 1, reason: "move", camera: commanded }));
    await flushReports();
    const cameraProp = props().cameraSnapshot;
    await act(async () => onScene(snapshot({ mapImageUrl: "map-asset:///maps/a.png?revision=commanded" })));
    expect(props().cameraSnapshot).toBe(cameraProp);
    expect(viewport.effectiveCamera).toEqual(commanded);
    expect(reportCamera).toHaveBeenLastCalledWith(expect.objectContaining({ camera: commanded, origin: "remote-command" }));
  });

  it("applies camera and waits for rendering when navigating to a different map and sync key", async () => {
    await ready();
    await navigate({ center: { x: 800, y: 900 }, zoom: 2 });
    const nextCamera = { center: { x: -200, y: -300 }, zoom: 0.75 };
    const nextScene = createSceneWithMap(createDefaultSceneMap({ id: "b", map: {
      imagePath: "/maps/b.png", position: { x: 0, y: 0 }, scale: 1
    } }));
    await act(async () => onScene(snapshot({ scene: nextScene, cameraSyncKey: 11, camera: nextCamera, mapImageUrl: "map-asset:///maps/b.png?revision=1" })));
    expect(props().map?.mapId).toBe("b");
    expect(viewport.effectiveCamera).toEqual(nextCamera);
    expect(container.querySelector(".player-loading")).not.toBeNull();
    await ready();
    expect(container.querySelector(".player-loading")).toBeNull();
    expect(notifyReady).toHaveBeenCalledTimes(2);
    expect(reportCamera).toHaveBeenLastCalledWith(expect.objectContaining({ camera: nextCamera, viewport: expect.objectContaining({ mapId: "b" }) }));
  });

  it("honors an explicit camera sync key change even when the map ID is unchanged", async () => {
    await ready();
    await navigate({ center: { x: 800, y: 900 }, zoom: 2 });
    const camera = { center: { x: 120, y: -50 }, zoom: 1.5 };
    await act(async () => onScene(snapshot({ cameraSyncKey: 12, camera })));
    expect(viewport.effectiveCamera).toEqual(camera);
    expect(container.querySelector(".player-loading")).not.toBeNull();
    await ready();
    expect(container.querySelector(".player-loading")).toBeNull();
  });

  it("reports replacement failures for the current revision without resetting local navigation or readiness", async () => {
    await ready();
    const localCamera = { center: { x: 400, y: 600 }, zoom: 2 };
    await navigate(localCamera);
    const imageUrl = "map-asset:///maps/a.png?revision=failed";
    await act(async () => onScene(snapshot({ mapImageUrl: imageUrl })));
    const error = "Error de textura ".repeat(50);
    await fail(error);
    expect(reportImage).toHaveBeenLastCalledWith({ imageUrl, ok: false, error: error.slice(0, 500) });
    expect(viewport.effectiveCamera).toEqual(localCamera);
    expect(container.querySelector(".player-loading")).toBeNull();
    expect(notifyReady).toHaveBeenCalledOnce();
    expect(viewport.unmount).not.toHaveBeenCalled();
    expect(viewport.visibleImageUrl).toBe(initial.mapImageUrl);
    await navigate({ center: { x: 450, y: 650 }, zoom: 2 });
    expect(reportCamera).toHaveBeenLastCalledWith(expect.objectContaining({ camera: { center: { x: 450, y: 650 }, zoom: 2 } }));
    await ready();
    expect(reportImage).toHaveBeenLastCalledWith({ imageUrl, ok: true });
  });

  it("unblocks the initial view on a load error and reports it to the DM", async () => {
    await fail("Imagen no disponible");
    await flushReports();
    expect(container.querySelector(".player-loading")).toBeNull();
    expect(notifyReady).toHaveBeenCalledOnce();
    expect(reportImage).toHaveBeenCalledExactlyOnceWith({ imageUrl: initial.mapImageUrl, ok: false, error: "Imagen no disponible" });
  });

  it.each(["same URL", "new URL"])("discards the old viewport across scene sessions with colliding map IDs and %s", async (urlCase) => {
    await ready();
    const old = props();
    const imageUrl = urlCase === "same URL" ? initial.mapImageUrl : "map-asset:///maps/a.png?revision=other-scene";
    const next = snapshot({ cameraSyncKey: 11, mapImageUrl: imageUrl });
    expect(next.scene.id).toBe(initial.scene.id);
    expect(next.scene.activeMapId).toBe(initial.scene.activeMapId);
    await act(async () => onScene(next));
    expect(container.querySelector(".player-loading")).not.toBeNull();
    expect(viewport.unmount).toHaveBeenCalledOnce();
    expect(viewport.mount).toHaveBeenCalledTimes(2);
    expect(viewport.visibleImageUrl).toBeNull();
    reportImage.mockClear();
    await act(async () => {
      old.onMapImageLoaded!({ imageUrl: initial.mapImageUrl!, imagePath: "/maps/a.png", width: 200, height: 100 });
      old.onMapImageError!({ imageUrl: initial.mapImageUrl!, error: "Previous scene failed" });
    });
    expect(reportImage).not.toHaveBeenCalled();
    expect(container.querySelector(".player-loading")).not.toBeNull();
    await fail("New scene unavailable");
    expect(reportImage).toHaveBeenCalledExactlyOnceWith({ imageUrl, ok: false, error: "New scene unavailable" });
    expect(container.querySelector(".player-loading")).toBeNull();
    expect(viewport.visibleImageUrl).toBeNull();
    await ready();
    expect(viewport.visibleImageUrl).toBe(imageUrl);
  });

  it("also isolates different scene IDs when a sender reuses the camera epoch", async () => {
    await ready();
    await act(async () => onScene(snapshot({ scene: { ...initial.scene, id: "another-scene" } })));
    expect(viewport.unmount).toHaveBeenCalledOnce();
    expect(viewport.visibleImageUrl).toBeNull();
    expect(container.querySelector(".player-loading")).not.toBeNull();
    await ready();
    expect(container.querySelector(".player-loading")).toBeNull();
  });

  it.each(["success", "failure"])("ignores an older URL's %s before and after the newer revision finishes", async (result) => {
    const old = props();
    const imageUrl = "map-asset:///maps/a.png?revision=newer";
    const obsoleteCompletion = (): void => {
      if (result === "success") old.onMapImageLoaded!({ imageUrl: initial.mapImageUrl!, imagePath: "/maps/a.png", width: 200, height: 100 });
      else old.onMapImageError!({ imageUrl: initial.mapImageUrl!, error: "Old image failed" });
    };
    await act(async () => {
      onScene(snapshot({ mapImageUrl: imageUrl }));
      obsoleteCompletion();
    });
    expect(reportImage).not.toHaveBeenCalled();
    expect(notifyReady).not.toHaveBeenCalled();
    expect(container.querySelector(".player-loading")).not.toBeNull();
    await ready();
    expect(reportImage).toHaveBeenCalledExactlyOnceWith({ imageUrl, ok: true });
    await act(async () => obsoleteCompletion());
    expect(reportImage).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".player-loading")).toBeNull();
  });

  it("does not infer image completion from legacy URL-less callbacks", async () => {
    await act(async () => {
      props().onMapRendered("An older render completed");
      props().onMapRenderError("An older render failed");
    });
    expect(reportImage).not.toHaveBeenCalled();
    expect(notifyReady).not.toHaveBeenCalled();
    expect(container.querySelector(".player-loading")).not.toBeNull();
  });

  it("ignores old completions after switching to a scene with no image", async () => {
    const old = props();
    await act(async () => onScene(snapshot({ cameraSyncKey: 11, mapImageUrl: null })));
    await act(async () => {
      old.onMapImageLoaded!({ imageUrl: initial.mapImageUrl!, imagePath: "/maps/a.png", width: 200, height: 100 });
      old.onMapImageError!({ imageUrl: initial.mapImageUrl!, error: "Old failure" });
    });
    expect(reportImage).not.toHaveBeenCalled();
    expect(props().map).toBeNull();
    expect(container.querySelector(".player-loading")).toBeNull();
  });
});
