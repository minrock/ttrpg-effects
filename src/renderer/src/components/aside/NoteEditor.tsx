import { useEffect, useState, type FormEvent, type JSX, type ReactNode } from "react";
import {
  Bold,
  Check,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Unlink,
  Underline as UnderlineIcon
} from "lucide-react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "tiptap-markdown";

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
  link: false
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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder }),
      Underline,
      Markdown.configure({ transformPastedText: false, transformCopiedText: true })
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: "note-editor__content" }
    },
    onUpdate({ editor: currentEditor }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (currentEditor.storage as any).markdown?.getMarkdown?.() as string | undefined ?? "";
      onChange(markdown);
    }
  });

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }): ToolbarState => currentEditor === null
      ? inactiveToolbarState
      : {
          heading1: currentEditor.isActive("heading", { level: 1 }),
          heading2: currentEditor.isActive("heading", { level: 2 }),
          heading3: currentEditor.isActive("heading", { level: 3 }),
          bulletList: currentEditor.isActive("bulletList"),
          orderedList: currentEditor.isActive("orderedList"),
          bold: currentEditor.isActive("bold"),
          italic: currentEditor.isActive("italic"),
          underline: currentEditor.isActive("underline"),
          strike: currentEditor.isActive("strike"),
          link: currentEditor.isActive("link")
        }
  }) ?? inactiveToolbarState;

  useEffect(() => {
    if (editor === null || editor.isDestroyed) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown?.getMarkdown?.() as string | undefined ?? "";
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
  readonly onClick: () => void;
  readonly children: ReactNode;
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      aria-label={label}
      aria-pressed={active}
      title={label}
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
