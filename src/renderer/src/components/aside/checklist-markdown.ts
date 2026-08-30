export interface ChecklistState {
  readonly total: number;
  readonly checked: number;
}

interface ChecklistMarker {
  readonly checkedIndex: number;
  readonly checked: boolean;
}

const taskItemPattern = /^(\s*[-+*]\s+\[)([ xX])(\](?:\s|$))/;
const tableTaskPattern = /(^|\|)(\s*\[)([ xX])(\](?=\s|$))/g;
const fencePattern = /^\s{0,3}(`{3,}|~{3,})/;

export function getChecklistState(markdown: string): ChecklistState {
  let total = 0;
  let checked = 0;

  visitChecklistMarkers(markdown, (marker) => {
    total += 1;
    if (marker.checked) checked += 1;
    return null;
  });

  return { total, checked };
}

export function setChecklistItemChecked(markdown: string, itemIndex: number, checked: boolean): string {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return markdown;
  let currentIndex = 0;

  return visitChecklistMarkers(markdown, (marker) => {
    if (currentIndex !== itemIndex) {
      currentIndex += 1;
      return null;
    }

    currentIndex += 1;
    return marker.checked === checked ? null : checked ? "x" : " ";
  });
}

export function resetChecklist(markdown: string): string {
  return visitChecklistMarkers(markdown, (marker) => marker.checked ? " " : null);
}

type ChecklistMarkerVisitor = (marker: ChecklistMarker) => string | null;

function visitChecklistMarkers(markdown: string, visitor: ChecklistMarkerVisitor): string {
  const parts = markdown.split(/(\r?\n)/);
  let activeFence: { readonly character: string; readonly length: number } | null = null;

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index];
    const fence = line.match(fencePattern)?.[1];

    if (fence !== undefined) {
      if (activeFence === null) {
        activeFence = { character: fence[0], length: fence.length };
      } else if (fence[0] === activeFence.character && fence.length >= activeFence.length) {
        activeFence = null;
      }
      continue;
    }

    if (activeFence !== null) continue;
    const markers = findChecklistMarkers(line);
    if (markers.length === 0) continue;

    const characters = [...line];
    markers.forEach((marker) => {
      const replacement = visitor(marker);
      if (replacement !== null) characters[marker.checkedIndex] = replacement;
    });
    parts[index] = characters.join("");
  }

  return parts.join("");
}

function findChecklistMarkers(line: string): ChecklistMarker[] {
  const taskItem = line.match(taskItemPattern);
  if (taskItem !== null) {
    const checked = taskItem[2] ?? " ";
    return [{ checkedIndex: (taskItem[1] ?? "").length, checked: checked.toLowerCase() === "x" }];
  }

  if (!line.includes("|")) return [];
  return [...line.matchAll(tableTaskPattern)].map((match) => {
    const checked = match[3] ?? " ";
    return {
      checkedIndex: (match.index ?? 0) + (match[1] ?? "").length + (match[2] ?? "").length,
      checked: checked.toLowerCase() === "x"
    };
  });
}
