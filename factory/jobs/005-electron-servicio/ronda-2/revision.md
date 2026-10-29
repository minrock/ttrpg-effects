# Identidad de la revisión

Rama autorizada: `feature/fabrica-software`. Sin commits ni merge.

Base Git: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. HEAD actual: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

Se revisa el código de esta spec sobre cambios anteriores no integrados; base-archivos.json identifica su punto de partida. huellas.json congela el contenido de código/config/docs al abrir esta ronda. Los informes de fábrica quedan fuera de las huellas.

## Archivos cambiados por esta spec

- `CHANGELOG.md`
- `README.md`
- `docs/private-api.md`
- `docs/service-operations.md`
- `electron.vite.config.ts`
- `factory/README.md`
- `factory/migracion-servicio.md`
- `package.json`
- `src/main/electron-config.test.ts`
- `src/main/electron-config.ts`
- `src/main/electron-entry.test.ts`
- `src/main/index.ts`
- `src/main/ipc/player-window-ipc.ts`
- `src/main/local-app.ts`
- `src/main/service-app.test.ts`
- `src/main/service-app.ts`
- `src/main/window-policy.ts`
- `src/server/static-files.test.ts`
- `src/server/static-files.ts`

## Diff de archivos rastreados contra HEAD

Los archivos nuevos se inspeccionan directamente; sus huellas están registradas.

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index e01fd96..d35f6ec 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,62 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
+## [3.6.0] - 2026-10-29
+
+### Agregado — feature
+
+- Electron puede conectarse explícitamente al mismo frontend/API privado mediante un modo servicio aislado, sin preload ni IPC local, con sesión efímera y recuperación de conexión.
+- Validación de origen/HTTPS, bloqueo de navegación externa, ventanas, webviews y permisos; protección de las ventanas locales DM/jugador.
+- Comandos de arranque, guía operativa de HTTPS, claves, persistencia y respaldo/restauración; artefactos de Electron separados de API/web. Formato de escena v2 conservado.
+
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
index 9e00e27..fb8ed0c 100644
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
+El [contrato común y mapa de paridad](docs/client-architecture.md) documenta la composición por raíz React y las capacidades de cada cliente. Electron conserva el modo local y puede conectarse al mismo servicio privado HTTP/SSE que el navegador, con roles DM y jugador. La [guía operativa](docs/service-operations.md) explica cómo ejecutar ambos modos y el servicio.
+
 ## Requisitos
 
 - Node.js compatible con el toolchain actual.
