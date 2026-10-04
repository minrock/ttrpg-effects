// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Mesh, type MeshGeometry, type Shader } from "pixi.js";
import { ProceduralLightning } from "./procedural-lightning";

vi.hoisted(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });

describe("lightning prototype renderer", () => {
  it("reuses two meshes and GPU buffers between discharges and while paused", () => {
    const effect = new ProceduralLightning({ shape: "circle", size: 400, seed: 1, sparks: true });
    try {
      effect.update(10);
      const meshes = effect.container.children as Mesh<MeshGeometry, Shader>[];
      expect(meshes).toHaveLength(2);
      expect(meshes.every(mesh => mesh instanceof Mesh && !mesh.filters?.length)).toBe(true);
      const buffers = meshes.map(mesh => mesh.geometry.getBuffer("aPosition"));
      const positions = buffers.map(buffer => buffer.data);
      const snapshot = Array.from(meshes[0]!.geometry.positions);
      effect.update(10, 0.6);
      expect(effect.generationMs).toBe(0);
      expect(buffers.map(buffer => buffer.data)).toEqual(positions);
      effect.container.rotation = Math.PI / 2;
      effect.container.scale.set(0.1);
      effect.update(10.001);
      expect(effect.generationMs).toBe(0);
      effect.update(60);
      expect(meshes.map(mesh => mesh.geometry.getBuffer("aPosition"))).toEqual(buffers);
      expect(Array.from(meshes[0]!.geometry.positions)).not.toEqual(snapshot);
    } finally { effect.destroy(); }
  });

  it("releases local geometry/shaders safely and tolerates repeated destruction", () => {
    const effect = new ProceduralLightning({ shape: "line", size: 700, seed: 5, sparks: true });
    effect.update(4);
    const meshes = [...effect.container.children] as Mesh<MeshGeometry, Shader>[];
    const cleanup = meshes.map(mesh => ({ geometry: vi.spyOn(mesh.geometry, "destroy"), shader: vi.spyOn(mesh.shader!, "destroy") }));
    effect.destroy(); effect.destroy(); effect.update(5);
    expect(effect.container.destroyed).toBe(true);
    expect(meshes.every(mesh => mesh.destroyed)).toBe(true);
    for (const item of cleanup) {
      expect(item.geometry).toHaveBeenCalledTimes(1);
      expect(item.shader).toHaveBeenCalledExactlyOnceWith(false);
    }
  });
});
