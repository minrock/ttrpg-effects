import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { JSX } from "react";
import {
  normalizeTableTaskCheckboxMarkdown,
  upgradeTableTaskCheckboxTokens
} from "./table-task-checkbox";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableTaskCheckbox: {
      insertTableTaskCheckbox: (checked?: boolean) => ReturnType;
    };
  }
}

interface MarkdownItState {
  src: string;
}

interface MarkdownItLike {
  core: {
    ruler: {
      before: (beforeName: string, ruleName: string, rule: (state: MarkdownItState) => void) => void;
    };
  };
  __ttrpgTableTaskCheckboxInstalled?: boolean;
}

interface MarkdownSerializerStateLike {
  write: (value: string) => void;
}

export const TableTaskCheckbox = Node.create({
  name: "tableTaskCheckbox",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element: HTMLElement) => element.dataset["checked"] === "true",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-checked": String(attributes["checked"] === true)
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: "span[data-table-task-checkbox]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-table-task-checkbox": "" })];
  },

  addCommands() {
    return {
      insertTableTaskCheckbox: (checked = false) => ({ commands }) => commands.insertContent([
        { type: this.name, attrs: { checked } },
        { type: "text", text: " " }
      ])
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableTaskCheckboxNodeView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerStateLike, node: ProseMirrorNode) {
          state.write(node.attrs["checked"] === true ? "[x]" : "[ ]");
        },
        parse: {
          setup(markdownit: MarkdownItLike) {
            if (markdownit.__ttrpgTableTaskCheckboxInstalled === true) return;
            markdownit.__ttrpgTableTaskCheckboxInstalled = true;
            markdownit.core.ruler.before("block", "ttrpg_table_task_checkbox", (state) => {
              state.src = normalizeTableTaskCheckboxMarkdown(state.src);
            });
          },
          updateDOM(element: HTMLElement) {
            upgradeTableTaskCheckboxTokens(element);
          }
        }
      }
    };
  }
});

function TableTaskCheckboxNodeView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const checked = node.attrs["checked"] === true;
  return (
    <NodeViewWrapper as="span" className="table-task-checkbox-node" contentEditable={false}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={checked ? "Tarea de tabla completada" : "Tarea de tabla pendiente"}
        onChange={(event) => updateAttributes({ checked: event.currentTarget.checked })}
      />
    </NodeViewWrapper>
  );
}
