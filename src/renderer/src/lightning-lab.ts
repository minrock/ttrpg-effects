import { Application, Container, Sprite, Texture } from "pixi.js";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Circle, Grid3X3, LayoutGrid, MoveRight, Pause, Play, Shuffle, Triangle, type LucideIcon } from "lucide-react";
import { ProceduralLightning } from "../../render/pixi/procedural-lightning";
import type { LightningShape } from "../../render/pixi/lightning-discharge";

const host = document.querySelector<HTMLElement>("#viewport")!;
const input = (id: string): HTMLInputElement => document.querySelector<HTMLInputElement>(`#${id}`)!;
const stats = document.querySelector<HTMLOutputElement>("#fps")!;
const iconRoots = new Map<Element, Root>();
function icon(element: Element, component: LucideIcon): void {
  let root = iconRoots.get(element);
  if (!root) { root = createRoot(element); iconRoots.set(element, root); }
  root.render(createElement(component, { size: 17, strokeWidth: 1.7, "aria-hidden": true }));
}
const icons: Record<string, LucideIcon> = { mixed: LayoutGrid, line: MoveRight, cone: Triangle, circle: Circle, many: Grid3X3 };
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button => icon(button, icons[button.dataset.mode!]!));
const pause = document.querySelector<HTMLButtonElement>("#pause")!;
icon(pause, Pause); icon(document.querySelector("#reseed")!, Shuffle);

const app = new Application();
await app.init({ preference: "webgl", antialias: true, background: "#14181b", resizeTo: host, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
host.append(app.canvas);
const world = new Container();
app.stage.addChild(world);
const floorTexture = Texture.from(createFloor());
const floor = new Sprite(floorTexture);
floor.anchor.set(0.5);
world.addChild(floor);
let effects: ProceduralLightning[] = [];
let mode = "mixed", seed = 1341, paused = false, elapsed = 17;
let frames: number[] = [], cpu: number[] = [], lastReport = performance.now();

function rebuild(): void {
  for (const effect of effects) effect.destroy();
  effects = [];
  const add = (shape: LightningShape, size: number, x: number, y: number, rotation = 0): void => {
    const effect = new ProceduralLightning({ shape, size, seed: seed + effects.length * 317, sparks: input("sparks").checked });
    effect.container.position.set(x, y); effect.container.rotation = rotation;
    effect.update(elapsed, Number(input("intensity").value));
    effects.push(effect); world.addChild(effect.container);
  };
  if (mode === "mixed") {
    add("cone", 520, -200, -100, -0.1);
    add("circle", 315, 380, -100);
    add("line", 1060, 0, 260);
  } else if (mode === "many") {
    for (let i = 0; i < 24; i++) add((["line", "cone", "circle"] as const)[i % 3]!, 145, (i % 6 - 2.5) * 205, (Math.floor(i / 6) - 1.5) * 195);
  } else {
    add(mode as LightningShape, mode === "line" ? 1120 : 630, 0, 0);
  }
}
function fit(): void {
  const scale = Math.min(host.clientWidth / 1400, host.clientHeight / 870) * Number(input("zoom").value);
  world.position.set(host.clientWidth / 2, host.clientHeight / 2);
  world.scale.set(scale);
}
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button => button.addEventListener("click", () => {
  mode = button.dataset.mode!;
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
  rebuild();
}));
input("sparks").addEventListener("change", rebuild);
input("zoom").addEventListener("input", fit);
input("floor").addEventListener("change", () => { floor.visible = input("floor").checked; });
document.querySelector("#reseed")!.addEventListener("click", () => { seed += 713; rebuild(); });
pause.addEventListener("click", () => {
  paused = !paused; icon(pause, paused ? Play : Pause);
  pause.setAttribute("aria-pressed", String(paused));
  pause.setAttribute("aria-label", paused ? "Reanudar" : "Pausar");
  pause.title = paused ? "Reanudar" : "Pausar";
});
const observer = new ResizeObserver(fit);
observer.observe(host);
rebuild(); fit();

app.ticker.add(ticker => {
  if (!paused) elapsed += Math.min(ticker.deltaMS, 50) / 1000 * Number(input("speed").value);
  const start = performance.now();
  for (const effect of effects) effect.update(elapsed, Number(input("intensity").value));
  cpu.push(performance.now() - start);
  frames.push(ticker.elapsedMS);
  const now = performance.now();
  if (now - lastReport >= 1000) {
    const average = frames.reduce((a, b) => a + b, 0) / frames.length;
    const sorted = cpu.sort((a, b) => a - b);
    stats.value = `${Math.round(1000 / average)} fps | CPU p95 ${sorted[Math.floor(sorted.length * 0.95)]!.toFixed(2)} ms | ${effects.length * 2} meshes`;
    frames = []; cpu = []; lastReport = now;
  }
});
app.canvas.addEventListener("webglcontextlost", () => { document.querySelector("#status")!.textContent = "Contexto WebGL perdido"; });
window.addEventListener("pagehide", () => {
  observer.disconnect(); for (const effect of effects) effect.destroy();
  for (const root of iconRoots.values()) root.unmount();
  floorTexture.destroy(true); app.destroy(true, { children: true });
}, { once: true });

function createFloor(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1400; canvas.height = 870;
  const context = canvas.getContext("2d")!;
  let state = 912;
  const random = (): number => { state = Math.imul(state, 1664525) + 1013904223 | 0; return (state >>> 0) / 4294967296; };
  context.fillStyle = "#292c2b"; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 870; y += 70) {
    for (let x = -140; x < 1400; x += 140) {
      const left = x + (y / 70 % 2) * 70;
      const shade = Math.floor(65 + random() * 20);
      context.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade - 1})`;
      context.fillRect(left + 2, y + 2, 135, 65);
      context.strokeStyle = "#92958935"; context.strokeRect(left + 4, y + 4, 131, 61);
      if (random() < 0.3) {
        context.strokeStyle = "#20242155"; context.beginPath();
        const crackX = left + random() * 130;
        context.moveTo(crackX, y + 2); context.lineTo(crackX + 12, y + 20);
        context.lineTo(crackX - 5, y + 32); context.lineTo(crackX + 4, y + 46); context.stroke();
      }
    }
  }
  const pixels = context.getImageData(0, 0, 1400, 870);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (random() - 0.5) * 23;
    pixels.data[i] += grain; pixels.data[i + 1] += grain; pixels.data[i + 2] += grain;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}
