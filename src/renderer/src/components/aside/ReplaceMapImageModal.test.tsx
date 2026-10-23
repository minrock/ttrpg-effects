// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplacementDraft } from "../../hooks/useMapImageReplacement";
import { ReplaceMapImageModal } from "./ReplaceMapImageModal";

function createDraft(overrides: Partial<ReplacementDraft> = {}): ReplacementDraft {
  return {
    mapId: "inactive", mapName: "Cripta",
    previous: { imagePath: "/maps/old.png", position: { x: 40, y: 80 }, scale: 1.5, imageSize: { width: 200, height: 100 } },
    previousUrl: "map-asset:///maps/old.png?revision=old",
    imagePath: "/maps/new.png", imageUrl: "map-asset:///maps/new.png?revision=new",
    previewUrl: "data:image/png;base64,cHJldmlldw==", imageSize: { width: 400, height: 200 },
    preserveError: null, ...overrides
  };
}

describe("ReplaceMapImageModal", () => {
  let container: HTMLDivElement;
  let root: Root;
  let trigger: HTMLButtonElement;
  const onConfirm = vi.fn();
  const onCancel = vi.fn(() => root.render(null));

  function render(draft = createDraft(), error: string | null = null): void {
    act(() => root.render(<ReplaceMapImageModal draft={draft} error={error} onConfirm={onConfirm} onCancel={onCancel} />));
  }

  function element<T extends HTMLElement>(selector: string): T {
    const found = document.querySelector<T>(`[role="dialog"] ${selector}`);
    expect(found).not.toBeNull();
    return found!;
  }

  function radios(): NodeListOf<HTMLInputElement> {
    return document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[type="radio"]');
  }

  function apply(): HTMLButtonElement {
    return element<HTMLButtonElement>("footer button:last-child");
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    trigger = document.createElement("button");
    trigger.textContent = "Actualizar imagen de Cripta";
    container = document.createElement("div");
    document.body.append(trigger, container);
    trigger.focus();
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    trigger.remove();
  });

  it("defaults to preserving world size and confirms that exact policy", () => {
    const draft = createDraft();
    render(draft);
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("true");
    expect(radios()[0].checked).toBe(true);
    expect(radios()[0].disabled).toBe(false);
    expect(radios()[1].checked).toBe(false);
    expect(apply().disabled).toBe(false);
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    const previews = document.querySelectorAll("figure img");
    expect(previews[0].getAttribute("src")).toBe(draft.previousUrl);
    expect(previews[1].getAttribute("src")).toBe(draft.previewUrl);
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("400 x 200 px");
    act(() => apply().click());
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("preserve-world-size");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it.each([
    { reason: "aspect mismatch", imageSize: { width: 400, height: 100 }, preserveError: "La proporcion de la imagen cambio." },
    { reason: "scale limits", imageSize: { width: 4000, height: 2000 }, preserveError: "La escala esta fuera de 0.25 a 4." },
    { reason: "unknown original dimensions", imageSize: { width: 400, height: 200 }, preserveError: "No se conocen dimensiones anteriores.", unknown: true }
  ])("requires acknowledgement before keep-scale with $reason", ({ imageSize, preserveError, unknown }) => {
    const draft = createDraft({ imageSize, preserveError });
    render(unknown ? { ...draft, previous: { ...draft.previous, imageSize: undefined }, previousUrl: null } : draft);
    expect(radios()[0].disabled).toBe(true);
    expect(radios()[0].checked).toBe(false);
    expect(radios()[1].checked).toBe(true);
    expect(element('[role="status"]').textContent).toBe(preserveError);
    expect(apply().disabled).toBe(true);
    act(() => apply().click());
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => element<HTMLInputElement>('input[type="checkbox"]').click());
    expect(apply().disabled).toBe(false);
    act(() => apply().click());
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("keep-scale");
  });

  it("requires explicit acknowledgement for a compatible resize when keep-scale is selected", () => {
    render();
    act(() => radios()[1].click());
    expect(apply().disabled).toBe(true);
    act(() => element<HTMLInputElement>('input[type="checkbox"]').click());
    expect(apply().disabled).toBe(false);
    act(() => apply().click());
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("keep-scale");
  });

  it("does not carry acknowledgement across policy changes", () => {
    render();
    act(() => radios()[1].click());
    act(() => element<HTMLInputElement>('input[type="checkbox"]').click());
    act(() => radios()[0].click());
    expect(apply().disabled).toBe(false);
    act(() => radios()[1].click());
    expect(element<HTMLInputElement>('input[type="checkbox"]').checked).toBe(false);
    expect(apply().disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("allows explicit keep-scale without acknowledgement when dimensions match", () => {
    render(createDraft({ imageSize: { width: 200, height: 100 } }));
    expect(radios()[1].parentElement?.textContent).toContain("150%");
    act(() => radios()[1].click());
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(apply().disabled).toBe(false);
    act(() => apply().click());
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("keep-scale");
  });

  it("cancels with Escape, stops canvas shortcuts and restores the invoking control's focus", () => {
    render();
    expect(document.activeElement).toBe(element('[aria-label="Cancelar actualizacion"]'));
    const canvasKeydown = vi.fn();
    document.body.addEventListener("keydown", canvasKeydown);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => document.activeElement!.dispatchEvent(escape));
    document.body.removeEventListener("keydown", canvasKeydown);
    expect(escape.defaultPrevented).toBe(true);
    expect(canvasKeydown).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it.each(["close", "cancel", "backdrop"])("cancels using %s without confirming", (control) => {
    render();
    act(() => {
      if (control === "backdrop") {
        document.querySelector(".modal-backdrop")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      } else {
        element<HTMLButtonElement>(control === "close" ? '[aria-label="Cancelar actualizacion"]' : "footer button:first-child").click();
      }
    });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps tab focus within the dialog and ignores interior backdrop clicks", () => {
    render();
    const first = element<HTMLButtonElement>('[aria-label="Cancelar actualizacion"]');
    const last = apply();
    last.focus();
    act(() => last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(first);
    act(() => first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(last);
    act(() => element("h2").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("shows a recoverable apply error and keeps cancellation available", () => {
    render(createDraft(), "El mapa cambio mientras se preparaba la imagen.");
    expect(element('[role="alert"]').textContent).toContain("El mapa cambio");
    act(() => element<HTMLButtonElement>("footer button:first-child").click());
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
