import type { Extensions } from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Callout } from "./CalloutExtension";
import { TableTaskCheckbox } from "./TableTaskCheckboxExtension";
import { normalizeTableTaskCheckboxMarkdown } from "./table-task-checkbox";

export function createRichTextExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true, linkOnPaste: true }
    }),
    Placeholder.configure({ placeholder }),
    TableKit.configure({
      table: { resizable: false, renderWrapper: true }
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableTaskCheckbox,
    Callout,
    Markdown.configure({ transformPastedText: false, transformCopiedText: true })
  ];
}

export function getEditorMarkdown(storage: object): string {
  const markdownStorage = (storage as Record<string, unknown>)["markdown"] as { getMarkdown?: () => unknown } | undefined;
  const value = markdownStorage?.getMarkdown?.();
  return typeof value === "string" ? normalizeTableTaskCheckboxMarkdown(value) : "";
}
