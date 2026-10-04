import { LIGHTNING_CONE_APERTURE_DEGREES, type LightningShape } from "../../domain/effects/lightning";
export type { LightningShape } from "../../domain/effects/lightning";
export interface LightningSettings {
  shape: LightningShape;
  size: number;
  seed: number;
  sparks: boolean;
  maxVertices?: number;
  constrainArea?: boolean;
}
interface Point { x: number; y: number }
interface Channel { points: Point[]; width: number; energy: number; velocity?: Point; primary?: boolean }

export const MAX_LIGHTNING_VERTICES = 8192;
export function createLightningBuffers() {
  return {
    positions: new Float32Array(MAX_LIGHTNING_VERTICES * 2),
    uvs: new Float32Array(MAX_LIGHTNING_VERTICES * 2),
    styles: new Float32Array(MAX_LIGHTNING_VERTICES * 4),
    indices: new Uint32Array(MAX_LIGHTNING_VERTICES * 3),
    vertices: 0, indexCount: 0, channels: 0, sparks: 0
  };
}
export type LightningBuffers = ReturnType<typeof createLightningBuffers>;

// Renew discharge topology at a bounded cadence, not on each rendered frame.
export function writeLightningDischarge(buffers: LightningBuffers, settings: LightningSettings, epoch: number): void {
  buffers.vertices = 0; buffers.indexCount = 0; buffers.channels = 0; buffers.sparks = 0;
  if (!Number.isFinite(settings.size) || settings.size <= 0) return;
  const size = settings.size;
  const limit = Math.max(0, Math.min(MAX_LIGHTNING_VERTICES, settings.maxVertices ?? MAX_LIGHTNING_VERTICES));
  if (limit < 4) return;
  let seed = (settings.seed ^ Math.imul(epoch + 1, 0x45d9f3b)) >>> 0;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const between = (min: number, max: number): number => min + (max - min) * random();
  const channels: Channel[] = [];
  const width = Math.max(5, Math.min(14, size * 0.035));

  function arc(from: Point, to: Point, roughness: number, depth = 5): Point[] {
    if (depth === 0) return [from, to];
    const dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const displacement = between(-roughness, roughness);
    const t = between(0.4, 0.6);
    const mid = { x: from.x + dx * t - dy / length * displacement, y: from.y + dy * t + dx / length * displacement };
    const first = arc(from, mid, roughness * 0.53, depth - 1);
    const second = arc(mid, to, roughness * 0.53, depth - 1);
    first.pop();
    return first.concat(second);
  }

  function channel(from: Point, to: Point, thickness: number, energy: number, forks: number): Point[] {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const roughness = settings.shape === "line" ? between(0.04, 0.07) : between(0.08, 0.18);
    const points = arc(from, to, length * roughness, length > size * 0.3 ? 6 : 4);
    channels.push({ points, width: thickness, energy, primary: true });
    const heading = Math.atan2(to.y - from.y, to.x - from.x);
    for (let branch = 0; branch < forks; branch++) {
      const origin = points[Math.floor(between(0.18, 0.82) * (points.length - 1))]!;
      const angle = heading + between(0.4, 1.15) * (random() < 0.5 ? -1 : 1);
      const reach = length * between(0.12, 0.33) * (settings.shape === "line" ? 0.3 : 1);
      const end = { x: origin.x + Math.cos(angle) * reach, y: origin.y + Math.sin(angle) * reach };
      const branchPoints = arc(origin, end, reach * 0.2, 3);
      channels.push({ points: branchPoints, width: thickness * between(0.35, 0.6), energy: energy * 0.65 });
      if (random() > 0.45) {
        const fork = branchPoints[4]!;
        const forkEnd = { x: fork.x + Math.cos(angle + 1) * reach * 0.4, y: fork.y + Math.sin(angle + 1) * reach * 0.4 };
        channels.push({ points: arc(fork, forkEnd, reach * 0.12, 2), width: thickness * 0.25, energy: energy * 0.45 });
      }
    }
    return points;
  }

  if (settings.shape === "line") {
    const points = channel({ x: -size / 2, y: 0 }, { x: size / 2, y: 0 }, width, 1, 9);
    for (let i = 0; i < 3; i++) {
      const begin = Math.floor(between(3, 15));
      const end = Math.min(points.length - 1, begin + Math.floor(between(15, 38)));
      const echo = arc(points[begin]!, points[end]!, size * 0.018, 5);
      channels.push({ points: echo, width: width * 0.45, energy: 0.45 });
    }
  } else if (settings.shape === "cone") {
    const origin = { x: -size / 2, y: 0 };
    const trunk = channel(origin, { x: -size * 0.12, y: between(-0.04, 0.04) * size }, width, 1, 2);
    for (let i = 0; i < 7; i++) {
      const heading = ((i + between(0.15, 0.85)) / 7 - 0.5) * 1.08;
      const reach = size * between(0.82, 1.02);
      const start = trunk[Math.floor(between(8, 31))]!;
      channel(start, { x: origin.x + Math.cos(heading) * reach, y: Math.sin(heading) * reach }, width * between(0.55, 0.82), between(0.65, 1), 4);
    }
  } else {
    // An irregular radial discharge, deliberately not a perimeter ring.
    const center = { x: between(-0.025, 0.025) * size, y: between(-0.025, 0.025) * size };
    const rotation = between(0, Math.PI * 2);
    for (let i = 0; i < 11; i++) {
      const heading = rotation + (i + between(-0.3, 0.3)) / 11 * Math.PI * 2;
      const reach = size * between(0.32, 0.51);
      channel(center, { x: Math.cos(heading) * reach, y: Math.sin(heading) * reach }, width * between(0.55, 1), between(0.7, 1), 3);
    }
  }

  if (settings.constrainArea) {
    for (const path of channels) {
      for (const point of path.points) constrainLightningPoint(point, settings.shape, size);
    }
  }
  const mainCount = channels.length;
  if (settings.sparks) {
    for (let i = 0; i < 42; i++) {
      const source = channels[Math.floor(random() * mainCount)]!;
      const point = source.points[Math.floor(between(0.45, 1) * (source.points.length - 1))]!;
      const heading = settings.shape === "circle" ? Math.atan2(point.y, point.x) + between(-0.7, 0.7) : between(0, Math.PI * 2);
      const dx = Math.cos(heading), dy = Math.sin(heading);
      const distance = between(6, 25);
      const start = { x: point.x + dx * distance, y: point.y + dy * distance };
      const length = between(3, 12);
      channels.push({
        points: [start, { x: start.x + dx * length * 0.5 - dy * 2, y: start.y + dy * length * 0.5 + dx * 2 }, { x: start.x + dx * length, y: start.y + dy * length }],
        width: between(3, 5), energy: between(0.7, 1.2), velocity: { x: dx * between(22, 95), y: dy * between(22, 95) }
      });
    }
  }
  channels.sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
  for (const path of channels) writeRibbon(buffers, path, limit);
}

