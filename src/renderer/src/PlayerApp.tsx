import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Compass, Lock, Unlock, Wrench, ZoomIn, ZoomOut } from "lucide-react";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { getTokensForRole, normalizeCameraSnapshot, type ArcanePointerBroadcast, type PlayerWindowSnapshot, type ViewportCameraSnapshot } from "../../domain/player/player-window";
import { sortTokensByOrder } from "../../domain/tokens/tokens";
import type { SceneDocument } from "../../domain/sessions/scene-document";
import type { MapImageState } from "../../domain/map/map-image";
import { MapViewport, type MapViewportHandle } from "./components/MapViewport";
import { PlayerTools } from "./components/workspace/PlayerTools";
import { usePlayerTools } from "./hooks/usePlayerTools";
import { zoomPlayerCamera } from "../../domain/player/player-camera-control";
import { PlayerAsideOverlay } from "./components/aside/PlayerAsideOverlay";
import { createDefaultSceneAside } from "../../domain/sessions/scene-aside";
import { CombatTurnBar } from "./components/combat/CombatTurnBar";
import { SceneCountersOverlay } from "./components/counters/SceneCountersOverlay";
import { usePublicDice } from "./hooks/useDiceSession";
import { useDiceSizes } from "./hooks/useDiceSizes";
import { DiceOverlay } from "./components/dice/DiceOverlay";
import type { InformationAreaHighlightBroadcast } from "../../domain/annotations/map-annotations";
import {
  sanitizePlayerCameraCommand,
  type PlayerViewportReport,
  type PlayerCameraReportOrigin
} from "../../domain/player/player-camera-control";

const EMPTY_ITEMS = [] as const;
const EMPTY_MAP_ANNOTATIONS = { pins: EMPTY_ITEMS, areas: EMPTY_ITEMS, sceneLinks: EMPTY_ITEMS };
const EMPTY_LINK_STATUSES = {};

