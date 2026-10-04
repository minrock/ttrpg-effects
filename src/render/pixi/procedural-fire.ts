import { BufferImageSource, Container, GlProgram, Mesh, MeshGeometry, Shader, Texture, UniformGroup } from "pixi.js";
import { getFireZoneBounds } from "../../domain/effects/fire";
import { fireOutline } from "../../domain/effects/fire-shapes";
import { getGridCellVertices } from "../../domain/grid/grid-cell";
import type { SceneFireEffect } from "../../domain/sessions/scene-document";
import { fireFragment, fireVertex } from "./procedural-fire-shader";

export const MAX_FIRE_MASK_SIZE = 1024;
const CLOCK_RATES = [0.31, 0.47, 0.73, 1.13] as const;

export function getFireFootprint(effect: SceneFireEffect, cellSize: number) {
  if (effect.opacity <= 0 || (effect.zone.kind === "cells" && effect.zone.cells.length === 0)) return null;
  const bounds = getFireZoneBounds(effect);
  const detail = Math.max(1, effect.zone.kind === "cells" ? cellSize
    : Math.min(cellSize, (effect.zone.kind === "line" ? effect.zone.width : effect.zone.radius) * effect.scale));
  const padding = detail * 0.35;
  const width = bounds.right - bounds.left + padding * 2;
  const height = bounds.bottom - bounds.top + padding * 2;
  if (![width, height, bounds.left, bounds.top].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const resolution = Math.min(2, MAX_FIRE_MASK_SIZE / Math.max(width, height));
  return {
    x: bounds.left - padding, y: bounds.top - padding, width, height, detail,
    textureWidth: Math.min(MAX_FIRE_MASK_SIZE, Math.max(1, Math.ceil(width * resolution))),
    textureHeight: Math.min(MAX_FIRE_MASK_SIZE, Math.max(1, Math.ceil(height * resolution)))
  };
}

export function getFireSeed(id: string): Float32Array {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return new Float32Array([(hash >>> 0) % 251, ((hash >>> 8) % 241)]);
}

export function createFireNoise(): Uint8Array {
  const values = new Uint8Array(256 * 256);
  let state = 0x41c6ce57;
  for (let index = 0; index < values.length; index++) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    values[index] = state & 255;
  }
  const pixels = new Uint8Array(values.length * 4);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const index = (y * 256 + x) * 4;
      pixels[index] = values[y * 256 + x]!;
      // Adjacent Z slices meet exactly, including across the repeating boundary.
      pixels[index + 1] = values[((y + 17) % 256) * 256 + (x + 37) % 256]!;
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

/** One shared clock/noise texture, one cached mesh per area, independent of flame count. */
export class ProceduralFireRenderer {
  private readonly noise = new Texture({ source: new BufferImageSource({
    resource: createFireNoise(), width: 256, height: 256,
    addressMode: "repeat", scaleMode: "linear", alphaMode: "no-premultiply-alpha"
  }) });
  private readonly clock = new UniformGroup({ uClock: { value: new Float32Array(4), type: "vec4<f32>" } });
  private readonly meshes = new Set<Mesh<MeshGeometry, Shader>>();
  private disposed = false;

  constructor(private readonly now: () => number = Date.now) {}

  get meshCount(): number { return this.meshes.size; }

  update(nowMs = this.now()): void {
    if (this.disposed || this.meshes.size === 0) return;
    const seconds = nowMs / 1000;
    // The 3D lattice is periodic in Z; wrapping these clocks is visually continuous.
    for (let i = 0; i < 4; i++) this.clock.uniforms.uClock[i] = (seconds * CLOCK_RATES[i]!) % 256;
  }

  createEffect(effect: SceneFireEffect, cellSize: number): Container {
    if (this.disposed) throw new Error("Fire renderer has been destroyed.");
    const container = new Container({ label: "procedural-fire", alpha: effect.opacity });
    const footprint = getFireFootprint(effect, cellSize);
    if (!footprint) return container;
    const { x, y, width, height, detail } = footprint;
    const mask = effect.zone.kind !== "circle" ? createFuelTexture(effect, footprint) : null;
    const radius = effect.zone.kind === "circle" ? effect.zone.radius * effect.scale / detail : 0;
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, width, 0, width, height, 0, height]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3])
    });
    const shader = new Shader({
      glProgram: GlProgram.from({ vertex: fireVertex, fragment: fireFragment, name: "procedural-fire", preferredFragmentPrecision: "highp" }),
      resources: {
        uNoise: this.noise.source,
        uFuel: (mask ?? Texture.WHITE).source,
        fireClock: this.clock,
        fireArea: new UniformGroup({
          uDomain: { value: new Float32Array([(x - effect.position.x) / detail, (y - effect.position.y) / detail, width / detail, height / detail]), type: "vec4<f32>" },
          uShape: { value: new Float32Array([radius, effect.zone.kind === "circle" && effect.zone.mode === "open" ? radius * effect.zone.innerRadiusRatio : 0, effect.zone.kind === "circle" ? 1 : 0, 0.25]), type: "vec4<f32>" },
          uSeed: { value: getFireSeed(effect.id), type: "vec2<f32>" }
        })
      }
    });
    const mesh = new Mesh({ geometry, shader });
    mesh.position.set(x, y);
    this.meshes.add(mesh);
    // A newly opened map joins the wall clock before its first frame is rendered.
    if (this.meshes.size === 1) this.update();
    mesh.once("destroyed", () => {
      this.meshes.delete(mesh);
      geometry.destroy();
      shader.destroy(false);
      mask?.destroy(true);
    });
    container.addChild(mesh);
    return container;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of [...this.meshes]) mesh.destroy();
    this.noise.destroy(true);
  }
}

function createFuelTexture(effect: SceneFireEffect, footprint: NonNullable<ReturnType<typeof getFireFootprint>>): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = footprint.textureWidth;
  canvas.height = footprint.textureHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot create fire footprint.");
  const sx = canvas.width / footprint.width;
  const sy = canvas.height / footprint.height;
  context.scale(sx, sy);
  context.translate(-footprint.x, -footprint.y);
  context.fillStyle = "white";
  context.filter = `blur(${Math.max(0.5, footprint.detail * 0.09 * sx)}px)`;
  context.beginPath();
  if (effect.zone.kind === "cells") {
    for (const cell of effect.zone.cells) {
      const [first, ...rest] = getGridCellVertices(cell);
      if (!first) continue;
      context.moveTo(first.x, first.y);
      for (const vertex of rest) context.lineTo(vertex.x, vertex.y);
      context.closePath();
    }
  } else {
    const [first, ...rest] = fireOutline(effect);
    if (first) {
      context.moveTo(first.x, first.y);
      for (const point of rest) context.lineTo(point.x, point.y);
      context.closePath();
    }
  }
  context.fill();
  return Texture.from(canvas);
}
