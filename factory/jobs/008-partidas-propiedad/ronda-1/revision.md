# Identidad de revisión

Checkout: /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects

Rama: feature/factory-006-persistencia-multidb. Base main: e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. HEAD: e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. Sin commits/merge.

Prerrequisitos.env3.7.0 heredados, en factory/prerrequisitos-autenticacion.json. base-archivos.json identifica inicio de este trabajo; huellas.json incluye todos los archivos de código y docs (nuevos se leen directamente); registros de trabajos/tablero/cola excluidos.

## Archivos del trabajo

- `CHANGELOG.md`
- `README.md`
- `docs/database.md`
- `docs/owned-data.md`
- `docs/private-api.md`
- `docs/service-operations.md`
- `package.json`
- `src/application/services/application-error.ts`
- `src/application/services/game-catalog.ts`
- `src/application/services/game-runtime.ts`
- `src/application/services/identity.ts`
- `src/application/services/owned-games.ts`
- `src/application/services/owned-store.ts`
- `src/domain/games/game-metadata.ts`
- `src/infrastructure/server/database/catalog-repository.ts`
- `src/infrastructure/server/database/catalog.contract.ts`
- `src/infrastructure/server/database/driver.ts`
- `src/infrastructure/server/database/migrations.ts`
- `src/infrastructure/server/identity/database.ts`
- `src/infrastructure/server/identity/identity.contract.ts`
- `src/infrastructure/server/identity/index.ts`
- `src/infrastructure/server/owned/fixtures.ts`
- `src/infrastructure/server/owned/owned.contract.ts`
- `src/infrastructure/server/owned/records.ts`
- `src/infrastructure/server/owned/repository.ts`
- `src/infrastructure/server/owned/transfer-fixture.ts`
- `src/infrastructure/server/owned/transfer.contract.ts`
- `src/infrastructure/server/owned/transfer.ts`
- `src/infrastructure/server/owned/vitest.config.ts`
- `src/server/data-cli.ts`
- `src/server/errors.ts`
- `src/server/http.ts`
- `src/server/owned-http.ts`
- `src/server/owned-scene-links.ts`
- `src/server/owned-scene-service.ts`
- `src/server/schemas.ts`
- `src/server/vite.config.ts`
- `src/shared/contracts/resource-inputs.ts`

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
index d35f6ec..affca5d 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,39 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
+## [3.10.0] - 2026-10-30
+
+### Agregado — feature
+
+- Catálogo privado de partidas por DM, revisiones optimistas e idempotencia persistida, con archivo/borrado y cierre de apertura atómicos.
+- Escenas, assets y bibliotecas reutilizables por propietario en SQLite/PostgreSQL reales, rutas DM separadas de la API global y apertura/lease preparados para invitaciones posteriores.
+- Herramientas privadas de respaldo, exportación, adopción, verificación y restauración de datos legados, con selección explícita de dueño, hashes y rollback transaccional.
+- Contratos reales de aislamiento, concurrencia, migración y restauración; sin nuevas pantallas ni cambios del formato portable v2. El corte productivo completo continúa reservado a011.
+
+## [3.9.0] - 2026-10-29
+
+### Agregado — feature
+
+- Identidad de administrador/DM con Better Auth 1.7.14, credenciales scrypt de coste explícito y sesiones revocables persistentes en SQLite/PostgreSQL.
+- Alta DM exclusivamente administrativa, contraseñas temporales, cambio obligatorio, recuperación local y comandos interactivos sin eco.
+- Rutas de identidad optativas, cuotas y migración versionada; las cuentas nuevas siguen separadas de la mesa legada. Sin cambios en UI ni formato de escena v2.
+
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
index fb8ed0c..f047ce5 100644
--- a/README.md
+++ b/README.md
@@ -150,3 +150,19 @@ Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en
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
+
+## Identidad de cuentas optativa (007)
+
+La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](docs/identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.
+
+## Partidas y datos privados (008)
+
+La versión3.10.0 entrega backend de partidas por DM y recursos reutilizables por propietario, con transacciones SQLite/PostgreSQL, revisiones/idempotencia y herramientas de adopción explícita. [API y operación de datos privados](docs/owned-data.md). El servicio global histórico continúa limitado a local+SQLite; las nuevas cuentas y datos están separados, el arnés PostgreSQL se prueba sin ServiceStore y el corte de producto/UI está pendiente de011.
diff --git a/docs/private-api.md b/docs/private-api.md
index 6205a24..deea3f0 100644
--- a/docs/private-api.md
+++ b/docs/private-api.md
@@ -1,10 +1,14 @@
 # Servicio privado HTTP (3.6.0)
 
+Este documento describe los contratos legados. Las rutas optativas de cuentas007 tienen cookies, errores y persistencia independientes: [identidad](identity.md). Una cuenta nueva no autoriza las rutas globales de este documento.
+
 El servicio Node.js 24 administra una instancia privada. Electron conserva su modo local y su perfil. Incluye el [cliente navegador](browser-client.md). La [mesa sincronizada](synchronized-table.md) añade SSE, publicación y assets autorizados para jugadores.
 
+La infraestructura de [catálogo multi-DB](database.md) todavía no sustituye este almacenamiento global. Desde 3.8.0, la API rechaza postgres/production antes de abrir datos; sin variables nuevas conserva local + sqlite. No se añaden cuentas ni autorización de partidas a estas rutas.
+
 ## Arranque y configuración
 
-Instalar con `pnpm install`, compilar con `pnpm build:api` y ejecutar con `pnpm start:api`. `pnpm dev:api` compila y ejecuta; reiniciarlo tras editar fuentes. El artefacto es `out/api/index.mjs`, independiente de Electron. Para trasladarlo conservar `node_modules` de producción (Zod, honeycomb-grid y sharp son externos al bundle; sharp requiere los binarios de su plataforma instalados por pnpm). `pnpm dev` continúa ejecutando Electron local.
+Instalar con `pnpm install`, compilar con `pnpm build:api` y ejecutar con `pnpm start:api`. `pnpm dev:api` compila y ejecuta; reiniciarlo tras editar fuentes. El entry es `out/api/index.mjs`; conservar todo `out/api`, incluidos los chunks compartidos y `db-migrate.mjs`,, independiente de Electron. Para trasladarlo conservar `node_modules` de producción (Zod, honeycomb-grid y sharp son externos al bundle; sharp requiere los binarios de su plataforma instalados por pnpm). `pnpm dev` continúa ejecutando Electron local.
 
 | Variable | Regla |
 | --- | --- |
@@ -125,3 +129,11 @@ El endpoint de conexión entre escenas rechaza marcadores que aún tienen un enl
 La [mesa sincronizada](synchronized-table.md) completa `/table/*` y `/dice/*`, SSE, presencia e idempotencia. Assets GET/HEAD y resolve aceptan sesión jugador exclusivamente para referencias del conjunto público vigente; no exponen escenas ni bibliotecas privadas.
 
 Guía operativa completa de producción, Electron servicio, HTTPS y respaldo: [Operar el servicio](service-operations.md).
+
+## Identidad de cuentas optativa (007)
+
+La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.
+
+## Backend privado008
+
+Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
diff --git a/docs/service-operations.md b/docs/service-operations.md
index 8f3d6e1..49bc606 100644
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
+
+Prepara una vez la configuración privada con el script Bash:
+
+```sh
+pnpm setup:env
+```
+
+Crea `.env` para la API y `.env.electron` para el cliente, ambos con permisos **0600**, y un directorio de datos **0700** bajo `~/.local/share/ttrpg-effects-service`. Guarda rutas absolutas reales y genera dos claves aleatorias diferentes, que permanecen entre arranques. No imprime claves ni sobrescribe archivos existentes; rechaza enlaces simbólicos. Puedes seleccionar otro directorio al prepararlo por primera vez con `TTRPG_DATA_DIR=/ruta/privada/mesa pnpm setup:env`.
+
+Los archivos privados están ignorados por Git y excluidos del empaquetado. Las plantillas `.env.example` y `.env.electron.example` documentan las variables sin secretos. Consulta las claves DM/jugador en tu `.env` privado para iniciar sesión; no las copies a `.env.electron`, `VITE_*` ni URLs.
 
-Crea un directorio físico privado fuera del repositorio y del perfil Electron. Proporciona las claves por un gestor de secretos o un archivo de entorno privado (chmod 600), nunca en `VITE_*`, argumentos URL, frontend ni logs. Por ejemplo, genera **dos valores distintos** con `pnpm exec node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'`, ejecutándolo dos veces en tu terminal privada. Cada clave debe tener 32–1024 caracteres.
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
 
@@ -84,11 +94,13 @@ Con puerto público no estándar conserva también ese puerto en Host y origen.
 
 ## Sesiones, claves y almacenamiento
 
+Los párrafos de claves/globales de esta sección describen el acceso legado. Las sesiones de cuentas007 sí persisten tras reinicio y se revocan al rotar TTRPG_AUTH_SECRET; su provisión, recuperación y respaldo completo están en [identidad](identity.md). No aplicar a esas cuentas la afirmación de sesiones exclusivamente en memoria.
+
 Login establece cookie HttpOnly/SameSite=Strict limitada a `/api/v1`, Secure con HTTPS. La sesión vence absolutamente a ocho horas. Logout la revoca; un fallo de red conserva el estado con error, sin afirmar que la revocación ocurrió. Reautenticar DM recupera cambios en memoria tras expiración; cambiar de rol exige descartarlos. Una recarga no recupera trabajo sin guardar.
 
 Para rotar claves, detener limpiamente la API, cambiar ambas en la configuración privada y arrancar. El reinicio invalida **todas** las sesiones, publicación, presencia y dados, que viven en memoria. No existe recarga dinámica de variables ni revocación retroactiva de bytes descargados. Los jugadores deben acceder otra vez y el DM volver a publicar.
 
-`TTRPG_DATA_DIR` contiene `service.sqlite` (escenas, imágenes BLOB, plantillas y metadatos), `monsters.sqlite`, `entities.sqlite` y sus sidecars SQLite mientras existan. No hay carpeta separada de assets: están en service.sqlite. `service.lock` evita otra instancia. Directorio 0700 y configuración 0600; no compartir escritura con otros procesos. El perfil Electron local es independiente y no se migra. Reiniciar conserva recursos guardados, no estado de mesa ni borradores clientes.
+`TTRPG_DATA_DIR` contiene `service.sqlite` (escenas, imágenes BLOB, plantillas y metadatos), `monsters.sqlite`, `entities.sqlite` y sus sidecars SQLite mientras existan. No hay carpeta separada de assets: están en service.sqlite. `service.lock` evita otra instancia. Si se ejecutó `db:migrate` local, el directorio también contiene `control.sqlite` y sus sidecars, con exclusión independiente `control.lock`; incluirlos en el respaldo completo. Directorio 0700 y configuración 0600; no compartir escritura con otros procesos. El perfil Electron local es independiente y no se migra. Reiniciar conserva recursos guardados, no estado de mesa ni borradores clientes.
 
 ## Backup y restauración
 
@@ -130,3 +142,11 @@ Importar `.ttrpgscene` v1 migra en memoria a v2 y conserva mapas, IDs y geometr
 | Producción API/web | Node 24 sin Electron/dev server; recursos persistentes y mesa efímera | Reinicio y backup/restore temporal con escena/imagen/biblioteca; ver atribución y comandos en build 005. |
 
 El detalle reproducible y los límites concretos están en [build 005](../factory/jobs/005-electron-servicio/build.md). No se certifican distribución firmada, despliegue remoto, proyector físico ni una prueba manual de todas las combinaciones de herramientas.
+
+## Identidad de cuentas optativa (007)
+
+La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.
+
+## Backend privado008
+
+Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
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
index d979a15..0df7cef 100644
--- a/factory/board.json
+++ b/factory/board.json
@@ -1,13 +1,13 @@
 {
   "version": 1,
-  "actualizado": "2026-10-29T15:36:46.561655+00:00",
+  "actualizado": "2026-10-30T19:31:24.947823+00:00",
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
@@ -214,10 +222,162 @@
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
+      "etapa": "necesita-persona",
+      "ciclo": 1,
+      "ronda": 2,
+      "constructor": "/root/aprobador_005",
+      "rondas": [
+        {
+          "numero": 1,
+          "ciclo": 1,
+          "revisiones": {
+            "seguridad": "APROBADO",
+            "ux": "CAMBIOS",
+            "ui": "APROBADO",
+            "codigo": "CAMBIOS"
+          }
+        },
+        {
+          "numero": 2,
+          "ciclo": 1,
+          "revisiones": {
+            "seguridad": "APROBADO",
+            "ux": "APROBADO",
+            "ui": "APROBADO",
+            "codigo": "APROBADO"
+          }
+        }
+      ],
+      "dependencias": [],
+      "motivo": "APROBAR técnico: cuatro revisiones aprobadas en ronda 2. Sin hallazgos pendientes; commit e integración no autorizados en esta ejecución.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 13,
+        "texto": "- [ ] Persistencia común SQLite y PostgreSQL — `006-persistencia-multidb`"
+      }
+    },
+    {
+      "id": "007-cuentas-dm",
+      "titulo": "Cuentas DM administradas y autenticación segura",
+      "rama": "feature/factory-006-persistencia-multidb",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "necesita-persona",
+      "ciclo": 1,
+      "ronda": 1,
+      "constructor": "/root/constructor_007",
+      "rondas": [
+        {
+          "numero": 1,
+          "ciclo": 1,
+          "revisiones": {
+            "seguridad": "APROBADO",
+            "ux": "APROBADO",
+            "ui": "APROBADO",
+            "codigo": "APROBADO"
+          }
+        }
+      ],
+      "dependencias": [
+        "006-persistencia-multidb"
+      ],
+      "motivo": "APROBAR técnico: cuatro revisiones aprobadas en ronda 1. Integración pendiente por restricción vigente; habilita construcción 008 sin merge.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 14,
+        "texto": "- [ ] Cuentas DM administradas y autenticación segura — `007-cuentas-dm`"
+      }
+    },
+    {
+      "id": "008-partidas-propiedad",
+      "titulo": "Partidas de cada DM y datos aislados en ambos motores",
+      "rama": "feature/factory-006-persistencia-multidb",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "construccion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": "/root/constructor_008",
+      "rondas": [],
+      "dependencias": [
+        "007-cuentas-dm"
+      ],
+      "motivo": "Verificación final completa:20/20 propiedad/migración,32/32DB,25/25identidad,1201/1201general y buildsPASS. Publicando informe antes de congelar ronda1.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 15,
+        "texto": "- [ ] Partidas de cada DM y datos aislados en ambos motores — `008-partidas-propiedad`"
+      }
+    },
+    {
+      "id": "009-invitaciones-jugadores",
+      "titulo": "Enlaces renovables y entrada de jugadores con alias",
+      "rama": "feature/factory-006-persistencia-multidb",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "008-partidas-propiedad"
+      ],
+      "motivo": "Continuación 007–011 autorizada; espera aprobación técnica de dependencia para construcción.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 16,
+        "texto": "- [ ] Enlaces renovables y entrada de jugadores con alias — `009-invitaciones-jugadores`"
+      }
+    },
+    {
+      "id": "010-moderacion-tiempo-real",
+      "titulo": "Expulsión inmediata y mesas sincronizadas independientes",
+      "rama": "feature/factory-006-persistencia-multidb",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "009-invitaciones-jugadores"
+      ],
+      "motivo": "Continuación 007–011 autorizada; espera aprobación técnica de dependencia para construcción.",
+      "directorio": "/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects",
+      "backlog": {
+        "linea": 17,
+        "texto": "- [ ] Expulsión inmediata y mesas sincronizadas independientes — `010-moderacion-tiempo-real`"
+      }
+    },
+    {
+      "id": "011-experiencia-autenticacion",
+      "titulo": "Acceso DM, invitaciones y panel de jugadores en web y Electron",
+      "rama": "feature/factory-006-persistencia-multidb",
+      "base": "e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3",
+      "etapa": "especificacion",
+      "ciclo": 1,
+      "ronda": 0,
+      "constructor": null,
+      "rondas": [],
+      "dependencias": [
+        "010-moderacion-tiempo-real"
+      ],
+      "motivo": "Continuación 007–011 autorizada; espera aprobación técnica de dependencia para construcción.",
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
index 7d0e9dc..a08a9f2 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.6.0",
+  "version": "3.10.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -13,12 +13,22 @@
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
+    "test:db": "vitest run --config src/infrastructure/server/database/vitest.config.ts",
+    "identity:bootstrap": "node --env-file-if-exists=.env out/api/identity-cli.mjs bootstrap",
+    "identity:provision-dm": "node --env-file-if-exists=.env out/api/identity-cli.mjs provision-dm",
+    "identity:recover-admin": "node --env-file-if-exists=.env out/api/identity-cli.mjs recover-admin",
+    "identity:password": "node --env-file-if-exists=.env out/api/identity-cli.mjs password",
+    "test:identity": "vitest run --config src/infrastructure/server/identity/vitest.config.ts",
+    "data": "node --env-file-if-exists=.env out/api/data-cli.mjs",
+    "test:owned": "vitest run --config src/infrastructure/server/owned/vitest.config.ts"
   },
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
@@ -106,12 +116,15 @@
     "@tiptap/pm": "^3.23.6",
     "@tiptap/react": "^3.23.6",
     "@tiptap/starter-kit": "^3.23.6",
