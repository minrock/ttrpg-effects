# Identidad de revisión

Checkout: /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects

Rama: feature/factory-006-persistencia-multidb. Base main: e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. HEAD: e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. Sin commits/merge.

Prerrequisitos.env3.7.0 heredados, en factory/prerrequisitos-autenticacion.json. base-archivos.json identifica inicio de este trabajo; huellas.json incluye todos los archivos de código y docs (nuevos se leen directamente); registros de trabajos/tablero/cola excluidos.

## Archivos del trabajo

- `.env.example`
- `CHANGELOG.md`
- `README.md`
- `docs/database.md`
- `docs/private-api.md`
- `docs/service-operations.md`
- `factory/autenticacion-partidas.md`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/setup-env.sh`
- `src/application/services/game-catalog.ts`
- `src/domain/games/game-metadata.ts`
- `src/infrastructure/server/database/catalog-repository.ts`
- `src/infrastructure/server/database/catalog.contract.ts`
- `src/infrastructure/server/database/config.test.ts`
- `src/infrastructure/server/database/config.ts`
- `src/infrastructure/server/database/driver.ts`
- `src/infrastructure/server/database/index.ts`
- `src/infrastructure/server/database/migrations.ts`
- `src/infrastructure/server/database/vitest.config.ts`
- `src/server/config.ts`
- `src/server/db-migrate.ts`
- `src/server/environment-setup.test.ts`
- `src/server/vite.config.ts`

## Diff completo rastreado contra main

```diff
diff --git a/.gitignore b/.gitignore
index 00fedf9..6c1c1da 100644
--- a/.gitignore
+++ b/.gitignore
@@ -40,6 +40,7 @@ logs/
 .env
 .env.*
 !.env.example
+!.env.electron.example
 
 # ── Editor / OS ───────────────────────────────────────────────────────────────
 .DS_Store
@@ -61,4 +62,4 @@ tmp/
 
 # ── Debug artifacts ───────────────────────────────────────────────────────────
 /index.html
-/index.js
\ No newline at end of file
+/index.js
diff --git a/CHANGELOG.md b/CHANGELOG.md
index d35f6ec..3dc4864 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,22 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
+## [3.8.0] - 2026-10-29
+
+### Agregado — feature
+
+- Catálogo de partidas con propietario, puertos asíncronos y adaptadores SQLite/PostgreSQL, transacciones con rollback y cierre explícito de recursos.
+- Migraciones versionadas e idempotentes mediante `pnpm db:migrate`, configuración local/producción y TLS PostgreSQL verificado; contratos reales de ambos motores mediante `pnpm test:db`.
+- Guía de drivers y transición: la API legada conserva SQLite local y rechaza producción/PostgreSQL hasta migrar todo el almacenamiento funcional. Sin cambios de autenticación ni del formato de escena v2.
+
+## [3.7.0] - 2026-10-29
+
+### Agregado
+
+- Configuración de API desde `.env` y de Electron desde `.env.electron`, cargada al arrancar sin exports manuales ni dependencias nuevas. Las variables del proceso tienen precedencia.
+- Preparación Bash idempotente con claves privadas persistentes, archivos con permisos 600 y directorio de datos 700; conserva configuraciones existentes y mantiene secretos fuera de Git y del cliente.
+- El arranque de la API muestra el host, el puerto efectivo y el enlace del origen público configurado para abrir la aplicación.
+
 ## [3.6.0] - 2026-10-29
 
 ### Agregado — feature
