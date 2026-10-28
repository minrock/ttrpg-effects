import { AmbientLight, Box3, Color, DirectionalLight, Mesh, OrthographicCamera, PCFSoftShadowMap, PlaneGeometry, Quaternion, Scene, ShadowMaterial, sRGBEncoding, Vector3, WebGLRenderer } from "three";
import type { DicePresentation } from "../../../domain/dice/dice";
import { physicalDieColor } from "../../../domain/dice/appearance";
import { criticalIsActive } from "../../../domain/dice/critical";
import { diceReplayBounds, fitDiceView, DICE_VIEW_UP_Y, DICE_VIEW_UP_Z, type DiceBounds } from "../../../domain/dice/size";
import { CriticalDiceLightning, type DieScreenBounds } from "./CriticalDiceLightning";
import { DiceFactory, type DiceMesh } from "./vendor/DiceFactory.js";

const SCALE = .008;

export class DiceOverlayRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-10, 10, 6, -6, .1, 100);
  private readonly factory = new DiceFactory({ baseScale: 100, bumpMapping: false });
  private readonly floor = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: .25 }));
  private readonly light = new DirectionalLight(0xffffff, 1.7);
  private meshes: DiceMesh[] = [];
  private labels: HTMLSpanElement[] = [];
  private presentation: DicePresentation | null = null;
  private frame = 0;
  private readonly observer: ResizeObserver;
  private appearanceKey = "";
  private disposed = false;
  private critical: CriticalDiceLightning | null = null;
  private readonly nextQuaternion = new Quaternion();
  private requestedSize = 1;
  private fitKey = "";
  private rollingBounds: DiceBounds | null = null;
  private settledBounds: DiceBounds | null = null;
  private readonly onVisibility = (): void => { cancelAnimationFrame(this.frame); this.critical?.pause(); if (!document.hidden) this.draw(); };
  private readonly onContextLost = (event: Event): void => { event.preventDefault(); cancelAnimationFrame(this.frame); this.critical?.clear(); this.onError(); };

  constructor(private readonly host: HTMLElement, private readonly onError: () => void, private readonly onSize: (effective: number) => void = () => {}) {
    this.renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Dados 3D");
    host.append(this.renderer.domElement);
    this.camera.position.set(0, -2, 32);
    this.camera.lookAt(0, 0, 0);
    this.floor.receiveShadow = true;
    this.floor.position.z = -.02;
    this.scene.add(this.floor, new AmbientLight(0xffffff, 1.15));
    this.light.position.set(-5, 8, 18);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    Object.assign(this.light.shadow.camera, { left: -11, right: 11, top: 7, bottom: -7, near: 1, far: 40 });
    this.light.shadow.bias = -.0005;
    this.scene.add(this.light);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
    this.resize();
  }

  present(value: DicePresentation | null): void {
    cancelAnimationFrame(this.frame);
    if (value?.rollId !== this.presentation?.rollId || value === null) {
      this.critical?.clear();
      this.clearMeshes();
      if (value?.replay) {
        const key = JSON.stringify(value.appearance);
        if (key !== this.appearanceKey) { this.clearTextures(); this.appearanceKey = key; }
        this.meshes = value.dice.map(die => {
          const background = physicalDieColor(die, value.appearance);
          const c = new Color(background), foreground = c.r * .2126 + c.g * .7152 + c.b * .0722 > .58 ? "#202a30" : "#fff4cf";
          this.factory.applyColorSet({ foreground, background, outline: "none", edge: background, texture: { name: "none", material: "plastic" } });
          const mesh = this.factory.create(die.type);
          mesh.scale.setScalar(SCALE);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          for (const mat of mesh.material) {
            mat.depthTest = true; mat.transparent = false;
            mat.metalness = value.appearance.material === "metal" ? .45 : 0;
            mat.roughness = value.appearance.material === "matte" ? .95 : value.appearance.material === "metal" ? .3 : .42;
            if (mat.map) mat.map.encoding = sRGBEncoding;
          }
          this.scene.add(mesh);
          const label = document.createElement("span"); label.className = "dice-piece-label"; label.hidden = true;
          this.host.append(label); this.labels.push(label);
          return mesh;
        });
        const radii = this.meshes.map(mesh => {
          mesh.geometry.computeBoundingSphere();
          const sphere = mesh.geometry.boundingSphere!;
          return (sphere.radius + sphere.center.length()) * SCALE;
        });
        this.rollingBounds = diceReplayBounds(value.replay, radii, false);
        this.settledBounds = diceReplayBounds(value.replay, radii, true);
      }
    }
    this.presentation = value;
    this.host.hidden = !value?.replay;
    this.draw();
  }

  setSize(scale: number): void {
    const requested = Number.isFinite(scale) ? Math.max(1, Math.min(2.5, scale)) : 1;
    if (requested === this.requestedSize) return;
    this.requestedSize = requested;
    cancelAnimationFrame(this.frame); this.draw();
  }

  private resize(): void {
    const { width, height } = this.host.getBoundingClientRect();
    if (width < 1 || height < 1 || this.disposed) return;
    this.renderer.setSize(width, height, false);
    cancelAnimationFrame(this.frame);
    this.draw();
  }

  private fitCamera(settled: boolean): void {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    const key = `${width}:${height}:${this.requestedSize}:${settled}`;
    if (key === this.fitKey) return;
    this.fitKey = key;
    const fit = fitDiceView(width, height, this.requestedSize, settled ? this.settledBounds : this.rollingBounds);
    this.camera.left = -fit.halfWidth; this.camera.right = fit.halfWidth;
    this.camera.top = fit.halfHeight; this.camera.bottom = -fit.halfHeight;
    this.camera.zoom = fit.scale;
    this.camera.position.set(fit.x, -2 + fit.y * DICE_VIEW_UP_Y, 32 + fit.y * DICE_VIEW_UP_Z);
    this.camera.lookAt(fit.x, fit.y * DICE_VIEW_UP_Y, fit.y * DICE_VIEW_UP_Z);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.host.dataset.requestedSize = String(this.requestedSize);
    this.host.dataset.effectiveSize = String(fit.scale);
    this.onSize(fit.scale);
  }

  private draw = (): void => {
    if (this.disposed || document.hidden || !this.presentation?.replay || this.host.clientWidth < 1 || this.host.clientHeight < 1) return;
    const { replay, startedAt } = this.presentation;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = reduced ? replay.durationMs : Math.max(0, Date.now() - startedAt);
    const frame = Math.min(replay.frameCount - 1, elapsed / replay.stepMs), a = Math.floor(frame), b = Math.min(a + 1, replay.frameCount - 1), mix = frame - a;
    for (let i = 0; i < this.meshes.length; i++) {
      const first = (a * this.meshes.length + i) * 7, second = (b * this.meshes.length + i) * 7, data = replay.frames, mesh = this.meshes[i];
      mesh.position.set(data[first] + (data[second] - data[first]) * mix, data[first + 1] + (data[second + 1] - data[first + 1]) * mix, data[first + 2] + (data[second + 2] - data[first + 2]) * mix);
      mesh.quaternion.fromArray(data, first + 3);
      this.nextQuaternion.fromArray(data, second + 3);
      mesh.quaternion.slerp(this.nextQuaternion, mix);
    }
    try {
      this.fitCamera(elapsed >= replay.durationMs);
      this.renderer.render(this.scene, this.camera);
      this.host.dataset.diceCount = String(this.meshes.length);
      this.host.dataset.rollId = this.presentation.rollId;
      this.host.dataset.motion = elapsed < replay.durationMs ? "rolling" : "settled";
      this.positionLabels(elapsed >= replay.durationMs);
      this.positionCritical(reduced);
    } catch { this.onError(); return; }
    if (elapsed < replay.durationMs) this.frame = requestAnimationFrame(this.draw);
  };

  private positionLabels(settled: boolean): void {
    const value = this.presentation, result = value?.result;
    if (!settled || !result || !value) { this.labels.forEach(label => { label.hidden = true; }); return; }
    const hostWidth = this.host.clientWidth, hostHeight = this.host.clientHeight;
    const occupied = this.meshes.map(mesh => this.screenBounds(mesh));
    for (let i = 0; i < this.labels.length; i++) {
      const label = this.labels[i]; label.hidden = false;
      const die = value.dice[i], logical = result.groups.flatMap(g => g.dice).find(d => d.id === die.logicalId);
      const index = value.dice.slice(0, i).filter(d => d.role === "check").length;
      const face = die.role === "check" ? result.d20?.values[index] : die.role === "tens" ? String(logical?.parts[0] ?? 0).padStart(2, "0") : die.role === "units" ? logical?.parts[1] : logical?.value;
      label.textContent = `${die.role === "tens" ? "decenas" : die.role === "units" ? "unidades" : die.type} · ${face}`;
      label.classList.toggle("is-discarded", die.role === "check" && index !== result.d20?.selected);
      const bounds = occupied[i], width = label.offsetWidth;
      const x = Math.max(0, Math.min(hostWidth - width, bounds.x + (bounds.w - width) / 2));
      const baseY = bounds.y + bounds.h + 4;
      let y = Math.max(0, Math.min(hostHeight - 20, baseY));
      for (let attempt = 1; attempt < Math.ceil(hostHeight / 10) && occupied.some(rect => y < rect.y + rect.h + 2 && y + 20 > rect.y && x < rect.x + rect.w + 2 && x + width > rect.x); attempt++) {
        const offset = Math.ceil(attempt / 2) * 22 * (attempt % 2 ? 1 : -1);
        y = Math.max(0, Math.min(hostHeight - 20, baseY + offset));
      }
      occupied.push({ x, y, w: width, h: 20 }); label.style.left = `${x}px`; label.style.top = `${y}px`;
    }
  }

  private screenBounds(mesh: DiceMesh): DieScreenBounds {
    const box = new Box3().setFromObject(mesh), points: Vector3[] = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new Vector3(x, y, z).project(this.camera));
    const xs = points.map(p => (p.x + 1) * this.host.clientWidth / 2), ys = points.map(p => (1 - p.y) * this.host.clientHeight / 2);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }

  private positionCritical(reduced: boolean): void {
    const value = this.presentation;
    if (!value || !criticalIsActive(value, Date.now())) { this.critical?.clear(); return; }
    const index = value.dice.findIndex(die => die.id === value.critical?.dieId), mesh = this.meshes[index];
    if (!mesh) { this.critical?.clear(); return; }
    this.critical ??= new CriticalDiceLightning(this.host);
    this.critical.present(value, this.screenBounds(mesh), reduced);
  }

  private clearMeshes(): void { for (const mesh of this.meshes) { this.scene.remove(mesh); mesh.material.forEach(mat => mat.dispose()); } this.meshes = []; this.labels.forEach(label => label.remove()); this.labels = []; this.fitKey = ""; this.rollingBounds = null; this.settledBounds = null; }
  private clearTextures(): void { for (const entry of Object.values(this.factory.materials_cache)) { entry.composite.dispose(); entry.bump?.dispose(); } this.factory.materials_cache = {}; }
  dispose(): void {
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.critical?.dispose();
    this.clearMeshes(); this.clearTextures(); Object.values(this.factory.geometries).forEach(g => g.dispose());
    this.floor.geometry.dispose(); this.floor.material.dispose(); this.light.shadow.map?.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
