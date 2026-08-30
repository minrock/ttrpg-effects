// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("safe markdown rendering", () => {
  it("keeps GFM tables", () => {
    const html = renderMarkdown("| Stat | Valor |\n| --- | --- |\n| CA | 15 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>15</td>");
  });

  it("renders inline table checkboxes without ending the table", () => {
    const markdown = "| Estatua | Estado |\n| --- | --- |\n| Vampiro | [ ] 1 |\n| Lich | [x] 2 |";
    const html = renderMarkdown(markdown, { interactiveChecklists: true });
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(document.querySelectorAll("td input[type=checkbox]")).toHaveLength(2);
    expect(document.querySelectorAll("td input:checked")).toHaveLength(1);
  });

  it("repairs table rows serialized by legacy block task lists", () => {
    const markdown = "| Estatua | Estado |\n| --- | --- |\n| Vampiro | [ ] 1\n\n  |\n| Lich | [ ] 2\n\n  |";
    const html = renderMarkdown(markdown);
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(document.body.textContent).not.toContain("| Lich |");
  });

  it("renders the document formats produced by the note toolbar", () => {
    const html = renderMarkdown(
      "## Sala central\n\n- Puerta norte\n- Altar\n\n**Peligro** y <u>secreto</u>.\n\n[Mapa](https://example.com)"
    );

    expect(html).toContain("<h2>Sala central</h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>Peligro</strong>");
    expect(html).toContain("<u>secreto</u>");
    expect(html).toContain('href="https://example.com"');
  });

  it("removes raw HTML, event handlers and unsafe links", () => {
    const html = renderMarkdown(
      '<script>alert(1)</script><img src="x" onerror="alert(2)">\n[abrir](javascript:alert(3))'
    );
    expect(html).not.toContain("script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });

  it("renders callouts consistently without consumer-specific flags", () => {
    const markdown = ':::callout emoji="⚠️" color="#CC3300"\n**Peligro** en la sala.\n:::';
    const calloutHtml = renderMarkdown(markdown);

    expect(calloutHtml).toContain('class="markdown-callout"');
    expect(calloutHtml).toContain('data-callout-color="#CC3300"');
    expect(calloutHtml).toContain("<strong>Peligro</strong>");
    expect(calloutHtml).not.toContain(":::callout");
  });

  it("falls back safely for invalid metadata and still sanitizes its body", () => {
    const html = renderMarkdown(
      ':::callout emoji="texto" color="red; background:url(javascript:alert(1))"\n<img src="x" onerror="alert(2)">Contenido\n:::'
    );

    expect(html).toContain('data-callout-color="#D5AB5D"');
    expect(html).not.toContain("data-callout-emoji");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror");
    expect(html).toContain("Contenido");
  });

  it("indexes task inputs and only enables them for an editable DM preview", () => {
    const markdown = "- [ ] Pendiente\n- [x] Completa";
    const readonlyHtml = renderMarkdown(markdown);
    const editableHtml = renderMarkdown(markdown, { interactiveChecklists: true });

    expect(readonlyHtml).toContain('data-checklist-index="0"');
    expect(readonlyHtml).toContain('class="task-list-item__label"');
    expect(readonlyHtml).toContain('class="task-list-item__content"> Pendiente</span>');
    expect(readonlyHtml).toContain("disabled");
    expect(editableHtml).toContain('data-checklist-index="1"');
    expect(editableHtml).not.toContain("disabled");
  });

  it("keeps nested checklists outside the inline checkbox label", () => {
    const html = renderMarkdown("- [ ] Principal\n  - [ ] Secundaria");
    const document = new DOMParser().parseFromString(html, "text/html");
    const firstItem = document.querySelector("li.task-list-item");

    expect(firstItem?.querySelector(":scope > label > .task-list-item__content")?.textContent).toContain("Principal");
    expect(firstItem?.querySelector(":scope > label > ul")).toBeNull();
    expect(firstItem?.querySelector(":scope > ul.contains-task-list")).not.toBeNull();
  });
});