diff --git a/README.md b/README.md
index fb8ed0c..b003b27 100644
--- a/README.md
+++ b/README.md
@@ -150,3 +150,11 @@ Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en
 `pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js 24. Requiere configurar claves DM/jugador, origen y directorio exclusivo. Consulta [configuración, rutas, límites y respaldo](docs/private-api.md). La versión 3.6.0 conserva el formato de escena 2 y Electron local, e incluye [cliente navegador](docs/browser-client.md) y [mesa sincronizada HTTP/SSE](docs/synchronized-table.md) con roles DM/jugador.
 
 Para ejecutar Electron contra el servicio y operar la instancia, consulta [Electron servicio, HTTPS, claves y backup/restore](docs/service-operations.md).
+
+### Configuración local del servicio
+
+Ejecuta `pnpm setup:env` una vez para crear `.env`, `.env.electron` y el directorio privado de datos. Después usa `pnpm start:api` y, en otra terminal, `pnpm start:service`. Las claves DM/jugador permanecen en `.env`; el modo y la URL del cliente están en `.env.electron`. Consulta la [guía operativa](docs/service-operations.md) para builds y detalles.
+
+### Persistencia multi-DB
+
+La versión 3.8.0 incorpora infraestructura y catálogo de partidas para SQLite local/PostgreSQL producción, con migraciones explícitas y contratos reales. **La API global todavía solo arranca con local + sqlite**; la migración funcional y autenticación por cuentas siguen pendientes. Consulta [drivers, migraciones y gate test:db](docs/database.md).
diff --git a/docs/private-api.md b/docs/private-api.md
index 6205a24..821f78e 100644
--- a/docs/private-api.md
+++ b/docs/private-api.md
@@ -2,9 +2,11 @@
 
 El servicio Node.js 24 administra una instancia privada. Electron conserva su modo local y su perfil. Incluye el [cliente navegador](browser-client.md). La [mesa sincronizada](synchronized-table.md) añade SSE, publicación y assets autorizados para jugadores.
 
+La infraestructura de [catálogo multi-DB](database.md) todavía no sustituye este almacenamiento global. Desde 3.8.0, la API rechaza postgres/production antes de abrir datos; sin variables nuevas conserva local + sqlite. No se añaden cuentas ni autorización de partidas a estas rutas.
+
 ## Arranque y configuración
 
-Instalar con `pnpm install`, compilar con `pnpm build:api` y ejecutar con `pnpm start:api`. `pnpm dev:api` compila y ejecuta; reiniciarlo tras editar fuentes. El artefacto es `out/api/index.mjs`, independiente de Electron. Para trasladarlo conservar `node_modules` de producción (Zod, honeycomb-grid y sharp son externos al bundle; sharp requiere los binarios de su plataforma instalados por pnpm). `pnpm dev` continúa ejecutando Electron local.
+Instalar con `pnpm install`, compilar con `pnpm build:api` y ejecutar con `pnpm start:api`. `pnpm dev:api` compila y ejecuta; reiniciarlo tras editar fuentes. El entry es `out/api/index.mjs`; conservar todo `out/api`, incluidos los chunks compartidos y `db-migrate.mjs`,, independiente de Electron. Para trasladarlo conservar `node_modules` de producción (Zod, honeycomb-grid y sharp son externos al bundle; sharp requiere los binarios de su plataforma instalados por pnpm). `pnpm dev` continúa ejecutando Electron local.
 
 | Variable | Regla |
 | --- | --- |
diff --git a/docs/service-operations.md b/docs/service-operations.md
index 8f3d6e1..8f88257 100644
--- a/docs/service-operations.md
+++ b/docs/service-operations.md
@@ -1,7 +1,9 @@
-# Operar el servicio y conectar Electron — 3.6.0
+# Operar el servicio y conectar Electron — 3.8.0
 
 Electron arranca **local** por defecto. El modo **service** carga exactamente el cliente web y guarda en el servicio indicado por el título de ventana; no abre la biblioteca ni los archivos del perfil local. No inicia un servidor. El formato `.ttrpgscene` continúa en v2, con migración de v1.
 
+La [infraestructura multi-DB y catálogo](database.md) añade `control.sqlite` local y PostgreSQL para migraciones/pruebas. La API descrita aquí sigue usando almacenamiento legado: solo admite `TTRPG_DEPLOYMENT=local` y `TTRPG_DB_DRIVER=sqlite` (defaults). Declarar production/postgres falla antes de arrancar; no hay aún servicio completo PostgreSQL.
+
 ## Instalar, construir y ejecutar
 
 Requiere Node.js **24**, pnpm y, para Electron, un escritorio compatible. Desde la raíz del proyecto:
@@ -13,31 +15,39 @@ pnpm build:web
 pnpm build
 ```
 
-Las salidas independientes son `out/api/index.mjs`, `out/web`, y `out/main` + `out/preload` + `out/renderer`. Ningún build borra los otros. El empaquetado Electron solo incluye sus tres directorios; no incorpora el build API/web, datos ni configuración. No hace falta empaquetar para ejecutar el main compilado. En un servidor sin escritorio bastan los dos primeros builds, package.json y dependencias de producción instaladas en la arquitectura destino; sharp contiene binarios nativos. No trasladar node_modules entre arquitecturas.
+Las salidas independientes son `out/api` (entry `index.mjs`, comando `db-migrate.mjs` y chunks compartidos), `out/web`, y `out/main` + `out/preload` + `out/renderer`. Ningún build borra los otros. El empaquetado Electron solo incluye sus tres directorios; no incorpora el build API/web, datos ni configuración. No hace falta empaquetar para ejecutar el main compilado. En un servidor sin escritorio bastan los dos primeros builds, package.json y dependencias de producción instaladas en la arquitectura destino; sharp contiene binarios nativos. No trasladar node_modules entre arquitecturas.
 
-Crea un directorio físico privado fuera del repositorio y del perfil Electron. Proporciona las claves por un gestor de secretos o un archivo de entorno privado (chmod 600), nunca en `VITE_*`, argumentos URL, frontend ni logs. Por ejemplo, genera **dos valores distintos** con `pnpm exec node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'`, ejecutándolo dos veces en tu terminal privada. Cada clave debe tener 32–1024 caracteres.
+Prepara una vez la configuración privada con el script Bash:
+
+```sh
+pnpm setup:env
+```
+
+Crea `.env` para la API y `.env.electron` para el cliente, ambos con permisos **0600**, y un directorio de datos **0700** bajo `~/.local/share/ttrpg-effects-service`. Guarda rutas absolutas reales y genera dos claves aleatorias diferentes, que permanecen entre arranques. No imprime claves ni sobrescribe archivos existentes; rechaza enlaces simbólicos. Puedes seleccionar otro directorio al prepararlo por primera vez con `TTRPG_DATA_DIR=/ruta/privada/mesa pnpm setup:env`.
+
+Los archivos privados están ignorados por Git y excluidos del empaquetado. Las plantillas `.env.example` y `.env.electron.example` documentan las variables sin secretos. Consulta las claves DM/jugador en tu `.env` privado para iniciar sesión; no las copies a `.env.electron`, `VITE_*` ni URLs.
+
+Después basta arrancar la API desde la raíz del proyecto:
 
 ```sh
-export TTRPG_HOST=127.0.0.1
-export TTRPG_PORT=8787
-export TTRPG_DATA_DIR=/ruta/fisica/privada/mesa
-export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787
-export TTRPG_WEB_DIR="$PWD/out/web"
-# Proveer TTRPG_DM_KEY y TTRPG_PLAYER_KEY desde la configuración privada.
 pnpm start:api
 ```
 
-Abre el origen en el navegador. Con API activa, en otra terminal:
+Abre `http://127.0.0.1:8787`. En otra terminal, conecta Electron:
 
 ```sh
-TTRPG_SERVICE_URL=http://127.0.0.1:8787 pnpm start:service
+pnpm start:service
 ```
 
