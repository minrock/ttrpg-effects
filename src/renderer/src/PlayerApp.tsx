import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Compass, Lock, Unlock } from "lucide-react";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { getTokensForRole, normalizeCameraSnapshot, type ArcanePointerBroadcast, type PlayerWindowSnapshot, type ViewportCameraSnapshot } from "../../domain/player/player-window";
import { sortTokensByOrder } from "../../domain/tokens/tokens";
import type { SceneDocument } from "../../domain/sessions/scene-document";
import type { MapImageState } from "../../domain/map/map-image";
import { MapViewport } from "./components/MapViewport";
import { PlayerAsideOverlay } from "./components/aside/PlayerAsideOverlay";
import { createDefaultSceneAside } from "../../domain/sessions/scene-aside";
import { CombatTurnBar } from "./components/combat/CombatTurnBar";
import type { InformationAreaHighlightBroadcast } from "../../domain/annotations/map-annotations";
import {
  sanitizePlayerCameraCommand,
  type PlayerCameraReportOrigin
} from "../../domain/player/player-camera-control";

export function PlayerApp(): JSX.Element {
  const [scene, setScene] = useState<SceneDocument>(() => createDefaultScene());
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [tokenImageUrls, setTokenImageUrls] = useState<Readonly<Record<string, string>>>({});
  const [camera, setCamera] = useState<ViewportCameraSnapshot>(() =>
    normalizeCameraSnapshot({ center: { x: 0, y: 0 }, zoom: 1 })
  );
  const hasInitializedCameraRef = useRef(false);
  const cameraSyncKeyRef = useRef<number | null>(null);
  const mapLoadKeyRef = useRef<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [isZoomLocked, setIsZoomLocked] = useState(true);
  const [showCompass, setShowCompass] = useState(false);
  const [arcanePointerEvent, setArcanePointerEvent] = useState<ArcanePointerBroadcast | null>(null);
  const [informationAreaHighlightEvent, setInformationAreaHighlightEvent] =
    useState<InformationAreaHighlightBroadcast | null>(null);
  const [informationAreaHighlightResetKey, setInformationAreaHighlightResetKey] = useState(0);
  const latestPlayerCameraRef = useRef(camera);
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
  } | null>(null);

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
      final: pending.final
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
      pendingCameraReportRef.current = { camera: normalized, origin, final };
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
    setTokenImageUrls(snapshot.tokenImageUrls);
    setIsHydrated(true);
    setInformationAreaHighlightResetKey(snapshot.informationAreaHighlightResetKey ?? 0);
    const nextMapLoadKey =
      snapshot.scene.map.imagePath !== null && snapshot.mapImageUrl !== null
        ? `${snapshot.scene.map.imagePath}:${snapshot.mapImageUrl}`
        : null;
    if (nextMapLoadKey === null) {
      mapLoadKeyRef.current = null;
      setIsViewportReady(true);
    } else if (mapLoadKeyRef.current !== nextMapLoadKey) {
      mapLoadKeyRef.current = nextMapLoadKey;
      setIsViewportReady(false);
    }
    const nextCameraSyncKey = snapshot.cameraSyncKey ?? 0;
    if (!hasInitializedCameraRef.current || cameraSyncKeyRef.current !== nextCameraSyncKey) {
      const normalized = normalizeCameraSnapshot(snapshot.camera);
      latestPlayerCameraRef.current = normalized;
      setCamera(normalized);
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
      queuePlayerCameraReport(nextCamera, "local-navigation", false);
    },
    [queuePlayerCameraReport]
  );
  const handlePlayerCameraInteractionEnd = useCallback(
    (nextCamera: ViewportCameraSnapshot): void => {
      queuePlayerCameraReport(nextCamera, "local-navigation", true);
    },
    [queuePlayerCameraReport]
  );
  const handlePlayerMapReady = useCallback((): void => {
    setIsViewportReady(true);
  }, []);

  useEffect(() => {
    if (isHydrated && isViewportReady) {
      void window.ttrpg?.notifyPlayerContentReady();
      queuePlayerCameraReport(latestPlayerCameraRef.current, "initialization", true);
    }
  }, [isHydrated, isViewportReady, queuePlayerCameraReport]);

  return (
    <main className="player-shell" aria-label="TTRPG Effects jugador">
      {isHydrated ? (
        <MapViewport
          map={mapState}
          grid={scene.grid}
          settings={scene.settings}
          darkness={scene.darkness}
          fogOfWar={scene.fogOfWar}
          elements={[]}
          shapes={scene.shapes}
          lights={scene.lights}
          effects={scene.effects}
          tokens={renderedTokens}
          labels={[]}
          mapAnnotations={{ pins: [], areas: [], sceneLinks: [] }}
          compassOrientation={scene.compassOrientation}
          showCompass={showCompass}
          showMapAnnotations={false}
          selectedElementId={null}
          isZoomLocked={isZoomLocked}
          isMapAdjustMode={false}
          isGridAdjustMode={false}
          isGrabMode={false}
          viewRole="player"
          isReadOnly
          isNavigationEnabled
          fogPresentation="player-blocking"
          hiddenTokenPolicy="hide"
          cameraSnapshot={camera}
          isFogRevealMode={false}
          isFirePaintMode={false}
          isPathDrawingMode={false}
          isWaterDrawingMode={false}
          isArcanePointerMode={false}
          isRoomPinMode={false}
          isInformationAreaMode={false}
          arcanePointerCreatureSize="medium"
          arcanePointerResetKey={0}
          arcanePointerEvent={arcanePointerEvent}
          informationAreaHighlightEvent={informationAreaHighlightEvent}
          informationAreaHighlightResetKey={informationAreaHighlightResetKey}
          pathPreviewPoints={[]}
          pathPreviewHoverPoint={null}
          waterPreviewPoints={[]}
          waterPreviewHoverPoint={null}
          onContextMenuRequest={noop}
          onElementSelect={noop}
          onGridCellSizeChange={noop}
          onMapRenderError={handlePlayerMapReady}
          onMapRendered={handlePlayerMapReady}
          onMapPositionChange={noop}
          onElementMove={noop}
          onLightDirectionChange={noop}
          onLightRadiusChange={noop}
          onShapeEndMove={noop}
          onPathPointAdd={noop}
          onPathPointerMove={noop}
          onWaterPointAdd={noop}
          onWaterPointerMove={noop}
          onPathPointMove={noop}
          onPathMove={noop}
          onShapeDirectionChange={noop}
          onShapeRadiusChange={noop}
          onShapeRectResize={noop}
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
      {isHydrated && (
        <PlayerAsideOverlay aside={scene.sceneAside ?? createDefaultSceneAside()} />
      )}
      {isHydrated ? (
        <CombatTurnBar tracker={scene.combatTracker} viewRole="player" />
      ) : null}
      {!isViewportReady && (
        <div className="player-loading" role="status" aria-live="polite">
          <div className="player-loading__mark" aria-hidden="true" />
          <strong>Cargando vista de jugador</strong>
          <span>{isHydrated ? "Preparando mapa y efectos..." : "Sincronizando escena..."}</span>
        </div>
      )}
      <div className="player-controls" aria-label="Controles de vista de jugador">
        <button
          className={`player-control-button${isZoomLocked ? " is-locked" : ""}`}
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsZoomLocked((current) => !current)}
          title={isZoomLocked ? "Desbloquear zoom local" : "Bloquear zoom local"}
        >
          {isZoomLocked ? <Lock aria-hidden="true" size={15} /> : <Unlock aria-hidden="true" size={15} />}
          <span>{isZoomLocked ? "Zoom bloqueado" : "Zoom desbloqueado"}</span>
        </button>
        <button
          className={`player-control-button${showCompass ? " is-active" : ""}`}
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setShowCompass((current) => !current)}
          title={showCompass ? "Ocultar brujula" : "Mostrar brujula"}
          aria-pressed={showCompass}
        >
          <Compass aria-hidden="true" size={15} />
          <span>{showCompass ? "Brujula visible" : "Brujula oculta"}</span>
        </button>
      </div>
    </main>
  );
}
