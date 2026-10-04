import { describe, expect, it } from "vitest";
import { createLightningBuffers, MAX_LIGHTNING_VERTICES, writeLightningDischarge, type LightningShape } from "./lightning-discharge";

describe("lightning prototype topology", () => {
  it.each<LightningShape>(["line", "cone", "circle"])("bounds buffers and produces finite branched geometry for %s", shape => {
    const data = createLightningBuffers();
    for (const size of [20, 400, 100000]) {
      for (let epoch = 0; epoch < 10; epoch++) {
        writeLightningDischarge(data, { shape, size, seed: 13, sparks: true }, epoch);
        expect(data.vertices).toBeGreaterThan(100);
        expect(data.vertices).toBeLessThan(MAX_LIGHTNING_VERTICES);
        expect(data.channels).toBeGreaterThan(20);
        expect(data.sparks).toBe(42);
        expect(data.indexCount).toBeLessThan(data.indices.length);
        expect([...data.positions.subarray(0, data.vertices * 2)].every(Number.isFinite)).toBe(true);
        expect([...data.indices.subarray(0, data.indexCount)].every(index => index < data.vertices)).toBe(true);
      }
    }
  });

  it("is reproducible by seed/epoch and changes between discharges", () => {
    const a = createLightningBuffers(), b = createLightningBuffers();
    const settings = { shape: "cone" as const, size: 500, seed: 12, sparks: true };
    writeLightningDischarge(a, settings, 8); writeLightningDischarge(b, settings, 8);
    expect(a).toEqual(b);
    writeLightningDischarge(b, settings, 9); expect(a.positions).not.toEqual(b.positions);
    writeLightningDischarge(b, { ...settings, seed: 15 }, 8); expect(a.positions).not.toEqual(b.positions);
  });

  it("keeps an interior discharge rather than an empty circular ring", () => {
    const data = createLightningBuffers();
    writeLightningDischarge(data, { shape: "circle", size: 400, seed: 32, sparks: false }, 2);
    let interior = 0, perimeter = 0;
    for (let i = 0; i < data.vertices; i++) {
      const radius = Math.hypot(data.positions[i * 2]!, data.positions[i * 2 + 1]!);
      if (radius < 70) interior++;
      if (radius > 140) perimeter++;
    }
    expect(interior).toBeGreaterThan(30); expect(perimeter).toBeGreaterThan(30);
  });

  it("toggles moving sparks without changing the main discharge", () => {
    const a = createLightningBuffers(), b = createLightningBuffers();
    const settings = { shape: "line" as const, size: 700, seed: 85 };
    writeLightningDischarge(a, { ...settings, sparks: false }, 1);
    writeLightningDischarge(b, { ...settings, sparks: true }, 1);
    expect(a.sparks).toBe(0); expect(b.sparks).toBe(42);
    expect(a.positions.subarray(0, a.vertices * 2)).toEqual(b.positions.subarray(0, a.vertices * 2));
    expect([...b.styles.subarray(a.vertices * 4, b.vertices * 4)].some(value => Math.abs(value) > 20)).toBe(true);
  });

  it("rejects invalid sizes without producing invalid GPU attachments", () => {
    const data = createLightningBuffers();
    for (const size of [0, -10, NaN, Infinity]) {
      writeLightningDischarge(data, { shape: "line", size, seed: 1, sparks: true }, 0);
      expect(data.vertices).toBe(0); expect(data.indexCount).toBe(0);
    }
  });
});
