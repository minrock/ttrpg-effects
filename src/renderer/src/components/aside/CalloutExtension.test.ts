// @vitest-environment jsdom

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "tiptap-markdown";
import { Callout } from "./CalloutExtension";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("Callout Tiptap extension", () => {
  it("round trips content and metadata through Markdown", () => {
    editor = createEditor(':::callout emoji="⚠️" color="#CC3300"\n**Peligro** en la sala.\n:::');

    const callout = editor.getJSON().content?.[0];
    expect(callout?.type).toBe("callout");
    expect(callout?.attrs).toMatchObject({ emoji: "⚠️", color: "#CC3300" });
    expect(getMarkdown(editor)).toContain(':::callout emoji="⚠️" color="#CC3300"');
    expect(getMarkdown(editor)).toContain("**Peligro** en la sala.");
  });

  it("inserts, updates and unwraps a callout without losing its content", () => {
    editor = createEditor("");
    expect(editor.commands.insertCallout({ emoji: "🔥", color: "#AA2200" })).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("callout");

    editor.commands.insertContent("Zona caliente");
    expect(editor.commands.updateCallout({ color: "#003366" })).toBe(true);
    expect(editor.getAttributes("callout")["color"]).toBe("#003366");
    expect(editor.commands.unsetCallout()).toBe(true);

    expect(editor.getJSON().content?.[0]?.type).toBe("paragraph");
    expect(editor.getText()).toContain("Zona caliente");
  });
});

function createEditor(content: string): Editor {
  return new Editor({
    extensions: [StarterKit, Callout, Markdown],
    content
  });
}

function getMarkdown(currentEditor: Editor): string {
  const storage = currentEditor.storage as unknown as {
    markdown: { getMarkdown: () => string };
  };
  return storage.markdown.getMarkdown();
}