-`start:service` ejecuta `electron .` con `TTRPG_ELECTRON_MODE=service`. Carga el build web de la API, no `out/renderer`. La sesión Electron es efímera: recargar conserva la cookie y cerrar la aplicación exige un nuevo acceso. No comparte cookies con Electron local, navegador ni otro proceso Electron servicio. Para proyectar, publica y copia el **Enlace jugador** de Mesa a un navegador/perfil independiente; allí accede con clave Jugador. `Abrir enlace` se bloquea en Electron por la política de ventanas; el campo Enlace jugador permanece visible y seleccionable. La política de permisos puede impedir el botón Copiar: en ese caso aparece «Selecciona el enlace y cópialo manualmente»; selecciona el campo y usa Cmd/Ctrl+C o Editar → Copiar. La URL por sí sola no cambia el rol de una cookie DM.
+Node carga `.env` para la API y únicamente `.env.electron` para el comando Electron. El entorno explícito del proceso tiene precedencia sobre el archivo. Los archivos son opcionales si ya proporcionas variables desde el entorno; no se ejecutan como Bash ni expanden `$HOME`/`$PWD`. Cambiar la configuración requiere reiniciar el proceso.
+
+En `.env.electron`, `TTRPG_ELECTRON_MODE=service` selecciona servicio y `TTRPG_SERVICE_URL=http://127.0.0.1:8787` define el destino. Cambia el modo a `local` para usar almacenamiento local mediante el mismo comando. Sin archivo ni variables, Electron conserva su valor predeterminado local. `pnpm dev` sigue siendo el desarrollo local tradicional y no carga `.env.electron`; `pnpm dev:service` sí lo carga. El DMG instalado no busca estos archivos del repositorio: esta carga pertenece a los comandos pnpm.
+
+En modo servicio, `start:service` ejecuta Electron y carga el build web de la API, no `out/renderer`. La sesión Electron es efímera: recargar conserva la cookie y cerrar la aplicación exige un nuevo acceso. No comparte cookies con Electron local, navegador ni otro proceso Electron servicio. Para proyectar, publica y copia el **Enlace jugador** de Mesa a un navegador/perfil independiente; allí accede con clave Jugador. `Abrir enlace` se bloquea en Electron por la política de ventanas; el campo Enlace jugador permanece visible y seleccionable. La política de permisos puede impedir el botón Copiar: en ese caso aparece «Selecciona el enlace y cópialo manualmente»; selecciona el campo y usa Cmd/Ctrl+C o Editar → Copiar. La URL por sí sola no cambia el rol de una cookie DM.
 
 Si cierras la ventana o sales de Electron con cambios pendientes, aparece una confirmación nativa: **Seguir editando** conserva el borrador para que puedas guardarlo; **Descartar y salir** cierra perdiendo esos cambios. Escape cancela la salida. Sin cambios pendientes, la aplicación cierra normalmente.
 
-Desarrollo API/web: `TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:5175 pnpm dev:api` con las demás variables anteriores; en otra terminal `pnpm dev:web`. Este Vite usa puerto 5175 y proxy hacia API 8787. Para probar Electron sobre ese frontend: `TTRPG_SERVICE_URL=http://127.0.0.1:5175 pnpm dev:service`. Modo servicio tiene precedencia sobre `ELECTRON_RENDERER_URL`. Para desarrollo Electron local, usa `pnpm dev` sin `TTRPG_ELECTRON_MODE`; no necesita servicio ni claves.
+Desarrollo API/web: `TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:5175 pnpm dev:api` con el resto de variables en `.env`; en otra terminal `pnpm dev:web`. Este Vite usa puerto 5175 y proxy hacia API 8787. Para probar Electron sobre ese frontend: `TTRPG_SERVICE_URL=http://127.0.0.1:5175 pnpm dev:service`. Modo servicio tiene precedencia sobre `ELECTRON_RENDERER_URL`. Para desarrollo Electron local, usa `pnpm dev` sin `TTRPG_ELECTRON_MODE`; no necesita servicio ni claves.
 
 ## Variables
 
@@ -88,7 +98,7 @@ Login establece cookie HttpOnly/SameSite=Strict limitada a `/api/v1`, Secure con
 
 Para rotar claves, detener limpiamente la API, cambiar ambas en la configuración privada y arrancar. El reinicio invalida **todas** las sesiones, publicación, presencia y dados, que viven en memoria. No existe recarga dinámica de variables ni revocación retroactiva de bytes descargados. Los jugadores deben acceder otra vez y el DM volver a publicar.
 
-`TTRPG_DATA_DIR` contiene `service.sqlite` (escenas, imágenes BLOB, plantillas y metadatos), `monsters.sqlite`, `entities.sqlite` y sus sidecars SQLite mientras existan. No hay carpeta separada de assets: están en service.sqlite. `service.lock` evita otra instancia. Directorio 0700 y configuración 0600; no compartir escritura con otros procesos. El perfil Electron local es independiente y no se migra. Reiniciar conserva recursos guardados, no estado de mesa ni borradores clientes.
+`TTRPG_DATA_DIR` contiene `service.sqlite` (escenas, imágenes BLOB, plantillas y metadatos), `monsters.sqlite`, `entities.sqlite` y sus sidecars SQLite mientras existan. No hay carpeta separada de assets: están en service.sqlite. `service.lock` evita otra instancia. Si se ejecutó `db:migrate` local, el directorio también contiene `control.sqlite` y sus sidecars, con exclusión independiente `control.lock`; incluirlos en el respaldo completo. Directorio 0700 y configuración 0600; no compartir escritura con otros procesos. El perfil Electron local es independiente y no se migra. Reiniciar conserva recursos guardados, no estado de mesa ni borradores clientes.
 
 ## Backup y restauración
 
diff --git a/factory/backlog.md b/factory/backlog.md
index eaeaa44..00b0faa 100644
--- a/factory/backlog.md
+++ b/factory/backlog.md
@@ -1,9 +1,18 @@
 # Cola de migración a servicio privado
 
