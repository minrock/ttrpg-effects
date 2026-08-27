import { marked, Renderer } from "marked";
import DOMPurify from "dompurify";

const safeRenderer = new Renderer();
safeRenderer.html = (): string => "";

export function renderMarkdown(markdown: string): string {
  const html = marked.parse(normalizeLooseMarkdownTables(markdown), {
    async: false,
    breaks: false,
    gfm: true,
    renderer: safeRenderer
  }) as string;

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"]
  });
}

function normalizeLooseMarkdownTables(markdown: string): string {
  const lines = markdown.split(/\r?\n/);

  return lines
    .filter((line, index) => {
      if (line.trim() !== "") return true;

      const previousLine = findPreviousNonEmptyLine(lines, index);
      const nextLine = findNextNonEmptyLine(lines, index);

      return !(isPipeTableLine(previousLine) && isPipeTableLine(nextLine));
    })
    .join("\n");
}

function findPreviousNonEmptyLine(lines: readonly string[], fromIndex: number): string {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    if (lines[index].trim() !== "") return lines[index];
  }
  return "";
}

function findNextNonEmptyLine(lines: readonly string[], fromIndex: number): string {
  for (let index = fromIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() !== "") return lines[index];
  }
  return "";
}

function isPipeTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.slice(1, -1).includes("|");
}
