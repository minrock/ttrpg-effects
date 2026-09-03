import { afterEach, describe, expect, it, vi } from "vitest";
import { Texture, TextureSource, Sprite } from "pixi.js";
import { FirePatternAnimation } from "./fire-pattern-animation";
import atlas from "./fire-preview-atlas.json";

const cleanup: (() => void)[] = [];

function createAnimation(): { animation: FirePatternAnimation; texture: Texture } {
  const texture = new Texture({ source: new TextureSource({ width: atlas.width, height: atlas.height }) });
  const animation = new FirePatternAnimation(texture);
  cleanup.push(() => { animation.destroy(); texture.destroy(true); });
  return { animation, texture };
}

function createSprite(animation: FirePatternAnimation, size = 100, phase = 0): Sprite {
  const sprite = animation.createSprite(size, size, phase);
  cleanup.push(() => { if (!sprite.destroyed) sprite.destroy(); });
  return sprite;
}

afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) dispose();
});

describe("shared fire pattern animation", () => {
  it("shares a single atlas across sprites and all 32 frames", () => {
    const { animation, texture } = createAnimation();
    const first = createSprite(animation);
    const second = createSprite(animation);
    for (let index = 0; index < atlas.frames.length; index++) {
      animation.update(index * 40);
      expect(first.texture).toBe(second.texture);
      expect(first.texture.source).toBe(texture.source);
      expect(first.texture.frame.x).toBe(atlas.frames[index]?.x);
    }
    expect(atlas.width * atlas.height * 4).toBeLessThan(3 * 1024 * 1024);
  });

  it("only updates textures when the source frame changes", () => {
    const { animation } = createAnimation();
    const sprite = createSprite(animation);
    const setTexture = vi.spyOn(sprite, "texture", "set");
    animation.update(10);
    animation.update(20);
    expect(setTexture).not.toHaveBeenCalled();
    animation.update(40);
    animation.update(60);
    expect(setTexture).toHaveBeenCalledTimes(1);
  });

  it("uses different frames for flames with different phases on the same clock", () => {
    const { animation, texture } = createAnimation();
    const first = createSprite(animation, 100, 0);
    const second = createSprite(animation, 100, 13);
    const mirrored = createSprite(animation, 100, 5);
    mirrored.scale.x *= -1;
    for (let frame = 0; frame < 64; frame++) {
      animation.update(frame * 40);
      expect(first.texture).not.toBe(second.texture);
      expect(second.texture.source).toBe(texture.source);
      expect(second.texture.frame.x).toBe(atlas.frames[(frame + 13) % 32]?.x);
      expect(second.texture.frame.y).toBe(atlas.frames[(frame + 13) % 32]?.y);
      expect(mirrored.scale.x).toBeLessThan(0);
    }
  });

  it("new or rebuilt effects join the current frame rather than restarting", () => {
    const { animation } = createAnimation();
    const first = createSprite(animation, 100, 8);
    animation.update(360);
    expect(createSprite(animation, 100, 8).texture).toBe(first.texture);
  });

  it("loops correctly and skips elapsed frames after a long pause", () => {
    const { animation } = createAnimation();
    const sprite = createSprite(animation);
    const initialTexture = sprite.texture;
    animation.update(1280 * 1000);
    expect(sprite.texture).toBe(initialTexture);
    animation.update(1280 * 1000 + 80);
    expect(sprite.texture.frame.x).toBe(atlas.frames[2]?.x);
  });

  it("unsubscribes destroyed effects instead of retaining their sprites", () => {
    const { animation } = createAnimation();
    const sprite = createSprite(animation);
    sprite.destroy();
    expect(animation.spriteCount).toBe(0);
    expect(() => animation.update(80)).not.toThrow();
  });

  it("destroys viewport frame views without destroying the shared atlas", () => {
    const { animation, texture } = createAnimation();
    createSprite(animation);
    const otherViewport = new FirePatternAnimation(texture);
    cleanup.push(() => otherViewport.destroy());
    const otherSprite = createSprite(otherViewport);
    animation.destroy();
    expect(animation.spriteCount).toBe(0);
    expect(texture.destroyed).toBe(false);
    otherViewport.update(80);
    expect(otherSprite.texture.source).toBe(texture.source);
    expect(() => animation.createSprite(100, 100)).toThrow();
  });
});