+    "better-auth": "1.7.14",
     "cannon-es": "0.20.0",
     "dompurify": "^3.4.14",
     "electron-vite": "^4.0.0",
     "honeycomb-grid": "^4.1.5",
+    "kysely": "0.29.7",
     "lucide-react": "^1.34.0",
     "marked": "^18.0.4",
+    "pg": "8.23.1",
     "pixi.js": "^8.18.1",
     "react": "^19.0.0",
     "react-dom": "^19.0.0",
@@ -123,6 +136,7 @@
   "devDependencies": {
     "@eslint/js": "^9.0.0",
     "@types/node": "^24.0.0",
+    "@types/pg": "8.23.1",
     "@types/react": "^19.0.0",
     "@types/react-dom": "^19.0.0",
     "@types/three": "0.143.0",
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 96dd614..b5099f4 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -41,6 +41,9 @@ importers:
       '@tiptap/starter-kit':
         specifier: ^3.23.6
         version: 3.23.6
+      better-auth:
+        specifier: 1.7.14
+        version: 1.7.14(pg@8.23.1)(react-dom@19.2.6(react@19.2.6))(react@19.2.6)(vitest@4.1.6(@types/node@24.12.4)(jsdom@30.0.1(@noble/hashes@2.4.0))(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0)))
       cannon-es:
         specifier: 0.20.0
         version: 0.20.0
