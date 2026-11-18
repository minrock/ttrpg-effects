// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DicePublicStatus } from "./DicePublicStatus";

let host: HTMLDivElement, root: Root;
const activity = { rollId: "roll-ana", author: { id: "ana", label: "Ana · 4821" }, phase: "preparing" as const, result: null };
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("mantiene el cierre del autor disponible durante preparación fuera del canvas", async () => {
  const dismiss = vi.fn();
  await act(async () => root.render(<DicePublicStatus activity={activity} selfAuthorId="ana" closeAny={false} onDismiss={dismiss} />));
  expect(host.textContent).toContain("Preparando tirada");
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Cerrar mi tirada"]')?.click());
  expect(dismiss).toHaveBeenCalledWith("roll-ana");
});

it("no ofrece cierre a otro jugador y permite al DM cerrar la tirada ajena", async () => {
  await act(async () => root.render(<DicePublicStatus activity={activity} selfAuthorId="bruno" closeAny={false} onDismiss={vi.fn()} />));
  expect(host.querySelector("button")).toBeNull();
  await act(async () => root.render(<DicePublicStatus activity={activity} selfAuthorId="dm" closeAny onDismiss={vi.fn()} />));
  expect(host.querySelector('[aria-label="Cerrar tirada de Ana · 4821"]')).not.toBeNull();
});

it("mantiene el estado externo compacto durante el replay y deshabilita el cierre sin conexión", async () => {
  const settledAt = Date.now() + 10_000;
  const dismiss = vi.fn();
  await act(async () => root.render(<DicePublicStatus activity={{ ...activity, phase: "settled", settledAt, result: { groups: [], poolTotal: 17, d20: null } }} selfAuthorId="ana" closeAny={false} connected={false} onDismiss={dismiss} />));
  expect(host.textContent).toContain("Tirada rodando");
  expect(host.querySelector(".dice-result")).toBeNull();
  expect(host.textContent).not.toContain("17");
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Cerrar mi tirada"]')?.disabled).toBe(true);
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Cerrar mi tirada"]')?.click());
  expect(dismiss).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Reconecta para cerrar la tirada.");
});

it("muestra la pose recuperada como asentada cuando llega después del montaje", async () => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(100);
  try {
    await act(async () => root.render(<DicePublicStatus activity={null} selfAuthorId="ana" closeAny={false} onDismiss={vi.fn()} />));
    clock.mockReturnValue(250);
    await act(async () => root.render(<DicePublicStatus activity={{ ...activity, phase: "settled", settledAt: 200, result: { groups: [], poolTotal: 17, d20: null } }} selfAuthorId="ana" closeAny={false} onDismiss={vi.fn()} />));
    expect(host.textContent).toContain("Tirada en pantalla");
    expect(host.textContent).not.toContain("Tirada rodando");
  } finally { clock.mockRestore(); }
});
