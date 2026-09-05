import { basename, dirname, isAbsolute, resolve } from "node:path";
import type { SceneFileStorage } from "../services/scene-file-storage";
import type { SceneLinkConnection, SceneLinkEndpointReference } from "../../domain/annotations/scene-navigation-links";
import type { SceneDocument, SceneMapDocument, SceneWarning } from "../../domain/sessions/scene-document";
import { SCENE_DOCUMENT_VERSION } from "../../domain/sessions/scene-document";
import { parseSceneJson } from "../../domain/sessions/scene-schema";
import {
  createEmptyScene,
  getActiveSceneMap,
  syncRuntimeFieldsFromActiveMap
} from "../../domain/sessions/scene-maps";
import type { SceneAside } from "../../domain/sessions/scene-aside";

const MAX_LINKED_LEGACY_SCENES = 50;

export interface LoadedLinkedLegacyScene {
  readonly scene: SceneDocument;
  readonly warnings: readonly SceneWarning[];
  readonly mapImageUrls: Readonly<Record<string, string>>;
  readonly tokenImageUrls: Readonly<Record<string, string>>;
}

interface LoadedFile {
  readonly filePath: string;
  readonly rawJson: unknown;
  readonly scene: SceneDocument;
}

export async function loadLinkedLegacySceneGraph(
  storage: SceneFileStorage,
  rootFile: { readonly filePath: string; readonly json: string }
): Promise<LoadedLinkedLegacyScene> {
  const rootRawJson = parseRawJson(rootFile.json);
  const rootScene = parseSceneJson(rootFile.json);
  if (isCurrentSceneFormat(rootRawJson)) {
    return hydrateSceneAssets(storage, rootScene);
  }

  const loadedFiles = await collectLinkedLegacyFiles(storage, {
    filePath: normalizeScenePath(rootFile.filePath),
    rawJson: rootRawJson,
    scene: rootScene
  });
  const pathToMapId = new Map<string, string>();
  const maps = loadedFiles.flatMap((file, index) => {
    const sourceMap = getActiveSceneMap(file.scene) ?? file.scene.maps[0] ?? null;
    if (sourceMap === null) return [];
    const mapId = `map-${index + 1}`;
    pathToMapId.set(file.filePath, mapId);
    return [{
      ...sourceMap,
      id: mapId,
      name: sourceMap.name.trim() === "" || sourceMap.name === "Mapa 1"
        ? mapNameFromPath(file.filePath, index)
        : sourceMap.name
    }];
  });

  const mapsWithInternalLinks = maps.map((map, index) =>
    rewriteMapLinksToInternalTargets(map, loadedFiles[index]?.filePath ?? rootFile.filePath, rootFile.filePath, pathToMapId)
  );
  const scene = syncRuntimeFieldsFromActiveMap({
    ...createEmptyScene(),
    maps: mapsWithInternalLinks,
    activeMapId: mapsWithInternalLinks[0]?.id ?? null,
    sceneAside: mergeSceneAsides(loadedFiles.map((file) => file.scene.sceneAside)),
    combatTracker: rootScene.combatTracker
  });

  return hydrateSceneAssets(storage, scene);
}

async function collectLinkedLegacyFiles(
  storage: SceneFileStorage,
  root: LoadedFile
): Promise<readonly LoadedFile[]> {
  if (storage.loadSceneJsonFromPath === undefined) return [root];

  const loadedFiles: LoadedFile[] = [];
  const queued = [root];
  const visited = new Set<string>();

  while (queued.length > 0 && loadedFiles.length < MAX_LINKED_LEGACY_SCENES) {
    const file = queued.shift();
    if (file === undefined || visited.has(file.filePath)) continue;
    visited.add(file.filePath);
    loadedFiles.push(file);

    for (const linkedPath of getLinkedScenePaths(file)) {
      const normalizedPath = normalizeScenePath(resolveScenePath(file.filePath, linkedPath));
      if (visited.has(normalizedPath) || queued.some((candidate) => candidate.filePath === normalizedPath)) continue;

      try {
        const loaded = await storage.loadSceneJsonFromPath(normalizedPath);
        const rawJson = parseRawJson(loaded.json);
        queued.push({
          filePath: normalizeScenePath(loaded.filePath),
          rawJson,
          scene: parseSceneJson(loaded.json)
        });
      } catch {
        // Broken links stay as legacy external links; the scene still opens.
      }
    }
  }

  return loadedFiles;
}

function getLinkedScenePaths(file: LoadedFile): readonly string[] {
  if (isCurrentSceneFormat(file.rawJson)) return [];
  const markers = file.scene.mapAnnotations.sceneLinks;
  return markers.flatMap((marker) => {
    if (marker.connection === null) return [];
    return [
      marker.connection.origin.scenePath,
      marker.connection.destination.scenePath,
      marker.connection.peer.scenePath
    ];
  });
}

