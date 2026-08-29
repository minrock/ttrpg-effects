export const DEFAULT_CALLOUT_COLOR = "#D5AB5D";
export const CALLOUT_PASTEL_MIX = 0.8;

export interface CalloutAttributes {
  readonly emoji: string | null;
  readonly color: string;
}

const CALLOUT_OPEN_PATTERN = /^:::callout(?:\s+(.*))?$/;
const CALLOUT_ATTRIBUTE_PATTERN = /([a-z]+)="([^"]*)"/g;
const CALLOUT_MARKER = "TTRPGCALLOUT:";
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;

export function normalizeCalloutColor(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_CALLOUT_COLOR;
  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : DEFAULT_CALLOUT_COLOR;
}

export function normalizeCalloutEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized === "") return null;

  const segments = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(normalized)];
  if (segments.length !== 1 || !EMOJI_PATTERN.test(normalized)) return null;
  return normalized;
}

export function mixCalloutPastel(color: unknown, whiteRatio = CALLOUT_PASTEL_MIX): string {
  const normalized = normalizeCalloutColor(color);
  const ratio = Math.min(1, Math.max(0, whiteRatio));
  const channels = [1, 3, 5].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
  return `#${channels
    .map((channel) => Math.round(channel * (1 - ratio) + 255 * ratio).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function getContrastingTextColor(background: unknown): "#17191A" | "#FFFDF5" {
  const normalized = normalizeCalloutColor(background);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue));
  return luminance > 0.42 ? "#17191A" : "#FFFDF5";
}

export function normalizeCalloutAttributes(attributes?: Partial<CalloutAttributes>): CalloutAttributes {
  return {
    emoji: normalizeCalloutEmoji(attributes?.emoji),
    color: normalizeCalloutColor(attributes?.color)
  };
}

export function serializeCalloutOpening(attributes?: Partial<CalloutAttributes>): string {
  const normalized = normalizeCalloutAttributes(attributes);
  const emoji = normalized.emoji === null ? "" : ` emoji="${normalized.emoji}"`;
  return `:::callout${emoji} color="${normalized.color}"`;
}

export function parseCalloutOpening(line: string): CalloutAttributes | null {
  const match = CALLOUT_OPEN_PATTERN.exec(line.trim());
  if (match === null) return null;

  const rawAttributes = match[1] ?? "";
  const attributes: Record<string, string> = {};
  for (const attribute of rawAttributes.matchAll(CALLOUT_ATTRIBUTE_PATTERN)) {
    attributes[attribute[1]] = attribute[2];
  }

  return normalizeCalloutAttributes({
    emoji: attributes["emoji"],
    color: attributes["color"]
  });
}

export function encodeCalloutDirectivesAsBlockquotes(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const attributes = parseCalloutOpening(lines[index]);
    if (attributes === null) {
      output.push(lines[index]);
      continue;
    }

    const closingIndex = lines.findIndex((line, candidate) => candidate > index && line.trim() === ":::");
    if (closingIndex === -1) {
      output.push(lines[index]);
      continue;
    }

    output.push(`> ${encodeCalloutMarker(attributes)}`, ">");
    for (let bodyIndex = index + 1; bodyIndex < closingIndex; bodyIndex += 1) {
      output.push(lines[bodyIndex] === "" ? ">" : `> ${lines[bodyIndex]}`);
    }
    output.push("");
    index = closingIndex;
  }

  return output.join("\n");
}

export function upgradeCalloutBlockquotes(root: ParentNode): void {
  const blockquotes = [...root.querySelectorAll("blockquote")];
  for (const blockquote of blockquotes) {
    const markerElement = blockquote.firstElementChild;
    const attributes = decodeCalloutMarker(markerElement?.textContent ?? "");
    if (markerElement === null || attributes === null) continue;

    markerElement.remove();
    const document = blockquote.ownerDocument;
    const callout = document.createElement("aside");
    callout.className = "markdown-callout";
    callout.setAttribute("data-callout", "");
    callout.setAttribute("data-callout-color", attributes.color);
    if (attributes.emoji !== null) callout.setAttribute("data-callout-emoji", attributes.emoji);
    applyCalloutPresentation(callout, attributes);

    const body = document.createElement("div");
    body.className = "markdown-callout__body";
    body.setAttribute("data-callout-content", "");
    while (blockquote.firstChild !== null) body.append(blockquote.firstChild);
    if (body.childNodes.length === 0) body.append(document.createElement("p"));

    if (attributes.emoji !== null) {
      const emoji = document.createElement("span");
      emoji.className = "markdown-callout__emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = attributes.emoji;
      callout.append(emoji);
    }
    callout.append(body);
    blockquote.replaceWith(callout);
  }
}

export function applyCalloutPresentation(element: HTMLElement, attributes: CalloutAttributes): void {
  const pastel = mixCalloutPastel(attributes.color);
  element.style.setProperty("--callout-accent", attributes.color);
  element.style.setProperty("--callout-background", pastel);
  element.style.setProperty("--callout-foreground", getContrastingTextColor(pastel));
}

function encodeCalloutMarker(attributes: CalloutAttributes): string {
  return `${CALLOUT_MARKER}${encodeURIComponent(JSON.stringify(attributes))}`;
}

function decodeCalloutMarker(value: string): CalloutAttributes | null {
  if (!value.startsWith(CALLOUT_MARKER)) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value.slice(CALLOUT_MARKER.length)));
    if (typeof parsed !== "object" || parsed === null) return normalizeCalloutAttributes();
    const candidate = parsed as Record<string, unknown>;
    return normalizeCalloutAttributes({
      emoji: typeof candidate["emoji"] === "string" ? candidate["emoji"] : null,
      color: typeof candidate["color"] === "string" ? candidate["color"] : DEFAULT_CALLOUT_COLOR
    });
  } catch {
    return null;
  }
}

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