@@ -53,12 +56,18 @@ importers:
       honeycomb-grid:
         specifier: ^4.1.5
         version: 4.1.5
+      kysely:
+        specifier: 0.29.7
+        version: 0.29.7
       lucide-react:
         specifier: ^1.34.0
         version: 1.34.0(react@19.2.6)
       marked:
         specifier: ^18.0.4
         version: 18.0.4
+      pg:
+        specifier: 8.23.1
+        version: 8.23.1
       pixi.js:
         specifier: ^8.18.1
         version: 8.18.1
@@ -87,6 +96,9 @@ importers:
       '@types/node':
         specifier: ^24.0.0
         version: 24.12.4
+      '@types/pg':
+        specifier: 8.23.1
+        version: 8.23.1
       '@types/react':
         specifier: ^19.0.0
         version: 19.2.14
@@ -107,7 +119,7 @@ importers:
         version: 9.39.4(jiti@2.7.0)
       jsdom:
         specifier: ^30.0.1
-        version: 30.0.1
+        version: 30.0.1(@noble/hashes@2.4.0)
       typescript:
         specifier: ^5.0.0
         version: 5.9.3
@@ -116,7 +128,7 @@ importers:
         version: 8.59.3(eslint@9.39.4(jiti@2.7.0))(typescript@5.9.3)
       vitest:
         specifier: ^4.1.6
-        version: 4.1.6(@types/node@24.12.4)(jsdom@30.0.1)(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0))
+        version: 4.1.6(@types/node@24.12.4)(jsdom@30.0.1(@noble/hashes@2.4.0))(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0))
 
 packages:
 
@@ -211,6 +223,82 @@ packages:
     resolution: {integrity: sha512-LwdZHpScM4Qz8Xw2iKSzS+cfglZzJGvofQICy7W7v4caru4EaAmyUuO6BGrbyQ2mYV11W0U8j5mBhd14dd3B0A==}
     engines: {node: '>=6.9.0'}
 
