import { useEffect, type JSX } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

interface NoteEditorProps {
  readonly initialContent: string;
  readonly onChange: (markdown: string) => void;
}

export function NoteEditor({ initialContent, onChange }: NoteEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ transformPastedText: true, transformCopiedText: true })
    ],
    content: initialContent,
    onUpdate({ editor: e }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (e.storage as any).markdown?.getMarkdown?.() as string | undefined ?? "";
      onChange(md);
    }
  });

  // Sync if initialContent changes (e.g. modal re-opens)
  useEffect(() => {
    if (editor === null || editor.isDestroyed) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown?.getMarkdown?.() as string | undefined ?? "";
    if (current !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent]); // editor is stable (Tiptap ref)

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 6,
        minHeight: 200,
        backgroundColor: "#111315",
        color: "#e0e0e0",
        cursor: "text"
      }}
      onClick={() => editor?.commands.focus()}
    >
      <style>{`
        .tiptap-aside { padding: 12px; outline: none; min-height: 200px; caret-color: #e0e0e0; }
        .tiptap-aside h1 { font-size: 1.4em; font-weight: bold; margin: 0.5em 0; }
        .tiptap-aside h2 { font-size: 1.2em; font-weight: bold; margin: 0.4em 0; }
        .tiptap-aside h3 { font-size: 1.05em; font-weight: bold; margin: 0.3em 0; }
        .tiptap-aside p { margin: 0.3em 0; }
        .tiptap-aside strong { font-weight: bold; }
        .tiptap-aside em { font-style: italic; }
        .tiptap-aside code { background: #1e2025; padding: 2px 5px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
        .tiptap-aside pre { background: #1e2025; padding: 10px; border-radius: 6px; overflow-x: auto; }
        .tiptap-aside pre code { background: none; padding: 0; }
        .tiptap-aside blockquote { border-left: 3px solid #444; padding-left: 12px; color: #aaa; margin: 0.5em 0; }
        .tiptap-aside ul, .tiptap-aside ol { padding-left: 1.5em; margin: 0.3em 0; }
        .tiptap-aside p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #555;
          pointer-events: none;
          height: 0;
        }
        /* Selección de texto — reemplaza el highlight naranja/blanco del sistema */
        .tiptap-aside *::selection { background: rgba(58, 123, 213, 0.35); color: inherit; }
        .tiptap-aside .ProseMirror-selectednode { outline: 2px solid #3a7bd5; }
        /* Quita el outline naranja de foco del contenedor ProseMirror */
        .tiptap-aside .ProseMirror:focus { outline: none; }
      `}</style>
      <EditorContent editor={editor} className="tiptap-aside" />
    </div>
  );
}
