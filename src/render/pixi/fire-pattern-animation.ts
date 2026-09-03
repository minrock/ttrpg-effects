import { Assets, Rectangle, Texture, Sprite } from "pixi.js";
import atlas from "./fire-preview-atlas.json";

export const FIRE_PREVIEW_ATLAS_URL = "effects/fiya2-preview.png";

/** One clock and one atlas per viewport, regardless of the number of visible tiles. */
export class FirePatternAnimation {
  private readonly frames: { readonly texture: Texture; readonly endMs: number }[];
  private readonly subscribers = new Map<Sprite, { readonly phase: number; readonly unregister: () => void }>();
  private readonly durationMs: number;
  private frameIndex = 0;
  private disposed = false;

  constructor(texture: Texture) {
    let endMs = 0;
    this.frames = atlas.frames.map((frame) => {
      endMs += frame.durationMs;
      return {
        texture: new Texture({
          source: texture.source,
          frame: new Rectangle(frame.x, frame.y, frame.width, frame.height)
        }),
        endMs
      };
    });
    this.durationMs = endMs;
  }

  get spriteCount(): number {
    return this.subscribers.size;
  }

  createSprite(width: number, height: number, phase = 0): Sprite {
    if (this.disposed) throw new Error("Fire animation has been destroyed.");
    const frameOffset = Math.floor(Math.abs(phase)) % this.frames.length;
    const sprite = new Sprite({ texture: this.frames[(this.frameIndex + frameOffset) % this.frames.length]!.texture, width, height });
    const unregister = (): void => { this.subscribers.delete(sprite); };
    this.subscribers.set(sprite, { phase: frameOffset, unregister });
    sprite.once("destroyed", unregister);
    return sprite;
  }

  update(nowMs: number): void {
    if (this.disposed || this.subscribers.size === 0) return;
    const elapsed = Math.max(0, nowMs) % this.durationMs;
    const nextIndex = this.frames.findIndex((frame) => elapsed < frame.endMs);
    if (nextIndex === this.frameIndex) return;
    this.frameIndex = nextIndex;
    for (const [sprite, { phase }] of this.subscribers) {
      sprite.texture = this.frames[(nextIndex + phase) % this.frames.length]!.texture;
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [sprite, { unregister }] of this.subscribers) sprite.off("destroyed", unregister);
    this.subscribers.clear();
    // Frame views belong to this viewport; the shared atlas remains owned by Assets.
    for (const frame of this.frames) frame.texture.destroy(false);
  }
}

export async function loadFirePatternAnimation(): Promise<FirePatternAnimation | null> {
  try {
    return new FirePatternAnimation(await Assets.load<Texture>(FIRE_PREVIEW_ATLAS_URL));
  } catch (error) {
    console.warn("No se pudo cargar el atlas experimental de fuego.", error);
    return null;
  }
}