+  '@better-auth/core@1.7.14':
+    resolution: {integrity: sha512-ByhdrGVwp/el+hoTYKSVOHIH23/lQj9TQ1txdGcWOg22tnfr3hJ6ukzySooeYj/R36XsQgBhkJqIp8mKsNeErA==}
+    peerDependencies:
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+      '@better-fetch/fetch': 1.3.3
+      '@opentelemetry/api': ^1.9.0
+      better-call: 1.4.4
+      jose: ^6.1.0
+      kysely: ^0.28.5 || ^0.29.0
+      nanostores: ^1.0.1
+    peerDependenciesMeta:
+      '@opentelemetry/api':
+        optional: true
+
+  '@better-auth/drizzle-adapter@1.7.14':
+    resolution: {integrity: sha512-5RC8Ec5Ur15FWsS4As9/VrlRbB3+9EfShxIpA5A1FcD6IgPxFvzQNkAm2+FYx9LUSqx47NPf9hBTG2GUCMP9Ig==}
+    peerDependencies:
+      '@better-auth/core': ^1.7.14
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+      drizzle-orm: ^0.45.2 || >=1.0.0-rc.1 <2.0.0
+    peerDependenciesMeta:
+      drizzle-orm:
+        optional: true
+
+  '@better-auth/kysely-adapter@1.7.14':
+    resolution: {integrity: sha512-4wkqj8a8JVpWDYLlgzfbk7eOaWCFkL6HHQd6CLamFKaC8vNsXew1x4v5dE5O6dGr8j4g5qMISS+BAvOuIvBevg==}
+    peerDependencies:
+      '@better-auth/core': ^1.7.14
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+      kysely: ^0.28.17 || ^0.29.0
+    peerDependenciesMeta:
+      kysely:
+        optional: true
+
+  '@better-auth/memory-adapter@1.7.14':
+    resolution: {integrity: sha512-Ojv9BcmFyHuTHha9ZM/NUW1ut9J84wLngta+07Es0Ejn8kekqP5aHBpZd5Z8AvADs5iJUOWvQGFmGlPWAKJgBg==}
+    peerDependencies:
+      '@better-auth/core': ^1.7.14
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+
+  '@better-auth/mongo-adapter@1.7.14':
+    resolution: {integrity: sha512-6IA0RSPZFMdRwwnLZ9oWnDIiD0y0o0azTHUfa01BNU2AFJgMDkeiASUV3bKcJBskzQoyQrff74eFYTsTSeeVUQ==}
+    peerDependencies:
+      '@better-auth/core': ^1.7.14
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+      mongodb: ^6.0.0 || ^7.0.0
+    peerDependenciesMeta:
+      mongodb:
+        optional: true
+
+  '@better-auth/prisma-adapter@1.7.14':
+    resolution: {integrity: sha512-mF6t5xqeZNWzUe0ErmrSdzQmtslJscmu9X8Mp5QmROlpnnAzvSc70RILu8lHms8CePt7N34+KRH1QvYjGFrVGQ==}
+    peerDependencies:
+      '@better-auth/core': ^1.7.14
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+      '@prisma/client': ^5.0.0 || ^6.0.0 || ^7.0.0
+      prisma: ^5.0.0 || ^6.0.0 || ^7.0.0
+    peerDependenciesMeta:
+      '@prisma/client':
+        optional: true
+      prisma:
+        optional: true
+
+  '@better-auth/telemetry@1.7.14':
+    resolution: {integrity: sha512-PtKFzsH7gje/WJuUPDjckOoNFazsq8NMt3AdiXIPzHl7tZULcNGTKAX8K7+yn0rG6cO/4mtMgpOjhtilElOnmg==}
+    peerDependencies:
+      '@better-auth/core': ^1.7.14
+      '@better-auth/utils': ^0.4.2 || ^0.5.0
+      '@better-fetch/fetch': 1.3.3
+
+  '@better-auth/utils@0.5.1':
+    resolution: {integrity: sha512-WETqw5vQ52uQ/xwWR4E8rTgT6fDEr/wnS+otDNkBCa/69281FCF32OKDdQUcahMCnjsvqXBNiEvAQHFB0EVRRg==}
+
+  '@better-fetch/fetch@1.3.3':
+    resolution: {integrity: sha512-U6SlDt/GUWtK2JAxS/NhdoYTEim+EL1G5byz2TUj83KjLZBUpYzb5SmX0aXaCnbGkAjFKnV/o/0+cyXMbEcqqg==}
+
   '@bramus/specificity@2.4.2':
     resolution: {integrity: sha512-ctxtJ/eA+t+6q2++vj5j7FYX3nRu311q1wfYH3xjlLOsczhlhxAg2FWNUXhpGvAw3BWo1xBcvOV6/YLc2r5FJw==}
     hasBin: true
@@ -876,6 +964,14 @@ packages:
     resolution: {integrity: sha512-9QOtNffcOF/c1seMCDnjckb3R9WHcG34tky+FHpNKKCW0wc/scYLwMtO+ptyGUfMW0/b/n4qRiALlaFHc9Oj7Q==}
     engines: {node: '>= 10.0.0'}
 
+  '@noble/ciphers@2.4.0':
+    resolution: {integrity: sha512-AnjFn0Jv92laAkvMrghlFZq4qQCIN/4DxFV/eooqtC2YTjB7kBeLMS2T9KJX4Dn+ZVXLOwK0lSgqDtx9gvxtiw==}
+    engines: {node: '>= 20.19.0'}
+
+  '@noble/hashes@2.4.0':
+    resolution: {integrity: sha512-X5XaVWZIBCT7HHZGm5I7ZQXDwLG+bGXuSrMQAW+7Zvl87h1kmc1ZB1VSRJcpUfoUrGQp4Fkoxm5kZ+Ms+aW+eA==}
+    engines: {node: '>= 20.19.0'}
+
   '@pixi/colord@2.9.6':
     resolution: {integrity: sha512-nezytU2pw587fQstUu1AsJZDVEynjskwOL+kibwcdxsMBFqPsFFNA7xl0ii/gXuDi6M0xj3mfRJj8pBSc2jCfA==}
 
@@ -1349,6 +1445,9 @@ packages:
   '@types/node@24.12.4':
     resolution: {integrity: sha512-GUUEShf+PBCGW2KaXwcIt3Yk+e3pkKwWKb9GSyM9WQVE+ep2jzmHdGsHzu4wgcZy5fN9FBdVzjpBQsYlpfpgLA==}
 
+  '@types/pg@8.23.1':
+    resolution: {integrity: sha512-fKVHpikPdg4GKks3JuLEhvwSyvwzF23hnabPy6DD8ljVbC7+6J5dQzdv4arV6jqq57djnMgs1HKBxX4P8aBI3A==}
+
   '@types/plist@3.0.5':
     resolution: {integrity: sha512-E6OCaRmAe4WDmWNsL/9RMqdkkzDCY1etutkflWk4c+AcjDU07Pcz1fQwTX0TQz+Pxqn9i4L1TU3UFpjnrcDgxA==}
 
@@ -1568,6 +1667,73 @@ packages:
     engines: {node: '>=6.0.0'}
     hasBin: true
 
+  better-auth@1.7.14:
+    resolution: {integrity: sha512-QxDCI0pOCCHDYmruisKhKyrvOJ6Icv9xg0RA6ZUysfKFXENYwhNNpwUlkE/NmViH2nDMgkKcymmLr55pnpR9vw==}
+    peerDependencies:
+      '@lynx-js/react': '*'
+      '@prisma/client': ^5.0.0 || ^6.0.0 || ^7.0.0
+      '@sveltejs/kit': ^2.0.0 || ^3.0.0
+      '@tanstack/react-start': ^1.0.0
+      '@tanstack/solid-start': ^1.0.0
+      drizzle-kit: '>=0.31.4 || >=1.0.0-beta.1'
+      drizzle-orm: ^0.45.2 || >=1.0.0-rc.1 <2.0.0
+      mongodb: ^6.0.0 || ^7.0.0
+      mysql2: ^3.0.0
+      next: ^14.0.0 || ^15.0.0 || ^16.0.0
+      pg: ^8.0.0
+      prisma: ^5.0.0 || ^6.0.0 || ^7.0.0
+      react: ^18.0.0 || ^19.0.0
+      react-dom: ^18.0.0 || ^19.0.0
+      solid-js: ^1.0.0
+      svelte: ^4.0.0 || ^5.0.0
+      vitest: ^2.0.0 || ^3.0.0 || ^4.0.0 || ^5.0.0
+      vue: ^3.0.0
+    peerDependenciesMeta:
+      '@lynx-js/react':
+        optional: true
+      '@prisma/client':
+        optional: true
+      '@sveltejs/kit':
+        optional: true
+      '@tanstack/react-start':
+        optional: true
+      '@tanstack/solid-start':
+        optional: true
+      drizzle-kit:
+        optional: true
+      drizzle-orm:
+        optional: true
+      mongodb:
+        optional: true
+      mysql2:
+        optional: true
+      next:
+        optional: true
+      pg:
+        optional: true
+      prisma:
+        optional: true
+      react:
+        optional: true
+      react-dom:
+        optional: true
+      solid-js:
+        optional: true
+      svelte:
+        optional: true
+      vitest:
+        optional: true
+      vue:
+        optional: true
+
+  better-call@1.4.4:
+    resolution: {integrity: sha512-Gq4XdGFy4dmUxFEAX2nj0ycFcFbD9ZWh8YROouZoyXeF1M11TpYbplk0pDByTFF8Wz+MYa6W9052c9m7dD+mfw==}
+    peerDependencies:
+      zod: ^4.0.0
+    peerDependenciesMeta:
+      zod:
+        optional: true
+
   bidi-js@1.0.3:
     resolution: {integrity: sha512-RKshQI1R3YQ+n9YJz2QQ147P66ELpa1FQEg20Dk8oW9t2KgLbpDLLp9aGZ7y8WHSshDknG0bknqGw5/tyCs5tw==}
 
