import { useMemo, useState, type JSX } from "react";
import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import {
  createEmptyMonsterTemplate,
  getMonsterTemplateRenderClass,
  scopeMonsterTemplateCss
} from "../../../../domain/monster-templates/monster-template";
import { ensureUniqueSlug, slugify } from "../../../../domain/sessions/scene-aside";
import { FeedbackAlert, type Feedback } from "./FeedbackAlert";
import { ModalBackdrop } from "./ModalBackdrop";
import { renderMarkdown } from "./markdown";

interface MonsterTemplateManagerModalProps {
  readonly templates: readonly MonsterTemplate[];
  readonly onSave: (template: MonsterTemplate) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onClose: () => void;
}

export function MonsterTemplateManagerModal({
  templates,
  onSave,
  onDelete,
  onClose
}: MonsterTemplateManagerModalProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
  const selectedTemplate = templates.find((template) => template.id === selectedId) ?? templates[0] ?? null;
  const [draft, setDraft] = useState<MonsterTemplate | null>(selectedTemplate);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const html = useMemo(() => renderMarkdown(draft?.markdown ?? ""), [draft?.markdown]);
  const scopeClass = draft !== null ? `monster-template-manager-${toCssSafeId(draft.id)}` : "";
  const scopedCss = useMemo(
    () => draft !== null ? scopeMonsterTemplateCss(draft.css, scopeClass) : "",
    [draft, scopeClass]
  );
  const renderClass = draft !== null ? getMonsterTemplateRenderClass(draft) : "monster-card";

  function selectTemplate(template: MonsterTemplate): void {
    setSelectedId(template.id);
    setDraft(template);
    setFeedback(null);
  }

  function createTemplate(): void {
    const id = ensureUniqueSlug(
      `template-${Date.now()}`,
      templates.map((template) => template.id)
    );
    const template = createEmptyMonsterTemplate(id);
    setSelectedId(template.id);
    setDraft(template);
    setIsPreviewMode(false);
    setFeedback({ message: "Nuevo template sin guardar.", kind: "info" });
  }

  function duplicateTemplate(): void {
    if (draft === null) return;
    const base = slugify(`${draft.name} copia`) || `template-${Date.now()}`;
    const id = ensureUniqueSlug(base, templates.map((template) => template.id));
    const next = {
      ...draft,
      id,
      name: `${draft.name} copia`,
      builtIn: false,
      updatedAt: new Date().toISOString()
    };
    setSelectedId(next.id);
    setDraft(next);
    setIsPreviewMode(false);
    setFeedback({ message: "Copia sin guardar.", kind: "info" });
  }

  async function saveTemplate(): Promise<void> {
    if (draft === null) return;
    await onSave(draft);
    setSelectedId(draft.id);
    setFeedback({ message: "Template guardado.", kind: "success" });
  }

  async function deleteTemplate(): Promise<void> {
    if (draft === null || draft.builtIn) return;
    if (!window.confirm(`¿Eliminar el template "${draft.name}"?`)) return;
    await onDelete(draft.id);
    const next = templates.find((template) => template.id !== draft.id) ?? null;
    setSelectedId(next?.id ?? null);
    setDraft(next);
    setFeedback({ message: "Template eliminado.", kind: "success" });
  }

  return (
    <ModalBackdrop onClose={onClose} large>
      <div className="monster-template-manager">
        <header className="monster-template-manager__header">
          <div>
            <h2>Administrar templates de monstruos</h2>
            <p>Markdown prehecho con CSS scoped para statblocks reutilizables.</p>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </header>

        <div className="monster-template-manager__body">
          <aside className="monster-template-manager__list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={template.id === draft?.id ? "is-active" : ""}
                onClick={() => selectTemplate(template)}
              >
                <strong>{template.name}</strong>
                <span>{template.system}{template.builtIn ? " · base" : ""}</span>
              </button>
            ))}
            <button type="button" className="is-secondary" onClick={createTemplate}>
              + Nuevo template
            </button>
          </aside>

          {draft !== null ? (
            <section className="monster-template-manager__editor">
              <div className="monster-template-manager__toolbar">
                <label>
                  Nombre
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })}
                  />
                </label>
                <label>
                  Sistema
                  <input
                    value={draft.system}
                    onChange={(event) => setDraft({ ...draft, system: event.currentTarget.value })}
                  />
                </label>
                <button type="button" onClick={() => setIsPreviewMode((value) => !value)}>
                  {isPreviewMode ? "Editar" : "Previsualizar"}
                </button>
                <button type="button" onClick={duplicateTemplate}>
                  Duplicar
                </button>
                <button type="button" onClick={() => void saveTemplate()}>
                  Guardar
                </button>
                <button type="button" onClick={() => void deleteTemplate()} disabled={draft.builtIn}>
                  Eliminar
                </button>
              </div>

              {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}

              {isPreviewMode ? (
                <div className="monster-template-manager__preview">
                  {scopedCss !== "" ? <style>{scopedCss}</style> : null}
                  <div
                    className={`markdown-content ${scopeClass}`}
                  >
                    <div
                      className={renderClass}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  </div>
                </div>
              ) : (
                <div className="monster-template-manager__fields">
                  <label>
                    Markdown
                    <textarea
                      value={draft.markdown}
                      onChange={(event) => setDraft({ ...draft, markdown: event.currentTarget.value })}
                      spellCheck={false}
                    />
                  </label>
                  <label>
                    CSS scoped
                    <textarea
                      value={draft.css}
                      onChange={(event) => setDraft({ ...draft, css: event.currentTarget.value })}
                      spellCheck={false}
                    />
                  </label>
                </div>
              )}
            </section>
          ) : (
            <section className="monster-template-manager__empty">
              <button type="button" onClick={createTemplate}>Crear template</button>
            </section>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}

function toCssSafeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}
