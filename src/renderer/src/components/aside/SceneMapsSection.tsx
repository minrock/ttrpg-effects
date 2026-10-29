import { GripVertical, ImageUp, Map, Plus, Trash2 } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import type { SceneMapDocument } from "../../../../domain/sessions/scene-document";

interface SceneMapsSectionProps {
  readonly maps: readonly SceneMapDocument[];
  readonly activeMapId: string | null;
  readonly onSelect: (mapId: string) => void;
  readonly onRename: (mapId: string, name: string) => void;
  readonly onReorder: (mapIds: readonly string[]) => void;
  readonly onDelete: (mapId: string) => void;
  readonly onAddMap: () => void;
  readonly onImportScene: () => void;
  readonly onReplaceMapImage: (mapId: string) => void;
  readonly isReplacingImage?: boolean;
}

export function SceneMapsSection({
  maps,
  activeMapId,
  onSelect,
  onRename,
  onReorder,
  onDelete,
  onAddMap,
  onImportScene,
  onReplaceMapImage,
  isReplacingImage = false
}: SceneMapsSectionProps): JSX.Element {
  const [draggedMapId, setDraggedMapId] = useState<string | null>(null);
  const [dropTargetMapId, setDropTargetMapId] = useState<string | null>(null);

  function handleDrop(targetMapId: string): void {
    setDraggedMapId(null);
    setDropTargetMapId(null);
    if (draggedMapId === null || draggedMapId === targetMapId) {
      return;
    }

    const ids = maps.map((map) => map.id);
    const draggedIndex = ids.indexOf(draggedMapId);
    const targetIndex = ids.indexOf(targetMapId);
    if (draggedIndex < 0 || targetIndex < 0) return;
    const [id] = ids.splice(draggedIndex, 1);
    if (id === undefined) return;
    ids.splice(targetIndex, 0, id);
    onReorder(ids);
  }

  return (
    <div className="scene-maps-section">
      <div className="scene-maps-actions">
        <button type="button" onClick={onAddMap}>
          <Plus aria-hidden="true" />
          Agregar mapa
        </button>
        <button type="button" onClick={onImportScene}>
          <Map aria-hidden="true" />
          Agregar a escena
        </button>
      </div>
      {maps.length === 0 ? (
        <p className="sidebar-hint">Agrega al menos un mapa para poder guardar la escena.</p>
      ) : (
        <ol className="scene-map-list" aria-label="Mapas de la escena">
          {maps.map((map) => (
            <li
              key={map.id}
              className={[
                map.id === activeMapId ? "is-active" : "",
                map.id === draggedMapId ? "is-dragging" : "",
                map.id === dropTargetMapId && map.id !== draggedMapId ? "is-drop-target" : ""
              ].filter(Boolean).join(" ")}
              draggable
              onDragStart={(event) => {
                if (event.target instanceof Element && event.target.closest("button, input")) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", map.id);
                setDraggedMapId(map.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetMapId(map.id);
              }}
              onDragLeave={() => setDropTargetMapId((current) => current === map.id ? null : current)}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(map.id);
              }}
              onDragEnd={() => {
                setDraggedMapId(null);
                setDropTargetMapId(null);
              }}
            >
              <span className="scene-map-list__drag" title="Arrastrar para ordenar" aria-hidden="true">
                <GripVertical />
              </span>
              <button
                type="button"
                className="scene-map-list__select"
                title={`Seleccionar ${map.name}`}
                data-tooltip="Seleccionar mapa"
                aria-label={`Seleccionar ${map.name}`}
                aria-pressed={map.id === activeMapId}
                draggable={false}
                onClick={() => onSelect(map.id)}
              >
                <Map aria-hidden="true" />
              </button>
              <input
                aria-label={`Nombre de ${map.name}`}
                title={map.name}
                draggable={false}
                value={map.name}
                onChange={(event) => onRename(map.id, event.currentTarget.value)}
              />
              <div className="scene-map-list__actions">
                <button
                  type="button"
                  title="Actualizar imagen"
                  data-tooltip="Actualizar imagen"
                  aria-label={`Actualizar imagen de ${map.name}`}
                  disabled={isReplacingImage}
                  draggable={false}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
                  onClick={(event) => { event.stopPropagation(); onReplaceMapImage(map.id); }}
                >
                  <ImageUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Eliminar mapa"
                  data-tooltip="Eliminar mapa"
                  aria-label={`Eliminar ${map.name}`}
                  draggable={false}
                  onClick={() => onDelete(map.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