@@ -1750,6 +1916,9 @@ packages:
     resolution: {integrity: sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg==}
     engines: {node: '>= 0.4'}
 
+  defu@6.1.7:
+    resolution: {integrity: sha512-7z22QmUWiQ/2d0KkdYmANbRUVABpZ9SNYyH5vx6PZ+nE5bcC0l7uFvEfHlyld/HcGBFTL536ClDt3DEcSlEJAQ==}
+
   delayed-stream@1.0.0:
     resolution: {integrity: sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==}
     engines: {node: '>=0.4.0'}
@@ -2219,6 +2388,9 @@ packages:
     resolution: {integrity: sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==}
     hasBin: true
 
+  jose@6.2.13:
+    resolution: {integrity: sha512-7TIg10ZE1x82YediN+lcrPNvGMKge9yFHQD+Qho/b8y2adfugU3AsvvHfxV0fzyFllT6l9xCjf4RWY9g/Z9PJQ==}
+
   js-binary-schema-parser@2.0.3:
     resolution: {integrity: sha512-xezGJmOb4lk/M1ZZLTR/jaBHQ4gG/lqQnJqdIv4721DMggsa1bDVlHXNeHYogaIEHD9vCRv0fcL4hMA+Coarkg==}
 
@@ -2269,6 +2441,10 @@ packages:
   keyv@4.5.4:
     resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}
 
+  kysely@0.29.7:
+    resolution: {integrity: sha512-fmIq+7kv4WbFm2tcfznRzikqB4cuNpgZ40PSU2fAJ2/OO5XhojqnTPrmgrCjYSRJVwBln03XcRXJGnw9H099IQ==}
+    engines: {node: '>=22.0.0'}
+
   lazy-val@1.0.5:
     resolution: {integrity: sha512-0/BnGCCfyUMkBpeDgWihanIAF9JmZhHBgUhEqzvf+adhNGLoP6TaiI5oF8oyb3I45P+PcnrqihSf01M0l0G5+Q==}
 
@@ -2400,6 +2576,10 @@ packages:
     engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
     hasBin: true
 
+  nanostores@1.5.5:
+    resolution: {integrity: sha512-FixtE239Gl6Gz0ZGCK0WzvNwObNCIwVT+L7zQcf1QgcA6AzBxblzqe9OT88qiucNkhsjSOqiogSaF5jVbJiqSA==}
+    engines: {node: ^20.0.0 || >=22.0.0}
+
   natural-compare@1.4.0:
     resolution: {integrity: sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==}
 
@@ -2491,6 +2671,40 @@ packages:
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
 
@@ -2513,6 +2727,22 @@ packages:
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
@@ -2647,6 +2877,9 @@ packages:
   rope-sequence@1.3.4:
     resolution: {integrity: sha512-UT5EDe2cu2E/6O4igUr5PSFs23nvvukicWHx6GnOPlHAiiYbzNuCRQCuiUdHJQcqKalLKlrYJnjY0ySGsXNQXQ==}
 
+  rou3@0.9.2:
+    resolution: {integrity: sha512-3SOzvaAg8rkHrXtRjpCvCvbyO5to9oOO27Z/XqHEYXfMRVSw/qMIVdmaOk9W2lcRLtR6dlqTjo9hDeJk70QBYQ==}
+
   safer-buffer@2.1.2:
     resolution: {integrity: sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==}
 
@@ -2694,6 +2927,9 @@ packages:
     resolution: {integrity: sha512-8I8TjW5KMOKsZQTvoxjuSIa7foAwPWGOts+6o7sgjz41/qMD9VQHEDxi6PBvK2l0MXUmqZyNpUK+T2tQaaElvw==}
     engines: {node: '>=10'}
 
+  set-cookie-parser@3.2.1:
+    resolution: {integrity: sha512-Npd1Pt+4zb3BrSZDPd2qFwRpS6b1EUEasRrO8xS0zMJi0fApXXK5YuzP0minyJnxwnFHoVoJwA55q0A0cu63gQ==}
+
   sharp@0.35.5:
     resolution: {integrity: sha512-Ywn4OnzGukp7CDMrp08RQ50YKmuwG47brZgIVPTvBaaAfQlRlygrRqSrxdCiL9M+LlzLBiJ68IR1QqvzHyjC7g==}
     engines: {node: '>=20.9.0'}
@@ -2740,6 +2976,10 @@ packages:
     resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
     engines: {node: '>=0.10.0'}
 
