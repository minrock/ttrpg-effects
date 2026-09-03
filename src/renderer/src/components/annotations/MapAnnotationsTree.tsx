import { useMemo, useState, type JSX, type ReactNode } from "react";
import { Search, Trash2 } from "lucide-react";
import {
  searchMapAnnotations,
  type MapAnnotation,
  type MapAnnotations,
  type MapInformationArea
} from "../../../../domain/annotations/map-annotations";
import type { SceneLinkValidationStatus } from "../../../../domain/annotations/scene-navigation-links";

interface MapAnnotationsTreeProps {
  readonly annotations: MapAnnotations;
  readonly selectedElementId: string | null;
  readonly onSelect: (annotation: MapAnnotation) => void;
  readonly onGoTo: (annotation: MapAnnotation) => void;
  readonly onEdit: (annotation: MapAnnotation) => void;
  readonly onToggleLock: (annotation: MapAnnotation) => void;
  readonly onHighlightArea: (areaId: string) => void;
  readonly onDeleteArea: (areaId: string) => void;
  readonly sceneLinkStatuses?: Readonly<Record<string, SceneLinkValidationStatus>>;
}

export function MapAnnotationsTree({
  annotations,
  selectedElementId,
  onSelect,
  onGoTo,
  onEdit,
  onToggleLock,
  onHighlightArea,
  onDeleteArea,
  sceneLinkStatuses = {}
}: MapAnnotationsTreeProps): JSX.Element {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchMapAnnotations(annotations, query), [annotations, query]);
  const pins = results.filter((annotation) => annotation.kind === "room-pin");
  const areas = results.filter((annotation): annotation is MapInformationArea => annotation.kind === "information-area");
  const terrainAreas = areas.filter((area) => area.areaType === "terrain");
  const trapAreas = areas.filter((area) => area.areaType === "trap");
  const sceneLinks = results.filter((annotation) => annotation.kind === "scene-link");

  return (
    <div className="annotation-tree-panel">
      <label className="annotation-tree-search">
        <Search aria-hidden="true" size={14} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Buscar anotaciones"
          aria-label="Buscar anotaciones"
        />
      </label>
      <ul className="annotation-tree" role="tree" aria-label="Arbol de anotaciones">
        <AnnotationBranch label="Habitaciones" icon="◆" count={pins.length}>
          {pins.map((pin) => (
            <AnnotationLeaf
              key={pin.id}
              annotation={pin}
              selected={selectedElementId === pin.id}
              onSelect={onSelect}
              onGoTo={onGoTo}
              onEdit={onEdit}
              onToggleLock={onToggleLock}
              onHighlightArea={onHighlightArea}
            />
          ))}
        </AnnotationBranch>
        <AnnotationBranch label="Areas" icon="▧" count={areas.length}>
          <AnnotationBranch label="Terrenos" icon="▧" count={terrainAreas.length} nested>
            {terrainAreas.map((area) => (
              <AnnotationLeaf
                key={area.id}
                annotation={area}
                selected={selectedElementId === area.id}
                onDeleteArea={onDeleteArea}
                onSelect={onSelect}
                onGoTo={onGoTo}
                onEdit={onEdit}
                onToggleLock={onToggleLock}
                onHighlightArea={onHighlightArea}
              />
            ))}
          </AnnotationBranch>
          <AnnotationBranch label="Trampas" icon="▲" count={trapAreas.length} nested>
            {trapAreas.map((area) => (
              <AnnotationLeaf
                key={area.id}
                annotation={area}
                selected={selectedElementId === area.id}
                onDeleteArea={onDeleteArea}
                onSelect={onSelect}
                onGoTo={onGoTo}
                onEdit={onEdit}
                onToggleLock={onToggleLock}
                onHighlightArea={onHighlightArea}
              />
            ))}
          </AnnotationBranch>
        </AnnotationBranch>
        <AnnotationBranch label="Conexiones" icon="◎" count={sceneLinks.length}>
          {sceneLinks.map((marker) => (
            <AnnotationLeaf
              key={marker.id}
              annotation={marker}
              selected={selectedElementId === marker.id}
              onSelect={onSelect}
              onGoTo={onGoTo}
              onEdit={onEdit}
              onToggleLock={onToggleLock}
              onHighlightArea={onHighlightArea}
              sceneLinkStatus={sceneLinkStatuses[marker.id]}
            />
          ))}
        </AnnotationBranch>
      </ul>
      {results.length === 0 ? <p className="sidebar-hint">No hay anotaciones.</p> : null}
    </div>
  );
}

