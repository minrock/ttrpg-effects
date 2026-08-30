import { useEffect, useMemo, useState, type FormEvent, type JSX, type ReactNode } from "react";
import {
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  Bold,
  Check,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  MessageSquare,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Unlink,
  Underline as UnderlineIcon
} from "lucide-react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { createRichTextExtensions, getEditorMarkdown } from "./rich-text-extensions";

interface NoteEditorProps {
  readonly initialContent: string;
  readonly onChange: (markdown: string) => void;
  readonly placeholder?: string;
  readonly titleField?: ReactNode;
  readonly variant?: "compact" | "document";
}

interface ToolbarState {
  readonly heading1: boolean;
  readonly heading2: boolean;
  readonly heading3: boolean;
  readonly bulletList: boolean;
  readonly orderedList: boolean;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strike: boolean;
  readonly link: boolean;
  readonly callout: boolean;
  readonly table: boolean;
  readonly taskList: boolean;
  readonly canAddRow: boolean;
  readonly canDeleteRow: boolean;
  readonly canAddColumn: boolean;
  readonly canDeleteColumn: boolean;
  readonly canDeleteTable: boolean;
}

const inactiveToolbarState: ToolbarState = {
  heading1: false,
  heading2: false,
  heading3: false,
  bulletList: false,
  orderedList: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: false,
  callout: false,
  table: false,
  taskList: false,
  canAddRow: false,
  canDeleteRow: false,
  canAddColumn: false,
  canDeleteColumn: false,
  canDeleteTable: false
};