+  split2@4.2.0:
+    resolution: {integrity: sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==}
+    engines: {node: '>= 10.x'}
+
   sprintf-js@1.1.3:
     resolution: {integrity: sha512-Oo+0REFV59/rz3gfJNKQiBlwfHaSESl1pcGyABQsnnIfWOFt6JNj5gCog2U6MLZ//IGYD+nA8nI+mTShREReaA==}
 
@@ -3063,6 +3303,10 @@ packages:
   xmlchars@2.2.0:
     resolution: {integrity: sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==}
 
+  xtend@4.0.2:
+    resolution: {integrity: sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==}
+    engines: {node: '>=0.4'}
+
   y18n@5.0.8:
     resolution: {integrity: sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==}
     engines: {node: '>=10'}
@@ -3095,6 +3339,9 @@ packages:
   zod@4.4.3:
     resolution: {integrity: sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==}
 
+  zod@4.6.7:
+    resolution: {integrity: sha512-g8W2D2kU6a8untc053fX1uVBKzM7yqAxW/3zwk83+6RyF2+SKOuV+c0wBDhUwzV1PaGapmZH+rmcUzPf+3CGwg==}
+
 snapshots:
 
   7zip-bin@5.2.0: {}
@@ -3223,6 +3470,56 @@ snapshots:
       '@babel/helper-string-parser': 7.27.1
       '@babel/helper-validator-identifier': 7.28.5
 
+  '@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)':
+    dependencies:
+      '@better-auth/utils': 0.5.1
+      '@better-fetch/fetch': 1.3.3
+      '@standard-schema/spec': 1.1.0
+      better-call: 1.4.4(zod@4.6.7)
+      jose: 6.2.13
+      kysely: 0.29.7
+      nanostores: 1.5.5
+      zod: 4.6.7
+
+  '@better-auth/drizzle-adapter@1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)':
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/utils': 0.5.1
+
+  '@better-auth/kysely-adapter@1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)(kysely@0.29.7)':
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/utils': 0.5.1
+    optionalDependencies:
+      kysely: 0.29.7
+
+  '@better-auth/memory-adapter@1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)':
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/utils': 0.5.1
+
+  '@better-auth/mongo-adapter@1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)':
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/utils': 0.5.1
+
+  '@better-auth/prisma-adapter@1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)':
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/utils': 0.5.1
+
+  '@better-auth/telemetry@1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)':
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/utils': 0.5.1
+      '@better-fetch/fetch': 1.3.3
+
+  '@better-auth/utils@0.5.1':
+    dependencies:
+      '@noble/hashes': 2.4.0
+
+  '@better-fetch/fetch@1.3.3': {}
+
   '@bramus/specificity@2.4.2':
     dependencies:
       css-tree: 3.2.1
@@ -3556,7 +3853,9 @@ snapshots:
       '@eslint/core': 0.17.0
       levn: 0.4.1
 
-  '@exodus/bytes@1.15.1': {}
+  '@exodus/bytes@1.15.1(@noble/hashes@2.4.0)':
+    optionalDependencies:
+      '@noble/hashes': 2.4.0
 
   '@floating-ui/core@1.7.5':
     dependencies:
@@ -3730,6 +4029,10 @@ snapshots:
     transitivePeerDependencies:
       - supports-color
 
+  '@noble/ciphers@2.4.0': {}
+
+  '@noble/hashes@2.4.0': {}
+
   '@pixi/colord@2.9.6': {}
 
   '@radix-ui/primitive@1.1.3': {}
@@ -4138,6 +4441,12 @@ snapshots:
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
@@ -4412,6 +4721,42 @@ snapshots:
 
   baseline-browser-mapping@2.10.29: {}
 
+  better-auth@1.7.14(pg@8.23.1)(react-dom@19.2.6(react@19.2.6))(react@19.2.6)(vitest@4.1.6(@types/node@24.12.4)(jsdom@30.0.1(@noble/hashes@2.4.0))(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0))):
+    dependencies:
+      '@better-auth/core': 1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5)
+      '@better-auth/drizzle-adapter': 1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)
+      '@better-auth/kysely-adapter': 1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)(kysely@0.29.7)
+      '@better-auth/memory-adapter': 1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)
+      '@better-auth/mongo-adapter': 1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)
+      '@better-auth/prisma-adapter': 1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)
+      '@better-auth/telemetry': 1.7.14(@better-auth/core@1.7.14(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)(better-call@1.4.4(zod@4.4.3))(jose@6.2.13)(kysely@0.29.7)(nanostores@1.5.5))(@better-auth/utils@0.5.1)(@better-fetch/fetch@1.3.3)
+      '@better-auth/utils': 0.5.1
+      '@better-fetch/fetch': 1.3.3
+      '@noble/ciphers': 2.4.0
+      '@noble/hashes': 2.4.0
+      better-call: 1.4.4(zod@4.6.7)
+      defu: 6.1.7
+      jose: 6.2.13
+      kysely: 0.29.7
+      nanostores: 1.5.5
+      zod: 4.6.7
+    optionalDependencies:
+      pg: 8.23.1
+      react: 19.2.6
+      react-dom: 19.2.6(react@19.2.6)
+      vitest: 4.1.6(@types/node@24.12.4)(jsdom@30.0.1(@noble/hashes@2.4.0))(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0))
+    transitivePeerDependencies:
+      - '@opentelemetry/api'
+
+  better-call@1.4.4(zod@4.6.7):
+    dependencies:
+      '@better-auth/utils': 0.5.1
+      '@better-fetch/fetch': 1.3.3
+      rou3: 0.9.2
+      set-cookie-parser: 3.2.1
+    optionalDependencies:
+      zod: 4.6.7
+
   bidi-js@1.0.3:
     dependencies:
       require-from-string: 2.0.2
@@ -4579,10 +4924,10 @@ snapshots:
 
   csstype@3.2.3: {}
 
-  data-urls@7.0.0:
+  data-urls@7.0.0(@noble/hashes@2.4.0):
     dependencies:
       whatwg-mimetype: 5.0.0
-      whatwg-url: 16.0.1
+      whatwg-url: 16.0.1(@noble/hashes@2.4.0)
     transitivePeerDependencies:
       - '@noble/hashes'
 
@@ -4614,6 +4959,8 @@ snapshots:
       object-keys: 1.1.1
     optional: true
 
+  defu@6.1.7: {}
+
   delayed-stream@1.0.0: {}
 
   detect-libc@2.1.2: {}
@@ -5118,9 +5465,9 @@ snapshots:
     dependencies:
       lru-cache: 6.0.0
 
-  html-encoding-sniffer@6.0.0:
+  html-encoding-sniffer@6.0.0(@noble/hashes@2.4.0):
     dependencies:
-      '@exodus/bytes': 1.15.1
+      '@exodus/bytes': 1.15.1(@noble/hashes@2.4.0)
     transitivePeerDependencies:
       - '@noble/hashes'
 
@@ -5206,6 +5553,8 @@ snapshots:
 
   jiti@2.7.0: {}
 
+  jose@6.2.13: {}
+
   js-binary-schema-parser@2.0.3: {}
 
   js-tokens@4.0.0: {}
@@ -5214,17 +5563,17 @@ snapshots:
     dependencies:
       argparse: 2.0.1
 
-  jsdom@30.0.1:
+  jsdom@30.0.1(@noble/hashes@2.4.0):
     dependencies:
       '@asamuzakjp/css-color': 6.0.7
       '@asamuzakjp/dom-selector': 8.3.2
       '@bramus/specificity': 2.4.2
       '@csstools/css-syntax-patches-for-csstree': 1.1.8(css-tree@3.2.1)
-      '@exodus/bytes': 1.15.1
+      '@exodus/bytes': 1.15.1(@noble/hashes@2.4.0)
       css-tree: 3.2.1
-      data-urls: 7.0.0
+      data-urls: 7.0.0(@noble/hashes@2.4.0)
       decimal.js: 10.6.0
-      html-encoding-sniffer: 6.0.0
+      html-encoding-sniffer: 6.0.0(@noble/hashes@2.4.0)
       is-potential-custom-element-name: 1.0.1
       lru-cache: 11.5.2
       parse5: 8.0.1
@@ -5235,7 +5584,7 @@ snapshots:
       w3c-xmlserializer: 5.0.0
       webidl-conversions: 8.0.1
       whatwg-mimetype: 5.0.0
-      whatwg-url: 17.1.0
+      whatwg-url: 17.1.0(@noble/hashes@2.4.0)
       xml-name-validator: 5.0.0
     transitivePeerDependencies:
       - '@noble/hashes'
@@ -5267,6 +5616,8 @@ snapshots:
     dependencies:
       json-buffer: 3.0.1
 
+  kysely@0.29.7: {}
+
   lazy-val@1.0.5: {}
 
   levn@0.4.1:
@@ -5376,6 +5727,8 @@ snapshots:
 
   nanoid@3.3.12: {}
 
+  nanostores@1.5.5: {}
+
   natural-compare@1.4.0: {}
 
   node-abi@4.31.0:
@@ -5462,6 +5815,41 @@ snapshots:
 
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
@@ -5498,6 +5886,16 @@ snapshots:
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
@@ -5684,6 +6082,8 @@ snapshots:
 
   rope-sequence@1.3.4: {}
 
+  rou3@0.9.2: {}
+
   safer-buffer@2.1.2: {}
 
   sanitize-filename@1.6.4:
@@ -5716,6 +6116,8 @@ snapshots:
       type-fest: 0.13.1
     optional: true
 
