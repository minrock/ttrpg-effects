import { useEffect, useRef, useState } from "react";
import type { AnnotationView } from "../../../../shared/contracts/shared-annotations";
import { useTtrpgClient } from "../../client/ClientProvider";
import { MapViewport } from "../MapViewport";
const noop = () => {};
/** Vista independiente: no navega, publica, descarta ni modifica el borrador del DM. */
export function PublishedDrawingPreview({ view, close }: { view: AnnotationView; close(): void }) {
  const dialog = useRef<HTMLDialogElement>(null), api = useTtrpgClient()?.api;
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const snapshot = view.snapshot, scene = snapshot?.scene;
  useEffect(() => { const previous = document.activeElement; dialog.current?.showModal(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  const references = JSON.stringify([scene?.map.imagePath, ...(scene?.tokens.map(t => t.imagePath) ?? [])]);
  useEffect(() => {
    let active = true;
    const paths: (string | null)[] = JSON.parse(references);
    const unique = [...new Set(paths.filter((p): p is string => !!p))];
    void (async () => {
      const next: Record<string, string | null> = {};
      for (let offset = 0; active && offset < unique.length; offset += 4) {
        const entries = await Promise.all(unique.slice(offset, offset + 4).map(async path => {
          try { return [path, await api?.resolveMapUrl(path) ?? null] as const; } catch { return [path, null] as const; }
        }));
        Object.assign(next, Object.fromEntries(entries)); if (active) setUrls({ ...next });
      }
    })();
    return () => { active = false; };
  }, [api, references]);
  useEffect(() => { if (!view.connected || !snapshot) close(); }, [view.connected, snapshot, close]);
  return <dialog ref={dialog} className="shared-drawings-preview" aria-label="Mapa publicado" onCancel={event => { event.preventDefault(); close(); }}>
    <header><span>Mapa publicado · tu borrador permanece abierto</span><button autoFocus onClick={close}>Cerrar vista</button></header>
    {scene && snapshot && <div className="shared-drawings-preview__map"><MapViewport
      map={scene.map.imagePath ? { ...scene.map, imageUrl: urls[scene.map.imagePath] ?? null } : null}
      grid={scene.grid} settings={scene.settings} darkness={scene.darkness} fogOfWar={scene.fogOfWar}
      elements={[]} shapes={scene.shapes} sharedAnnotations={view.state?.items} lights={scene.lights} effects={scene.effects}
      tokens={scene.tokens.map(t => ({ ...t, imageUrl: urls[t.imagePath] ?? null }))} labels={[]} mapAnnotations={scene.mapAnnotations}
      compassOrientation={scene.compassOrientation} backgroundColor={scene.backgroundColor} daytimeFilter={scene.daytimeFilter} daytimeMask={scene.daytimeMask}
      showMapAnnotations={false} selectedElementId={null} isZoomLocked={false} isMapAdjustMode={false} isGridAdjustMode={false} isGrabMode={false}
      viewRole="player" isReadOnly isNavigationEnabled fogPresentation="player-blocking" hiddenTokenPolicy="hide" cameraSnapshot={snapshot.camera}
      isFogRevealMode={false} isFirePaintMode={false} isPathDrawingMode={false} isWaterDrawingMode={false} isArcanePointerMode={false} isRoomPinMode={false} isInformationAreaMode={false}
      arcanePointerCreatureSize="medium" arcanePointerResetKey={0} informationAreaHighlightResetKey={0}
      pathPreviewPoints={[]} pathPreviewHoverPoint={null} waterPreviewPoints={[]} waterPreviewHoverPoint={null}
      onContextMenuRequest={noop} onElementSelect={noop} onGridCellSizeChange={noop} onMapRenderError={noop} onMapRendered={noop}
      onMapPositionChange={noop} onElementMove={noop} onLightDirectionChange={noop} onLightRadiusChange={noop} onShapeEndMove={noop}
      onPathPointAdd={noop} onPathPointerMove={noop} onWaterPointAdd={noop} onWaterPointerMove={noop} onPathPointMove={noop} onPathMove={noop}
      onShapeDirectionChange={noop} onShapeRadiusChange={noop} onShapeRectResize={noop} onFogRevealStroke={noop} onFirePaint={noop}
      onFireZoneRadiusChange={noop} onFireLightRadiusChange={noop} onMagicalDarknessRadiusChange={noop} onWaterLineRotationChange={noop}
      onWaterPatternRotationChange={noop} onRoomPinPlace={noop} onInformationAreaPaint={noop} onInformationAreaHighlight={noop} onMapAnnotationPreview={noop}
    /></div>}
  </dialog>;
}
