import { useMemo, useState, type JSX } from "react";
import type {
  InformationAreaCell,
  InformationAreaType,
  MapInformationArea,
  MapInformationPin
} from "../../../../domain/annotations/map-annotations";
import type { WorldPoint } from "../../../../domain/shared/coordinates";
import { ModalBackdrop } from "../aside/ModalBackdrop";
import { renderMarkdown } from "../aside/markdown";

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
  const previewHtml = useMemo(() => renderMarkdown(content), [content]);
  const isPin = draft.kind === "room-pin";
  const normalizedTitle = title.trim();

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
    <ModalBackdrop onClose={onCancel} wide>
      <div className="annotation-modal">
        <div className="annotation-modal__header">
          <div>
            <h2>{isPin ? "Pin de habitacion" : "Area de informacion"}</h2>
            <p>{draft.initial === undefined ? "Crear anotacion" : "Editar anotacion"}</p>
          </div>
          <div className="annotation-modal__tabs" role="tablist" aria-label="Modo de contenido">
            <button type="button" className={!isPreview ? "is-active" : ""} onClick={() => setIsPreview(false)}>
              Editar
            </button>
            <button type="button" className={isPreview ? "is-active" : ""} onClick={() => setIsPreview(true)}>
              Vista previa
            </button>
          </div>
        </div>

        {!isPin ? (
          <label>
            Tipo
            <select value={areaType} onChange={(event) => setAreaType(event.currentTarget.value as InformationAreaType)}>
              <option value="terrain">Terreno</option>
              <option value="trap">Trampa</option>
            </select>
          </label>
        ) : null}

        {isPreview ? (
          <div className="annotation-modal__preview-title">
            <small>{isPin ? "Habitacion" : areaType === "terrain" ? "Terreno" : "Trampa"}</small>
            <strong>{normalizedTitle || (isPin ? "Sin nombre" : "Area sin nombre")}</strong>
          </div>
        ) : (
          <label>
            {isPin ? "Nombre de la habitacion" : "Nombre (opcional)"}
            <input
              autoFocus
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </label>
        )}

        {isPreview ? (
          <div className="markdown-content annotation-modal__preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        ) : (
          <label>
            {isPin ? "Informacion" : "Descripcion"}
            <textarea
              rows={12}
              maxLength={100_000}
              value={content}
              onChange={(event) => setContent(event.currentTarget.value)}
              placeholder="Markdown"
            />
          </label>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="is-primary" onClick={save} disabled={isPin && normalizedTitle === ""}>
            Guardar
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
