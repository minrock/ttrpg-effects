// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { AreaContextToolbar } from "./AreaContextToolbar";
import { ALLOWED_SHAPE_EMOJIS } from "../../../../domain/shapes/shape-emojis";
const dispose: (() => void)[] = [];
afterEach(() => { dispose.splice(0).forEach(fn => fn()); });
async function setup(locked = false) {
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const patch = vi.fn(), remove = vi.fn(), copy = vi.fn(), lock = vi.fn(), close = vi.fn();
  await act(async () => root.render(<AreaContextToolbar shape={{ id: "a", type: "circle", radius: 30, points: [{ x: 0, y: 0 }], locked }} bounds={() => ({ left: 10, right: 120, top: 90, bottom: 190, mapLeft: 0, mapTop: 40, mapRight: 390, mapBottom: 700 })} onPatch={patch} onDelete={remove} onCopy={copy} onLock={lock} onClose={close} />));
  dispose.push(() => { act(() => root.unmount()); host.remove(); });
  const button = (name: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find(b => (b.getAttribute("aria-label") ?? b.textContent) === name)!;
  return { host, patch, remove, copy, lock, close, button };
}
it("paleta del catálogo, selección única y Escape restituye foco", async () => {
  const f = await setup(); await act(async () => f.button("Patrón").click());
  expect(f.host.querySelectorAll('.area-context__patterns button')).toHaveLength(ALLOWED_SHAPE_EMOJIS.length + 1);
  await act(async () => f.button("Hielo / frío").click()); expect(f.patch).toHaveBeenCalledWith({ emoji: "❄️", areaPattern: "checkerboard" });
  expect(document.activeElement).toBe(f.button("Patrón"));
  await act(async () => f.button("Patrón").click());
  await act(async () => f.button("Sin patrón").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(f.host.querySelector('.area-context__patterns')).toBeNull(); expect(f.close).not.toHaveBeenCalled();
  const rect = f.host.querySelector<HTMLElement>('.area-context')!; expect(Number.parseFloat(rect.style.left)).toBeGreaterThanOrEqual(8); expect(Number.parseFloat(rect.style.width)).toBeLessThanOrEqual(374);
});
it("bloqueo deja solo desbloquear disponible y no dispara borrar/copiar", async () => {
  const f = await setup(true);
  for (const name of ["Color", "Patrón", "Eliminar", "Copiar"]) { expect(f.button(name).disabled).toBe(true); await act(async () => f.button(name).click()); }
  expect(f.remove).not.toHaveBeenCalled(); expect(f.copy).not.toHaveBeenCalled();
  await act(async () => f.button("Desbloquear").click()); expect(f.lock).toHaveBeenCalledOnce();
});
