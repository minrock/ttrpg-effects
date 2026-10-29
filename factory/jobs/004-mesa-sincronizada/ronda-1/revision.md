# Identidad de la revisión

Rama autorizada: `feature/fabrica-software`. Sin commits ni merge.

Base Git: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. HEAD actual: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

Se revisa el código de esta spec sobre cambios anteriores no integrados; base-archivos.json identifica su punto de partida. huellas.json congela el contenido de código/config/docs al abrir esta ronda. Los informes de fábrica quedan fuera de las huellas.

## Archivos cambiados por esta spec

- `CHANGELOG.md`
- `README.md`
- `docs/browser-client.md`
- `docs/client-architecture.md`
- `docs/private-api.md`
- `docs/synchronized-table.md`
- `package.json`
- `src/application/services/public-table-projection.fixture.ts`
- `src/application/services/public-table-projection.test.ts`
- `src/application/services/public-table-projection.ts`
- `src/application/services/table-session.ts`
- `src/infrastructure/browser/browser-client.test.ts`
- `src/infrastructure/browser/browser-client.ts`
- `src/infrastructure/browser/http.ts`
- `src/infrastructure/browser/table-client.test.ts`
- `src/infrastructure/browser/table-client.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/App.workspace.test.tsx`
- `src/renderer/src/PlayerApp.map-image.test.tsx`
- `src/renderer/src/PlayerApp.tsx`
- `src/renderer/src/components/aside/PlayerAsideOverlay.tsx`
- `src/renderer/src/components/combat/CombatTurnBar.tsx`
- `src/renderer/src/components/workspace/PlayerTools.css`
- `src/renderer/src/components/workspace/WorkspaceHeader.tsx`
- `src/server/http.test.ts`
- `src/server/http.ts`
- `src/server/table-http.test.ts`
- `src/server/table-http.ts`
- `src/shared/contracts/table.ts`
- `src/web/ServiceApp.test.tsx`
- `src/web/ServiceApp.tsx`
- `src/web/service.css`

## Diff de archivos rastreados contra HEAD