-Serie construida en `feature/fabrica-software` sin commits intermedios; el usuario autorizó después su integración mediante `$factory aprobar`. El detalle y decisiones comunes están en [migracion-servicio.md](migracion-servicio.md). Las casillas permanecen abiertas hasta integrar; el tablero indica construcción y aprobación técnica.
+Serie construida en `feature/fabrica-software` sin commits intermedios; el usuario autorizó después su integración mediante `$factory aprobar`. El detalle y decisiones comunes están en [migracion-servicio.md](migracion-servicio.md). Las cinco specs quedaron integradas en `main` con DMG 3.6.0 generado y verificado; el tablero conserva las rondas y decisiones.
 
-- [ ] Contrato común para clientes web y Electron — `001-contrato-clientes`
-- [ ] API privada, escenas, imágenes y bibliotecas — `002-api-privada`
-- [ ] Cliente web con el frontend VTT existente — `003-cliente-navegador`
-- [ ] Sincronización privada entre DM y jugadores — `004-mesa-sincronizada`
-- [ ] Electron como cliente del servicio y entrega operativa — `005-electron-servicio`
+- [x] Contrato común para clientes web y Electron — `001-contrato-clientes`
+- [x] API privada, escenas, imágenes y bibliotecas — `002-api-privada`
+- [x] Cliente web con el frontend VTT existente — `003-cliente-navegador`
+- [x] Sincronización privada entre DM y jugadores — `004-mesa-sincronizada`
+- [x] Electron como cliente del servicio y entrega operativa — `005-electron-servicio`
+
+## Serie: cuentas DM y partidas privadas multi-DB
+
+- [ ] Persistencia común SQLite y PostgreSQL — `006-persistencia-multidb`
+- [ ] Cuentas DM administradas y autenticación segura — `007-cuentas-dm`
+- [ ] Partidas de cada DM y datos aislados en ambos motores — `008-partidas-propiedad`
+- [ ] Enlaces renovables y entrada de jugadores con alias — `009-invitaciones-jugadores`
+- [ ] Expulsión inmediata y mesas sincronizadas independientes — `010-moderacion-tiempo-real`
+- [ ] Acceso DM, invitaciones y panel de jugadores en web y Electron — `011-experiencia-autenticacion`
diff --git a/factory/board.json b/factory/board.json
index d979a15..e9319d8 100644
--- a/factory/board.json
+++ b/factory/board.json
@@ -1,13 +1,13 @@
 {
   "version": 1,
-  "actualizado": "2026-10-29T15:36:46.561655+00:00",
+  "actualizado": "2026-10-29T23:24:26.929070+00:00",
   "trabajos": [
     {
       "id": "001-contrato-clientes",
       "titulo": "Contrato común para clientes web y Electron",
       "rama": "feature/fabrica-software",
       "base": "7d66e79a60f5c2f499495aaef68c8878d2dc7070",
-      "etapa": "integracion",
+      "etapa": "integrado",
       "ciclo": 1,
       "ronda": 2,
       "constructor": "/root/constructor_001",
@@ -34,18 +34,20 @@
         }
       ],
       "dependencias": [],
-      "motivo": "Aprobada técnicamente y por el usuario. Integración autorizada; espera cierre técnico de 005 para integrar los cambios acumulados.",
+      "motivo": "Aprobada por el usuario e integrada en main; DMG 3.6.0 arm64 generado y verificado. Sin push.",
       "backlog": {
         "linea": 5,
         "texto": "- [ ] Contrato común para clientes web y Electron — `001-contrato-clientes`"
-      }
+      },
+      "integradoEn": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "dmg": "dist/TTRPG Effects-3.6.0-arm64.dmg"
     },
     {
       "id": "002-api-privada",
       "titulo": "API privada, escenas, imágenes y bibliotecas",
       "rama": "feature/fabrica-software",
       "base": "7d66e79a60f5c2f499495aaef68c8878d2dc7070",
-      "etapa": "integracion",
+      "etapa": "integrado",
       "ciclo": 1,
       "ronda": 2,
       "constructor": "/root/constructor_002",
@@ -74,18 +76,20 @@
       "dependencias": [
         "001-contrato-clientes"
       ],
-      "motivo": "Aprobada técnicamente y por el usuario. Integración autorizada; espera cierre técnico de 005 para integrar los cambios acumulados.",
+      "motivo": "Aprobada por el usuario e integrada en main; DMG 3.6.0 arm64 generado y verificado. Sin push.",
       "backlog": {
         "linea": 6,
         "texto": "- [ ] API privada, escenas, imágenes y bibliotecas — `002-api-privada`"
-      }
+      },
+      "integradoEn": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "dmg": "dist/TTRPG Effects-3.6.0-arm64.dmg"
     },
     {
       "id": "003-cliente-navegador",
       "titulo": "Cliente web con el frontend VTT existente",
       "rama": "feature/fabrica-software",
       "base": "7d66e79a60f5c2f499495aaef68c8878d2dc7070",
-      "etapa": "integracion",
+      "etapa": "integrado",
       "ciclo": 2,
       "ronda": 3,
       "constructor": "/root/constructor_003",
@@ -124,18 +128,20 @@
       "dependencias": [
         "002-api-privada"
       ],
-      "motivo": "Aprobada técnicamente y por el usuario. Integración autorizada; espera cierre técnico de 005 para integrar los cambios acumulados.",
+      "motivo": "Aprobada por el usuario e integrada en main; DMG 3.6.0 arm64 generado y verificado. Sin push.",
       "backlog": {
         "linea": 7,
         "texto": "- [ ] Cliente web con el frontend VTT existente — `003-cliente-navegador`"
-      }
+      },
+      "integradoEn": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "dmg": "dist/TTRPG Effects-3.6.0-arm64.dmg"
     },
     {
       "id": "004-mesa-sincronizada",
       "titulo": "Sincronización privada entre DM y jugadores",
       "rama": "feature/fabrica-software",
       "base": "7d66e79a60f5c2f499495aaef68c8878d2dc7070",
-      "etapa": "integracion",
+      "etapa": "integrado",
       "ciclo": 2,
       "ronda": 3,
       "constructor": "/root/constructor_004",
@@ -174,18 +180,20 @@
       "dependencias": [
         "003-cliente-navegador"
       ],
-      "motivo": "Aprobada técnicamente y por el usuario. Integración autorizada; espera cierre técnico de 005 para integrar los cambios acumulados.",
+      "motivo": "Aprobada por el usuario e integrada en main; DMG 3.6.0 arm64 generado y verificado. Sin push.",
       "backlog": {
         "linea": 8,
         "texto": "- [ ] Sincronización privada entre DM y jugadores — `004-mesa-sincronizada`"
-      }
+      },
+      "integradoEn": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "dmg": "dist/TTRPG Effects-3.6.0-arm64.dmg"
     },
     {
       "id": "005-electron-servicio",
       "titulo": "Electron como cliente del servicio y entrega operativa",
       "rama": "feature/fabrica-software",
       "base": "7d66e79a60f5c2f499495aaef68c8878d2dc7070",
-      "etapa": "integracion",
+      "etapa": "integrado",
       "ciclo": 1,
       "ronda": 2,
       "constructor": "/root/constructor_005",
@@ -214,10 +222,130 @@
       "dependencias": [
         "004-mesa-sincronizada"
       ],
-      "motivo": "Aprobada técnicamente y por el usuario. Preparando integración conjunta de001–005 y DMG3.6.0.",
+      "motivo": "Aprobada por el usuario e integrada en main; DMG 3.6.0 arm64 generado y verificado. Sin push.",
       "backlog": {
         "linea": 9,
         "texto": "- [ ] Electron como cliente del servicio y entrega operativa — `005-electron-servicio`"
+      },
+      "integradoEn": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "dmg": "dist/TTRPG Effects-3.6.0-arm64.dmg"
+    },
+    {
+      "id": "006-persistencia-multidb",
+      "titulo": "Persistencia común SQLite y PostgreSQL",
+      "rama": "feature/factory-006-persistencia-multidb",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "construccion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": "/root/aprobador_005",
+      "rondas": [],
+      "dependencias": [],
+      "motivo": "Catálogo implementado; verificando cierre de conexiones y pruebas reales SQLite/PostgreSQL antes de revisión.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 13,
+        "texto": "- [ ] Persistencia común SQLite y PostgreSQL — `006-persistencia-multidb`"
+      }
+    },
+    {
+      "id": "007-cuentas-dm",
+      "titulo": "Cuentas DM administradas y autenticación segura",
+      "rama": "feature/factory-007-cuentas-dm",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "006-persistencia-multidb"
+      ],
+      "motivo": "Especificación terminada; espera aprobación técnica de 006 para construcción.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 14,
+        "texto": "- [ ] Cuentas DM administradas y autenticación segura — `007-cuentas-dm`"
+      }
+    },
+    {
+      "id": "008-partidas-propiedad",
+      "titulo": "Partidas de cada DM y datos aislados en ambos motores",
+      "rama": "feature/factory-008-partidas-propiedad",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "007-cuentas-dm"
+      ],
+      "motivo": "Especificación terminada; espera aprobación técnica de 006 y 007 para construcción.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 15,
+        "texto": "- [ ] Partidas de cada DM y datos aislados en ambos motores — `008-partidas-propiedad`"
+      }
+    },
+    {
+      "id": "009-invitaciones-jugadores",
+      "titulo": "Enlaces renovables y entrada de jugadores con alias",
+      "rama": "feature/factory-009-invitaciones-jugadores",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "008-partidas-propiedad"
+      ],
+      "motivo": "Especificación terminada; espera aprobación técnica de 008 para construcción.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 16,
+        "texto": "- [ ] Enlaces renovables y entrada de jugadores con alias — `009-invitaciones-jugadores`"
+      }
+    },
+    {
+      "id": "010-moderacion-tiempo-real",
+      "titulo": "Expulsión inmediata y mesas sincronizadas independientes",
+      "rama": "feature/factory-010-moderacion-tiempo-real",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "009-invitaciones-jugadores"
+      ],
+      "motivo": "Especificación en preparación; construcción secuencial según dependencias.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 17,
+        "texto": "- [ ] Expulsión inmediata y mesas sincronizadas independientes — `010-moderacion-tiempo-real`"
+      }
+    },
+    {
+      "id": "011-experiencia-autenticacion",
+      "titulo": "Acceso DM, invitaciones y panel de jugadores en web y Electron",
+      "rama": "feature/factory-011-experiencia-autenticacion",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "010-moderacion-tiempo-real"
+      ],
+      "motivo": "Especificación terminada; espera aprobación técnica de 010 para construcción.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 18,
+        "texto": "- [ ] Acceso DM, invitaciones y panel de jugadores en web y Electron — `011-experiencia-autenticacion`"
       }
     }
   ]
