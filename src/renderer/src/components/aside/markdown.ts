import { marked } from "marked";

export function renderMarkdown(markdown: string): string {
  return marked.parse(normalizeLooseMarkdownTables(markdown), {
    async: false,
    breaks: false,
    gfm: true
  }) as string;
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
