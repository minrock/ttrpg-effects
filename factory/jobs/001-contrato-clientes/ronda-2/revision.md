# Identidad de la revisión

Rama autorizada: `feature/fabrica-software`. Sin commits ni merge.

Base Git: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. HEAD actual: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

Se revisa el código de esta spec sobre cambios anteriores no integrados; base-archivos.json identifica su punto de partida. huellas.json congela el contenido de código/config/docs al abrir esta ronda. Los informes de fábrica quedan fuera de las huellas.

## Archivos cambiados por esta spec

- `CHANGELOG.md`
- `README.md`
- `docs/client-architecture.md`
- `package.json`
- `src/preload/dice-api.ts`
- `src/preload/index.test.ts`
- `src/preload/index.ts`
- `src/preload/ttrpg-api.d.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/App.workspace.test.tsx`
- `src/renderer/src/PlayerApp.tsx`
- `src/renderer/src/client/ClientProvider.test.tsx`
- `src/renderer/src/client/ClientProvider.tsx`
- `src/renderer/src/components/aside/ImagePicker.tsx`
- `src/renderer/src/components/aside/LibraryClientLifecycle.test.tsx`
- `src/renderer/src/components/aside/MonsterDetailModal.tsx`
- `src/renderer/src/components/aside/MonsterLibraryModal.tsx`
- `src/renderer/src/components/aside/MonsterModal.tsx`
- `src/renderer/src/components/aside/MonsterSection.tsx`
- `src/renderer/src/components/aside/NpcDetailModal.tsx`
- `src/renderer/src/components/aside/NpcLibraryModal.tsx`
- `src/renderer/src/components/aside/NpcModal.tsx`
- `src/renderer/src/components/aside/NpcSection.tsx`
- `src/renderer/src/components/aside/PlayerAsideOverlay.tsx`
- `src/renderer/src/components/aside/PlayerCharacterDetailModal.tsx`
- `src/renderer/src/components/aside/PlayerCharacterLibraryModal.tsx`
- `src/renderer/src/components/aside/PlayerCharacterSection.tsx`
- `src/renderer/src/components/combat/CombatSetupModal.tsx`
- `src/renderer/src/components/combat/CombatTurnBar.tsx`
- `src/renderer/src/components/dice/DiceOverlay.tsx`
- `src/renderer/src/hooks/useDiceSession.ts`
- `src/renderer/src/hooks/useDiceSizes.ts`
- `src/renderer/src/hooks/useMapImageReplacement.ts`
- `src/renderer/src/main.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/dice-api.ts`
- `src/shared/api/ttrpg-api.ts`

## Diff de archivos rastreados contra HEAD

Los archivos nuevos se inspeccionan directamente; sus huellas están registradas.

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index e01fd96..9871d02 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,25 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
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
diff --git a/README.md b/README.md
index 9e00e27..37f9393 100644
--- a/README.md
+++ b/README.md
@@ -10,6 +10,16 @@ Player View mantiene la escena del DM protegida y agrega mediciones de linea/cam
 
 El salto mayor es una decision de lanzamiento; las escenas `.ttrpgscene` existentes siguen siendo compatibles. Alcance y verificaciones en [spec 39](specs/39-vtt-interface/spec.md) y su [plan](specs/39-vtt-interface/plan.md).
 