diff --git a/factory/jobs/005-electron-servicio/integracion.md b/factory/jobs/005-electron-servicio/integracion.md
index 3fe9342..3a5ed62 100644
--- a/factory/jobs/005-electron-servicio/integracion.md
+++ b/factory/jobs/005-electron-servicio/integracion.md
@@ -8,4 +8,12 @@ Se prepara un único commit de la serie acumulada en feature/fabrica-software, c
 
 El índice se preparó con rutas explícitas contrastadas contra el manifiesto congelado y los expedientes de fábrica, sin rutas ajenas. La comprobación completa `git diff --cached --check` señaló 840 espacios de contexto en los diffs archivados dentro de revision.md y una línea vacía final en src/shared/api/ttrpg-api.ts. Se conserva la evidencia inmutable y el código aprobado: son avisos de formato, no fallos funcionales. La comprobación del resto con `git -c core.whitespace=-blank-at-eof diff --cached --check -- . ":(exclude)factory/jobs/**/revision.md"` pasó. No se omite ningún fallo de tests o compilación.
 
-Estado: integración y empaquetado en ejecución; resultado final pendiente.
+## Resultado final
+
+- Commit de integración: `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Avance rápido de `feature/fabrica-software` a `main`, sin conflictos.
+- `./scripts/build-dmg.sh`: salida 0; typecheck, compilación y electron-builder correctos. Log local: `/tmp/ttrpg-3.6.0-dmg.log`.
+- DMG: `dist/TTRPG Effects-3.6.0-arm64.dmg`, 149414812 bytes.
+- SHA-256: `9f0123da40493235e9044e26cea8eba655f1a1952fdbccb71dd98a1be87b6415`.
+- `hdiutil verify`: salida 0, checksum VALID. Log local: `/tmp/ttrpg-3.6.0-dmg-verify.log`.
+- Paquete arm64 para uso personal/interno, sin firma Developer ID, según configuración existente. No se instaló ni desplegó. Sin push.
+- Tablero y backlog marcan las cinco specs integradas tras el éxito del empaquetado. Estos registros posteriores al commit se conservan como cambios locales, conforme a la skill, sin crear un commit adicional por iniciativa propia.
diff --git a/package.json b/package.json
index 7d0e9dc..3a661d7 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.6.0",
+  "version": "3.8.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -13,12 +13,15 @@
     "test": "vitest run",
     "typecheck": "tsc --noEmit",
     "build:api": "pnpm typecheck && vite build --config src/server/vite.config.ts",
-    "start:api": "node out/api/index.mjs",
+    "start:api": "node --env-file-if-exists=.env out/api/index.mjs",
     "dev:api": "pnpm build:api && pnpm start:api",
     "dev:web": "vite --config src/web/vite.config.ts",
     "build:web": "pnpm typecheck && vite build --config src/web/vite.config.ts",
-    "dev:service": "TTRPG_ELECTRON_MODE=service electron-vite dev",
-    "start:service": "TTRPG_ELECTRON_MODE=service electron ."
+    "dev:service": "node --env-file-if-exists=.env.electron node_modules/electron-vite/bin/electron-vite.js dev",
+    "start:service": "node --env-file-if-exists=.env.electron node_modules/electron/cli.js .",
+    "setup:env": "bash scripts/setup-env.sh",
+    "db:migrate": "node --env-file-if-exists=.env out/api/db-migrate.mjs",
+    "test:db": "vitest run --config src/infrastructure/server/database/vitest.config.ts"
   },
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
@@ -112,6 +115,7 @@
     "honeycomb-grid": "^4.1.5",
     "lucide-react": "^1.34.0",
     "marked": "^18.0.4",
+    "pg": "8.23.1",
     "pixi.js": "^8.18.1",
     "react": "^19.0.0",
     "react-dom": "^19.0.0",
@@ -123,6 +127,7 @@
   "devDependencies": {
     "@eslint/js": "^9.0.0",
     "@types/node": "^24.0.0",
+    "@types/pg": "8.23.1",
     "@types/react": "^19.0.0",
     "@types/react-dom": "^19.0.0",
     "@types/three": "0.143.0",
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 96dd614..60b8b0c 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -59,6 +59,9 @@ importers:
       marked:
         specifier: ^18.0.4
         version: 18.0.4
+      pg:
+        specifier: 8.23.1
+        version: 8.23.1
       pixi.js:
         specifier: ^8.18.1
         version: 8.18.1
@@ -87,6 +90,9 @@ importers:
       '@types/node':
         specifier: ^24.0.0
         version: 24.12.4
+      '@types/pg':
+        specifier: 8.23.1
+        version: 8.23.1
       '@types/react':
         specifier: ^19.0.0
         version: 19.2.14
@@ -1349,6 +1355,9 @@ packages:
   '@types/node@24.12.4':
     resolution: {integrity: sha512-GUUEShf+PBCGW2KaXwcIt3Yk+e3pkKwWKb9GSyM9WQVE+ep2jzmHdGsHzu4wgcZy5fN9FBdVzjpBQsYlpfpgLA==}
 
+  '@types/pg@8.23.1':
+    resolution: {integrity: sha512-fKVHpikPdg4GKks3JuLEhvwSyvwzF23hnabPy6DD8ljVbC7+6J5dQzdv4arV6jqq57djnMgs1HKBxX4P8aBI3A==}
+
   '@types/plist@3.0.5':
     resolution: {integrity: sha512-E6OCaRmAe4WDmWNsL/9RMqdkkzDCY1etutkflWk4c+AcjDU07Pcz1fQwTX0TQz+Pxqn9i4L1TU3UFpjnrcDgxA==}
 
@@ -2491,6 +2500,40 @@ packages:
   pend@1.2.0:
     resolution: {integrity: sha512-F3asv42UuXchdzt+xXqfW1OGlVBe+mxa2mqI0pg5yAHZPvFmY3Y6drSf/GQ1A86WgWEN9Kzh/WrgKa6iGcHXLg==}
 
+  pg-cloudflare@1.4.1:
+    resolution: {integrity: sha512-6PQbsFWZcp9EmJEwy5cGQ2La+AMWpP46lgbb8X+U/XsHIUweYDNCpeuKck5RxL2MdVFi7krbbEi5nX4Zh7JhrQ==}
+
+  pg-connection-string@2.14.1:
+    resolution: {integrity: sha512-qR3kGNPBLpCNtz0evbKA0Y/MRFXwSSdT+pTJvYp/bXTcReZbvX1kzF0IyTc1QnxqF7AZbOeBhNL8R5mYQZV/MA==}
+
+  pg-int8@1.0.1:
+    resolution: {integrity: sha512-WCtabS6t3c8SkpDBUlb1kjOs7l66xsGdKpIPZsg4wR+B3+u9UAum2odSsF9tnvxg80h4ZxLWMy4pRjOsFIqQpw==}
+    engines: {node: '>=4.0.0'}
+
+  pg-pool@3.14.0:
+    resolution: {integrity: sha512-gKtPkFdQPU3DksooVLi9LsjZxrsBUZIpa+7aVx+LV5pNh0KzP4Zleud2po+ConrxbuXGBJ6Hfer6hdgpIBpBaw==}
+    peerDependencies:
+      pg: '>=8.0'
+
+  pg-protocol@1.16.1:
+    resolution: {integrity: sha512-p9VOFMiHB/ZbJATetbg+99PxssTVSQRnyuPSQ67mN1+1KBOjZaZ83ZQzltnxPhJwSsC3nwVjJ10DVJlerbFzLg==}
+
+  pg-types@2.2.0:
+    resolution: {integrity: sha512-qTAAlrEsl8s4OiEQY69wDvcMIdQN6wdz5ojQiOy6YRMuynxenON0O5oCpJI6lshc6scgAY8qvJ2On/p+CXY0GA==}
+    engines: {node: '>=4'}
+
+  pg@8.23.1:
+    resolution: {integrity: sha512-aL96AHANtWjPLDOLqnhx+ngp9+UK7ETEU8VJrDCGvsSSi/mGLcWYsS6Herg7lmaBJe4uwrfqsa7gTEFaSizDoQ==}
+    engines: {node: '>= 16.0.0'}
+    peerDependencies:
+      pg-native: '>=3.0.1'
+    peerDependenciesMeta:
+      pg-native:
+        optional: true
+
+  pgpass@1.0.5:
+    resolution: {integrity: sha512-FdW9r/jQZhSeohs1Z3sI1yxFQNFvMcnmfuj4WBMUTxOrAyLMaTcE1aAMBiTlbMNaXvBCQuVi0R7hd8udDSP7ug==}
+
   picocolors@1.1.1:
     resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}
 
@@ -2513,6 +2556,22 @@ packages:
     resolution: {integrity: sha512-SoSL4+OSEtR99LHFZQiJLkT59C5B1amGO1NzTwj7TT1qCUgUO6hxOvzkOYxD+vMrXBM3XJIKzokoERdqQq/Zmg==}
     engines: {node: ^10 || ^12 || >=14}
 
+  postgres-array@2.0.0:
+    resolution: {integrity: sha512-VpZrUqU5A69eQyW2c5CA1jtLecCsN2U/bD6VilrFDWq5+5UIEVO7nazS3TEcHf1zuPYO/sqGvUvW62g86RXZuA==}
+    engines: {node: '>=4'}
+
+  postgres-bytea@1.0.1:
+    resolution: {integrity: sha512-5+5HqXnsZPE65IJZSMkZtURARZelel2oXUEO8rH83VS/hxH5vv1uHquPg5wZs8yMAfdv971IU+kcPUczi7NVBQ==}
+    engines: {node: '>=0.10.0'}
+
+  postgres-date@1.0.7:
+    resolution: {integrity: sha512-suDmjLVQg78nMK2UZ454hAG+OAW+HQPZ6n++TNDUX+L0+uUlLywnoxJKDou51Zm+zTCjrCl0Nq6J9C5hP9vK/Q==}
+    engines: {node: '>=0.10.0'}
+
+  postgres-interval@1.2.0:
+    resolution: {integrity: sha512-9ZhXKM/rw350N1ovuWHbGxnGh/SNJ4cnxHiM0rxE4VN41wsg8P8zWn9hv/buK00RP4WvlOyr/RBDiptyxVbkZQ==}
+    engines: {node: '>=0.10.0'}
+
   postject@1.0.0-alpha.6:
     resolution: {integrity: sha512-b9Eb8h2eVqNE8edvKdwqkrY6O7kAwmI8kcnBv1NScolYJbo59XUF0noFq+lxbC1yN20bmC0WBEbDC5H/7ASb0A==}
     engines: {node: '>=14.0.0'}
@@ -2740,6 +2799,10 @@ packages:
     resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
     engines: {node: '>=0.10.0'}
 
+  split2@4.2.0:
+    resolution: {integrity: sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==}
+    engines: {node: '>= 10.x'}
+
   sprintf-js@1.1.3:
     resolution: {integrity: sha512-Oo+0REFV59/rz3gfJNKQiBlwfHaSESl1pcGyABQsnnIfWOFt6JNj5gCog2U6MLZ//IGYD+nA8nI+mTShREReaA==}
 
@@ -3063,6 +3126,10 @@ packages:
   xmlchars@2.2.0:
     resolution: {integrity: sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==}
 
+  xtend@4.0.2:
+    resolution: {integrity: sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==}
+    engines: {node: '>=0.4'}
+
   y18n@5.0.8:
     resolution: {integrity: sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==}
     engines: {node: '>=10'}
@@ -4138,6 +4205,12 @@ snapshots:
     dependencies:
       undici-types: 7.16.0
 
+  '@types/pg@8.23.1':
+    dependencies:
+      '@types/node': 24.12.4
+      pg-protocol: 1.16.1
+      pg-types: 2.2.0
+
   '@types/plist@3.0.5':
     dependencies:
       '@types/node': 24.12.4
@@ -5462,6 +5535,41 @@ snapshots:
 
   pend@1.2.0: {}
 
+  pg-cloudflare@1.4.1:
+    optional: true
+
+  pg-connection-string@2.14.1: {}
+
+  pg-int8@1.0.1: {}
+
+  pg-pool@3.14.0(pg@8.23.1):
+    dependencies:
+      pg: 8.23.1
+
+  pg-protocol@1.16.1: {}
+
+  pg-types@2.2.0:
+    dependencies:
+      pg-int8: 1.0.1
+      postgres-array: 2.0.0
+      postgres-bytea: 1.0.1
+      postgres-date: 1.0.7
+      postgres-interval: 1.2.0
+
+  pg@8.23.1:
+    dependencies:
+      pg-connection-string: 2.14.1
+      pg-pool: 3.14.0(pg@8.23.1)
+      pg-protocol: 1.16.1
+      pg-types: 2.2.0
+      pgpass: 1.0.5
+    optionalDependencies:
+      pg-cloudflare: 1.4.1
+
+  pgpass@1.0.5:
+    dependencies:
+      split2: 4.2.0
+
   picocolors@1.1.1: {}
 
   picomatch@4.0.4: {}
@@ -5498,6 +5606,16 @@ snapshots:
       picocolors: 1.1.1
       source-map-js: 1.2.1
 
+  postgres-array@2.0.0: {}
+
+  postgres-bytea@1.0.1: {}
+
+  postgres-date@1.0.7: {}
+
+  postgres-interval@1.2.0:
+    dependencies:
+      xtend: 4.0.2
+
   postject@1.0.0-alpha.6:
     dependencies:
       commander: 9.5.0
@@ -5782,6 +5900,8 @@ snapshots:
 
   source-map@0.6.1: {}
 
+  split2@4.2.0: {}
+
   sprintf-js@1.1.3:
     optional: true
 
@@ -6048,6 +6168,8 @@ snapshots:
 
   xmlchars@2.2.0: {}
 
+  xtend@4.0.2: {}
+
   y18n@5.0.8: {}
 
   yallist@3.1.1: {}
diff --git a/src/server/config.ts b/src/server/config.ts
index 34d36ad..0da5a0e 100644
--- a/src/server/config.ts
+++ b/src/server/config.ts
@@ -1,3 +1,4 @@
+import { assertLegacyDatabase, readDatabaseConfig, validateDatabaseConfig, type DatabaseConfig } from "../infrastructure/server/database/config";
 import { isAbsolute } from "node:path";
 
 export const LIMITS = {
@@ -7,12 +8,16 @@ export const LIMITS = {
   headersMs: 10_000, bodyMs: 30_000
 } as const;
 export interface ServerConfig {
+  readonly database?: DatabaseConfig;
   readonly webDir?: string;
   readonly host: string; readonly port: number; readonly dataDir: string;
   readonly publicOrigin: string; readonly dmKey: string; readonly playerKey: string;
 }
 export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
+  const database = readDatabaseConfig(env);
+  assertLegacyDatabase(database);
   const config = {
+    database,
     webDir: env.TTRPG_WEB_DIR,
     host: env.TTRPG_HOST ?? "127.0.0.1", port: Number(env.TTRPG_PORT ?? "8787"),
     dataDir: env.TTRPG_DATA_DIR ?? "", publicOrigin: env.TTRPG_PUBLIC_ORIGIN ?? "",
@@ -22,6 +27,7 @@ export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
   return config;
 }
 export function validateConfig(c: ServerConfig): void {
+  assertLegacyDatabase(c.database ? validateDatabaseConfig(c.database) : { driver: "sqlite", deployment: "local" });
   if (c.webDir !== undefined && !isAbsolute(c.webDir)) throw new Error("TTRPG_WEB_DIR debe ser absoluto.");
   if (!c.host || !Number.isInteger(c.port) || c.port < 0 || c.port > 65535) throw new Error("TTRPG_HOST/TTRPG_PORT inválidos.");
   if (!isAbsolute(c.dataDir)) throw new Error("TTRPG_DATA_DIR debe ser una ruta absoluta exclusiva del servicio.");
diff --git a/src/server/index.ts b/src/server/index.ts
index be8f0f3..2030dfd 100644
--- a/src/server/index.ts
+++ b/src/server/index.ts
@@ -5,8 +5,9 @@ import { version } from "../../package.json";
 async function main(): Promise<void> {
   if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("El servicio requiere Node.js 24.");
   const config = readConfig(); const api = createApi(config, { version });
-  try { await api.listen(); } catch { await api.close(); throw new Error("No se pudo iniciar el servicio. Comprueba el puerto y el almacenamiento."); }
-  process.stdout.write(`TTRPG Effects API ${version} lista.\n`);
+  let port: number;
+  try { port = await api.listen(); } catch { await api.close(); throw new Error("No se pudo iniciar el servicio. Comprueba el puerto y el almacenamiento."); }
+  process.stdout.write(`TTRPG Effects API ${version} lista.\nHost: ${config.host} | Puerto: ${port}\nAbrir: ${config.publicOrigin}\n`);
   let stopping = false;
   const stop = () => { if (stopping) return; stopping = true; void api.close().then(() => process.exit(0)); };
   process.on("SIGINT", stop); process.on("SIGTERM", stop);
diff --git a/src/server/vite.config.ts b/src/server/vite.config.ts
index 069368d..c2a2ddf 100644
--- a/src/server/vite.config.ts
+++ b/src/server/vite.config.ts
@@ -1,5 +1,5 @@
 import { resolve } from "node:path";
 export default {
-  build: { ssr: resolve(import.meta.dirname, "index.ts"), outDir: "out/api", emptyOutDir: true,
-    target: "node24", rollupOptions: { output: { entryFileNames: "index.mjs" } } }
+  build: { ssr: true, outDir: "out/api", emptyOutDir: true,
+    target: "node24", rollupOptions: { input: { index: resolve(import.meta.dirname, "index.ts"), "db-migrate": resolve(import.meta.dirname, "db-migrate.ts") }, output: { entryFileNames: "[name].mjs" } } }
 };

```
