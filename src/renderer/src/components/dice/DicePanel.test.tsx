// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDiceDraft, DICE_PROTOCOL_VERSION, type DiceDraft } from "../../../../domain/dice/dice";
import type { useDiceSession } from "../../hooks/useDiceSession";
import { DicePanel } from "./DicePanel";
import { RightSidebarTabs } from "./RightSidebarTabs";

describe("dice panel", () => {
  let host: HTMLDivElement, root: Root, draft: DiceDraft, controller: ReturnType<typeof useDiceSession>;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div"); document.body.append(host); root = createRoot(host); draft = defaultDiceDraft();
    controller = { draft, state: { protocolVersion: DICE_PROTOCOL_VERSION, draft, history: [], envelope: { revision: 0, presentation: null }, publicRollId: null, publicResultVisible: false, busyUntil: 0 }, ready: true, busy: false, preparing: false, error: null, updateDraft: vi.fn(next => { draft = next; controller.draft = next; root.render(<DicePanel controller={controller} />); }), roll: vi.fn(async () => {}), clearHistory: vi.fn(async () => {}), showResult: vi.fn(async () => {}), dismiss: vi.fn(async () => {}) };
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  const click = async (selector: string): Promise<void> => { const button = document.querySelector<HTMLButtonElement>(selector); expect(button).not.toBeNull(); await act(async () => button!.click()); };
  const fill = async (selector: string, value: string): Promise<void> => {
    const input = host.querySelector<HTMLInputElement>(selector)!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
  };
  const selectGroup = async (type: string): Promise<void> => {
    const select = host.querySelector<HTMLSelectElement>('[aria-label="Grupo de dano activo"]')!;
    await act(async () => { select.value = type; select.dispatchEvent(new Event("change", { bubbles: true })); });
  };
  it("orders properties, dice, launch and history and excludes a surface selector", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    const html = host.innerHTML;
    expect(html.indexOf("dice-panel-properties")).toBeLessThan(html.indexOf("dice-pool"));
    expect(html.indexOf("dice-pool")).toBeLessThan(html.indexOf("dice-roll-button"));
    expect(html.indexOf("dice-roll-button")).toBeLessThan(html.indexOf("dice-history"));
    expect(host.textContent).not.toContain("Superficie");
    expect(host.querySelectorAll(".dice-swatch")).toHaveLength(17);
    expect(host.querySelector('[aria-label="Agregar d20"]')).toBeNull();
    expect(host.querySelector<HTMLInputElement>('[aria-label="Incluir chequeo d20"]')?.type).toBe("checkbox");
  });
  it("asks for d20 mode, cancel does not roll, and advantage is sent once", async () => {
    controller.draft = { ...draft, includeD20: true };
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click(".dice-panel > .dice-roll-button");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await click('.dice-mode-dialog [aria-label="Cerrar"]');
    expect(controller.roll).not.toHaveBeenCalled();
    await click(".dice-panel > .dice-roll-button");
    await click(".dice-mode-options button:nth-child(2)");
    await click(".dice-mode-dialog .dice-roll-button");
    expect(controller.roll).toHaveBeenCalledExactlyOnceWith("advantage", controller.draft);
  });
  it("adds dice only to the active damage group", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click('[aria-label="Agregar d6"]');
    const select = host.querySelector<HTMLSelectElement>('[aria-label="Grupo de dano activo"]')!;
    await act(async () => { select.value = "fire"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    await click('[aria-label="Agregar d8"]');
    expect(draft.groups).toMatchObject([{ damageType: "none", dice: { d6: 1 } }, { damageType: "fire", dice: { d8: 1 } }]);
  });
  it("allows advantage even with a full prepared damage pool", async () => {
    controller.draft = { ...draft, includeD20: true, groups: [{ id: "n", damageType: "none", dice: { d6: 24 } }] };
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click(".dice-panel > .dice-roll-button"); await click(".dice-mode-options button:nth-child(2)");
    expect(document.querySelector<HTMLButtonElement>(".dice-mode-dialog .dice-roll-button")?.disabled).toBe(false);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector(".dice-selection-footer")?.textContent).toContain("1 / 24");
  });
  it("keeps private rolls free of a publish action and d20 out of damage", async () => {
    controller.state = { ...controller.state, history: [{ id: "h", context: { token: "c", sceneId: "s", mapId: "m", sceneName: "Scene", mapName: "Map" }, request: { requestId: "r", contextToken: "c", draft, d20: "advantage" }, createdAt: 0, settledAt: 0, status: "complete", result: { groups: [], poolTotal: 0, d20: { mode: "advantage", values: [5, 17], value: 17, selected: 1, modifier: 3, total: 20 } } }] };
    await act(async () => root.render(<DicePanel controller={controller} />));
    expect(host.querySelector(".dice-publish-result")).toBeNull();
    expect(host.querySelector(".dice-result-total")).toBeNull();
    expect(host.querySelector(".dice-result-check > strong")?.textContent).toBe("20");
    expect(host.querySelector(".dice-result-modifier")?.textContent).toBe("Modificador +3");
  });
  it("supports keyboard navigation between sidebar tabs", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(<RightSidebarTabs value="properties" onChange={onChange} />));
    const tabs = host.querySelector('[role="tablist"]')!;
    await act(async () => tabs.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("dice");
    expect(document.activeElement?.id).toBe("right-tab-dice");
  });
  it("shares manual quantities and modifier with formula mode and keeps damage groups separate", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await selectGroup("fire"); await click('[aria-label="Agregar d6"]');
    await fill('[aria-label="Modificador de Fuego"]', "2");
    await click('[aria-label="Modo de composicion"] button:nth-child(2)');
    expect(host.querySelector<HTMLInputElement>("#dice-damage-formula")?.value).toBe("1d6 + 2");
    await fill("#dice-damage-formula", "2d6 + 3d4 + 2");
    await selectGroup("cold"); await fill("#dice-damage-formula", "1d8 - 1");
    expect(draft.groups).toMatchObject([{ damageType: "fire", dice: { d6: 2, d4: 3 }, modifier: 2 }, { damageType: "cold", dice: { d8: 1 }, modifier: -1 }]);
    await click('[aria-label="Modo de composicion"] button:first-child');
    expect(host.querySelector<HTMLInputElement>('[aria-label="Cantidad d8"]')?.value).toBe("1");
    expect(host.querySelector<HTMLInputElement>('[aria-label="Modificador de Frio"]')?.value).toBe("-1");
    expect(host.querySelector('[aria-label="Editar Fuego"] .dice-damage-swatch')).not.toBeNull();
  });
  it("blocks rolling or switching modes while any group has invalid formula text", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click('[aria-label="Modo de composicion"] button:nth-child(2)');
    await selectGroup("fire"); await fill("#dice-damage-formula", "2d6 +");
    expect(host.querySelector('[aria-invalid="true"]')).not.toBeNull();
    await selectGroup("cold"); await fill("#dice-damage-formula", "1d8");
    expect(host.querySelector(".dice-formula-error-link")?.textContent).toContain("Fuego");
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Modo de composicion"] button:first-child')?.disabled).toBe(true);
    await click(".dice-formula-error-link"); await fill("#dice-damage-formula", "2d6 + 2");
    await click(".dice-panel > .dice-roll-button");
    expect(controller.roll).toHaveBeenCalledWith(null, expect.objectContaining({ groups: expect.arrayContaining([expect.objectContaining({ damageType: "fire", modifier: 2 }), expect.objectContaining({ damageType: "cold", dice: { d8: 1 } })]) }));
  });
  it("rolls the displayed formula after removing another group frees the physical budget", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await selectGroup("cold"); await click('[aria-label="Agregar d6"]');
    await selectGroup("fire"); await click('[aria-label="Agregar d6"]');
    await click('[aria-label="Modo de composicion"] button:nth-child(2)');
    await fill("#dice-damage-formula", "24d6 + 2");
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(true);
    await click('[aria-label="Quitar grupo Frio"]');
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(false);
    expect(host.querySelector('[aria-label="Editar Fuego"]')?.textContent).toBe("24d6 + 2");
    await click(".dice-panel > .dice-roll-button");
    expect(controller.roll).toHaveBeenCalledWith(null, expect.objectContaining({ groups: [expect.objectContaining({ damageType: "fire", dice: { d6: 24 }, modifier: 2 })] }));
  });
  it("rejects d20 in formulas and resets invalid text when clearing the selection", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click('[aria-label="Modo de composicion"] button:nth-child(2)');
    await fill("#dice-damage-formula", "2d20");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("chequeo independiente");
    await click('[aria-label="Limpiar seleccion"]');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector<HTMLInputElement>("#dice-damage-formula")?.value).toBe("");
  });
  it("allows signed manual modifiers and blocks incomplete input until corrected or cleared", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click('[aria-label="Agregar d6"]');
    await fill('[aria-label="Modificador de Sin tipo"]', "-");
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(true);
    await fill('[aria-label="Modificador de Sin tipo"]', "-2");
    expect(draft.groups[0].modifier).toBe(-2);
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(false);
    await fill('[aria-label="Modificador de Sin tipo"]', "0");
    await fill('[aria-label="Modificador de Sin tipo"]', "-");
    await click('[aria-label="Limpiar seleccion"]');
    expect(host.querySelector<HTMLInputElement>('[aria-label="Modificador de Sin tipo"]')?.value).toBe("0");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
  it("shows the modifier in the result breakdown without adding it to d20", async () => {
    controller.state = { ...controller.state, history: [{ id: "h", context: { token: "c", sceneId: "s", mapId: "m", sceneName: "Scene", mapName: "Map" }, request: { requestId: "r", contextToken: "c", draft, d20: null }, createdAt: 0, settledAt: 0, status: "complete", result: { groups: [{ id: "f", damageType: "fire", formula: "1d6 + 2", modifier: 2, total: 6, dice: [{ id: "d", type: "d6", value: 4, parts: [4] }] }], poolTotal: 6, d20: null } }] };
    await act(async () => root.render(<DicePanel controller={controller} />));
    expect(host.querySelector(".dice-result-values")?.textContent).toBe("4 + 2");
    expect(host.querySelector(".dice-result-total strong")?.textContent).toBe("6");
    expect(host.querySelector(".dice-result-check")).toBeNull();
  });
  it("shows the check modifier only while enabled and preserves both independent modifiers", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click('[aria-label="Agregar d6"]'); await fill('[aria-label="Modificador de Sin tipo"]', "5");
    expect(host.querySelector('[aria-label="Modificador de d20"]')).toBeNull();
    await click('[aria-label="Incluir chequeo d20"]');
    expect(host.querySelector('[aria-label="Agregar d6"]')?.matches(":disabled")).toBe(true);
    await fill('[aria-label="Modificador de d20"]', "-2");
    expect(draft.d20Modifier).toBe(-2); expect(draft.groups[0].modifier).toBe(5);
    await click(".dice-panel > .dice-roll-button");
    expect(document.querySelector(".dice-dialog-modifier")?.textContent).toBe("Modificador -2");
    await click(".dice-mode-dialog .dice-roll-button");
    expect(controller.roll).toHaveBeenCalledWith("normal", expect.objectContaining({ d20Modifier: -2, includeD20: true }));
    await click('[aria-label="Incluir chequeo d20"]');
    expect(host.querySelector('[aria-label="Modificador de d20"]')).toBeNull();
    expect(host.querySelector('[aria-label="Agregar d6"]')?.matches(":disabled")).toBe(false);
    expect(host.querySelector<HTMLInputElement>('[aria-label="Modificador de Sin tipo"]')?.value).toBe("5");
    await click('[aria-label="Incluir chequeo d20"]');
    expect(host.querySelector<HTMLInputElement>('[aria-label="Modificador de d20"]')?.value).toBe("-2");
    await fill('[aria-label="Modificador de d20"]', "-");
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(true);
    await click('[aria-label="Incluir chequeo d20"]');
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(false);
  });
  it("does not block a check with an unfinished damage formula or discard that formula", async () => {
    await act(async () => root.render(<DicePanel controller={controller} />));
    await click('[aria-label="Modo de composicion"] button:nth-child(2)');
    await fill("#dice-damage-formula", "2d6 +");
    await click('[aria-label="Incluir chequeo d20"]');
    await fill('[aria-label="Modificador de d20"]', "4");
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(false);
    await click(".dice-panel > .dice-roll-button"); await click(".dice-mode-dialog .dice-roll-button");
    expect(controller.roll).toHaveBeenCalledWith("normal", expect.objectContaining({ includeD20: true, d20Modifier: 4 }));
    await click('[aria-label="Incluir chequeo d20"]');
    expect(host.querySelector<HTMLInputElement>("#dice-damage-formula")?.value).toBe("2d6 +");
    expect(host.querySelector<HTMLButtonElement>(".dice-panel > .dice-roll-button")?.disabled).toBe(true);
  });
});
