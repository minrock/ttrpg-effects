import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import {
  cancelInteraction,
  closeContextMenu,
  createInitialInteractionState,
  deleteSelectedElement,
  openContextMenu,
  selectElement,
  setMapAdjustMode,
  setZoomLocked
} from "../../domain/interaction/interaction-state";
import { applyGridPreset, gridPresets, setGridCellSize, setGridOpacity } from "../../domain/grid/grid";
import { createAnimatedFireEffect, updateAnimatedFireEffect } from "../../domain/effects/fire";
import {
  createLightSource,
  moveLightSource,
  updateLightSource,
  type LightKind,
  type LightPatch
} from "../../domain/lighting/lights";
import { createMapImageState, type MapImageState } from "../../domain/map/map-image";
import { measureDistance } from "../../domain/measurement/measurement";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import {
  createTacticalShape,
  moveShape,
  rotateLinearShape,
  setLinearShapeEnd,
  updateShape,
  type ShapePatch,
  type TacticalShapeKind
} from "../../domain/shapes/shapes";
import type { FirePatch } from "../../domain/effects/fire";
import {
  getTacticalElementLabel,
  tacticalElementKinds,
  type TacticalElementKind
} from "../../domain/tools/tactical-elements";
import { MapViewport } from "./components/MapViewport";
import type { PixiContextMenuRequest } from "../../render/pixi/PixiViewport";

const logoUrl = "/logo/ttrpg-effects-logo.png";
const fallbackAppInfo = {
  name: "TTRPG Effects",
  version: "0.0.0"
} as const;

