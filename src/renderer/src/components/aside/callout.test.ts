// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALLOUT_COLOR,
  encodeCalloutDirectivesAsBlockquotes,
  getContrastingTextColor,
  mixCalloutPastel,
  normalizeCalloutColor,
  normalizeCalloutEmoji,
  parseCalloutOpening,
  serializeCalloutOpening,
  upgradeCalloutBlockquotes
} from "./callout";

describe("callout presentation and metadata", () => {
  it("normalizes colors and derives the 80 percent pastel", () => {
    expect(normalizeCalloutColor("#d5ab5d")).toBe("#D5AB5D");
    expect(normalizeCalloutColor("red")).toBe(DEFAULT_CALLOUT_COLOR);
    expect(mixCalloutPastel("#D5AB5D")).toBe("#F7EEDF");
    expect(getContrastingTextColor("#F7EEDF")).toBe("#17191A");
  });

  it("accepts one emoji grapheme and rejects arbitrary text", () => {
    expect(normalizeCalloutEmoji("⚠️")).toBe("⚠️");
    expect(normalizeCalloutEmoji("🧙🏽‍♀️")).toBe("🧙🏽‍♀️");
    expect(normalizeCalloutEmoji("texto")).toBeNull();
    expect(normalizeCalloutEmoji("🔥💧")).toBeNull();
    expect(normalizeCalloutEmoji("")).toBeNull();
  });

  it("serializes and parses canonical callout metadata", () => {
    const opening = serializeCalloutOpening({ emoji: "🔎", color: "#123456" });
    expect(opening).toBe(':::callout emoji="🔎" color="#123456"');
    expect(parseCalloutOpening(opening)).toEqual({ emoji: "🔎", color: "#123456" });
    expect(parseCalloutOpening("Texto normal")).toBeNull();
  });

  it("encodes a directive as an upgradeable markdown blockquote", () => {
    const source = ':::callout emoji="⚠️" color="#FF0000"\n**Peligro**\n:::';
    const encoded = encodeCalloutDirectivesAsBlockquotes(source);
    const root = document.createElement("div");
    const marker = encoded.split("\n")[0].slice(2);
    root.innerHTML = `<blockquote><p>${marker}</p><p><strong>Peligro</strong></p></blockquote>`;

    upgradeCalloutBlockquotes(root);

    const callout = root.querySelector("aside[data-callout]");
    expect(callout?.getAttribute("data-callout-color")).toBe("#FF0000");
    expect(callout?.getAttribute("data-callout-emoji")).toBe("⚠️");
    expect(callout?.querySelector("strong")?.textContent).toBe("Peligro");
  });
});
