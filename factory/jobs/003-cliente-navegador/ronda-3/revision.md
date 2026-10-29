# Identidad de la revisión

Rama autorizada: `feature/fabrica-software`. Sin commits ni merge.

Base Git: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. HEAD actual: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

Se revisa el código de esta spec sobre cambios anteriores no integrados; base-archivos.json identifica su punto de partida. huellas.json congela el contenido de código/config/docs al abrir esta ronda. Los informes de fábrica quedan fuera de las huellas.

## Archivos cambiados por esta spec

- `CHANGELOG.md`
- `docs/browser-client.md`
- `docs/client-architecture.md`
- `docs/private-api.md`
- `package.json`
- `src/application/services/map-image-storage.ts`
- `src/application/use-cases/compose-imported-scene-map.ts`
- `src/application/use-cases/import-scene-map.ts`
- `src/application/use-cases/prepare-map-image-replacement.ts`
- `src/domain/annotations/internal-scene-links.ts`
- `src/domain/sessions/scene-document.ts`
- `src/infrastructure/browser/browser-client.test.ts`
- `src/infrastructure/browser/browser-client.ts`
- `src/infrastructure/browser/files.test.ts`
- `src/infrastructure/browser/files.ts`
- `src/infrastructure/browser/http.ts`
- `src/infrastructure/server/service-store.ts`
- `src/render/pixi/map-image-resource.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/App.workspace.test.tsx`
- `src/renderer/src/PlayerApp.tsx`
- `src/renderer/src/client/PortalTarget.tsx`
- `src/renderer/src/client/dialog-focus.ts`
- `src/renderer/src/components/annotations/SceneLinkModal.tsx`
- `src/renderer/src/components/aside/ImagePicker.tsx`
- `src/renderer/src/components/aside/ModalBackdrop.tsx`
- `src/renderer/src/components/aside/NoteEditor.tsx`
- `src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx`
- `src/renderer/src/components/aside/ReplaceMapImageModal.tsx`
- `src/renderer/src/components/aside/ServiceImageExtension.ts`
- `src/renderer/src/components/aside/markdown.ts`
- `src/renderer/src/components/aside/rich-text-extensions.ts`
- `src/renderer/src/components/dice/DicePanel.tsx`
- `src/renderer/src/components/workspace/WorkspaceHeader.tsx`
- `src/renderer/src/styles.css`
- `src/server/config.ts`
- `src/server/http.ts`
- `src/server/scene-links.ts`
- `src/server/scene-service.ts`
- `src/server/static-files.ts`
- `src/shared/api/client.ts`
- `src/shared/contracts/service-references.ts`
- `src/web/ServiceApp.test.tsx`
- `src/web/ServiceApp.tsx`
- `src/web/dialogs.tsx`
- `src/web/index.html`
- `src/web/main.tsx`
- `src/web/service.css`
- `src/web/vite.config.ts`
- `src/web/workspace.ts`

## Diff de archivos rastreados contra HEAD

Los archivos nuevos se inspeccionan directamente; sus huellas están registradas.

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index e01fd96..d5d2a40 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,45 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
+## [3.4.0] - 2026-10-28
+
+### Agregado — feature
+
+- Cliente navegador con el VTT existente, acceso DM/jugador, recuperación de sesión, protección de cambios y adaptador HTTP validado del mismo origen.
+- Guardar/cargar con selector, importar/exportar escenas, múltiples mapas, imágenes de mapas/tokens/notas, reemplazo de fondos, bibliotecas y plantillas persistentes.
+- Enlaces de escenas mediante referencias opacas y transacciones recíprocas; recuperación de imágenes y destinos locales no resolubles.
+- Desarrollo/build web independiente, estáticos confinados y CSP sin evaluación dinámica; pruebas HTTP/UI y humo navegador, Electron aislado y lab.
+- Frontera de sesión incluye portales y selectores pendientes; conexión/reparación de escenas accesible desde el VTT, foco restaurado y nombres largos identificables. Los cambios entre enlaces internos/remotos exigen desligar antes y el modal queda sobre la cabecera a 1024 px.
+- Proyección y dados compartidos se anuncian como pendientes; Electron local conserva su funcionamiento y el formato de escena continúa en versión 2.
+
+## [3.3.0] - 2026-10-28
+
+### Agregado
+
+- Servicio privado Node.js 24 con sesiones DM/jugador, validación de origen/host, límites y contratos HTTP documentados.
+- Escenas CRUD e importación/exportación v1/v2; assets privados con referencias opacas, recuperación de imágenes y almacenamiento SQLite consistente.
+- Bibliotecas y plantillas remotas, comandos de API y pruebas HTTP reales de autorización, persistencia y errores. Electron local conserva su funcionamiento.
+- Validación de escenas/plantillas al leer SQLite y decodificación acotada de imágenes antes de publicar assets; variantes no admitidas explican su conversión.
+
+## [3.2.0] - 2026-10-28
+
+### Agregado
+
+- Contratos compartidos de clientes y composición por raíz React con capacidades explícitas; DM, Player, bibliotecas, imágenes y dados aceptan clientes inyectados.
+- Mapa de paridad documentado para la futura migración al servicio privado, sin implementar transporte HTTP ni cambiar el formato de escenas.
+
+### Corregido
+
+- La información de versión del preload se deriva de `package.json`, también en el bundle sandboxed.
+
+## [3.1.0] - 2026-10-28
+
+### Agregado
+
+- Fábrica de software local para Codex: skill `factory`, siete roles en español, cola y expedientes Markdown; cuatro revisiones completas por ronda, correcciones con el mismo constructor y aprobación técnica separada de la autorización de Git.
+- Tablero HTML autónomo con sondeo del estado, tarjetas por etapa, historial de rondas y lector seguro de informes. Incluye una demostración explícita sin modificar el estado real.
+- Flujo integrado con las specs, pruebas pnpm, versionado y empaquetado DMG existentes. Sin cambios en el formato `.ttrpgscene` ni dependencias adicionales.
+
 ## [3.0.0] - 2026-10-28
 
 ### Changed
diff --git a/package.json b/package.json
index b79a0fa..dbefa0b 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.0.0",
+  "version": "3.4.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -11,12 +11,17 @@
     "dist:mac": "pnpm build && electron-builder --mac dmg",
     "lint": "eslint .",
     "test": "vitest run",
-    "typecheck": "tsc --noEmit"
+    "typecheck": "tsc --noEmit",
+    "build:api": "pnpm typecheck && vite build --config src/server/vite.config.ts",
+    "start:api": "node out/api/index.mjs",
+    "dev:api": "pnpm build:api && pnpm start:api",
+    "dev:web": "vite --config src/web/vite.config.ts",
+    "build:web": "pnpm typecheck && vite build --config src/web/vite.config.ts"
   },
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
     "productName": "TTRPG Effects",
-    "copyright": "Copyright © 2026 Luis Moncaris",
+    "copyright": "Copyright \u00a9 2026 Luis Moncaris",
     "directories": {
       "output": "dist"
     },
