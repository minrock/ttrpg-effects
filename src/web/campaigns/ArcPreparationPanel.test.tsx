// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CampaignClient } from "../../infrastructure/browser/campaign-client";
import type { PreparedEntityDto } from "../../shared/contracts/campaigns";
import { ArcPreparationPanel } from "./ArcPreparationPanel";

const campaignId = "11111111-1111-4111-8111-111111111111", arcId = "22222222-2222-4222-8222-222222222222", at = "2026-11-13T00:00:00.000Z";
const campaign = { id: campaignId, name: "Brumas", description: "", coverAssetId: null, state: "active" as const, systemRef: { systemId: "generic", version: 1 }, revision: 1, createdAt: at, updatedAt: at };
let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render(client: CampaignClient) { await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="monster" templates={[{ id: "wolf", name: "Lobo de las cavernas" }, { id: "dragon", name: "Dragón rojo" }]} onBack={vi.fn()}/>)); await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); }); }

it("elige una plantilla habilitada por nombre y guarda el binding sin pedir identificadores técnicos", async () => {
  const createPreparation = vi.fn(async () => ({ id: "44444444-4444-4444-8444-444444444444", arcId, kind: "monster" as const, name: "Lobo", imagePath: null, notes: "", templateId: "wolf", binding: { scope: "catalog" as const, systemId: "generic", version: 1, templateId: "wolf" }, revision: 1, createdAt: at, updatedAt: at, provenance: null }));
  const uploadCover = vi.fn(async () => "55555555-5555-4555-8555-555555555555");
  const client = { listPreparation: vi.fn(async () => ({ items: [], total: 0, limit: 50, offset: 0 })), createPreparation, uploadCover, updatePreparation: vi.fn() } as unknown as CampaignClient;
  await render(client);
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Agregar monstruo")!.click());
  expect(host.textContent).not.toContain("Plantilla permitida");
  expect([...host.querySelectorAll("label")].some(label => label.textContent?.includes("Ruta"))).toBe(false);
  const name = [...host.querySelectorAll<HTMLLabelElement>("label")].find(label => label.textContent?.startsWith("Nombre"))!.querySelector<HTMLInputElement>("input")!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Lobo"); name.dispatchEvent(new Event("input", { bubbles: true })); });
  const selector = host.querySelector<HTMLInputElement>("input[role='combobox']")!;
  await act(async () => { selector.click(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(selector, "Lobo"); selector.dispatchEvent(new Event("input", { bubbles: true })); selector.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); });
  expect(createPreparation).not.toHaveBeenCalled();
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Elegir imagen")!.click());
  expect(uploadCover).toHaveBeenCalledOnce(); expect(host.textContent).toContain("Imagen seleccionada");
  await act(async () => host.querySelector<HTMLFormElement>("dialog form")!.requestSubmit());
  expect(createPreparation).toHaveBeenCalledWith(campaignId, arcId, expect.objectContaining({ templateId: "wolf", imagePath: "asset:55555555-5555-4555-8555-555555555555", binding: { scope: "catalog", systemId: "generic", version: 1, templateId: "wolf" } }));
});

