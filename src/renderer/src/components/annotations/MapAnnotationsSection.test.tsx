// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MapAnnotationsSection } from "./MapAnnotationsSection";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("expone Mostrar anotaciones como el switch compartido accesible", async () => {
  const onVisibleChange = vi.fn();
  await act(async () => root.render(<MapAnnotationsSection visible={false} onVisibleChange={onVisibleChange} />));

  const control = host.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Mostrar anotaciones"]');
  expect(control?.getAttribute("aria-checked")).toBe("false");
  expect(control?.classList.contains("shared-switch")).toBe(true);
  await act(async () => control?.click());
  expect(onVisibleChange).toHaveBeenCalledWith(true);
});