+  set-cookie-parser@3.2.1: {}
+
   sharp@0.35.5(@types/node@24.12.4):
     dependencies:
       '@img/colour': 1.1.0
@@ -5782,6 +6184,8 @@ snapshots:
 
   source-map@0.6.1: {}
 
+  split2@4.2.0: {}
+
   sprintf-js@1.1.3:
     optional: true
 
@@ -5961,7 +6365,7 @@ snapshots:
       fsevents: 2.3.3
       jiti: 2.7.0
 
-  vitest@4.1.6(@types/node@24.12.4)(jsdom@30.0.1)(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0)):
+  vitest@4.1.6(@types/node@24.12.4)(jsdom@30.0.1(@noble/hashes@2.4.0))(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0)):
     dependencies:
       '@vitest/expect': 4.1.6
       '@vitest/mocker': 4.1.6(vite@7.3.3(@types/node@24.12.4)(jiti@2.7.0))
@@ -5985,7 +6389,7 @@ snapshots:
       why-is-node-running: 2.3.0
     optionalDependencies:
       '@types/node': 24.12.4
-      jsdom: 30.0.1
+      jsdom: 30.0.1(@noble/hashes@2.4.0)
     transitivePeerDependencies:
       - msw
 
@@ -5999,17 +6403,17 @@ snapshots:
 
   whatwg-mimetype@5.0.0: {}
 
-  whatwg-url@16.0.1:
+  whatwg-url@16.0.1(@noble/hashes@2.4.0):
     dependencies:
-      '@exodus/bytes': 1.15.1
+      '@exodus/bytes': 1.15.1(@noble/hashes@2.4.0)
       tr46: 6.0.0
       webidl-conversions: 8.0.1
     transitivePeerDependencies:
       - '@noble/hashes'
 
-  whatwg-url@17.1.0:
+  whatwg-url@17.1.0(@noble/hashes@2.4.0):
     dependencies:
-      '@exodus/bytes': 1.15.1
+      '@exodus/bytes': 1.15.1(@noble/hashes@2.4.0)
       tr46: 6.0.0
       webidl-conversions: 8.0.1
     transitivePeerDependencies:
@@ -6048,6 +6452,8 @@ snapshots:
 
   xmlchars@2.2.0: {}
 
+  xtend@4.0.2: {}
+
   y18n@5.0.8: {}
 
   yallist@3.1.1: {}
@@ -6076,3 +6482,5 @@ snapshots:
   yocto-queue@0.1.0: {}
 
   zod@4.4.3: {}