export function App(): JSX.Element {
  const appInfo = window.ttrpg?.getAppInfo() ?? fallbackAppInfo;
  const [scene, setScene] = useState<SceneDocument>(() => createDefaultScene());
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Escena default en memoria");
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [interaction, setInteraction] = useState(() => createInitialInteractionState());
  const nextShapeId = useRef(1);
  const nextLightId = useRef(1);
  const nextEffectId = useRef(1);

  const handleContextMenuRequest = useCallback((request: PixiContextMenuRequest) => {
    setInteraction((current) => openContextMenu(current, request));
  }, []);

  const handleElementSelect = useCallback((elementId: string | null) => {
    setInteraction((current) => selectElement(current, elementId));
  }, []);

  const handleCreateElement = (kind: TacticalElementKind): void => {
    if (kind === "pointLight" || kind === "coneLight") {
      handleCreateLight(kind === "pointLight" ? "point" : "cone");
      return;
    }

    if (kind === "fire") {
      handleCreateFire();
      return;
    }

    handleCreateShape(kind);
  };

  const handleCreateShape = (kind: TacticalShapeKind): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = `${kind}-${nextShapeId.current}`;
    nextShapeId.current += 1;
    const shape = createTacticalShape({
      id,
      kind,
      position: interaction.contextMenu.world,
      grid: scene.grid,
      settings: scene.settings
    });

    setScene((current) => ({
      ...current,
      shapes: [...current.shapes, shape]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateLight = (kind: LightKind): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = `${kind}-light-${nextLightId.current}`;
    nextLightId.current += 1;
    const light = createLightSource(id, kind, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      lights: [...current.lights, light]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleCreateFire = (): void => {
    if (interaction.contextMenu === null) {
      return;
    }

    const id = `fire-${nextEffectId.current}`;
    nextEffectId.current += 1;
    const effect = createAnimatedFireEffect(id, interaction.contextMenu.world);

    setScene((current) => ({
      ...current,
      effects: [...current.effects, effect]
    }));
    setInteraction((current) => selectElement(closeContextMenu(current), id));
  };

  const handleDeleteSelectedElement = useCallback(() => {
    setScene((current) => {
      if (interaction.selectedElementId === null) {
        return current;
      }

      return {
        ...current,
        lights: current.lights.filter((light) => light.id !== interaction.selectedElementId),
        effects: current.effects.filter((effect) => effect.id !== interaction.selectedElementId),
        shapes: current.shapes.filter((shape) => shape.id !== interaction.selectedElementId)
      };
    });
    setInteraction((current) => deleteSelectedElement(current));
  }, [interaction.selectedElementId]);

  const handleCloseContextMenu = (): void => {
    setInteraction((current) => closeContextMenu(current));
  };

  const handleToggleZoomLock = (): void => {
    setInteraction((current) => setZoomLocked(current, !current.isZoomLocked));
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        locked: !current.grid.locked
      }
    }));
  };

  const mapState = useMemo<MapImageState | null>(
    () =>
      scene.map.imagePath !== null && mapImageUrl !== null
        ? {
            imagePath: scene.map.imagePath,
            imageUrl: mapImageUrl,
            position: scene.map.position,
            scale: scene.map.scale
          }
        : null,
    [scene.map.imagePath, scene.map.position, scene.map.scale, mapImageUrl]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelectedElement();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setInteraction((current) => cancelInteraction(current));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDeleteSelectedElement]);

  async function handleSaveScene(): Promise<void> {
    await runSceneOperation("guardada", async () => {
      if (window.ttrpg === undefined) {
        return { ok: false, error: "La API de preload no esta disponible." };
      }

      return window.ttrpg.saveScene(scene);
    });
  }

  async function handleLoadScene(): Promise<void> {
    await runSceneOperation("cargada", async () => {
      if (window.ttrpg === undefined) {
        return { ok: false, error: "La API de preload no esta disponible." };
      }

      return window.ttrpg.loadScene();
    });
  }

  async function runSceneOperation(
    actionLabel: "guardada" | "cargada",
    operation: () => Promise<SceneOperationResult>
  ): Promise<void> {
    setIsBusy(true);
    setWarnings([]);

    try {
      const result = await operation();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setScene(result.scene);
      if (actionLabel === "cargada") {
        setMapImageUrl(result.mapImageUrl ?? null);
        setInteraction((current) => setZoomLocked(current, result.scene.grid.locked));
      }
      setCurrentFilePath(result.filePath);
      setFeedback(`Escena ${actionLabel}`);
      setWarnings(result.warnings.map((warning) => warning.message));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpenMapImage(): Promise<void> {
    setIsBusy(true);
    setWarnings([]);

    try {
      if (window.ttrpg === undefined) {
        setFeedback("La API de preload no esta disponible.");
        return;
      }

      const result = await window.ttrpg.openMapImage();

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      const nextMap = createMapImageState(result.imagePath, result.imageUrl);
      setMapImageUrl(nextMap.imageUrl);
      setScene((current) => ({
        ...current,
        map: {
          imagePath: nextMap.imagePath,
          position: nextMap.position,
          scale: nextMap.scale
        }
      }));
      setFeedback("Mapa cargado");
    } finally {
      setIsBusy(false);
    }
  }

  function handleGridVisibilityChange(): void {
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        enabled: !current.grid.enabled
      }
    }));
  }

  function handleGridOpacityChange(opacity: number): void {
    setScene((current) => ({
      ...current,
      grid: setGridOpacity(current.grid, opacity)
    }));
  }

  function handleDarknessEnabledChange(): void {
    setScene((current) => ({
      ...current,
      darkness: {
        ...current.darkness,
        enabled: !current.darkness.enabled
      }
    }));
  }

  function handleDarknessOpacityChange(opacity: number): void {
    setScene((current) => ({
      ...current,
      darkness: {
        ...current.darkness,
        opacity: Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : 0))
      }
    }));
  }

  const handleGridCellSizeChange = useCallback((cellSizeWorld: number): void => {
    setScene((current) => ({
      ...current,
      grid: setGridCellSize(current.grid, cellSizeWorld)
    }));
  }, []);

  const handleMapRenderError = useCallback((message: string): void => {
    setFeedback(message);
  }, []);

  const handleMapRendered = useCallback((message: string): void => {
    setFeedback(message);
  }, []);

  const handleMapPositionChange = useCallback((x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      map: { ...current.map, position: { x, y } }
    }));
  }, []);

  const handleElementMove = useCallback((elementId: string, x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      lights: current.lights.map((light) =>
        light.id === elementId ? moveLightSource(light, { x, y }) : light
      ),
      shapes: current.shapes.map((shape) =>
        shape.id === elementId
          ? moveShape(
              shape,
              { x, y },
              current.settings.snapToGrid ? current.grid.cellSizeWorld : undefined
            )
          : shape
      ),
      effects: current.effects.map((effect) =>
        effect.id === elementId ? updateAnimatedFireEffect(effect, { position: { x, y } }) : effect
      )
    }));
  }, []);

  const handleLightDirectionChange = useCallback((elementId: string, direction: number): void => {
    setScene((current) => ({
      ...current,
      lights: current.lights.map((light) =>
        light.id === elementId ? updateLightSource(light, { direction }) : light
      )
    }));
  }, []);

  const handleShapeEndMove = useCallback((elementId: string, x: number, y: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId ? setLinearShapeEnd(shape, { x, y }) : shape
      )
    }));
  }, []);

  const handleShapeDirectionChange = useCallback((elementId: string, direction: number): void => {
    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === elementId ? rotateLinearShape(shape, direction) : shape
      )
    }));
  }, []);

  function handleToggleMapAdjust(): void {
    setInteraction((current) => setMapAdjustMode(current, !current.isMapAdjustMode));
  }

  function handleGridPresetChange(presetId: string): void {
    const preset = gridPresets.find((candidate) => candidate.id === presetId);

    if (preset === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      grid: applyGridPreset(current.grid, preset)
    }));
  }

  const selectedLight =
    interaction.selectedElementId === null
      ? undefined
      : scene.lights.find((light) => light.id === interaction.selectedElementId);
  const selectedEffect =
    interaction.selectedElementId === null
      ? undefined
      : scene.effects.find((effect) => effect.id === interaction.selectedElementId);
  const selectedShape =
    interaction.selectedElementId === null
      ? undefined
      : scene.shapes.find((shape) => shape.id === interaction.selectedElementId);
  const selectedMeasurement =
    selectedShape?.type === "measurement" || selectedShape?.type === "line"
      ? measureDistance(selectedShape.points[0], selectedShape.points[1], {
          grid: scene.grid,
          diagonalMode: scene.settings.diagonalMode
        })
      : undefined;

  function updateSelectedLight(patch: LightPatch): void {
    if (selectedLight === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      lights: current.lights.map((light) =>
        light.id === selectedLight.id ? updateLightSource(light, patch) : light
      )
    }));
  }

  function updateSelectedEffect(patch: FirePatch): void {
    if (selectedEffect === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      effects: current.effects.map((effect) =>
        effect.id === selectedEffect.id ? updateAnimatedFireEffect(effect, patch) : effect
      )
    }));
  }

  function updateSelectedShape(patch: ShapePatch): void {
    if (selectedShape === undefined) {
      return;
    }

    setScene((current) => ({
      ...current,
      shapes: current.shapes.map((shape) =>
        shape.id === selectedShape.id ? updateShape(shape, patch) : shape
      )
    }));
  }

  function handleConeLengthChange(lengthInCells: number): void {
    if (!Number.isFinite(lengthInCells)) {
      return;
    }

    updateSelectedLight({ radius: Math.max(1, lengthInCells) * scene.grid.cellSizeWorld });
  }

  function handleUnitChange(unit: "ft" | "m"): void {
    setScene((current) => ({
      ...current,
      grid: {
        ...current.grid,
        unit
      }
    }));
  }

  function handleSnapToGridChange(): void {
    setScene((current) => ({
      ...current,
      settings: {
        ...current.settings,
        snapToGrid: !current.settings.snapToGrid
      }
    }));
  }

  function handleDiagonalModeChange(diagonalMode: SceneDocument["settings"]["diagonalMode"]): void {
    setScene((current) => ({
      ...current,
      settings: {
        ...current.settings,
        diagonalMode
      }
    }));
  }

  return (
    <main className="app-shell" aria-label="TTRPG Effects">
      <header className="app-toolbar">
        <div className="brand">
          <img className="toolbar-logo" src={logoUrl} alt="" />
          <div>
            <h1>{appInfo.name}</h1>
            <p>Motor visual listo</p>
          </div>
        </div>
        <div className="scene-actions" aria-label="Acciones de escena">
          <button type="button" onClick={handleOpenMapImage} disabled={isBusy}>
            Cargar mapa
          </button>
          <button
            type="button"
            className={interaction.isMapAdjustMode ? "is-active" : ""}
            onClick={handleToggleMapAdjust}
            aria-pressed={interaction.isMapAdjustMode}
            disabled={mapState === null}
          >
            {interaction.isMapAdjustMode ? "Ajustando mapa" : "Ajustar mapa"}
          </button>
          <button
            type="button"
            className={interaction.isZoomLocked ? "is-active" : ""}
            onClick={handleToggleZoomLock}
            aria-pressed={interaction.isZoomLocked}
          >
            {interaction.isZoomLocked ? "Zoom bloqueado" : "Bloquear zoom"}
          </button>
          <button
            type="button"
            onClick={handleDeleteSelectedElement}
            disabled={interaction.selectedElementId === null}
          >
            Borrar seleccionado
          </button>
          <button type="button" onClick={handleSaveScene} disabled={isBusy}>
            Guardar escena
          </button>
          <button type="button" onClick={handleLoadScene} disabled={isBusy}>
            Cargar escena
          </button>
        </div>
      </header>
      <aside className="scene-status" aria-label="Estado de escena">
        <span>{feedback}</span>
        <span>{scene.map.imagePath ?? "Sin mapa"}</span>
        <span>{currentFilePath ?? "Sin archivo seleccionado"}</span>
        <span>
          {scene.shapes.length + scene.lights.length + scene.effects.length + interaction.elements.length} elementos
        </span>
        <span>
          {interaction.selectedElementId === null
            ? "Sin seleccion"
            : `Seleccion: ${interaction.selectedElementId}`}
        </span>
        <span>v{scene.version}</span>
        {warnings.map((warning) => (
          <strong key={warning}>{warning}</strong>
        ))}
      </aside>
      <section className="grid-controls" aria-label="Controles de grilla">
        <label>
          <input type="checkbox" checked={scene.grid.enabled} onChange={handleGridVisibilityChange} />
          Grilla
        </label>
        <label>
          Opacidad
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={scene.grid.opacity}
            onChange={(event) => handleGridOpacityChange(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          Celda
          <input
            type="number"
            min="8"
            max="1000"
            value={scene.grid.cellSizeWorld}
            onChange={(event) => handleGridCellSizeChange(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          Unidad
          <select
            aria-label="Unidad de medicion"
            value={scene.grid.unit}
            onChange={(event) => handleUnitChange(event.currentTarget.value as "ft" | "m")}
          >
            <option value="ft">ft</option>
            <option value="m">m</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={scene.settings.snapToGrid}
            onChange={handleSnapToGridChange}
          />
          Snap
        </label>
        <label>
          Diagonal
          <select
            aria-label="Modo de diagonal"
            value={scene.settings.diagonalMode}
            onChange={(event) =>
              handleDiagonalModeChange(event.currentTarget.value as SceneDocument["settings"]["diagonalMode"])
            }
          >
            <option value="dnd5e-default">D&D 5e</option>
            <option value="manhattan">Manhattan</option>
            <option value="euclidean">Euclidean</option>
          </select>
        </label>
        <select
          aria-label="Preset de escala"
          defaultValue=""
          onChange={(event) => handleGridPresetChange(event.currentTarget.value)}
        >
          <option value="" disabled>
            Preset
          </option>
          {gridPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={scene.darkness.enabled}
            onChange={handleDarknessEnabledChange}
          />
          Oscuridad
        </label>
        <label>
          Overlay
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={scene.darkness.opacity}
            onChange={(event) => handleDarknessOpacityChange(event.currentTarget.valueAsNumber)}
          />
        </label>
      </section>
      {selectedLight !== undefined ? (
        <section className="properties-panel" aria-label="Propiedades de luz">
          <strong>{selectedLight.kind === "point" ? "Luz puntual" : "Luz conica"}</strong>
          <label>
            Visible
            <input
              type="checkbox"
              checked={selectedLight.visible}
              onChange={(event) => updateSelectedLight({ visible: event.currentTarget.checked })}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={selectedLight.color}
              onChange={(event) => updateSelectedLight({ color: event.currentTarget.value })}
            />
          </label>
          {selectedLight.kind === "cone" ? (
            <label>
              Longitud
              <input
                type="number"
                min="1"
                max="40"
                step="1"
                value={Math.max(1, Math.round(selectedLight.radius / scene.grid.cellSizeWorld))}
                onChange={(event) => handleConeLengthChange(event.currentTarget.valueAsNumber)}
              />
              <span>{Math.round((selectedLight.radius / scene.grid.cellSizeWorld) * scene.grid.distancePerCell)} ft</span>
            </label>
          ) : (
            <label>
              Radio
              <input
                type="number"
                min="1"
                max="1200"
                value={selectedLight.radius}
                onChange={(event) => updateSelectedLight({ radius: event.currentTarget.valueAsNumber })}
              />
            </label>
          )}
          <label>
            Intensidad
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedLight.intensity}
              onChange={(event) => updateSelectedLight({ intensity: event.currentTarget.valueAsNumber })}
            />
          </label>
          <label>
            Opacidad
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedLight.opacity}
              onChange={(event) => updateSelectedLight({ opacity: event.currentTarget.valueAsNumber })}
            />
          </label>
          {selectedLight.kind === "cone" ? (
            <label>
              Direccion
              <input
                type="number"
                min="0"
                max="360"
                value={selectedLight.direction}
                onChange={(event) => updateSelectedLight({ direction: event.currentTarget.valueAsNumber })}
              />
            </label>
          ) : null}
        </section>
      ) : null}
      {selectedEffect !== undefined ? (
        <section className="properties-panel" aria-label="Propiedades de fuego">
          <strong>Fuego</strong>
          <label>
            Visible
            <input
              type="checkbox"
              checked={selectedEffect.visible}
              onChange={(event) => updateSelectedEffect({ visible: event.currentTarget.checked })}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={selectedEffect.color}
              onChange={(event) => updateSelectedEffect({ color: event.currentTarget.value })}
            />
          </label>
          <label>
            Escala
            <input
              type="number"
              min="0.1"
              max="8"
              step="0.1"
              value={selectedEffect.scale}
              onChange={(event) => updateSelectedEffect({ scale: event.currentTarget.valueAsNumber })}
            />
          </label>
          <label>
            Opacidad
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedEffect.opacity}
              onChange={(event) => updateSelectedEffect({ opacity: event.currentTarget.valueAsNumber })}
            />
          </label>
          <label>
            Emite luz
            <input
              type="checkbox"
              checked={selectedEffect.emitsLight}
              onChange={(event) => updateSelectedEffect({ emitsLight: event.currentTarget.checked })}
            />
          </label>
          <label>
            Radio luz
            <input
              type="number"
              min="1"
              max="1000"
              value={selectedEffect.lightRadius}
              onChange={(event) => updateSelectedEffect({ lightRadius: event.currentTarget.valueAsNumber })}
            />
          </label>
        </section>
      ) : null}
      {selectedShape !== undefined ? (
        <section className="properties-panel" aria-label="Propiedades de forma tactica">
          <strong>
            {selectedShape.type === "measurement"
              ? "Medicion"
              : selectedShape.type === "line"
                ? "Linea"
                : selectedShape.type === "circle"
                  ? "Circulo"
                  : selectedShape.type === "cone"
                    ? "Cono"
                    : "Rectangulo"}
          </strong>
          {selectedMeasurement !== undefined ? <span>{selectedMeasurement.label}</span> : null}
          {selectedShape.type === "circle" || selectedShape.type === "cone" ? (
            <label>
              Radio
              <input
                type="number"
                min="1"
                max="2000"
                value={selectedShape.radius ?? scene.grid.cellSizeWorld}
                onChange={(event) => updateSelectedShape({ radius: event.currentTarget.valueAsNumber })}
              />
            </label>
          ) : null}
          {selectedShape.type === "cone" ? (
            <>
              <label>
                Angulo
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={selectedShape.angle ?? 60}
                  onChange={(event) => updateSelectedShape({ angle: event.currentTarget.valueAsNumber })}
                />
              </label>
              <label>
                Direccion
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={selectedShape.direction ?? 0}
                  onChange={(event) => updateSelectedShape({ direction: event.currentTarget.valueAsNumber })}
                />
              </label>
            </>
          ) : null}
          {selectedShape.type === "rectangle" ? (
            <>
              <label>
                Ancho
                <input
                  type="number"
                  min="1"
                  max="3000"
                  value={selectedShape.width ?? scene.grid.cellSizeWorld}
                  onChange={(event) => updateSelectedShape({ width: event.currentTarget.valueAsNumber })}
                />
              </label>
              <label>
                Alto
                <input
                  type="number"
                  min="1"
                  max="3000"
                  value={selectedShape.height ?? scene.grid.cellSizeWorld}
                  onChange={(event) => updateSelectedShape({ height: event.currentTarget.valueAsNumber })}
                />
              </label>
            </>
          ) : null}
        </section>
      ) : null}
      <MapViewport
        map={mapState}
        grid={scene.grid}
        settings={scene.settings}
        darkness={scene.darkness}
        elements={interaction.elements}
        shapes={scene.shapes}
        lights={scene.lights}
        effects={scene.effects}
        selectedElementId={interaction.selectedElementId}
        isZoomLocked={interaction.isZoomLocked}
        isMapAdjustMode={interaction.isMapAdjustMode}
        onContextMenuRequest={handleContextMenuRequest}
        onElementSelect={handleElementSelect}
        onGridCellSizeChange={handleGridCellSizeChange}
        onMapRenderError={handleMapRenderError}
        onMapRendered={handleMapRendered}
        onMapPositionChange={handleMapPositionChange}
        onElementMove={handleElementMove}
        onLightDirectionChange={handleLightDirectionChange}
        onShapeEndMove={handleShapeEndMove}
        onShapeDirectionChange={handleShapeDirectionChange}
      />
      {interaction.contextMenu !== null ? (
        <div
          className="context-menu-backdrop"
          onClick={handleCloseContextMenu}
          onContextMenu={(event) => {
            event.preventDefault();
            handleCloseContextMenu();
          }}
        >
          <menu
            className="context-menu"
            style={{
              left: interaction.contextMenu.screen.x,
              top: interaction.contextMenu.screen.y
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {tacticalElementKinds.map((kind) => (
              <button key={kind} type="button" onClick={() => handleCreateElement(kind)}>
                {getTacticalElementLabel(kind)}
              </button>
            ))}
          </menu>
        </div>
      ) : null}
    </main>
  );
}
