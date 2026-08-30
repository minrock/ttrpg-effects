import { RotateCcw } from "lucide-react";
import { useMemo, type JSX, type MouseEvent } from "react";
import {
  getChecklistState,
  resetChecklist,
  setChecklistItemChecked
} from "./checklist-markdown";
import { renderMarkdown } from "./markdown";

interface RichTextPreviewProps {
  readonly markdown: string;
  readonly mode?: "dm-editable" | "readonly";
  readonly onChange?: (markdown: string) => void;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly emptyFallback?: string;
}

export function RichTextPreview({
  markdown,
  mode = "readonly",
  onChange,
  className = "",
  contentClassName = "",
  emptyFallback = "Sin contenido."
}: RichTextPreviewProps): JSX.Element {
  const editable = mode === "dm-editable" && onChange !== undefined;
  const checklist = useMemo(() => getChecklistState(markdown), [markdown]);
  const html = useMemo(
    () => renderMarkdown(markdown, { interactiveChecklists: editable }),
    [editable, markdown]
  );

  const handleContentClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (!editable || !(event.target instanceof HTMLInputElement)) return;
    const indexValue = event.target.dataset.checklistIndex;
    if (indexValue === undefined) return;
    const itemIndex = Number(indexValue);
    if (!Number.isInteger(itemIndex)) return;
    onChange(setChecklistItemChecked(markdown, itemIndex, event.target.checked));
  };

  const reset = (): void => {
    if (!editable || checklist.checked === 0) return;
    onChange(resetChecklist(markdown));
  };

  return (
    <section className={["rich-text-preview", className].filter(Boolean).join(" ")}>
      {editable && checklist.total > 0 ? (
        <div className="rich-text-preview__actions">
          <button
            type="button"
            onClick={reset}
            disabled={checklist.checked === 0}
            title="Dejar todas las tareas pendientes"
          >
            <RotateCcw aria-hidden="true" />
            <span>Reiniciar checklist</span>
          </button>
        </div>
      ) : null}

      {markdown.trim() === "" ? (
        <p className="rich-text-preview__empty">{emptyFallback}</p>
      ) : (
        <div
          className={["markdown-content", "rich-text-preview__content", contentClassName].filter(Boolean).join(" ")}
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </section>
  );
}
