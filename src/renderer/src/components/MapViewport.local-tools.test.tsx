// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import type { SceneShape } from "../../../domain/sessions/scene-document";
import { MapViewport } from "./MapViewport";

const engine = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../../../render/pixi/PixiViewport", () => ({ PixiViewport: { create: engine.create } }));

describe("MapViewport local shape update order", () => {
  const host = document.createElement("div");
  const root = createRoot(host);

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.append(host);
    engine.create.mockReset();
  });

  afterEach(() => {
    act(() => root.render(null));
    host.remove();
  });

  it("selects a newly added local shape without recreating Pixi", async () => {
    let shapes: readonly SceneShape[] = [];
    let ids = new Set<string>();
    let selection: string | null = null;
    const calls: string[] = [];
    const viewport = new Proxy({
      setShapes(next: readonly SceneShape[]) { shapes = next; calls.push("shapes"); },
      setLocalEditableShapeIds(next: readonly string[] | undefined) { ids = new Set(next); calls.push("ids"); },
      setSelectedElementId(next: string | null) {
        selection = next !== null && shapes.some((shape) => shape.id === next) && ids.has(next) ? next : null;
        calls.push("selection");
      }
    }, {
      get(target, property, receiver) {
        if (property === "then") return undefined;
        return Reflect.has(target, property) ? Reflect.get(target, property, receiver) : vi.fn();
      }
    });
    engine.create.mockResolvedValue(viewport);
    const scene = createDefaultScene();
    const props = {
      map: null, grid: scene.grid, settings: scene.settings, darkness: scene.darkness,
      fogOfWar: scene.fogOfWar, shapes: [], selectedElementId: null,
      localEditableShapeIds: [], isReadOnly: true, viewRole: "player",
      onElementSelect: vi.fn()
    } as unknown as ComponentProps<typeof MapViewport>;
    await act(async () => root.render(<MapViewport {...props} />));
    const shape: SceneShape = { id: "new-local", type: "circle", points: [{ x: 10, y: 20 }], radius: 30 };
    calls.length = 0;
    await act(async () => root.render(<MapViewport {...props} shapes={[shape]} localEditableShapeIds={[shape.id]} selectedElementId={shape.id} />));
    expect(calls).toEqual(["shapes", "ids", "selection"]);
    expect(selection).toBe(shape.id);
    expect(engine.create).toHaveBeenCalledOnce();
  });
});
