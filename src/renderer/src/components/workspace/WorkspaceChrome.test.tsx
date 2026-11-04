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
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  function button(name: string): HTMLButtonElement {
    const node = [...host.querySelectorAll("button")].find(item => item.getAttribute("aria-label") === name || item.textContent === name);
    expect(node, name).toBeDefined(); return node!;
  }
  async function click(name: string): Promise<void> { await act(async () => button(name).click()); }
  function header(overrides: Partial<ComponentProps<typeof WorkspaceHeader>> = {}): ComponentProps<typeof WorkspaceHeader> {
    return { sceneName: "Escena guardada", mapName: "Mapa", busy: false, canCreate: true, battleActive: false,
      explorerVisible: true, inspectorVisible: true, onNew: vi.fn(), onLoad: vi.fn(), onSave: vi.fn(),
      onPlayer: vi.fn(), onBattle: vi.fn(), onCounters: vi.fn(), onDice: vi.fn(), onExplorer: vi.fn(), onInspector: vi.fn(), ...overrides };
  }
  function tools(overrides: Partial<ComponentProps<typeof WorkspaceTools>> = {}): ComponentProps<typeof WorkspaceTools> {
    return { activeTool: "select", pan: false, busy: false, fogEnabled: true, fogCells: 1,
      onPrepare: vi.fn(), onSelect: vi.fn(), onPan: vi.fn(), onShape: vi.fn(), onLight: vi.fn(), onDynamicLight: vi.fn(),
      onMagicalDarkness: vi.fn(), onPath: vi.fn(), onWater: vi.fn(), onFire: vi.fn(), onLightning: vi.fn(), onPin: vi.fn(),
      onArea: vi.fn(), onLink: vi.fn(), onLabel: vi.fn(), onToken: vi.fn(), onPointer: vi.fn(), onFog: vi.fn(), onFogCells: vi.fn(),
      onSettings: vi.fn(), onConfirmDrawing: vi.fn(), ...overrides };
  }
  it("delegates real scene actions and closes the scene menu", async () => {
    const props = header(); await act(async () => root.render(<WorkspaceHeader {...props} />));
    const details = host.querySelector("details")!; details.open = true;
    await click("Cargar escena"); expect(props.onLoad).toHaveBeenCalledOnce(); expect(details.open).toBe(false);
    await click("Abrir ventana de jugador"); expect(props.onPlayer).toHaveBeenCalledOnce();
    await click("Abrir dados"); expect(props.onDice).toHaveBeenCalledOnce();
    await click("Alternar explorador"); expect(props.onExplorer).toHaveBeenCalledOnce();
  });
  it("returns keyboard focus to the scene trigger on Escape", async () => {
    await act(async () => root.render(<WorkspaceHeader {...header()} />));
    const details = host.querySelector("details")!; details.open = true;
    const target = button("Cargar escena"); target.focus();
    await act(async () => target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(details.open).toBe(false); expect(document.activeElement).toBe(details.querySelector("summary"));
  });
  it("does not run file or projection actions while busy", async () => {
    const props = header({ busy: true }); await act(async () => root.render(<WorkspaceHeader {...props} />));
    await click("Cargar escena"); await click("Abrir ventana de jugador");
    expect(props.onLoad).not.toHaveBeenCalled(); expect(props.onPlayer).not.toHaveBeenCalled();
  });
  it("fusiona los controles en el destino compartido sin duplicar logo y respeta suspensión", async () => {
    const target=document.createElement("div");document.body.append(target);
    const props=header({portalTarget:target,enabled:true,serviceActions:{onImport:vi.fn(),onExport:vi.fn(),onLogout:vi.fn()}});
    try {
      await act(async()=>root.render(<WorkspaceHeader {...props}/>));
      expect(host.querySelector(".workspace-header")).toBeNull();
      expect(target.querySelector(".workspace-brand")).toBeNull();
      expect(target.querySelector("header")).toBeNull();
      expect(target.querySelectorAll('.workspace-header-actions button')).toHaveLength(7);
      expect(target.textContent).not.toContain("Cerrar sesión");
      const trigger=target.querySelector<HTMLButtonElement>('[aria-label="Herramientas del editor"]')!;
      await act(async()=>trigger.click());expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const dice=target.querySelector<HTMLButtonElement>('[aria-label="Abrir dados"]')!;
      await act(async()=>dice.click());expect(props.onDice).toHaveBeenCalledOnce();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");expect(document.activeElement).toBe(trigger);
      await act(async()=>root.render(<WorkspaceHeader {...props} enabled={false}/>));
      expect(dice.closest('[hidden][inert]')).not.toBeNull();
      await act(async()=>root.render(<WorkspaceHeader {...props} enabled={true}/>));
      expect(target.querySelector('[aria-label="Abrir dados"]')).toBe(dice);
      expect(dice.closest('[hidden]')).toBeNull();
      await act(async()=>root.render(<WorkspaceHeader {...header()}/>));
      expect(target.children).toHaveLength(0);expect(host.querySelector('.workspace-brand')).not.toBeNull();
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
