// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RichTextPreview } from "./RichTextPreview";

describe("RichTextPreview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("updates the markdown source when a DM checks an item", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <RichTextPreview
          markdown="- [ ] Abrir puerta"
          mode="dm-editable"
          onChange={onChange}
        />
      );
    });

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.disabled).toBe(false);
    act(() => checkbox?.click());
    expect(onChange).toHaveBeenCalledWith("- [x] Abrir puerta");
  });

  it("resets all checked items without changing the rest of the document", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <RichTextPreview
          markdown={"# Turno\n\n- [x] Mover\n- [ ] Accion"}
          mode="dm-editable"
          onChange={onChange}
        />
      );
    });

    const reset = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Reiniciar checklist"));
    expect(reset).toBeDefined();
    expect(reset?.disabled).toBe(false);
    act(() => reset?.click());
    expect(onChange).toHaveBeenCalledWith("# Turno\n\n- [ ] Mover\n- [ ] Accion");
  });

  it("updates an inline checkbox without breaking its table row", () => {
    const onChange = vi.fn();
    const markdown = "| Estatua | Estado |\n| --- | --- |\n| Vampiro | [ ] 1 |\n| Lich | [x] 2 |";
    act(() => {
      root.render(<RichTextPreview markdown={markdown} mode="dm-editable" onChange={onChange} />);
    });

    const checkboxes = container.querySelectorAll<HTMLInputElement>("td input[type=checkbox]");
    expect(checkboxes).toHaveLength(2);
    act(() => checkboxes[0]?.click());
    expect(onChange).toHaveBeenCalledWith(markdown.replace("[ ] 1", "[x] 1"));
  });

  it("keeps player-facing previews read only", () => {
    act(() => {
      root.render(<RichTextPreview markdown="- [x] Secreto" mode="readonly" />);
    });

    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(true);
    expect(container.textContent).not.toContain("Reiniciar checklist");
  });
});