export function PlayerApp(): JSX.Element {
  const shellRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<MapViewportHandle | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [scene, setScene] = useState<SceneDocument>(() => createDefaultScene());
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [tokenImageUrls, setTokenImageUrls] = useState<Readonly<Record<string, string>>>({});
  const [camera, setCamera] = useState<ViewportCameraSnapshot>(() =>
    normalizeCameraSnapshot({ center: { x: 0, y: 0 }, zoom: 1 })
  );
  const [activeZoom, setActiveZoom] = useState(1);
  const hasInitializedCameraRef = useRef(false);
  const cameraSyncKeyRef = useRef<number | null>(null);
  const mapLoadKeyRef = useRef<string | null>(null);
  const [viewportIdentity, setViewportIdentity] = useState<string | null>(null);
  const viewportIdentityRef = useRef<string | null>(null);
  const requestedImageUrlRef = useRef<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [isZoomLocked, setIsZoomLocked] = useState(true);
  const [showCompass, setShowCompass] = useState(false);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [arcanePointerEvent, setArcanePointerEvent] = useState<ArcanePointerBroadcast | null>(null);
  const [informationAreaHighlightEvent, setInformationAreaHighlightEvent] =
    useState<InformationAreaHighlightBroadcast | null>(null);
  const [informationAreaHighlightResetKey, setInformationAreaHighlightResetKey] = useState(0);
  const latestPlayerCameraRef = useRef(camera);
  const latestPlayerViewportRef = useRef<PlayerViewportReport | null>(null);
  const activeMapIdRef = useRef(scene.activeMapId);
  const lastCameraCommandRevisionRef = useRef(-1);
  const acknowledgedCameraCommandRevisionRef = useRef<number | null>(null);
  const cameraReportRevisionRef = useRef(0);
  const cameraReportTimerRef = useRef<number | null>(null);
  const isCameraReportInFlightRef = useRef(false);
  const isCameraReporterActiveRef = useRef(true);
  const pendingCameraReportRef = useRef<{
    readonly camera: ViewportCameraSnapshot;
    readonly origin: PlayerCameraReportOrigin;
    readonly final: boolean;
    readonly viewport: PlayerViewportReport | null;
  } | null>(null);
  activeMapIdRef.current = scene.activeMapId;

  const flushPlayerCameraReport = useCallback((): void => {
    if (cameraReportTimerRef.current !== null) {
      window.clearTimeout(cameraReportTimerRef.current);
      cameraReportTimerRef.current = null;
    }
    const pending = pendingCameraReportRef.current;
    if (
      pending === null ||
      window.ttrpg === undefined ||
      isCameraReportInFlightRef.current
    ) {
      return;
    }

    pendingCameraReportRef.current = null;
    isCameraReportInFlightRef.current = true;
    const reportRevision = cameraReportRevisionRef.current + 1;
    cameraReportRevisionRef.current = reportRevision;
    void window.ttrpg.reportPlayerCamera({
      reportRevision,
      acknowledgedCommandRevision: acknowledgedCameraCommandRevisionRef.current,
      camera: pending.camera,
      origin: pending.origin,
      final: pending.final,
      ...(pending.viewport === null ? {} : { viewport: pending.viewport })
    }).finally(() => {
      isCameraReportInFlightRef.current = false;
      if (
        isCameraReporterActiveRef.current &&
        pendingCameraReportRef.current !== null &&
        cameraReportTimerRef.current === null
      ) {
        cameraReportTimerRef.current = window.setTimeout(flushPlayerCameraReport, 0);
      }
    });
  }, []);

  const queuePlayerCameraReport = useCallback(
    (
      nextCamera: ViewportCameraSnapshot,
      origin: PlayerCameraReportOrigin,
      final: boolean
    ): void => {
      const normalized = normalizeCameraSnapshot(nextCamera);
      latestPlayerCameraRef.current = normalized;
      pendingCameraReportRef.current = {
        camera: normalized,
        origin,
        final,
        viewport: latestPlayerViewportRef.current
      };
      if (final) {
        flushPlayerCameraReport();
        return;
      }
      if (cameraReportTimerRef.current === null) {
        cameraReportTimerRef.current = window.setTimeout(flushPlayerCameraReport, 80);
      }
    },
    [flushPlayerCameraReport]
  );

  const updatePlayerViewportReport = useCallback((): void => {
    const bounds = shellRef.current?.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds?.width ?? window.innerWidth));
    const height = Math.max(1, Math.floor(bounds?.height ?? window.innerHeight));
    const nextViewport: PlayerViewportReport = {
      width,
      height,
      devicePixelRatio: window.devicePixelRatio > 0 ? window.devicePixelRatio : 1,
      orientation: width >= height ? "landscape" : "portrait",
      ...(activeMapIdRef.current === null ? {} : { mapId: activeMapIdRef.current })
    };
    const current = latestPlayerViewportRef.current;
    latestPlayerViewportRef.current = nextViewport;
    if (
      current === null ||
      current.width !== nextViewport.width ||
      current.height !== nextViewport.height ||
      current.devicePixelRatio !== nextViewport.devicePixelRatio ||
      current.mapId !== nextViewport.mapId
    ) {
      queuePlayerCameraReport(latestPlayerCameraRef.current, "local-navigation", true);
    }
  }, [queuePlayerCameraReport]);

  const applyPlayerCameraCommand = useCallback(
    (value: unknown): void => {
      const command = sanitizePlayerCameraCommand(value);
      if (command === null || command.revision <= lastCameraCommandRevisionRef.current) {
        return;
      }

      lastCameraCommandRevisionRef.current = command.revision;
      acknowledgedCameraCommandRevisionRef.current = command.revision;
      const normalized = normalizeCameraSnapshot(command.camera);
      latestPlayerCameraRef.current = normalized;
      setCamera(normalized);
      setActiveZoom(normalized.zoom);
      queuePlayerCameraReport(normalized, "remote-command", true);
    },
    [queuePlayerCameraReport]
  );

  const applySnapshot = useCallback((snapshot: PlayerWindowSnapshot | null): void => {
    if (snapshot === null) {
      return;
    }

    setScene(snapshot.scene);
    setMapImageUrl(snapshot.mapImageUrl);
    requestedImageUrlRef.current = snapshot.mapImageUrl;
    setTokenImageUrls(snapshot.tokenImageUrls);
    setShowZoomIndicator(snapshot.showZoomIndicator ?? false);
    setIsHydrated(true);
    setInformationAreaHighlightResetKey(snapshot.informationAreaHighlightResetKey ?? 0);
    // DM increments cameraSyncKey on scene loads/navigation, including scenes
    // with empty or reused IDs. Image replacement keeps that epoch unchanged.
    const nextCameraSyncKey = snapshot.cameraSyncKey ?? 0;
    const nextViewportIdentity = JSON.stringify([nextCameraSyncKey, snapshot.scene.id, snapshot.scene.activeMapId]);
    const changesViewport = viewportIdentityRef.current !== nextViewportIdentity;
    viewportIdentityRef.current = nextViewportIdentity;
    setViewportIdentity(nextViewportIdentity);
    const nextMapLoadKey =
      snapshot.scene.map.imagePath !== null && snapshot.mapImageUrl !== null
        ? `${snapshot.scene.map.imagePath}:${snapshot.mapImageUrl}`
        : null;
    if (nextMapLoadKey === null) {
      setIsViewportReady(true);
    } else if (changesViewport || mapLoadKeyRef.current === null) {
      setIsViewportReady(false);
    }
    mapLoadKeyRef.current = nextMapLoadKey;
    if (!hasInitializedCameraRef.current || cameraSyncKeyRef.current !== nextCameraSyncKey) {
      const normalized = normalizeCameraSnapshot(snapshot.camera);
      latestPlayerCameraRef.current = normalized;
      setCamera(normalized);
      setActiveZoom(normalized.zoom);
      hasInitializedCameraRef.current = true;
      cameraSyncKeyRef.current = nextCameraSyncKey;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    isCameraReporterActiveRef.current = true;
    const offScene = window.ttrpg?.onPlayerScene((snapshot) => {
      if (mounted) {
        applySnapshot(snapshot);
      }
    });
    const offPointer = window.ttrpg?.onPlayerPointer((pointer) => {
      if (mounted) {
        setArcanePointerEvent(pointer);
      }
    });
    const offInformationAreaHighlight = window.ttrpg?.onPlayerInformationAreaHighlight((highlight) => {
      if (mounted) {
        setInformationAreaHighlightEvent(highlight);
      }
    });
    const offCameraCommand = window.ttrpg?.onPlayerCameraCommand((command) => {
      if (mounted) {
        applyPlayerCameraCommand(command);
      }
    });

    void window.ttrpg?.getPlayerWindowState().then((state) => {
      if (!mounted) {
        return;
      }

      applySnapshot(state.snapshot);
      if (!hasInitializedCameraRef.current && state.camera !== null) {
        const normalized = normalizeCameraSnapshot(state.camera);
        latestPlayerCameraRef.current = normalized;
        setCamera(normalized);
        setActiveZoom(normalized.zoom);
        hasInitializedCameraRef.current = true;
      }
      if (state.cameraCommand !== null) {
        applyPlayerCameraCommand(state.cameraCommand);
      }
    });

    return () => {
      mounted = false;
      isCameraReporterActiveRef.current = false;
      offScene?.();
      offPointer?.();
      offInformationAreaHighlight?.();
      offCameraCommand?.();
      if (cameraReportTimerRef.current !== null) {
        window.clearTimeout(cameraReportTimerRef.current);
        cameraReportTimerRef.current = null;
      }
    };
  }, [applyPlayerCameraCommand, applySnapshot]);

  useEffect(() => {
    updatePlayerViewportReport();
    const target = shellRef.current;
    if (target === null || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updatePlayerViewportReport);
      return () => window.removeEventListener("resize", updatePlayerViewportReport);
    }

    const observer = new ResizeObserver(updatePlayerViewportReport);
    observer.observe(target);
    window.addEventListener("resize", updatePlayerViewportReport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePlayerViewportReport);
    };
  }, [updatePlayerViewportReport]);

  useEffect(() => {
    updatePlayerViewportReport();
  }, [scene.activeMapId, updatePlayerViewportReport]);

  const mapState = useMemo<MapImageState | null>(
    () =>
      scene.map.imagePath !== null && mapImageUrl !== null
        ? {
            mapId: scene.activeMapId ?? undefined,
            imagePath: scene.map.imagePath,
            imageUrl: mapImageUrl,
            position: scene.map.position,
            scale: scene.map.scale
          }
        : null,
    [scene.activeMapId, scene.map.imagePath, scene.map.position, scene.map.scale, mapImageUrl]
  );
  const renderedTokens = useMemo(
    () =>
      sortTokensByOrder(getTokensForRole(scene.tokens, "player")).map((token) => ({
        ...token,
        imageUrl: tokenImageUrls[token.id] ?? null
      })),
    [scene.tokens, tokenImageUrls]
  );
  const noop = useCallback((): void => undefined, []);
  const handlePlayerCameraChange = useCallback(
    (nextCamera: ViewportCameraSnapshot): void => {
      const normalized = normalizeCameraSnapshot(nextCamera);
      setActiveZoom(normalized.zoom);
      queuePlayerCameraReport(normalized, "local-navigation", false);
    },
    [queuePlayerCameraReport]
  );
  const handlePlayerCameraInteractionEnd = useCallback(
    (nextCamera: ViewportCameraSnapshot): void => {
      const normalized = normalizeCameraSnapshot(nextCamera);
      setActiveZoom(normalized.zoom);
      queuePlayerCameraReport(normalized, "local-navigation", true);
    },
    [queuePlayerCameraReport]
  );
  const handlePlayerMapReady = useCallback(({ imageUrl }: { imageUrl: string }): void => {
    if (!isCameraReporterActiveRef.current || viewportIdentity !== viewportIdentityRef.current ||
      imageUrl !== requestedImageUrlRef.current) return;
    setIsViewportReady(true);
    void window.ttrpg?.reportPlayerMapImageStatus({ imageUrl, ok: true });
  }, [viewportIdentity]);
  const handlePlayerMapError = useCallback(({ imageUrl, error }: { imageUrl: string; error: string }): void => {
    if (!isCameraReporterActiveRef.current || viewportIdentity !== viewportIdentityRef.current ||
      imageUrl !== requestedImageUrlRef.current) return;
    setIsViewportReady(true);
    void window.ttrpg?.reportPlayerMapImageStatus({ imageUrl, ok: false, error: error.slice(0, 500) });
  }, [viewportIdentity]);

  useEffect(() => {
    if (isHydrated && isViewportReady) {
      void window.ttrpg?.notifyPlayerContentReady();
      queuePlayerCameraReport(latestPlayerCameraRef.current, "initialization", true);
    }
  }, [isHydrated, isViewportReady, queuePlayerCameraReport]);

  const diceEnvelope = usePublicDice(scene.activeMapId, viewportIdentity ?? "", isHydrated && isViewportReady);
  const { sizes: diceSizes } = useDiceSizes();
  const tools = usePlayerTools(viewportIdentity, scene.grid, scene.settings);
  const shapes = useMemo(() => [...scene.shapes, ...tools.shapes], [scene.shapes, tools.shapes]);
  const handlePathHover = useCallback((point: { readonly x: number; readonly y: number } | null): void => {
    viewportRef.current?.setPathHoverPoint(point);
  }, []);
  const zoomLocal = (direction: "in" | "out"): void => {
    if (isZoomLocked) return;
    const next = zoomPlayerCamera(latestPlayerCameraRef.current, direction);
    viewportRef.current?.setCameraSnapshot(next);
    setActiveZoom(next.zoom);
    queuePlayerCameraReport(next, "local-navigation", true);
  };

  return (
    <main ref={shellRef} className="player-shell player-workspace-root" aria-label="TTRPG Effects jugador">
      {isHydrated ? (
        <MapViewport
          ref={viewportRef}
          key={viewportIdentity}
          overlay={<DiceOverlay envelope={diceEnvelope} size={diceSizes.player} />}
          map={mapState}
          grid={scene.grid}
          settings={scene.settings}
          darkness={scene.darkness}
          fogOfWar={scene.fogOfWar}
          elements={EMPTY_ITEMS}
          shapes={shapes}
          localEditableShapeIds={showTools ? tools.editableIds : undefined}
          lights={scene.lights}
          effects={scene.effects}
          tokens={renderedTokens}
          labels={EMPTY_ITEMS}
          mapAnnotations={EMPTY_MAP_ANNOTATIONS}
          sceneLinkStatuses={EMPTY_LINK_STATUSES}
          compassOrientation={scene.compassOrientation}
          backgroundColor={scene.backgroundColor}
          daytimeFilter={scene.daytimeFilter}
          daytimeMask={scene.daytimeMask}
          showCompass={showCompass}
          showMapAnnotations={false}
          selectedElementId={tools.selectedId}
          isZoomLocked={isZoomLocked}
          isMapAdjustMode={false}
          isGridAdjustMode={false}
          isGrabMode={tools.tool === "pan"}
          viewRole="player"
          isReadOnly
          isNavigationEnabled
          fogPresentation="player-blocking"
          hiddenTokenPolicy="hide"
          cameraSnapshot={camera}
          isFogRevealMode={false}
          isFirePaintMode={false}
          isPathDrawingMode={tools.isDrawing}
          isWaterDrawingMode={false}
          isArcanePointerMode={false}
          isRoomPinMode={false}
          isInformationAreaMode={false}
          arcanePointerCreatureSize="medium"
          arcanePointerResetKey={0}
          arcanePointerEvent={arcanePointerEvent}
          informationAreaHighlightEvent={informationAreaHighlightEvent}
          informationAreaHighlightResetKey={informationAreaHighlightResetKey}
          pathPreviewPoints={tools.points}
          pathPreviewHoverPoint={null}
          waterPreviewPoints={EMPTY_ITEMS}
          waterPreviewHoverPoint={null}
          onContextMenuRequest={noop}
          onElementSelect={tools.select}
          onGridCellSizeChange={noop}
          onMapRenderError={noop}
          onMapRendered={noop}
          onMapImageLoaded={handlePlayerMapReady}
          onMapImageError={handlePlayerMapError}
          onMapPositionChange={noop}
          onElementMove={tools.move}
          onLightDirectionChange={noop}
          onLightRadiusChange={noop}
          onShapeEndMove={tools.moveEnd}
          onPathPointAdd={tools.addPoint}
          onPathPointerMove={handlePathHover}
          onWaterPointAdd={noop}
          onWaterPointerMove={noop}
          onPathPointMove={tools.movePoint}
          onPathMove={tools.movePath}
          onShapeDirectionChange={tools.direction}
          onShapeRadiusChange={tools.radius}
          onShapeRectResize={tools.resize}
          onFogRevealStroke={noop}
          onFirePaint={noop}
          onFireZoneRadiusChange={noop}
          onFireLightRadiusChange={noop}
          onMagicalDarknessRadiusChange={noop}
          onWaterLineRotationChange={noop}
          onWaterPatternRotationChange={noop}
          onCameraChange={handlePlayerCameraChange}
          onCameraInteractionEnd={handlePlayerCameraInteractionEnd}
          onRoomPinPlace={noop}
          onInformationAreaPaint={noop}
          onInformationAreaHighlight={noop}
          onMapAnnotationPreview={noop}
        />
      ) : null}
      {isHydrated && showTools && <PlayerTools
        tool={tools.tool}
        selectedShape={tools.selectedShape}
        count={tools.shapes.length}
        draftCount={tools.points.length}
        disabled={!isViewportReady}
        grid={scene.grid}
        settings={scene.settings}
        onTool={tools.chooseTool}
        onArea={kind => tools.createArea(kind, latestPlayerCameraRef.current.center)}
        onFinish={tools.finish}
        onCancel={tools.cancel}
        onUndoPoint={tools.undoPoint}
        onDelete={tools.remove}
        onClear={tools.clear}
        onPatch={tools.patch}
      />}
      {isHydrated && (
        <PlayerAsideOverlay aside={scene.sceneAside ?? createDefaultSceneAside()} />
      )}
      {showZoomIndicator ? (
        <output
          className="player-zoom-indicator"
          aria-label={`Zoom actual: ${Math.round(activeZoom * 100)} por ciento. Tamano de cuadro: ${Math.round(scene.grid.cellSizeWorld * activeZoom)} pixeles`}
        >
          <span>Zoom</span>
          <strong>{Math.round(activeZoom * 100)}%</strong>
          <span>Cuadro</span>
          <strong>{Math.round(scene.grid.cellSizeWorld * activeZoom)} px</strong>
        </output>
      ) : null}
      {isHydrated ? (
        <CombatTurnBar tracker={scene.combatTracker} viewRole="player" />
      ) : null}
      {isHydrated ? <SceneCountersOverlay counters={scene.counters} viewRole="player" /> : null}
      {!isViewportReady && (
        <div className="player-loading" role="status" aria-live="polite">
          <div className="player-loading__mark" aria-hidden="true" />
          <strong>Cargando vista de jugador</strong>
          <span>{isHydrated ? "Preparando mapa y efectos..." : "Sincronizando escena..."}</span>
        </div>
      )}
      <div className="player-controls" aria-label="Controles de vista de jugador">
        <button type="button" className={`player-control-button${showTools ? " is-active" : ""}`}
          title={showTools ? "Ocultar herramientas" : "Mostrar herramientas"}
          aria-label={showTools ? "Ocultar herramientas" : "Mostrar herramientas"} aria-pressed={showTools}
          onClick={() => { tools.cancel(); setShowTools(current => !current); }}>
          <Wrench aria-hidden="true" size={17} />
        </button>
        <button type="button" className="player-control-button" title="Alejar vista local" aria-label="Alejar vista local"
          disabled={isZoomLocked || !isViewportReady} onClick={() => zoomLocal("out")}><ZoomOut aria-hidden="true" size={17} /></button>
        <button type="button" className="player-control-button" title="Acercar vista local" aria-label="Acercar vista local"
          disabled={isZoomLocked || !isViewportReady} onClick={() => zoomLocal("in")}><ZoomIn aria-hidden="true" size={17} /></button>
        <button
          className={`player-control-button${isZoomLocked ? " is-locked" : ""}`}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsZoomLocked((current) => !current)}
          title={isZoomLocked ? "Desbloquear zoom local" : "Bloquear zoom local"}
          aria-label={isZoomLocked ? "Desbloquear zoom local" : "Bloquear zoom local"}
          aria-pressed={isZoomLocked}
        >
          {isZoomLocked ? <Lock aria-hidden="true" size={15} /> : <Unlock aria-hidden="true" size={15} />}
        </button>
        <button
          className={`player-control-button${showCompass ? " is-active" : ""}`}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setShowCompass((current) => !current)}
          title={showCompass ? "Ocultar brujula" : "Mostrar brujula"}
          aria-label={showCompass ? "Ocultar brujula" : "Mostrar brujula"}
          aria-pressed={showCompass}
        >
          <Compass aria-hidden="true" size={15} />
        </button>
      </div>
    </main>
  );
}