Los archivos nuevos se inspeccionan directamente; sus huellas están registradas.

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index e01fd96..9a00a91 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,54 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
+## [3.5.0] - 2026-10-29
+
+### Agregado — feature
+
+- Mesa privada sincronizada con HTTP/SSE real, bootstrap y reconexión, presencia principal determinista, cámara independiente y órdenes explícitas, puntero y áreas temporales.
+- Proyección pública construida por campos permitidos y acceso a imágenes limitado al conjunto publicado vigente; revocación de futuras lecturas y exclusión de notas, fichas, mapas y objetos privados.
+- Dados compartidos mediante DiceRollSession y replay existente: tiradas públicas/ocultas, resumen, tamaños e historial privado, idempotencia y recuperación temporal.
+- Enlace de jugador sin credenciales, estados de conexión/carga y errores accesibles. Electron local y formato de escena v2 conservados.
+
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
diff --git a/README.md b/README.md
index 9e00e27..630125b 100644
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
@@ -134,3 +144,7 @@ Detalle funcional y tecnico en [spec 37](specs/37-dm-dice-rolls/spec.md) y su [p
 ## Laboratorios de interfaz
 
 Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en memoria y `/player-lab.html` monta Player View con un adaptador local. En este ultimo, `?north=90`, `180` o `270` permite comprobar herramientas con el mapa rotado. Son entradas de desarrollo, sin persistencia ni inclusion en el instalador.
+
+## Servicio privado API
+
+`pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js 24. Requiere configurar claves DM/jugador, origen y directorio exclusivo. Consulta [configuración, rutas, límites y respaldo](docs/private-api.md). La versión 3.5.0 conserva el formato de escena 2 y Electron local, e incluye [cliente navegador](docs/browser-client.md) y [mesa sincronizada HTTP/SSE](docs/synchronized-table.md) con roles DM/jugador.
diff --git a/package.json b/package.json
index b79a0fa..b277081 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.0.0",
+  "version": "3.5.0",
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
diff --git a/src/renderer/src/App.tsx b/src/renderer/src/App.tsx
index af99cb6..32959f0 100644
--- a/src/renderer/src/App.tsx
+++ b/src/renderer/src/App.tsx
@@ -1,3 +1,5 @@
+import type { ServiceWorkspace } from "../../web/workspace";
+import { useTtrpgApi } from "./client/ClientProvider";
 import {
   useCallback,
   useEffect,
@@ -288,8 +290,20 @@ interface NewTokenDraftState {
 const SESSION_AUTOSAVE_DELAY_MS = 1000;
 const PLAYER_SCENE_PUBLISH_DELAY_MS = 250;
 
-export function App(): JSX.Element {
+export function App({ service }: { readonly service?: ServiceWorkspace } = {}): JSX.Element {
+  const [servicePublished, setServicePublished] = useState(false);
+  useEffect(() => {
+    if (!service) return;
+    const update = () => { if (!service.browser.table.getStatus().published) setServicePublished(false); };
+    update(); return service.browser.table.subscribeStatus(update);
+  }, [service]);
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
@@ -478,8 +492,8 @@ export function App(): JSX.Element {
         : { state: "validating" as const }
     ])));
 
-    if (currentFilePath === null || markers.length === 0 || window.ttrpg === undefined) return;
-    void window.ttrpg.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
+    if (currentFilePath === null || markers.length === 0 || scenesApi === undefined) return;
+    void scenesApi.validateSceneLinks({ scenePath: currentFilePath, markers }).then((result) => {
       if (sceneLinkValidationRequestId.current !== requestId) return;
       if (result.ok) {
         setSceneLinkStatuses(result.statuses);
@@ -487,10 +501,10 @@ export function App(): JSX.Element {
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
 
@@ -502,7 +516,7 @@ export function App(): JSX.Element {
 
     let cancelled = false;
     void Promise.all(
-      missingTokens.map(async (token) => [token.id, await window.ttrpg?.resolveTokenUrl(token.imagePath)] as const)
+      missingTokens.map(async (token) => [token.id, await imagesApi?.resolveTokenUrl(token.imagePath)] as const)
     ).then((entries) => {
       if (cancelled) {
         return;
@@ -524,12 +538,13 @@ export function App(): JSX.Element {
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
@@ -538,7 +553,7 @@ export function App(): JSX.Element {
       }
     }, SESSION_AUTOSAVE_DELAY_MS);
     return () => clearTimeout(handle);
-  }, [scene]);
+  }, [scene, service]);
 
   const handleContextMenuRequest = useCallback((request: PixiContextMenuRequest) => {
     setInteraction((current) => {
@@ -616,7 +631,7 @@ export function App(): JSX.Element {
 
   const sendPlayerCameraCommand = useCallback(
     (reason: PlayerCameraCommandReason): void => {
-      if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
+      if (!isPlayerWindowOpenRef.current || playerApi === undefined) {
         refreshPlayerCameraControl("closed");
         return;
       }
@@ -625,13 +640,13 @@ export function App(): JSX.Element {
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
@@ -666,9 +681,9 @@ export function App(): JSX.Element {
 
   const handleArcanePointerTrigger = useCallback((pointer: ArcanePointerBroadcast): void => {
     if (isPlayerWindowOpenRef.current) {
-      void window.ttrpg?.publishPlayerPointer(pointer);
+      void playerApi?.publishPlayerPointer(pointer);
     }
-  }, []);
+  }, [playerApi]);
 
   const handleRoomPinPlace = useCallback((position: WorldPoint): void => {
     const id = getNextAvailableSceneId(sceneRef.current, ["room-pin-"], nextPinId);
@@ -705,13 +720,17 @@ export function App(): JSX.Element {
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
@@ -949,14 +968,14 @@ export function App(): JSX.Element {
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
@@ -982,7 +1001,7 @@ export function App(): JSX.Element {
     } finally {
       setIsBusy(false);
     }
-  }, [currentFilePath, sceneAside]);
+  }, [currentFilePath, sceneAside, scenesApi]);
 
   async function persistCurrentSceneForSceneLink(): Promise<string | null> {
     const currentSnapshot = JSON.stringify({ ...sceneRef.current, sceneAside });
@@ -994,7 +1013,7 @@ export function App(): JSX.Element {
     try {
       saved = currentFilePath === null
         ? await saveCurrentScene()
-        : await window.ttrpg?.saveSceneToPath(
+        : await scenesApi?.saveSceneToPath(
             createSceneSavePayload(sceneRef.current, sceneAside),
             currentFilePath
           );
@@ -1020,7 +1039,7 @@ export function App(): JSX.Element {
     successMessage: string,
     targetScenePath?: string
   ): Promise<boolean> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return false;
     }
@@ -1028,7 +1047,7 @@ export function App(): JSX.Element {
     const scenePath = targetScenePath ?? currentFilePath ?? await persistCurrentSceneForSceneLink();
     if (scenePath === null) return false;
 
-    const saved = await window.ttrpg.saveSceneToPath(createSceneSavePayload(sceneSnapshot, sceneAside), scenePath);
+    const saved = await scenesApi.saveSceneToPath(createSceneSavePayload(sceneSnapshot, sceneAside), scenePath);
     if (!saved.ok) {
       setFeedback(saved.error);
       return false;
@@ -1045,6 +1064,9 @@ export function App(): JSX.Element {
     targetMapId: string,
     targetMarkerId: string
   ): Promise<boolean> {
+    if (marker.connection !== null && marker.connection.peer.mapId === undefined) {
+      throw new Error("Usa Desligar para liberar la conexión con otra escena antes de conectar mapas internos.");
+    }
     const sourceMapId = sceneRef.current.activeMapId;
     if (sourceMapId === null) {
       setFeedback("Selecciona un mapa antes de crear una conexion.");
@@ -1063,8 +1085,9 @@ export function App(): JSX.Element {
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
@@ -1073,18 +1096,46 @@ export function App(): JSX.Element {
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
@@ -1137,7 +1188,7 @@ export function App(): JSX.Element {
       return;
     }
 
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setSceneLinkModalId(marker.id);
       return;
     }
@@ -1145,7 +1196,7 @@ export function App(): JSX.Element {
     if (scenePath === null) return;
     setIsBusy(true);
     try {
-      const result = await window.ttrpg.loadSceneLinkTarget({
+      const result = await scenesApi.loadSceneLinkTarget({
         scenePath,
         markerId: marker.id
       });
@@ -1387,19 +1438,23 @@ export function App(): JSX.Element {
   );
 
   useEffect(() => {
-    if (!isPlayerWindowOpen) {
+    if (service ? !servicePublished : !isPlayerWindowOpen) {
       return undefined;
     }
 
     const handle = window.setTimeout(() => {
-      void window.ttrpg?.publishPlayerScene(playerWindowSnapshot);
+      void playerApi?.publishPlayerScene(playerWindowSnapshot).then(result => { if (!result.ok) setFeedback(result.error ?? "No se pudo publicar la escena."); });
     }, PLAYER_SCENE_PUBLISH_DELAY_MS);
 
     return () => window.clearTimeout(handle);
-  }, [isPlayerWindowOpen, playerWindowSnapshot]);
+  }, [isPlayerWindowOpen, servicePublished, playerWindowSnapshot, playerApi, service]);
 
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
@@ -1408,7 +1463,7 @@ export function App(): JSX.Element {
       acknowledgedPlayerCameraCommandRevisionRef.current = null;
       refreshPlayerCameraControl("closed");
     });
-    const unsubscribeCameraReport = window.ttrpg?.onPlayerCameraReport((report) => {
+    const unsubscribeCameraReport = playerApi?.onPlayerCameraReport((report) => {
       if (!shouldApplyPlayerCameraReport(lastPlayerCameraReportRevisionRef.current, report)) {
         return;
       }
@@ -1427,7 +1482,9 @@ export function App(): JSX.Element {
       }
       refreshPlayerCameraControl();
     });
-    const unsubscribePlayerReady = window.ttrpg?.onPlayerWindowReady(() => {
+    const unsubscribePlayerReady = playerApi?.onPlayerWindowReady(() => {
+      isPlayerWindowOpenRef.current = true;
+      setIsPlayerWindowOpen(true);
       lastPlayerCameraReportRevisionRef.current = -1;
       effectivePlayerCameraRef.current = null;
       effectivePlayerViewportRef.current = null;
@@ -1439,7 +1496,8 @@ export function App(): JSX.Element {
       }
     });
 
-    void window.ttrpg?.getPlayerWindowState().then((state) => {
+    void playerApi?.getPlayerWindowState().then((state) => {
+      if (cancelled) return;
       if (state.cameraCommand !== null) {
         playerCameraCommandRevisionRef.current = Math.max(
           playerCameraCommandRevisionRef.current,
@@ -1455,11 +1513,12 @@ export function App(): JSX.Element {
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
@@ -1468,17 +1527,17 @@ export function App(): JSX.Element {
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
@@ -1487,11 +1546,11 @@ export function App(): JSX.Element {
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
@@ -1500,11 +1559,11 @@ export function App(): JSX.Element {
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
@@ -1515,7 +1574,7 @@ export function App(): JSX.Element {
   const resetToNewScene = useCallback((): void => {
     resetMapImageSession();
     const defaultScene = createEmptyScene();
-    sessionStorage.removeItem("ttrpg:session-scene");
+    if (!service) sessionStorage.removeItem("ttrpg:session-scene");
     setScene(defaultScene);
     setSceneAside(createDefaultSceneAside());
     playerCameraRef.current = normalizeCameraSnapshot({
@@ -1555,7 +1614,7 @@ export function App(): JSX.Element {
     lastSavedSceneJsonRef.current = null;
     refreshPlayerCameraControl();
     sendPlayerCameraCommand("scene-change");
-  }, [refreshPlayerCameraControl, sendPlayerCameraCommand, setGridAdjustMode, resetMapImageSession]);
+  }, [refreshPlayerCameraControl, sendPlayerCameraCommand, setGridAdjustMode, resetMapImageSession, service]);
 
   const handleRequestNewScene = useCallback((): void => {
     if (!canCreateNewScene) {
@@ -1868,11 +1927,11 @@ export function App(): JSX.Element {
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
@@ -1901,13 +1960,43 @@ export function App(): JSX.Element {
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
 
@@ -1926,11 +2015,11 @@ export function App(): JSX.Element {
     readonly camera: ViewportCameraSnapshot;
     readonly cameraSyncKey: number;
   }): void {
-    if (!isPlayerWindowOpenRef.current || window.ttrpg === undefined) {
+    if (playerApi === undefined || (service ? !servicePublished : !isPlayerWindowOpenRef.current)) {
       return;
     }
 
-    void window.ttrpg.publishPlayerScene({
+    void playerApi.publishPlayerScene({
       scene: createPlayerSceneSnapshot({ ...loadedScene, sceneAside: loadedSceneAside }),
       mapImageUrl: loadedMapImageUrl,
       tokenImageUrls: loadedTokenImageUrls,
@@ -1948,8 +2037,7 @@ export function App(): JSX.Element {
   ): Promise<void> {
     setIsBusy(true);
     setWarnings([]);
-    // Saving always resolves any outdated-format situation
-    if (actionLabel === "guardada") setNeedsResave(false);
+
 
     try {
       const result = await operation();
@@ -2018,26 +2106,26 @@ export function App(): JSX.Element {
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
@@ -2066,7 +2154,7 @@ export function App(): JSX.Element {
   }
 
   async function handleImportSceneAsMap(): Promise<void> {
-    if (window.ttrpg === undefined) {
+    if (scenesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
@@ -2076,7 +2164,7 @@ export function App(): JSX.Element {
 
     try {
       const previousFilePath = currentFilePath;
-      const result = await window.ttrpg.importSceneAsMap(createSceneSavePayload(sceneRef.current, sceneAside));
+      const result = await scenesApi.importSceneAsMap(createSceneSavePayload(sceneRef.current, sceneAside));
       if (!result.ok) {
         setFeedback(result.error);
         return;
@@ -2675,12 +2763,12 @@ export function App(): JSX.Element {
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
@@ -2690,10 +2778,16 @@ export function App(): JSX.Element {
       return;
     }
 
-    isPlayerWindowOpenRef.current = true;
-    setIsPlayerWindowOpen(true);
+    if (service) {
+      setServicePublished(true);
+      const state = await playerApi.getPlayerWindowState();
+      isPlayerWindowOpenRef.current = state.isOpen; setIsPlayerWindowOpen(state.isOpen);
+      setFeedback("Proyección publicada. Abre Mesa compartida para copiar el enlace del jugador.");
+    } else {
+      isPlayerWindowOpenRef.current = true; setIsPlayerWindowOpen(true);
+      setFeedback("Ventana de jugador lista.");
+    }
     sendPlayerCameraCommand("open");
-    setFeedback("Ventana de jugador lista.");
   }
 
   const handleSetCombatTracker = useCallback((combatTracker: CombatTracker): void => {
@@ -2840,7 +2934,7 @@ export function App(): JSX.Element {
       return;
     }
 
-    if (window.ttrpg === undefined) {
+    if (imagesApi === undefined) {
       setFeedback("La API de preload no esta disponible.");
       return;
     }
@@ -2849,7 +2943,7 @@ export function App(): JSX.Element {
     setWarnings([]);
 
     try {
-      const result = await window.ttrpg.openTokenImage();
+      const result = await imagesApi.openTokenImage();
 
       if (!result.ok) {
         setFeedback(result.error);
@@ -2867,6 +2961,21 @@ export function App(): JSX.Element {
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
@@ -3321,7 +3430,8 @@ export function App(): JSX.Element {
   return (
     <main className="app-shell vtt-interface" aria-label="TTRPG Effects">
       <WorkspaceHeader
-        sceneName={currentFilePath ? getFileBaseName(currentFilePath) : "Escena sin guardar"}
+        sceneName={currentFilePath ? service?.browser.name(currentFilePath) ?? getFileBaseName(currentFilePath) : "Escena sin guardar"}
+        serviceActions={service ? { onImport: () => void handleServiceAction("import"), onExport: () => void handleServiceAction("export"), onLogout: () => void handleServiceAction("logout"), onTemplates: () => setIsMonsterTemplateManagerOpen(true) } : undefined}
         mapName={scene.maps.find(map => map.id === scene.activeMapId)?.name ?? "Sin mapa"}
         busy={isBusy}
         canCreate={canCreateNewScene}
@@ -3330,7 +3440,7 @@ export function App(): JSX.Element {
         inspectorVisible={isSidebarVisible}
         onNew={handleRequestNewScene}
         onLoad={() => void handleLoadScene()}
-        onSave={() => void handleSaveScene()}
+        onSave={() => handleSaveScene()}
         onPlayer={() => void handleOpenPlayerWindow()}
         onBattle={() => setIsCombatSetupOpen(true)}
         onCounters={() => setIsSceneCounterManagerOpen(true)}
@@ -4541,6 +4651,7 @@ export function App(): JSX.Element {
                           </small>
                         </span>
                       </button>
+                      {service && <button type="button" disabled={isBusy} aria-label={`Reemplazar imagen de ${token.name}`} onClick={() => void handleReplaceTokenImage(token.id)}>Imagen</button>}
                       <button
                         type="button"
                         className="token-visibility-button"
@@ -4906,6 +5017,7 @@ export function App(): JSX.Element {
           )}
           currentScenePath={currentFilePath}
           candidateMaps={sceneLinkCandidateMaps}
+          remote={service ? { select: selectRemoteSceneLinkTarget, connect: (path,id) => handleConnectRemoteSceneLink(sceneLinkModalMarker,path,id) } : undefined}
           onRename={(name) => handleRenameSceneLink(sceneLinkModalMarker.id, name)}
           onConnect={(targetMapId, targetMarkerId) =>
             handleConnectSceneLink(sceneLinkModalMarker, targetMapId, targetMarkerId)
diff --git a/src/renderer/src/App.workspace.test.tsx b/src/renderer/src/App.workspace.test.tsx
index 99a6287..8469f40 100644
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
@@ -305,4 +349,128 @@ describe("App production workspace", () => {
     expect(viewport.mount).toHaveBeenCalledOnce();
     expect(viewport.unmount).not.toHaveBeenCalled();
   });
+  it("publica web por acción explícita y no por la mera presencia de un jugador", async () => {
+    const browser = createBrowserClient(new HttpTransport(vi.fn()), { selectScene: async () => null, sceneName: async () => null });
+    const publish = vi.fn(async () => ({ ok: true }));
+    const open = vi.fn(async () => ({ ok: true }));
+    const client = createClient({ ...browser.client.api, openPlayerWindow: open, publishPlayerScene: publish,
+      getPlayerWindowState: async () => ({ snapshot: null, camera: null, cameraCommand: null, isOpen: true }),
+      commandPlayerCamera: async () => ({ ok: true }) }, browser.client.capabilities, "service");
+    await act(async () => root.render(<ClientProvider client={client}><App service={{ browser, confirmLeave: async () => null, logout: async () => {} }}/></ClientProvider>));
+    await act(async () => vi.advanceTimersByTime(1000));
+    expect(publish).not.toHaveBeenCalled();
+    await click(button("Publicar vista de jugador"));
+    expect(open).toHaveBeenCalledOnce();
+    expect(host.textContent).toContain("Proyección publicada");
+    await click(button("Abrir dados"));
+    expect(element('[role="tab"][aria-selected="true"]#right-tab-dice')).toBeTruthy();
+  });
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
diff --git a/src/renderer/src/PlayerApp.map-image.test.tsx b/src/renderer/src/PlayerApp.map-image.test.tsx
index 48fcc07..66ef7ca 100644
--- a/src/renderer/src/PlayerApp.map-image.test.tsx
+++ b/src/renderer/src/PlayerApp.map-image.test.tsx
@@ -9,6 +9,8 @@ import type { PlayerCameraCommand } from "../../domain/player/player-camera-cont
 import { createDefaultSceneMap, createSceneWithMap } from "../../domain/sessions/scene-maps";
 import type { MapViewport } from "./components/MapViewport";
 import { PlayerApp } from "./PlayerApp";
+import { ClientProvider } from "./client/ClientProvider";
+import { createClient, LOCAL_CAPABILITIES } from "../../shared/api/client";
 
 type ViewportProps = ComponentProps<typeof MapViewport>;
 const viewport = vi.hoisted(() => ({
@@ -129,6 +131,21 @@ describe("PlayerApp map image replacement", () => {
     vi.useRealTimers();
   });
 
+  it("reconfirma textura y ready de servicio tras bootstrap sin reiniciar cámara ni viewport", async () => {
+    const client=createClient(window.ttrpg!,LOCAL_CAPABILITIES,"service");
+    await act(async()=>root.render(<ClientProvider client={client}><PlayerApp/></ClientProvider>));
+    await ready();
+    const localCamera={center:{x:800,y:900},zoom:2};await navigate(localCamera);
+    const cameraProp=props().cameraSnapshot;const mounts=viewport.mount.mock.calls.length;
+    reportImage.mockClear();notifyReady.mockClear();
+    await act(async()=>onScene(initial));await flushReports();
+    expect(reportImage).toHaveBeenCalledExactlyOnceWith({imageUrl:initial.mapImageUrl,ok:true});
+    expect(notifyReady).toHaveBeenCalledOnce();
+    expect(reportImage.mock.invocationCallOrder[0]).toBeLessThan(notifyReady.mock.invocationCallOrder[0]);
+    expect(props().cameraSnapshot).toBe(cameraProp);expect(viewport.effectiveCamera).toEqual(localCamera);
+    expect(viewport.mount).toHaveBeenCalledTimes(mounts);
+  });
+
   it("waits for the initial map and reports readiness for its exact image revision", async () => {
     expect(container.querySelector(".player-loading")).not.toBeNull();
     expect(notifyReady).not.toHaveBeenCalled();
diff --git a/src/renderer/src/PlayerApp.tsx b/src/renderer/src/PlayerApp.tsx
index 590fbe8..95a3aef 100644
--- a/src/renderer/src/PlayerApp.tsx
+++ b/src/renderer/src/PlayerApp.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi, useTtrpgClient } from "./client/ClientProvider";
 import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
 import { Compass, Lock, Unlock, Wrench, ZoomIn, ZoomOut } from "lucide-react";
 import { createDefaultScene } from "../../domain/sessions/default-scene";
@@ -27,7 +28,9 @@ const EMPTY_ITEMS = [] as const;
 const EMPTY_MAP_ANNOTATIONS = { pins: EMPTY_ITEMS, areas: EMPTY_ITEMS, sceneLinks: EMPTY_ITEMS };
 const EMPTY_LINK_STATUSES = {};
 
-export function PlayerApp(): JSX.Element {
+export function PlayerApp({ unavailableMessage }: { readonly unavailableMessage?: string } = {}): JSX.Element {
+  const playerApi = useTtrpgApi("player");
+  const isServiceClient = useTtrpgClient()?.assetReferences === "service";
   const shellRef = useRef<HTMLElement | null>(null);
   const viewportRef = useRef<MapViewportHandle | null>(null);
   const [showTools, setShowTools] = useState(true);
@@ -61,6 +64,7 @@ export function PlayerApp(): JSX.Element {
   const cameraReportRevisionRef = useRef(0);
   const cameraReportTimerRef = useRef<number | null>(null);
   const isCameraReportInFlightRef = useRef(false);
+  const cameraReporterGenerationRef = useRef(0);
   const isCameraReporterActiveRef = useRef(true);
   const pendingCameraReportRef = useRef<{
     readonly camera: ViewportCameraSnapshot;
@@ -77,25 +81,28 @@ export function PlayerApp(): JSX.Element {
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
@@ -105,7 +112,7 @@ export function PlayerApp(): JSX.Element {
         cameraReportTimerRef.current = window.setTimeout(flushPlayerCameraReport, 0);
       }
     });
-  }, []);
+  }, [playerApi]);
 
   const queuePlayerCameraReport = useCallback(
     (
@@ -174,12 +181,15 @@ export function PlayerApp(): JSX.Element {
     [queuePlayerCameraReport]
   );
 
+  const loadedImageUrlRef = useRef<string | null>(null);
+  const [publicationRevision, setPublicationRevision] = useState(0);
   const applySnapshot = useCallback((snapshot: PlayerWindowSnapshot | null): void => {
     if (snapshot === null) {
       return;
     }
 
     setScene(snapshot.scene);
+    if (isServiceClient) setPublicationRevision(value => value + 1);
     setMapImageUrl(snapshot.mapImageUrl);
     requestedImageUrlRef.current = snapshot.mapImageUrl;
     setTokenImageUrls(snapshot.tokenImageUrls);
@@ -199,8 +209,9 @@ export function PlayerApp(): JSX.Element {
         : null;
     if (nextMapLoadKey === null) {
       setIsViewportReady(true);
-    } else if (changesViewport || mapLoadKeyRef.current === null) {
+    } else if (changesViewport || mapLoadKeyRef.current === null || (isServiceClient && mapLoadKeyRef.current !== nextMapLoadKey)) {
       setIsViewportReady(false);
+      loadedImageUrlRef.current = null;
     }
     mapLoadKeyRef.current = nextMapLoadKey;
     if (!hasInitializedCameraRef.current || cameraSyncKeyRef.current !== nextCameraSyncKey) {
@@ -211,33 +222,37 @@ export function PlayerApp(): JSX.Element {
       hasInitializedCameraRef.current = true;
       cameraSyncKeyRef.current = nextCameraSyncKey;
     }
-  }, []);
+  }, [isServiceClient]);
 
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
@@ -258,6 +273,9 @@ export function PlayerApp(): JSX.Element {
     return () => {
       mounted = false;
       isCameraReporterActiveRef.current = false;
+      cameraReporterGenerationRef.current++;
+      isCameraReportInFlightRef.current = false;
+      pendingCameraReportRef.current = null;
       offScene?.();
       offPointer?.();
       offInformationAreaHighlight?.();
@@ -267,7 +285,7 @@ export function PlayerApp(): JSX.Element {
         cameraReportTimerRef.current = null;
       }
     };
-  }, [applyPlayerCameraCommand, applySnapshot]);
+  }, [applyPlayerCameraCommand, applySnapshot, playerApi]);
 
   useEffect(() => {
     updatePlayerViewportReport();
@@ -331,22 +349,30 @@ export function PlayerApp(): JSX.Element {
   const handlePlayerMapReady = useCallback(({ imageUrl }: { imageUrl: string }): void => {
     if (!isCameraReporterActiveRef.current || viewportIdentity !== viewportIdentityRef.current ||
       imageUrl !== requestedImageUrlRef.current) return;
+    loadedImageUrlRef.current = imageUrl;
     setIsViewportReady(true);
-    void window.ttrpg?.reportPlayerMapImageStatus({ imageUrl, ok: true });
-  }, [viewportIdentity]);
+    void playerApi?.reportPlayerMapImageStatus({ imageUrl, ok: true });
+  }, [viewportIdentity, playerApi]);
   const handlePlayerMapError = useCallback(({ imageUrl, error }: { imageUrl: string; error: string }): void => {
     if (!isCameraReporterActiveRef.current || viewportIdentity !== viewportIdentityRef.current ||
       imageUrl !== requestedImageUrlRef.current) return;
+    loadedImageUrlRef.current = null;
     setIsViewportReady(true);
-    void window.ttrpg?.reportPlayerMapImageStatus({ imageUrl, ok: false, error: error.slice(0, 500) });
-  }, [viewportIdentity]);
+    void playerApi?.reportPlayerMapImageStatus({ imageUrl, ok: false, error: error.slice(0, 500) });
+  }, [viewportIdentity, playerApi]);
 
+  const serviceReadyImageUrl = isServiceClient ? mapImageUrl : null;
   useEffect(() => {
     if (isHydrated && isViewportReady) {
-      void window.ttrpg?.notifyPlayerContentReady();
+      if (serviceReadyImageUrl) {
+        if (loadedImageUrlRef.current !== serviceReadyImageUrl) return;
+        // Un bootstrap nuevo necesita confirmar la textura ya cargada en esta conexión.
+        void playerApi?.reportPlayerMapImageStatus({ imageUrl: serviceReadyImageUrl, ok: true });
+      }
+      void playerApi?.notifyPlayerContentReady();
       queuePlayerCameraReport(latestPlayerCameraRef.current, "initialization", true);
     }
-  }, [isHydrated, isViewportReady, queuePlayerCameraReport]);
+  }, [isHydrated, isViewportReady, queuePlayerCameraReport, playerApi, publicationRevision, serviceReadyImageUrl]);
 
   const diceEnvelope = usePublicDice(scene.activeMapId, viewportIdentity ?? "", isHydrated && isViewportReady);
   const { sizes: diceSizes } = useDiceSizes();
@@ -490,9 +516,9 @@ export function PlayerApp(): JSX.Element {
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
diff --git a/src/renderer/src/components/aside/PlayerAsideOverlay.tsx b/src/renderer/src/components/aside/PlayerAsideOverlay.tsx
index dbb6a5e..d987ade 100644
--- a/src/renderer/src/components/aside/PlayerAsideOverlay.tsx
+++ b/src/renderer/src/components/aside/PlayerAsideOverlay.tsx
@@ -1,3 +1,4 @@
+import { useTtrpgApi } from "../../client/ClientProvider";
 import { useEffect, useState, type JSX } from "react";
 import type { SceneMonster, SceneNpc } from "../../../../domain/sessions/scene-aside";
 import {
@@ -35,13 +36,18 @@ export function PlayerAsideOverlay({ aside }: PlayerAsideOverlayProps): JSX.Elem
 // ---------------------------------------------------------------------------
 
 function MonsterCard({ monster }: { monster: SceneMonster }): JSX.Element | null {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [zoomed, setZoomed] = useState(false);
 
   useEffect(() => {
-    if (monster.imagePath === null) return;
-    void window.ttrpg?.resolveAsideUrl(monster.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [monster.imagePath]);
+    let active = true;
+    setImageUrl(null);
+    if (monster.imagePath !== null) void imagesApi?.resolveAsideUrl(monster.imagePath)
+      .then(url => { if (active) setImageUrl(url ?? null); })
+      .catch(() => { if (active) setImageUrl(null); });
+    return () => { active = false; };
+  }, [monster.imagePath, imagesApi]);
 
   if (imageUrl === null) return null;
 
@@ -75,13 +81,18 @@ function MonsterCard({ monster }: { monster: SceneMonster }): JSX.Element | null
 // ---------------------------------------------------------------------------
 
 function NpcCard({ npc }: { npc: SceneNpc }): JSX.Element {
+  const imagesApi = useTtrpgApi("images");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [zoomed, setZoomed] = useState(false);
 
   useEffect(() => {
-    if (npc.imagePath === null) return;
-    void window.ttrpg?.resolveAsideUrl(npc.imagePath).then((url) => setImageUrl(url ?? null));
-  }, [npc.imagePath]);
+    let active = true;
+    setImageUrl(null);
+    if (npc.imagePath !== null) void imagesApi?.resolveAsideUrl(npc.imagePath)
+      .then(url => { if (active) setImageUrl(url ?? null); })
+      .catch(() => { if (active) setImageUrl(null); });
+    return () => { active = false; };
+  }, [npc.imagePath, imagesApi]);
 
   const imgSize = zoomed ? "min(72vw, 72vh)" : "440px";
 
diff --git a/src/renderer/src/components/combat/CombatTurnBar.tsx b/src/renderer/src/components/combat/CombatTurnBar.tsx
index de46ed7..6c9cb35 100644
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
@@ -108,16 +110,16 @@ function CombatTurnParticipant({
       };
     }
 
-    void window.ttrpg?.resolveAsideUrl(participant.imagePath).then((url) => {
+    void imagesApi?.resolveAsideUrl(participant.imagePath).then((url) => {
       if (mounted) {
         setImageUrl(url ?? null);
       }
-    });
+    }).catch(() => { if (mounted) setImageUrl(null); });
 
     return () => {
       mounted = false;
     };
-  }, [participant.imagePath]);
+  }, [participant.imagePath, imagesApi]);
 
   const className = [
     "combat-turn-card",
diff --git a/src/renderer/src/components/workspace/PlayerTools.css b/src/renderer/src/components/workspace/PlayerTools.css
index 01e3d97..9398060 100644
--- a/src/renderer/src/components/workspace/PlayerTools.css
+++ b/src/renderer/src/components/workspace/PlayerTools.css
@@ -100,7 +100,7 @@
 .player-workspace-root .player-zoom-indicator ~ .scene-counters-overlay { top: 16px; left: 70px; max-width: calc(100% - 180px); }
 .player-workspace-root:has(.player-tools__options) .scene-counters-overlay { top: 108px; }
 .player-workspace-root .player-zoom-indicator { top: auto; bottom: 16px; left: 70px; }
-.player-workspace-root .combat-turn-bar { top: auto; bottom: 62px; max-width: calc(100% - 140px); }
+.player-shell.player-workspace-root .combat-turn-bar { top: auto; bottom: 62px; max-width: calc(100% - 140px); }
 
 @media (max-width: 600px) {
   .player-workspace-root:has(.player-tools__options) .compass-overlay.compass-overlay--player { top: 108px; }
@@ -111,5 +111,5 @@
   .player-workspace-root .player-zoom-indicator { max-width: calc(100% - 160px); flex-wrap: wrap; }
   .player-workspace-root:has(.player-tools__options) .scene-counters-overlay { top: 172px; }
   .player-workspace-root .player-zoom-indicator { bottom: 62px; left: 16px; max-width: calc(100% - 32px); }
-  .player-workspace-root .combat-turn-bar { bottom: 70px; max-width: calc(100% - 80px); }
+  .player-shell.player-workspace-root .combat-turn-bar { bottom: 70px; max-width: calc(100% - 80px); }
 }
diff --git a/src/renderer/src/components/workspace/WorkspaceHeader.tsx b/src/renderer/src/components/workspace/WorkspaceHeader.tsx
index 4d085b2..903584e 100644
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
@@ -49,17 +52,24 @@ export function WorkspaceHeader(props: WorkspaceHeaderProps): JSX.Element {
         <button type="button" disabled={props.busy || !props.canCreate} onClick={() => run(props.onNew)}><FilePlus size={16} />Nueva escena</button>
         <button type="button" disabled={props.busy} onClick={() => run(props.onLoad)}><FolderOpen size={16} />Cargar escena</button>
         <button type="button" disabled={props.busy} onClick={() => run(props.onSave)}><Save size={16} />Guardar escena</button>
+        {props.serviceActions && <>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onImport)}>Importar archivo .ttrpgscene</button>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onExport)}>Exportar archivo .ttrpgscene</button>
+          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onTemplates)}>Administrar plantillas</button>
+          <p className="service-menu-note">Servicio privado · DM<br />Proyección y dados compartidos disponibles.</p>
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
       <span className="workspace-header-separator" />
       <button type="button" className="workspace-icon" title="Explorador" aria-label="Alternar explorador" aria-pressed={props.explorerVisible} onClick={props.onExplorer}><PanelLeft size={17} /></button>
       <button type="button" className="workspace-icon" title="Inspector" aria-label="Alternar inspector" aria-pressed={props.inspectorVisible} onClick={props.onInspector}><PanelRight size={17} /></button>
-      <button type="button" className="workspace-present" title="Abrir ventana de jugador" aria-label="Abrir ventana de jugador" disabled={props.busy} onClick={props.onPlayer}><Monitor size={16} /><span>Jugador</span></button>
+      <button type="button" className="workspace-present" title={props.serviceActions ? "Publicar vista de jugador" : "Abrir ventana de jugador"} aria-label={props.serviceActions ? "Publicar vista de jugador" : "Abrir ventana de jugador"} disabled={props.busy} onClick={props.onPlayer}><Monitor size={16} /><span>Jugador</span></button>
     </div>
   </header>;
 }

```
