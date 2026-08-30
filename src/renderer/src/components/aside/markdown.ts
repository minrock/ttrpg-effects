import { marked, Renderer } from "marked";
import DOMPurify from "dompurify";
import { encodeCalloutDirectivesAsBlockquotes, upgradeCalloutBlockquotes } from "./callout";
import {
  normalizeTableTaskCheckboxMarkdown,
  renderTableTaskCheckboxInputs
} from "./table-task-checkbox";

const safeRenderer = new Renderer();
safeRenderer.html = (): string => "";

const UNDERLINE_OPEN_TOKEN = "TTRPGUNDERLINEOPEN";
const UNDERLINE_CLOSE_TOKEN = "TTRPGUNDERLINECLOSE";

interface MarkdownRenderOptions {
  readonly interactiveChecklists?: boolean;
}

export function renderMarkdown(markdown: string, options: MarkdownRenderOptions = {}): string {
  const normalized = preserveUnderlineMarkup(
    normalizeLooseMarkdownTables(normalizeTableTaskCheckboxMarkdown(markdown))
  );
  const source = encodeCalloutDirectivesAsBlockquotes(normalized);
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

  const document = new DOMParser().parseFromString(`<body>${sanitized}</body>`, "text/html");
  upgradeCalloutBlockquotes(document.body);
  renderTableTaskCheckboxInputs(document.body);
  decorateChecklistInputs(document.body, options.interactiveChecklists === true);
  return document.body.innerHTML;
}

function decorateChecklistInputs(root: HTMLElement, interactive: boolean): void {
  const inputs = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  inputs.forEach((input, index) => {
    wrapChecklistItemContent(input);
    input.dataset.checklistIndex = String(index);
    input.setAttribute("aria-label", input.checked ? "Tarea completada" : "Tarea pendiente");
    if (interactive) input.removeAttribute("disabled");
    else input.setAttribute("disabled", "");
  });
}

function wrapChecklistItemContent(input: HTMLInputElement): void {
  const item = input.closest("li");
  if (item === null || input.parentElement?.classList.contains("task-list-item__label")) return;

  item.classList.add("task-list-item");
  if (item.parentElement?.tagName === "UL") item.parentElement.classList.add("contains-task-list");

  const label = item.ownerDocument.createElement("label");
  label.className = "task-list-item__label";
  item.insertBefore(label, input);
  label.append(input);

  const content = item.ownerDocument.createElement("span");
  content.className = "task-list-item__content";
  while (label.nextSibling !== null && !isNestedList(label.nextSibling)) {
    content.append(label.nextSibling);
  }
  label.append(content);
}

function isNestedList(node: ChildNode): boolean {
  return node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL");
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