function AnnotationBranch({
  label,
  icon,
  count,
  nested = false,
  children
}: {
  readonly label: string;
  readonly icon: string;
  readonly count: number;
  readonly nested?: boolean;
  readonly children: ReactNode;
}): JSX.Element | null {
  if (count === 0) return null;

  return (
    <li className={`annotation-tree__branch${nested ? " is-nested" : ""}`} role="treeitem" aria-expanded="true">
      <div className="annotation-tree__branch-label">
        <span aria-hidden="true">{icon}</span>
        <strong>{label}</strong>
        <small>{count}</small>
      </div>
      <ul role="group">{children}</ul>
    </li>
  );
}

function AnnotationLeaf({
  annotation,
  selected,
  onSelect,
  onGoTo,
  onEdit,
  onToggleLock,
  onHighlightArea,
  onDeleteArea,
  sceneLinkStatus
}: {
  readonly annotation: MapAnnotation;
  readonly selected: boolean;
  readonly onSelect: (annotation: MapAnnotation) => void;
  readonly onGoTo: (annotation: MapAnnotation) => void;
  readonly onEdit: (annotation: MapAnnotation) => void;
  readonly onToggleLock: (annotation: MapAnnotation) => void;
  readonly onHighlightArea: (areaId: string) => void;
  readonly onDeleteArea?: (areaId: string) => void;
  readonly sceneLinkStatus?: SceneLinkValidationStatus;
}): JSX.Element {
  const label = getAnnotationLabel(annotation);

  return (
    <li
      className={`annotation-tree__leaf${annotation.kind === "information-area" ? " is-area" : ""}${selected ? " is-selected" : ""}${sceneLinkStatus?.state === "broken" ? " is-broken" : ""}`}
      role="treeitem"
      aria-selected={selected}
      onKeyDown={(event) => {
        if (annotation.kind !== "information-area" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          event.stopPropagation();
          onDeleteArea?.(annotation.id);
        }
      }}
    >
      <button type="button" className="annotation-tree__leaf-main" onClick={() => onSelect(annotation)}>
        <span aria-hidden="true">{annotation.kind === "room-pin" ? "◆" : annotation.kind === "scene-link" ? "◎" : annotation.areaType === "terrain" ? "▧" : "▲"}</span>
        <span>{label}</span>
      </button>
      <div className="annotation-tree__actions">
        <button type="button" title="Ir a" aria-label={`Ir a ${label}`} onClick={() => onGoTo(annotation)}>⌖</button>
        <button type="button" title="Editar" aria-label={`Editar ${label}`} onClick={() => onEdit(annotation)}>✎</button>
        {annotation.kind === "information-area" ? (
          <button
            type="button"
            title="Mostrar al jugador durante 5 segundos"
            aria-label={`Mostrar ${label} al jugador durante 5 segundos`}
            onClick={() => onHighlightArea(annotation.id)}
          >
            ◉
          </button>
        ) : null}
        <button
          type="button"
          title={annotation.locked ? "Desbloquear" : "Bloquear"}
          aria-label={annotation.locked ? `Desbloquear ${label}` : `Bloquear ${label}`}
          onClick={() => onToggleLock(annotation)}
        >
          {annotation.locked ? "▣" : "▢"}
        </button>
        {annotation.kind === "information-area" ? (
          <button
            type="button"
            title={annotation.locked ? "Desbloquea el area antes de eliminarla" : "Eliminar area"}
            aria-label={`Eliminar ${label}`}
            disabled={annotation.locked}
            onClick={() => onDeleteArea?.(annotation.id)}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

function getAnnotationLabel(annotation: MapAnnotation): string {
  if (annotation.kind === "room-pin") return annotation.title;
  if (annotation.kind === "scene-link") return annotation.name;
  return annotation.name.trim() || (annotation.areaType === "terrain" ? "Terreno" : "Trampa");
}
