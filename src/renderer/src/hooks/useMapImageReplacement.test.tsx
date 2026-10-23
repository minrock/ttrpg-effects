// @vitest-environment jsdom
import { act, useRef, useState, type SetStateAction } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSceneMap, createSceneWithMap, addSceneMap, setActiveSceneMap, removeSceneMap, syncActiveMapFromRuntimeFields } from "../../../domain/sessions/scene-maps";
import type { SceneDocument } from "../../../domain/sessions/scene-document";
import type { MapImageReplacementResult } from "../../../application/services/map-image-storage";
import { prepareMapImageResource } from "../../../render/pixi/map-image-resource";
import { useMapImageReplacement } from "./useMapImageReplacement";

vi.mock("../../../render/pixi/map-image-resource", () => ({ prepareMapImageResource: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("map image replacement workflow", () => {
  let root: Root;
  let container: HTMLDivElement;
  let hook: ReturnType<typeof useMapImageReplacement>;
  let scene: SceneDocument;
  let imageUrl: string | null;
  let edit: (value: SetStateAction<SceneDocument>) => void;
  const feedback = vi.fn(), applied = vi.fn(), release = vi.fn();
  const choose = vi.fn<() => Promise<MapImageReplacementResult>>();
  const resolveUrl = vi.fn<(path: string) => Promise<string | null>>();
  let report: (value: { imageUrl: string; ok: boolean; error?: string }) => void;

  function Harness() {
    const [current, setCurrent] = useState(() => addSceneMap(createSceneWithMap(createDefaultSceneMap({
      id: "a", map: { imagePath: "/a.png", position: { x: 40, y: 80 }, scale: 1, imageSize: { width: 200, height: 100 } }
    })), createDefaultSceneMap({ id: "b", map: { imagePath: "/b.png", position: { x: 70, y: -50 }, scale: 2, imageSize: { width: 200, height: 100 } } }), false));
    const ref = useRef(current);
    const [url, setUrl] = useState<string | null>("map-asset:///a.png?revision=old");
    ref.current = current;
    edit = (value) => { const next = typeof value === "function" ? value(ref.current) : value; ref.current = next; setCurrent(next); };
    hook = useMapImageReplacement({ scene: current, sceneRef: ref, setScene: edit, mapImageUrl: url, setMapImageUrl: setUrl, onFeedback: feedback, onApplied: applied });
    scene = current; imageUrl = url;
    return null;
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    choose.mockResolvedValue({ status: "ready", imagePath: "/new.png", imageUrl: "map-asset:///new.png?revision=1" });
    resolveUrl.mockImplementation(async (path) => `map-asset://${path}?revision=resolved`);
    vi.mocked(prepareMapImageResource).mockResolvedValue({ width: 400, height: 200, previewUrl: "data:image/png;base64,preview", release });
    Object.defineProperty(window, "ttrpg", { configurable: true, value: {
      selectReplacementMapImage: choose, resolveMapUrl: resolveUrl,
      onPlayerMapImageStatus: (callback: typeof report) => { report = callback; return () => {}; }
    } });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    act(() => root.render(<Harness />));
  });

  afterEach(() => { act(() => root.unmount()); container.remove(); Reflect.deleteProperty(window, "ttrpg"); });

  it("prepares privately, then changes only the active image and retains world size", async () => {
    const before = scene;
    await act(async () => { await hook.begin("a"); });
    expect(scene).toBe(before);
    expect(imageUrl).toContain("revision=old");
    expect(hook.draft?.preserveError).toBeNull();
    act(() => hook.confirm("preserve-world-size"));
    expect(scene.map).toEqual({ imagePath: "/new.png", imageSize: { width: 400, height: 200 }, position: before.map.position, scale: .5 });
    expect(scene.activeMapId).toBe("a"); expect(scene.camera).toBe(before.camera);
    expect(scene.grid).toBe(before.grid); expect(scene.maps).toHaveLength(2);
    expect(imageUrl).toBe("map-asset:///new.png?revision=1"); expect(applied).toHaveBeenCalledOnce();
    expect(hook.draft).toBeNull();
  });

  it("updates an inactive map without activating it or changing its active image", async () => {
    const original = scene.map;
    await act(async () => { await hook.begin("b"); });
    act(() => hook.confirm("preserve-world-size"));
    expect(scene.activeMapId).toBe("a"); expect(scene.map).toBe(original);
    expect(scene.maps.find((map) => map.id === "b")?.map.scale).toBe(1);
    expect(imageUrl).toContain("revision=old"); expect(applied).not.toHaveBeenCalled();
  });

  it("cancellation releases prepared resources and makes no scene edits", async () => {
    const before = scene;
    await act(async () => { await hook.begin("a"); });
    act(() => hook.cancel());
    expect(scene).toBe(before); expect(release).toHaveBeenCalled(); expect(hook.busyMapId).toBeNull();
  });

  it("native cancellation and corrupt files leave the current map intact", async () => {
    const before = scene;
    choose.mockResolvedValueOnce({ status: "cancelled" });
    await act(async () => { await hook.begin("a"); });
    expect(feedback).not.toHaveBeenCalled(); expect(scene).toBe(before);
    vi.mocked(prepareMapImageResource).mockRejectedValueOnce(new Error("Imagen corrupta"));
    await act(async () => { await hook.begin("a"); });
    expect(feedback).toHaveBeenCalledWith("Imagen corrupta"); expect(scene).toBe(before);
  });

  it("discards a delayed picker after a new session even with matching map IDs", async () => {
    const delayed = deferred<MapImageReplacementResult>(); choose.mockReturnValueOnce(delayed.promise);
    let work!: Promise<void>;
    act(() => { work = hook.begin("a"); });
    act(() => hook.resetSession());
    await act(async () => { delayed.resolve({ status: "ready", imagePath: "/old-session.png", imageUrl: "map-asset:///old-session.png" }); await work; });
    expect(hook.draft).toBeNull(); expect(scene.map.imagePath).toBe("/a.png");
    expect(prepareMapImageResource).not.toHaveBeenCalled();
  });

  it("releases a decoded candidate arriving after cancellation", async () => {
    const delayed = deferred<Awaited<ReturnType<typeof prepareMapImageResource>>>();
    vi.mocked(prepareMapImageResource).mockReturnValueOnce(delayed.promise);
    let work!: Promise<void>;
    await act(async () => { work = hook.begin("a"); await Promise.resolve(); });
    act(() => hook.cancel());
    await act(async () => { delayed.resolve({ width: 400, height: 200, release }); await work; });
    expect(release).toHaveBeenCalled(); expect(hook.draft).toBeNull();
  });

  it("invalidates confirmation when target transform changes or the target is removed", async () => {
    await act(async () => { await hook.begin("a"); });
    act(() => edit((current) => ({ ...current, map: { ...current.map, scale: 2 } })));
    expect(hook.draft).toBeNull(); expect(scene.map.imagePath).toBe("/a.png");
    await act(async () => { await hook.begin("b"); });
    act(() => edit((current) => removeSceneMap(current, "b")));
    expect(hook.draft).toBeNull();
  });

  it("keeps the original target after map navigation and preserves unrelated current edits", async () => {
    await act(async () => { await hook.begin("a"); });
    act(() => edit((current) => ({ ...setActiveSceneMap(current, "b"), camera: { x: 99, y: 66, zoom: 3 } })));
    act(() => hook.confirm("preserve-world-size"));
    expect(scene.activeMapId).toBe("b"); expect(scene.camera).toEqual({ x: 99, y: 66, zoom: 3 });
    expect(scene.maps.find((map) => map.id === "a")?.map.imagePath).toBe("/new.png");
  });

  it("fills missing dimensions but never replaces known metadata from a stale load", () => {
    const before = scene;
    act(() => hook.onImageLoaded({ imagePath: "/a.png", imageUrl: "map-asset:///a.png?revision=old", width: 999, height: 999 }));
    expect(scene).toBe(before);
    act(() => edit((current) => ({ ...current, map: { imagePath: "/a.png", position: current.map.position, scale: 1 } })));
    act(() => hook.onImageLoaded({ imagePath: "/a.png", imageUrl: "map-asset:///stale.png", width: 300, height: 300 }));
    expect(scene.map.imageSize).toBeUndefined();
    act(() => hook.onImageLoaded({ imagePath: "/a.png", imageUrl: "map-asset:///a.png?revision=old", width: 200, height: 100 }));
    expect(syncActiveMapFromRuntimeFields(scene).map.imageSize).toEqual({ width: 200, height: 100 });
  });

  it("only accepts Player status for the current image revision", () => {
    act(() => report({ imageUrl: "map-asset:///stale.png", ok: false, error: "Old failure" }));
    expect(hook.playerError).toBeNull();
    act(() => report({ imageUrl: imageUrl!, ok: false, error: "Failed" }));
    expect(hook.playerError).toBe("Failed");
    act(() => report({ imageUrl: imageUrl!, ok: true }));
    expect(hook.playerError).toBeNull();
  });
});
