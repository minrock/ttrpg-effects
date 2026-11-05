import { sceneDocumentV1Schema } from "../../domain/sessions/scene-schema";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { SceneMapDocument, SceneDocument } from "../../domain/sessions/scene-document";
import type { PlayerWindowSnapshot } from "../../domain/player/player-window";
import { getPlayerVisibleSceneCounters } from "../../domain/counters/scene-counters";
import { assetUrl } from "../../shared/contracts/service-references";

/** Frontera de privacidad de red: los esquemas hoja eliminan propiedades desconocidas; nunca se copian ramas privadas. */
export function publicTableProjection(input: PlayerWindowSnapshot, urlForAsset = assetUrl): { snapshot: PlayerWindowSnapshot; assets: Set<string> } {
  const assets = new Set<string>();
  const reference = (value: string | null): string | null => {
    if (!value || !assetUrl(value)) return null;
    assets.add(value); return value;
  };
  const source = input.scene;
  const active = source.maps.find(map => map.id === source.activeMapId);
  const base = active ?? createDefaultScene();
  const leaf = sceneDocumentV1Schema.shape;
  const map: SceneMapDocument = {
    id: active?.id ?? "", name: "Mapa", compassOrientation: base.compassOrientation,
    backgroundColor: base.backgroundColor, daytimeMask: structuredClone(base.daytimeMask),
    map: { position: { x: base.map.position.x, y: base.map.position.y }, scale: base.map.scale,
      ...(base.map.imageSize ? { imageSize: { width: base.map.imageSize.width, height: base.map.imageSize.height } } : {}), imagePath: reference(base.map.imagePath) },
    camera: { x: input.camera.center.x, y: input.camera.center.y, zoom: input.camera.zoom },
    grid: leaf.grid.parse(base.grid), darkness: leaf.darkness.parse(base.darkness),
    fogOfWar: leaf.fogOfWar.parse(base.fogOfWar), settings: leaf.settings.parse(base.settings),
    lights: leaf.lights.parse(base.lights.filter(item => item.visible)),
    effects: leaf.effects.parse(base.effects.filter(item => item.visible)).map(effect => effect.kind === "lightning" ? { ...effect, showGuide: false } : effect),
    shapes: leaf.shapes.parse(base.shapes),
    tokens: leaf.tokens.parse(base.tokens.filter(item => item.visible)).map(token => ({ ...token, imagePath: reference(token.imagePath) ?? "missing-public-image" })),
    labels: [], mapAnnotations: { pins: [], areas: [], sceneLinks: [] }
  };
  const scene: SceneDocument = {
    ...map, version: 2, activeMapId: active?.id ?? null, maps: active ? [map] : [],
    daytimeFilter: structuredClone(source.daytimeFilter),
    sceneAside: {
      monsters: source.sceneAside.monsters.filter(m => m.visibleToPlayer && m.imagePath !== null).map(m => ({ id: m.id, name: m.name, imagePath: reference(m.imagePath), visibleToPlayer: true, notes: "" })),
      npcs: source.sceneAside.npcs.filter(m => m.visibleToPlayer).map(m => ({ id: m.id, name: m.name, imagePath: reference(m.imagePath), visibleToPlayer: true, notes: "" })),
      playerCharacters: [], notes: []
    },
    combatTracker: source.combatTracker.active ? {
      active: true, currentParticipantId: source.combatTracker.currentParticipantId, round: source.combatTracker.round,
      participants: source.combatTracker.participants.map(p => ({ id: p.id, entityType: p.entityType, entityId: p.id, name: p.name, imagePath: reference(p.imagePath), initiative: p.initiative, defeated: p.defeated, enteredRound: p.enteredRound, activeFromRound: p.activeFromRound }))
    } : { active: false, participants: [], currentParticipantId: null, round: 0 },
    counters: getPlayerVisibleSceneCounters(source.counters).map(c => ({ id: c.id, label: c.isLabelVisibleToPlayers ? c.label : "Contador", mode: c.mode, kind: c.kind, value: c.value, ...(c.kind === "fixed" ? { capacity: c.capacity } : {}), isVisibleToPlayers: true, isLabelVisibleToPlayers: c.isLabelVisibleToPlayers }))
  };
  return { assets, snapshot: {
    scene, camera: { center: { ...input.camera.center }, zoom: input.camera.zoom },
    mapImageUrl: map.map.imagePath ? urlForAsset(map.map.imagePath) : null,
    tokenImageUrls: Object.fromEntries(map.tokens.flatMap(t => { const url = urlForAsset(t.imagePath); return url ? [[t.id, url]] : []; })),
    showDmFogOverlay: false, showZoomIndicator: input.showZoomIndicator ?? false,
    ...(input.mapNavigationKey !== undefined ? { mapNavigationKey: input.mapNavigationKey } : {}),
    ...(input.playerEntryPoint ? { playerEntryPoint: input.playerEntryPoint } : {}),
    cameraSyncKey: input.cameraSyncKey ?? 0, informationAreaHighlightResetKey: input.informationAreaHighlightResetKey ?? 0
  } };
}
