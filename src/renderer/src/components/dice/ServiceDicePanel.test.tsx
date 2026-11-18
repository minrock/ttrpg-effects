// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultDiceDraft } from "../../../../domain/dice/dice";
import { ServiceDicePanel, type ServiceDicePanelProps } from "./ServiceDicePanel";

let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const base = (): ServiceDicePanelProps => ({ role: "player", capabilities: { chooseVisibility: false, showMapResult: false, clearHistory: false, closeAny: false }, draft: { ...defaultDiceDraft(), visibility: "open" }, history: [], occupancy: null, selfAuthorId: "ana", ready: true, onDraftChange: vi.fn(), onRoll: vi.fn(), onDismiss: vi.fn() });

it("bloquea solo Lanzar cuando otra persona ocupa la mesa", async () => {
  const props = { ...base(), occupancy: { rollId: "bruno", author: { id: "bruno", label: "Bruno · 1258", kind: "player" as const }, phase: "rolling" as const } };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  expect(host.textContent).toContain("Espera a que se cierre la tirada de Bruno · 1258");
  expect([...host.querySelectorAll("input")].some(input => input.disabled === false)).toBe(true);
  expect([...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"))?.disabled).toBe(true);
});

it("solo deja cerrar la presentación al autor o al DM aunque no esté en el historial", async () => {
  const entry = { id: "roll-ana", author: { id: "ana", label: "Ana · 4821", kind: "player" as const }, visibility: "public" as const, createdAt: 0, status: "complete" as const, result: null, isPresented: true };
  const props = { ...base(), history: [], presentation: { rollId: entry.id, author: entry.author, visibility: entry.visibility, result: null } };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  expect(host.getAttribute("aria-label")).toBeNull();
  expect(host.querySelector('[aria-label="Cerrar mi tirada"]')).not.toBeNull();
  await act(async () => root.render(<ServiceDicePanel {...props} selfAuthorId="bruno" />));
  expect(host.querySelector('[aria-label^="Cerrar tirada"]')).toBeNull();
  await act(async () => root.render(<ServiceDicePanel {...props} role="dm" selfAuthorId="dm" capabilities={{ ...props.capabilities, closeAny: true }} />));
  expect(host.querySelector('[aria-label="Cerrar tirada de Ana · 4821"]')).not.toBeNull();
});

it("deja preparar sin publicación y bloquea al propio jugador mientras exista una pública", async () => {
  const props = { ...base(), ready: false, occupancy: { rollId: "roll-ana", author: { id: "ana", label: "Ana · 4821", kind: "player" as const }, phase: "settled" as const } };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  expect(host.querySelector<HTMLInputElement>('[aria-label="Fuerza de lanzamiento"]')?.disabled).toBe(false);
  expect([...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"))?.disabled).toBe(true);
});

it("bloquea lanzar ante una operación incierta y permite su reintento explícito", async () => {
  const onRetry = vi.fn();
  await act(async () => root.render(<ServiceDicePanel {...base()} uncertain onRetry={onRetry} error="No se pudo confirmar la operación." />));
  const launch = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"));
  expect(launch?.disabled).toBe(true);
  const retry = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Reintentar confirmación"));
  await act(async () => retry?.click());
  expect(onRetry).toHaveBeenCalledOnce();
});

it("abre el diálogo d20 y cancelar no inicia una tirada", async () => {
  const props = { ...base(), draft: { ...base().draft, includeD20: true } };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  const launch = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"));
  await act(async () => launch?.click());
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Chequeo d20");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Tirada pública");
  await act(async () => document.querySelector<HTMLButtonElement>('[role="dialog"] button:not([aria-pressed])')?.click());
  expect(props.onRoll).not.toHaveBeenCalled();
});

it("ignora una fórmula de daño inválida mientras el chequeo d20 independiente está activo", async () => {
  const props = base();
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Modo de composicion"] button:nth-child(2)')?.click());
  const formula = host.querySelector<HTMLInputElement>("#dice-damage-formula")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(formula, "2d6 +");
    formula.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect([...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"))?.disabled).toBe(true);
  await act(async () => root.render(<ServiceDicePanel {...props} draft={{ ...props.draft, includeD20: true }} />));
  expect([...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"))?.disabled).toBe(false);
});

it("permite una oculta del DM mientras una pública está en pantalla", async () => {
  const props = { ...base(), role: "dm" as const, capabilities: { chooseVisibility: true, showMapResult: true, clearHistory: true, closeAny: true }, draft: { ...base().draft, visibility: "hidden" as const, groups: [{ id: "none", damageType: "none" as const, dice: { d6: 1 }, modifier: 0 }] }, occupancy: { rollId: "roll-ana", author: { id: "ana", label: "Ana · 4821", kind: "player" as const }, phase: "settled" as const } };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  expect([...host.querySelectorAll("button")].find(button => button.textContent?.includes("Lanzar"))?.disabled).toBe(false);
});

it("reutiliza la fórmula actual, bloquea daño con d20 y conserva sus controles de preparación", async () => {
  const props = { ...base(), draft: { ...base().draft, groups: [{ id: "none", damageType: "none" as const, dice: { d6: 2 }, modifier: 3 }] } };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Modo de composicion"] button:nth-child(2)')?.click());
  expect(host.querySelector<HTMLInputElement>("#dice-damage-formula")?.value).toBe("2d6 + 3");
  await act(async () => root.render(<ServiceDicePanel {...props} draft={{ ...props.draft, includeD20: true }} />));
  expect(host.querySelector<HTMLFieldSetElement>('[aria-label="Dados de dano"]')?.disabled).toBe(true);
  expect(host.querySelector('[aria-label="Color de los dados"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Sonido de dados"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Tamaño de mi vista"]')).not.toBeNull();
});

it("pagina el historial del DM, informa su capacidad y conserva pendiente o error al cerrar", async () => {
  const onHistoryPageChange = vi.fn(), onDismiss = vi.fn();
  const presentation = { rollId: "roll-ana", author: { id: "ana", label: "Ana · 4821", kind: "player" as const }, visibility: "public" as const, result: null };
  const props = { ...base(), role: "dm" as const, selfAuthorId: "dm", capabilities: { chooseVisibility: true, showMapResult: true, clearHistory: true, closeAny: true }, historyTotal: 20, historyLimit: 10, history: [{ id: "history", author: presentation.author, visibility: "public" as const, createdAt: 0, status: "complete" as const, result: null }], presentation, pendingDismissId: presentation.rollId, dismissError: "No se pudo cerrar", onHistoryPageChange, onDismiss };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  expect(host.querySelector(".dice-history h3")?.textContent).toContain("20 / 1000");
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Cerrar tirada de Ana · 4821"]')?.disabled).toBe(true);
  expect(host.textContent).toContain("No se pudo cerrar");
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Tiradas anteriores"]')?.click());
  expect(onHistoryPageChange).toHaveBeenCalledWith(10);
});

it("pide confirmación antes de limpiar el historial DM", async () => {
  const onClearHistory = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const props = { ...base(), role: "dm" as const, capabilities: { chooseVisibility: true, showMapResult: true, clearHistory: true, closeAny: true }, onClearHistory };
  await act(async () => root.render(<ServiceDicePanel {...props} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Limpiar historial"]')?.click());
  expect(confirm).toHaveBeenCalledOnce();
  expect(onClearHistory).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Limpiar historial"]')?.click());
  expect(onClearHistory).toHaveBeenCalledOnce();
});