function rewriteMapLinksToInternalTargets(
  map: SceneMapDocument,
  sourceFilePath: string,
  rootFilePath: string,
  pathToMapId: ReadonlyMap<string, string>
): SceneMapDocument {
  return {
    ...map,
    mapAnnotations: {
      ...map.mapAnnotations,
      sceneLinks: map.mapAnnotations.sceneLinks.map((marker) =>
        marker.connection === null
          ? marker
          : { ...marker, connection: rewriteConnection(marker.connection, sourceFilePath, rootFilePath, pathToMapId) }
      )
    }
  };
}

function rewriteConnection(
  connection: SceneLinkConnection,
  sourceFilePath: string,
  rootFilePath: string,
  pathToMapId: ReadonlyMap<string, string>
): SceneLinkConnection {
  return {
    ...connection,
    origin: rewriteEndpoint(connection.origin, sourceFilePath, rootFilePath, pathToMapId),
    destination: rewriteEndpoint(connection.destination, sourceFilePath, rootFilePath, pathToMapId),
    peer: rewriteEndpoint(connection.peer, sourceFilePath, rootFilePath, pathToMapId)
  };
}

function rewriteEndpoint(
  endpoint: SceneLinkEndpointReference,
  sourceFilePath: string,
  rootFilePath: string,
  pathToMapId: ReadonlyMap<string, string>
): SceneLinkEndpointReference {
  const normalizedPath = normalizeScenePath(resolveScenePath(sourceFilePath, endpoint.scenePath));
  const mapId = pathToMapId.get(normalizedPath);
  if (mapId === undefined) return endpoint;
  return {
    ...endpoint,
    scenePath: rootFilePath,
    mapId
  };
}

async function hydrateSceneAssets(
  storage: SceneFileStorage,
  scene: SceneDocument
): Promise<LoadedLinkedLegacyScene> {
  const warnings: SceneWarning[] = [];
  const mapImageUrls: Record<string, string> = {};

  for (const map of scene.maps) {
    const imagePath = map.map.imagePath;
    if (imagePath === null) continue;
    if (!(await storage.fileExists(imagePath))) {
      warnings.push({
        code: "map-image-missing",
        message: `La imagen local del mapa "${map.name}" no existe. La escena se cargo sin bloquear la app.`,
        path: imagePath
      });
      continue;
    }
    if (storage.getMapImageUrl !== undefined) {
      mapImageUrls[map.id] = await storage.getMapImageUrl(imagePath);
    }
  }

  const activeMapImageUrl = scene.map.imagePath === null ? undefined : mapImageUrls[scene.id];
  const tokenImageUrlEntries = await Promise.all(
    scene.tokens.map(async (token) => {
      if (storage.getTokenImageUrl === undefined || !(await storage.fileExists(token.imagePath))) return null;
      return [token.id, await storage.getTokenImageUrl(token.imagePath)] as const;
    })
  );

  return {
    scene,
    warnings,
    mapImageUrls,
    tokenImageUrls: Object.fromEntries(
      tokenImageUrlEntries.filter((entry): entry is readonly [string, string] => entry !== null)
    ),
    ...(activeMapImageUrl === undefined ? {} : { mapImageUrl: activeMapImageUrl })
  } as LoadedLinkedLegacyScene;
}

function mergeSceneAsides(asides: readonly SceneAside[]): SceneAside {
  return {
    monsters: mergeById(asides.flatMap((aside) => aside.monsters)),
    npcs: mergeById(asides.flatMap((aside) => aside.npcs)),
    playerCharacters: mergeById(asides.flatMap((aside) => aside.playerCharacters)),
    notes: mergeById(asides.flatMap((aside) => aside.notes))
  };
}

function mergeById<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  const used = new Set<string>();
  const merged: T[] = [];
  for (const item of items) {
    if (used.has(item.id)) continue;
    used.add(item.id);
    merged.push(item);
  }
  return merged;
}

function parseRawJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isCurrentSceneFormat(rawJson: unknown): boolean {
  return (
    typeof rawJson === "object" &&
    rawJson !== null &&
    (rawJson as { readonly version?: unknown }).version === SCENE_DOCUMENT_VERSION
  );
}

function resolveScenePath(sourceFilePath: string, linkedPath: string): string {
  return isAbsolute(linkedPath) ? linkedPath : resolve(dirname(sourceFilePath), linkedPath);
}

function normalizeScenePath(filePath: string): string {
  return resolve(filePath);
}

function mapNameFromPath(filePath: string, index: number): string {
  const name = basename(filePath).replace(/\.ttrpgscene$/i, "").trim();
  return name === "" ? `Mapa ${index + 1}` : name;
}
