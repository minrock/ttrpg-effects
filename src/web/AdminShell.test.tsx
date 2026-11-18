// @vitest-environment jsdom
import { act, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

let host: HTMLDivElement, root: Root;
let matches = true;
const listeners = new Set<(event: MediaQueryListEvent) => void>();
function mediaQuery(): MediaQueryList {
  const add = (_type: string, listener: unknown) => { if (typeof listener === "function") listeners.add(listener as (event: MediaQueryListEvent) => void); };
  const remove = (_type: string, listener: unknown) => { if (typeof listener === "function") listeners.delete(listener as (event: MediaQueryListEvent) => void); };
  return { media: "(min-width: 960px)", get matches() { return matches; }, onchange: null, addEventListener: add, removeEventListener: remove, addListener: (listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null) => { if (listener) listeners.add(listener as unknown as (event: MediaQueryListEvent) => void); }, removeListener: (listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null) => { if (listener) listeners.delete(listener as unknown as (event: MediaQueryListEvent) => void); }, dispatchEvent: () => true } as unknown as MediaQueryList;
}
function setViewport(next: boolean) { matches = next; for (const listener of listeners) listener({ matches: next, media: "(min-width: 960px)" } as MediaQueryListEvent); }
function Example({ role = "dm" as const }: { readonly role?: "dm" | "admin" }) {
  return <AdminShell role={role} activePath="/admin/cuentas" onAdminNavigate={vi.fn()}>{({ navigationSlot, navigationOpen, toggleNavigation, navigationTriggerRef, onNavigation, navigationId }) => <>
    <header><button ref={navigationTriggerRef} aria-controls={navigationId} aria-expanded={navigationOpen} onClick={toggleNavigation}>Alternar navegación</button></header>
    <main><h1 tabIndex={-1}>Destino</h1>{navigationSlot ? createPortal(<button aria-current="page" onClick={onNavigation}>Campañas</button>, navigationSlot) : null}</main>
  </>}</AdminShell>;
}
function AsyncAdminExample() {
  const [path, setPath] = useState("/admin/cuentas");
  return <AdminShell role="admin" activePath={path} onAdminNavigate={async next => { await Promise.resolve(); setPath(next); return true; }}>{({ navigationOpen, toggleNavigation, navigationTriggerRef, navigationId }) => <><header><button ref={navigationTriggerRef} aria-controls={navigationId} aria-expanded={navigationOpen} onClick={toggleNavigation}>Alternar navegación</button></header><main><h2 tabIndex={-1}>{path === "/admin/sistemas" ? "Sistemas" : "Cuentas DM"}</h2></main></>}</AdminShell>;
}
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); matches = true; listeners.clear(); vi.stubGlobal("matchMedia", vi.fn(mediaQuery)); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function render(element = <Example />) { await act(async () => root.render(element)); await act(async () => { await Promise.resolve(); }); }
async function click(label: string) { const button = [...host.querySelectorAll("button")].find(value => value.textContent === label); expect(button).toBeTruthy(); await act(async () => button!.click()); await act(async () => { await Promise.resolve(); }); }

it("presenta una sola columna estructural y alterna sin remontar el contenido", async () => {
  await render();
  expect(host.querySelector(".admin-sidebar")).toBeTruthy();
  expect(host.querySelector(".admin-shell-main h1")?.textContent).toBe("Destino");
  await click("Alternar navegación");
  expect(host.querySelector(".admin-sidebar")).toBeNull();
  expect(host.querySelector(".admin-shell-main h1")?.textContent).toBe("Destino");
  await click("Alternar navegación");
  expect(host.querySelector(".admin-sidebar")).toBeTruthy();
});

it("en estrecho usa drawer, aísla el contenido y Escape devuelve el foco", async () => {
  matches = false;
  await render();
  const trigger = [...host.querySelectorAll("button")].find(value => value.textContent === "Alternar navegación")!;
  trigger.focus(); await click("Alternar navegación");
  expect(host.querySelector('[role="dialog"]')).toBeTruthy();
  expect(host.querySelector(".admin-shell-main")?.hasAttribute("inert")).toBe(true);
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("cerrar por navegación enfoca el título y un breakpoint no deja drawer", async () => {
  matches = false;
  await render(); await click("Alternar navegación"); await click("Campañas");
  await act(async () => { await Promise.resolve(); });
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(host.querySelector("h1"));
  await click("Alternar navegación");
  expect(host.querySelector('[role="dialog"]')).toBeTruthy();
  await act(async () => setViewport(true));
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelector(".admin-sidebar")).toBeTruthy();
});

it("al pasar de escritorio a estrecho devuelve el foco del sidebar al disparador", async () => {
  await render();
  const navigation = host.querySelector<HTMLButtonElement>('[aria-current="page"]')!;
  navigation.focus();
  await act(async () => setViewport(false));
  await act(async () => { await Promise.resolve(); });
  const trigger = [...host.querySelectorAll("button")].find(value => value.textContent === "Alternar navegación");
  expect(document.activeElement).toBe(trigger);
  expect(host.querySelector('[role="dialog"]')).toBeNull();
});

it("el administrador expone solo sus rutas y conserva una hoja activa", async () => {
  await render(<Example role="admin"/>);
  const current = host.querySelectorAll('[aria-current="page"]');
  expect(current).toHaveLength(1);
  expect(current[0]?.textContent).toBe("Cuentas DM");
  expect(host.textContent).toContain("Sistemas");
  expect(host.textContent).not.toContain("Campañas");
});

it("espera una navegación administrativa asíncrona antes de enfocar el nuevo encabezado", async () => {
  matches = false;
  await render(<AsyncAdminExample/>); await click("Alternar navegación"); await click("Sistemas");
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(host.querySelector("h2"));
  expect(host.querySelector("h2")?.textContent).toBe("Sistemas");
});
