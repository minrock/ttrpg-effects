// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceTools } from "./WorkspaceTools";

describe("Workspace chrome", () => {
  let root: Root, host: HTMLDivElement;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
  function button(name: string): HTMLButtonElement {
    const node = [...host.querySelectorAll("button")].find(item => item.getAttribute("aria-label") === name || item.textContent === name);
    expect(node, name).toBeDefined(); return node!;
  }
  async function click(name: string): Promise<void> { await act(async () => button(name).click()); }
  function header(overrides: Partial<ComponentProps<typeof WorkspaceHeader>> = {}): ComponentProps<typeof WorkspaceHeader> {
    return { sceneName: "Escena guardada", busy: false, battleActive: false,
      explorerVisible: true, inspectorVisible: true, onSave: vi.fn(),
      onPlayer: vi.fn(), onBattle: vi.fn(), onCounters: vi.fn(), onDice: vi.fn(), onExplorer: vi.fn(), onInspector: vi.fn(), ...overrides };
  }
  function tools(overrides: Partial<ComponentProps<typeof WorkspaceTools>> = {}): ComponentProps<typeof WorkspaceTools> {
    return { activeTool: "select", pan: false, busy: false, fogEnabled: true, fogCells: 1,
      onPrepare: vi.fn(), onSelect: vi.fn(), onPan: vi.fn(), onShape: vi.fn(), onLight: vi.fn(), onDynamicLight: vi.fn(),
      onMagicalDarkness: vi.fn(), onPath: vi.fn(), onWater: vi.fn(), onFire: vi.fn(), onLightning: vi.fn(), onPin: vi.fn(),
      onArea: vi.fn(), onLink: vi.fn(), onLabel: vi.fn(), onToken: vi.fn(), onPointer: vi.fn(), onFog: vi.fn(), onFogCells: vi.fn(),
      onSettings: vi.fn(), onConfirmDrawing: vi.fn(), ...overrides };
  }
  it("delegates web editor actions without desktop scene controls", async () => {
    const props = header(); await act(async () => root.render(<WorkspaceHeader {...props} />));
    await click("Publicar escena para jugadores"); expect(props.onPlayer).toHaveBeenCalledOnce();
    await click("Abrir dados"); expect(props.onDice).toHaveBeenCalledOnce();
    await click("Alternar explorador"); expect(props.onExplorer).toHaveBeenCalledOnce();
  });
  it("returns keyboard focus to the editor tools trigger on Escape", async () => {
    const target = document.createElement("div"); document.body.append(target);
    try {
      await act(async () => root.render(<WorkspaceHeader {...header({ portalTarget: target })} />));
      const trigger = target.querySelector<HTMLButtonElement>('[aria-label="Herramientas del editor"]')!;
      await act(async () => trigger.click());
      const save = target.querySelector<HTMLButtonElement>('[aria-label="Guardar escena"]')!; save.focus();
      await act(async () => save.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
      expect(trigger.getAttribute("aria-expanded")).toBe("false"); expect(document.activeElement).toBe(trigger);
    } finally { target.remove(); }
  });
  it("does not run save or publication actions while busy", async () => {
    const props = header({ busy: true }); await act(async () => root.render(<WorkspaceHeader {...props} />));
    await click("Guardar escena"); await click("Publicar escena para jugadores");
    expect(props.onSave).not.toHaveBeenCalled(); expect(props.onPlayer).not.toHaveBeenCalled();
  });
  it("fusiona los controles en el destino compartido sin duplicar logo y respeta suspensión", async () => {
    const target=document.createElement("div");document.body.append(target);
    const props=header({portalTarget:target,enabled:true});
    try {
      await act(async()=>root.render(<WorkspaceHeader {...props}/>));
      expect(host.querySelector(".workspace-header")).toBeNull();
      expect(target.querySelector(".workspace-brand")).toBeNull();
      expect(target.querySelector("header")).toBeNull();
      expect(target.querySelectorAll('.workspace-header-actions button')).toHaveLength(7);
      expect(target.querySelector('[aria-label="Publicar escena para jugadores"]')?.getAttribute("title")).toBe("Publicar escena para jugadores");
      const sceneName=target.querySelector('.workspace-scene-name')!;
      expect(sceneName.textContent).toBe(props.sceneName);
      expect(sceneName.getAttribute("title")).toBe(props.sceneName);
      expect(sceneName.querySelector("svg, button, summary")).toBeNull();
      const player=target.querySelector<HTMLButtonElement>('[aria-label="Publicar escena para jugadores"]')!;
      expect(player.title).toBe("Publicar escena para jugadores");
      expect(player.classList).toContain("workspace-present");
      expect(target.querySelectorAll('.workspace-header-actions button')).toHaveLength(7);
      await act(async()=>target.querySelector<HTMLButtonElement>('.workspace-header-actions [aria-label="Guardar escena"]')!.click());
      expect(props.onSave).toHaveBeenCalledOnce();
      const trigger=target.querySelector<HTMLButtonElement>('[aria-label="Herramientas del editor"]')!;
      await act(async()=>trigger.click());expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const dice=target.querySelector<HTMLButtonElement>('[aria-label="Abrir dados"]')!;
      await act(async()=>dice.click());expect(props.onDice).toHaveBeenCalledOnce();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");expect(document.activeElement).toBe(trigger);
      await act(async()=>player.click());expect(props.onPlayer).toHaveBeenCalledOnce();
      await act(async()=>root.render(<WorkspaceHeader {...props} enabled={false}/>));
      expect(dice.closest('[hidden][inert]')).not.toBeNull();
      expect(player.closest('[hidden][inert]')).not.toBeNull();
      await act(async()=>root.render(<WorkspaceHeader {...props} enabled={true}/>));
      expect(target.querySelector('[aria-label="Abrir dados"]')).toBe(dice);
      expect(target.querySelector('[aria-label="Publicar escena para jugadores"]')).toBe(player);
      expect(dice.closest('[hidden]')).toBeNull();
      await act(async()=>root.render(<WorkspaceHeader {...header()}/>));
      expect(target.children).toHaveLength(0);expect(host.querySelector('.workspace-brand')).not.toBeNull();
      expect(host.querySelector('.workspace-scene-name')?.textContent).toBe(props.sceneName);
    } finally { target.remove(); }
  });
  it("routes shapes and lights through their original callbacks", async () => {
    const props = tools(); await act(async () => root.render(<WorkspaceTools {...props} />));
    await click("Areas"); await click("Area conica"); expect(props.onShape).toHaveBeenCalledWith("cone");
    await click("Luces"); await click("Luz puntual"); expect(props.onLight).toHaveBeenCalledWith("point");
    expect(props.onPrepare).toHaveBeenCalledTimes(4);
  });
  it("exposes original effect shape controls without a second drawing engine", async () => {
    const props = tools(); await act(async () => root.render(<WorkspaceTools {...props} />));
    await click("Fuego");
    const fire = host.querySelectorAll('.workspace-context-tools button');
    expect(fire.length).toBe(5);
    await act(async () => (fire[0] as HTMLButtonElement).click());
    expect(props.onFire).toHaveBeenCalledOnce();
    await click("Relampago");
    const lightning = host.querySelectorAll('.workspace-context-tools button');
    expect(lightning.length).toBe(4);
    await act(async () => (lightning[0] as HTMLButtonElement).click());
    expect(props.onLightning).toHaveBeenCalledOnce();
  });
  it("keeps reveal disabled until fog is enabled and exposes settings", async () => {
    const props = tools({ fogEnabled: false }); await act(async () => root.render(<WorkspaceTools {...props} />));
    await click("Niebla de guerra"); expect(button("Revelar niebla").disabled).toBe(true);
    await click("Revelar niebla"); expect(props.onFog).not.toHaveBeenCalled();
    await click("Ajustes de niebla"); expect(props.onSettings).toHaveBeenCalledWith("fog");
  });
  it("cancels the active family and delegates finalizing water/path", async () => {
    const props = tools({ activeTool: "water" }); await act(async () => root.render(<WorkspaceTools {...props} />));
    await click("Terminar dibujo"); expect(props.onConfirmDrawing).toHaveBeenCalledOnce();
    await click("Cancelar herramienta"); expect(props.onSelect).toHaveBeenCalledOnce();
  });
});
