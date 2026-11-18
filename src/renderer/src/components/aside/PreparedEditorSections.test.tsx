// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MonsterSection } from "./MonsterSection";
import { NpcSection } from "./NpcSection";

let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); document.querySelectorAll(".modal-panel").forEach(panel => panel.parentElement?.remove()); });
const monster = { id: "monster", name: "Orco preparado", imagePath: null, visibleToPlayer: false, notes: "Guardia" };
const npc = { id: "npc", name: "Guía preparada", imagePath: null, visibleToPlayer: false, notes: "- [ ] Mapa" };

it("el editor contextual conserva consulta y visibilidad táctica, pero oculta alta, biblioteca y edición", async () => {
  const toggleMonster = vi.fn(), toggleNpc = vi.fn();
  await act(async () => root.render(<><MonsterSection monsters={[monster]} templates={[]} preparationContext onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} onToggleVisibility={toggleMonster}/><NpcSection npcs={[npc]} preparationContext onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} onToggleVisibility={toggleNpc}/></>));
  expect(host.textContent).not.toContain("Agregar monstruo"); expect(host.textContent).not.toContain("Agregar NPC");
  const [monsterDetail, npcDetail] = [...host.querySelectorAll<HTMLButtonElement>("button[title='Ver detalle']")];
  await act(async () => monsterDetail.click());
  expect(document.body.textContent).toContain("Orco preparado"); expect(document.body.textContent).not.toContain("✏️ Editar");
  await act(async () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes("Mostrar a jugadores"))!.click());
  expect(toggleMonster).toHaveBeenCalledWith("monster");
  await act(async () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Cerrar")!.click());
  await act(async () => npcDetail.click());
  expect(document.body.textContent).toContain("Guía preparada"); expect(document.body.textContent).not.toContain("✏️ Editar");
  expect(document.body.querySelector<HTMLInputElement>("input[type='checkbox']")?.disabled).toBe(true); expect(document.body.textContent).not.toContain("Reiniciar checklist");
  await act(async () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes("Mostrar a jugadores"))!.click());
  expect(toggleNpc).toHaveBeenCalledWith("npc");
});

it("el editor standalone conserva alta y edición de instancias", async () => {
  await act(async () => root.render(<><MonsterSection monsters={[monster]} templates={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} onToggleVisibility={vi.fn()}/><NpcSection npcs={[npc]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} onToggleVisibility={vi.fn()}/></>));
  expect(host.textContent).toContain("Agregar monstruo"); expect(host.textContent).toContain("Agregar NPC");
  await act(async () => host.querySelector<HTMLButtonElement>("button[title='Ver detalle']")!.click());
  expect(document.body.textContent).toContain("✏️ Editar");
});
