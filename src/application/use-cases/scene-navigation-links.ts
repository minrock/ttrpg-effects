import type { SceneFileStorage } from "../services/scene-file-storage";
import type { MapAnnotations } from "../../domain/annotations/map-annotations";
import {
  createReciprocalSceneLinkMarkers,
  disconnectSceneLinkMarker,
  getSceneLinkPeer,
  replaceSceneLinkMarker,
  validateReciprocalSceneLink,
  type ConnectSceneLinkRequest,
  type DisconnectSceneLinkRequest,
  type LoadSceneLinkTargetRequest,
  type MapSceneLinkMarker,
  type SceneLinkCandidateFile,
  type SceneLinkValidationStatus,
  type ValidateSceneLinksRequest
} from "../../domain/annotations/scene-navigation-links";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import { parseSceneJson, serializeSceneDocument } from "../../domain/sessions/scene-schema";
import { loadSceneUseCase } from "./load-scene";

export type SceneLinkMutationResult =
  | { readonly ok: true; readonly mapAnnotations: MapAnnotations; readonly warning?: string }
  | { readonly ok: false; readonly error: string };

export type SceneLinkCandidateResult =
  | { readonly ok: true; readonly candidate: SceneLinkCandidateFile }
  | { readonly ok: false; readonly error: string };

export type SceneLinkValidationResult =
  | { readonly ok: true; readonly statuses: Readonly<Record<string, SceneLinkValidationStatus>> }
  | { readonly ok: false; readonly error: string };

export type SceneLinkNavigationResult =
  | {
      readonly ok: true;
      readonly sceneResult: Extract<SceneOperationResult, { readonly ok: true }>;
      readonly entryPoint: { readonly x: number; readonly y: number };
    }
  | { readonly ok: false; readonly error: string };

export async function selectSceneLinkTargetFile(
  storage: SceneFileStorage
): Promise<{ readonly ok: true; readonly filePath: string | null } | { readonly ok: false; readonly error: string }> {
  if (storage.selectSceneJsonPath === undefined) {
    return { ok: false, error: "El selector de escenas no esta disponible." };
  }
  try {
    return { ok: true, filePath: await storage.selectSceneJsonPath() };
  } catch (error) {
    return failure(error, "No se pudo seleccionar la escena destino.");
  }
}

export async function listSceneLinkCandidates(
  storage: SceneFileStorage,
  filePath: string
): Promise<SceneLinkCandidateResult> {
  try {
    const scene = await readScene(storage, filePath);
    return {
      ok: true,
      candidate: {
        filePath,
        markers: scene.mapAnnotations.sceneLinks.map((marker) => ({
          id: marker.id,
          name: marker.name,
          position: marker.position,
          available: marker.connection === null
        }))
      }
    };
  } catch (error) {
    return failure(error, "No se pudieron leer las conexiones de la escena destino.");
  }
}

