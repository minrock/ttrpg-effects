// @vitest-environment jsdom

import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { createRichTextExtensions, getEditorMarkdown } from "./rich-text-extensions";

describe("rich text extension markdown round trip", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("parses and serializes a GFM table", () => {
    const source = "| Nombre | Valor |\n| --- | --- |\n| CA | 18 |\n| PG | 42 |";
    editor = createEditor(source);

    expect(editor.getJSON().content?.[0]?.type).toBe("table");
    expect(getEditorMarkdown(editor.storage)).toContain("| CA | 18 |");
  });

  it("parses and serializes checked and nested task items", () => {
    const source = "- [ ] Abrir puerta\n  - [x] Revisar trampa\n- [X] Entrar";
    editor = createEditor(source);

    expect(editor.getJSON().content?.[0]?.type).toBe("taskList");
    const markdown = getEditorMarkdown(editor.storage);
    expect(markdown).toContain("- [ ] Abrir puerta");
    expect(markdown.toLowerCase()).toContain("- [x] revisar trampa");
  });

  it("inserts the supported default table shape", () => {
    editor = createEditor("");
    expect(editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })).toBe(true);

    const table = editor.getJSON().content?.[0] as {
      readonly type?: string;
      readonly content?: readonly {
        readonly type?: string;
        readonly content?: readonly { readonly type?: string }[];
      }[];
    } | undefined;
    expect(table?.type).toBe("table");
    expect(table?.content).toHaveLength(3);
    expect(table?.content?.[0]?.content).toHaveLength(3);
    expect(table?.content?.[0]?.content?.[0]?.type).toBe("tableHeader");
  });

  it("normalizes legacy task-list blocks nested inside table cells", () => {
    editor = new Editor({
      extensions: createRichTextExtensions("Escribe aqui"),
      content: {
        type: "doc",
        content: [{
          type: "table",
          content: [
            tableRow("1d6", "Forma de la estatua", true),
            tableRow("Vampiro", "1", false, true),
            tableRow("Lich", "2", false, true)
          ]
        }]
      }
    });

    expect(getEditorMarkdown(editor.storage)).toContain("| Vampiro | [ ] 1 |");
    expect(getEditorMarkdown(editor.storage)).toContain("| Lich | [ ] 2 |");
  });

  it("round trips inline table checkboxes without breaking table rows", () => {
    const source = "| Estatua | Estado |\n| --- | --- |\n| Vampiro | [ ] 1 |\n| Lich | [x] 2 |";
    editor = createEditor(source);

    const document = editor.getJSON();
    expect(JSON.stringify(document)).toContain("tableTaskCheckbox");
    expect(getEditorMarkdown(editor.storage).trimEnd()).toBe(source);
  });

  function createEditor(content: string): Editor {
    return new Editor({
      extensions: createRichTextExtensions("Escribe aqui"),
      content
    });
  }

  function tableRow(first: string, second: string, header: boolean, task = false): object {
    const cellType = header ? "tableHeader" : "tableCell";
    return {
      type: "tableRow",
      content: [
        { type: cellType, content: [{ type: "paragraph", content: [{ type: "text", text: first }] }] },
        {
          type: cellType,
          content: task
            ? [{
                type: "taskList",
                content: [{
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: second }] }]
                }]
              }]
            : [{ type: "paragraph", content: [{ type: "text", text: second }] }]
        }
      ]
    };
  }
});