it("conserva el vínculo retenido de un monstruo heredado si no se elige otra plantilla", async () => {
  const retained = { id: "44444444-4444-4444-8444-444444444444", arcId, kind: "monster" as const, name: "Centinela", imagePath: null, notes: "", templateId: null, binding: { scope: "catalog" as const, systemId: "private-system", version: 7, templateId: "private-template" }, revision: 3, createdAt: at, updatedAt: at, provenance: null };
  const updatePreparation = vi.fn(async () => retained);
  const client = { listPreparation: vi.fn(async () => ({ items: [retained], total: 1, limit: 50, offset: 0 })), createPreparation: vi.fn(), uploadCover: vi.fn(), updatePreparation } as unknown as CampaignClient;
  await render(client);
  await act(async () => host.querySelector<HTMLElement>("details summary")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Editar")!.click());
  expect(host.textContent).toContain("La plantilla retenida ya no admite usos nuevos");
  await act(async () => host.querySelector<HTMLFormElement>("dialog form")!.requestSubmit());
  await act(async () => { await Promise.resolve(); });
  expect(updatePreparation).toHaveBeenCalledWith(campaignId, arcId, retained.id, retained.revision, expect.not.objectContaining({ templateId: expect.anything(), binding: expect.anything() }));
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Acciones de Centinela");
});


it("consulta un único tipo antes de paginar y nunca muestra el otro tipo", async () => {
  const npc = { id: "66666666-6666-4666-8666-666666666666", arcId, kind: "npc" as const, name: "Asha", imagePath: null, notes: "Guía local", revision: 1, createdAt: at, updatedAt: at, provenance: null };
  const monster = { id: "77777777-7777-4777-8777-777777777777", arcId, kind: "monster" as const, name: "No debe verse", imagePath: null, notes: "", templateId: "wolf", binding: { scope: "catalog" as const, systemId: "generic", version: 1, templateId: "wolf" }, revision: 1, createdAt: at, updatedAt: at, provenance: null };
  const listPreparation = vi.fn(async (_campaign: string, _arc: string, query: { kind?: string }) => ({ items: query.kind === "npc" ? [npc] : [monster], total: 1, limit: 50, offset: 0 }));
  const client = { listPreparation, createPreparation: vi.fn(), updatePreparation: vi.fn(), deletePreparation: vi.fn(), uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  expect(listPreparation).toHaveBeenCalledWith(campaignId, arcId, { kind: "npc", limit: 50, offset: 0 });
  expect(host.textContent).toContain("Asha"); expect(host.textContent).not.toContain("No debe verse");
});

it("confirma el borrado, espera el ACK y devuelve el foco a la fila vecina", async () => {
  const first = { id: "88888888-8888-4888-8888-888888888888", arcId, kind: "npc" as const, name: "Asha", imagePath: null, notes: "", revision: 2, createdAt: at, updatedAt: at, provenance: null };
  const second = { id: "99999999-9999-4999-8999-999999999999", arcId, kind: "npc" as const, name: "Bryn", imagePath: null, notes: "", revision: 2, createdAt: at, updatedAt: at, provenance: null };
  let resolveDelete: (() => void) | undefined;
  const deletePreparation = vi.fn(() => new Promise<void>(resolve => { resolveDelete = resolve; }));
  const client = { listPreparation: vi.fn(async () => ({ items: [first, second], total: 2, limit: 50, offset: 0 })), createPreparation: vi.fn(), updatePreparation: vi.fn(), deletePreparation, uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  await act(async () => host.querySelector<HTMLElement>("details summary")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Borrar")!.click());
  expect(host.querySelector("dialog")?.textContent).toContain("Las copias ya utilizadas en escenas se conservarán");
  const confirm = [...host.querySelectorAll<HTMLButtonElement>("dialog button")].find(button => button.textContent === "Borrar NPC")!;
  await act(async () => confirm.click());
  await act(async () => confirm.click());
  expect(deletePreparation).toHaveBeenCalledOnce(); expect(deletePreparation).toHaveBeenCalledWith(campaignId, arcId, first.id, 2); expect(host.textContent).toContain("Asha");
  await act(async () => resolveDelete?.());
  await act(async () => { await Promise.resolve(); });
  expect(host.textContent).not.toContain("Asha"); expect(document.activeElement?.textContent).toContain("Bryn");
});


it("descarta una respuesta tardía al cambiar tipo o cuenta", async () => {
  const deferred: { resolve?: (value: { items: readonly PreparedEntityDto[]; total: number; limit: number; offset: number }) => void } = {};
  const npc = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", arcId, kind: "npc" as const, name: "No debe filtrarse", imagePath: null, notes: "", revision: 1, createdAt: at, updatedAt: at, provenance: null };
  const monster = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", arcId, kind: "monster" as const, name: "Sirena", imagePath: null, notes: "", templateId: "wolf", binding: { scope: "catalog" as const, systemId: "generic", version: 1, templateId: "wolf" }, revision: 1, createdAt: at, updatedAt: at, provenance: null };
  const listPreparation = vi.fn((_campaign: string, _arc: string, query: { kind?: string }) => query.kind === "npc" ? new Promise(resolve => { deferred.resolve = resolve; }) : Promise.resolve({ items: [monster], total: 1, limit: 50, offset: 0 }));
  const client = { listPreparation, createPreparation: vi.fn(), updatePreparation: vi.fn(), deletePreparation: vi.fn(), uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} accountId="cuenta-a" campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => root.render(<ArcPreparationPanel client={client} accountId="cuenta-b" campaign={campaign} arcId="33333333-3333-4333-8333-333333333333" kind="monster" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { deferred.resolve?.({ items: [npc], total: 1, limit: 50, offset: 0 }); for (let index = 0; index < 6; index++) await Promise.resolve(); });
  expect(host.textContent).toContain("Sirena"); expect(host.textContent).not.toContain("No debe filtrarse");
});


it("conserva el formulario escrito ante conflicto y ofrece recargar la ficha", async () => {
  const npc = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", arcId, kind: "npc" as const, name: "Asha", imagePath: null, notes: "Antes", revision: 1, createdAt: at, updatedAt: at, provenance: null };
  const conflict = Object.assign(new Error("Otra persona actualizó esta ficha."), { status: 409 });
  const client = { listPreparation: vi.fn(async () => ({ items: [npc], total: 1, limit: 50, offset: 0 })), updatePreparation: vi.fn(async () => { throw conflict; }), getPreparation: vi.fn(async () => npc), createPreparation: vi.fn(), deletePreparation: vi.fn(), uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  await act(async () => host.querySelector<HTMLElement>("details summary")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Editar")!.click());
  const name = host.querySelector<HTMLInputElement>("dialog input")!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Asha revisada"); name.dispatchEvent(new Event("input", { bubbles: true })); host.querySelector<HTMLFormElement>("dialog form")!.requestSubmit(); await Promise.resolve(); });
  expect(host.querySelector("dialog")?.textContent).toContain("Recargar ficha"); expect(host.querySelector<HTMLInputElement>("dialog input")?.value).toBe("Asha revisada");
});

it("al borrar la única ficha de la última página vuelve a la página anterior", async () => {
  const only = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", arcId, kind: "npc" as const, name: "Última", imagePath: null, notes: "", revision: 1, createdAt: at, updatedAt: at, provenance: null };
  const firstPage = Array.from({ length: 50 }, (_, index) => ({ ...only, id: `eeeeeeee-eeee-4eee-8eee-${String(index).padStart(12, "0")}`, name: `Ficha ${index + 1}` }));
  const listPreparation = vi.fn(async (_campaign: string, _arc: string, query: { offset?: number }) => query.offset === 50 ? { items: [only], total: 51, limit: 50, offset: 50 } : { items: firstPage, total: 51, limit: 50, offset: 0 });
  const client = { listPreparation, createPreparation: vi.fn(), updatePreparation: vi.fn(), deletePreparation: vi.fn(async () => undefined), uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Siguiente")!.click());
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  await act(async () => host.querySelector<HTMLElement>("details summary")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Borrar")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("dialog button")].find(button => button.textContent === "Borrar NPC")!.click());
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  expect(listPreparation).toHaveBeenLastCalledWith(campaignId, arcId, { kind: "npc", limit: 50, offset: 0 });
});


it("mantiene la fila y la confirmación ante un DELETE 409 y permite recargar", async () => {
  const npc = { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", arcId, kind: "npc" as const, name: "Asha", imagePath: null, notes: "", revision: 4, createdAt: at, updatedAt: at, provenance: null };
  const conflict = Object.assign(new Error("La ficha cambió en otra sesión."), { status: 409 });
  const listPreparation = vi.fn(async () => ({ items: [npc], total: 1, limit: 50, offset: 0 }));
  const client = { listPreparation, createPreparation: vi.fn(), updatePreparation: vi.fn(), deletePreparation: vi.fn(async () => { throw conflict; }), uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  await act(async () => host.querySelector<HTMLElement>("details summary")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Borrar")!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("dialog button")].find(button => button.textContent === "Borrar NPC")!.click());
  expect(host.querySelector("dialog")?.textContent).toContain("Recargar lista"); expect(host.textContent).toContain("Asha");
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>("dialog button")].find(button => button.textContent === "Recargar lista")!.click());
  await act(async () => { for (let index = 0; index < 4; index++) await Promise.resolve(); });
  expect(host.querySelector("dialog")).toBeNull(); expect(listPreparation).toHaveBeenCalledTimes(2); expect(host.textContent).toContain("Asha");
});


it("muestra el error de carga sin convertirlo en un estado vacío", async () => {
  const client = { listPreparation: vi.fn(async () => { throw new Error("Servicio no disponible"); }), createPreparation: vi.fn(), updatePreparation: vi.fn(), deletePreparation: vi.fn(), uploadCover: vi.fn() } as unknown as CampaignClient;
  await act(async () => root.render(<ArcPreparationPanel client={client} campaign={campaign} arcId={arcId} kind="npc" templates={[]} onBack={vi.fn()}/>));
  await act(async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Servicio no disponible");
  expect(host.textContent).not.toContain("No hay NPCs preparados"); expect(host.querySelector(".campaign-empty")).toBeNull();
});