export function NoteEditor({
  initialContent,
  onChange,
  placeholder = "Escribe la informacion aqui...",
  titleField,
  variant = "compact"
}: NoteEditorProps): JSX.Element {
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const extensions = useMemo(() => createRichTextExtensions(placeholder), [placeholder]);
  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: { class: "note-editor__content" }
    },
    onUpdate({ editor: currentEditor }) {
      onChange(getEditorMarkdown(currentEditor.storage));
    }
  }, [extensions]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }): ToolbarState => {
      if (currentEditor === null || currentEditor.isDestroyed) return inactiveToolbarState;

      const table = currentEditor.isActive("table");
      return {
          heading1: currentEditor.isActive("heading", { level: 1 }),
          heading2: currentEditor.isActive("heading", { level: 2 }),
          heading3: currentEditor.isActive("heading", { level: 3 }),
          bulletList: currentEditor.isActive("bulletList"),
          orderedList: currentEditor.isActive("orderedList"),
          bold: currentEditor.isActive("bold"),
          italic: currentEditor.isActive("italic"),
          underline: currentEditor.isActive("underline"),
          strike: currentEditor.isActive("strike"),
          link: currentEditor.isActive("link"),
          callout: currentEditor.isActive("callout"),
          table,
          taskList: currentEditor.isActive("taskList"),
          canAddRow: table && currentEditor.can().addRowAfter(),
          canDeleteRow: table && currentEditor.can().deleteRow(),
          canAddColumn: table && currentEditor.can().addColumnAfter(),
          canDeleteColumn: table && currentEditor.can().deleteColumn(),
          canDeleteTable: table && currentEditor.can().deleteTable()
        };
    }
  }) ?? inactiveToolbarState;

  useEffect(() => {
    if (editor === null || editor.isDestroyed) return;
    const current = getEditorMarkdown(editor.storage);
    if (current !== initialContent) editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  const openLinkEditor = (): void => {
    if (editor === null) return;
    setLinkDraft(String(editor.getAttributes("link")["href"] ?? ""));
    setLinkEditorOpen(true);
  };

  const applyLink = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (editor === null) return;
    const href = normalizeHref(linkDraft);
    if (href === null) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkEditorOpen(false);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkEditorOpen(false);
  };

  const removeLink = (): void => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDraft("");
    setLinkEditorOpen(false);
  };

  return (
    <section className={`note-editor note-editor--${variant}`} onClick={() => editor?.commands.focus()}>
      <div className="note-editor__toolbar" role="toolbar" aria-label="Formato del documento" onClick={(event) => event.stopPropagation()}>
        <ToolbarButton label="Encabezado 1" active={toolbarState.heading1} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Encabezado 2" active={toolbarState.heading2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Encabezado 3" active={toolbarState.heading3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 aria-hidden="true" />
        </ToolbarButton>
        <span className="note-editor__toolbar-divider" aria-hidden="true" />
        <ToolbarButton label="Lista con vinietas" active={toolbarState.bulletList} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" active={toolbarState.orderedList} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={toolbarState.table ? "Insertar checkbox en celda" : "Lista de verificacion"}
          active={toolbarState.taskList}
          onClick={() => {
            if (editor === null) return;
            if (toolbarState.table) editor.chain().focus().insertTableTaskCheckbox().run();
            else editor.chain().focus().toggleTaskList().run();
          }}
        >
          <ListChecks aria-hidden="true" />
        </ToolbarButton>
        <span className="note-editor__toolbar-divider" aria-hidden="true" />
        <ToolbarButton label="Negrita" active={toolbarState.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Cursiva" active={toolbarState.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Subrayado" active={toolbarState.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Tachado" active={toolbarState.strike} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough aria-hidden="true" />
        </ToolbarButton>
        <span className="note-editor__toolbar-divider" aria-hidden="true" />
        <ToolbarButton label={toolbarState.link ? "Editar enlace" : "Agregar enlace"} active={toolbarState.link} onClick={openLinkEditor}>
          <Link2 aria-hidden="true" />
        </ToolbarButton>
        <span className="note-editor__toolbar-divider" aria-hidden="true" />
        <ToolbarButton
          label={toolbarState.callout ? "Callout activo" : "Insertar callout"}
          active={toolbarState.callout}
          onClick={() => {
            if (toolbarState.callout) editor?.commands.focus();
            else editor?.chain().focus().insertCallout().run();
          }}
        >
          <MessageSquare aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Insertar tabla"
          active={toolbarState.table}
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table2 aria-hidden="true" />
        </ToolbarButton>
        {toolbarState.table ? (
          <div className="note-editor__table-tools" role="group" aria-label="Editar tabla">
            <ToolbarButton label="Agregar fila" active={false} disabled={!toolbarState.canAddRow} onClick={() => editor?.chain().focus().addRowAfter().run()}>
              <BetweenHorizontalEnd aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Eliminar fila" active={false} disabled={!toolbarState.canDeleteRow} onClick={() => editor?.chain().focus().deleteRow().run()}>
              <Rows3 aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Agregar columna" active={false} disabled={!toolbarState.canAddColumn} onClick={() => editor?.chain().focus().addColumnAfter().run()}>
              <BetweenVerticalEnd aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Eliminar columna" active={false} disabled={!toolbarState.canDeleteColumn} onClick={() => editor?.chain().focus().deleteColumn().run()}>
              <Columns3 aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Eliminar tabla" active={false} disabled={!toolbarState.canDeleteTable} onClick={() => editor?.chain().focus().deleteTable().run()}>
              <Trash2 aria-hidden="true" />
            </ToolbarButton>
          </div>
        ) : null}
      </div>

      {linkEditorOpen ? (
        <form className="note-editor__link-popover" onSubmit={applyLink} onClick={(event) => event.stopPropagation()}>
          <label htmlFor="note-editor-link">URL del enlace</label>
          <div>
            <input
              id="note-editor-link"
              autoFocus
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.currentTarget.value)}
              placeholder="https://..."
            />
            <button type="submit" title="Aplicar enlace" aria-label="Aplicar enlace">
              <Check aria-hidden="true" />
            </button>
            <button type="button" title="Retirar enlace" aria-label="Retirar enlace" onClick={removeLink} disabled={!toolbarState.link}>
              <Unlink aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : null}

      <div className="note-editor__document">
        {titleField}
        <EditorContent editor={editor} className="note-editor__content-shell" />
      </div>
    </section>
  );
}

interface ToolbarButtonProps {
  readonly label: string;
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

function ToolbarButton({ label, active, disabled = false, onClick, children }: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function normalizeHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
