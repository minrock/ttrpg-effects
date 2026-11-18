// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClientProvider } from "../../client/ClientProvider";
import { ArcPreparationUseSection } from "./ArcPreparationUseSection";

const campaignId = "11111111-1111-4111-8111-111111111111";
const arcId = "22222222-2222-4222-8222-222222222222";
const sceneId = "33333333-3333-4333-8333-333333333333";
const preparedId = "44444444-4444-4444-8444-444444444444";
const at = "2026-11-13T00:00:00.000Z";
let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("reserva la ficha preparada y entrega el snapshot retenido para materializar la instancia", async () => {
  const reserve = vi.fn(async () => ({ sceneId, preparedId, entityId: "npc-vigia", snapshot: { version: 2 as const, kind: "npc" as const, name: "Vigía", imagePath: null, notes: "" }, binding: null }));
  const used = vi.fn();
  const client = { api: {}, capabilities: {}, arcPreparation: { list: vi.fn(async () => ({ items: [{ id: preparedId, arcId, kind: "npc" as const, name: "Vigía", imagePath: null, notes: "", revision: 1, createdAt: at, updatedAt: at, provenance: null }], total: 1, limit: 50, offset: 0 })), snapshot: vi.fn(), reserve } } as never;
  await act(async () => root.render(<ClientProvider client={client}><ArcPreparationUseSection selection={{ campaignId, arcId, sceneId }} onUse={used}/></ClientProvider>));
  await act(async () => { await Promise.resolve(); });
  const button = [...host.querySelectorAll("button")].find(item => item.textContent === "Usar en esta escena")!;
  await act(async () => button.click());
  expect(reserve).toHaveBeenCalledWith({ campaignId, arcId, sceneId }, preparedId, expect.any(String));
  expect(used).toHaveBeenCalledWith(expect.objectContaining({ entityId: "npc-vigia", snapshot: expect.objectContaining({ name: "Vigía" }) }));
});

it("muestra un fallo de preparación sin añadir una instancia local", async () => {
  const used = vi.fn();
  const client = { api: {}, capabilities: {}, arcPreparation: { list: vi.fn(async () => { throw new Error("Servicio no disponible"); }), snapshot: vi.fn(), reserve: vi.fn() } } as never;
  await act(async () => root.render(<ClientProvider client={client}><ArcPreparationUseSection selection={{ campaignId, arcId, sceneId }} onUse={used}/></ClientProvider>));
  await act(async () => { await Promise.resolve(); });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Servicio no disponible");
  expect(used).not.toHaveBeenCalled();
});

it("bloquea la reserva hasta que exista una escena persistida", async () => {
  const reserve = vi.fn(), list = vi.fn();
  const client = { api: {}, capabilities: {}, arcPreparation: { list, snapshot: vi.fn(), reserve } } as never;
  await act(async () => root.render(<ClientProvider client={client}><ArcPreparationUseSection unavailableMessage="Guarda o importa la escena antes de usar una ficha preparada."/></ClientProvider>));
  expect(host.textContent).toContain("Guarda o importa la escena antes de usar una ficha preparada.");
  expect(list).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
});

it("carga todas las páginas del catálogo preparado antes de ofrecer uso", async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `prepared-${index}`, arcId, kind: "npc" as const, name: `Preparado ${index + 1}`, imagePath: null, notes: "", revision: 1, createdAt: at, updatedAt: at, provenance: null }));
  const list = vi.fn(async (_selection: unknown, query?: { readonly offset?: number }) => query?.offset === 0 ? { items: firstPage, total: 101, limit: 100, offset: 0 } : { items: [{ id: "prepared-100", arcId, kind: "npc" as const, name: "Preparado 101", imagePath: null, notes: "", revision: 1, createdAt: at, updatedAt: at, provenance: null }], total: 101, limit: 100, offset: 100 });
  const client = { api: {}, capabilities: {}, arcPreparation: { list, snapshot: vi.fn(), reserve: vi.fn() } } as never;
  await act(async () => root.render(<ClientProvider client={client}><ArcPreparationUseSection selection={{ campaignId, arcId, sceneId }} onUse={vi.fn()}/></ClientProvider>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  expect(host.textContent).toContain("Preparado 1"); expect(host.textContent).toContain("Preparado 101");
  expect(list).toHaveBeenNthCalledWith(1, { campaignId, arcId }, { limit: 100, offset: 0 });
  expect(list).toHaveBeenNthCalledWith(2, { campaignId, arcId }, { limit: 100, offset: 100 });
});
