// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { HeaderDropdown } from "./HeaderDropdown";

it("Escape restaura foco; salir, seleccionar y abrir otro desplegable cierran el anterior", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host), selected = vi.fn();
  try {
    await act(async () => root.render(<>
      <HeaderDropdown title="Cuenta" label="Cuenta"><button onClick={selected}>Salir</button></HeaderDropdown>
      <HeaderDropdown title="Partida" label="Partida"><button disabled>Cerrar partida</button></HeaderDropdown>
      <button id="outside">Fuera</button>
    </>));
    const [first, second] = host.querySelectorAll("details"), trigger = first.querySelector("summary")!, action = first.querySelector("button")!;
    await act(async () => { trigger.click(); action.focus(); });
    expect(first.open).toBe(true);
    await act(async () => action.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    expect(first.open).toBe(false); expect(document.activeElement).toBe(trigger); expect(selected).not.toHaveBeenCalled();
    await act(async () => { trigger.click(); action.click(); });
    expect(first.open).toBe(false); expect(selected).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(trigger);
    await act(async () => { trigger.click(); second.querySelector("summary")!.focus(); second.querySelector("summary")!.click(); });
    expect(first.open).toBe(false); expect(second.open).toBe(true);
    await act(async () => second.querySelector("button")!.click()); expect(second.open).toBe(true);
    await act(async () => host.querySelector("#outside")!.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(second.open).toBe(false);
  } finally { await act(async () => root.unmount()); host.remove(); }
});
