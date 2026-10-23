import { describe, expect, it, vi } from "vitest";
import type { MapImageReplacementResult, MapImageStorage } from "../services/map-image-storage";
import { prepareMapImageReplacementUseCase } from "./prepare-map-image-replacement";

describe("prepare map image replacement", () => {
  it.each<MapImageReplacementResult>([
    { status: "ready", imagePath: "/maps/map.png", imageUrl: "map-asset:///maps/map.png?revision=1" },
    { status: "cancelled" },
    { status: "error", error: "No se pudo leer la imagen seleccionada." }
  ])("returns $status without needing a scene or mutation port", async (result) => {
    const storage = { selectReplacementMapImage: vi.fn().mockResolvedValue(result) } satisfies MapImageStorage;
    expect(await prepareMapImageReplacementUseCase(storage)).toEqual(result);
    expect(storage.selectReplacementMapImage).toHaveBeenCalledExactlyOnceWith();
  });

  it("converts unexpected selection failures into a serializable error", async () => {
    const storage = { selectReplacementMapImage: vi.fn().mockRejectedValue(new Error("native dialog failed")) };
    expect(await prepareMapImageReplacementUseCase(storage)).toEqual({
      status: "error", error: "No se pudo preparar la imagen del mapa."
    });
  });

  it.each([
    null,
    { status: "ready", imagePath: "", imageUrl: "map-asset:///map.png" },
    { status: "ready", imagePath: " /map\0.png", imageUrl: "map-asset:///map.png" },
    { status: "ready", imagePath: "/map.png", imageUrl: "javascript:alert(1)" },
    { status: "ready", imagePath: "/map.png", imageUrl: "file:///map.png" },
    { status: "ready", imagePath: "/map.png", imageUrl: "bad url" },
    { status: "error", error: new Error("not serializable") },
    { status: "unknown" }
  ])("rejects malformed storage results: %j", async (result) => {
    const storage = { selectReplacementMapImage: vi.fn().mockResolvedValue(result) };
    expect(await prepareMapImageReplacementUseCase(storage)).toMatchObject({ status: "error", error: expect.any(String) });
  });

  it("preserves the exact selected path and strips non-contract fields", async () => {
    const result = {
      status: "ready", imagePath: "/maps/map.png ", imageUrl: "map-asset:///maps/map.png%20?revision=1",
      bytes: new Uint8Array([1, 2, 3])
    };
    const prepared = await prepareMapImageReplacementUseCase({ selectReplacementMapImage: vi.fn().mockResolvedValue(result) });
    expect(prepared).toEqual({ status: result.status, imagePath: result.imagePath, imageUrl: result.imageUrl });
  });
});