+
+  zod@4.6.7: {}
diff --git a/src/server/config.ts b/src/server/config.ts
index 34d36ad..928ca20 100644
--- a/src/server/config.ts
+++ b/src/server/config.ts
@@ -1,3 +1,5 @@
+import { readIdentityConfig, validateIdentityConfig, type IdentityConfig } from "../infrastructure/server/identity/config";
+import { assertLegacyDatabase, readDatabaseConfig, validateDatabaseConfig, type DatabaseConfig } from "../infrastructure/server/database/config";
 import { isAbsolute } from "node:path";
 
 export const LIMITS = {
@@ -7,12 +9,17 @@ export const LIMITS = {
   headersMs: 10_000, bodyMs: 30_000
 } as const;
 export interface ServerConfig {
+  readonly database?: DatabaseConfig;
+  readonly identity?: IdentityConfig;
   readonly webDir?: string;
   readonly host: string; readonly port: number; readonly dataDir: string;
   readonly publicOrigin: string; readonly dmKey: string; readonly playerKey: string;
 }
 export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
+  const database = readDatabaseConfig(env);
+  assertLegacyDatabase(database);
   const config = {
+    database, identity: readIdentityConfig(env),
     webDir: env.TTRPG_WEB_DIR,
     host: env.TTRPG_HOST ?? "127.0.0.1", port: Number(env.TTRPG_PORT ?? "8787"),
     dataDir: env.TTRPG_DATA_DIR ?? "", publicOrigin: env.TTRPG_PUBLIC_ORIGIN ?? "",
@@ -22,6 +29,8 @@ export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
   return config;
 }
 export function validateConfig(c: ServerConfig): void {
+  if (c.identity) { validateIdentityConfig(c.identity); if (c.identity.publicOrigin !== c.publicOrigin || [c.dmKey, c.playerKey].includes(c.identity.secret)) throw new Error("TTRPG_AUTH_SECRET/origen debe ser independiente y coherente."); }
+  assertLegacyDatabase(c.database ? validateDatabaseConfig(c.database) : { driver: "sqlite", deployment: "local" });
   if (c.webDir !== undefined && !isAbsolute(c.webDir)) throw new Error("TTRPG_WEB_DIR debe ser absoluto.");
   if (!c.host || !Number.isInteger(c.port) || c.port < 0 || c.port > 65535) throw new Error("TTRPG_HOST/TTRPG_PORT inválidos.");
   if (!isAbsolute(c.dataDir)) throw new Error("TTRPG_DATA_DIR debe ser una ruta absoluta exclusiva del servicio.");
diff --git a/src/server/errors.ts b/src/server/errors.ts
index 8466020..ee5726c 100644
--- a/src/server/errors.ts
+++ b/src/server/errors.ts
@@ -1,4 +1,5 @@
-export class HttpError extends Error {
+import { ApplicationError } from "../application/services/application-error";
+export class HttpError extends ApplicationError {
   constructor(readonly status: number, readonly code: string, message: string) { super(message); }
 }
 export const invalid = (message = "La entrada no es válida.") => new HttpError(422, "VALIDATION_ERROR", message);
diff --git a/src/server/http.ts b/src/server/http.ts
index 043a4ae..a747e2d 100644
--- a/src/server/http.ts
+++ b/src/server/http.ts
@@ -1,3 +1,7 @@
+import { body, json } from "./request-body";
+import { createOwnedHttp } from "./owned-http";
+import { createIdentityHttp } from "./identity-http";
+import type { IdentityService } from "../application/services/identity";
 import { createTableHttp } from "./table-http";
 import { createStaticHandler } from "./static-files";
 import { SceneLinksService, connectSchema, linkSchema, validateLinksSchema, sceneReference } from "./scene-links";
@@ -27,33 +31,12 @@ function method(req: IncomingMessage, allowed: readonly string[]): string {
   if (!allowed.includes(value)) throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible para esta ruta.");
   return value;
 }
-async function body(req: IncomingMessage, res: ServerResponse, limit: number): Promise<Buffer> {
-  const length = Number(req.headers["content-length"] ?? 0);
-  if (length > limit) { res.setHeader("Connection", "close"); throw new HttpError(413, "PAYLOAD_TOO_LARGE", "El contenido supera el límite permitido."); }
-  return new Promise((resolve, reject) => {
-    const chunks: Buffer[] = []; let size = 0; let oversized = false;
-    const clean = () => { clearTimeout(timer); req.off("data", data); req.off("end", end); req.off("error", error); req.off("aborted", aborted); };
-    const error = () => { clean(); reject(new HttpError(400, "INVALID_BODY", "No se pudo completar la carga.")); };
-    const aborted = () => error();
-    const data = (chunk: Buffer) => {
-      size += chunk.length;
-      if (size > limit) { oversized = true; chunks.length = 0; }
-      else chunks.push(chunk);
-    };
-    const end = () => { clean(); if (oversized) reject(new HttpError(413, "PAYLOAD_TOO_LARGE", "El contenido supera el límite permitido.")); else resolve(Buffer.concat(chunks)); };
-    const timer = setTimeout(() => { clean(); req.pause(); res.setHeader("Connection", "close"); reject(new HttpError(408, "REQUEST_TIMEOUT", "La carga tardó demasiado.")); }, LIMITS.bodyMs);
-    req.on("data", data); req.on("end", end); req.on("error", error); req.on("aborted", aborted);
-  });
-}
-async function json(req: IncomingMessage, res: ServerResponse, limit: number = LIMITS.jsonBytes): Promise<unknown> {
-  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Se requiere Content-Type application/json.");
-  const bytes = await body(req, res, limit);
-  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
-  catch { throw new HttpError(400, "INVALID_JSON", "El JSON no es válido."); }
-}
-export function createApi(config: ServerConfig, options: { readonly version: string; readonly now?: () => number }) {
+export function createApi(config: ServerConfig, options: { readonly version: string; readonly now?: () => number; readonly identity?: IdentityService }) {
   validateConfig(config);
+  if (Boolean(config.identity) !== Boolean(options.identity)) throw new Error("TTRPG_IDENTITY_ENABLED requiere composición explícita de identidad migrada.");
+  const identityHttp = options.identity ? createIdentityHttp(options.identity, config.publicOrigin) : undefined;
   const now = options.now ?? Date.now;
+  const ownedHttp = options.identity ? createOwnedHttp(options.identity, config.publicOrigin, now) : undefined;
   const serveStatic = config.webDir ? createStaticHandler(config.webDir) : null;
   const store = new ServiceStore(config.dataDir);
   const scenes = new SceneService(store, now);
@@ -95,6 +78,8 @@ export function createApi(config: ServerConfig, options: { readonly version: str
       if (parts[1] === "session") { method(req, ["GET"]); const session = auth.require(req); send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return; }
       throw missing();
     }
+    if (parts[0] === "identity") { if (!identityHttp) throw missing(); await identityHttp(req, res); return; }
+    if (parts[0] === "dm") { if (!ownedHttp) throw missing(); await ownedHttp(req, res); return; }
     const session = auth.require(req);
     // Volver a validar después de cada espera antes de usar el rol capturado.
     const requireCurrentSession = () => {
@@ -223,7 +208,7 @@ export function createApi(config: ServerConfig, options: { readonly version: str
     },
     async close(): Promise<void> {
       if (closed) return; closed = true; realtime.close();
-      await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); store.close();
+      await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); store.close(); await options.identity?.close();
     }
   };
 }
diff --git a/src/server/index.ts b/src/server/index.ts
index be8f0f3..ebdcd5a 100644
--- a/src/server/index.ts
+++ b/src/server/index.ts
@@ -1,12 +1,17 @@
+import { openIdentity } from "../infrastructure/server/identity";
 import { readConfig } from "./config";
 import { createApi } from "./http";
 import { version } from "../../package.json";
 
 async function main(): Promise<void> {
   if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("El servicio requiere Node.js 24.");
-  const config = readConfig(); const api = createApi(config, { version });
-  try { await api.listen(); } catch { await api.close(); throw new Error("No se pudo iniciar el servicio. Comprueba el puerto y el almacenamiento."); }
-  process.stdout.write(`TTRPG Effects API ${version} lista.\n`);
+  const config = readConfig();
+  const identity = config.identity ? await openIdentity(config.database!, config.identity) : undefined;
+  let api: ReturnType<typeof createApi>;
+  try { api = createApi(config, { version, identity }); } catch (error) { await identity?.close(); throw error; }
+  let port: number;
+  try { port = await api.listen(); } catch { await api.close(); throw new Error("No se pudo iniciar el servicio. Comprueba el puerto y el almacenamiento."); }
+  process.stdout.write(`TTRPG Effects API ${version} lista.\nHost: ${config.host} | Puerto: ${port}\nAbrir: ${config.publicOrigin}\n`);
   let stopping = false;
   const stop = () => { if (stopping) return; stopping = true; void api.close().then(() => process.exit(0)); };
   process.on("SIGINT", stop); process.on("SIGTERM", stop);
diff --git a/src/server/schemas.ts b/src/server/schemas.ts
index 46f575c..44b41e9 100644
--- a/src/server/schemas.ts
+++ b/src/server/schemas.ts
@@ -1,29 +1,7 @@
 import { z } from "zod";
 import { HttpError, invalid } from "./errors";
-export const idSchema = z.uuid();
-export const templateIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
-const name = z.string().trim().min(1).max(200);
-const short = z.string().max(200);
-const notes = z.string().max(1_000_000);
-const imagePath = z.string().max(2048).nullable().optional();
-export const loginSchema = z.strictObject({ key: z.string().max(1024) });
-export const sceneInputSchema = z.strictObject({ name, scene: z.unknown() });
-export const resolveSchema = z.strictObject({ references: z.array(z.string().max(2048)).max(200) });
-export const templateSchema = z.strictObject({ template: z.strictObject({
-  id: templateIdSchema, name, system: name, markdown: notes, css: z.string().max(200_000),
-  builtIn: z.literal(false), updatedAt: z.string().datetime()
-}) });
-export const npcSchema = z.strictObject({ entry: z.strictObject({ name, imagePath, notes: notes.optional() }) });
-export const monsterSchema = z.strictObject({ entry: z.strictObject({
-  name, system: name, imagePath, contentMarkdown: notes, templateId: templateIdSchema.nullable().optional()
-}) });
-export const characterSchema = z.strictObject({ entry: z.strictObject({
-  characterName: name, playerName: short.optional(), level: short.optional(), species: short.optional(), classes: short.optional(),
-  imagePath, stats: z.strictObject({ strength: short.optional(), constitution: short.optional(), dexterity: short.optional(),
-    intelligence: short.optional(), wisdom: short.optional(), charisma: short.optional() }).optional(),
-  initiative: short.optional(), armorClass: z.string().regex(/^(?:\d+(?:\s*\/\s*\d+)?)?$/).max(200).optional(),
-  passivePerception: short.optional(), hitPoints: short.optional(), spellSaveDc: short.optional(), speeds: short.optional(), notes: notes.optional()
-}) });
+import { idSchema, templateIdSchema } from "../shared/contracts/resource-inputs";
+export { idSchema, templateIdSchema, loginSchema, sceneInputSchema, resolveSchema, templateSchema, npcSchema, monsterSchema, characterSchema } from "../shared/contracts/resource-inputs";
 export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
   const result = schema.safeParse(input);
   if (!result.success) throw invalid();
diff --git a/src/server/vite.config.ts b/src/server/vite.config.ts
index 069368d..eedb363 100644
--- a/src/server/vite.config.ts
+++ b/src/server/vite.config.ts
@@ -1,5 +1,5 @@
 import { resolve } from "node:path";
 export default {
-  build: { ssr: resolve(import.meta.dirname, "index.ts"), outDir: "out/api", emptyOutDir: true,
-    target: "node24", rollupOptions: { output: { entryFileNames: "index.mjs" } } }
+  build: { ssr: true, outDir: "out/api", emptyOutDir: true,
+    target: "node24", rollupOptions: { input: { index: resolve(import.meta.dirname, "index.ts"), "db-migrate": resolve(import.meta.dirname, "db-migrate.ts"), "data-cli": resolve(import.meta.dirname, "data-cli.ts"), "identity-cli": resolve(import.meta.dirname, "identity-cli.ts") }, output: { entryFileNames: "[name].mjs" } } }
 };

```
