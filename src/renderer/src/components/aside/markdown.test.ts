// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("safe markdown rendering", () => {
  it("keeps GFM tables", () => {
    const html = renderMarkdown("| Stat | Valor |\n| --- | --- |\n| CA | 15 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>15</td>");
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
