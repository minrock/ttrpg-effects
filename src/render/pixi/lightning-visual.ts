import { Container, Graphics } from "pixi.js";
import type { SceneLightningEffect } from "../../domain/sessions/scene-document";
import { lightningCenter, lightningDirection, lightningLength, lightningPhase } from "../../domain/effects/lightning";
import { createLightningBuffers, MAX_LIGHTNING_VERTICES, writeLightningDischarge, type LightningSettings } from "./lightning-discharge";
import { drawLightningGuide } from "./lightning-guides";
import { ProceduralLightning } from "./procedural-lightning";

export const MAX_LIGHTNING_MAP_VERTICES = 131072;
export function lightningVertexBudget(visibleCount: number): number {
  return Math.max(0, Math.min(MAX_LIGHTNING_VERTICES, Math.floor(MAX_LIGHTNING_MAP_VERTICES / (Math.max(1, visibleCount) * 2))));
}

export class LightningVisual {
  readonly container = new Container();
  private readonly body = new Container();
  private procedural: ProceduralLightning | null = null;
  private guide: Graphics | null = null;
  private geometrySignature = "";
  private guideSignature = "";
  private disposed = false;
  private effect: SceneLightningEffect;

  constructor(effect: SceneLightningEffect, private readonly webgl: boolean, budget: number) {
    this.effect = effect;
    this.container.label = effect.id;
    this.container.addChild(this.body);
    this.container.once("destroyed", () => this.destroy());
    this.configure(effect, budget);
  }

  configure(effect: SceneLightningEffect, budget: number): void {
    this.effect = effect;
    const length = lightningLength(effect);
    const settings: LightningSettings = { shape: effect.zone.kind, size: effect.zone.kind === "circle" ? length * 2 : length,
      seed: effect.seed, sparks: effect.sparks, maxVertices: budget, constrainArea: true };
    const signature = JSON.stringify(settings);
    if (signature !== this.geometrySignature) {
      this.geometrySignature = signature;
      if (this.webgl) {
        if (!this.procedural) { this.procedural = new ProceduralLightning(settings); this.body.addChild(this.procedural.container); }
        else this.procedural.configure(settings);
      } else {
        for (const child of this.body.removeChildren()) child.destroy();
        const data = createLightningBuffers();
        writeLightningDischarge(data, settings, 0);
        const graphic = new Graphics();
        for (let i = 0; i < data.indexCount; i += 6) {
          const a = data.indices[i]! * 2, b = data.indices[i + 2]! * 2;
          graphic.moveTo((data.positions[a]! + data.positions[a + 2]!) / 2, (data.positions[a + 1]! + data.positions[a + 3]!) / 2)
            .lineTo((data.positions[b]! + data.positions[b + 2]!) / 2, (data.positions[b + 1]! + data.positions[b + 3]!) / 2);
        }
        graphic.stroke({ color: 0xa6f1ef, width: 1.8 });
        this.body.addChild(graphic);
      }
    }
    this.body.position.copyFrom(lightningCenter(effect));
    this.body.rotation = lightningDirection(effect);
    this.body.alpha = effect.opacity;
    const guideSignature = JSON.stringify([effect.zone, effect.position, effect.showGuide]);
    if (guideSignature !== this.guideSignature) {
      this.guideSignature = guideSignature;
      this.guide?.destroy(); this.guide = null;
      if (effect.showGuide && effect.zone.kind !== "line") {
        this.guide = drawLightningGuide(effect);
        this.container.addChildAt(this.guide, 0);
      }
    }
    this.update(Date.now());
  }

  update(nowMs: number): void {
    if (!this.disposed) this.procedural?.update(lightningPhase(this.effect, nowMs), this.effect.intensity);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.procedural?.destroy();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