function constrainLightningPoint(point: Point, shape: LightningShape, size: number): void {
  if (shape === "line") {
    point.x = Math.max(-size / 2, Math.min(size / 2, point.x));
    return;
  }
  const x = point.x + (shape === "cone" ? size / 2 : 0);
  const radius = Math.min(Math.hypot(x, point.y), size * (shape === "circle" ? 0.49 : 0.99));
  const halfAngle = LIGHTNING_CONE_APERTURE_DEGREES * Math.PI / 360;
  const angle = shape === "cone" ? Math.max(-halfAngle, Math.min(halfAngle, Math.atan2(point.y, x))) : Math.atan2(point.y, x);
  point.x = Math.cos(angle) * radius - (shape === "cone" ? size / 2 : 0);
  point.y = Math.sin(angle) * radius;
}

function writeRibbon(buffers: LightningBuffers, channel: Channel, limit: number): void {
  const { width, energy, velocity } = channel;
  const remaining = Math.floor((limit - buffers.vertices) / 2);
  if (remaining < 2) return;
  const points = channel.points.length <= remaining ? channel.points
    : Array.from({ length: remaining }, (_, index) => channel.points[Math.round(index / (remaining - 1) * (channel.points.length - 1))]!);
  const offset = buffers.vertices;
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    const before = points[Math.max(0, i - 1)]!;
    const after = points[Math.min(points.length - 1, i + 1)]!;
    const dx = after.x - before.x, dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const t = i / (points.length - 1);
    const taper = velocity ? Math.sin(Math.PI * t) * 0.7 + 0.3 : 0.3 + 0.7 * Math.pow(1 - t, 0.35);
    for (let side = -1; side <= 1; side += 2) {
      const vertex = buffers.vertices++;
      buffers.positions[vertex * 2] = point.x - dy / length * width * taper * side;
      buffers.positions[vertex * 2 + 1] = point.y + dx / length * width * taper * side;
      buffers.uvs[vertex * 2] = side;
      buffers.uvs[vertex * 2 + 1] = t;
      buffers.styles.set([velocity?.x ?? 0, velocity?.y ?? 0, energy, velocity ? 1 : 0], vertex * 4);
    }
    if (i > 0) {
      const a = offset + (i - 1) * 2;
      buffers.indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], buffers.indexCount);
      buffers.indexCount += 6;
    }
  }
  buffers.channels++;
  if (velocity) buffers.sparks++;
}
