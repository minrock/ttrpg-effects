// @vitest-environment jsdom
import { act, useRef, useState, type SetStateAction } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneDocument } from "../../../domain/sessions/scene-document";
import { addSceneMap, createDefaultSceneMap, createSceneWithMap, setActiveSceneMap } from "../../../domain/sessions/scene-maps";
import { prepareMapImageResource } from "../../../render/pixi/map-image-resource";
import { useMapImageReplacement } from "./useMapImageReplacement";

vi.mock("../../../render/pixi/map-image-resource", () => ({ prepareMapImageResource: vi.fn() }));

describe("spec 36 review regressions", () => {
  let root: Root;
  let host: HTMLDivElement;
  let hook: ReturnType<typeof useMapImageReplacement>;
  let scene: SceneDocument;
  let edit: (value: SetStateAction<SceneDocument>) => void;
  let setImageUrl: (url: string | null) => void;
  const releaseCandidate = vi.fn();
  const selectReplacementMapImage = vi.fn();

  function Harness() {
    const [current, setCurrent] = useState(() => addSceneMap(createSceneWithMap(createDefaultSceneMap({
      id: "a", map: { imagePath: "/a.png", imageSize: { width: 200, height: 100 }, position: { x: 0, y: 0 }, scale: 1 }
    })), createDefaultSceneMap({
      id: "b", map: { imagePath: "/b.png", position: { x: 0, y: 0 }, scale: 1 }
    }), false));
    const ref = useRef(current);
    ref.current = current;
    const [url, setUrl] = useState<string | null>("map-asset:///a.png?revision=old");
    edit = (value) => {
      const next = typeof value === "function" ? value(ref.current) : value;
      ref.current = next;
      setCurrent(next);
    };
    setImageUrl = setUrl;
    hook = useMapImageReplacement({
      scene: current, sceneRef: ref, setScene: edit, mapImageUrl: url, setMapImageUrl: setUrl,
      onFeedback: vi.fn(), onApplied: vi.fn()
    });
    scene = current;
    return null;
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    selectReplacementMapImage.mockResolvedValue({ status: "ready", imagePath: "/new.png", imageUrl: "map-asset:///new.png?revision=new" });
    vi.mocked(prepareMapImageResource).mockImplementation(async (url) => ({
      width: 400, height: 200,
      release: url.includes("revision=new") ? releaseCandidate : vi.fn()
    }));
    Object.defineProperty(window, "ttrpg", { configurable: true, value: {
      selectReplacementMapImage,
      resolveMapUrl: vi.fn(async (path: string) => `map-asset://${path}?revision=retry`),
      onPlayerMapImageStatus: () => () => {}
    } });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    Reflect.deleteProperty(window, "ttrpg");
  });

  it("does not infer old dimensions by fetching an uncached inactive same-path image", async () => {
    // Scene loading resolves every path, but inactive textures have never been decoded.
    act(() => hook.resetSession({ b: "map-asset:///b.png?revision=old" }, scene));
    selectReplacementMapImage.mockResolvedValue({ status: "ready", imagePath: "/b.png", imageUrl: "map-asset:///b.png?revision=new" });
    // Both URL revisions read the externally overwritten 400x200 file.
    await act(async () => { await hook.begin("b"); });
    expect(hook.draft).not.toBeNull();
    expect(hook.draft?.preserveError).not.toBeNull();
  });

  it("releases the confirmed preparation lease when navigation cancels its viewport load", async () => {
    await act(async () => { await hook.begin("a"); });
    act(() => hook.confirm("preserve-world-size"));
    expect(releaseCandidate).not.toHaveBeenCalled();
    // Navigating before the viewport completion callback suppresses that callback.
    act(() => {
      setImageUrl(null);
      edit((current) => setActiveSceneMap(current, "b"));
    });
    expect(releaseCandidate).toHaveBeenCalledOnce();
  });

  it("invalidates a pending confirmation when retry changes the target image revision", async () => {
    await act(async () => { await hook.begin("a"); });
    expect(hook.draft).not.toBeNull();
    await act(async () => { await hook.retryPlayer(); });
    expect(hook.draft).toBeNull();
  });

  it("does not reload an inactive formerly decoded image as the old preview", async () => {
    act(() => hook.onImageLoaded({ imagePath: "/a.png", imageUrl: "map-asset:///a.png?revision=old", width: 200, height: 100 }));
    await act(async () => {
      setImageUrl(null);
      edit((current) => setActiveSceneMap(current, "b"));
    });
    selectReplacementMapImage.mockResolvedValue({ status: "ready", imagePath: "/a.png", imageUrl: "map-asset:///a.png?revision=new" });
    await act(async () => { await hook.begin("a"); });
    expect(hook.draft?.previousUrl).toBeNull();
    expect(prepareMapImageResource).not.toHaveBeenCalledWith("map-asset:///a.png?revision=old");
    expect(hook.draft?.previous.imageSize).toEqual({ width: 200, height: 100 });
  });

  it("cancels a replacement started while a player retry is resolving", async () => {
    let resolve!: (url: string) => void;
    vi.mocked(window.ttrpg!.resolveMapUrl).mockReturnValueOnce(new Promise<string>((done) => { resolve = done; }));
    let retry!: Promise<void>;
    act(() => { retry = hook.retryPlayer(); });
    await act(async () => { await hook.begin("a"); });
    expect(hook.draft).not.toBeNull();
    await act(async () => { resolve("map-asset:///a.png?revision=retry"); await retry; });
    expect(hook.draft).toBeNull();
    expect(releaseCandidate).toHaveBeenCalledOnce();
  });
});
