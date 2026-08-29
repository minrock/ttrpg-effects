// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("safe markdown rendering", () => {
  it("keeps GFM tables", () => {
    const html = renderMarkdown("| Stat | Valor |\n| --- | --- |\n| CA | 15 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>15</td>");
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
});
