import { lazy, Suspense, useState, type JSX } from "react";
import { Eye, Pencil } from "lucide-react";
import type {
  InformationAreaCell,
  InformationAreaType,
  MapInformationArea,
  MapInformationPin
} from "../../../../domain/annotations/map-annotations";
import type { WorldPoint } from "../../../../domain/shared/coordinates";
import { ModalBackdrop } from "../aside/ModalBackdrop";
import { RichTextPreview } from "../aside/RichTextPreview";

const NoteEditor = lazy(async () => {
  const mod = await import("../aside/NoteEditor");
  return { default: mod.NoteEditor };
});

export type MapAnnotationModalDraft =
  | {
      readonly kind: "room-pin";
      readonly id: string;
      readonly position: WorldPoint;
      readonly initial?: MapInformationPin;
      readonly initialMode?: "edit" | "preview";
    }
  | {
      readonly kind: "information-area";
      readonly id: string;
      readonly cells: readonly InformationAreaCell[];
      readonly initial?: MapInformationArea;
      readonly initialMode?: "edit" | "preview";
    };

interface MapAnnotationModalProps {
  readonly draft: MapAnnotationModalDraft;
  readonly onCancel: () => void;
  readonly onSavePin: (pin: MapInformationPin) => void;
  readonly onSaveArea: (area: MapInformationArea) => void;
}

export function MapAnnotationModal({
  draft,
  onCancel,
  onSavePin,
  onSaveArea
}: MapAnnotationModalProps): JSX.Element {
  const [title, setTitle] = useState(
    draft.kind === "room-pin" ? draft.initial?.title ?? "" : draft.initial?.name ?? ""
  );
  const [content, setContent] = useState(
    draft.kind === "room-pin" ? draft.initial?.content ?? "" : draft.initial?.description ?? ""
  );
  const [areaType, setAreaType] = useState<InformationAreaType>(
    draft.kind === "information-area" ? draft.initial?.areaType ?? "terrain" : "terrain"
  );
  const [isPreview, setIsPreview] = useState(draft.initialMode === "preview");
  const isPin = draft.kind === "room-pin";
  const normalizedTitle = title.trim();
  const documentType = isPin ? "Habitacion" : areaType === "terrain" ? "Terreno" : "Trampa";

  const save = (): void => {
    if (isPin) {
      if (normalizedTitle === "") return;
      onSavePin({
        id: draft.id,
        kind: "room-pin",
        position: draft.position,
        title: normalizedTitle.slice(0, 120),
        content: content.slice(0, 100_000),
        locked: draft.initial?.locked ?? false
      });
      return;
    }

    onSaveArea({
      id: draft.id,
      kind: "information-area",
      areaType,
      name: normalizedTitle.slice(0, 120),
      description: content.slice(0, 100_000),
      cells: draft.cells,
      locked: draft.initial?.locked ?? false
    });
  };

  return (
    <ModalBackdrop onClose={onCancel} documentLayout>
      <div className="document-modal annotation-document-modal">
        <header className="document-modal__context">
          <div>
            <small>{draft.initial === undefined ? "Crear anotacion" : "Editar anotacion"}</small>
            <span>{documentType}</span>
          </div>

          <div className="annotation-document-modal__controls">
            {!isPin ? (
              <label>
                <span>Tipo</span>
                <select value={areaType} onChange={(event) => setAreaType(event.currentTarget.value as InformationAreaType)}>
                  <option value="terrain">Terreno</option>
                  <option value="trap">Trampa</option>
                </select>
              </label>
            ) : null}
            <div className="document-mode-tabs" role="tablist" aria-label="Modo del documento">
              <button type="button" className={!isPreview ? "is-active" : ""} onClick={() => setIsPreview(false)}>
                <Pencil aria-hidden="true" />
                Editar
              </button>
              <button type="button" className={isPreview ? "is-active" : ""} onClick={() => setIsPreview(true)}>
                <Eye aria-hidden="true" />
                Vista previa
              </button>
            </div>
          </div>
        </header>

        <main className="document-modal__body">
          {isPreview ? (
            <div className="document-preview">
              <small>{documentType}</small>
              <h1>{normalizedTitle || (isPin ? "Habitacion sin nombre" : "Area sin nombre")}</h1>
              <RichTextPreview
                markdown={content}
                mode="dm-editable"
                onChange={setContent}
                contentClassName="document-preview__content"
                emptyFallback="Sin descripcion."
              />
            </div>
          ) : (
            <Suspense fallback={<div className="document-modal__loading">Cargando editor...</div>}>
              <NoteEditor
                initialContent={content}
                onChange={setContent}
                variant="document"
                placeholder={isPin ? "Describe la habitacion, sus detalles y secretos..." : "Describe el terreno o la trampa..."}
                titleField={(
                  <input
                    autoFocus
                    className="note-editor__title"
                    aria-label={isPin ? "Nombre de la habitacion" : "Nombre del area"}
                    maxLength={120}
                    value={title}
                    onChange={(event) => setTitle(event.currentTarget.value)}
                    placeholder={isPin ? "Nombre de la habitacion" : "Nombre del area (opcional)"}
                  />
                )}
              />
            </Suspense>
          )}
        </main>

        <footer className="document-modal__footer">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="is-primary" onClick={save} disabled={isPin && normalizedTitle === ""}>
            Guardar
          </button>
        </footer>
      </div>
    </ModalBackdrop>
  );
}