export async function connectSceneLink(
  storage: SceneFileStorage,
  request: ConnectSceneLinkRequest
): Promise<SceneLinkMutationResult> {
  if (request.sourceScenePath === request.targetScenePath) {
    return { ok: false, error: "La conexion debe apuntar a otra escena." };
  }
  if (storage.replaceSceneJsonFiles === undefined) {
    return { ok: false, error: "La escritura reciproca de escenas no esta disponible." };
  }

  try {
    const sourceScene = await readScene(storage, request.sourceScenePath);
    const targetScene = await readScene(storage, request.targetScenePath);
    const sourceMarker = findMarker(sourceScene, request.sourceMarkerId);
    const targetMarker = findMarker(targetScene, request.targetMarkerId);
    if (sourceMarker.locked || targetMarker.locked) {
      return { ok: false, error: "No se puede conectar un marcador bloqueado." };
    }
    if (targetMarker.connection !== null && targetMarker.connection.peer.markerId !== sourceMarker.id) {
      return { ok: false, error: "El marcador destino ya pertenece a otra conexion." };
    }

    let oldRemoteUpdate: { readonly filePath: string; readonly scene: SceneDocument } | null = null;
    let warning: string | undefined;
    const oldPeer = getSceneLinkPeer(sourceMarker);
    if (
      oldPeer !== null &&
      (oldPeer.scenePath !== request.targetScenePath || oldPeer.markerId !== request.targetMarkerId)
    ) {
      try {
        const oldRemoteScene = await readScene(storage, oldPeer.scenePath);
        const oldRemoteMarker = findMarker(oldRemoteScene, oldPeer.markerId);
        oldRemoteUpdate = {
          filePath: oldPeer.scenePath,
          scene: replaceMarkerInScene(oldRemoteScene, disconnectSceneLinkMarker(oldRemoteMarker))
        };
      } catch {
        warning = "No fue posible limpiar el extremo anterior; quedara marcado como roto en esa escena.";
      }
    }

    const [connectedSource, connectedTarget] = createReciprocalSceneLinkMarkers(
      sourceMarker,
      request.sourceScenePath,
      targetMarker,
      request.targetScenePath,
      globalThis.crypto.randomUUID()
    );
    const nextSource = replaceMarkerInScene(sourceScene, connectedSource);
    const nextTarget = replaceMarkerInScene(targetScene, connectedTarget);

    await storage.replaceSceneJsonFiles([
      { filePath: request.sourceScenePath, json: serializeSceneDocument(nextSource) },
      { filePath: request.targetScenePath, json: serializeSceneDocument(nextTarget) },
      ...(oldRemoteUpdate === null || oldRemoteUpdate.filePath === request.targetScenePath
        ? []
        : [{ filePath: oldRemoteUpdate.filePath, json: serializeSceneDocument(oldRemoteUpdate.scene) }])
    ]);
    return { ok: true, mapAnnotations: nextSource.mapAnnotations, warning };
  } catch (error) {
    return failure(error, "No se pudo crear la conexion reciproca.");
  }
}

export async function disconnectSceneLink(
  storage: SceneFileStorage,
  request: DisconnectSceneLinkRequest
): Promise<SceneLinkMutationResult> {
  if (storage.replaceSceneJsonFiles === undefined) {
    return { ok: false, error: "La escritura de escenas no esta disponible." };
  }

  try {
    const localScene = await readScene(storage, request.scenePath);
    const localMarker = findMarker(localScene, request.markerId);
    if (localMarker.locked) return { ok: false, error: "El marcador esta bloqueado." };
    const peer = getSceneLinkPeer(localMarker);
    const nextLocal = replaceMarkerInScene(localScene, disconnectSceneLinkMarker(localMarker));

    if (peer === null) {
      await storage.replaceSceneJsonFiles([
        { filePath: request.scenePath, json: serializeSceneDocument(nextLocal) }
      ]);
      return { ok: true, mapAnnotations: nextLocal.mapAnnotations };
    }

    try {
      const remoteScene = await readScene(storage, peer.scenePath);
      const remoteMarker = findMarker(remoteScene, peer.markerId);
      const nextRemote = replaceMarkerInScene(remoteScene, disconnectSceneLinkMarker(remoteMarker));
      await storage.replaceSceneJsonFiles([
        { filePath: request.scenePath, json: serializeSceneDocument(nextLocal) },
        { filePath: peer.scenePath, json: serializeSceneDocument(nextRemote) }
      ]);
      return { ok: true, mapAnnotations: nextLocal.mapAnnotations };
    } catch {
      await storage.replaceSceneJsonFiles([
        { filePath: request.scenePath, json: serializeSceneDocument(nextLocal) }
      ]);
      return {
        ok: true,
        mapAnnotations: nextLocal.mapAnnotations,
        warning: "La conexion local se elimino, pero no fue posible limpiar el archivo remoto."
      };
    }
  } catch (error) {
    return failure(error, "No se pudo desconectar el marcador.");
  }
}

