const tableTaskPattern = /(^|\s)\[([ xX])\](?=\s|$)/g;

export function normalizeTableTaskCheckboxMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trimStart().startsWith("|") || line.trimEnd().endsWith("|") || !/\[[ xX]\]/.test(line)) continue;

    let closingIndex = index + 1;
    while (closingIndex < lines.length && lines[closingIndex].trim() === "") closingIndex += 1;
    if (lines[closingIndex]?.trim() !== "|") continue;

    lines[index] = `${line.trimEnd()} |`;
    lines.splice(index + 1, closingIndex - index);
  }

  return lines.join("\n");
}

export function upgradeTableTaskCheckboxTokens(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("th, td").forEach((cell) => {
    const document = cell.ownerDocument;
    const nodeFilter = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
    const walker = document.createTreeWalker(cell, nodeFilter);
    const textNodes: Text[] = [];
    let current = walker.nextNode();

    while (current !== null) {
      if (current.parentElement?.closest("[data-table-task-checkbox]") === null) textNodes.push(current as Text);
      current = walker.nextNode();
    }

    textNodes.forEach(replaceTaskTokensInTextNode);
  });
}

export function renderTableTaskCheckboxInputs(root: HTMLElement): void {
  upgradeTableTaskCheckboxTokens(root);
  root.querySelectorAll<HTMLElement>("span[data-table-task-checkbox]").forEach((marker) => {
    const label = marker.ownerDocument.createElement("label");
    label.className = "table-task-checkbox";
    const input = marker.ownerDocument.createElement("input");
    input.type = "checkbox";
    input.checked = marker.dataset["checked"] === "true";
    if (input.checked) input.setAttribute("checked", "");
    label.append(input);
    marker.replaceWith(label);
  });
}

function replaceTaskTokensInTextNode(textNode: Text): void {
  const source = textNode.data;
  const matches = [...source.matchAll(tableTaskPattern)];
  if (matches.length === 0) return;

  const fragment = textNode.ownerDocument.createDocumentFragment();
  let cursor = 0;

  matches.forEach((match) => {
    const prefix = match[1] ?? "";
    const markerStart = (match.index ?? 0) + prefix.length;
    fragment.append(source.slice(cursor, markerStart));
    const marker = textNode.ownerDocument.createElement("span");
    marker.dataset["tableTaskCheckbox"] = "";
    marker.dataset["checked"] = String((match[2] ?? "").toLowerCase() === "x");
    fragment.append(marker);
    cursor = markerStart + 3;
  });

  fragment.append(source.slice(cursor));
  textNode.replaceWith(fragment);
}
