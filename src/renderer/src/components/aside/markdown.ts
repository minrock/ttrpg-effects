import { marked, Renderer } from "marked";
import DOMPurify from "dompurify";

const safeRenderer = new Renderer();
safeRenderer.html = (): string => "";

const UNDERLINE_OPEN_TOKEN = "TTRPGUNDERLINEOPEN";
const UNDERLINE_CLOSE_TOKEN = "TTRPGUNDERLINECLOSE";

export function renderMarkdown(markdown: string): string {
  const source = preserveUnderlineMarkup(normalizeLooseMarkdownTables(markdown));
  const html = marked.parse(source, {
    async: false,
    breaks: false,
    gfm: true,
    renderer: safeRenderer
  }) as string;

  const restoredHtml = html
    .replaceAll(UNDERLINE_OPEN_TOKEN, "<u>")
    .replaceAll(UNDERLINE_CLOSE_TOKEN, "</u>");

  return DOMPurify.sanitize(restoredHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"]
  });
}

function preserveUnderlineMarkup(markdown: string): string {
  return markdown
    .replaceAll(/<u>/gi, UNDERLINE_OPEN_TOKEN)
    .replaceAll(/<\/u>/gi, UNDERLINE_CLOSE_TOKEN);
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
