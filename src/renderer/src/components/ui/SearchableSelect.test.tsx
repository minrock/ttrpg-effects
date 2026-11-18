// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SearchableSelect, type SearchableSelectOption } from "./SearchableSelect";

const options: readonly SearchableSelectOption[] = Array.from({ length: 12 }, (_, index) => ({ id: `template-${index + 1}`, name: `Plantilla ${index + 1}` }));
let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

function setInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("filtra y confirma la opción posterior a la décima sin enviar el formulario", async () => {
  const selected = vi.fn(); const submitted = vi.fn();
  function Example() { const [value, setValue] = useState<string | null>(null); return <form onSubmit={event => { event.preventDefault(); submitted(); }}><SearchableSelect label="Plantilla" options={options} value={value} onChange={id => { selected(id); setValue(id); }}/></form>; }
  await act(async () => root.render(<Example/>));
  const input = host.querySelector<HTMLInputElement>('[role="combobox"]')!;
  await act(async () => { input.click(); setInput(input, "12"); });
  expect(host.querySelectorAll('[role="option"]')).toHaveLength(1);
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  expect(selected).toHaveBeenCalledWith("template-12");
  expect(submitted).not.toHaveBeenCalled();
  expect(input.value).toBe("Plantilla 12");
});

it("Escape y Tab cierran la consulta sin cambiar el valor confirmado", async () => {
  const selected = vi.fn();
  await act(async () => root.render(<SearchableSelect label="Plantilla" options={options} value="template-2" onChange={selected}/>));
  const input = host.querySelector<HTMLInputElement>('[role="combobox"]')!;
  await act(async () => { input.click(); setInput(input, "inexistente"); input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); });
  expect(host.querySelector('[role="listbox"]')).toBeNull();
  expect(input.value).toBe("Plantilla 2");
  expect(selected).not.toHaveBeenCalled();
  await act(async () => input.click());
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
  expect(host.querySelector('[role="listbox"]')).toBeNull();
  expect(selected).not.toHaveBeenCalled();
});

it("no confirma durante composición IME y muestra una plantilla retenida sin crear una opción", async () => {
  const selected = vi.fn();
  await act(async () => root.render(<SearchableSelect label="Plantilla" options={options} value={null} fallbackLabel="Plantilla retenida (no disponible)" onChange={selected}/>));
  const input = host.querySelector<HTMLInputElement>('[role="combobox"]')!;
  expect(input.value).toBe("Plantilla retenida (no disponible)");
  await act(async () => { input.click(); input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true })); });
  expect(selected).not.toHaveBeenCalled();
  expect(host.querySelectorAll('[role="option"]')).toHaveLength(12);
});
