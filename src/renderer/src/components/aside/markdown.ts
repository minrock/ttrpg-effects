import { marked, Renderer } from "marked";
import DOMPurify from "dompurify";
import { encodeCalloutDirectivesAsBlockquotes, upgradeCalloutBlockquotes } from "./callout";

const safeRenderer = new Renderer();
safeRenderer.html = (): string => "";

const UNDERLINE_OPEN_TOKEN = "TTRPGUNDERLINEOPEN";
const UNDERLINE_CLOSE_TOKEN = "TTRPGUNDERLINECLOSE";

interface MarkdownRenderOptions {
  readonly callouts?: boolean;
}

export function renderMarkdown(markdown: string, options: MarkdownRenderOptions = {}): string {
  const normalized = preserveUnderlineMarkup(normalizeLooseMarkdownTables(markdown));
  const source = options.callouts === true ? encodeCalloutDirectivesAsBlockquotes(normalized) : normalized;
  const html = marked.parse(source, {
    async: false,
    breaks: false,
    gfm: true,
    renderer: safeRenderer
  }) as string;

  const restoredHtml = html
    .replaceAll(UNDERLINE_OPEN_TOKEN, "<u>")
    .replaceAll(UNDERLINE_CLOSE_TOKEN, "</u>");

  const sanitized = DOMPurify.sanitize(restoredHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"]
  });

  if (options.callouts !== true) return sanitized;
  const document = new DOMParser().parseFromString(`<body>${sanitized}</body>`, "text/html");
  upgradeCalloutBlockquotes(document.body);
  return document.body.innerHTML;
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