@@ -134,3 +144,9 @@ Detalle funcional y tecnico en [spec 37](specs/37-dm-dice-rolls/spec.md) y su [p
 ## Laboratorios de interfaz
 
 Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en memoria y `/player-lab.html` monta Player View con un adaptador local. En este ultimo, `?north=90`, `180` o `270` permite comprobar herramientas con el mapa rotado. Son entradas de desarrollo, sin persistencia ni inclusion en el instalador.
+
+## Servicio privado API
+
+`pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js 24. Requiere configurar claves DM/jugador, origen y directorio exclusivo. Consulta [configuración, rutas, límites y respaldo](docs/private-api.md). La versión 3.6.0 conserva el formato de escena 2 y Electron local, e incluye [cliente navegador](docs/browser-client.md) y [mesa sincronizada HTTP/SSE](docs/synchronized-table.md) con roles DM/jugador.
+
+Para ejecutar Electron contra el servicio y operar la instancia, consulta [Electron servicio, HTTPS, claves y backup/restore](docs/service-operations.md).
diff --git a/electron.vite.config.ts b/electron.vite.config.ts
index 522515e..368fabf 100644
--- a/electron.vite.config.ts
+++ b/electron.vite.config.ts
@@ -5,6 +5,8 @@ export default defineConfig({
   main: {
     build: {
       rollupOptions: {
+        // Mantener __dirname de los módulos main junto al entry y sus rutas relativas.
+        output: { chunkFileNames: "[name]-[hash].js" },
         input: {
           index: resolve(__dirname, "src/main/index.ts")
         }
diff --git a/package.json b/package.json
index b79a0fa..7d0e9dc 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.0.0",
+  "version": "3.6.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -11,17 +11,26 @@
     "dist:mac": "pnpm build && electron-builder --mac dmg",
     "lint": "eslint .",
     "test": "vitest run",
-    "typecheck": "tsc --noEmit"
+    "typecheck": "tsc --noEmit",
+    "build:api": "pnpm typecheck && vite build --config src/server/vite.config.ts",
+    "start:api": "node out/api/index.mjs",
+    "dev:api": "pnpm build:api && pnpm start:api",
+    "dev:web": "vite --config src/web/vite.config.ts",
+    "build:web": "pnpm typecheck && vite build --config src/web/vite.config.ts",
+    "dev:service": "TTRPG_ELECTRON_MODE=service electron-vite dev",
+    "start:service": "TTRPG_ELECTRON_MODE=service electron ."
   },
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
     "productName": "TTRPG Effects",
-    "copyright": "Copyright © 2026 Luis Moncaris",
+    "copyright": "Copyright \u00a9 2026 Luis Moncaris",
     "directories": {
       "output": "dist"
     },
     "files": [
-      "out/**/*",
+      "out/main/**/*",
+      "out/preload/**/*",
+      "out/renderer/**/*",
       "!out/**/*.map"
     ],
     "extraResources": [
@@ -32,12 +41,18 @@
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
@@ -100,6 +115,7 @@
     "pixi.js": "^8.18.1",
     "react": "^19.0.0",
     "react-dom": "^19.0.0",
+    "sharp": "0.35.5",
     "three": "0.143.0",
     "tiptap-markdown": "^0.9.0",
     "zod": "^4.4.3"
diff --git a/src/main/index.ts b/src/main/index.ts
index a4d0e88..9dfeb92 100644
--- a/src/main/index.ts
+++ b/src/main/index.ts
@@ -1,138 +1,27 @@
-import { app, BrowserWindow, net, protocol, screen } from "electron";
-import { join } from "node:path";
-import { ElectronSceneFileStorage } from "../infrastructure/file-system/electron-scene-file-storage";
-import { ElectronMapImageStorage } from "../infrastructure/file-system/electron-map-image-storage";
-import { fetchMapAsset } from "../infrastructure/file-system/map-asset-url";
-import { ElectronMonsterTemplateRepository } from "../infrastructure/file-system/electron-monster-template-repository";
-import { SqliteEntityLibraryRepository } from "../infrastructure/database/sqlite-entity-library-repository";
-import { SqliteMonsterLibraryRepository } from "../infrastructure/database/sqlite-monster-library-repository";
-import { registerAsideIpc } from "./ipc/aside-ipc";
-import { getRecentScenesStoragePath, installAppMenu, rebuildAppMenu, registerRecentScene } from "./app-menu";
-import { registerEntityLibraryIpc } from "./ipc/entity-library-ipc";
-import { registerMapIpc } from "./ipc/map-ipc";
-import { registerMonsterLibraryIpc } from "./ipc/monster-library-ipc";
-import { registerMonsterTemplateIpc } from "./ipc/monster-template-ipc";
-import { getPlayerWindowRendererIndexPath, preloadPlayerWindow, registerPlayerWindowIpc } from "./ipc/player-window-ipc";
-import { registerSceneIpc } from "./ipc/scene-ipc";
-import { registerSceneNavigationLinksIpc } from "./ipc/scene-navigation-links-ipc";
-import { RecentScenesStore } from "./recent-scenes-store";
-import { registerDiceIpc } from "./ipc/dice-ipc";
-import { getPlayerWindow } from "./ipc/player-window-ipc";
-
-protocol.registerSchemesAsPrivileged([
-  { scheme: "map-asset", privileges: { bypassCSP: true, corsEnabled: true, secure: true, stream: true, supportFetchAPI: true } }
-]);
+import { app, dialog, protocol } from "electron";
+import { readElectronConfig } from "./electron-config";
 
 app.setName("TTRPG Effects");
 
-const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL);
-const appIconPath = isDevelopment
-  ? join(app.getAppPath(), "assets/logo/ttrpg-effects-icon.png")
-  : join(process.resourcesPath, "assets/logo/ttrpg-effects-icon.png");
-
-let mainWindow: BrowserWindow | null = null;
-
-function createMainWindow(): void {
-  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
-
-  mainWindow = new BrowserWindow({
-    width,
-    height,
-    minWidth: 820,
-    minHeight: 520,
-    title: "TTRPG Effects",
-    icon: appIconPath,
-    backgroundColor: "#111315",
-    show: false,
-    webPreferences: {
-      preload: join(__dirname, "../preload/index.cjs"),
-      contextIsolation: true,
-      nodeIntegration: false,
-      sandbox: true
-    }
-  });
-
-  mainWindow.once("ready-to-show", () => {
-    mainWindow?.show();
-  });
-
-  if (isDevelopment) {
-    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL as string);
+async function start(): Promise<void> {
+  // Resolver antes de importar infraestructura local o registrar su protocolo/IPC.
+  const config = readElectronConfig();
+  if (config.mode === "local") {
+    protocol.registerSchemesAsPrivileged([
+      { scheme: "map-asset", privileges: { bypassCSP: true, corsEnabled: true, secure: true, stream: true, supportFetchAPI: true } }
+    ]);
+    const { startLocal } = await import("./local-app");
+    await app.whenReady();
+    await startLocal();
   } else {
-    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
+    const { startService } = await import("./service-app");
+    await app.whenReady();
+    startService(config.origin);
   }
 }
-
-app.whenReady().then(async () => {
-  app.dock?.setIcon(appIconPath);
-
-  protocol.handle("map-asset", (request) =>
-    fetchMapAsset(request.url, (url, options) => net.fetch(url, options))
-  );
-
-  const mapImageStorage = new ElectronMapImageStorage(() => mainWindow);
-  const sceneFileStorage = new ElectronSceneFileStorage(() => mainWindow);
-  const monsterTemplateRepository = new ElectronMonsterTemplateRepository(getMonsterTemplatesStoragePath());
-  const monsterLibraryRepository = new SqliteMonsterLibraryRepository(getLocalDatabasePath());
-  const entityLibraryRepository = new SqliteEntityLibraryRepository(getLocalDatabasePath());
-  const recentScenes = new RecentScenesStore(getRecentScenesStoragePath());
-  const menuOptions = {
-    storage: sceneFileStorage,
-    recentScenes,
-    getMainWindow: () => mainWindow
-  };
-  await installAppMenu(menuOptions);
-  registerSceneIpc(sceneFileStorage, {
-    onRecentScenePath: async (filePath) => {
-      await registerRecentScene(recentScenes, filePath);
-      await rebuildAppMenu(menuOptions);
-    }
-  });
-  registerSceneNavigationLinksIpc(sceneFileStorage, {
-    getMainWindow: () => mainWindow,
-    onRecentScenePath: async (filePath) => {
-      await registerRecentScene(recentScenes, filePath);
-      await rebuildAppMenu(menuOptions);
-    }
-  });
-  registerMapIpc(mapImageStorage, { getMainWindow: () => mainWindow });
-  registerAsideIpc(mapImageStorage);
-  registerMonsterTemplateIpc(monsterTemplateRepository);
-  registerMonsterLibraryIpc(monsterLibraryRepository);
-  registerEntityLibraryIpc({
-    npcRepository: {
-      search: (query) => entityLibraryRepository.searchNpcs(query),
-      findById: (id) => entityLibraryRepository.findNpcById(id),
-      save: (entry) => entityLibraryRepository.saveNpc(entry)
-    },
-    playerCharacterRepository: {
-      search: (query) => entityLibraryRepository.searchPlayerCharacters(query),
-      findById: (id) => entityLibraryRepository.findPlayerCharacterById(id),
-      save: (entry) => entityLibraryRepository.savePlayerCharacter(entry)
-    }
-  });
-  const playerWindowOptions = {
-    isDevelopment,
-    rendererUrl: process.env.ELECTRON_RENDERER_URL,
-    preloadPath: join(__dirname, "../preload/index.cjs"),
-    iconPath: appIconPath,
-    rendererIndexPath: getPlayerWindowRendererIndexPath()
-  };
-  registerPlayerWindowIpc(playerWindowOptions);
-  createMainWindow();
-  const disposeDice = registerDiceIpc({ getDmWindow: () => mainWindow, getPlayerWindow });
-  app.once("before-quit", disposeDice);
-  preloadPlayerWindow(playerWindowOptions);
-});
-
-app.on("window-all-closed", () => {
+void start().catch(async () => {
+  await app.whenReady();
+  dialog.showErrorBox("No se pudo iniciar TTRPG Effects", "Comprueba TTRPG_ELECTRON_MODE (local o service), TTRPG_SERVICE_URL (origen HTTPS; HTTP solo en loopback) y el acceso al almacenamiento. No se cambió de modo.");
   app.quit();
 });
-
-function getMonsterTemplatesStoragePath(): string {
-  return `${app.getPath("userData")}/monster-templates.json`;
-}
-
-function getLocalDatabasePath(): string {
-  return `${app.getPath("userData")}/ttrpg-effects.sqlite`;
-}
+app.on("window-all-closed", () => app.quit());
diff --git a/src/main/ipc/player-window-ipc.ts b/src/main/ipc/player-window-ipc.ts
index 9c49863..41d8ddc 100644
--- a/src/main/ipc/player-window-ipc.ts
+++ b/src/main/ipc/player-window-ipc.ts
@@ -1,5 +1,6 @@
 import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
 import { join } from "node:path";
+import { installNavigationPolicy, localRendererPolicy } from "../window-policy";
 import { sanitizeInformationAreaHighlightBroadcast } from "../../domain/annotations/map-annotations";
 import { sanitizePlayerWindowSnapshot } from "../../domain/player/player-window-snapshot";
 import { sanitizePlayerMapImageStatus } from "../../domain/player/map-image-report";
@@ -202,6 +203,8 @@ function ensurePlayerWindow(options: PlayerWindowIpcOptions): void {
     }
   });
 
+  installNavigationPolicy(playerWindow.webContents, localRendererPolicy(options.rendererUrl, options.rendererIndexPath));
+
   playerWindow.once("ready-to-show", () => {
     isPlayerWindowReady = true;
     if (shouldShowPlayerWindowWhenReady) {

```