@@ -32,12 +37,18 @@
       {
         "from": "src/render/three/dice/vendor",
         "to": "licenses/dice-box-threejs",
-        "filter": ["LICENSE", "README.md"]
+        "filter": [
+          "LICENSE",
+          "README.md"
+        ]
       },
       {
         "from": "assets/dice/audio",
         "to": "licenses/kenney-casino-audio",
-        "filter": ["License.txt", "README.md"]
+        "filter": [
+          "License.txt",
+          "README.md"
+        ]
       }
     ],
     "mac": {
@@ -100,6 +111,7 @@
     "pixi.js": "^8.18.1",
     "react": "^19.0.0",
     "react-dom": "^19.0.0",
+    "sharp": "0.35.5",
     "three": "0.143.0",
     "tiptap-markdown": "^0.9.0",
     "zod": "^4.4.3"
diff --git a/src/application/services/map-image-storage.ts b/src/application/services/map-image-storage.ts
index 4a8762e..9c417f1 100644
--- a/src/application/services/map-image-storage.ts
+++ b/src/application/services/map-image-storage.ts
@@ -1,4 +1,5 @@
 import { z } from "zod";
+import { assetUrl } from "../../shared/contracts/service-references";
 
 export const mapImageReplacementResultSchema = z.discriminatedUnion("status", [
   z.object({
@@ -15,3 +16,8 @@ export type MapImageReplacementResult = z.infer<typeof mapImageReplacementResult
 export interface MapImageStorage {
   selectReplacementMapImage(): Promise<MapImageReplacementResult>;
 }
+
+export const browserMapImageReplacementResultSchema = z.union([
+  mapImageReplacementResultSchema,
+  z.object({ status: z.literal("ready"), imagePath: z.string(), imageUrl: z.string() }).refine(value => assetUrl(value.imagePath) === value.imageUrl && assetUrl(value.imagePath) !== null)
+]);
diff --git a/src/application/use-cases/import-scene-map.ts b/src/application/use-cases/import-scene-map.ts
index 2292385..d5ca168 100644
--- a/src/application/use-cases/import-scene-map.ts
+++ b/src/application/use-cases/import-scene-map.ts
@@ -1,13 +1,6 @@
 import type { SceneFileStorage } from "../services/scene-file-storage";
-import type { SceneDocument, SceneMapDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
-import type { SceneLinkEndpointReference } from "../../domain/annotations/scene-navigation-links";
-import {
-  getNextSceneMapId,
-  getNextSceneMapName,
-  setActiveSceneMap,
-  syncActiveMapFromRuntimeFields
-} from "../../domain/sessions/scene-maps";
-import type { SceneAside } from "../../domain/sessions/scene-aside";
+import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
+import { composeImportedSceneMap } from "./compose-imported-scene-map";
 import { loadLinkedLegacySceneGraph } from "./linked-legacy-scenes";
 
 export async function importSceneMapUseCase(
@@ -28,49 +21,8 @@ export async function importSceneMapUseCase(
       return { ok: false, error: "El archivo importado no contiene un mapa valido." };
     }
 
-    const baseScene = syncActiveMapFromRuntimeFields(currentScene);
-    const idMap = new Map<string, string>();
-    let sceneWithMaps = {
-      ...baseScene,
-      sceneAside: mergeSceneAside(baseScene.sceneAside, imported.scene.sceneAside)
-    };
-
-    for (const sourceMap of imported.scene.maps) {
-      const nextId = getNextSceneMapId(sceneWithMaps);
-      idMap.set(sourceMap.id, nextId);
-      sceneWithMaps = {
-        ...sceneWithMaps,
-        maps: [
-          ...sceneWithMaps.maps,
-          {
-            ...sourceMap,
-            id: nextId,
-            name: getNextSceneMapName(sceneWithMaps)
-          }
-        ],
-        activeMapId: sceneWithMaps.activeMapId ?? nextId
-      };
-    }
-
-    const importedMapIds = new Set(idMap.values());
-    const remappedMaps = sceneWithMaps.maps.map((map) =>
-      importedMapIds.has(map.id) ? remapImportedMapInternalLinks(map, idMap) : map
-    );
-    const firstImportedMapId = idMap.get(imported.scene.maps[0]?.id ?? "");
-    const activeScene =
-      firstImportedMapId === undefined
-        ? sceneWithMaps
-        : setActiveSceneMap({ ...sceneWithMaps, maps: remappedMaps }, firstImportedMapId);
-    const activeMapImageUrl = imported.mapImageUrls[imported.scene.maps[0]?.id ?? ""];
+    return composeImportedSceneMap(currentScene, imported, filePath);
 
-    return {
-      ok: true,
-      scene: activeScene,
-      filePath,
-      mapImageUrl: activeMapImageUrl,
-      tokenImageUrls: imported.tokenImageUrls,
-      warnings: imported.warnings
-    };
   } catch (error) {
     return {
       ok: false,
@@ -78,57 +30,3 @@ export async function importSceneMapUseCase(
     };
   }
 }
-
-function remapImportedMapInternalLinks(
-  map: SceneMapDocument,
-  idMap: ReadonlyMap<string, string>
-): SceneMapDocument {
-  return {
-    ...map,
-    mapAnnotations: {
-      ...map.mapAnnotations,
-      sceneLinks: map.mapAnnotations.sceneLinks.map((marker) =>
-        marker.connection === null
-          ? marker
-          : {
-              ...marker,
-              connection: {
-                ...marker.connection,
-                origin: remapEndpoint(marker.connection.origin, idMap),
-                destination: remapEndpoint(marker.connection.destination, idMap),
-                peer: remapEndpoint(marker.connection.peer, idMap)
-              }
-            }
-      )
-    }
-  };
-}
-
-function remapEndpoint(
-  endpoint: SceneLinkEndpointReference,
-  idMap: ReadonlyMap<string, string>
-): SceneLinkEndpointReference {
-  return endpoint.mapId === undefined
-    ? endpoint
-    : { ...endpoint, mapId: idMap.get(endpoint.mapId) ?? endpoint.mapId };
-}
-
-function mergeSceneAside(base: SceneAside, imported: SceneAside): SceneAside {
-  return {
-    monsters: mergeById(base.monsters, imported.monsters),
-    npcs: mergeById(base.npcs, imported.npcs),
-    playerCharacters: mergeById(base.playerCharacters, imported.playerCharacters),
-    notes: mergeById(base.notes, imported.notes)
-  };
-}
-
-function mergeById<T extends { readonly id: string }>(base: readonly T[], imported: readonly T[]): readonly T[] {
-  const used = new Set(base.map((item) => item.id));
-  const merged = [...base];
-  for (const item of imported) {
-    if (used.has(item.id)) continue;
-    used.add(item.id);
-    merged.push(item);
-  }
-  return merged;
-}
diff --git a/src/application/use-cases/prepare-map-image-replacement.ts b/src/application/use-cases/prepare-map-image-replacement.ts
index 18d57ad..1eadf9d 100644
--- a/src/application/use-cases/prepare-map-image-replacement.ts
+++ b/src/application/use-cases/prepare-map-image-replacement.ts
@@ -1,5 +1,5 @@
 import {
-  mapImageReplacementResultSchema,
+  browserMapImageReplacementResultSchema,
   type MapImageReplacementResult,
   type MapImageStorage
 } from "../services/map-image-storage";
@@ -8,7 +8,7 @@ export async function prepareMapImageReplacementUseCase(
   storage: MapImageStorage
 ): Promise<MapImageReplacementResult> {
   try {
-    return mapImageReplacementResultSchema.parse(await storage.selectReplacementMapImage());
+    return browserMapImageReplacementResultSchema.parse(await storage.selectReplacementMapImage());
   } catch {
     return { status: "error", error: "No se pudo preparar la imagen del mapa." };
   }
diff --git a/src/domain/annotations/internal-scene-links.ts b/src/domain/annotations/internal-scene-links.ts
index a0c4ee5..3d2ca7d 100644
--- a/src/domain/annotations/internal-scene-links.ts
+++ b/src/domain/annotations/internal-scene-links.ts
@@ -55,6 +55,9 @@ export function connectInternalSceneLink(
   const sourceMarker = findMarker(sourceMap, request.sourceMarkerId);
   const targetMarker = findMarker(targetMap, request.targetMarkerId);
 
+  if ([sourceMarker, targetMarker].some((marker) => marker.connection !== null && marker.connection.peer.mapId === undefined)) {
+    throw new Error("Usa Desligar para liberar la conexión con otra escena antes de conectar mapas internos.");
+  }
   if (sourceMarker.locked || targetMarker.locked) {
     throw new Error("No se puede conectar un marcador bloqueado.");
   }
diff --git a/src/domain/sessions/scene-document.ts b/src/domain/sessions/scene-document.ts
index 1c6bd82..ab2d9ec 100644
--- a/src/domain/sessions/scene-document.ts
+++ b/src/domain/sessions/scene-document.ts
@@ -342,7 +342,7 @@ export type SceneDocument = SceneDocumentV2;
 export type AnySceneDocument = SceneDocumentV1 | SceneDocumentV2;
 
 export interface SceneWarning {
-  readonly code: "map-image-missing" | "scene-format-outdated";
+  readonly code: "map-image-missing" | "scene-format-outdated" | "scene-link-unresolved";
   readonly message: string;
   readonly path: string;
 }
diff --git a/src/render/pixi/map-image-resource.ts b/src/render/pixi/map-image-resource.ts
index 5e06253..a1a4552 100644
--- a/src/render/pixi/map-image-resource.ts
+++ b/src/render/pixi/map-image-resource.ts
@@ -1,3 +1,4 @@
+import { isServiceAssetUrl } from "../../shared/contracts/service-references";
 import { Assets, type Texture } from "pixi.js";
 
 export interface ImageResourceLease {
@@ -65,7 +66,7 @@ export function acquireImageResource(url: string): ImageResourceLease {
     const ready = Promise.resolve(previousUnload).then(async () => {
       // Assets loaded outside this registry have an unknown owner.
       next.borrowed = Assets.cache.has(url);
-      const texture = await Assets.load<Texture>(url);
+      const texture = await Assets.load<Texture>(isServiceAssetUrl(url) ? { src: url, parser: "loadTextures" } : url);
       next.loaded = true;
       if (texture.destroyed || !Number.isInteger(texture.width) || !Number.isInteger(texture.height)
         || texture.width <= 0 || texture.height <= 0) {
diff --git a/src/renderer/src/App.tsx b/src/renderer/src/App.tsx
index af99cb6..085ad26 100644
--- a/src/renderer/src/App.tsx
+++ b/src/renderer/src/App.tsx
@@ -1,3 +1,5 @@
+import type { ServiceWorkspace } from "../../web/workspace";
+import { useTtrpgApi } from "./client/ClientProvider";
 import {
   useCallback,
   useEffect,
@@ -288,8 +290,14 @@ interface NewTokenDraftState {
 const SESSION_AUTOSAVE_DELAY_MS = 1000;
 const PLAYER_SCENE_PUBLISH_DELAY_MS = 250;
 
-export function App(): JSX.Element {
+export function App({ service }: { readonly service?: ServiceWorkspace } = {}): JSX.Element {
+  const scenesApi = useTtrpgApi("scenes");
+  const imagesApi = useTtrpgApi("images");
+  const playerApi = useTtrpgApi("player");
+  const nativeMenusApi = useTtrpgApi("nativeMenus");
+  const librariesApi = useTtrpgApi("libraries");
   const [scene, setSceneState] = useState<SceneDocument>(() => {
+    if (service) return createEmptyScene();
     try {
       const snapshot = sessionStorage.getItem("ttrpg:session-scene");
       if (snapshot !== null) {
@@ -478,8 +486,8 @@ export function App(): JSX.Element {
         : { state: "validating" as const }
     ])));
 
-    if (currentFilePath === null || markers.length === 0 || window.ttrpg === undefined) return;
-    void window.ttrpg.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
+    if (currentFilePath === null || markers.length === 0 || scenesApi === undefined) return;
+    void scenesApi.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
       if (sceneLinkValidationRequestId.current !== requestId) return;
       if (result.ok) {
         setSceneLinkStatuses(result.statuses);
@@ -487,10 +495,10 @@ export function App(): JSX.Element {
         setFeedback(result.error);
       }
     });
-  }, [currentFilePath, scene.mapAnnotations.sceneLinks]);
+  }, [currentFilePath, scene.mapAnnotations.sceneLinks, scenesApi]);
 
   useEffect(() => {
-    if (window.ttrpg === undefined || scene.tokens.length === 0) {
+    if (imagesApi === undefined || scene.tokens.length === 0) {
       return;
     }
 
@@ -502,7 +510,7 @@ export function App(): JSX.Element {
 
     let cancelled = false;
     void Promise.all(
-      missingTokens.map(async (token) => [token.id, await window.ttrpg?.resolveTokenUrl(token.imagePath)] as const)
+      missingTokens.map(async (token) => [token.id, await imagesApi?.resolveTokenUrl(token.imagePath)] as const)
     ).then((entries) => {
       if (cancelled) {
         return;
@@ -524,12 +532,13 @@ export function App(): JSX.Element {
     return () => {
       cancelled = true;
     };
-  }, [scene.tokens, tokenImageUrls]);
+  }, [scene.tokens, tokenImageUrls, imagesApi]);
 
   // Phase 2: Autosave scene to sessionStorage on every change (debounced).
   // sessionStorage survives renderer reloads within the same Electron window session
   // but is cleared automatically when the window is closed, preventing cross-session leakage.
   useEffect(() => {
+    if (service) return;
     const handle = setTimeout(() => {
       try {
         sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(scene));
@@ -538,7 +547,7 @@ export function App(): JSX.Element {
       }
     }, SESSION_AUTOSAVE_DELAY_MS);
     return () => clearTimeout(handle);
-  }, [scene]);
+  }, [scene, service]);
 
   const handleContextMenuRequest = useCallback((request: PixiContextMenuRequest) => {
     setInteraction((current) => {
@@ -616,7 +625,7 @@ export function App(): JSX.Element {
 
   const sendPlayerCameraCommand = useCallback(
     (reason: PlayerCameraCommandReason): void => {
-      if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
+      if (!isPlayerWindowOpenRef.current || playerApi === undefined) {
         refreshPlayerCameraControl("closed");
         return;
       }
@@ -625,13 +634,13 @@ export function App(): JSX.Element {
       playerCameraCommandRevisionRef.current = revision;
       pendingPlayerCameraCommandRevisionRef.current = revision;
       refreshPlayerCameraControl("pending");
-      void window.ttrpg.commandPlayerCamera({
+      void playerApi.commandPlayerCamera({
         revision,
         camera: playerCameraRef.current,
         reason
       });
     },
-    [refreshPlayerCameraControl]
+    [refreshPlayerCameraControl, playerApi]
   );
 
   const handleCameraChange = useCallback((camera: ViewportCameraSnapshot): void => {
@@ -666,9 +675,9 @@ export function App(): JSX.Element {
 
   const handleArcanePointerTrigger = useCallback((pointer: ArcanePointerBroadcast): void => {
     if (isPlayerWindowOpenRef.current) {
-      void window.ttrpg?.publishPlayerPointer(pointer);
+      void playerApi?.publishPlayerPointer(pointer);
     }
-  }, []);
+  }, [playerApi]);
 
   const handleRoomPinPlace = useCallback((position: WorldPoint): void => {
     const id = getNextAvailableSceneId(sceneRef.current, ["room-pin-"], nextPinId);
@@ -705,13 +714,17 @@ export function App(): JSX.Element {
   }, []);
 
   const handleInformationAreaHighlight = useCallback((areaId: string): void => {
+    if (playerApi === undefined) {
+      setFeedback("La proyeccion no esta disponible en este cliente.");
+      return;
+    }
     const area = sceneRef.current.mapAnnotations.areas.find((candidate) => candidate.id === areaId);
     if (area === undefined) return;
-    void window.ttrpg?.publishPlayerInformationAreaHighlight(
+    void playerApi?.publishPlayerInformationAreaHighlight(
       createInformationAreaHighlightBroadcast(area)
     );
     setFeedback(`Area resaltada para jugadores durante 5 segundos.`);
-  }, []);
+  }, [playerApi]);
 
   const setGridAdjustMode = useCallback((enabled: boolean): void => {
     setIsGridAdjustMode(enabled);
@@ -949,14 +962,14 @@ export function App(): JSX.Element {
       setFeedback("Nombre actualizado; se guardara al establecer la ruta de la escena.");
       return true;
     }
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return false;
     }
 
     setIsBusy(true);
     try {
-      const saved = await window.ttrpg.saveSceneToPath(
+      const saved = await scenesApi.saveSceneToPath(
         createSceneSavePayload(nextScene, sceneAside),
         currentFilePath
       );
@@ -982,7 +995,7 @@ export function App(): JSX.Element {
     } finally {
       setIsBusy(false);
     }
-  }, [currentFilePath, sceneAside]);
+  }, [currentFilePath, sceneAside, scenesApi]);
 
   async function persistCurrentSceneForSceneLink(): Promise<string | null> {
     const currentSnapshot = JSON.stringify({ ...sceneRef.current, sceneAside });
@@ -994,7 +1007,7 @@ export function App(): JSX.Element {
     try {
       saved = currentFilePath === null
         ? await saveCurrentScene()
-        : await window.ttrpg?.saveSceneToPath(
+        : await scenesApi?.saveSceneToPath(
             createSceneSavePayload(sceneRef.current, sceneAside),
             currentFilePath
           );
@@ -1020,7 +1033,7 @@ export function App(): JSX.Element {
     successMessage: string,
     targetScenePath?: string
   ): Promise<boolean> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return false;
     }
@@ -1028,7 +1041,7 @@ export function App(): JSX.Element {
     const scenePath = targetScenePath ?? currentFilePath ?? await persistCurrentSceneForSceneLink();
     if (scenePath === null) return false;
 
-    const saved = await window.ttrpg.saveSceneToPath(createSceneSavePayload(sceneSnapshot, sceneAside), scenePath);
+    const saved = await scenesApi.saveSceneToPath(createSceneSavePayload(sceneSnapshot, sceneAside), scenePath);
     if (!saved.ok) {
       setFeedback(saved.error);
       return false;
@@ -1045,6 +1058,9 @@ export function App(): JSX.Element {
     targetMapId: string,
     targetMarkerId: string
   ): Promise<boolean> {
+    if (marker.connection !== null && marker.connection.peer.mapId === undefined) {
+      throw new Error("Usa Desligar para liberar la conexión con otra escena antes de conectar mapas internos.");
+    }
     const sourceMapId = sceneRef.current.activeMapId;
     if (sourceMapId === null) {
       setFeedback("Selecciona un mapa antes de crear una conexion.");
@@ -1063,8 +1079,9 @@ export function App(): JSX.Element {
         scenePath,
         connectionId: globalThis.crypto.randomUUID()
       });
-      setScene(nextScene);
-      return await saveSceneSnapshotInBackground(nextScene, "Conexion interna guardada.", scenePath);
+      const saved = await saveSceneSnapshotInBackground(nextScene, "Conexion interna guardada.", scenePath);
+      if (saved) setScene(nextScene);
+      return saved;
     } catch (error) {
       setFeedback(error instanceof Error ? error.message : "No se pudo crear la conexion interna.");
       return false;
@@ -1073,18 +1090,46 @@ export function App(): JSX.Element {
     }
   }
 
+  async function selectRemoteSceneLinkTarget() {
+    if (!scenesApi || !service) throw new Error("El servicio no está disponible.");
+    const selected=await scenesApi.selectSceneLinkTargetFile();
+    if(!selected.ok)throw new Error(selected.error);
+    if(!selected.filePath)return null;
+    if(selected.filePath===currentFilePath)throw new Error("Para esta misma escena usa Mapa destino.");
+    const result=await scenesApi.listSceneLinkCandidates(selected.filePath);
+    if(!result.ok)throw new Error(result.error);
+    return {...result.candidate,name:service.browser.name(selected.filePath)};
+  }
+  async function handleConnectRemoteSceneLink(marker:MapSceneLinkMarker,targetScenePath:string,targetMarkerId:string):Promise<boolean> {
+    if(!scenesApi)return false;
+    if(marker.connection?.peer.mapId!==undefined)throw new Error("Usa Desligar para liberar la conexión interna antes de conectar otra escena.");
+    setIsBusy(true);
+    try {
+      const sourceScenePath=await persistCurrentSceneForSceneLink();
+      if(!sourceScenePath)return false;
+      const result=await scenesApi.connectSceneLink({sourceScenePath,sourceMarkerId:marker.id,targetScenePath,targetMarkerId});
+      if(!result.ok){setFeedback(result.error);throw new Error(result.error);}
+      setScene(current=>({...current,mapAnnotations:result.mapAnnotations}));
+      lastSavedSceneJsonRef.current=JSON.stringify({...sceneRef.current,sceneAside});
+      setSceneLinkStatuses(current=>({...current,[marker.id]:{state:"valid"}}));
+      setFeedback(result.warning??"Conexión entre escenas guardada.");
+      return true;
+    } finally {setIsBusy(false);}
+  }
+
   async function handleDisconnectSceneLink(marker: MapSceneLinkMarker): Promise<boolean> {
-    if (window.ttrpg === undefined) return false;
+    if (scenesApi === undefined) return false;
     const scenePath = await persistCurrentSceneForSceneLink();
     if (scenePath === null) return false;
     setIsBusy(true);
     try {
       if (marker.connection?.peer.mapId !== undefined && sceneRef.current.activeMapId !== null) {
         const nextScene = disconnectInternalSceneLink(sceneRef.current, sceneRef.current.activeMapId, marker.id);
-        setScene(nextScene);
-        return await saveSceneSnapshotInBackground(nextScene, "Conexion interna desligada.");
+        const saved = await saveSceneSnapshotInBackground(nextScene, "Conexion interna desligada.");
+        if (saved) setScene(nextScene);
+        return saved;
       }
-      const result = await window.ttrpg.disconnectSceneLink({ scenePath, markerId: marker.id });
+      const result = await scenesApi.disconnectSceneLink({ scenePath, markerId: marker.id });
       if (!result.ok) {
         setFeedback(result.error);
         return false;
@@ -1137,7 +1182,7 @@ export function App(): JSX.Element {
       return;
     }
 
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setSceneLinkModalId(marker.id);
       return;
     }
@@ -1145,7 +1190,7 @@ export function App(): JSX.Element {
     if (scenePath === null) return;
     setIsBusy(true);
     try {
-      const result = await window.ttrpg.loadSceneLinkTarget({
+      const result = await scenesApi.loadSceneLinkTarget({
         scenePath,
         markerId: marker.id
       });
@@ -1392,14 +1437,18 @@ export function App(): JSX.Element {
     }
 
     const handle = window.setTimeout(() => {
-      void window.ttrpg?.publishPlayerScene(playerWindowSnapshot);
+      void playerApi?.publishPlayerScene(playerWindowSnapshot);
     }, PLAYER_SCENE_PUBLISH_DELAY_MS);
 
     return () => window.clearTimeout(handle);
-  }, [isPlayerWindowOpen, playerWindowSnapshot]);
+  }, [isPlayerWindowOpen, playerWindowSnapshot, playerApi]);
 
   useEffect(() => {
-    const unsubscribeClosed = window.ttrpg?.onPlayerWindowClosed(() => {
+    let cancelled = false;
+    isPlayerWindowOpenRef.current = false;
+    setIsPlayerWindowOpen(false);
+    lastPlayerCameraReportRevisionRef.current = -1;
+    const unsubscribeClosed = playerApi?.onPlayerWindowClosed(() => {
       isPlayerWindowOpenRef.current = false;
       setIsPlayerWindowOpen(false);
       effectivePlayerCameraRef.current = null;
@@ -1408,7 +1457,7 @@ export function App(): JSX.Element {
       acknowledgedPlayerCameraCommandRevisionRef.current = null;
       refreshPlayerCameraControl("closed");
     });
-    const unsubscribeCameraReport = window.ttrpg?.onPlayerCameraReport((report) => {
+    const unsubscribeCameraReport = playerApi?.onPlayerCameraReport((report) => {
       if (!shouldApplyPlayerCameraReport(lastPlayerCameraReportRevisionRef.current, report)) {
         return;
       }
@@ -1427,7 +1476,7 @@ export function App(): JSX.Element {
       }
       refreshPlayerCameraControl();
     });
-    const unsubscribePlayerReady = window.ttrpg?.onPlayerWindowReady(() => {
+    const unsubscribePlayerReady = playerApi?.onPlayerWindowReady(() => {
       lastPlayerCameraReportRevisionRef.current = -1;
       effectivePlayerCameraRef.current = null;
       effectivePlayerViewportRef.current = null;
@@ -1439,7 +1488,8 @@ export function App(): JSX.Element {
       }
     });
 
-    void window.ttrpg?.getPlayerWindowState().then((state) => {
+    void playerApi?.getPlayerWindowState().then((state) => {
+      if (cancelled) return;
       if (state.cameraCommand !== null) {
         playerCameraCommandRevisionRef.current = Math.max(
           playerCameraCommandRevisionRef.current,
@@ -1455,11 +1505,12 @@ export function App(): JSX.Element {
     });
 
     return () => {
+      cancelled = true;
       unsubscribeClosed?.();
       unsubscribeCameraReport?.();
       unsubscribePlayerReady?.();
     };
-  }, [refreshPlayerCameraControl, sendPlayerCameraCommand]);
+  }, [refreshPlayerCameraControl, sendPlayerCameraCommand, playerApi]);
 
   useEffect(() => {
     refreshPlayerCameraControl();
@@ -1468,17 +1519,17 @@ export function App(): JSX.Element {
   useEffect(() => {
     void refreshMonsterTemplates();
 
-    const unsubscribe = window.ttrpg?.onOpenMonsterTemplateManager(() => {
+    const unsubscribe = nativeMenusApi?.onOpenMonsterTemplateManager(() => {
       setIsMonsterTemplateManagerOpen(true);
       void refreshMonsterTemplates();
     });
 
     return () => unsubscribe?.();
-  }, []);
+  }, [nativeMenusApi, librariesApi]);
 
   async function refreshMonsterTemplates(): Promise<void> {
-    if (window.ttrpg === undefined) return;
-    const result = await window.ttrpg.listMonsterTemplates();
+    if (librariesApi === undefined) return;
+    const result = await librariesApi.listMonsterTemplates();
     if (result.ok) {
       setMonsterTemplates(result.templates);
     } else {
@@ -1487,11 +1538,11 @@ export function App(): JSX.Element {
   }
 
   async function handleSaveMonsterTemplate(template: MonsterTemplate): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (librariesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
-    const result = await window.ttrpg.saveMonsterTemplate(template);
+    const result = await librariesApi.saveMonsterTemplate(template);
     if (result.ok) {
       setMonsterTemplates(result.templates);
     } else {
@@ -1500,11 +1551,11 @@ export function App(): JSX.Element {
   }
 
   async function handleDeleteMonsterTemplate(id: string): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (librariesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
-    const result = await window.ttrpg.deleteMonsterTemplate(id);
+    const result = await librariesApi.deleteMonsterTemplate(id);
     if (result.ok) {
       setMonsterTemplates(result.templates);
     } else {
@@ -1515,7 +1566,7 @@ export function App(): JSX.Element {
   const resetToNewScene = useCallback((): void => {
     resetMapImageSession();
     const defaultScene = createEmptyScene();
-    sessionStorage.removeItem("ttrpg:session-scene");
+    if (!service) sessionStorage.removeItem("ttrpg:session-scene");
     setScene(defaultScene);
     setSceneAside(createDefaultSceneAside());
     playerCameraRef.current = normalizeCameraSnapshot({
@@ -1555,7 +1606,7 @@ export function App(): JSX.Element {
     lastSavedSceneJsonRef.current = null;
     refreshPlayerCameraControl();
     sendPlayerCameraCommand("scene-change");
-  }, [refreshPlayerCameraControl, sendPlayerCameraCommand, setGridAdjustMode, resetMapImageSession]);
+  }, [refreshPlayerCameraControl, sendPlayerCameraCommand, setGridAdjustMode, resetMapImageSession, service]);
 
   const handleRequestNewScene = useCallback((): void => {
     if (!canCreateNewScene) {
@@ -1868,11 +1919,11 @@ export function App(): JSX.Element {
   ]);
 
   async function saveCurrentScene(): Promise<SceneOperationResult> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       return { ok: false, error: "La API de preload no esta disponible." };
     }
 
-    return window.ttrpg.saveScene(createSceneSavePayload(sceneRef.current, sceneAside), {
+    return scenesApi.saveScene(createSceneSavePayload(sceneRef.current, sceneAside), {
       suggestedFilePath: currentFilePath
     });
   }
@@ -1901,13 +1952,43 @@ export function App(): JSX.Element {
     }
   }
 
+  async function allowServiceLeave(): Promise<boolean> {
+    if (!service) return true;
+    const snapshot = createSceneSavePayload(sceneRef.current, sceneAside);
+    if ((snapshot.maps.length === 0 && JSON.stringify(snapshot.sceneAside) === JSON.stringify(createDefaultSceneAside())) || lastSavedSceneJsonRef.current === JSON.stringify({ ...sceneRef.current, sceneAside })) return true;
+    const choice = await service.confirmLeave();
+    if (choice === "discard") return true;
+    if (choice !== "save") return false;
+    const saved = await saveCurrentScene();
+    if (!saved.ok) { setFeedback(saved.error); return false; }
+    setCurrentFilePath(saved.filePath);
+    lastSavedSceneJsonRef.current = JSON.stringify({ ...sceneRef.current, sceneAside });
+    return true;
+  }
+  async function handleServiceAction(action: "import" | "export" | "logout"): Promise<void> {
+    if (!service) return;
+    try {
+      if (action === "export") { await service.browser.exportFile(createSceneSavePayload(sceneRef.current, sceneAside), currentFilePath); setFeedback("Archivo exportado. Los assets permanecen en este servicio."); return; }
+      if (!await allowServiceLeave()) return;
+      if (action === "logout") await service.logout();
+      else await runSceneOperation("cargada", service.browser.importFile);
+    } catch (error) { setFeedback(error instanceof Error ? error.message : "No se pudo completar la operación."); }
+  }
+  useEffect(() => {
+    if (!service) return;
+    const beforeUnload = (event: BeforeUnloadEvent) => { if ((sceneRef.current.maps.length > 0 || JSON.stringify(sceneAside) !== JSON.stringify(createDefaultSceneAside())) && lastSavedSceneJsonRef.current !== JSON.stringify({ ...sceneRef.current, sceneAside })) { event.preventDefault(); event.returnValue = ""; } };
+    window.addEventListener("beforeunload", beforeUnload);
+    return () => window.removeEventListener("beforeunload", beforeUnload);
+  }, [service, sceneAside]);
+
   async function handleLoadScene(): Promise<void> {
+    if (!await allowServiceLeave()) return;
     await runSceneOperation("cargada", async () => {
-      if (window.ttrpg === undefined) {
+      if (scenesApi === undefined) {
         return { ok: false, error: "La API de preload no esta disponible." };
       }
 
-      return window.ttrpg.loadScene();
+      return scenesApi.loadScene();
     });
   }
 
@@ -1926,11 +2007,11 @@ export function App(): JSX.Element {
     readonly camera: ViewportCameraSnapshot;
     readonly cameraSyncKey: number;
   }): void {
-    if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
+    if (!isPlayerWindowOpenRef.current || playerApi === undefined) {
       return;
     }
 
-    void window.ttrpg.publishPlayerScene({
+    void playerApi.publishPlayerScene({
       scene: createPlayerSceneSnapshot({ ...loadedScene, sceneAside: loadedSceneAside }),
       mapImageUrl: loadedMapImageUrl,
       tokenImageUrls: loadedTokenImageUrls,
@@ -1948,8 +2029,7 @@ export function App(): JSX.Element {
   ): Promise<void> {
     setIsBusy(true);
     setWarnings([]);
-    // Saving always resolves any outdated-format situation
-    if (actionLabel === "guardada") setNeedsResave(false);
+
 
     try {
       const result = await operation();
@@ -2018,26 +2098,26 @@ export function App(): JSX.Element {
   }
 
   useEffect(() => {
-    const unsubscribe = window.ttrpg?.onRecentSceneOpen((result) => {
+    const unsubscribe = nativeMenusApi?.onRecentSceneOpen((result) => {
       void runSceneOperation("cargada", async () => result);
     });
 
     return () => {
       unsubscribe?.();
     };
-  }, [runSceneOperation]);
+  }, [runSceneOperation, nativeMenusApi]);
 
   async function handleAddSceneMap(): Promise<void> {
     setIsBusy(true);
     setWarnings([]);
 
     try {
-      if (window.ttrpg === undefined) {
+      if (imagesApi === undefined) {
         setFeedback("La API de preload no esta disponible.");
         return;
       }
 
-      const result = await window.ttrpg.openMapImage();
+      const result = await imagesApi.openMapImage();
       if (!result.ok) {
         setFeedback(result.error);
         return;
@@ -2066,7 +2146,7 @@ export function App(): JSX.Element {
   }
 
   async function handleImportSceneAsMap(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
@@ -2076,7 +2156,7 @@ export function App(): JSX.Element {
 
     try {
       const previousFilePath = currentFilePath;
-      const result = await window.ttrpg.importSceneAsMap(createSceneSavePayload(sceneRef.current, sceneAside));
+      const result = await scenesApi.importSceneAsMap(createSceneSavePayload(sceneRef.current, sceneAside));
       if (!result.ok) {
         setFeedback(result.error);
         return;
@@ -2675,12 +2755,12 @@ export function App(): JSX.Element {
   }
 
   async function handleOpenPlayerWindow(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (playerApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
 
-    const result = await window.ttrpg.openPlayerWindow({
+    const result = await playerApi.openPlayerWindow({
       ...playerWindowSnapshot,
       camera: playerCameraRef.current
     });
@@ -2840,7 +2920,7 @@ export function App(): JSX.Element {
       return;
     }
 
-    if (window.ttrpg === undefined) {
+    if (imagesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
@@ -2849,7 +2929,7 @@ export function App(): JSX.Element {
     setWarnings([]);
 
     try {
-      const result = await window.ttrpg.openTokenImage();
+      const result = await imagesApi.openTokenImage();
 
       if (!result.ok) {
         setFeedback(result.error);
@@ -2867,6 +2947,21 @@ export function App(): JSX.Element {
     }
   }
 
+  async function handleReplaceTokenImage(tokenId: string): Promise<void> {
+    const mapId = sceneRef.current.activeMapId;
+    const original = sceneRef.current.tokens.find(token => token.id === tokenId);
+    if (!original || !imagesApi) return;
+    setIsBusy(true);
+    try {
+      const result = await imagesApi.openTokenImage();
+      if (!result.ok) { setFeedback(result.error); return; }
+      if (sceneRef.current.activeMapId !== mapId || !sceneRef.current.tokens.includes(original)) return;
+      setScene(current => ({ ...current, tokens: current.tokens.map(token => token.id === tokenId ? { ...token, imagePath: result.imagePath } : token) }));
+      setTokenImageUrls(current => ({ ...current, [tokenId]: result.imageUrl }));
+      setFeedback(`Imagen de ${original.name} reemplazada`);
+    } finally { setIsBusy(false); }
+  }
+
   function handleToggleContextMenuFogMode(): void {
     if (interaction.activeTool !== "fog-reveal" && !scene.fogOfWar.enabled) {
       return;
@@ -3321,7 +3416,8 @@ export function App(): JSX.Element {
   return (
     <main className="app-shell vtt-interface" aria-label="TTRPG Effects">
       <WorkspaceHeader
-        sceneName={currentFilePath ? getFileBaseName(currentFilePath) : "Escena sin guardar"}
+        sceneName={currentFilePath ? service?.browser.name(currentFilePath) ?? getFileBaseName(currentFilePath) : "Escena sin guardar"}
+        serviceActions={service ? { onImport: () => void handleServiceAction("import"), onExport: () => void handleServiceAction("export"), onLogout: () => void handleServiceAction("logout"), onTemplates: () => setIsMonsterTemplateManagerOpen(true) } : undefined}
         mapName={scene.maps.find(map => map.id === scene.activeMapId)?.name ?? "Sin mapa"}
         busy={isBusy}
         canCreate={canCreateNewScene}
@@ -3330,11 +3426,11 @@ export function App(): JSX.Element {
         inspectorVisible={isSidebarVisible}
         onNew={handleRequestNewScene}
         onLoad={() => void handleLoadScene()}
-        onSave={() => void handleSaveScene()}
-        onPlayer={() => void handleOpenPlayerWindow()}
+        onSave={() => handleSaveScene()}
+        onPlayer={() => service ? setFeedback("La proyección compartida todavía no está disponible.") : void handleOpenPlayerWindow()}
         onBattle={() => setIsCombatSetupOpen(true)}
         onCounters={() => setIsSceneCounterManagerOpen(true)}
-        onDice={() => { setRightTab("dice"); openInspector(); }}
+        onDice={() => { if (service) { setFeedback("Los dados compartidos todavía no están disponibles."); return; } setRightTab("dice"); openInspector(); }}
         onExplorer={toggleExplorer}
         onInspector={toggleInspector}
       />
@@ -4541,6 +4637,7 @@ export function App(): JSX.Element {
                           </small>
                         </span>
                       </button>
+                      {service && <button type="button" disabled={isBusy} aria-label={`Reemplazar imagen de ${token.name}`} onClick={() => void handleReplaceTokenImage(token.id)}>Imagen</button>}
                       <button
                         type="button"
                         className="token-visibility-button"
@@ -4906,6 +5003,7 @@ export function App(): JSX.Element {
           )}
           currentScenePath={currentFilePath}
           candidateMaps={sceneLinkCandidateMaps}
+          remote={service ? { select: selectRemoteSceneLinkTarget, connect: (path,id) => handleConnectRemoteSceneLink(sceneLinkModalMarker,path,id) } : undefined}
           onRename={(name) => handleRenameSceneLink(sceneLinkModalMarker.id, name)}
           onConnect={(targetMapId, targetMarkerId) =>
             handleConnectSceneLink(sceneLinkModalMarker, targetMapId, targetMarkerId)
diff --git a/src/renderer/src/App.workspace.test.tsx b/src/renderer/src/App.workspace.test.tsx
index 99a6287..51f40db 100644
--- a/src/renderer/src/App.workspace.test.tsx
+++ b/src/renderer/src/App.workspace.test.tsx
@@ -4,9 +4,19 @@ import { act, type ComponentProps } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import type { ViewportCameraSnapshot } from "../../domain/player/player-window";
-import { createDefaultSceneMap, createSceneWithMap } from "../../domain/sessions/scene-maps";
+import { createDefaultSceneMap, createSceneWithMap, syncRuntimeFieldsFromActiveMap } from "../../domain/sessions/scene-maps";
 import type { MapViewport, MapViewportHandle } from "./components/MapViewport";
 import { App } from "./App";
+import { parseSceneJson } from "../../domain/sessions/scene-schema";
+import { connectInternalSceneLink } from "../../domain/annotations/internal-scene-links";
+import { createReciprocalSceneLinkMarkers } from "../../domain/annotations/scene-navigation-links";
+import { DialogBroker, DialogHost } from "../../web/dialogs";
+import { createBrowserClient } from "../../infrastructure/browser/browser-client";
+import { HttpTransport } from "../../infrastructure/browser/http";
+import { ClientProvider } from "./client/ClientProvider";
+import { createClient } from "../../shared/api/client";
+import type { TtrpgApi } from "../../shared/api/ttrpg-api";
+import type { MapInformationArea } from "../../domain/annotations/map-annotations";
 
 type ViewportProps = ComponentProps<typeof MapViewport>;
 const viewport = vi.hoisted(() => ({
@@ -129,6 +139,40 @@ describe("App production workspace", () => {
     }));
   }
 
+  it.each(["absent", "no-player"] as const)("deletes local areas with %s client by Delete, Backspace and tree button", async (mode) => {
+    const area: MapInformationArea = { id: "local-area", kind: "information-area", areaType: "terrain", name: "Local area", description: "", cells: [{ x: 0, y: 0, size: 100 }], locked: false };
+    const client = mode === "absent" ? null : createClient({} as TtrpgApi, { scenes: false, images: false, libraries: false, player: false, dice: false, nativeMenus: false });
+    for (const action of ["Delete", "Backspace", "button"]) {
+      await act(async () => root.render(null));
+      const map = createDefaultSceneMap({ id: "area-map", name: "Area map" });
+      const scene = createSceneWithMap({ ...map, mapAnnotations: { ...map.mapAnnotations, areas: [area] } });
+      sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(scene));
+      await act(async () => root.render(<ClientProvider client={client}><App /></ClientProvider>));
+      expect(props().mapAnnotations.areas).toHaveLength(1);
+      await act(async () => props().onElementSelect(area.id));
+      if (action === "button") {
+        await click(button("Mapa"));
+        const annotations = [...host.querySelectorAll<HTMLButtonElement>("button")].find(candidate => candidate.textContent?.includes("Anotaciones"));
+        if (!host.querySelector('[aria-label="Eliminar Local area"]')) await click(annotations!);
+        await click(button("Eliminar Local area"));
+      } else {
+        await act(async () => host.querySelector("[data-testid=workspace-canvas]")!.dispatchEvent(new KeyboardEvent("keydown", { key: action, bubbles: true })));
+      }
+      expect(props().mapAnnotations.areas).toHaveLength(0);
+      expect(props().selectedElementId).toBeNull();
+      expect(host.textContent).not.toContain("La proyeccion no esta disponible");
+    }
+  });
+
+  it("preserves the lock when deleting a local area without a client", async () => {
+    const map = createDefaultSceneMap({ id: "locked-map", name: "Locked" });
+    sessionStorage.setItem("ttrpg:session-scene", JSON.stringify(createSceneWithMap({ ...map, mapAnnotations: { ...map.mapAnnotations, areas: [{ id: "locked", kind: "information-area", areaType: "terrain", name: "Locked area", description: "", cells: [{ x: 0, y: 0, size: 100 }], locked: true }] } })));
+    await act(async () => root.render(<ClientProvider client={null}><App /></ClientProvider>));
+    await act(async () => props().onElementSelect("locked"));
+    await act(async () => host.querySelector("[data-testid=workspace-canvas]")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
+    expect(props().mapAnnotations.areas).toHaveLength(1);
+  });
+
   it("creates rail shapes at the current camera center and context shapes at the clicked world point", async () => {
     await render();
     const center = { x: 237, y: -113 };
@@ -305,4 +349,112 @@ describe("App production workspace", () => {
     expect(viewport.mount).toHaveBeenCalledOnce();
     expect(viewport.unmount).not.toHaveBeenCalled();
   });
+  it("protege cambios web ante guardar fallido/cancelar y no usa el autosave local", async () => {
+    const scene=JSON.parse(sessionStorage.getItem("ttrpg:session-scene")!);
+    const storage=vi.spyOn(Storage.prototype,"setItem");
+    const browser=createBrowserClient(new HttpTransport(vi.fn()),{selectScene:async()=>null,sceneName:async()=>null});
+    const load=vi.fn(async()=>({ok:true as const,scene,filePath:"scene:01010101-0101-4101-8101-010101010101",mapImageUrl:undefined,tokenImageUrls:{},warnings:[]}));
+    const save=vi.fn(async()=>({ok:false as const,error:"Servicio desconectado"}));
+    const client=createClient({...browser.client.api,loadScene:load,saveScene:save},browser.client.capabilities);
+    const leave=vi.fn<()=>Promise<string|null>>();const logout=vi.fn(async()=>{});
+    await act(async()=>root.render(<ClientProvider client={client}><App service={{browser,confirmLeave:leave,logout}}/></ClientProvider>));
+    expect(host.textContent).not.toContain("Workspace fixture");
+    await click(element('[aria-label="Menu de escena"]'));await click(button("Cargar escena"));
+    expect(host.textContent).toContain("Workspace fixture");
+    await rail("Areas");await option("Area conica");
+    leave.mockResolvedValueOnce("save");await click(element('[aria-label="Menu de escena"]'));await click(button("Cerrar sesión"));
+    expect(save).toHaveBeenCalledOnce();expect(logout).not.toHaveBeenCalled();expect(host.textContent).toContain("Servicio desconectado");expect(props().shapes).toHaveLength(1);
+    leave.mockResolvedValueOnce(null);await click(element('[aria-label="Menu de escena"]'));await click(button("Cerrar sesión"));expect(logout).not.toHaveBeenCalled();
+    leave.mockResolvedValueOnce("discard");await click(element('[aria-label="Menu de escena"]'));await click(button("Cerrar sesión"));expect(logout).toHaveBeenCalledOnce();expect(storage).not.toHaveBeenCalled();
+  });
+
+  it.each([false,true])("conecta desde App con selector remoto y conserva estado ante fallo (reparación=%s)",async broken=>{
+    const base=parseSceneJson(sessionStorage.getItem("ttrpg:session-scene")!);
+    const source="scene:01010101-0101-4101-8101-010101010101",target="scene:02020202-0202-4202-8202-020202020202";
+    const marker={id:"a",kind:"scene-link" as const,name:"Puerta A",position:{x:0,y:0},locked:false,connection:null};
+    const peer={...marker,id:"b",name:"Puerta B"};
+    const old=broken?createReciprocalSceneLinkMarkers(marker,source,peer,"/anterior.ttrpgscene","old")[0]:marker;
+    const scene={...base,mapAnnotations:{...base.mapAnnotations,sceneLinks:[old]}};
+    const connected=createReciprocalSceneLinkMarkers(old,source,peer,target,"new")[0];
+    const browser=createBrowserClient(new HttpTransport(vi.fn()),{selectScene:async()=>null,sceneName:async()=>null});
+    const load=vi.fn(async()=>({ok:true as const,scene,filePath:source,warnings:[]}));
+    const select=vi.fn(async()=>({ok:true as const,filePath:target}));
+    const connect=vi.fn().mockResolvedValueOnce({ok:false,error:"Falló la conexión"}).mockResolvedValueOnce({ok:true,mapAnnotations:{...scene.mapAnnotations,sceneLinks:[connected]}});
+    const save=vi.fn(async()=>({ok:true as const,scene,filePath:source,warnings:[]}));
+    const client=createClient({...browser.client.api,loadScene:load,saveSceneToPath:save,selectSceneLinkTargetFile:select,listSceneLinkCandidates:async()=>({ok:true,candidate:{filePath:target,markers:[{...peer,available:true}]}}),connectSceneLink:connect,validateSceneLinks:async()=>({ok:true,statuses:{a:broken?{state:"broken",reason:"file-missing",message:"Ausente"}:{state:"unlinked"}}})},browser.client.capabilities);
+    await act(async()=>root.render(<ClientProvider client={client}><App service={{browser,confirmLeave:async()=>null,logout:async()=>{}}}/></ClientProvider>));
+    await click(element('[aria-label="Menu de escena"]'));await click(button("Cargar escena"));
+    await act(async()=>props().onMapAnnotationPreview("a"));expect(host.textContent).toContain("Otra escena guardada");
+    await click(button("Elegir escena del servicio"));expect(select).toHaveBeenCalledOnce();expect(element<HTMLSelectElement>('[aria-label="Marcador de la escena"]').value).toBe("b");
+    await click(button("Conectar con esta escena"));expect(host.textContent).toContain("Falló la conexión");expect(props().mapAnnotations.sceneLinks[0].connection).toEqual(old.connection);
+    await click(button("Conectar con esta escena"));expect(connect).toHaveBeenLastCalledWith({sourceScenePath:source,sourceMarkerId:"a",targetScenePath:target,targetMarkerId:"b"});expect(props().mapAnnotations.sceneLinks[0].connection?.peer.scenePath).toBe(target);expect(host.querySelector('.scene-link-modal')).toBeNull();
+  });
+  it.each(["remote", "internal"] as const)("exige Desligar antes de cambiar %s y conserva estado si falla", async (kind) => {
+    const source = "scene:01010101-0101-4101-8101-010101010101";
+    const target = "scene:02020202-0202-4202-8202-020202020202";
+    const marker = { id: "a", kind: "scene-link" as const, name: "Puerta A", position: { x: 0, y: 0 }, locked: false, connection: null };
+    const peer = { ...marker, id: "b", name: "Puerta B" };
+    const mapA = createDefaultSceneMap({ id: "map-a", name: "Origen", mapAnnotations: { pins: [], areas: [], sceneLinks: [marker] } });
+    const mapC = createDefaultSceneMap({ id: "map-c", name: "Interno", mapAnnotations: { pins: [], areas: [], sceneLinks: [{ ...marker, id: "c", name: "Puerta C" }] } });
+    const free = syncRuntimeFieldsFromActiveMap({ ...createSceneWithMap(mapA), maps: [mapA, mapC] });
+    const original = kind === "internal"
+      ? connectInternalSceneLink(free, { sourceMapId: "map-a", sourceMarkerId: "a", targetMapId: "map-c", targetMarkerId: "c", scenePath: source, connectionId: "old" })
+      : syncRuntimeFieldsFromActiveMap({ ...free, maps: [{ ...mapA, mapAnnotations: { ...mapA.mapAnnotations, sceneLinks: [createReciprocalSceneLinkMarkers(marker, source, peer, target, "old")[0]] } }, mapC] });
+    const browser = createBrowserClient(new HttpTransport(vi.fn()), { selectScene: async () => null, sceneName: async () => null });
+    let failSave = kind === "internal";
+    const save = vi.fn<TtrpgApi["saveSceneToPath"]>(async (payload) => failSave ? { ok: false, error: "Guardado fallido" } : { ok: true, scene: parseSceneJson(JSON.stringify(payload)), filePath: source, warnings: [] });
+    const disconnect = vi.fn<TtrpgApi["disconnectSceneLink"]>().mockResolvedValueOnce({ ok: false, error: "Desconexión fallida" }).mockResolvedValueOnce({ ok: true, mapAnnotations: free.mapAnnotations });
+    const connect = vi.fn<TtrpgApi["connectSceneLink"]>(async () => ({ ok: true, mapAnnotations: { ...free.mapAnnotations, sceneLinks: [createReciprocalSceneLinkMarkers(marker, source, peer, target, "new")[0]] } }));
+    const client = createClient({ ...browser.client.api,
+      loadScene: async () => ({ ok: true, scene: original, filePath: source, warnings: [] }), saveSceneToPath: save,
+      selectSceneLinkTargetFile: async () => ({ ok: true, filePath: target }),
+      listSceneLinkCandidates: async () => ({ ok: true, candidate: { filePath: target, markers: [{ ...peer, available: true }] } }),
+      connectSceneLink: connect, disconnectSceneLink: disconnect, validateSceneLinks: async () => ({ ok: true, statuses: { a: { state: "valid" } } })
+    }, browser.client.capabilities);
+    await act(async () => root.render(<ClientProvider client={client}><App service={{ browser, confirmLeave: async () => null, logout: async () => {} }} /></ClientProvider>));
+    await click(element('[aria-label="Menu de escena"]')); await click(button("Cargar escena"));
+    await click(button("Mapa"));
+    const open = async () => { await click(button("Editar Puerta A")); if (kind === "internal") await click(button("Elegir escena del servicio")); };
+    const switchKind = async () => click(button(kind === "remote" ? "Conectar habitaciones" : "Conectar con esta escena"));
+    await open(); await switchKind();
+    expect(element('[role="alert"]', element('.scene-link-modal')).textContent).toContain("Usa Desligar");
+    expect(save).not.toHaveBeenCalled(); expect(connect).not.toHaveBeenCalled(); expect(disconnect).not.toHaveBeenCalled();
+    expect(props().mapAnnotations.sceneLinks[0].connection).toEqual(original.mapAnnotations.sceneLinks[0].connection);
+    await click(button("Desligar"));
+    expect(element('[role="alert"]', element('.scene-link-modal')).textContent).toContain("No se pudo desligar");
+    expect(props().mapAnnotations.sceneLinks[0].connection).toEqual(original.mapAnnotations.sceneLinks[0].connection);
+    await switchKind(); expect(connect).not.toHaveBeenCalled();
+    failSave = false;
+    await click(button("Desligar")); expect(props().mapAnnotations.sceneLinks[0].connection).toBeNull();
+    if (kind === "internal") {
+      const payload = save.mock.calls.at(-1)![0];
+      expect(payload.maps.every(map => map.mapAnnotations.sceneLinks.every(item => item.connection === null))).toBe(true);
+    }
+    await open(); await switchKind();
+    expect(host.querySelector('.scene-link-modal')).toBeNull();
+    expect(props().mapAnnotations.sceneLinks[0].connection?.peer).toMatchObject(kind === "remote" ? { mapId: "map-c", markerId: "c" } : { scenePath: target, markerId: "b" });
+  });
+
+  it("restaura foco al menú real después de cancelar el selector de servicio",async()=>{
+    HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
+    const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn(async()=>new Response(JSON.stringify({ok:true,scenes:[],total:0}),{headers:{"content-type":"application/json"}}))),broker);
+    await act(async()=>root.render(<><ClientProvider client={browser.client}><App service={{browser,confirmLeave:broker.leave,logout:async()=>{}}}/></ClientProvider><DialogHost broker={broker} browser={browser}/></>));
+    const summary=element('[aria-label="Menu de escena"]');await click(summary);await click(button("Cargar escena"));
+    expect(host.querySelector('dialog')).not.toBeNull();await click(button("Cancelar"));await act(async()=>vi.runAllTimers());expect(document.activeElement).toBe(summary);
+  });
+
+  it("devuelve foco al botón superior al cancelar y confirmar un nombre con busy",async()=>{
+    HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
+    const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn(async(path,init)=>{
+      if(String(path).includes("/scenes")){const body=JSON.parse(String(init?.body));return new Response(JSON.stringify({ok:true,resource:{id:"01010101-0101-4101-8101-010101010101",name:body.name,scene:body.scene,createdAt:"2026-10-29T00:00:00Z",updatedAt:"2026-10-29T00:00:00Z",warnings:[],missingImages:[]}}),{headers:{"content-type":"application/json"}});}
+      return new Response(JSON.stringify({ok:true,assets:[],templates:[]}),{headers:{"content-type":"application/json"}});
+    })),broker);
+    const client=createClient({...browser.client.api,openMapImage:async()=>({ok:true,imagePath:"asset:01010101-0101-4101-8101-010101010101",imageUrl:"/api/v1/assets/01010101-0101-4101-8101-010101010101"})},browser.client.capabilities);
+    await act(async()=>root.render(<><ClientProvider client={client}><App service={{browser,confirmLeave:broker.leave,logout:async()=>{}}}/></ClientProvider><DialogHost broker={broker} browser={browser}/></>));
+    await click(button("Agregar mapa"));const saveButton=element<HTMLButtonElement>('.workspace-header-actions [aria-label="Guardar escena"]');
+    await click(saveButton);expect(saveButton.disabled).toBe(true);await click(button("Cancelar"));await act(async()=>vi.runAllTimers());expect(document.activeElement).toBe(saveButton);
+    await click(saveButton);await click(button("Guardar",element('dialog')));await act(async()=>vi.runAllTimers());expect(saveButton.disabled).toBe(false);expect(document.activeElement).toBe(saveButton);
+    await click(saveButton);await act(async()=>vi.runAllTimers());expect(document.activeElement).toBe(saveButton);expect(host.textContent).toContain("Escena guardada");
+  });
+
 });
diff --git a/src/renderer/src/PlayerApp.tsx b/src/renderer/src/PlayerApp.tsx
index 590fbe8..b3ff0f1 100644
--- a/src/renderer/src/PlayerApp.tsx
+++ b/src/renderer/src/PlayerApp.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "./client/ClientProvider";
 import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
 import { Compass, Lock, Unlock, Wrench, ZoomIn, ZoomOut } from "lucide-react";
 import { createDefaultScene } from "../../domain/sessions/default-scene";
@@ -27,7 +28,8 @@ const EMPTY_ITEMS = [] as const;
 const EMPTY_MAP_ANNOTATIONS = { pins: EMPTY_ITEMS, areas: EMPTY_ITEMS, sceneLinks: EMPTY_ITEMS };
 const EMPTY_LINK_STATUSES = {};
 
-export function PlayerApp(): JSX.Element {
+export function PlayerApp({ unavailableMessage }: { readonly unavailableMessage?: string } = {}): JSX.Element {
+  const playerApi = useTtrpgApi("player");
   const shellRef = useRef<HTMLElement | null>(null);
   const viewportRef = useRef<MapViewportHandle | null>(null);
   const [showTools, setShowTools] = useState(true);
@@ -61,6 +63,7 @@ export function PlayerApp(): JSX.Element {
   const cameraReportRevisionRef = useRef(0);
   const cameraReportTimerRef = useRef<number | null>(null);
   const isCameraReportInFlightRef = useRef(false);
+  const cameraReporterGenerationRef = useRef(0);
   const isCameraReporterActiveRef = useRef(true);
   const pendingCameraReportRef = useRef<{
     readonly camera: ViewportCameraSnapshot;
@@ -77,25 +80,28 @@ export function PlayerApp(): JSX.Element {
     }
     const pending = pendingCameraReportRef.current;
     if (
+      !isCameraReporterActiveRef.current ||
       pending === null ||
-      window.ttrpg === undefined ||
+      playerApi === undefined ||
       isCameraReportInFlightRef.current
     ) {
       return;
     }
 
+    const generation = cameraReporterGenerationRef.current;
     pendingCameraReportRef.current = null;
     isCameraReportInFlightRef.current = true;
     const reportRevision = cameraReportRevisionRef.current + 1;
     cameraReportRevisionRef.current = reportRevision;
-    void window.ttrpg.reportPlayerCamera({
+    void playerApi.reportPlayerCamera({
       reportRevision,
       acknowledgedCommandRevision: acknowledgedCameraCommandRevisionRef.current,
       camera: pending.camera,
       origin: pending.origin,
       final: pending.final,
       ...(pending.viewport === null ? {} : { viewport: pending.viewport })
-    }).finally(() => {
+    }).catch(() => { /* A failed report must not block later camera updates. */ }).finally(() => {
+      if (generation !== cameraReporterGenerationRef.current) return;
       isCameraReportInFlightRef.current = false;
       if (
         isCameraReporterActiveRef.current &&
@@ -105,7 +111,7 @@ export function PlayerApp(): JSX.Element {
         cameraReportTimerRef.current = window.setTimeout(flushPlayerCameraReport, 0);
       }
     });
-  }, []);
+  }, [playerApi]);
 
   const queuePlayerCameraReport = useCallback(
     (
@@ -216,28 +222,32 @@ export function PlayerApp(): JSX.Element {
   useEffect(() => {
     let mounted = true;
     isCameraReporterActiveRef.current = true;
-    const offScene = window.ttrpg?.onPlayerScene((snapshot) => {
+    lastCameraCommandRevisionRef.current = -1;
+    acknowledgedCameraCommandRevisionRef.current = null;
+    hasInitializedCameraRef.current = false;
+    setIsHydrated(false);
+    const offScene = playerApi?.onPlayerScene((snapshot) => {
       if (mounted) {
         applySnapshot(snapshot);
       }
     });
-    const offPointer = window.ttrpg?.onPlayerPointer((pointer) => {
+    const offPointer = playerApi?.onPlayerPointer((pointer) => {
       if (mounted) {
         setArcanePointerEvent(pointer);
       }
     });
-    const offInformationAreaHighlight = window.ttrpg?.onPlayerInformationAreaHighlight((highlight) => {
+    const offInformationAreaHighlight = playerApi?.onPlayerInformationAreaHighlight((highlight) => {
       if (mounted) {
         setInformationAreaHighlightEvent(highlight);
       }
     });
-    const offCameraCommand = window.ttrpg?.onPlayerCameraCommand((command) => {
+    const offCameraCommand = playerApi?.onPlayerCameraCommand((command) => {
       if (mounted) {
         applyPlayerCameraCommand(command);
       }
     });
 
-    void window.ttrpg?.getPlayerWindowState().then((state) => {
+    void playerApi?.getPlayerWindowState().then((state) => {
       if (!mounted) {
         return;
       }
@@ -258,6 +268,9 @@ export function PlayerApp(): JSX.Element {
     return () => {
       mounted = false;
       isCameraReporterActiveRef.current = false;
+      cameraReporterGenerationRef.current++;
+      isCameraReportInFlightRef.current = false;
+      pendingCameraReportRef.current = null;
       offScene?.();
       offPointer?.();
       offInformationAreaHighlight?.();
@@ -267,7 +280,7 @@ export function PlayerApp(): JSX.Element {
         cameraReportTimerRef.current = null;
       }
     };
-  }, [applyPlayerCameraCommand, applySnapshot]);
+  }, [applyPlayerCameraCommand, applySnapshot, playerApi]);
 
   useEffect(() => {
     updatePlayerViewportReport();
@@ -332,21 +345,21 @@ export function PlayerApp(): JSX.Element {
     if (!isCameraReporterActiveRef.current || viewportIdentity !== viewportIdentityRef.current ||
       imageUrl !== requestedImageUrlRef.current) return;
     setIsViewportReady(true);
-    void window.ttrpg?.reportPlayerMapImageStatus({ imageUrl, ok: true });
-  }, [viewportIdentity]);
+    void playerApi?.reportPlayerMapImageStatus({ imageUrl, ok: true });
+  }, [viewportIdentity, playerApi]);
   const handlePlayerMapError = useCallback(({ imageUrl, error }: { imageUrl: string; error: string }): void => {
     if (!isCameraReporterActiveRef.current || viewportIdentity !== viewportIdentityRef.current ||
       imageUrl !== requestedImageUrlRef.current) return;
     setIsViewportReady(true);
-    void window.ttrpg?.reportPlayerMapImageStatus({ imageUrl, ok: false, error: error.slice(0, 500) });
-  }, [viewportIdentity]);
+    void playerApi?.reportPlayerMapImageStatus({ imageUrl, ok: false, error: error.slice(0, 500) });
+  }, [viewportIdentity, playerApi]);
 
   useEffect(() => {
     if (isHydrated && isViewportReady) {
-      void window.ttrpg?.notifyPlayerContentReady();
+      void playerApi?.notifyPlayerContentReady();
       queuePlayerCameraReport(latestPlayerCameraRef.current, "initialization", true);
     }
-  }, [isHydrated, isViewportReady, queuePlayerCameraReport]);
+  }, [isHydrated, isViewportReady, queuePlayerCameraReport, playerApi]);
 
   const diceEnvelope = usePublicDice(scene.activeMapId, viewportIdentity ?? "", isHydrated && isViewportReady);
   const { sizes: diceSizes } = useDiceSizes();
@@ -490,9 +503,9 @@ export function PlayerApp(): JSX.Element {
       {isHydrated ? <SceneCountersOverlay counters={scene.counters} viewRole="player" /> : null}
       {!isViewportReady && (
         <div className="player-loading" role="status" aria-live="polite">
-          <div className="player-loading__mark" aria-hidden="true" />
-          <strong>Cargando vista de jugador</strong>
-          <span>{isHydrated ? "Preparando mapa y efectos..." : "Sincronizando escena..."}</span>
+          {!unavailableMessage && <div className="player-loading__mark" aria-hidden="true" />}
+          <strong>{unavailableMessage ? "Acceso jugador" : "Cargando vista de jugador"}</strong>
+          <span>{unavailableMessage ?? (isHydrated ? "Preparando mapa y efectos..." : "Sincronizando escena...")}</span>
         </div>
       )}
       <div className="player-controls" aria-label="Controles de vista de jugador">
diff --git a/src/renderer/src/components/annotations/SceneLinkModal.tsx b/src/renderer/src/components/annotations/SceneLinkModal.tsx
index 2ae05f2..343c3be 100644
--- a/src/renderer/src/components/annotations/SceneLinkModal.tsx
+++ b/src/renderer/src/components/annotations/SceneLinkModal.tsx
@@ -1,7 +1,9 @@
-import { useState, type JSX } from "react";
+import { rememberDialogFocus, restoreDialogFocus } from "../../client/dialog-focus";
+import { useEffect, useRef, useState, type JSX } from "react";
 import { ExternalLink, Link2, MapPinned, Save, Unlink, X } from "lucide-react";
 import type { InternalSceneLinkCandidateMap } from "../../../../domain/annotations/internal-scene-links";
 import type {
+  SceneLinkCandidateFile,
   MapSceneLinkMarker,
   SceneLinkValidationStatus
 } from "../../../../domain/annotations/scene-navigation-links";
@@ -11,6 +13,7 @@ interface SceneLinkModalProps {
   readonly status: SceneLinkValidationStatus;
   readonly currentScenePath: string | null;
   readonly candidateMaps: readonly InternalSceneLinkCandidateMap[];
+  readonly remote?: { select: () => Promise<(SceneLinkCandidateFile & { name: string }) | null>; connect: (scenePath: string, markerId: string) => Promise<boolean> };
   readonly onRename: (name: string) => Promise<boolean>;
   readonly onConnect: (targetMapId: string, targetMarkerId: string) => Promise<boolean>;
   readonly onDisconnect: () => Promise<boolean>;
@@ -23,12 +26,17 @@ export function SceneLinkModal({
   status,
   currentScenePath,
   candidateMaps,
+  remote,
   onRename,
   onConnect,
   onDisconnect,
   onNavigate,
   onClose
 }: SceneLinkModalProps): JSX.Element {
+  const panel=useRef<HTMLElement>(null);
+  const [remoteScene,setRemoteScene]=useState<(SceneLinkCandidateFile & {name:string})|null>(null);
+  const [remoteMarker,setRemoteMarker]=useState("");
+  useEffect(()=>{const trigger=document.activeElement;panel.current?.querySelector<HTMLInputElement>("input")?.focus();return()=>restoreDialogFocus(trigger);},[]);
   const [name, setName] = useState(marker.name);
   const [selectedMapId, setSelectedMapId] = useState(candidateMaps[0]?.id ?? "");
   const [selectedMarkerId, setSelectedMarkerId] = useState(candidateMaps[0]?.markers.find((item) => item.available)?.id ?? "");
@@ -37,12 +45,29 @@ export function SceneLinkModal({
   const selectedMap = candidateMaps.find((map) => map.id === selectedMapId) ?? null;
   const availableMarkers = selectedMap?.markers.filter((item) => item.available) ?? [];
 
+  const selectRemote = async (): Promise<void> => {
+    if (!remote) return;
+    setBusy(true);setError(null);
+    try {const selected=await remote.select();if(selected){setRemoteScene(selected);setRemoteMarker(selected.markers.find(item=>item.available)?.id??"");}}
+    catch(error){setError(error instanceof Error?error.message:"No se pudo cargar el destino. Vuelve a elegir la escena.");}
+    finally{setBusy(false);}
+  };
+  const connectRemote = async (): Promise<void> => {
+    if(!remote||!remoteScene||!remoteMarker)return;
+    setBusy(true);setError(null);
+    try {if(await remote.connect(remoteScene.filePath,remoteMarker))onClose();else setError("No se pudo guardar la conexión. Conservamos el trabajo; reintenta o elige otro destino.");}
+    catch(error){setError(error instanceof Error?error.message:"No se pudo conectar. Reintenta.");}
+    finally{setBusy(false);}
+  };
   const connect = async (): Promise<void> => {
     if (selectedMapId === "" || selectedMarkerId === "") return;
     setBusy(true);
     setError(null);
     try {
       if (await onConnect(selectedMapId, selectedMarkerId)) onClose();
+      else setError("No se pudo guardar la conexión. Conservamos el enlace anterior; vuelve a intentarlo.");
+    } catch (connectError) {
+      setError(connectError instanceof Error ? connectError.message : "No se pudo conectar. Vuelve a intentarlo.");
     } finally {
       setBusy(false);
     }
@@ -67,14 +92,21 @@ export function SceneLinkModal({
     setError(null);
     try {
       if (await onDisconnect()) onClose();
+      else setError("No se pudo desligar. Conservamos la conexión; vuelve a intentarlo antes de cambiar el destino.");
+    } catch (disconnectError) {
+      setError(disconnectError instanceof Error ? disconnectError.message : "No se pudo desligar. Conservamos la conexión.");
     } finally {
       setBusy(false);
     }
   };
 
   return (
-    <div className="modal-backdrop scene-link-backdrop" onClick={onClose}>
-      <section className="scene-link-modal" role="dialog" aria-modal="true" aria-labelledby="scene-link-title" onClick={(event) => event.stopPropagation()}>
+    <div className="modal-backdrop scene-link-backdrop" onClick={()=>{if(!busy)onClose();}}>
+      <section ref={panel} onKeyDown={event=>{
+        event.stopPropagation();
+        if(event.key==="Escape"){event.preventDefault();if(!busy)onClose();}
+        if(event.key==="Tab"){const controls=[...panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
+      }} className="scene-link-modal" role="dialog" aria-modal="true" aria-labelledby="scene-link-title" onClick={(event) => event.stopPropagation()}>
         <header className="scene-link-modal__header">
           <div className="scene-link-modal__identity">
             <span className="scene-link-modal__icon"><MapPinned aria-hidden="true" /></span>
@@ -83,7 +115,7 @@ export function SceneLinkModal({
               <h2 id="scene-link-title">{marker.name}</h2>
             </div>
           </div>
-          <button type="button" className="scene-link-modal__close" onClick={onClose} aria-label="Cerrar">
+          <button type="button" className="scene-link-modal__close" disabled={busy} onClick={onClose} aria-label="Cerrar">
             <X aria-hidden="true" />
           </button>
         </header>
@@ -97,7 +129,7 @@ export function SceneLinkModal({
               </div>
             </div>
             <div className="scene-link-name-row">
-              <input aria-label="Nombre del punto" value={name} maxLength={120} onChange={(event) => setName(event.currentTarget.value)} />
+              <input aria-label="Nombre del punto" value={name} disabled={busy} maxLength={120} onChange={(event) => setName(event.currentTarget.value)} />
               <button
                 type="button"
                 title="Guardar nombre"
@@ -134,7 +166,7 @@ export function SceneLinkModal({
             ) : null}
 
             {candidateMaps.length === 0 ? (
-              <p className="sidebar-hint">Agrega otro mapa a la escena para poder enlazar este punto.</p>
+              <p className="sidebar-hint">Para enlazar dentro de esta escena, agrega otro mapa.</p>
             ) : (
               <div className="scene-link-candidates">
                 <label>
@@ -174,12 +206,27 @@ export function SceneLinkModal({
               </div>
             )}
           </section>
+          {remote&&<section className="scene-link-panel scene-link-remote">
+            <h3>Otra escena guardada</h3>
+            <p>Se guardarán los cambios de esta escena antes de conectar. Puedes reparar un destino ausente eligiendo uno del servicio.</p>
+            <button type="button" disabled={busy} onClick={event=>{rememberDialogFocus(event.currentTarget);void selectRemote();}}>Elegir escena del servicio</button>
+            {busy&&<p role="status">Preparando conexión…</p>}
+            {remoteScene&&<div className="scene-link-candidates">
+              <p className="service-selected-scene">{remoteScene.name}</p>
+              <label>Marcador de la escena<select aria-label="Marcador de la escena" disabled={busy} value={remoteMarker} onChange={event=>setRemoteMarker(event.target.value)}>
+                <option value="">Selecciona un marcador</option>
+                {remoteScene.markers.map(item=><option key={item.id} value={item.id} disabled={!item.available}>{item.name}{item.available?"":" (ocupado)"}</option>)}
+              </select></label>
+              {!remoteScene.markers.some(item=>item.available)&&<p>No hay marcadores libres. Elige otra escena o libera un marcador en ella.</p>}
+              <button type="button" disabled={busy||!remoteMarker} onClick={()=>void connectRemote()}>Conectar con esta escena</button>
+            </div>}
+          </section>}
         </div>
 
-        {error !== null ? <p className="form-error scene-link-modal__error">{error}</p> : null}
+        {error !== null ? <p role="alert" className="form-error scene-link-modal__error">{error}</p> : null}
 
         <footer className="scene-link-modal__footer">
-          <button type="button" onClick={onClose}>Cancelar</button>
+          <button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
           <div>
             {marker.connection !== null ? (
               <>
diff --git a/src/renderer/src/components/aside/ImagePicker.tsx b/src/renderer/src/components/aside/ImagePicker.tsx
index 3666516..80edfda 100644
--- a/src/renderer/src/components/aside/ImagePicker.tsx
+++ b/src/renderer/src/components/aside/ImagePicker.tsx
@@ -1,4 +1,5 @@
-import { useCallback, type JSX } from "react";
+import { useTtrpgApi } from "../../client/ClientProvider";
+import { useCallback, useState, type JSX } from "react";
 
 interface ImagePickerProps {
   readonly imageUrl: string | null;
@@ -7,15 +8,19 @@ interface ImagePickerProps {
 }
 
 export function ImagePicker({ imageUrl, onImageSelected, onImageRemoved }: ImagePickerProps): JSX.Element {
+  const [error, setError] = useState("");
+  const imagesApi = useTtrpgApi("images");
   const handleClick = useCallback(async () => {
-    const result = await window.ttrpg?.openAsideImage();
+    const result = await imagesApi?.openAsideImage();
+    if (result && !result.ok) setError(result.error);
     if (result?.ok) {
-      const resolvedUrl = await window.ttrpg?.resolveAsideUrl(result.imagePath);
+      setError("");
+      const resolvedUrl = await imagesApi?.resolveAsideUrl(result.imagePath);
       if (resolvedUrl !== null && resolvedUrl !== undefined) {
         onImageSelected(result.imagePath, resolvedUrl);
       }
     }
-  }, [onImageSelected]);
+  }, [onImageSelected, imagesApi]);
 
   const handleDrop = useCallback(
     async (e: React.DragEvent<HTMLDivElement>) => {
@@ -24,12 +29,12 @@ export function ImagePicker({ imageUrl, onImageSelected, onImageRemoved }: Image
       if (file === undefined) return;
       const path = (file as unknown as { path?: string }).path;
       if (typeof path !== "string") return;
-      const resolvedUrl = await window.ttrpg?.resolveAsideUrl(path);
+      const resolvedUrl = await imagesApi?.resolveAsideUrl(path);
       if (resolvedUrl !== null && resolvedUrl !== undefined) {
         onImageSelected(path, resolvedUrl);
       }
     },
-    [onImageSelected]
+    [onImageSelected, imagesApi]
   );
 
   const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
@@ -38,7 +43,10 @@ export function ImagePicker({ imageUrl, onImageSelected, onImageRemoved }: Image
 
   return (
     <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
+      {error && <p role="alert">{error}</p>}
       <div
+        role="button" tabIndex={0} aria-label="Seleccionar imagen"
+        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void handleClick(); } }}
         onClick={() => { void handleClick(); }}
         onDrop={(e) => { void handleDrop(e); }}
         onDragOver={handleDragOver}
diff --git a/src/renderer/src/components/aside/ModalBackdrop.tsx b/src/renderer/src/components/aside/ModalBackdrop.tsx
index 1de9f9b..e151e7b 100644
--- a/src/renderer/src/components/aside/ModalBackdrop.tsx
+++ b/src/renderer/src/components/aside/ModalBackdrop.tsx
@@ -1,3 +1,4 @@
+import { usePortalTarget } from "../../client/PortalTarget";
 import { type JSX, type ReactNode } from "react";
 import { createPortal } from "react-dom";
 
@@ -13,6 +14,7 @@ interface ModalBackdropProps {
 }
 
 export function ModalBackdrop({ onClose, children, wide = false, large = false, fitContent = false, documentLayout = false }: ModalBackdropProps): JSX.Element {
+  const portalTarget = usePortalTarget();
   const panelStyle: React.CSSProperties = documentLayout
     ? {
         width: "min(1240px, calc(100vw - 48px))",
@@ -81,6 +83,6 @@ export function ModalBackdrop({ onClose, children, wide = false, large = false,
         {children}
       </div>
     </div>,
-    document.body
+    portalTarget
   );
 }
diff --git a/src/renderer/src/components/aside/NoteEditor.tsx b/src/renderer/src/components/aside/NoteEditor.tsx
index 0635173..1ec2d90 100644
--- a/src/renderer/src/components/aside/NoteEditor.tsx
+++ b/src/renderer/src/components/aside/NoteEditor.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi, useTtrpgClient } from "../../client/ClientProvider";
 import { useEffect, useMemo, useState, type FormEvent, type JSX, type MouseEvent, type ReactNode } from "react";
 import {
   BetweenHorizontalEnd,
@@ -81,6 +82,9 @@ export function NoteEditor({
   titleField,
   variant = "compact"
 }: NoteEditorProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
+  const serviceImages = useTtrpgClient()?.assetReferences === "service";
+  const [imageError, setImageError] = useState("");
   const [linkEditorOpen, setLinkEditorOpen] = useState(false);
   const [linkDraft, setLinkDraft] = useState("");
   const extensions = useMemo(() => createRichTextExtensions(placeholder), [placeholder]);
@@ -169,7 +173,17 @@ export function NoteEditor({
 
   return (
     <section className={`note-editor note-editor--${variant}`} onClick={focusEditorFromDocumentClick}>
+      {imageError && <p role="alert">{imageError}</p>}
       <div className="note-editor__toolbar" role="toolbar" aria-label="Formato del documento" onClick={(event) => event.stopPropagation()}>
+        {serviceImages && imagesApi && <ToolbarButton label="Agregar o reemplazar imagen" active={false} onClick={() => {
+          const currentEditor = editor;
+          void imagesApi.openAsideImage().then(result => {
+            if (!currentEditor || currentEditor.isDestroyed) return;
+            if (!result.ok) { setImageError(result.error); return; }
+            setImageError("");
+            currentEditor.chain().focus().insertContent({ type: "image", attrs: { src: result.imagePath, alt: "Imagen de nota" } }).run();
+          }).catch(() => setImageError("No se pudo cargar la imagen. Reintenta."));
+        }}>Imagen</ToolbarButton>}
         <ToolbarButton label="Encabezado 1" active={toolbarState.heading1} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
           <Heading1 aria-hidden="true" />
         </ToolbarButton>
diff --git a/src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx b/src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx
index 5adeaf7..26b720d 100644
--- a/src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx
+++ b/src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx
@@ -4,6 +4,7 @@ import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import type { ReplacementDraft } from "../../hooks/useMapImageReplacement";
+import { PortalTargetProvider } from "../../client/PortalTarget";
 import { ReplaceMapImageModal } from "./ReplaceMapImageModal";
 
 function createDraft(overrides: Partial<ReplacementDraft> = {}): ReplacementDraft {
@@ -179,4 +180,15 @@ describe("ReplaceMapImageModal", () => {
     expect(onCancel).toHaveBeenCalledOnce();
     expect(onConfirm).not.toHaveBeenCalled();
   });
+  it("oculta también preview y suspende atajos cuando la sesión bloquea su contenedor",()=>{
+    const protectedRoot=document.createElement("div");document.body.append(protectedRoot);
+    try {
+      act(()=>root.render(<PortalTargetProvider target={protectedRoot}><ReplaceMapImageModal draft={createDraft()} error={null} onConfirm={onConfirm} onCancel={onCancel}/></PortalTargetProvider>));
+      protectedRoot.hidden=true;protectedRoot.setAttribute("inert","");
+      expect(document.querySelector('[role="dialog"]')?.closest('[hidden][inert]')).toBe(protectedRoot);
+      const key=new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true});document.dispatchEvent(key);expect(onCancel).not.toHaveBeenCalled();expect(key.defaultPrevented).toBe(false);
+      protectedRoot.hidden=false;protectedRoot.removeAttribute("inert");act(()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true})));expect(onCancel).toHaveBeenCalledOnce();
+    } finally {protectedRoot.remove();}
+  });
+
 });
diff --git a/src/renderer/src/components/aside/ReplaceMapImageModal.tsx b/src/renderer/src/components/aside/ReplaceMapImageModal.tsx
index 21e742d..559836a 100644
--- a/src/renderer/src/components/aside/ReplaceMapImageModal.tsx
+++ b/src/renderer/src/components/aside/ReplaceMapImageModal.tsx
@@ -1,3 +1,4 @@
+import { usePortalTarget } from "../../client/PortalTarget";
 import { ImageUp, X } from "lucide-react";
 import { useEffect, useRef, useState, type JSX } from "react";
 import { createPortal } from "react-dom";
@@ -13,6 +14,7 @@ interface Props {
 }
 
 export function ReplaceMapImageModal({ draft, error, onConfirm, onCancel }: Props): JSX.Element {
+  const portalTarget = usePortalTarget();
   const [policy, setPolicy] = useState<MapImageReplacementPolicy>(draft.preserveError === null ? "preserve-world-size" : "keep-scale");
   const [acknowledged, setAcknowledged] = useState(false);
   const dialog = useRef<HTMLElement | null>(null);
@@ -24,6 +26,7 @@ export function ReplaceMapImageModal({ draft, error, onConfirm, onCancel }: Prop
     const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
     dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
     function onKeyDown(event: KeyboardEvent): void {
+      if (dialog.current?.closest("[hidden], [inert]")) return;
       event.stopPropagation();
       if (event.key === "Escape") { event.preventDefault(); onCancel(); return; }
       if (event.key !== "Tab") return;
@@ -60,7 +63,7 @@ export function ReplaceMapImageModal({ draft, error, onConfirm, onCancel }: Prop
           <button type="button" className="map-image-replacement__apply" disabled={needsAcknowledgement && !acknowledged} onClick={() => onConfirm(policy)}><ImageUp aria-hidden="true" />Actualizar imagen</button>
         </footer>
       </section>
-    </div>, document.body
+    </div>, portalTarget
   );
 }
 
diff --git a/src/renderer/src/components/aside/markdown.ts b/src/renderer/src/components/aside/markdown.ts
index b2cc696..092180c 100644
--- a/src/renderer/src/components/aside/markdown.ts
+++ b/src/renderer/src/components/aside/markdown.ts
@@ -1,3 +1,4 @@
+import { assetUrl } from "../../../../shared/contracts/service-references";
 import { marked, Renderer } from "marked";
 import DOMPurify from "dompurify";
 import { encodeCalloutDirectivesAsBlockquotes, upgradeCalloutBlockquotes } from "./callout";
@@ -8,6 +9,11 @@ import {
 
 const safeRenderer = new Renderer();
 safeRenderer.html = (): string => "";
+safeRenderer.image = ({ href, text }): string => {
+  const url = assetUrl(href);
+  const escaped = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
+  return url ? `<img src="${url}" alt="${escaped(text)}">` : `<span>Imagen ausente: ${escaped(href)}</span>`;
+};
 
 const UNDERLINE_OPEN_TOKEN = "TTRPGUNDERLINEOPEN";
 const UNDERLINE_CLOSE_TOKEN = "TTRPGUNDERLINECLOSE";
diff --git a/src/renderer/src/components/aside/rich-text-extensions.ts b/src/renderer/src/components/aside/rich-text-extensions.ts
index 3cdf5e3..b03d821 100644
--- a/src/renderer/src/components/aside/rich-text-extensions.ts
+++ b/src/renderer/src/components/aside/rich-text-extensions.ts
@@ -1,3 +1,4 @@
+import { ServiceImage } from "./ServiceImageExtension";
 import type { Extensions } from "@tiptap/core";
 import { TaskItem, TaskList } from "@tiptap/extension-list";
 import Placeholder from "@tiptap/extension-placeholder";
@@ -21,6 +22,7 @@ export function createRichTextExtensions(placeholder: string): Extensions {
     TaskItem.configure({ nested: true }),
     TableTaskCheckbox,
     Callout,
+    ServiceImage,
     Markdown.configure({ transformPastedText: false, transformCopiedText: true })
   ];
 }
diff --git a/src/renderer/src/components/dice/DicePanel.tsx b/src/renderer/src/components/dice/DicePanel.tsx
index 5f3cc7f..2a96130 100644
--- a/src/renderer/src/components/dice/DicePanel.tsx
+++ b/src/renderer/src/components/dice/DicePanel.tsx
@@ -1,3 +1,4 @@
+import { usePortalTarget } from "../../client/PortalTarget";
 import { ArrowLeft, ArrowRight, Dices, Diamond, Eye, EyeOff, Gem, Hexagon, Minus, Pentagon, Percent, Plus, RotateCcw, Square, SquareFunction, Trash2, Triangle, Volume2, VolumeX, X } from "lucide-react";
 import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from "react";
 import { createPortal } from "react-dom";
@@ -12,6 +13,7 @@ type DiceController = ReturnType<typeof useDiceSession>;
 const ICONS = { d4: Triangle, d6: Square, d8: Diamond, d10: Gem, d12: Pentagon, "d%": Percent };
 
 export function DicePanel({ controller }: { controller: DiceController }): JSX.Element {
+  const portalTarget = usePortalTarget();
   const { draft, state, busy, ready, preparing, error, updateDraft } = controller;
   const [activeGroup, setActiveGroup] = useState<DamageType>("none");
   const [askD20, setAskD20] = useState(false);
@@ -103,7 +105,7 @@ export function DicePanel({ controller }: { controller: DiceController }): JSX.E
       </li>)}</ol>
       {pages > 1 && <nav className="dice-history-pages" aria-label="Paginas del historial"><button type="button" className="dice-icon-button" aria-label="Tiradas mas recientes" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft size={16} /></button><span>{currentPage + 1} / {pages}</span><button type="button" className="dice-icon-button" aria-label="Tiradas anteriores" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}><ArrowRight size={16} /></button></nav>}
     </section>
-    {askD20 && createPortal(<D20RollModeDialog draft={draft} onClose={() => setAskD20(false)} onRoll={mode => { setAskD20(false); launch(mode); }} />, document.body)}
+    {askD20 && createPortal(<D20RollModeDialog draft={draft} onClose={() => setAskD20(false)} onRoll={mode => { setAskD20(false); launch(mode); }} />, portalTarget)}
   </div>;
 }
 
diff --git a/src/renderer/src/components/workspace/WorkspaceHeader.tsx b/src/renderer/src/components/workspace/WorkspaceHeader.tsx
index 4d085b2..d4af510 100644
--- a/src/renderer/src/components/workspace/WorkspaceHeader.tsx
+++ b/src/renderer/src/components/workspace/WorkspaceHeader.tsx
@@ -1,8 +1,10 @@
+import { rememberDialogFocus, restoreDialogFocus } from "../../client/dialog-focus";
 import { useEffect, useRef, type JSX } from "react";
 import { ChevronDown, Dices, FilePlus, FolderOpen, Monitor, PanelLeft, PanelRight, Save, Swords, Timer } from "lucide-react";
 import logoUrl from "../../../../../assets/logo/ttrpg-effects-icon.png";
 
 interface WorkspaceHeaderProps {
+  readonly serviceActions?: { onImport: () => void; onExport: () => void; onLogout: () => void; onTemplates: () => void };
   readonly sceneName: string;
   readonly mapName: string;
   readonly busy: boolean;
@@ -12,7 +14,7 @@ interface WorkspaceHeaderProps {
   readonly inspectorVisible: boolean;
   readonly onNew: () => void;
   readonly onLoad: () => void;
-  readonly onSave: () => void;
+  readonly onSave: () => void | Promise<void>;
   readonly onPlayer: () => void;
   readonly onBattle: () => void;
   readonly onCounters: () => void;
@@ -31,6 +33,7 @@ export function WorkspaceHeader(props: WorkspaceHeaderProps): JSX.Element {
     return () => document.removeEventListener("pointerdown", closeOutside);
   }, []);
   const run = (action: () => void): void => {
+    if (props.serviceActions) rememberDialogFocus(menu.current?.querySelector("summary") ?? null);
     if (menu.current) menu.current.open = false;
     action();
   };
@@ -49,10 +52,17 @@ export function WorkspaceHeader(props: WorkspaceHeaderProps): JSX.Element {
         <button type="button" disabled={props.busy || !props.canCreate} onClick={() => run(props.onNew)}><FilePlus size={16} />Nueva escena</button>
         <button type="button" disabled={props.busy} onClick={() => run(props.onLoad)}><FolderOpen size={16} />Cargar escena</button>
         <button type="button" disabled={props.busy} onClick={() => run(props.onSave)}><Save size={16} />Guardar escena</button>
+        {props.serviceActions && <>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onImport)}>Importar archivo .ttrpgscene</button>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onExport)}>Exportar archivo .ttrpgscene</button>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onTemplates)}>Administrar plantillas</button>
+          <p className="service-menu-note">Servicio privado · DM<br />Proyección y dados compartidos pendientes.</p>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onLogout)}>Cerrar sesión</button>
+        </>}
       </div>
     </details>
     <div className="workspace-header-actions">
-      <button type="button" className="workspace-icon" title="Guardar escena" aria-label="Guardar escena" disabled={props.busy} onClick={props.onSave}><Save size={17} /></button>
+      <button type="button" className="workspace-icon" title="Guardar escena" aria-label="Guardar escena" disabled={props.busy} onClick={event => { const target=event.currentTarget; if (props.serviceActions) rememberDialogFocus(target); void Promise.resolve(props.onSave()).finally(() => { if (props.serviceActions) restoreDialogFocus(target); }); }}><Save size={17} /></button>
       <button type="button" className="workspace-icon" title="Batalla" aria-label="Batalla" aria-pressed={props.battleActive} disabled={props.busy} onClick={props.onBattle}><Swords size={17} /></button>
       <button type="button" className="workspace-icon" title="Contadores" aria-label="Contadores" disabled={props.busy} onClick={props.onCounters}><Timer size={17} /></button>
       <button type="button" className="workspace-icon" title="Dados" aria-label="Abrir dados" onClick={props.onDice}><Dices size={17} /></button>
diff --git a/src/renderer/src/styles.css b/src/renderer/src/styles.css
index 2456d81..f828a3f 100644
--- a/src/renderer/src/styles.css
+++ b/src/renderer/src/styles.css
@@ -4288,6 +4288,12 @@ body {
   background: transparent;
 }
 
+.scene-link-backdrop {
+  /* Above the workspace header (30), inside the protected session tree. */
+  position: fixed;
+  z-index: 40;
+}
+
 .scene-link-modal {
   display: grid;
   grid-template-rows: auto minmax(0, 1fr) auto auto;

```
