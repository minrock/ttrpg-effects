import { Container, GlProgram, Mesh, MeshGeometry, Shader, UniformGroup } from "pixi.js";
import { createLightningBuffers, writeLightningDischarge, type LightningSettings } from "./lightning-discharge";

const vertex = /* glsl */ `
attribute vec2 aPosition;
attribute vec2 aUV;
attribute vec4 aStyle;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec4 uColor;
uniform float uAge;
varying vec2 vUV;
varying vec2 vStyle;
varying vec4 vColor;
void main() {
  vUV = aUV;
  vStyle = aStyle.zw;
  vColor = uColor * uWorldColorAlpha;
  vec2 position = aPosition + aStyle.xy * uAge;
  vec3 world = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(position, 1.0);
  gl_Position = vec4(world.xy, 0.0, 1.0);
}`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying vec2 vStyle;
varying vec4 vColor;
uniform float uAge;
uniform float uIntensity;
uniform vec3 uTint;
void main() {
  float age = max(0.0, uAge - vUV.y * 0.018);
  float ignition = smoothstep(0.0, 0.012, age);
  float envelope = ignition * (exp(-age * 9.0) + 0.3 * exp(-pow((age - 0.12) / 0.032, 2.0)));
  float spark = smoothstep(0.0, 0.025, age) * exp(-age * 7.0);
  envelope = mix(envelope, spark, vStyle.y);
  float d = abs(vUV.x);
  float core = exp(-d * d * 100.0);
  float sheath = exp(-d * d * 22.0);
  float halo = exp(-d * d * 5.0) * (1.0 - smoothstep(0.7, 1.0, d));
  float tip = 1.0 - smoothstep(0.92, 1.0, vUV.y);
  vec3 light = vec3(0.93, 0.99, 1.0) * core * 1.6 + uTint * sheath * 0.65 + uTint * halo * 0.22;
  float power = envelope * vStyle.x * uIntensity * tip;
  gl_FragColor = vec4(light * power, min(1.0, (core + sheath + halo) * power)) * vColor;
}`;

const CADENCE = 0.17;

export class ProceduralLightning {
  readonly container = new Container({ label: "lightning-prototype" });
  private readonly banks = [0, 1].map(() => {
    const data = createLightningBuffers();
    const geometry = new MeshGeometry({ positions: data.positions, uvs: data.uvs, indices: data.indices });
    geometry.addAttribute("aStyle", { buffer: data.styles, format: "float32x4" });
    const uniforms = new UniformGroup({
      uAge: { value: 0, type: "f32" }, uIntensity: { value: 1, type: "f32" },
      uTint: { value: new Float32Array([0.24, 0.93, 0.92]), type: "vec3<f32>" }
    });
    const shader = new Shader({ glProgram: GlProgram.from({ vertex, fragment, name: "lightning-prototype" }), resources: { lightning: uniforms } });
    const mesh = new Mesh({ geometry, shader, blendMode: "add" });
    this.container.addChild(mesh);
    return { data, geometry, uniforms, mesh, shader, epoch: -Infinity };
  });
  private disposed = false;
  generationMs = 0;

  constructor(private settings: LightningSettings) {}

  configure(settings: LightningSettings): void {
    if (JSON.stringify(this.settings) === JSON.stringify(settings)) return;
    this.settings = settings;
    for (const bank of this.banks) bank.epoch = -Infinity;
  }

  update(seconds: number, intensity = 1): void {
    if (this.disposed) return;
    const shifted = seconds + (this.settings.seed % 100) * 0.019;
    const current = Math.floor(shifted / CADENCE);
    this.generationMs = 0;
    for (let i = 0; i < this.banks.length; i++) {
      const bank = this.banks[i]!;
      const epoch = current - ((current - i) % 2 + 2) % 2;
      if (bank.epoch !== epoch) {
        const before = performance.now();
        writeLightningDischarge(bank.data, this.settings, epoch);
        const { vertices, indexCount, positions, uvs, styles, indices } = bank.data;
        bank.mesh.visible = vertices > 0;
        bank.geometry.positions = positions.subarray(0, vertices * 2);
        bank.geometry.uvs = uvs.subarray(0, vertices * 2);
        bank.geometry.getBuffer("aStyle").data = styles.subarray(0, vertices * 4);
        bank.geometry.indices = indices.subarray(0, indexCount);
        bank.epoch = epoch;
        this.generationMs += performance.now() - before;
      }
      bank.uniforms.uniforms.uAge = shifted - epoch * CADENCE;
      bank.uniforms.uniforms.uIntensity = intensity;
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const bank of this.banks) {
      if (!bank.mesh.destroyed) bank.mesh.destroy();
      bank.geometry.destroy(); bank.shader.destroy(false);
    }
    if (!this.container.destroyed) this.container.destroy();
  }
}
