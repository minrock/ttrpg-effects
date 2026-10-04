import { PixiViewport } from "../../render/pixi/PixiViewport";
import { createAnimatedFireEffect, createDrawnFireEffect } from "../../domain/effects/fire";
import { createDefaultSceneMapDocument } from "../../domain/sessions/default-scene";
import type { SceneFireEffect } from "../../domain/sessions/scene-document";

const host = document.querySelector<HTMLElement>("#viewport")!;
const selector = document.querySelector<HTMLSelectElement>("select")!;
const zoom = document.querySelector<HTMLInputElement>("#zoom")!;
const visible = document.querySelector<HTMLInputElement>("#visible")!;
const stats = document.querySelector<HTMLOutputElement>("#fps")!;
const viewport = await PixiViewport.create(host);
viewport.setViewRole("player");
const defaults = createDefaultSceneMapDocument();
viewport.setSettings(defaults.settings);
viewport.setGrid({ ...defaults.grid, cellSizeWorld: 60, enabled: false });
viewport.setDarkness({ ...defaults.darkness, enabled: false });
viewport.setFogOfWar({ ...defaults.fogOfWar, enabled: false });
viewport.setMap({ imagePath: null, imageUrl: createFloor(), position: { x: 0, y: 0 }, scale: 1 });

function circle(id: string, x: number, y: number, radius: number, open = false): SceneFireEffect {
  return { ...createAnimatedFireEffect(id, { x, y }), opacity: 1, emitsLight: false,
    zone: { kind: "circle", radius, mode: open ? "open" : "closed", innerRadiusRatio: open ? 0.65 : 0 } };
}

function update(): void {
  let effects: SceneFireEffect[];
  if (selector.value === "shapes") {
    effects = [
      { ...createDrawnFireEffect("fire-line", "line", { x: -470, y: -220 }, { x: 440, y: -180 }, 48), opacity: 1, emitsLight: false },
      { ...createDrawnFireEffect("fire-cone", "cone", { x: -410, y: 10 }, { x: -120, y: 70 }, 60), opacity: 1, emitsLight: false },
      circle("fire-circle", 155, 40, 100), circle("fire-ring", 385, 35, 90, true),
      { ...circle("fire-painted", 0, 230, 50), zone: { kind: "cells", radius: 30,
        cells: Array.from({ length: 11 }, (_, i) => ({ x: -270 + i * 50, y: 205 + Math.sin(i * 0.65) * 50, size: 55 })) } }
    ];
  } else if (selector.value === "large") {
    effects = [circle("large", 0, 0, 340)];
  } else if (selector.value === "many") {
    effects = Array.from({ length: 24 }, (_, index) => circle(`torch-${index}`, (index % 6 - 2.5) * 160, (Math.floor(index / 6) - 1.5) * 160, 50));
  } else {
    effects = [circle("small-torch", -420, -130, 24), circle("torch-b", -320, -130, 30),
      circle("brazier", -120, -110, 80), circle("campfire", 170, -100, 105), circle("fire-ring", -250, 180, 110, true),
      { ...circle("painted-wall", 120, 170, 40), zone: { kind: "cells", radius: 30,
        cells: Array.from({ length: 7 }, (_, i) => ({ x: 30 + i * 55, y: 135 + Math.sin(i * 0.6) * 55, size: 60 })) } }];
  }
  viewport.setEffects(visible.checked ? effects : []);
}

function fit(): void {
  viewport.setCameraSnapshot({ center: { x: 0, y: 0 }, zoom: Math.min(host.clientWidth / 1200, host.clientHeight / 780) * Number(zoom.value) });
}
selector.addEventListener("change", update);
visible.addEventListener("change", update);
zoom.addEventListener("input", fit);
const resizeObserver = new ResizeObserver(fit);
resizeObserver.observe(host);
update(); fit();

let frame = 0;
let last = performance.now();
let samples: number[] = [];
let request = 0;
function measure(now: number): void {
  samples.push(now - last);
  last = now;
  if (++frame % 60 === 0) {
    const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    stats.value = `${Math.round(1000 / average)} fps | ${average.toFixed(1)} ms`;
    samples = [];
  }
  request = requestAnimationFrame(measure);
}
request = requestAnimationFrame(measure);
window.addEventListener("pagehide", () => { cancelAnimationFrame(request); resizeObserver.disconnect(); viewport.destroy(); }, { once: true });

function createFloor(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 780;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#1b211f"; context.fillRect(0, 0, 1200, 780);
  let seed = 719;
  const random = (): number => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  for (let y = 0; y < 780; y += 60) {
    for (let x = -60; x < 1200; x += 120) {
      const shade = Math.floor(51 + random() * 18);
      const left = x + (y / 60 % 2) * 60;
      context.fillStyle = `rgb(${shade}, ${shade + 5}, ${shade + 1})`;
      context.fillRect(left + 2, y + 2, 116, 56);
      context.strokeStyle = "#73756b55"; context.strokeRect(left + 3, y + 3, 114, 54);
    }
  }
  const image = context.getImageData(0, 0, 1200, 780);
  for (let i = 0; i < image.data.length; i += 4) {
    const grain = (random() - 0.5) * 18;
    image.data[i] += grain; image.data[i + 1] += grain; image.data[i + 2] += grain;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}