export async function validateSceneLinks(
  storage: SceneFileStorage,
  request: ValidateSceneLinksRequest
): Promise<SceneLinkValidationResult> {
  try {
    const cache = new Map<string, Promise<SceneDocument>>();
    const statuses = await mapWithConcurrency(request.markers, 4, async (marker) => {
      if (marker.connection === null) {
        return [marker.id, { state: "unlinked" } satisfies SceneLinkValidationStatus] as const;
      }
      const peer = marker.connection.peer;
      try {
        const remoteScenePromise = cache.get(peer.scenePath) ?? readScene(storage, peer.scenePath);
        cache.set(peer.scenePath, remoteScenePromise);
        const remoteScene = await remoteScenePromise;
        const remote = remoteScene.mapAnnotations.sceneLinks.find((candidate) => candidate.id === peer.markerId);
        if (remote === undefined) {
          return [marker.id, broken("marker-missing", "El punto conectado ya no existe.")] as const;
        }
        return [
          marker.id,
          validateReciprocalSceneLink(marker, request.scenePath, remote, peer.scenePath)
            ? { state: "valid" } satisfies SceneLinkValidationStatus
            : broken("connection-mismatch", "La conexion reciproca no coincide.")
        ] as const;
      } catch (error) {
        const exists = await storage.fileExists(peer.scenePath);
        return [
          marker.id,
          exists
            ? broken("scene-invalid", error instanceof Error ? error.message : "La escena conectada es invalida.")
            : broken("file-missing", "El archivo de escena conectado ya no existe.")
        ] as const;
      }
    });
    return { ok: true, statuses: Object.fromEntries(statuses) };
  } catch (error) {
    return failure(error, "No se pudieron validar las conexiones.");
  }
}

export async function loadSceneLinkTarget(
  storage: SceneFileStorage,
  request: LoadSceneLinkTargetRequest
): Promise<SceneLinkNavigationResult> {
  try {
    const sourceScene = await readScene(storage, request.scenePath);
    const sourceMarker = findMarker(sourceScene, request.markerId);
    const peer = getSceneLinkPeer(sourceMarker);
    if (peer === null) return { ok: false, error: "El marcador aun no tiene una conexion." };
    const remoteScene = await readScene(storage, peer.scenePath);
    const remoteMarker = findMarker(remoteScene, peer.markerId);
    if (!validateReciprocalSceneLink(sourceMarker, request.scenePath, remoteMarker, peer.scenePath)) {
      return { ok: false, error: "La conexion reciproca ya no es valida." };
    }
    const sceneResult = await loadSceneUseCase(storage, { filePath: peer.scenePath });
    if (!sceneResult.ok) return sceneResult;
    return { ok: true, sceneResult, entryPoint: remoteMarker.position };
  } catch (error) {
    return failure(error, "No se pudo abrir la escena conectada.");
  }
}

async function readScene(storage: SceneFileStorage, filePath: string): Promise<SceneDocument> {
  if (storage.loadSceneJsonFromPath === undefined) {
    throw new Error("La lectura directa de escenas no esta disponible.");
  }
  const loaded = await storage.loadSceneJsonFromPath(filePath);
  return parseSceneJson(loaded.json);
}

function findMarker(scene: SceneDocument, markerId: string): MapSceneLinkMarker {
  const marker = scene.mapAnnotations.sceneLinks.find((candidate) => candidate.id === markerId);
  if (marker === undefined) throw new Error("El marcador de conexion ya no existe.");
  return marker;
}

function replaceMarkerInScene(scene: SceneDocument, marker: MapSceneLinkMarker): SceneDocument {
  return {
    ...scene,
    mapAnnotations: {
      ...scene.mapAnnotations,
      sceneLinks: replaceSceneLinkMarker(scene.mapAnnotations.sceneLinks, marker)
    }
  };
}

function broken(
  reason: Extract<SceneLinkValidationStatus, { readonly state: "broken" }>["reason"],
  message: string
): SceneLinkValidationStatus {
  return { state: "broken", reason, message };
}

function failure(error: unknown, fallback: string): { readonly ok: false; readonly error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  work: (value: T) => Promise<R>
): Promise<readonly R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value !== undefined) results[index] = await work(value);
    }
  });
  await Promise.all(workers);
  return results;
}
