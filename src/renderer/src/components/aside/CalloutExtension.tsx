import { mergeAttributes, Node, type CommandProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { RemoveFormatting, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type JSX } from "react";
import {
  DEFAULT_CALLOUT_COLOR,
  encodeCalloutDirectivesAsBlockquotes,
  mixCalloutPastel,
  normalizeCalloutAttributes,
  normalizeCalloutColor,
  normalizeCalloutEmoji,
  serializeCalloutOpening,
  upgradeCalloutBlockquotes,
  type CalloutAttributes
} from "./callout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (attributes?: Partial<CalloutAttributes>) => ReturnType;
      updateCallout: (attributes: Partial<CalloutAttributes>) => ReturnType;
      unsetCallout: () => ReturnType;
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
  __ttrpgCalloutInstalled?: boolean;
}

interface MarkdownSerializerStateLike {
  write: (value: string) => void;
  renderContent: (node: ProseMirrorNode) => void;
  ensureNewLine: () => void;
  closeBlock: (node: ProseMirrorNode) => void;
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeCalloutEmoji(element.getAttribute("data-callout-emoji")),
        renderHTML: (attributes: Record<string, unknown>) => {
          const emoji = normalizeCalloutEmoji(attributes["emoji"]);
          return emoji === null ? {} : { "data-callout-emoji": emoji };
        }
      },
      color: {
        default: DEFAULT_CALLOUT_COLOR,
        parseHTML: (element: HTMLElement) => normalizeCalloutColor(element.getAttribute("data-callout-color")),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-callout-color": normalizeCalloutColor(attributes["color"])
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]", contentElement: "[data-callout-content]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attributes = normalizeCalloutAttributes(node.attrs);
    const style = [
      `--callout-accent:${attributes.color}`,
      `--callout-background:${mixCalloutPastel(attributes.color)}`,
      "--callout-foreground:#17191A"
    ].join(";");
    const emoji = attributes.emoji === null
      ? []
      : [["span", { class: "markdown-callout__emoji", "aria-hidden": "true" }, attributes.emoji]];
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { class: "markdown-callout", "data-callout": "", style }),
      ...emoji,
      ["div", { class: "markdown-callout__body", "data-callout-content": "" }, 0]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      insertCallout: (attributes = {}) => ({ editor, commands }) => {
        if (editor.isActive(this.name)) return false;
        return commands.insertContent({
          type: this.name,
          attrs: normalizeCalloutAttributes(attributes),
          content: [{ type: "paragraph" }]
        });
      },
      updateCallout: (attributes) => ({ editor, commands }) => {
        if (!editor.isActive(this.name)) return false;
        const current = normalizeCalloutAttributes(editor.getAttributes(this.name));
        return commands.updateAttributes(this.name, normalizeCalloutAttributes({ ...current, ...attributes }));
      },
      unsetCallout: () => (props) => unwrapActiveCallout(props, this.name)
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerStateLike, node: ProseMirrorNode) {
          state.write(`${serializeCalloutOpening(node.attrs)}\n`);
          state.renderContent(node);
          state.ensureNewLine();
          state.write(":::");
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: MarkdownItLike) {
            if (markdownit.__ttrpgCalloutInstalled === true) return;
            markdownit.__ttrpgCalloutInstalled = true;
            markdownit.core.ruler.before("block", "ttrpg_callout", (state) => {
              state.src = encodeCalloutDirectivesAsBlockquotes(state.src);
            });
          },
          updateDOM(element: HTMLElement) {
            upgradeCalloutBlockquotes(element);
          }
        }
      }
    };
  }
});

function CalloutNodeView({ node, selected, updateAttributes, editor, getPos }: NodeViewProps): JSX.Element {
  const attributes = normalizeCalloutAttributes(node.attrs);
  const [emojiDraft, setEmojiDraft] = useState(attributes.emoji ?? "");
  const [active, setActive] = useState(false);
  const style = {
    "--callout-accent": attributes.color,
    "--callout-background": mixCalloutPastel(attributes.color),
    "--callout-foreground": "#17191A"
  } as CSSProperties;

  useEffect(() => setEmojiDraft(attributes.emoji ?? ""), [attributes.emoji]);

  useEffect(() => {
    const updateActive = (): void => {
      const position = getPos();
      if (position === undefined) {
        setActive(false);
        return;
      }
      const { from, to } = editor.state.selection;
      setActive(from > position && to < position + node.nodeSize);
    };

    updateActive();
    editor.on("selectionUpdate", updateActive);
    editor.on("focus", updateActive);
    editor.on("blur", updateActive);
    return () => {
      editor.off("selectionUpdate", updateActive);
      editor.off("focus", updateActive);
      editor.off("blur", updateActive);
    };
  }, [editor, getPos, node.nodeSize]);

  const commitEmoji = (): void => {
    const emoji = normalizeCalloutEmoji(emojiDraft);
    setEmojiDraft(emoji ?? "");
    updateAttributes({ emoji });
  };

  return (
    <NodeViewWrapper
      as="aside"
      className={`markdown-callout callout-node-view${selected ? " is-selected" : ""}${active ? " is-active" : ""}`}
      data-callout=""
      data-callout-color={attributes.color}
      style={style}
    >
      <div
        className="callout-node-view__controls"
        contentEditable={false}
        aria-label="Personalizar callout"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <label>
          <span>Emoji</span>
          <input
            type="text"
            value={emojiDraft}
            maxLength={16}
            inputMode="text"
            aria-label="Emoji del callout"
            placeholder="⚠️"
            onChange={(event) => setEmojiDraft(event.currentTarget.value)}
            onBlur={commitEmoji}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitEmoji();
                editor.commands.focus();
              }
            }}
          />
          {emojiDraft !== "" ? (
            <button
              type="button"
              title="Retirar emoji"
              aria-label="Retirar emoji"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setEmojiDraft("");
                updateAttributes({ emoji: null });
                editor.commands.focus();
              }}
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <label className="callout-node-view__color">
          <span>Color</span>
          <input
            type="color"
            value={attributes.color}
            aria-label="Color principal del callout"
            onChange={(event) => updateAttributes({ color: normalizeCalloutColor(event.currentTarget.value) })}
          />
        </label>
        <button
          type="button"
          className="callout-node-view__remove"
          title="Retirar callout y conservar contenido"
          aria-label="Retirar callout y conservar contenido"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().unsetCallout().run()}
        >
          <RemoveFormatting aria-hidden="true" />
          <span>Retirar</span>
        </button>
      </div>

      <div className="markdown-callout__layout">
        {attributes.emoji === null ? null : (
          <span className="markdown-callout__emoji" contentEditable={false} aria-hidden="true">
            {attributes.emoji}
          </span>
        )}
        <NodeViewContent className="markdown-callout__body" data-callout-content="" />
      </div>
    </NodeViewWrapper>
  );
}

function unwrapActiveCallout({ state, dispatch }: CommandProps, nodeName: string): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== nodeName) continue;
    if (dispatch !== undefined) {
      const from = $from.before(depth);
      dispatch(state.tr.replaceWith(from, from + node.nodeSize, node.content).scrollIntoView());
    }
    return true;
  }
  return false;
}
