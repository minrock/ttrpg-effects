import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { getTokensForRole, normalizeCameraSnapshot, type ArcanePointerBroadcast, type PlayerWindowSnapshot, type ViewportCameraSnapshot } from "../../domain/player/player-window";
import { sortTokensByOrder } from "../../domain/tokens/tokens";
import type { SceneDocument } from "../../domain/sessions/scene-document";
import type { MapImageState } from "../../domain/map/map-image";
import { MapViewport } from "./components/MapViewport";

export function PlayerApp(): JSX.Element {
  const [scene, setScene] = useState<SceneDocument>(() => createDefaultScene());
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [tokenImageUrls, setTokenImageUrls] = useState<Readonly<Record<string, string>>>({});
  const [camera, setCamera] = useState<ViewportCameraSnapshot>(() =>
    normalizeCameraSnapshot({ center: { x: 0, y: 0 }, zoom: 1 })
  );
  const hasInitializedCameraRef = useRef(false);
  const cameraSyncKeyRef = useRef<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isZoomLocked, setIsZoomLocked] = useState(true);
  const [arcanePointerEvent, setArcanePointerEvent] = useState<ArcanePointerBroadcast | null>(null);

  const applySnapshot = useCallback((snapshot: PlayerWindowSnapshot | null): void => {
    if (snapshot === null) {
      return;
    }

    setScene(snapshot.scene);
    setMapImageUrl(snapshot.mapImageUrl);
    setTokenImageUrls(snapshot.tokenImageUrls);
    setIsHydrated(true);
    const nextCameraSyncKey = snapshot.cameraSyncKey ?? 0;
    if (!hasInitializedCameraRef.current || cameraSyncKeyRef.current !== nextCameraSyncKey) {
      setCamera(normalizeCameraSnapshot(snapshot.camera));
      hasInitializedCameraRef.current = true;
      cameraSyncKeyRef.current = nextCameraSyncKey;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
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

    void window.ttrpg?.getPlayerWindowState().then((state) => {
      if (!mounted) {
        return;
      }

      applySnapshot(state.snapshot);
      if (!hasInitializedCameraRef.current && state.camera !== null) {
        setCamera(normalizeCameraSnapshot(state.camera));
        hasInitializedCameraRef.current = true;
      }
    });

    return () => {
      mounted = false;
      offScene?.();
      offPointer?.();
    };
  }, [applySnapshot]);

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
          arcanePointerCreatureSize="medium"
          arcanePointerResetKey={0}
          arcanePointerEvent={arcanePointerEvent}
          pathPreviewPoints={[]}
          pathPreviewHoverPoint={null}
          waterPreviewPoints={[]}
          waterPreviewHoverPoint={null}
          onContextMenuRequest={noop}
          onElementSelect={noop}
          onGridCellSizeChange={noop}
          onMapRenderError={noop}
          onMapRendered={noop}
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
        />
      ) : null}
      <button
        className={`player-zoom-lock${isZoomLocked ? " is-locked" : ""}`}
        type="button"
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsZoomLocked((current) => !current)}
      >
        {isZoomLocked ? "Zoom bloqueado" : "Zoom desbloqueado"}
      </button>
    </main>
  );
}
