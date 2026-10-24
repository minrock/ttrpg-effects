import type { DicePresentation } from "../../../domain/dice/dice";
import { CRITICAL_CELEBRATION_MS, criticalIsActive } from "../../../domain/dice/critical";
import { lightningSeed } from "../../../domain/effects/lightning";
import { createLightningBuffers, writeLightningDischarge } from "../../pixi/lightning-discharge";

export interface DieScreenBounds { x: number; y: number; w: number; h: number }

// A small 2D overlay keeps the settled Three scene and the map idle during the celebration.
export class CriticalDiceLightning {
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d");
  private readonly buffers = createLightningBuffers();
  private presentation: DicePresentation | null = null;
  private bounds: DieScreenBounds | null = null;
  private frame = 0;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private epoch = -1;
  private lastFrame = -Infinity;
  private size = 0;
  private reduced = false;

  constructor(host: HTMLElement) {
    this.canvas.className = "dice-critical-lightning";
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.hidden = true;
    host.append(this.canvas);
  }

  present(presentation: DicePresentation, bounds: DieScreenBounds, reduced: boolean): void {
    if (!this.context || !criticalIsActive(presentation, Date.now())) { this.clear(); return; }
    this.pause(); clearTimeout(this.expiry);
    if (this.presentation?.rollId !== presentation.rollId) this.epoch = -1;
    this.presentation = presentation; this.bounds = bounds; this.reduced = reduced;
    const radius = Math.hypot(bounds.w, bounds.h) / 2;
    this.size = Math.min(360, Math.max(96, Math.ceil(radius * 4.8 + 20)));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.ceil(this.size * ratio); this.canvas.height = Math.ceil(this.size * ratio);
    Object.assign(this.canvas.style, { width: `${this.size}px`, height: `${this.size}px`, left: `${bounds.x + bounds.w / 2 - this.size / 2}px`, top: `${bounds.y + bounds.h / 2 - this.size / 2}px` });
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.canvas.hidden = false;
    this.expiry = setTimeout(() => this.clear(), Math.max(0, presentation.settledAt + CRITICAL_CELEBRATION_MS - Date.now()));
    this.lastFrame = -Infinity; this.draw();
  }

  private draw = (): void => {
    const ctx = this.context, value = this.presentation, bounds = this.bounds, now = Date.now();
    if (!ctx || !value || !bounds || !criticalIsActive(value, now)) { this.clear(); return; }
    if (document.hidden) { this.pause(); return; }
    if (now - this.lastFrame >= 1000 / 30) {
      this.lastFrame = now;
      const elapsed = now - value.settledAt, epoch = this.reduced ? 0 : Math.floor(elapsed / 120);
      if (epoch !== this.epoch) {
        this.epoch = epoch;
        writeLightningDischarge(this.buffers, { shape: "circle", size: 200, seed: lightningSeed(value.rollId), sparks: true, maxVertices: 2048 }, epoch);
      }
      const scale = (this.size - 28) / 250, center = this.size / 2;
      ctx.clearRect(0, 0, this.size, this.size);
      // Protect only the printed number; lightning still crosses the rest of the die.
      const numberRadius = Math.min(bounds.w, bounds.h) * .18;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.size, this.size);
      ctx.moveTo(center + numberRadius, center); ctx.arc(center, center, numberRadius, 0, Math.PI * 2); ctx.clip("evenodd");
      ctx.translate(center, center); ctx.scale(scale, scale);
      ctx.beginPath();
      const { indices, positions, indexCount } = this.buffers;
      for (let i = 0; i < indexCount; i += 6) {
        const a = indices[i] * 2, b = indices[i + 2] * 2;
        ctx.moveTo((positions[a] + positions[a + 2]) / 2, (positions[a + 1] + positions[a + 3]) / 2);
        ctx.lineTo((positions[b] + positions[b + 2]) / 2, (positions[b + 1] + positions[b + 3]) / 2);
      }
      const fade = this.reduced ? .85 : Math.min(1, elapsed / 150, (CRITICAL_CELEBRATION_MS - elapsed) / 650);
      ctx.globalAlpha = Math.max(0, fade); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "#4bd3ff"; ctx.lineWidth = 6; ctx.shadowColor = "#41cfff"; ctx.shadowBlur = 10; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#efffff"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    if (!this.reduced) this.frame = requestAnimationFrame(this.draw);
  };

  pause(): void { cancelAnimationFrame(this.frame); this.frame = 0; }
  clear(): void {
    this.pause(); clearTimeout(this.expiry); this.presentation = null; this.bounds = null; this.epoch = -1;
    this.canvas.hidden = true; this.context?.clearRect(0, 0, this.size, this.size);
  }
  dispose(): void { this.clear(); this.canvas.remove(); }
}
