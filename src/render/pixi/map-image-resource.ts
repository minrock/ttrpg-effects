import { Assets, type Texture } from "pixi.js";

export interface ImageResourceLease {
  readonly ready: Promise<Texture>;
  release(): void;
}

export interface PreparedMapImageResource {
  readonly width: number;
  readonly height: number;
  readonly previewUrl?: string;
  release(): void;
}

interface ResourceEntry {
  ready: Promise<Texture>;
  references: number;
  loaded: boolean;
  borrowed: boolean;
  unloading?: Promise<void>;
}

// One registry per renderer realm. Maps, preparation previews and tokens must
// acquire leases here so none can unload a texture still used by another.
const resources = new Map<string, ResourceEntry>();

// Conservative fallback before a renderer can report its actual capability.
export const MAX_MAP_IMAGE_DIMENSION = 8192;
const rendererLimits = new Set<{ readonly size: number }>();

export class MapImageResourceError extends Error {}

export function registerMapImageTextureLimit(size: number): () => void {
  const limit = { size: Number.isFinite(size) && size > 0 ? size : MAX_MAP_IMAGE_DIMENSION };
  rendererLimits.add(limit);
  return () => { rendererLimits.delete(limit); };
}

export function validateMapImageTexture(texture: Texture): void {
  const maxDimension = rendererLimits.size === 0
    ? MAX_MAP_IMAGE_DIMENSION
    : Math.min(...Array.from(rendererLimits, limit => limit.size));
  if (texture.width > maxDimension || texture.height > maxDimension) {
    throw new MapImageResourceError(`La imagen supera el limite de ${maxDimension} pixeles por lado del renderer.`);
  }
}

function retire(url: string, entry: ResourceEntry): void {
  if (entry.references !== 0 || entry.unloading !== undefined) return;
  if (!entry.loaded || entry.borrowed) {
    if (resources.get(url) === entry) resources.delete(url);
    return;
  }
  entry.unloading = Promise.resolve().then(() => Assets.unload(url)).catch(() => {
    // Cleanup must not turn a cancelled request into an unhandled rejection.
  }).then(() => {
    if (resources.get(url) === entry) resources.delete(url);
  });
}

export function acquireImageResource(url: string): ImageResourceLease {
  let entry = resources.get(url);
  if (entry === undefined || entry.unloading !== undefined) {
    const previousUnload = entry?.unloading;
    const ready = Promise.resolve(previousUnload).then(async () => {
      // Assets loaded outside this registry have an unknown owner.
      next.borrowed = Assets.cache.has(url);
      const texture = await Assets.load<Texture>(url);
      next.loaded = true;
      if (texture.destroyed || !Number.isInteger(texture.width) || !Number.isInteger(texture.height)
        || texture.width <= 0 || texture.height <= 0) {
        throw new MapImageResourceError("La imagen no tiene dimensiones validas.");
      }
      return texture;
    });
    const next: ResourceEntry = { ready, references: 0, loaded: false, borrowed: false };
    resources.set(url, next);
    entry = next;
  }
  const current = entry;
  current.references++;
  let released = false;
  return {
    ready: current.ready,
    release() {
      if (released) return;
      released = true;
      current.references--;
      void current.ready.then(() => retire(url, current), () => retire(url, current));
    }
  };
}

/** Hold through confirmation until the matching viewport load completes. */
export async function prepareMapImageResource(url: string): Promise<PreparedMapImageResource> {
  const lease = acquireImageResource(url);
  try {
    const texture = await lease.ready;
    validateMapImageTexture(texture);
    return { width: texture.width, height: texture.height, previewUrl: createPreview(texture), release: lease.release };
  } catch (error) {
    lease.release();
    throw error;
  }
}

function createPreview(texture: Texture): string | undefined {
  if (typeof document === "undefined") return undefined;
  const source: unknown = texture.source.resource;
  if (!(typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement)
    && !(typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement)
    && !(typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
    && !(typeof OffscreenCanvas !== "undefined" && source instanceof OffscreenCanvas)) return undefined;
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 512 / Math.max(texture.width, texture.height));
    canvas.width = Math.max(1, Math.round(texture.width * scale));
    canvas.height = Math.max(1, Math.round(texture.height * scale));
    const context = canvas.getContext("2d");
    if (context === null) return undefined;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/png");
    return url.startsWith("data:image/png;") ? url : undefined;
  } catch {
    // Unsupported/tainted sources must never fall back to fetching the old URL:
    // the file may have changed since this texture was decoded.
    return undefined;
  }
}