+## Fábrica de software con Codex
+
+Usa `$factory <funcionalidad>` para especificar, construir y revisar un cambio con subagentes. `$factory siguiente` toma un elemento de la cola; `$factory aprobar <id>` autoriza integrar un trabajo preparado y `$factory rehacer <id> <nota>` abre otro ciclo de correcciones. Commits y merge respetan la autorización explícita indicada en `AGENTS.md`.
+
+Para ver el tablero, ejecuta `python3 -m http.server 8765 --bind 127.0.0.1 --directory factory` y abre [el visor local](http://127.0.0.1:8765/dashboard.html). El botón «Ver ejemplo» permite explorar el flujo con datos ficticios. Instrucciones y estructura en [factory/README.md](factory/README.md); alcance en [spec 40](specs/40-fabrica-software/spec.md).
+
+## Arquitectura de clientes
+
+El [contrato común y mapa de paridad](docs/client-architecture.md) documenta la composición por raíz React, las capacidades locales y la futura adaptación al servicio privado. El transporte implementado sigue siendo Electron local.
+
 ## Requisitos
 
 - Node.js compatible con el toolchain actual.
diff --git a/package.json b/package.json
index b79a0fa..018a2c8 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.0.0",
+  "version": "3.2.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
diff --git a/src/preload/dice-api.ts b/src/preload/dice-api.ts
index e87347b..8672ce0 100644
--- a/src/preload/dice-api.ts
+++ b/src/preload/dice-api.ts
@@ -1,21 +1 @@
-import type { DiceContext, DiceDraft, DiceEnvelope, DiceReply, DiceRollRequest, DiceSessionState, DiceSimulation } from "../domain/dice/dice";
-import type { DiceSizeChange, DiceSizes } from "../domain/dice/size";
-
-export interface DiceApi {
-  getDiceSizes(): Promise<DiceReply<DiceSizes>>;
-  setDiceSize(change: DiceSizeChange): Promise<DiceReply<DiceSizes>>;
-  onDiceSizes(handler: (value: DiceSizes) => void): () => void;
-  updateDiceContext(context: DiceContext): Promise<DiceReply<DiceSessionState>>;
-  updateDicePreferences(draft: DiceDraft): Promise<DiceReply<DiceDraft>>;
-  beginDiceRoll(request: DiceRollRequest): Promise<DiceReply<{ rollId: string }>>;
-  completeDiceRoll(rollId: string, simulation: DiceSimulation): Promise<DiceReply<DiceSessionState>>;
-  failDiceRoll(rollId: string): Promise<DiceReply<DiceSessionState>>;
-  getDmDiceSession(): Promise<DiceReply<DiceSessionState>>;
-  clearDiceHistory(): Promise<DiceReply<DiceSessionState>>;
-  dismissDiceRoll(rollId: string): Promise<DiceReply<DiceSessionState>>;
-  setDiceResultVisibility(rollId: string, visible: boolean): Promise<DiceReply<DiceSessionState>>;
-  getPublicDiceState(): Promise<DiceReply<DiceEnvelope>>;
-  reportDiceRenderStatus(rollId: string, ok: boolean): Promise<unknown>;
-  onDicePresentation(handler: (value: DiceEnvelope) => void): () => void;
-  onDiceRenderError(handler: (message: string) => void): () => void;
-}
+export type * from "../shared/api/dice-api";
diff --git a/src/preload/index.ts b/src/preload/index.ts
index 1b755c4..12d8b04 100644
--- a/src/preload/index.ts
+++ b/src/preload/index.ts
@@ -1,9 +1,11 @@
 import { contextBridge, ipcRenderer } from "electron";
 import type { IpcRendererEvent } from "electron";
 
+import { version } from "../../package.json";
+
 const appInfo = {
   name: "TTRPG Effects",
-  version: "0.0.0",
+  version,
   status: "Bootstrap listo"
 } as const;
 
diff --git a/src/preload/ttrpg-api.d.ts b/src/preload/ttrpg-api.d.ts
index 629d78b..d8ada9c 100644
--- a/src/preload/ttrpg-api.d.ts
+++ b/src/preload/ttrpg-api.d.ts
@@ -1,219 +1,7 @@
-import type { SceneDocument, SceneOperationResult } from "../domain/sessions/scene-document";
-import type { InformationAreaHighlightBroadcast } from "../domain/annotations/map-annotations";
-import type { MapOpenResult } from "../domain/map/map-image";
-import type { MapImageReplacementResult } from "../application/services/map-image-storage";
-import type { DiceApi } from "./dice-api";
-import type { TokenOpenResult } from "../domain/tokens/token-image";
-import type {
-  ArcanePointerBroadcast,
-  PlayerWindowSnapshot,
-  ViewportCameraSnapshot
-} from "../domain/player/player-window";
-import type {
-  PlayerCameraCommand,
-  PlayerCameraReport
-} from "../domain/player/player-camera-control";
-import type { MonsterTemplate } from "../domain/monster-templates/monster-template";
-import type {
-  MonsterLibraryEntry,
-  MonsterLibrarySaveInput,
-  MonsterLibrarySearchQuery
-} from "../domain/monster-library/monster-library";
-import type {
-  EntityLibrarySearchQuery,
-  NpcLibraryEntry,
-  NpcLibrarySaveInput,
-  PlayerCharacterLibraryEntry,
-  PlayerCharacterLibrarySaveInput
-} from "../domain/entity-library/entity-library";
-import type {
-  ConnectSceneLinkRequest,
-  DisconnectSceneLinkRequest,
-  LoadSceneLinkTargetRequest,
-  SceneLinkCandidateFile,
-  SceneLinkValidationStatus,
-  ValidateSceneLinksRequest
-} from "../domain/annotations/scene-navigation-links";
-import type {
-  SceneLinkMutationResult,
-  SceneLinkNavigationResult
-} from "../application/use-cases/scene-navigation-links";
-
-export interface TtrpgAppInfo {
-  name: "TTRPG Effects";
-  version: "0.0.0";
-  status: "Bootstrap listo";
-}
-
-export interface TtrpgApi extends DiceApi {
-  reportPlayerMapImageStatus: (report: { imageUrl: string; ok: boolean; error?: string }) => Promise<void>;
-  onPlayerMapImageStatus: (handler: (report: { imageUrl: string; ok: boolean; error?: string }) => void) => () => void;
-  getAppInfo: () => TtrpgAppInfo;
-  saveScene: (
-    scene: SceneDocument,
-    options?: { readonly suggestedFilePath?: string | null }
-  ) => Promise<SceneOperationResult>;
-  saveSceneToPath: (scene: SceneDocument, filePath: string) => Promise<SceneOperationResult>;
-  loadScene: () => Promise<SceneOperationResult>;
-  importSceneAsMap: (scene: SceneDocument) => Promise<SceneOperationResult>;
-  selectSceneLinkTargetFile: () => Promise<
-    { readonly ok: true; readonly filePath: string | null } | { readonly ok: false; readonly error: string }
-  >;
-  listSceneLinkCandidates: (filePath: string) => Promise<
-    { readonly ok: true; readonly candidate: SceneLinkCandidateFile } | { readonly ok: false; readonly error: string }
-  >;
-  connectSceneLink: (request: ConnectSceneLinkRequest) => Promise<SceneLinkMutationResult>;
-  disconnectSceneLink: (request: DisconnectSceneLinkRequest) => Promise<SceneLinkMutationResult>;
-  validateSceneLinks: (request: ValidateSceneLinksRequest) => Promise<
-    { readonly ok: true; readonly statuses: Readonly<Record<string, SceneLinkValidationStatus>> } |
-    { readonly ok: false; readonly error: string }
-  >;
-  loadSceneLinkTarget: (request: LoadSceneLinkTargetRequest) => Promise<SceneLinkNavigationResult>;
-  onRecentSceneOpen: (handler: (result: SceneOperationResult) => void) => () => void;
-  listMonsterTemplates: () => Promise<MonsterTemplateOperationResult>;
-  saveMonsterTemplate: (template: MonsterTemplate) => Promise<MonsterTemplateOperationResult>;
-  deleteMonsterTemplate: (id: string) => Promise<MonsterTemplateOperationResult>;
-  onOpenMonsterTemplateManager: (handler: () => void) => () => void;
-  searchMonsterLibrary: (query: MonsterLibrarySearchQuery) => Promise<MonsterLibrarySearchResult>;
-  getMonsterLibraryEntry: (id: string) => Promise<MonsterLibraryGetResult>;
-  saveMonsterLibraryEntry: (entry: MonsterLibrarySaveInput) => Promise<MonsterLibrarySaveResult>;
-  searchNpcLibrary: (query: EntityLibrarySearchQuery) => Promise<NpcLibrarySearchResult>;
-  getNpcLibraryEntry: (id: string) => Promise<NpcLibraryGetResult>;
-  saveNpcLibraryEntry: (entry: NpcLibrarySaveInput) => Promise<NpcLibrarySaveResult>;
-  searchPlayerCharacterLibrary: (query: EntityLibrarySearchQuery) => Promise<PlayerCharacterLibrarySearchResult>;
-  getPlayerCharacterLibraryEntry: (id: string) => Promise<PlayerCharacterLibraryGetResult>;
-  savePlayerCharacterLibraryEntry: (entry: PlayerCharacterLibrarySaveInput) => Promise<PlayerCharacterLibrarySaveResult>;
-  openMapImage: () => Promise<MapOpenResult>;
-  selectReplacementMapImage: () => Promise<MapImageReplacementResult>;
-  resolveMapUrl: (imagePath: string) => Promise<string | null>;
-  openTokenImage: () => Promise<TokenOpenResult>;
-  resolveTokenUrl: (imagePath: string) => Promise<string | null>;
-  openAsideImage: () => Promise<TokenOpenResult>;
-  resolveAsideUrl: (imagePath: string) => Promise<string | null>;
-  openPlayerWindow: (snapshot?: PlayerWindowSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  getPlayerWindowState: () => Promise<{
-    readonly snapshot: PlayerWindowSnapshot | null;
-    readonly camera: ViewportCameraSnapshot | null;
-    readonly cameraCommand: PlayerCameraCommand | null;
-    readonly isOpen: boolean;
-  }>;
-  publishPlayerScene: (snapshot: PlayerWindowSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  publishPlayerCamera: (camera: ViewportCameraSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  commandPlayerCamera: (command: PlayerCameraCommand) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  reportPlayerCamera: (report: PlayerCameraReport) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  publishPlayerPointer: (pointer: ArcanePointerBroadcast) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  publishPlayerInformationAreaHighlight: (highlight: InformationAreaHighlightBroadcast) => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  notifyPlayerContentReady: () => Promise<{ readonly ok: boolean; readonly error?: string }>;
-  onPlayerScene: (handler: (snapshot: PlayerWindowSnapshot) => void) => () => void;
-  onPlayerCamera: (handler: (camera: ViewportCameraSnapshot) => void) => () => void;
-  onPlayerCameraCommand: (handler: (command: PlayerCameraCommand) => void) => () => void;
-  onPlayerCameraReport: (handler: (report: PlayerCameraReport) => void) => () => void;
-  onPlayerPointer: (handler: (pointer: ArcanePointerBroadcast) => void) => () => void;
-  onPlayerInformationAreaHighlight: (handler: (highlight: InformationAreaHighlightBroadcast) => void) => () => void;
-  onPlayerWindowClosed: (handler: () => void) => () => void;
-  onPlayerWindowReady: (handler: () => void) => () => void;
-}
-
-export type MonsterTemplateOperationResult =
-  | {
-      readonly ok: true;
-      readonly templates: readonly MonsterTemplate[];
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type MonsterLibrarySearchResult =
-  | {
-      readonly ok: true;
-      readonly entries: readonly MonsterLibraryEntry[];
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type MonsterLibraryGetResult =
-  | {
-      readonly ok: true;
-      readonly entry: MonsterLibraryEntry | null;
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type MonsterLibrarySaveResult =
-  | {
-      readonly ok: true;
-      readonly entry: MonsterLibraryEntry;
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type NpcLibrarySearchResult =
-  | {
-      readonly ok: true;
-      readonly entries: readonly NpcLibraryEntry[];
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type NpcLibraryGetResult =
-  | {
-      readonly ok: true;
-      readonly entry: NpcLibraryEntry | null;
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type NpcLibrarySaveResult =
-  | {
-      readonly ok: true;
-      readonly entry: NpcLibraryEntry;
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type PlayerCharacterLibrarySearchResult =
-  | {
-      readonly ok: true;
-      readonly entries: readonly PlayerCharacterLibraryEntry[];
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type PlayerCharacterLibraryGetResult =
-  | {
-      readonly ok: true;
-      readonly entry: PlayerCharacterLibraryEntry | null;
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
-
-export type PlayerCharacterLibrarySaveResult =
-  | {
-      readonly ok: true;
-      readonly entry: PlayerCharacterLibraryEntry;
-    }
-  | {
-      readonly ok: false;
-      readonly error: string;
-    };
+import type { TtrpgApi } from "../shared/api/ttrpg-api";
+export type * from "../shared/api/ttrpg-api";
 
+// Compatibility declaration for the sandboxed Electron bridge.
 declare global {
   interface Window {
     ttrpg?: TtrpgApi;
diff --git a/src/renderer/src/App.tsx b/src/renderer/src/App.tsx
index af99cb6..1f7ab74 100644
--- a/src/renderer/src/App.tsx
+++ b/src/renderer/src/App.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "./client/ClientProvider";
 import {
   useCallback,
   useEffect,
@@ -289,6 +290,11 @@ const SESSION_AUTOSAVE_DELAY_MS = 1000;
 const PLAYER_SCENE_PUBLISH_DELAY_MS = 250;
 
 export function App(): JSX.Element {
+  const scenesApi = useTtrpgApi("scenes");
+  const imagesApi = useTtrpgApi("images");
+  const playerApi = useTtrpgApi("player");
+  const nativeMenusApi = useTtrpgApi("nativeMenus");
+  const librariesApi = useTtrpgApi("libraries");
   const [scene, setSceneState] = useState<SceneDocument>(() => {
     try {
       const snapshot = sessionStorage.getItem("ttrpg:session-scene");
@@ -478,8 +484,8 @@ export function App(): JSX.Element {
         : { state: "validating" as const }
     ])));
 
-    if (currentFilePath === null || markers.length === 0 || window.ttrpg === undefined) return;
-    void window.ttrpg.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
+    if (currentFilePath === null || markers.length === 0 || scenesApi === undefined) return;
+    void scenesApi.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
       if (sceneLinkValidationRequestId.current !== requestId) return;
       if (result.ok) {
         setSceneLinkStatuses(result.statuses);
@@ -487,10 +493,10 @@ export function App(): JSX.Element {
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
 
@@ -502,7 +508,7 @@ export function App(): JSX.Element {
 
     let cancelled = false;
     void Promise.all(
-      missingTokens.map(async (token) => [token.id, await window.ttrpg?.resolveTokenUrl(token.imagePath)] as const)
+      missingTokens.map(async (token) => [token.id, await imagesApi?.resolveTokenUrl(token.imagePath)] as const)
     ).then((entries) => {
       if (cancelled) {
         return;
@@ -524,7 +530,7 @@ export function App(): JSX.Element {
     return () => {
       cancelled = true;
     };
-  }, [scene.tokens, tokenImageUrls]);
+  }, [scene.tokens, tokenImageUrls, imagesApi]);
 
   // Phase 2: Autosave scene to sessionStorage on every change (debounced).
   // sessionStorage survives renderer reloads within the same Electron window session
@@ -616,7 +622,7 @@ export function App(): JSX.Element {
 
   const sendPlayerCameraCommand = useCallback(
     (reason: PlayerCameraCommandReason): void => {
-      if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
+      if (!isPlayerWindowOpenRef.current || playerApi === undefined) {
         refreshPlayerCameraControl("closed");
         return;
       }
@@ -625,13 +631,13 @@ export function App(): JSX.Element {
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
@@ -666,9 +672,9 @@ export function App(): JSX.Element {
 
   const handleArcanePointerTrigger = useCallback((pointer: ArcanePointerBroadcast): void => {
     if (isPlayerWindowOpenRef.current) {
-      void window.ttrpg?.publishPlayerPointer(pointer);
+      void playerApi?.publishPlayerPointer(pointer);
     }
-  }, []);
+  }, [playerApi]);
 
   const handleRoomPinPlace = useCallback((position: WorldPoint): void => {
     const id = getNextAvailableSceneId(sceneRef.current, ["room-pin-"], nextPinId);
@@ -705,13 +711,17 @@ export function App(): JSX.Element {
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
@@ -949,14 +959,14 @@ export function App(): JSX.Element {
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
@@ -982,7 +992,7 @@ export function App(): JSX.Element {
     } finally {
       setIsBusy(false);
     }
-  }, [currentFilePath, sceneAside]);
+  }, [currentFilePath, sceneAside, scenesApi]);
 
   async function persistCurrentSceneForSceneLink(): Promise<string | null> {
     const currentSnapshot = JSON.stringify({ ...sceneRef.current, sceneAside });
@@ -994,7 +1004,7 @@ export function App(): JSX.Element {
     try {
       saved = currentFilePath === null
         ? await saveCurrentScene()
-        : await window.ttrpg?.saveSceneToPath(
+        : await scenesApi?.saveSceneToPath(
             createSceneSavePayload(sceneRef.current, sceneAside),
             currentFilePath
           );
@@ -1020,7 +1030,7 @@ export function App(): JSX.Element {
     successMessage: string,
     targetScenePath?: string
   ): Promise<boolean> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return false;
     }
@@ -1028,7 +1038,7 @@ export function App(): JSX.Element {
     const scenePath = targetScenePath ?? currentFilePath ?? await persistCurrentSceneForSceneLink();
     if (scenePath === null) return false;
 
-    const saved = await window.ttrpg.saveSceneToPath(createSceneSavePayload(sceneSnapshot, sceneAside), scenePath);
+    const saved = await scenesApi.saveSceneToPath(createSceneSavePayload(sceneSnapshot, sceneAside), scenePath);
     if (!saved.ok) {
       setFeedback(saved.error);
       return false;
@@ -1074,7 +1084,7 @@ export function App(): JSX.Element {
   }
 
   async function handleDisconnectSceneLink(marker: MapSceneLinkMarker): Promise<boolean> {
-    if (window.ttrpg === undefined) return false;
+    if (scenesApi === undefined) return false;
     const scenePath = await persistCurrentSceneForSceneLink();
     if (scenePath === null) return false;
     setIsBusy(true);
@@ -1084,7 +1094,7 @@ export function App(): JSX.Element {
         setScene(nextScene);
         return await saveSceneSnapshotInBackground(nextScene, "Conexion interna desligada.");
       }
-      const result = await window.ttrpg.disconnectSceneLink({ scenePath, markerId: marker.id });
+      const result = await scenesApi.disconnectSceneLink({ scenePath, markerId: marker.id });
       if (!result.ok) {
         setFeedback(result.error);
         return false;
@@ -1137,7 +1147,7 @@ export function App(): JSX.Element {
       return;
     }
 
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setSceneLinkModalId(marker.id);
       return;
     }
@@ -1145,7 +1155,7 @@ export function App(): JSX.Element {
     if (scenePath === null) return;
     setIsBusy(true);
     try {
-      const result = await window.ttrpg.loadSceneLinkTarget({
+      const result = await scenesApi.loadSceneLinkTarget({
         scenePath,
         markerId: marker.id
       });
@@ -1392,14 +1402,18 @@ export function App(): JSX.Element {
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
@@ -1408,7 +1422,7 @@ export function App(): JSX.Element {
       acknowledgedPlayerCameraCommandRevisionRef.current = null;
       refreshPlayerCameraControl("closed");
     });
-    const unsubscribeCameraReport = window.ttrpg?.onPlayerCameraReport((report) => {
+    const unsubscribeCameraReport = playerApi?.onPlayerCameraReport((report) => {
       if (!shouldApplyPlayerCameraReport(lastPlayerCameraReportRevisionRef.current, report)) {
         return;
       }
@@ -1427,7 +1441,7 @@ export function App(): JSX.Element {
       }
       refreshPlayerCameraControl();
     });
-    const unsubscribePlayerReady = window.ttrpg?.onPlayerWindowReady(() => {
+    const unsubscribePlayerReady = playerApi?.onPlayerWindowReady(() => {
       lastPlayerCameraReportRevisionRef.current = -1;
       effectivePlayerCameraRef.current = null;
       effectivePlayerViewportRef.current = null;
@@ -1439,7 +1453,8 @@ export function App(): JSX.Element {
       }
     });
 
-    void window.ttrpg?.getPlayerWindowState().then((state) => {
+    void playerApi?.getPlayerWindowState().then((state) => {
+      if (cancelled) return;
       if (state.cameraCommand !== null) {
         playerCameraCommandRevisionRef.current = Math.max(
           playerCameraCommandRevisionRef.current,
@@ -1455,11 +1470,12 @@ export function App(): JSX.Element {
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
@@ -1468,17 +1484,17 @@ export function App(): JSX.Element {
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
@@ -1487,11 +1503,11 @@ export function App(): JSX.Element {
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
@@ -1500,11 +1516,11 @@ export function App(): JSX.Element {
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
@@ -1868,11 +1884,11 @@ export function App(): JSX.Element {
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
@@ -1903,11 +1919,11 @@ export function App(): JSX.Element {
 
   async function handleLoadScene(): Promise<void> {
     await runSceneOperation("cargada", async () => {
-      if (window.ttrpg === undefined) {
+      if (scenesApi === undefined) {
         return { ok: false, error: "La API de preload no esta disponible." };
       }
 
-      return window.ttrpg.loadScene();
+      return scenesApi.loadScene();
     });
   }
 
@@ -1926,11 +1942,11 @@ export function App(): JSX.Element {
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
@@ -2018,26 +2034,26 @@ export function App(): JSX.Element {
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
@@ -2066,7 +2082,7 @@ export function App(): JSX.Element {
   }
 
   async function handleImportSceneAsMap(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
@@ -2076,7 +2092,7 @@ export function App(): JSX.Element {
 
     try {
       const previousFilePath = currentFilePath;
-      const result = await window.ttrpg.importSceneAsMap(createSceneSavePayload(sceneRef.current, sceneAside));
+      const result = await scenesApi.importSceneAsMap(createSceneSavePayload(sceneRef.current, sceneAside));
       if (!result.ok) {
         setFeedback(result.error);
         return;
@@ -2675,12 +2691,12 @@ export function App(): JSX.Element {
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
@@ -2840,7 +2856,7 @@ export function App(): JSX.Element {
       return;
     }
 
-    if (window.ttrpg === undefined) {
+    if (imagesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
@@ -2849,7 +2865,7 @@ export function App(): JSX.Element {
     setWarnings([]);
 
     try {
-      const result = await window.ttrpg.openTokenImage();
+      const result = await imagesApi.openTokenImage();
 
       if (!result.ok) {
         setFeedback(result.error);
diff --git a/src/renderer/src/App.workspace.test.tsx b/src/renderer/src/App.workspace.test.tsx
index 99a6287..3479107 100644
--- a/src/renderer/src/App.workspace.test.tsx
+++ b/src/renderer/src/App.workspace.test.tsx
@@ -7,6 +7,10 @@ import type { ViewportCameraSnapshot } from "../../domain/player/player-window";
 import { createDefaultSceneMap, createSceneWithMap } from "../../domain/sessions/scene-maps";
 import type { MapViewport, MapViewportHandle } from "./components/MapViewport";
 import { App } from "./App";
+import { ClientProvider } from "./client/ClientProvider";
+import { createClient } from "../../shared/api/client";
+import type { TtrpgApi } from "../../shared/api/ttrpg-api";
+import type { MapInformationArea } from "../../domain/annotations/map-annotations";
 
 type ViewportProps = ComponentProps<typeof MapViewport>;
 const viewport = vi.hoisted(() => ({
@@ -129,6 +133,40 @@ describe("App production workspace", () => {
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
diff --git a/src/renderer/src/PlayerApp.tsx b/src/renderer/src/PlayerApp.tsx
index 590fbe8..35717db 100644
--- a/src/renderer/src/PlayerApp.tsx
+++ b/src/renderer/src/PlayerApp.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "./client/ClientProvider";
 import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
 import { Compass, Lock, Unlock, Wrench, ZoomIn, ZoomOut } from "lucide-react";
 import { createDefaultScene } from "../../domain/sessions/default-scene";
@@ -28,6 +29,7 @@ const EMPTY_MAP_ANNOTATIONS = { pins: EMPTY_ITEMS, areas: EMPTY_ITEMS, sceneLink
 const EMPTY_LINK_STATUSES = {};
 
 export function PlayerApp(): JSX.Element {
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
diff --git a/src/renderer/src/components/aside/ImagePicker.tsx b/src/renderer/src/components/aside/ImagePicker.tsx
index 3666516..bcfdc6c 100644
--- a/src/renderer/src/components/aside/ImagePicker.tsx
+++ b/src/renderer/src/components/aside/ImagePicker.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useCallback, type JSX } from "react";
 
 interface ImagePickerProps {
@@ -7,15 +8,16 @@ interface ImagePickerProps {
 }
 
 export function ImagePicker({ imageUrl, onImageSelected, onImageRemoved }: ImagePickerProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const handleClick = useCallback(async () => {
-    const result = await window.ttrpg?.openAsideImage();
+    const result = await imagesApi?.openAsideImage();
     if (result?.ok) {
-      const resolvedUrl = await window.ttrpg?.resolveAsideUrl(result.imagePath);
+      const resolvedUrl = await imagesApi?.resolveAsideUrl(result.imagePath);
       if (resolvedUrl !== null && resolvedUrl !== undefined) {
         onImageSelected(result.imagePath, resolvedUrl);
       }
     }
-  }, [onImageSelected]);
+  }, [onImageSelected, imagesApi]);
 
   const handleDrop = useCallback(
     async (e: React.DragEvent<HTMLDivElement>) => {
@@ -24,12 +26,12 @@ export function ImagePicker({ imageUrl, onImageSelected, onImageRemoved }: Image
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
diff --git a/src/renderer/src/components/aside/MonsterDetailModal.tsx b/src/renderer/src/components/aside/MonsterDetailModal.tsx
index c4f8552..469b94a 100644
--- a/src/renderer/src/components/aside/MonsterDetailModal.tsx
+++ b/src/renderer/src/components/aside/MonsterDetailModal.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useMemo, useEffect, useState, type JSX } from "react";
 import {
   getMonsterTemplateRenderClass,
@@ -23,12 +24,13 @@ export function MonsterDetailModal({
   onToggleVisibility,
   onEdit
 }: MonsterDetailModalProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
     if (monster.imagePath === null) { setImageUrl(null); return; }
-    void window.ttrpg?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [monster.imagePath]);
+    void imagesApi?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [monster.imagePath, imagesApi]);
 
   const notesHtml = useMemo(() => {
     if (monster.notes.trim() === "") return "";
diff --git a/src/renderer/src/components/aside/MonsterLibraryModal.tsx b/src/renderer/src/components/aside/MonsterLibraryModal.tsx
index 1863454..b78ab9f 100644
--- a/src/renderer/src/components/aside/MonsterLibraryModal.tsx
+++ b/src/renderer/src/components/aside/MonsterLibraryModal.tsx
@@ -1,4 +1,5 @@
-import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
+import { useTtrpgApi } from "../../client/ClientProvider";
+import { useEffect, useMemo, useRef, useState, type JSX } from "react";
 import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
 import {
   createSceneMonsterFromLibraryEntry,
@@ -31,6 +32,8 @@ export function MonsterLibraryModal({
   onAddMonster,
   onClose
 }: MonsterLibraryModalProps): JSX.Element {
+  const librariesApi = useTtrpgApi("libraries");
+  const imagesApi = useTtrpgApi("images");
   const [query, setQuery] = useState("");
   const [entries, setEntries] = useState<readonly MonsterLibraryEntry[]>([]);
   const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(new Map());
@@ -39,42 +42,47 @@ export function MonsterLibraryModal({
   const [isCreating, setIsCreating] = useState(false);
   const [draft, setDraft] = useState<NewMonsterDraft>(() => createEmptyDraft(templates));
 
-  const refresh = useCallback(async (text: string): Promise<void> => {
-    if (window.ttrpg === undefined) {
+  const libraryGeneration = useRef(0);
+  useEffect(() => {
+    libraryGeneration.current++;
+    setIsCreating(false);
+    setDraft(createEmptyDraft(templates));
+    return () => { libraryGeneration.current++; };
+  }, [librariesApi, imagesApi]);
+
+  useEffect(() => {
+    let cancelled = false;
+    setEntries([]);
+    setImageUrls(new Map());
+    setFeedback(null);
+    setIsLoading(librariesApi !== undefined);
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
-
-    setIsLoading(true);
-    try {
-      const result = await window.ttrpg.searchMonsterLibrary({ text, limit: 60 });
-      if (result.ok) {
+    async function refresh(): Promise<void> {
+      try {
+        const result = await librariesApi!.searchMonsterLibrary({ text: query, limit: 60 });
+        if (cancelled) return;
+        if (!result.ok) {
+          setFeedback({ message: result.error, kind: "error" });
+          return;
+        }
         setEntries(result.entries);
-        setFeedback(null);
-        const resolved = await Promise.all(
-          result.entries
-            .filter((e) => e.imagePath !== null)
-            .map(async (e) => {
-              const url = await window.ttrpg?.resolveAsideUrl(e.imagePath!);
-              return [e.id, url] as const;
-            })
-        );
+        const resolved = await Promise.all(result.entries
+          .filter((entry) => entry.imagePath !== null)
+          .map(async (entry) => [entry.id, await imagesApi?.resolveAsideUrl(entry.imagePath!)] as const));
+        if (cancelled) return;
         setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
-      } else {
-        setFeedback({ message: result.error, kind: "error" });
+      } catch (error) {
+        if (!cancelled) setFeedback({ message: error instanceof Error ? error.message : "No se pudo consultar la biblioteca.", kind: "error" });
+      } finally {
+        if (!cancelled) setIsLoading(false);
       }
-    } finally {
-      setIsLoading(false);
     }
-  }, []);
-
-  useEffect(() => {
-    const handle = window.setTimeout(() => {
-      void refresh(query);
-    }, 180);
-
-    return () => window.clearTimeout(handle);
-  }, [query, refresh]);
+    const handle = window.setTimeout(() => { void refresh(); }, 180);
+    return () => { cancelled = true; window.clearTimeout(handle); };
+  }, [query, librariesApi, imagesApi]);
 
   const templateById = useMemo(
     () => new Map(templates.map((template) => [template.id, template])),
@@ -102,7 +110,7 @@ export function MonsterLibraryModal({
   }
 
   async function saveNewMonster(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
@@ -112,13 +120,15 @@ export function MonsterLibraryModal({
       return;
     }
 
-    const result = await window.ttrpg.saveMonsterLibraryEntry({
+    const generation = libraryGeneration.current;
+    const result = await librariesApi.saveMonsterLibraryEntry({
       name: draft.name,
       system: draft.system.trim() === "" ? "Sin sistema" : draft.system,
       templateId: draft.templateId,
       contentMarkdown: draft.contentMarkdown,
       imagePath: draft.imagePath
     });
+    if (generation !== libraryGeneration.current) return;
 
     if (!result.ok) {
       setFeedback({ message: result.error, kind: "error" });
diff --git a/src/renderer/src/components/aside/MonsterModal.tsx b/src/renderer/src/components/aside/MonsterModal.tsx
index 3969609..f0b4ac5 100644
--- a/src/renderer/src/components/aside/MonsterModal.tsx
+++ b/src/renderer/src/components/aside/MonsterModal.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useCallback, useEffect, useState, type JSX } from "react";
 import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
 import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
@@ -14,6 +15,7 @@ interface MonsterModalProps {
 }
 
 export function MonsterModal({ initial, existingIds, templates, onSave, onClose }: MonsterModalProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [name, setName] = useState(initial?.name ?? "");
   const [notes, setNotes] = useState(initial?.notes ?? "");
   const [templateId, setTemplateId] = useState<string | null>(initial?.templateId ?? null);
@@ -22,11 +24,11 @@ export function MonsterModal({ initial, existingIds, templates, onSave, onClose
 
   useEffect(() => {
     if (initial?.imagePath !== undefined && initial.imagePath !== null) {
-      void window.ttrpg?.resolveAsideUrl(initial.imagePath).then((url) => {
+      void imagesApi?.resolveAsideUrl(initial.imagePath).then((url) => {
         setImageUrl(url ?? null);
       });
     }
-  }, [initial?.imagePath]);
+  }, [initial?.imagePath, imagesApi]);
 
   const handleSave = useCallback(() => {
     const trimmed = name.trim();
diff --git a/src/renderer/src/components/aside/MonsterSection.tsx b/src/renderer/src/components/aside/MonsterSection.tsx
index f177a2b..841d0ab 100644
--- a/src/renderer/src/components/aside/MonsterSection.tsx
+++ b/src/renderer/src/components/aside/MonsterSection.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useCallback, useEffect, useState, type JSX } from "react";
 import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
 import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
@@ -126,12 +127,13 @@ interface MonsterRowProps {
 }
 
 function MonsterRow({ monster, onDetail, onRemove, onToggle }: MonsterRowProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
     if (monster.imagePath === null) { setImageUrl(null); return; }
-    void window.ttrpg?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [monster.imagePath]);
+    void imagesApi?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [monster.imagePath, imagesApi]);
 
   return (
     <div style={rowStyle}>
diff --git a/src/renderer/src/components/aside/NpcDetailModal.tsx b/src/renderer/src/components/aside/NpcDetailModal.tsx
index 484f252..1601f8a 100644
--- a/src/renderer/src/components/aside/NpcDetailModal.tsx
+++ b/src/renderer/src/components/aside/NpcDetailModal.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useState, type JSX } from "react";
 import type { SceneNpc } from "../../../../domain/sessions/scene-aside";
 import { ModalBackdrop } from "./ModalBackdrop";
@@ -18,12 +19,13 @@ export function NpcDetailModal({
   onEdit,
   onNotesChange
 }: NpcDetailModalProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
     if (npc.imagePath === null) { setImageUrl(null); return; }
-    void window.ttrpg?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [npc.imagePath]);
+    void imagesApi?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [npc.imagePath, imagesApi]);
 
   return (
     <ModalBackdrop onClose={onClose} large>
diff --git a/src/renderer/src/components/aside/NpcLibraryModal.tsx b/src/renderer/src/components/aside/NpcLibraryModal.tsx
index 84db83d..19a7df6 100644
--- a/src/renderer/src/components/aside/NpcLibraryModal.tsx
+++ b/src/renderer/src/components/aside/NpcLibraryModal.tsx
@@ -1,4 +1,5 @@
-import { lazy, Suspense, useCallback, useEffect, useState, type JSX } from "react";
+import { useTtrpgApi } from "../../client/ClientProvider";
+import { lazy, Suspense, useEffect, useRef, useState, type JSX } from "react";
 import {
   createSceneNpcFromLibraryEntry,
   type NpcLibraryEntry
@@ -27,6 +28,8 @@ interface NewNpcDraft {
 }
 
 export function NpcLibraryModal({ existingIds, onAddNpc, onClose }: NpcLibraryModalProps): JSX.Element {
+  const librariesApi = useTtrpgApi("libraries");
+  const imagesApi = useTtrpgApi("images");
   const [query, setQuery] = useState("");
   const [entries, setEntries] = useState<readonly NpcLibraryEntry[]>([]);
   const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(new Map());
@@ -35,42 +38,47 @@ export function NpcLibraryModal({ existingIds, onAddNpc, onClose }: NpcLibraryMo
   const [isCreating, setIsCreating] = useState(false);
   const [draft, setDraft] = useState<NewNpcDraft>({ name: "", imagePath: null, imageUrl: null, notes: "" });
 
-  const refresh = useCallback(async (text: string): Promise<void> => {
-    if (window.ttrpg === undefined) {
+  const libraryGeneration = useRef(0);
+  useEffect(() => {
+    libraryGeneration.current++;
+    setIsCreating(false);
+    setDraft({ name: "", imagePath: null, imageUrl: null, notes: "" });
+    return () => { libraryGeneration.current++; };
+  }, [librariesApi, imagesApi]);
+
+  useEffect(() => {
+    let cancelled = false;
+    setEntries([]);
+    setImageUrls(new Map());
+    setFeedback(null);
+    setIsLoading(librariesApi !== undefined);
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
-
-    setIsLoading(true);
-    try {
-      const result = await window.ttrpg.searchNpcLibrary({ text, limit: 60 });
-      if (!result.ok) {
-        setFeedback({ message: result.error, kind: "error" });
-        return;
-      }
-
-      setEntries(result.entries);
-      setFeedback(null);
-      const resolved = await Promise.all(
-        result.entries
+    async function refresh(): Promise<void> {
+      try {
+        const result = await librariesApi!.searchNpcLibrary({ text: query, limit: 60 });
+        if (cancelled) return;
+        if (!result.ok) {
+          setFeedback({ message: result.error, kind: "error" });
+          return;
+        }
+        setEntries(result.entries);
+        const resolved = await Promise.all(result.entries
           .filter((entry) => entry.imagePath !== null)
-          .map(async (entry) => {
-            const url = await window.ttrpg?.resolveAsideUrl(entry.imagePath!);
-            return [entry.id, url] as const;
-          })
-      );
-      setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
-    } finally {
-      setIsLoading(false);
+          .map(async (entry) => [entry.id, await imagesApi?.resolveAsideUrl(entry.imagePath!)] as const));
+        if (cancelled) return;
+        setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
+      } catch (error) {
+        if (!cancelled) setFeedback({ message: error instanceof Error ? error.message : "No se pudo consultar la biblioteca.", kind: "error" });
+      } finally {
+        if (!cancelled) setIsLoading(false);
+      }
     }
-  }, []);
-
-  useEffect(() => {
-    const handle = window.setTimeout(() => {
-      void refresh(query);
-    }, 180);
-    return () => window.clearTimeout(handle);
-  }, [query, refresh]);
+    const handle = window.setTimeout(() => { void refresh(); }, 180);
+    return () => { cancelled = true; window.clearTimeout(handle); };
+  }, [query, librariesApi, imagesApi]);
 
   function addEntryToScene(entry: NpcLibraryEntry): void {
     onAddNpc(createSceneNpcFromLibraryEntry(entry, existingIds));
@@ -78,7 +86,7 @@ export function NpcLibraryModal({ existingIds, onAddNpc, onClose }: NpcLibraryMo
   }
 
   async function saveNewNpc(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
@@ -87,11 +95,13 @@ export function NpcLibraryModal({ existingIds, onAddNpc, onClose }: NpcLibraryMo
       return;
     }
 
-    const result = await window.ttrpg.saveNpcLibraryEntry({
+    const generation = libraryGeneration.current;
+    const result = await librariesApi.saveNpcLibraryEntry({
       name: draft.name,
       imagePath: draft.imagePath,
       notes: draft.notes
     });
+    if (generation !== libraryGeneration.current) return;
 
     if (!result.ok) {
       setFeedback({ message: result.error, kind: "error" });
diff --git a/src/renderer/src/components/aside/NpcModal.tsx b/src/renderer/src/components/aside/NpcModal.tsx
index c9b8305..701bb35 100644
--- a/src/renderer/src/components/aside/NpcModal.tsx
+++ b/src/renderer/src/components/aside/NpcModal.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { lazy, Suspense, useCallback, useEffect, useState, type JSX } from "react";
 import type { SceneNpc } from "../../../../domain/sessions/scene-aside";
 import { ensureUniqueSlug, slugify } from "../../../../domain/sessions/scene-aside";
@@ -17,6 +18,7 @@ interface NpcModalProps {
 }
 
 export function NpcModal({ initial, existingIds, onSave, onClose }: NpcModalProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [name, setName] = useState(initial?.name ?? "");
   const [notes, setNotes] = useState(initial?.notes ?? "");
   const [imagePath, setImagePath] = useState<string | null>(initial?.imagePath ?? null);
@@ -24,11 +26,11 @@ export function NpcModal({ initial, existingIds, onSave, onClose }: NpcModalProp
 
   useEffect(() => {
     if (initial?.imagePath !== undefined && initial.imagePath !== null) {
-      void window.ttrpg?.resolveAsideUrl(initial.imagePath).then((url) => {
+      void imagesApi?.resolveAsideUrl(initial.imagePath).then((url) => {
         setImageUrl(url ?? null);
       });
     }
-  }, [initial?.imagePath]);
+  }, [initial?.imagePath, imagesApi]);
 
   const handleSave = useCallback(() => {
     const trimmed = name.trim();
diff --git a/src/renderer/src/components/aside/NpcSection.tsx b/src/renderer/src/components/aside/NpcSection.tsx
index cc7bf00..e467f74 100644
--- a/src/renderer/src/components/aside/NpcSection.tsx
+++ b/src/renderer/src/components/aside/NpcSection.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useCallback, useEffect, useState, type JSX } from "react";
 import type { SceneNpc } from "../../../../domain/sessions/scene-aside";
 import { NpcDetailModal } from "./NpcDetailModal";
@@ -116,12 +117,13 @@ export function NpcSection({
 function NpcRow({ npc, onDetail, onRemove, onToggle }: {
   npc: SceneNpc; onDetail: () => void; onRemove: () => void; onToggle: () => void;
 }): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
     if (npc.imagePath === null) { setImageUrl(null); return; }
-    void window.ttrpg?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [npc.imagePath]);
+    void imagesApi?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [npc.imagePath, imagesApi]);
 
   return (
     <div style={rowStyle}>
diff --git a/src/renderer/src/components/aside/PlayerAsideOverlay.tsx b/src/renderer/src/components/aside/PlayerAsideOverlay.tsx
index dbb6a5e..a18c45f 100644
--- a/src/renderer/src/components/aside/PlayerAsideOverlay.tsx
+++ b/src/renderer/src/components/aside/PlayerAsideOverlay.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useState, type JSX } from "react";
 import type { SceneMonster, SceneNpc } from "../../../../domain/sessions/scene-aside";
 import {
@@ -35,13 +36,14 @@ export function PlayerAsideOverlay({ aside }: PlayerAsideOverlayProps): JSX.Elem
 // ---------------------------------------------------------------------------
 
 function MonsterCard({ monster }: { monster: SceneMonster }): JSX.Element | null {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [zoomed, setZoomed] = useState(false);
 
   useEffect(() => {
     if (monster.imagePath === null) return;
-    void window.ttrpg?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [monster.imagePath]);
+    void imagesApi?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [monster.imagePath, imagesApi]);
 
   if (imageUrl === null) return null;
 
@@ -75,13 +77,14 @@ function MonsterCard({ monster }: { monster: SceneMonster }): JSX.Element | null
 // ---------------------------------------------------------------------------
 
 function NpcCard({ npc }: { npc: SceneNpc }): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [zoomed, setZoomed] = useState(false);
 
   useEffect(() => {
     if (npc.imagePath === null) return;
-    void window.ttrpg?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [npc.imagePath]);
+    void imagesApi?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [npc.imagePath, imagesApi]);
 
   const imgSize = zoomed ? "min(72vw, 72vh)" : "440px";
 
diff --git a/src/renderer/src/components/aside/PlayerCharacterDetailModal.tsx b/src/renderer/src/components/aside/PlayerCharacterDetailModal.tsx
index a767184..f2b4923 100644
--- a/src/renderer/src/components/aside/PlayerCharacterDetailModal.tsx
+++ b/src/renderer/src/components/aside/PlayerCharacterDetailModal.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useState, type JSX } from "react";
 import { formatAbilityScore } from "../../../../domain/entity-library/entity-library";
 import type { ScenePlayerCharacter } from "../../../../domain/sessions/scene-aside";
@@ -19,12 +20,13 @@ export function PlayerCharacterDetailModal({
   onAddToScene,
   onNotesChange
 }: PlayerCharacterDetailModalProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
     if (character.imagePath === null) { setImageUrl(null); return; }
-    void window.ttrpg?.resolveAsideUrl(character.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [character.imagePath]);
+    void imagesApi?.resolveAsideUrl(character.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [character.imagePath, imagesApi]);
 
   return (
     <ModalBackdrop onClose={onClose} fitContent>
diff --git a/src/renderer/src/components/aside/PlayerCharacterLibraryModal.tsx b/src/renderer/src/components/aside/PlayerCharacterLibraryModal.tsx
index a4ec623..0051d17 100644
--- a/src/renderer/src/components/aside/PlayerCharacterLibraryModal.tsx
+++ b/src/renderer/src/components/aside/PlayerCharacterLibraryModal.tsx
@@ -1,4 +1,5 @@
-import { lazy, Suspense, useCallback, useEffect, useRef, useState, type JSX } from "react";
+import { useTtrpgApi } from "../../client/ClientProvider";
+import { lazy, Suspense, useEffect, useRef, useState, type JSX } from "react";
 import {
   createScenePlayerCharacterFromLibraryEntry,
   type PlayerCharacterLibraryEntry,
@@ -40,6 +41,8 @@ export function PlayerCharacterLibraryModal({
   onAddCharacter,
   onClose
 }: PlayerCharacterLibraryModalProps): JSX.Element {
+  const librariesApi = useTtrpgApi("libraries");
+  const imagesApi = useTtrpgApi("images");
   const [query, setQuery] = useState("");
   const [entries, setEntries] = useState<readonly PlayerCharacterLibraryEntry[]>([]);
   const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(new Map());
@@ -52,41 +55,49 @@ export function PlayerCharacterLibraryModal({
 
   const gridRef = useRef<HTMLDivElement>(null);
 
-  const refresh = useCallback(async (text: string): Promise<void> => {
-    if (window.ttrpg === undefined) {
+  const libraryGeneration = useRef(0);
+  useEffect(() => {
+    libraryGeneration.current++;
+    setIsCreating(false);
+    setDraft(createEmptyDraft());
+    setEditingEntryId(null);
+    setPreviewEntry(null);
+    return () => { libraryGeneration.current++; };
+  }, [librariesApi, imagesApi]);
+
+  useEffect(() => {
+    let cancelled = false;
+    setEntries([]);
+    setImageUrls(new Map());
+    setFeedback(null);
+    setIsLoading(librariesApi !== undefined);
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
-
-    setIsLoading(true);
-    try {
-      const result = await window.ttrpg.searchPlayerCharacterLibrary({ text, limit: 60 });
-      if (!result.ok) {
-        setFeedback({ message: result.error, kind: "error" });
-        return;
-      }
-      setEntries(result.entries);
-      setFeedback(null);
-      const resolved = await Promise.all(
-        result.entries
+    async function refresh(): Promise<void> {
+      try {
+        const result = await librariesApi!.searchPlayerCharacterLibrary({ text: query, limit: 60 });
+        if (cancelled) return;
+        if (!result.ok) {
+          setFeedback({ message: result.error, kind: "error" });
+          return;
+        }
+        setEntries(result.entries);
+        const resolved = await Promise.all(result.entries
           .filter((entry) => entry.imagePath !== null)
-          .map(async (entry) => {
-            const url = await window.ttrpg?.resolveAsideUrl(entry.imagePath!);
-            return [entry.id, url] as const;
-          })
-      );
-      setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
-    } finally {
-      setIsLoading(false);
+          .map(async (entry) => [entry.id, await imagesApi?.resolveAsideUrl(entry.imagePath!)] as const));
+        if (cancelled) return;
+        setImageUrls(new Map(resolved.filter((pair): pair is [string, string] => typeof pair[1] === "string")));
+      } catch (error) {
+        if (!cancelled) setFeedback({ message: error instanceof Error ? error.message : "No se pudo consultar la biblioteca.", kind: "error" });
+      } finally {
+        if (!cancelled) setIsLoading(false);
+      }
     }
-  }, []);
-
-  useEffect(() => {
-    const handle = window.setTimeout(() => {
-      void refresh(query);
-    }, 180);
-    return () => window.clearTimeout(handle);
-  }, [query, refresh]);
+    const handle = window.setTimeout(() => { void refresh(); }, 180);
+    return () => { cancelled = true; window.clearTimeout(handle); };
+  }, [query, librariesApi, imagesApi]);
 
   function addEntryToScene(entry: PlayerCharacterLibraryEntry): void {
     onAddCharacter(createScenePlayerCharacterFromLibraryEntry(entry, existingIds));
@@ -115,7 +126,7 @@ export function PlayerCharacterLibraryModal({
   }
 
   async function saveCharacterDraft(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
@@ -124,7 +135,8 @@ export function PlayerCharacterLibraryModal({
       return;
     }
 
-    const result = await window.ttrpg.savePlayerCharacterLibraryEntry({
+    const generation = libraryGeneration.current;
+    const result = await librariesApi.savePlayerCharacterLibraryEntry({
       id: editingEntryId,
       characterName: draft.characterName,
       playerName: draft.playerName,
@@ -141,6 +153,7 @@ export function PlayerCharacterLibraryModal({
       speeds: draft.speeds,
       notes: draft.notes
     });
+    if (generation !== libraryGeneration.current) return;
 
     if (!result.ok) {
       setFeedback({ message: result.error, kind: "error" });
@@ -172,12 +185,14 @@ export function PlayerCharacterLibraryModal({
     setPreviewEntry(optimistic);
     setEntries((current) => upsertEntry(current, optimistic));
 
-    if (window.ttrpg === undefined) {
+    if (librariesApi === undefined) {
       setFeedback({ message: "La API de preload no esta disponible.", kind: "error" });
       return;
     }
 
-    void window.ttrpg.savePlayerCharacterLibraryEntry(toPlayerCharacterSaveInput(optimistic)).then((result) => {
+    const generation = libraryGeneration.current;
+    void librariesApi.savePlayerCharacterLibraryEntry(toPlayerCharacterSaveInput(optimistic)).then((result) => {
+      if (generation !== libraryGeneration.current) return;
       if (!result.ok) {
         setPreviewEntry((current) => current?.id === entry.id && current.notes === notes ? entry : current);
         setEntries((current) => upsertEntry(current, entry));
@@ -329,7 +344,9 @@ export function PlayerCharacterLibraryModal({
                 <button
                   type="button"
                   onClick={() => {
+                    const generation = libraryGeneration.current;
                     saveCharacterDraft().catch((error: unknown) => {
+                      if (generation !== libraryGeneration.current) return;
                       setFeedback({ message: error instanceof Error ? error.message : "Error inesperado al guardar.", kind: "error" });
                     });
                   }}
diff --git a/src/renderer/src/components/aside/PlayerCharacterSection.tsx b/src/renderer/src/components/aside/PlayerCharacterSection.tsx
index 0ac8f76..e590561 100644
--- a/src/renderer/src/components/aside/PlayerCharacterSection.tsx
+++ b/src/renderer/src/components/aside/PlayerCharacterSection.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useState, type JSX } from "react";
 import type { ScenePlayerCharacter } from "../../../../domain/sessions/scene-aside";
 import { PlayerCharacterDetailModal } from "./PlayerCharacterDetailModal";
@@ -69,12 +70,13 @@ function PlayerCharacterRow({ character, onDetail, onRemove }: {
   readonly onDetail: () => void;
   readonly onRemove: () => void;
 }): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
     if (character.imagePath === null) { setImageUrl(null); return; }
-    void window.ttrpg?.resolveAsideUrl(character.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [character.imagePath]);
+    void imagesApi?.resolveAsideUrl(character.imagePath).then((url) => setImageUrl(url ?? null));
+  }, [character.imagePath, imagesApi]);
 
   return (
     <div style={rowStyle}>
diff --git a/src/renderer/src/components/combat/CombatSetupModal.tsx b/src/renderer/src/components/combat/CombatSetupModal.tsx
index 4b56c67..545913b 100644
--- a/src/renderer/src/components/combat/CombatSetupModal.tsx
+++ b/src/renderer/src/components/combat/CombatSetupModal.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useMemo, useState, type DragEvent, type JSX } from "react";
 import {
   CombatTrackerError,
@@ -269,6 +270,7 @@ interface ParticipantThumbProps {
 }
 
 function ParticipantThumb({ imagePath, name }: ParticipantThumbProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
 
   useEffect(() => {
@@ -279,7 +281,7 @@ function ParticipantThumb({ imagePath, name }: ParticipantThumbProps): JSX.Eleme
         mounted = false;
       };
     }
-    void window.ttrpg?.resolveAsideUrl(imagePath).then((url) => {
+    void imagesApi?.resolveAsideUrl(imagePath).then((url) => {
       if (mounted) {
         setImageUrl(url ?? null);
       }
@@ -287,7 +289,7 @@ function ParticipantThumb({ imagePath, name }: ParticipantThumbProps): JSX.Eleme
     return () => {
       mounted = false;
     };
-  }, [imagePath]);
+  }, [imagePath, imagesApi]);
 
   return (
     <div className="combat-participant-thumb" aria-hidden="true">
diff --git a/src/renderer/src/components/combat/CombatTurnBar.tsx b/src/renderer/src/components/combat/CombatTurnBar.tsx
index de46ed7..540224d 100644
--- a/src/renderer/src/components/combat/CombatTurnBar.tsx
+++ b/src/renderer/src/components/combat/CombatTurnBar.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useMemo, useState, type JSX } from "react";
 import {
   getNextActiveParticipant,
@@ -95,6 +96,7 @@ function CombatTurnParticipant({
   onToggleExpanded,
   onToggleDefeated
 }: CombatTurnParticipantProps): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const isPending = participant.activeFromRound > round;
   const isActive = isParticipantActiveInRound(participant, round);
@@ -108,7 +110,7 @@ function CombatTurnParticipant({
       };
     }
 
-    void window.ttrpg?.resolveAsideUrl(participant.imagePath).then((url) => {
+    void imagesApi?.resolveAsideUrl(participant.imagePath).then((url) => {
       if (mounted) {
         setImageUrl(url ?? null);
       }
@@ -117,7 +119,7 @@ function CombatTurnParticipant({
     return () => {
       mounted = false;
     };
-  }, [participant.imagePath]);
+  }, [participant.imagePath, imagesApi]);
 
   const className = [
     "combat-turn-card",
diff --git a/src/renderer/src/components/dice/DiceOverlay.tsx b/src/renderer/src/components/dice/DiceOverlay.tsx
index 52baf77..490ce09 100644
--- a/src/renderer/src/components/dice/DiceOverlay.tsx
+++ b/src/renderer/src/components/dice/DiceOverlay.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type JSX } from "react";
 import { X } from "lucide-react";
 import type { DiceEnvelope } from "../../../../domain/dice/dice";
@@ -7,6 +8,7 @@ import { DiceResultSummary } from "./DiceResultSummary";
 import "./dice.css";
 
 export function DiceOverlay({ envelope, size = 1, onDismiss }: { envelope: DiceEnvelope; size?: number; onDismiss?: (rollId: string) => void }): JSX.Element {
+  const diceApi = useTtrpgApi("dice");
   const host = useRef<HTMLDivElement>(null), renderer = useRef<DiceOverlayRenderer | null>(null);
   const latest = useRef(envelope.presentation); latest.current = envelope.presentation;
   const latestSize = useRef(size); latestSize.current = size;
@@ -45,7 +47,7 @@ export function DiceOverlay({ envelope, size = 1, onDismiss }: { envelope: DiceE
   useEffect(() => {
     if (!loaded || !host.current) return;
     let cancelled = false;
-    const fail = (): void => { if (cancelled) return; setFailed(true); const rollId = latest.current?.rollId; if (rollId) void window.ttrpg?.reportDiceRenderStatus?.(rollId, false); };
+    const fail = (): void => { if (cancelled) return; setFailed(true); const rollId = latest.current?.rollId; if (rollId) void diceApi?.reportDiceRenderStatus?.(rollId, false); };
     void import("../../../../render/three/dice/DiceOverlayRenderer").then(({ DiceOverlayRenderer: Renderer }) => {
       if (cancelled || !host.current) return;
       renderer.current = new Renderer(host.current, fail, setEffectiveSize);
@@ -53,10 +55,10 @@ export function DiceOverlay({ envelope, size = 1, onDismiss }: { envelope: DiceE
       renderer.current.present(latest.current);
     }).catch(fail);
     return () => { cancelled = true; renderer.current?.dispose(); renderer.current = null; };
-  }, [loaded]);
+  }, [loaded, diceApi]);
   useEffect(() => { renderer.current?.setSize(size); }, [size]);
   // Reduced motion has no rolling RAF; the shared settle time still starts its static celebration.
-  useEffect(() => { try { renderer.current?.present(value); } catch { setFailed(true); if (value) void window.ttrpg?.reportDiceRenderStatus?.(value.rollId, false); } }, [value, settled]);
+  useEffect(() => { try { renderer.current?.present(value); } catch { setFailed(true); if (value) void diceApi?.reportDiceRenderStatus?.(value.rollId, false); } }, [value, settled, diceApi]);
   const visible = value !== null;
   const groups = value?.result?.groups.length ?? 0;
   const columns = Math.max(1, Math.floor((Math.min(680, viewportWidth - 36) - 18) / 158));
diff --git a/src/renderer/src/hooks/useDiceSession.ts b/src/renderer/src/hooks/useDiceSession.ts
index 4a2d405..d800a0c 100644
--- a/src/renderer/src/hooks/useDiceSession.ts
+++ b/src/renderer/src/hooks/useDiceSession.ts
@@ -1,6 +1,7 @@
+import { useTtrpgApi } from "../client/ClientProvider";
 import { useCallback, useEffect, useRef, useState } from "react";
 import { defaultDiceDraft, DICE_PROTOCOL_VERSION, draftSchema, expandDice, requestSchema, type D20Mode, type DiceContext, type DiceDraft, type DiceEnvelope, type DiceReply, type DiceSessionState } from "../../../domain/dice/dice";
-import type { DiceApi } from "../../../preload/dice-api";
+import type { DiceApi } from "../../../shared/api/dice-api";
 import { DiceRollAudio } from "../../../render/audio/DiceRollAudio";
 import { useDiceSizes } from "./useDiceSizes";
 
@@ -14,9 +15,10 @@ function unwrapSession(reply: DiceReply<DiceSessionState>): DiceSessionState {
   if (value.protocolVersion !== DICE_PROTOCOL_VERSION) throw new DiceProtocolMismatchError();
   return value;
 }
-function diceApi(): DiceApi { if (!window.ttrpg?.beginDiceRoll) throw new Error("Mesa de dados no disponible."); return window.ttrpg; }
+function requireDiceApi(api: DiceApi | undefined): DiceApi { if (!api?.beginDiceRoll) throw new Error("Mesa de dados no disponible."); return api; }
 
 export function useDiceSession(context: DiceContext) {
+  const diceApi = useTtrpgApi("dice");
   const diceSizes = useDiceSizes();
   const [state, setState] = useState<DiceSessionState>(emptyState);
   const [draft, setDraft] = useState(defaultDiceDraft);
@@ -31,6 +33,7 @@ export function useDiceSession(context: DiceContext) {
   const contextRef = useRef(context); contextRef.current = context;
   const hydrated = useRef(false);
   const alive = useRef(true);
+  const clientGeneration = useRef(0);
   const acceptState = useCallback((value: DiceSessionState): void => {
     setState(current => ({ ...value, envelope: value.envelope.revision >= current.envelope.revision ? value.envelope : current.envelope }));
     setNow(Date.now());
@@ -38,32 +41,36 @@ export function useDiceSession(context: DiceContext) {
 
   useEffect(() => {
     alive.current = true;
-    if (!window.ttrpg?.onDicePresentation) return;
-    const off = window.ttrpg.onDicePresentation(envelope => setState(current => envelope.revision > current.envelope.revision ? { ...current, envelope } : current));
-    const offError = window.ttrpg.onDiceRenderError(setError);
-    return () => { alive.current = false; controller.current?.abort(); audio.current?.dispose(); audio.current = null; off(); offError(); };
-  }, []);
+    clientGeneration.current++;
+    hydrated.current = false;
+    setState(emptyState());
+    setDraft(defaultDiceDraft());
+    if (!diceApi?.onDicePresentation) return () => { alive.current = false; clientGeneration.current++; };
+    const off = diceApi.onDicePresentation(envelope => setState(current => envelope.revision > current.envelope.revision ? { ...current, envelope } : current));
+    const offError = diceApi.onDiceRenderError(setError);
+    return () => { alive.current = false; clientGeneration.current++; controller.current?.abort(); audio.current?.dispose(); audio.current = null; off(); offError(); };
+  }, [diceApi]);
 
   useEffect(() => {
     let cancelled = false;
     controller.current?.abort(); controller.current = null;
     audio.current?.stop();
     setPreparing(false); setReady(false); setError(null);
-    if (!window.ttrpg?.updateDiceContext) return;
-    void window.ttrpg.updateDiceContext(contextRef.current).then(reply => {
+    if (!diceApi?.updateDiceContext) return;
+    void diceApi.updateDiceContext(contextRef.current).then(reply => {
       if (cancelled) return;
       const next = unwrapSession(reply); acceptState(next);
       if (!hydrated.current) { hydrated.current = true; setDraft(next.draft); }
       setReady(true);
     }).catch(caught => { if (!cancelled) setError(caught instanceof Error ? caught.message : "No se pudo abrir la mesa de dados."); });
     return () => { cancelled = true; };
-  }, [context.token, acceptState]);
+  }, [context.token, acceptState, diceApi]);
 
   useEffect(() => {
     if (!ready) return;
-    const timer = setTimeout(() => { void diceApi().updateDicePreferences(draft).catch(() => setError("No se pudo conservar la seleccion de dados.")); }, 150);
+    const timer = setTimeout(() => { void requireDiceApi(diceApi).updateDicePreferences(draft).catch(() => setError("No se pudo conservar la seleccion de dados.")); }, 150);
     return () => clearTimeout(timer);
-  }, [draft, ready]);
+  }, [draft, ready, diceApi]);
   useEffect(() => {
     if (state.busyUntil <= Date.now()) return;
     const timer = setTimeout(() => setNow(Date.now()), state.busyUntil - Date.now() + 20);
@@ -96,43 +103,51 @@ export function useDiceSession(context: DiceContext) {
       setDraft(request.draft);
       await import("../../../render/three/dice/DiceOverlayRenderer");
       if (abort.signal.aborted) return;
-      unwrapSession(await diceApi().updateDiceContext(captured));
+      unwrapSession(await requireDiceApi(diceApi).updateDiceContext(captured));
       if (abort.signal.aborted) return;
-      rollId = unwrap(await diceApi().beginDiceRoll(request)).rollId;
+      rollId = unwrap(await requireDiceApi(diceApi).beginDiceRoll(request)).rollId;
       const { browserDiceSimulation } = await import("../../../infrastructure/dice/browser-dice-simulation");
       const simulation = await browserDiceSimulation.prepare(expandDice(request), request.draft.force, abort.signal);
       if (abort.signal.aborted || captured.token !== contextRef.current.token) return;
-      const completed = unwrapSession(await diceApi().completeDiceRoll(rollId, simulation));
+      const completed = unwrapSession(await requireDiceApi(diceApi).completeDiceRoll(rollId, simulation));
       if (!abort.signal.aborted && captured.token === contextRef.current.token && alive.current) acceptState(completed);
     } catch (caught) {
       if (caught instanceof DiceProtocolMismatchError) setReady(false);
-      if (rollId) { const reply = await diceApi().failDiceRoll(rollId).catch(() => null); if (reply?.ok && !abort.signal.aborted && alive.current) acceptState(reply.value); }
+      if (rollId) { const reply = await requireDiceApi(diceApi).failDiceRoll(rollId).catch(() => null); if (reply?.ok && !abort.signal.aborted && alive.current) acceptState(reply.value); }
       if (!abort.signal.aborted && alive.current) setError(caught instanceof Error && !caught.message.startsWith("[") ? caught.message : "Seleccion de dados invalida.");
     } finally { if (controller.current === abort) { controller.current = null; if (alive.current) setPreparing(false); } }
   };
   const action = async (operation: () => Promise<DiceReply<DiceSessionState>>): Promise<void> => {
-    try { acceptState(unwrapSession(await operation())); } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible completar la accion."); }
+    const generation = clientGeneration.current;
+    try {
+      const next = unwrapSession(await operation());
+      if (alive.current && generation === clientGeneration.current) acceptState(next);
+    } catch (caught) {
+      if (alive.current && generation === clientGeneration.current) setError(caught instanceof Error ? caught.message : "No fue posible completar la accion.");
+    }
   };
   return { state, draft, ready, busy: preparing || state.busyUntil > now, preparing, error: error ?? diceSizes.error, updateDraft, roll, soundEnabled, setSoundEnabled, diceSizes,
-    clearHistory: () => action(() => diceApi().clearDiceHistory()),
-    dismiss: (rollId: string) => action(() => diceApi().dismissDiceRoll(rollId)),
-    showResult: (rollId: string, visible: boolean) => action(() => diceApi().setDiceResultVisibility(rollId, visible)) };
+    clearHistory: () => action(() => requireDiceApi(diceApi).clearDiceHistory()),
+    dismiss: (rollId: string) => action(() => requireDiceApi(diceApi).dismissDiceRoll(rollId)),
+    showResult: (rollId: string, visible: boolean) => action(() => requireDiceApi(diceApi).setDiceResultVisibility(rollId, visible)) };
 }
 
 export function usePublicDice(sceneMapId: string | null, contextRevision: string, ready: boolean): DiceEnvelope {
+  const diceApi = useTtrpgApi("dice");
   const [envelope, setEnvelope] = useState<DiceEnvelope>({ revision: -1, presentation: null });
   useEffect(() => {
-    if (!window.ttrpg?.onDicePresentation) return;
+    setEnvelope({ revision: -1, presentation: null });
+    if (!diceApi?.onDicePresentation) return;
     const accept = (next: DiceEnvelope): void => setEnvelope(current => next.revision >= current.revision ? next : current);
-    return window.ttrpg.onDicePresentation(accept);
-  }, []);
+    return diceApi.onDicePresentation(accept);
+  }, [diceApi]);
   useEffect(() => {
     let cancelled = false;
     setEnvelope(current => ({ ...current, presentation: null }));
-    if (ready && window.ttrpg?.getPublicDiceState) void window.ttrpg.getPublicDiceState().then(reply => {
+    if (ready && diceApi?.getPublicDiceState) void diceApi.getPublicDiceState().then(reply => {
       if (!cancelled && reply.ok) setEnvelope(current => reply.value.revision >= current.revision ? reply.value : current);
     }).catch(() => {});
     return () => { cancelled = true; };
-  }, [sceneMapId, contextRevision, ready]);
+  }, [sceneMapId, contextRevision, ready, diceApi]);
   return ready && (!envelope.presentation || envelope.presentation.mapId === (sceneMapId ?? "")) ? envelope : { ...envelope, presentation: null };
 }
diff --git a/src/renderer/src/hooks/useDiceSizes.ts b/src/renderer/src/hooks/useDiceSizes.ts
index 0f017dd..29f819d 100644
--- a/src/renderer/src/hooks/useDiceSizes.ts
+++ b/src/renderer/src/hooks/useDiceSizes.ts
@@ -1,14 +1,19 @@
+import { useTtrpgApi } from "../client/ClientProvider";
 import { useCallback, useEffect, useRef, useState } from "react";
 import { defaultDiceSizes, type DiceSizeChange, type DiceSizes } from "../../../domain/dice/size";
 
 export function useDiceSizes() {
+  const diceApi = useTtrpgApi("dice");
   const [sizes, setSizes] = useState(defaultDiceSizes), [ready, setReady] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const alive = useRef(false);
+  const clientGeneration = useRef(0);
   const accept = useCallback((value: DiceSizes) => setSizes(current => value.revision >= current.revision ? value : current), []);
   useEffect(() => {
     alive.current = true;
-    const api = window.ttrpg;
+    clientGeneration.current++;
+    setSizes(defaultDiceSizes()); setReady(false); setError(null);
+    const api = diceApi;
     if (!api?.getDiceSizes || !api.onDiceSizes) return () => { alive.current = false; };
     let cancelled = false;
     const off = api.onDiceSizes(value => { if (!cancelled) accept(value); });
@@ -18,15 +23,16 @@ export function useDiceSizes() {
       accept(reply.value); setReady(true);
     }).catch(() => { if (!cancelled) setError("No se pudo cargar el tamano de los dados."); });
     return () => { cancelled = true; alive.current = false; off(); };
-  }, [accept]);
+  }, [accept, diceApi]);
   const setSize = async (change: DiceSizeChange): Promise<void> => {
-    if (!ready || !window.ttrpg?.setDiceSize) return;
+    if (!ready || !diceApi?.setDiceSize) return;
+    const generation = clientGeneration.current;
     try {
-      const reply = await window.ttrpg.setDiceSize(change);
-      if (!alive.current) return;
+      const reply = await diceApi.setDiceSize(change);
+      if (!alive.current || generation !== clientGeneration.current) return;
       if (!reply.ok) throw new Error(reply.error);
       accept(reply.value); setError(null);
-    } catch (caught) { if (alive.current) setError(caught instanceof Error ? caught.message : "No se pudo cambiar el tamano."); }
+    } catch (caught) { if (alive.current && generation === clientGeneration.current) setError(caught instanceof Error ? caught.message : "No se pudo cambiar el tamano."); }
   };
   return { sizes, ready, error, setSize };
 }
diff --git a/src/renderer/src/hooks/useMapImageReplacement.ts b/src/renderer/src/hooks/useMapImageReplacement.ts
index 945604a..2e9c1b0 100644
--- a/src/renderer/src/hooks/useMapImageReplacement.ts
+++ b/src/renderer/src/hooks/useMapImageReplacement.ts
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../client/ClientProvider";
 import { useCallback, useEffect, useRef, useState, type RefObject, type SetStateAction } from "react";
 import { prepareMapImageReplacementUseCase } from "../../../application/use-cases/prepare-map-image-replacement";
 import { computeReplacementScale, type MapImageReplacementPolicy } from "../../../domain/map/map-image-replacement";
@@ -44,6 +45,8 @@ function fingerprint(map: SceneMap): string {
 }
 
 export function useMapImageReplacement(options: Options) {
+  const imagesApi = useTtrpgApi("images");
+  const playerApi = useTtrpgApi("player");
   const latest = useRef(options);
   latest.current = options;
   const generation = useRef(0);
@@ -76,6 +79,8 @@ export function useMapImageReplacement(options: Options) {
     setPlayerError(null);
   }, [cancel]);
 
+  useEffect(() => { resetSession(); }, [imagesApi, resetSession]);
+
   const targetForJob = useCallback((pending: ReplacementJob): SceneMapDocument | null => {
     if (job.current !== pending || generation.current !== pending.generation) return null;
     const current = syncActiveMapFromRuntimeFields(latest.current.sceneRef.current);
@@ -113,7 +118,7 @@ export function useMapImageReplacement(options: Options) {
     }
     let cancelled = false;
     const session = generation.current;
-    void window.ttrpg?.resolveMapUrl(map.imagePath).then((url) => {
+    void imagesApi?.resolveMapUrl(map.imagePath).then((url) => {
       const current = latest.current.sceneRef.current;
       if (cancelled || session !== generation.current || current.activeMapId !== activeMapId
         || current.map.imagePath !== map.imagePath || latest.current.mapImageUrl !== null) return;
@@ -123,7 +128,7 @@ export function useMapImageReplacement(options: Options) {
       }
     }).catch(() => { if (!cancelled) latest.current.onFeedback("No se pudo leer la imagen del mapa."); });
     return () => { cancelled = true; };
-  }, [options.scene.activeMapId, options.scene.map.imagePath, options.mapImageUrl]);
+  }, [options.scene.activeMapId, options.scene.map.imagePath, options.mapImageUrl, imagesApi]);
 
   const onImageLoaded = useCallback((loaded: MapImageDimensions & { imagePath: string; imageUrl: string }) => {
     const { sceneRef, setScene, mapImageUrl } = latest.current;
@@ -140,7 +145,7 @@ export function useMapImageReplacement(options: Options) {
 
   const begin = useCallback(async (mapId: string) => {
     if (job.current !== null) return;
-    const api = window.ttrpg;
+    const api = imagesApi;
     const current = syncActiveMapFromRuntimeFields(latest.current.sceneRef.current);
     const target = current.maps.find((map) => map.id === mapId);
     if (!api || !target) return;
@@ -194,7 +199,7 @@ export function useMapImageReplacement(options: Options) {
       cancel();
       latest.current.onFeedback(caught instanceof Error ? caught.message : "No se pudo preparar la imagen.");
     }
-  }, [cancel, targetForJob]);
+  }, [cancel, targetForJob, imagesApi]);
 
   const confirm = useCallback((policy: MapImageReplacementPolicy) => {
     const pending = job.current;
@@ -227,10 +232,10 @@ export function useMapImageReplacement(options: Options) {
     }
   }, [cancel, targetForJob]);
 
-  useEffect(() => window.ttrpg?.onPlayerMapImageStatus((status) => {
+  useEffect(() => playerApi?.onPlayerMapImageStatus((status) => {
     if (status.imageUrl !== latest.current.mapImageUrl) return;
     setPlayerError(status.ok ? null : status.error ?? "No se pudo actualizar la imagen en Player View.");
-  }), []);
+  }), [playerApi]);
 
   const retryPlayer = useCallback(async () => {
     cancel();
@@ -239,7 +244,7 @@ export function useMapImageReplacement(options: Options) {
     if (current.activeMapId === null || current.map.imagePath === null) return;
     const session = generation.current;
     let url: string | null | undefined;
-    try { url = await window.ttrpg?.resolveMapUrl(current.map.imagePath); }
+    try { url = await imagesApi?.resolveMapUrl(current.map.imagePath); }
     catch { latest.current.onFeedback("No se pudo reintentar la imagen del jugador."); return; }
     if (!url || session !== generation.current || latest.current.mapImageUrl !== mapImageUrl
       || latest.current.sceneRef.current.activeMapId !== current.activeMapId) return;
@@ -247,7 +252,7 @@ export function useMapImageReplacement(options: Options) {
     images.current.set(current.activeMapId, { imagePath: current.map.imagePath, imageUrl: url });
     latest.current.setMapImageUrl(url);
     setPlayerError(null);
-  }, [cancel]);
+  }, [cancel, imagesApi]);
 
   useEffect(() => () => {
     generation.current++;
diff --git a/src/renderer/src/main.tsx b/src/renderer/src/main.tsx
index ecab959..0e23f2f 100644
--- a/src/renderer/src/main.tsx
+++ b/src/renderer/src/main.tsx
@@ -1,3 +1,4 @@
+import { ClientProvider, readLocalClient } from "./client/ClientProvider";
 import { StrictMode } from "react";
 import { createRoot } from "react-dom/client";
 import { App } from "./App";
@@ -5,11 +6,12 @@ import { PlayerApp } from "./PlayerApp";
 import "./styles.css";
 import "./components/workspace/workspace.css";
 
+const client = readLocalClient();
 const params = new URLSearchParams(window.location.search);
 const RootApp = params.get("view") === "player" ? PlayerApp : App;
 
 createRoot(document.getElementById("root") as HTMLElement).render(
   <StrictMode>
-    <RootApp />
+    <ClientProvider client={client}><RootApp /></ClientProvider>
   </StrictMode>
 );

```
