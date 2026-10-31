# Identidad de revisión

Checkout: /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects

Rama: feature/factory-006-persistencia-multidb. Base main: 73b8e6de21af74912d23399f1b99f3c1112ade91. HEAD: e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. Sin commits/merge.

Prerrequisitos.env3.7.0 heredados, en factory/prerrequisitos-autenticacion.json. base-archivos.json identifica contenido de main al inicio; huellas.json incluye código y docs. El diff compara objetos de la base Git con contenido físico final, incluidos los no rastreados en la rama acumulativa, para evitar bajas aparentes de archivos ya integrados. Registros de trabajos/tablero/cola excluidos.

## Archivos del trabajo

- `.env.example`
- `.gitignore`
- `CHANGELOG.md`
- `README.md`
- `docs/browser-client.md`
- `docs/client-architecture.md`
- `docs/database.md`
- `docs/identity.md`
- `docs/invitations.md`
- `docs/moderation.md`
- `docs/owned-data.md`
- `docs/private-api.md`
- `docs/service-operations.md`
- `docs/synchronized-table.md`
- `eslint.config.js`
- `package.json`
- `scripts/setup-env.sh`
- `src/infrastructure/browser/browser-client.test.ts`
- `src/infrastructure/browser/browser-client.ts`
- `src/infrastructure/browser/http.ts`
- `src/infrastructure/browser/mutations.ts`
- `src/infrastructure/browser/owned-client.test.ts`
- `src/infrastructure/browser/table-client.ts`
- `src/infrastructure/server/database/catalog.contract.ts`
- `src/infrastructure/server/database/config.test.ts`
- `src/infrastructure/server/identity/config.ts`
- `src/infrastructure/server/identity/identity.contract.ts`
- `src/infrastructure/server/identity/password.test.ts`
- `src/infrastructure/server/moderation/service-final.contract.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/components/aside/MonsterLibraryModal.tsx`
- `src/renderer/src/components/aside/MonsterSection.tsx`
- `src/renderer/src/components/aside/MonsterTemplateFields.tsx`
- `src/renderer/src/components/aside/MonsterTemplateManagerModal.tsx`
- `src/renderer/src/components/workspace/WorkspaceHeader.tsx`
- `src/renderer/src/styles.css`
- `src/server/config.ts`
- `src/server/environment-setup.test.ts`
- `src/server/http.test.ts`
- `src/server/http.ts`
- `src/server/index.ts`
- `src/server/legacy-http.fixture.ts`
- `src/server/moderation-http.ts`
- `src/server/owned-http.ts`
- `src/server/owned-scene-links.ts`
- `src/server/table-http.test.ts`
- `src/shared/api/client.ts`
- `src/shared/contracts/service-references.ts`
- `src/web/AccountAccess.tsx`
- `src/web/AdminAccounts.tsx`
- `src/web/AdminSystems.tsx`
- `src/web/GameCatalog.tsx`
- `src/web/GameEditor.tsx`
- `src/web/GuestEntry.tsx`
- `src/web/Participants.tsx`
- `src/web/ServiceApp.test.tsx`
- `src/web/ServiceApp.tsx`
- `src/web/dialogs.tsx`
- `src/web/main.tsx`
- `src/web/service-model.ts`
- `src/web/service.css`
- `src/web/workspace.ts`

## Diff efectivo completo contra main (incluye archivos nuevos)

```diff
diff --git a/.env.example b/.env.example
index 6618e8e..3e51318 100644
--- a/.env.example
+++ b/.env.example
@@ -4,13 +4,10 @@ TTRPG_HOST=127.0.0.1
 TTRPG_PORT=8787
 TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787
 TTRPG_WEB_DIR=/ruta/al/proyecto/out/web
-TTRPG_DATA_DIR=/ruta/privada/ttrpg-effects-service
-# El script genera dos claves aleatorias distintas. No usar valores de ejemplo.
-TTRPG_DM_KEY=
-TTRPG_PLAYER_KEY=
+TTRPG_DATA_DIR=/ruta/al/proyecto/.local/service/data
+# Secreto aleatorio generado por setup:env; nunca compartir con el cliente.
+TTRPG_AUTH_SECRET=
 
-# Persistencia local. Producción exige postgres; la API legada sigue bloqueada
-# hasta completar la migración funcional. Ver docs/database.md.
 TTRPG_DEPLOYMENT=local
 TTRPG_DB_DRIVER=sqlite
 # Para postgres: sustituir driver; configurar URL privada y TLS verify-full.
@@ -19,7 +16,3 @@ TTRPG_DB_DRIVER=sqlite
 # TTRPG_DB_TLS=verify-full
 # TTRPG_DB_CA_FILE=/ruta/absoluta/ca.pem
 
-# Identidad007 optativa. Genera un secreto independiente de 32 bytes base64url.
-# No compartir con Electron/VITE ni usar claves DM/player. Mantener false hasta migrar/provisionar.
-TTRPG_IDENTITY_ENABLED=false
-TTRPG_AUTH_SECRET=REEMPLAZAR_POR_SECRETO_ALEATORIO_PRIVADO
diff --git a/.gitignore b/.gitignore
index 6c1c1da..9b3eae5 100644
--- a/.gitignore
+++ b/.gitignore
@@ -63,3 +63,6 @@ tmp/
 # ── Debug artifacts ───────────────────────────────────────────────────────────
 /index.html
 /index.js
+
+# Datos, provisión y respaldos privados del servicio
+/.local/
diff --git a/CHANGELOG.md b/CHANGELOG.md
index a8ceb68..92ac42f 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,5 +1,13 @@
 # Changelog
 
+## 3.13.0 — 2026-10-31 — Funcionalidad
+
+- Acceso por cuentas administrador/DM, cambio obligatorio, administración de cuentas y catálogo de sistemas con versiones retenidas; selección explícita de sistema por partida.
+- Catálogo de partidas, apertura/continuidad/reapertura, invitaciones por alias y panel de participantes con expulsión y enlace renovado sin desconectar sobrevivientes.
+- Cliente compartido navegador/Electron servicio con recursos propios, revisiones, bindings, idempotencia, guard de cuenta/borradores y transporte contextual; Electron local conserva operación autónoma.
+- Servicio final SQLite local/PostgreSQL productivo conTLS, retiro de claves/rutas globales y setup privado bajo `.local/service`; respaldo/restauración con invalidación de accesos y guías de retorno.
+- Conserva formato `.ttrpgscene`v2 y compatibilidad de lectura/migraciónv1.
+
 ## 3.12.0 — 2026-10-31
 
 ### Feature
diff --git a/README.md b/README.md
index d222bd1..2d18646 100644
--- a/README.md
+++ b/README.md
@@ -147,30 +147,27 @@ Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en
 
 ## Servicio privado API
 
-`pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js 24. Requiere configurar claves DM/jugador, origen y directorio exclusivo. Consulta [configuración, rutas, límites y respaldo](docs/private-api.md). La versión 3.6.0 conserva el formato de escena 2 y Electron local, e incluye [cliente navegador](docs/browser-client.md) y [mesa sincronizada HTTP/SSE](docs/synchronized-table.md) con roles DM/jugador.
+`pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js24 con cuentas administrador/DM, recursos privados y partidas con sistema/version explícitos. Navegador y Electron servicio comparten frontend; Electron local sigue sin servidor. Consulta [API](docs/private-api.md), [interfaz](docs/browser-client.md) y [operación/respaldo](docs/service-operations.md).
 
-Para ejecutar Electron contra el servicio y operar la instancia, consulta [Electron servicio, HTTPS, claves y backup/restore](docs/service-operations.md).
+## Preparar el servicio
 
-### Configuración local del servicio
-
-Ejecuta `pnpm setup:env` una vez para crear `.env`, `.env.electron` y el directorio privado de datos. Después usa `pnpm start:api` y, en otra terminal, `pnpm start:service`. Las claves DM/jugador permanecen en `.env`; el modo y la URL del cliente están en `.env.electron`. Consulta la [guía operativa](docs/service-operations.md) para builds y detalles.
-
-### Persistencia multi-DB
-
-La versión 3.8.0 incorpora infraestructura y catálogo de partidas para SQLite local/PostgreSQL producción, con migraciones explícitas y contratos reales. **La API global todavía solo arranca con local + sqlite**; la migración funcional y autenticación por cuentas siguen pendientes. Consulta [drivers, migraciones y gate test:db](docs/database.md).
-
-## Identidad de cuentas optativa (007)
-
-La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](docs/identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.
-
-## Partidas y datos privados (008)
+```bash
+pnpm setup:env
+pnpm build:api
+pnpm build:web
+pnpm db:migrate
+pnpm identity:bootstrap
+pnpm identity:password
+pnpm identity:provision-dm
+pnpm start:api
+```
 
-La versión 3.10.0 entrega partidas y recursos privados por DM, catálogo de sistemas administrado por admin y publicaciones retenidas sin borrado. Incluye referencias exactas, transacciones SQLite/PostgreSQL, revisiones/idempotencia, migración 4 y transferencia operativa v3 con lectores v1/v2. [API y operación de datos privados](docs/owned-data.md). El servicio global histórico continúa limitado a local+SQLite; las nuevas cuentas y datos están separados, el arnés PostgreSQL se prueba sin ServiceStore y el corte de producto/UI está pendiente de011.
+Los comandos de identidad son TTY y nunca aceptan contraseñas en argumentos. No se crean cuentas al arrancar. Setup conserva configuración existente y genera configuración nueva privada en `.env`, `.env.electron` y `.local/service/{data,backups,logs}`; los datos quedan ignorados porGit. Un entorno legado incompleto exige actualización explícita. No hay claves DM/jugador globales ni autorregistro.
 
-## Invitaciones backend009 (3.11.0)
+Para Electron servicio, compila con `pnpm build` y ejecuta `pnpm start:service`; `.env.electron` solo contiene modo/origen, sin secretos ni DB. Para local usa `pnpm dev` sin modo service. PostgreSQL conTLS verificado es obligatorio en producción; SQLite sigue disponible localmente. [Persistencia y migraciones](docs/database.md).
 
-La [guía de invitaciones](docs/invitations.md) describe apertura/presencia, enlaces efímeros, alias/cookies, replay, cuotas, migración5 y restauración segura. `pnpm test:invitations` verifica contratos reales SQLite/PostgreSQL y humo API compilada. Proyección/moderación010 y pantallas/corte011 siguen pendientes; no se retira el guard de transición.
+## Cuentas, sistemas, partidas e invitaciones (3.13.0)
 
-## Moderación y transporte contextual010 (3.12.0)
+[Identidad](docs/identity.md): administrador único, provisiónDM, cambio obligatorio, disable/reset/revocación. [Datos privados y catálogo](docs/owned-data.md): dos propietarios aislados, versiones publicadas retenidas, CAS/bindings y transferencia explícita sin tocar el perfilElectron. [Invitaciones](docs/invitations.md): alias, cookie por partida, continuidad/reapertura deliberada. [Moderación](docs/moderation.md): participantes identificados por alias+discriminador, expulsión atómica con nuevo enlace y supervivientes estables.
 
-[Moderación por participante y mesas independientes](docs/moderation.md): expulsión atómica con rotación única, roster privado, HTTP/SSE/assets/dados por partida y adaptador con terminación segura. `pnpm test:moderation` verifica ambos motores reales y el backend compilado. La composición optativa no activa el frontend legado; pantallas y corte integrado permanecen en011.
+Los gates de DB/identidad/datos/invitaciones/moderación requieren PostgreSQL temporal real conTLS. El gate de moderación incluye composición final compilada y respaldo/restauración integral de ambos motores. Las pantallas se verifican también con navegador/Electron reales; evidencia y límites en el expediente011. `.ttrpgscene` conserva v2 y lectura/migraciónv1.
diff --git a/docs/browser-client.md b/docs/browser-client.md
index d2e38a5..6ec482c 100644
--- a/docs/browser-client.md
+++ b/docs/browser-client.md
@@ -1,74 +1,36 @@
-# Cliente navegador — 3.5.0
+# Cliente de cuentas, partidas e invitados
 
-El navegador utiliza el mismo VTT React/PixiJS de Electron. Guarda en el servicio privado del mismo origen; Electron mantiene sus archivos y bibliotecas locales. El formato de intercambio sigue siendo `.ttrpgscene` versión 2 y acepta migración de versión 1.
+El frontend de servicio se compila con `pnpm build:web` y lo sirve la API del mismo origen. Navegador y Electron servicio utilizan las mismas pantallas y contratos. Node24 y pnpm son necesarios para construir/operar, no para el navegador.
 
-## Arranque
+## Acceso y cuentas
 
-Requiere Node.js 24 y pnpm. Configura las variables y claves privadas descritas en [API privada](private-api.md). Nunca uses el directorio del perfil Electron como `TTRPG_DATA_DIR`.
+El administrador proporciona cuentas DM. Accede con correo y contraseña; no hay selector de rol, autorregistro ni recuperación por correo. Una contraseña temporal obliga a cambiarla antes de cargar datos privados. Cambiar contraseña revoca las sesiones. Las cuentas administradoras tienen pantallas de cuentas/sistemas; no pueden abrir recursos DM.
 
-Producción local:
+La pantalla de acceso permite pegar una invitación del mismo origen. El secreto del fragmento se retira de la barra y permanece únicamente en memoria hasta consumir/cancelar. La ruta `/jugar/:gameId` consulta primero la cookie de esa partida: recargar conserva participante/alias/discriminador. Si ya no hay acceso, solicita una invitación vigente. Los alias no son identidades verificadas.
 
-```sh
-pnpm build:api
-pnpm build:web
-export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787
-export TTRPG_WEB_DIR="$PWD/out/web"
-pnpm start:api
-```
+No se guardan claves, tokens, invitaciones ni borradores privados en localStorage/sessionStorage. La cookie de cuenta y las cookies invitadas por partida son independientes. Salir como jugador no cierra la cuenta DM, y viceversa.
 
-Abre `http://127.0.0.1:8787`. `TTRPG_WEB_DIR` es opcional, absoluto y apunta exclusivamente al build. Para acceso remoto se conserva la exigencia HTTPS y proxy de la API; no hay despliegue incluido.
+## Partidas y catálogo
 
-Desarrollo, con el mismo entorno de claves/directorio en la terminal de API:
+El DM selecciona explícitamente sistema y versión al crear. La referencia es inmutable. Los nombres repetidos conservan IDs distintos. Archivar/borrar termina el acceso de la partida y conserva recursos reutilizables. Restaurar no abre la partida. Una versión deshabilitada impide usos nuevos, pero se conserva en partidas y fichas existentes.
 
-```sh
-export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:5175
-pnpm dev:api
-```
+El administrador crea sistemas y borradores, edita las presentaciones Markdown/CSS con los campos compartidos del gestor local, previsualiza, publica versiones y cambia disponibilidad. Las publicaciones conservan hash/contenido; para cambiarlas crea otra versión. No existe borrado de sistema/versión/plantilla. Los DMs leen las presentaciones exactas y no disponen de gestión editable de plantillas. Electron local conserva su gestor.
 
-En otra terminal: `pnpm dev:web`. Abre `http://127.0.0.1:5175`. Vite reenvía `/api/v1` a `127.0.0.1:8787`, conservando Host y Origin. La API necesita reinicio tras cambios; Vite actualiza el frontend. `pnpm dev` y `pnpm build` siguen siendo Electron; `out/web` y `out/api` son independientes de `out/main`, `out/preload` y `out/renderer`.
+## Trabajar y compartir
 
-## Acceso y trabajo
+1. Abre el editor de tu partida. **Iniciar partida** es explícito. **Continuar partida** conserva apertura/generación; no reabre al recargar.
+2. Carga/importa un mapa y guarda la escena en tu biblioteca privada. Guardar y publicar son acciones distintas.
+3. Si la escena contiene monstruos, usa **Asociar escena guardada a la partida** en Mesa antes de publicar. El servidor exige sistema/version/bindings compatibles y disponibilidad para vínculos nuevos.
+4. Publica la escena desde las herramientas habituales del VTT. Tras reiniciar la API debes publicarla otra vez; no se reproducen tiradas antiguas.
+5. Abre Mesa y copia el enlace disponible. Si no lo conservas, **Crear enlace nuevo** solicita confirmación: el anterior deja de admitir, los invitados presentes continúan. Una copia denegada permite seleccionar el campo y usar Cmd/Ctrl+C.
+6. El panel muestra alias, discriminador y presencia. Expulsar confirma el participante exacto, revoca sus accesos y cambia la invitación, sin desmontar la vista de los sobrevivientes.
 
-Selecciona DM o Jugador e introduce la clave correspondiente. El servicio determina el rol y administra una cookie HttpOnly. Recargar restaura la sesión, no la escena abierta: usa **Cargar escena** para recuperar un guardado. No se almacena la clave ni una copia privada del trabajo web en localStorage/sessionStorage. El logout revoca la sesión y limpia cliente/solicitudes; si falla la red se informa y no se afirma un cierre exitoso.
+El secreto solo se entrega una vez. GET/replay no lo recupera. Una respuesta incierta conserva clave/payload/precondiciones para el reintento; una rotación nueva debe ser deliberada. No se promete retirar bytes ya descargados ni impedir que una persona reingrese con otra invitación.
 
-El DM usa el menú del nombre de escena:
+## Borradores y conexión
 
-- **Guardar escena** crea una identidad o actualiza la actual. La primera vez pide nombre. **Cargar escena** abre el selector con nombres y páginas de 50 resultados; admite cancelar, error y reintento.
-- **Importar archivo .ttrpgscene** valida y crea otra escena en el servicio. No reemplaza la abierta si el archivo es inválido. **Exportar archivo .ttrpgscene** descarga el estado abierto sin cambiar su identidad y sin bytes de imágenes.
-- **Importar escena como mapa** en la lista de mapas selecciona otra escena guardada, conserva la escena actual y remapea identidades conforme al caso de uso existente.
-- **Administrar plantillas** y las bibliotecas del explorador usan almacenamiento remoto real. Monstruos, NPCs y personajes se buscan, obtienen, guardan y reutilizan desde los mismos formularios.
-- **Cerrar sesión** y cambiar de escena ofrecen guardar/descartar/cancelar si hay cambios. Un fallo al guardar impide continuar. Al abandonar la página hay aviso nativo para cambios pendientes.
+Antes de cambiar escena/partida, cerrar/reabrir o salir con cambios, el editor permite Guardar/Descartar/Cancelar. Guardar espera confirmación del servicio. Si expira la cuenta, el mapa y sus portales se ocultan e inhabilitan. El borrador queda en memoria para el ID original; otro ID requiere descartarlo explícitamente. Recuperar verifica revisiones: un conflicto conserva el borrador y exige resolución.
 
-Un 401 oculta e inhabilita el VTT, conservándolo en memoria para volver a acceder con rol DM. No recargues la página si quieres recuperar esos cambios. El jugador no puede recuperar ese estado ni consultar escenas, assets o bibliotecas privadas. El jugador espera publicación y recibe el PlayerApp real mediante SSE. Publicación, cámara, apuntador, áreas, dados, presencia y recuperación están descritos en [mesa sincronizada](synchronized-table.md).
+Un corte de red muestra reconexión y mantiene incertidumbre. Los terminales retiran la proyección y sus efectos. «Esta partida está abierta en otra pestaña» permite retomar explícitamente; el mensaje genérico de fin no inventa una causa de expulsión. Los límites429 requieren esperar; no garantizan stream por cada admisión.
 
-## Imágenes y enlaces
-
-El selector admite PNG, JPEG y WebP estáticos, hasta 20 MiB. El servidor valida además contenido/dimensiones; HEIC y formatos no admitidos deben convertirse. **Agregar mapa**, **Actualizar imagen**, el selector de fichas y **Imagen** del token suben un asset. En notas, **Agregar o reemplazar imagen** inserta la imagen o reemplaza la selección de imagen del editor. Para sustituir un marcador de imagen ausente, selecciónalo en el documento antes de elegir la nueva imagen.
-
-Las escenas conservan `asset:UUID`; el DOM solo recibe `/api/v1/assets/UUID` validado. Una ruta local/importada o URL externa se identifica como ausente, conservando su referencia para diagnóstico. El aviso indica mapa/token/nota afectado. No se intenta leer esa ruta en el servidor ni descargar una URL arbitraria. Los assets exportados permanecen en esta instancia; transferir solamente el JSON no los hace portables. El reemplazo de fondo pide confirmación y política de tamaño, mantiene ID, geometría y estado inactivo, y conserva el original si se cancela o falla.
-
-Los enlaces entre escenas usan `scene:UUID` en los campos heredados `scenePath`/`filePath`; nunca son rutas del sistema. El selector de destino muestra escenas y marcadores del servicio. Desde la pestaña **Mapa**, abre **Editar** en una conexión y usa **Elegir escena del servicio**, selecciona el marcador y confirma **Conectar con esta escena**. El mismo modal conserva la alternativa de mapa interno. Para cambiar entre un enlace interno y otro hacia una escena distinta, usa primero **Desligar**: intentar cambiar directamente muestra una indicación y conserva la conexión sin guardar cambios parciales. Si desligar falla, el enlace permanece y se puede reintentar. Un destino heredado ausente se puede reemplazar directamente; se avisa si no fue posible actualizar aquella referencia anterior. Conectar/desconectar actualiza ambos extremos en una transacción SQLite; navegar revalida reciprocidad y activa el mapa de destino. Los enlaces internos siguen usando IDs de mapa. Referencias locales importadas no se adivinan por nombre: quedan rotas y pueden desconectarse/repararse con el selector.
-
-## Arquitectura y seguridad
-
-`src/web/ServiceApp.tsx` compone sesión y roles, `DialogHost` gestiona diálogos nativos accesibles y `createBrowserClient` adapta el contrato completo. `HttpTransport` valida JSON/esquemas, mismo origen, errores y generación antes/después del cuerpo. Logout/401 abortan solicitudes y la señal compartida de sesión; selectores y lecturas de archivos de una sesión anterior se descartan incluso tras reautenticación. Los portales de notas, fichas, bibliotecas y reemplazo se montan dentro de la frontera hidden/inert del VTT, conservando borradores sin exponerlos durante recuperación. Los hooks existentes conservan guards por escena/mapa. Los enlaces reutilizan reglas de dominio; importar mapas comparte el caso puro extraído del adaptador de filesystem.
-
-El cliente declara escenas/imágenes/bibliotecas/player/dice disponibles y nativeMenus ausente. `TtrpgClient.assetReferences = "service"` identifica la representación para habilitar inserción de imágenes de notas solo donde existe; no concede permisos. Todos los métodos Player/Dice usan HTTP/SSE reales; los eventos de menús nativos siguen inactivos.
-
-El grafo web no importa main/preload/Electron/SQLite. Pixi usa su módulo `pixi.js/unsafe-eval`, cuyo nombre histórico designa los reemplazos de generadores que evitan evaluación dinámica. La CSP mantiene `script-src 'self'` sin `unsafe-eval`; assets remotos están bloqueados. El servidor limita estáticos a realpath del build, rechaza archivos ocultos/traversal/symlinks externos, métodos no GET/HEAD y assets inexistentes. Solo navegaciones HTML sin extensión tienen fallback; `/api/v1` conserva errores JSON y autorización.
-
-## Matriz de paridad y evidencia
-
-| Capacidad | Navegador | Electron local | Evidencia |
-| --- | --- | --- | --- |
-| Mapa, grilla, medidas, luz, efectos, niebla, anotaciones, selección | Mismos motores y herramientas | Conservado | Suite dominio/render/App; CUA mapa900×600, luz y medida15ft |
-| Escenas y múltiples mapas | Guardar/selector/importar/exportar/como mapa | Diálogos locales | `browser-client.test.ts`, `App.workspace.test.tsx`; CUA dos mapas + reload + archivos JSON descargados |
-| Imágenes y reemplazo | Upload y referencias seguras, fondos/tokens/fichas/notas | Protocolos locales | Integración HTTP, tests existentes reemplazo; CUA nota con imagen, ruta ausente y fondo inactivo |
-| Bibliotecas y plantillas | Tres bibliotecas y plantillas persistentes | Repositorios locales | Integración real con reinicio y suite de bibliotecas/ciclo de vida |
-| Enlaces | Operaciones recíprocas atómicas con IDs | Enlaces locales | Integración real navegación/desconexión/reconexión/rollback; App/modal de conexión y reparación; CUA conexión A/B, reconexión y reparación heredada |
-| Sesión y roles | DM privado; jugador con proyección filtrada | Player View IPC | `ServiceApp.test.tsx`; CUA IAB/Chrome independientes,401/red/logout |
-| Publicación/cámara/puntero/áreas/dados compartidos | HTTP/SSE real, recuperación y assets vigentes | Operación IPC existente | Integración real `table-http`, adaptador `table-client` y evidencia 004 |
-| Labs | Entradas previas | Sin sustitución por cliente de prueba | Suite App/labs; CUA ui-lab monasterio |
-| Layout |1440×900/1024×768/1920×1080 | VTT existente | CUA: drawers sin overflow1024, proyección jugador1920 |
-
-Detalles de ejecución, límites del humo y resultados de comandos: [build 003](../factory/jobs/003-cliente-navegador/build.md). La matriz no afirma prueba manual exhaustiva de todas las herramientas: bibliotecas, enlaces y casos de fallos complejos tienen integración automatizada real más regresión de los componentes existentes.
+Recargar/cerrar puede perder cambios en memoria. Electron servicio presenta la confirmación nativa Seguir editando/Descartar y salir. El modo local continúa sin cuenta ni API.
diff --git a/docs/client-architecture.md b/docs/client-architecture.md
index c18a54b..d434196 100644
--- a/docs/client-architecture.md
+++ b/docs/client-architecture.md
@@ -1,6 +1,6 @@
 # Contrato de clientes y paridad del servicio
 
-Estado del cliente: implementado en 3.2.0 (2026-10-28), con transporte Electron local. Desde 3.3.0 existe el [servicio HTTP privado](private-api.md) con autenticación y recursos opacos; el [cliente navegador 3.4.0](browser-client.md) implementa HTTP; la [mesa sincronizada 3.5.0](synchronized-table.md) completa SSE y dados. La matriz siguiente conserva las responsabilidades previstas de adaptación de `factory/migracion-servicio.md`.
+Cliente compartido con transporteElectron local y servicio contextual3.13.0. Desde 3.3.0 existe el [servicio HTTP privado](private-api.md) con autenticación y recursos opacos; el [cliente navegador 3.4.0](browser-client.md) implementa HTTP; la [mesa sincronizada 3.5.0](synchronized-table.md) completa SSE y dados. La matriz siguiente conserva las responsabilidades previstas de adaptación de `factory/migracion-servicio.md`.
 
 ## Fronteras implementadas
 
@@ -20,7 +20,8 @@ Las capacidades describen disponibilidad de grupos de operaciones existentes, **
 | --- | --- |
 | `scenes` | Abrir, guardar, guardar en ruta, importar como mapa y enlaces; hoy incluyen diálogos nativos y archivos locales. |
 | `images` | Selección/importación, reemplazo y resolución de imágenes de mapa, token y contenido lateral; hoy diálogos y protocolos locales. |
-| `libraries` | Plantillas de monstruos y las tres bibliotecas persistentes. |
+| `libraries` | Lectura de presentaciones y tres bibliotecas propias. |
+| `templateAdministration` | Disponibilidad de gestión local de plantillas; false en servicioDM. No es autorización. |
 | `player` | Apertura de ventana, estado, snapshots, cámara, puntero, áreas, readiness y estado de imagen. |
 | `dice` | Contexto, preferencias, tiradas, presentación pública, historial, visibilidad, errores y tamaños. |
 | `nativeMenus` | Acciones de escenas recientes y apertura del administrador de plantillas desde el menú nativo. |
@@ -29,7 +30,7 @@ Las capacidades describen disponibilidad de grupos de operaciones existentes, **
 
 ## Matriz de paridad
 
-Esta tabla enumera todos los métodos del contrato, incluidos los que no tienen consumidor actual. La columna de servicio es propuesta, no una implementación ni endpoints fijados. “DM” y “jugador” describen el rol previsto del servidor futuro. Electron actual conserva sus validaciones IPC y reglas vigentes.
+Esta tabla enumera todos los métodos del contrato, incluidos los que no tienen consumidor actual. La columna de servicio describe adaptación compartida. Las rutas y autoridad vigentes se definen en las guías de cuentas/datos/invitaciones/moderación. Electron actual conserva sus validaciones IPC y reglas vigentes.
 
 | Métodos | Local / capacidad | Equivalencia navegador implementada | Rol y diferencia de transporte |
 | --- | --- | --- | --- |
@@ -40,7 +41,7 @@ Esta tabla enumera todos los métodos del contrato, incluidos los que no tienen
 | `selectSceneLinkTargetFile`, `listSceneLinkCandidates` | Selector y lectura de candidatos / `scenes` | Selector por ids y HTTP de candidatos autorizados | DM; nunca aceptar lectura arbitraria por ruta. |
 | `connectSceneLink`, `disconnectSceneLink`, `validateSceneLinks`, `loadSceneLinkTarget` | Conexiones recíprocas y navegación / `scenes` | HTTP y transacciones entre recursos opacos | DM; adaptar identidad/rutas y conservar fallos recuperables. |
 | `onRecentSceneOpen` | Evento del menú nativo / `nativeMenus` | Historial/selector propio del navegador; evento de cliente si procede | DM; no existe menú Electron en navegador. |
-| `listMonsterTemplates`, `saveMonsterTemplate`, `deleteMonsterTemplate` | Repositorio local / `libraries` | HTTP de plantillas | DM; aislar biblioteca privada. |
+| `listMonsterTemplates`, `saveMonsterTemplate`, `deleteMonsterTemplate` | Repositorio local / `libraries` | ServicioDM lee presentaciones exactas/retención; escritura/borrado rechazan | Admin administra catálogo aparte; local conserva gestor. |
 | `onOpenMonsterTemplateManager` | Evento del menú nativo / `nativeMenus` | Acción de UI de navegador | DM; conservar apertura sin simular IPC. |
 | `searchMonsterLibrary`, `getMonsterLibraryEntry`, `saveMonsterLibraryEntry` | Biblioteca de monstruos / `libraries` | HTTP de monstruos | DM; imágenes por recursos autorizados. |
 | `searchNpcLibrary`, `getNpcLibraryEntry`, `saveNpcLibraryEntry` | Biblioteca de NPC / `libraries` | HTTP de NPC | DM; no exponer notas privadas. |
@@ -68,10 +69,12 @@ Esta tabla enumera todos los métodos del contrato, incluidos los que no tienen
 
 ## Seguridad y compatibilidad
 
-No cambia `.ttrpgscene`: formato 2 y carga/migración de legado 1, mapas, enlaces, referencias locales y recuperación de imágenes ausentes permanecen vigentes. `SceneOperationResult.filePath`, rutas de escenas/imágenes y protocolos `map-asset:` se conservan para Electron y requieren traducción en el adaptador futuro. No son una autorización para acceder al filesystem del servidor. La importación/exportación debe ser explícita y los ids del servicio opacos.
+No cambia `.ttrpgscene`: formato 2 y carga/migración de legado 1, mapas, enlaces, referencias locales y recuperación de imágenes ausentes permanecen vigentes. `SceneOperationResult.filePath`, rutas de escenas/imágenes y protocolos `map-asset:` se conservan para Electron y se traducen en el adaptador contextual. No son una autorización para acceder al filesystem del servidor. La importación/exportación debe ser explícita y los ids del servicio opacos.
 
 Las capacidades solo ayudan a presentar disponibilidad. La API autentica y autoriza por rol; la frontera `publicTableProjection` elimina ramas privadas antes de transmitir. Las reglas y límites de assets, presencia, SSE, idempotencia y dados se detallan en [mesa sincronizada](synchronized-table.md). El snapshot local Electron conserva su transporte; nunca se usa sin reconstrucción como frontera pública.
 
 Pruebas de composición: `src/renderer/src/client/ClientProvider.test.tsx`. Compatibilidad/versionado/IPC: `src/preload/index.test.ts`. Las suites existentes siguen cubriendo formato, enlaces, reemplazo de imagen, workspace, privacidad y herramientas Player. El expediente `factory/jobs/001-contrato-clientes/build.md` registra las verificaciones reales y límites de humo.
 
 La matriz de adaptación histórica de este documento se complementa con la [paridad efectiva y evidencias 3.4.0](browser-client.md#matriz-de-paridad-y-evidencia). `createClient` acepta metadato opcional `assetReferences: "service"` para representación de imágenes en notas; no es autorización.
+
+El cliente de recursos conserva CAS, bindings y operaciones inciertas por cuenta/recurso. El cliente de mesa es inmutable por partida/apertura/generación/audiencia. Rotar invitación no cambia su identidadReact. El guard superior contiene canvas y portales;401 suspende operaciones y protege borrador del ID original.
diff --git a/docs/database.md b/docs/database.md
index 2105247..670e526 100644
--- a/docs/database.md
+++ b/docs/database.md
@@ -1,12 +1,16 @@
+# Persistencia del servicio final
+
+Desde3.13.0, `start:api` utiliza exclusivamente `control.sqlite` local o PostgreSQL productivo conTLS. La identidad es obligatoria, las rutas globales están retiradas y no hay ServiceStore auxiliar. Las referencias históricas a la transición006 describen esa entrega; la configuración operativa vigente está en [operación](service-operations.md).
+
 # Persistencia SQLite y PostgreSQL — 3.8.0
 
-El catálogo de metadatos de partidas tiene dos adaptadores con el mismo contrato asíncrono. SQLite se usa localmente; PostgreSQL es obligatorio para producción. Es una entrega de infraestructura: **la API global actual todavía solo arranca con local + sqlite**. Seleccionar postgres o production en `pnpm start:api` falla antes de abrir archivos o escuchar. Las escenas, imágenes, bibliotecas y autenticación global siguen en el almacenamiento legado; migrarlas con propiedad real corresponde a las siguientes entregas. No hay todavía UI ni endpoints de partidas o cuentas nuevas.
+El catálogo y los recursos propios tienen adaptadores SQLite/PostgreSQL con contratos asíncronos equivalentes. SQLite es local; producción exige PostgreSQL. El servicio final usa estas fronteras para cuentas, partidas, contenido e invitados, sin almacén global auxiliar.
 
 El catálogo guarda UUID, propietario opaco, nombre, estado ready/archived y fechas UTC. Ready no significa partida abierta ni DM presente. Los repositorios reciben ownerId y restringen consultas/mutaciones a ese propietario; ese parámetro no autentica a nadie. No hay transferencia de propietario ni adopción automática de recursos legados.
 
 ## Configurar
 
-Node 24 y pnpm. La configuración se carga desde `.env` opcional, con prioridad para variables del proceso; no se ejecuta como script ni expande rutas. No compartir credenciales, imprimir objetos de configuración o copiarlos al frontend/.env.electron. `setup:env` conserva sus garantías anteriores: genera local/sqlite al crear archivos, conserva archivos existentes y no crea almacenamiento SQLite si `.env` ya selecciona postgres. Tras conservar una configuración PostgreSQL, el setup dirige a `pnpm build:api` y `pnpm db:migrate` y recuerda que el servicio completo sigue bloqueado; las instrucciones de claves/arranque legado se reservan a SQLite. PostgreSQL requiere preparación manual de un `.env` privado con permisos 0600; el script no genera sus credenciales ni modifica servidores.
+Node24 y pnpm. `.env` se carga como datos y variables del proceso prevalecen; las rutas no se expanden. Setup conserva archivos/secretos y no crea SQLite si se selecciona PostgreSQL. Crea directorios privados internos, sin duplicar assetsPG. PostgreSQL requiere configuraciónURL/TLS privada0600; setup no genera sus credenciales ni modifica servidores. Consulta [operación](service-operations.md).
 
 | Variable | Uso |
 | --- | --- |
@@ -47,7 +51,7 @@ PostgreSQL mantiene el catálogo en tablas `ttrpg_games` y `ttrpg_control_migrat
 
 El registro de migraciones guarda versión, nombre y checksum. Segunda ejecución es idempotente. Un historial más nuevo, cambiado o incompatible se rechaza. DDL y registro se confirman juntos; ante fallo se revierten. La migración PostgreSQL usa un advisory lock transaccional; SQLite, exclusión de archivo y BEGIN IMMEDIATE. Contención falla explícitamente o espera dentro de límites, sin duplicar versiones. No existe comando reset/drop/down destructivo.
 
-Abrir el catálogo sin esquema actualizado produce MIGRATION_REQUIRED y pide ejecutar el comando. El servidor legado no abre el nuevo catálogo por sí mismo ni convierte datos. No se debe quitar el guard productivo para probar el servicio: la infraestructura PostgreSQL disponible aquí no representa paridad funcional de escenas/assets/bibliotecas.
+Abrir sin esquema actualizado produce MIGRATION_REQUIRED y pide `pnpm db:migrate`. Ningún arranque adopta datos legados ni migra perfilElectron. El listener final espera apertura de identidad y exclusión antes de servir.
 
 ## Transacciones y recursos
 
@@ -69,7 +73,7 @@ pnpm build:web
 
 `test:db` es un gate **adicional obligatorio** para persistencia. Necesita `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE` en el entorno apuntando a un servidor temporal con SCRAM/TLS y CA de prueba. No carga `.env` real y rechaza el checkout si encuentra uno; usar checkout de pruebas aislado. La credencial de pruebas necesita CREATE DATABASE: cada fixture crea una base `ttrpg_test_<UUID>` y elimina solo esa base después de cerrar pools. SQLite usa directorios temporales separados. No usar una cuenta/base productiva para este arnés.
 
-El certificado de prueba debe cubrir localhost y 127.0.0.1, pero no 127.1, para la prueba negativa de hostname; el servidor debe escuchar loopback. El gate falla si falta configuración, no existe PostgreSQL o no están los artefactos compilados. No simula PostgreSQL ni hace skip verde. La suite general no incluye los archivos `.contract.ts`: el comando test:db los selecciona expresamente. Las mismas pruebas de repositorio/migraciones corren en ambos motores y se añaden TLS, comandos compilados y humo legado.
+El certificado de prueba debe cubrir localhost y 127.0.0.1, pero no 127.1, para la prueba negativa de hostname; el servidor debe escuchar loopback. El gate falla si falta configuración, no existe PostgreSQL o no están los artefactos compilados. No simula PostgreSQL ni hace skip verde. La suite general no incluye los archivos `.contract.ts`: el comando test:db los selecciona expresamente. Las mismas pruebas de repositorio/migraciones corren en ambos motores y se añaden TLS, comandos compilados y humo del listener final.
 
 La evidencia real de construcción y limpieza está en [build 006](../factory/jobs/006-persistencia-multidb/build.md). El gate no certifica despliegue remoto, carga prolongada ni todas las plataformas.
 
@@ -77,8 +81,8 @@ La evidencia real de construcción y limpieza está en [build 006](../factory/jo
 
 `.ttrpgscene` sigue en v2 con carga/migración v1. Catálogo, cuentas futuras e invitaciones no se serializan dentro del documento. Exportar JSON no incorpora imágenes; no se implementa aún traslado de datos SQLite/PostgreSQL ni adopción de recursos con un propietario elegido por defecto.
 
-Para respaldo local detener consumidores y migradores y copiar como unidad todo TTRPG_DATA_DIR, ahora incluyendo control.sqlite y sus sidecars junto a las bases legadas. No copiar solo un archivo en caliente ni borrar WAL/SHM para forzar apertura. Restaurar a un directorio nuevo privado y ejecutar la versión correspondiente. En PostgreSQL el operador usa herramientas consistentes como pg_dump/pg_restore sobre la base dedicada y conserva configuración/CA/credenciales por separado; no copiar archivos físicos del servidor en caliente. Esta entrega verifica persistencia/reapertura y transacciones, no un procedimiento completo nuevo de backup/restore PostgreSQL. La migración funcional y herramientas de importación/exportación se entregarán posteriormente.
+Para respaldo local detén consumidores/migradores y copia como unidad `control.sqlite` y sidecars presentes a destino nuevo privado. Conserva bases legadas aparte. PostgreSQL utiliza pg_dump/pg_restore consistentes conTLS verificado, configuración/CA y credenciales separadas. El gate final verifica roundtrip de ambos motores, datos/cuentas y rechazo de cookies restauradas tras invalidación explícita; consulta [respaldo/retorno](service-operations.md).
 
 ## Backend privado008
 
-Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migraciones 3/4, catálogo administrativo versionado y rutas `/api/v1/dm` y `/api/v1/admin/systems`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
+Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migraciones 3/4, catálogo administrativo versionado y rutas `/api/v1/dm` y `/api/v1/admin/systems`, revisiones, idempotencia y pruebas reales de ambos motores. 011 conecta esta superficie al listener final; las rutas globales históricas no existen en el producto y el driver productivo nunca cae al almacén legado.
diff --git a/docs/identity.md b/docs/identity.md
index ae57392..00fc8d1 100644
--- a/docs/identity.md
+++ b/docs/identity.md
@@ -1,23 +1,23 @@
 # Identidad de cuentas (007, versión 3.9.0)
 
-Esta entrega incorpora administrador/DM con Better Auth **1.7.14** y Kysely **0.29.7**, Node **24** y los drivers de 006. No cambia la UI ni concede acceso a la mesa global legada. El VTT completo sigue admitiendo exclusivamente local+SQLite; producción/PostgreSQL permanece bloqueado hasta el corte funcional. La composición HTTP aislada de las pruebas PostgreSQL no es un modo de despliegue.
+Cuentas administrador/DM con Better Auth1.7.14 y Kysely0.29.7, Node24 y driversSQLite/PostgreSQL. El servicio final usa identidad obligatoria y pantallas compartidas con Electron servicio. No existe acceso por claves globales.
 
 ## Preparación y operación local
 
-Conserva `.env` privado, fuera de Git, modo 0600. Usa el driver y TLS descritos en [base de datos](database.md). `TTRPG_IDENTITY_ENABLED=false` es el valor por defecto; ninguna clave global se convierte en cuenta. Añade un `TTRPG_AUTH_SECRET` independiente generado por un gestor de secretos: al menos 32 bytes aleatorios en base64url. No reutilices claves DM/player, no lo publiques en VITE/Electron ni lo imprimas en logs. El ejemplo es un placeholder que se rechaza al activar. El generador existente no activa identidad ni reescribe secretos.
+Conserva `.env` privado0600 y `TTRPG_AUTH_SECRET` aleatorio independiente. Setup genera el secreto solo en una configuración nueva; no modifica secretos existentes. `TTRPG_IDENTITY_ENABLED` ausente/true exige identidad; false aborta con instrucciones de actualización. Nunca publicar secretos en VITE/Electron/logs.
 
 1. Detén el servicio para migrar/provisionar en SQLite y para recuperar al administrador en ambos motores.
 2. Ejecuta `pnpm build:api` y `pnpm db:migrate`. La migración 2 crea identidad en `control.sqlite` o la base PostgreSQL seleccionada, sin tocar las bases legadas. Los comandos de identidad verifican la migración; no la aplican implícitamente ni crean una DB SQLite ausente.
 3. Ejecuta `pnpm identity:bootstrap`. Solicita email, nombre y contraseña con confirmación oculta. Solo puede crear el primer administrador en una base sin cuentas. El control se serializa dentro del motor y hay un índice único de administrador.
 4. Ejecuta `pnpm identity:password` para cambiar la contraseña temporal. Solicita email, contraseña actual y nueva con confirmación. Revoca todas las sesiones. Este comando funciona también para un DM.
 5. Ejecuta `pnpm identity:provision-dm`. Autentica al administrador, solicita datos/contraseña temporal del DM y revoca su sesión de operación incluso ante un error/cancelación. No funciona con contraseña administrativa temporal: completa el paso 4. Entrega la contraseña al destinatario por un canal privado; no se envía ni verifica correo.
-6. Solo después configura `TTRPG_IDENTITY_ENABLED=true` para exponer las rutas optativas en la API local. Habilitar exige secreto válido y esquema migrado antes de crear ServiceStore o escuchar. El frontend legado continúa con sus claves hasta 011.
+6. Arranca `pnpm start:api` tras migrar/provisionar. El listener compone cuentas, datos porDM, invitados y mesas contextuales sin ServiceStore legado.
 
-Los cuatro comandos son interactivos y exigen TTY. No admiten contraseñas por argumentos, pipes ni variables de provisión. Ctrl+C, Ctrl+D o Escape cancelan y restauran la terminal. Nunca se imprime una contraseña ni su hash; el éxito de alta muestra únicamente ID e instrucciones. No pongas contraseñas en curl, URL, historial o scripts. `identity:password` completa el flujo antes de disponer de la UI011.
+Los cuatro comandos son interactivos y exigen TTY. No admiten contraseñas por argumentos, pipes ni variables de provisión. Ctrl+C, Ctrl+D o Escape cancelan y restauran la terminal. Nunca se imprime una contraseña ni su hash; el éxito de alta muestra únicamente ID e instrucciones. No pongas contraseñas en curl, URL, historial o scripts. La UI también ofrece cambio propio con revocación de sesiones.
 
 Para una contraseña administrativa perdida, detén el servicio y ejecuta `pnpm identity:recover-admin`. Selecciona el administrador existente por email, escribe `RECUPERAR`, y define la contraseña temporal dos veces. No crea cuentas, no promueve DMs ni cambia email/rol; revoca todas las sesiones. Después ejecuta `identity:password`. Esta capacidad confía en el operador con acceso local a configuración/DB, equivalente a poder administrar esa base; no existe endpoint HTTP de recuperación.
 
-## HTTP optativo
+## HTTP de identidad
 
 Prefijo `/api/v1/identity`. JSON cerrado, máximo **8192 bytes** incluso con transferencia chunked. Todas las mutaciones requieren `Origin` exacto y el Host configurado; HTTP solo loopback, HTTPS remoto. No se confía en X-Forwarded-* ni se configura CORS. El peer para cuotas es la IP TCP; tras proxy es la IP del proxy y la cuota se comparte, sin prometer identificación del cliente por una cabecera no fiable.
 
diff --git a/docs/invitations.md b/docs/invitations.md
index 8111c44..f250e15 100644
--- a/docs/invitations.md
+++ b/docs/invitations.md
@@ -1,6 +1,6 @@
 # Invitaciones y participantes — backend 009
 
-Disponible desde 3.11.0 en la composición optativa de identidad 007/propiedad 008. Son contratos backend utilizables y probados en SQLite y PostgreSQL; la proyección y moderación pertenecen a 010, las pantallas y el corte del servicio a 011. `/jugar/<id>` es el destino reservado para esa pantalla futura. No se anuncia todavía una experiencia multijugador visual ni se retira el guard que limita el servidor legado a local+SQLite.
+El servicio final integra invitados por partida con cuentas/propiedad y moderación. La pantalla `/jugar/:id` es un shell neutro y usa exclusivamente autoridad invitada; la cuentaDM puede coexistir sin elevar ese namespace. Contratos probados enSQLite/PostgreSQL.
 
 ## Apertura y presencia
 
@@ -37,26 +37,26 @@ Primera ejecución de start/reopen/rotate entrega `secretAvailable:true` e `invi
 
 Cookie `ttrpg_guest`, HttpOnly, SameSite=Strict, Secure en HTTPS, sin Domain, Path `/api/v1/games/<gameId>/`, duración absoluta 28800 s. Cada path permite otra partida; siempre se verifica su contexto durable. Token únicamente en Set-Cookie, nunca JSON ni storage. Cookies duplicadas se rechazan.
 
-Alias: trim/NFC, 1–40 puntos Unicode, 160 bytes UTF-8, sin controles/formato invisible/bidi/surrogates inválidos. `<`, `>` y comillas permanecen texto: la futura UI debe escaparlo. Alias repetidos reciben discriminador estable diferente. No identifican a una persona ni permiten recuperar credenciales. Para otro alias hay que salir e ingresar nuevamente.
+Alias: trim/NFC, 1–40 puntos Unicode, 160 bytes UTF-8, sin controles/formato invisible/bidi/surrogates inválidos. `<`, `>` y comillas permanecen texto: la interfaz los renderiza como texto. Alias repetidos reciben discriminador estable diferente. No identifican a una persona ni permiten recuperar credenciales. Para otro alias hay que salir e ingresar nuevamente.
 
 Idempotencia DM conserva 24 h y presupuesto 008 de 1000 resultados/64 MiB por principal. Contextos incluyen acción, partida y apertura esperada, estables aunque cambie la generación. El resultado durable no guarda secretos. Idempotencia de admisión conserva 24 h, hasta 1000 resultados/1 MiB por apertura, huella del alias normalizado y digest de invitación. Misma clave con contenido diferente:409. Replay con cookie de ese participante devuelve identidad sin emitir otro token ni Set-Cookie, incluso si la invitación ya rotó. Sin cookie y enlace vigente:409 ADMISSION_ALREADY_PROCESSED sin identidad; enlace inválido:401 uniforme. Si se perdió la respuesta antes de instalar la cookie, nueva entrada explícita con clave nueva y enlace vigente crea otro participante y consume cupo; no puede recuperar el anterior por alias o requestId.
 
 Límites: 64 participantes con credencial vigente simultáneamente, 1000 admisiones históricas por apertura; salida/expiración libera cupo activo, nunca el histórico. HTTP cuenta incluso fallos/replay: 10 intentos/minuto/IP y 60/minuto/partida. Mapa máximo 10000 claves; saturación rechaza con 429, no desaloja claves para permitir evasión. Handler acota 64 solicitudes simultáneas; servidor conserva límites globales 100 conexiones y timeout vigente. Se usa IP del socket; no se confía en X-Forwarded-For. 429 incluye Retry-After; presupuestos durables incluyen retryAt. Los parámetros están centralizados en el handler/repositorio; ajustarlos exige medir y mantener autenticación, cuota y reserva transaccional.
 
-## Estados para 011
+## Estados del cliente
 
 - «El enlace no está disponible. Solicita uno vigente al DM»:401 uniforme para secreto incorrecto/rotado/expirado, partida inexistente/no disponible o apertura inválida.
 - «El anfitrión está reconectando. Intenta entrar cuando regrese»:409 únicamente después de verificar invitación.
 - «El acceso expiró o ya no está disponible. Solicita un enlace vigente al DM»:cookie sin autoridad.
 - Salida confirmada:204 y cookie borrada. Un fallo de DB no anuncia salida confirmada.
 
-`src/web/invitation-fragment.ts` captura una sola vez y limpia history sincrónicamente antes de fetch/carga opcional. Solo memoria hasta consumir/cancelar, sin storage/analytics/terceros.011 debe ejecutarlo al entrar, usar no-referrer y permitir pegar alias, Enter, Escape/cancelación, errores anunciados y aislar Delete/Backspace del canvas. Las pruebas instrumentadas no son una inspección visual de esa pantalla futura.
+`src/web/invitation-fragment.ts` captura una sola vez y limpia history sincrónicamente antes de fetch/carga opcional. Solo memoria hasta consumir/cancelar, sin storage/analytics/terceros.El cliente lo ejecuta al entrar y usa no-referrer, pegado de alias, Enter, Escape/cancelación y errores anunciados. La verificación visual se registra separada de las pruebas instrumentadas.
 
 ## Migración, restauración y verificación
 
 Usar Node 24 y pnpm. `pnpm build:api` genera API, módulo backend aislado para pruebas y comandos. `pnpm db:migrate` aplica migración 5 posterior a 1–4 sin cambiar checksums. Una apertura 008 existente queda sin invitación; debe recibir heartbeat válido y rotate con versión esperada0 o una reapertura explícita. No se emite secretamente al leer.
 
-Restart ordinario conserva plazos/revocaciones. Restaurar una copia integral es distinto: puede contener acceso antiguo. Mantener API detenida, configurar únicamente el destino restaurado, ejecutar `pnpm invitations:invalidate`, comprobar éxito, y solo entonces iniciar API. La operación transaccional cierra todas las aperturas y revoca participantes/credenciales del destino. No elimina contenido ni cambia identidades DM. Si falla, mantener API detenida y revisar configuración/migraciones. La guía no certifica backup/restore PostgreSQL productivo:011 lo completará.009 prueba copia integral SQLite y clon temporal PostgreSQL con invalidación explícita. Backups y hashes siguen siendo datos privados.
+Restart ordinario conserva plazos/revocaciones. Restaurar una copia integral es distinto: puede contener acceso antiguo. Mantener API detenida, configurar únicamente el destino restaurado, ejecutar `pnpm invitations:invalidate`, comprobar éxito, y solo entonces iniciar API. La operación transaccional cierra todas las aperturas y revoca participantes/credenciales del destino. No elimina contenido ni cambia identidades DM. Si falla, mantener API detenida y revisar configuración/migraciones. El gate final incluye pg_dump/pg_restore real, invalidación de invitados y rotación deliberada del secreto de identidad;009 conserva sus pruebas de copiaSQLite y clonPG. Backups y hashes siguen siendo datos privados.
 
 La transferencia funcional 008 v3 y lectores v1/v2 excluyen apertura/invitación/credencial; importar contenido empieza sin invitados. No se cambia `.ttrpgscene` v2 ni Electron local.
 
diff --git a/docs/moderation.md b/docs/moderation.md
index 49628db..9fa9bc8 100644
--- a/docs/moderation.md
+++ b/docs/moderation.md
@@ -1,6 +1,6 @@
 # Moderación y transporte contextual (010)
 
-Versión3.12.0. La composición `openModerationBackend` exportada por `out/api/invitation-backend.mjs` reúne identidad007, propiedad008, invitaciones009 y moderación010. Se abre con configuración DB explícita y configuración de identidad/origen; expone `handler` y `close`. Adquiere exclusión antes de que el llamador pueda escuchar. No construye ServiceStore, no mezcla cookies legadas y no activa por accidente el frontend antiguo. El corte de producto y las pantallas de login/partidas/expulsión corresponden a011; `start:api` mantiene su guard histórico.
+Servicio final3.13.0, protocolo introducido en3.12.0. La composición `openModerationBackend` exportada por `out/api/invitation-backend.mjs` reúne identidad007, propiedad008, invitaciones009 y moderación010. Se abre con configuración DB explícita y configuración de identidad/origen; expone `handler` y `close`. Adquiere exclusión antes de que el llamador pueda escuchar. No construye ServiceStore, no mezcla cookies legadas y no activa por accidente el frontend antiguo. `start:api` monta esta composición con salud/estáticos y las pantallas de acceso/partidas/expulsión de011. Las rutas globales antiguas devuelven404.
 
 Cada partida conserva sistema/version/hash exactos del catálogo008. El transporte público incluye solo referencia, hash y manifest de módulos compilados; nunca la definición, presentations, bindings privados ni owner. Deshabilitar una versión conserva aperturas/recursos existentes. La publicación con monstruos requiere `sceneResourceId`, correspondencia contra el recurso guardado y validación de bindings antes del commit. No se reinterpreta la calibración ni la diagonal de escenas.
 
@@ -33,7 +33,7 @@ Una única transacción confirma revocación del participante/todas sus credenci
 
 Respuesta kick: participantId,outcome (`revoked` o `already-revoked`),previousPresence,revision,invitation(metadata),secretAvailable,replayed y, solo en primera ejecución efectiva, invitationUrl. La URL no se persiste dentro del resultado. Un reintento idéntico conserva el resultado sin recuperar secreto; una clave reutilizada para otro objetivo/contenido da409. Una clave nueva contra alguien ya revocado no vuelve a rotar. Replay autorizado sigue disponible después de cerrar/reabrir según ventana009 de24h. Para compartir otro enlace tras perder la primera respuesta, obtener una rotación explícita con precondiciones nuevas.
 
-Antes de responder éxito se cancelan sus lectores HTTP pendientes y se cierran todos los streams y transfers registrados del objetivo. Los demás conservan cookies, IDs, cámaras y dados. Expulsar al principal promueve al siguiente conectado de esa partida, limpia su ACK y solicita bootstrap sin recentrar ni tirar dados. La UI011 debe confirmar alias+discriminador, pérdida de acceso y cambio de enlace, indicando que los demás permanecen. Un enlace posterior permite otra admisión: no se promete veto permanente ni identidad humana verificada.
+Antes de responder éxito se cancelan sus lectores HTTP pendientes y se cierran todos los streams y transfers registrados del objetivo. Los demás conservan cookies, IDs, cámaras y dados. Expulsar al principal promueve al siguiente conectado de esa partida, limpia su ACK y solicita bootstrap sin recentrar ni tirar dados. La UI confirma alias+discriminador, pérdida de acceso y cambio de enlace, indicando que los demás permanecen. Un enlace posterior permite otra admisión: no se promete veto permanente ni identidad humana verificada.
 
 ## SSE y cliente
 
@@ -41,7 +41,7 @@ Sobre protocolVersion2: gameId,openingId,generation,SystemRef (`systemRef`),syst
 
 Solo el DM del contexto recibe invalidación `roster`; el invitado no recibe alias/IDs ajenos ni notificaciones de expulsión de otros. Los eventos terminales `access-ended`, `replaced` o `unavailable` contienen únicamente metadata propia, sin snapshot, secreto o razón privada. Se intenta enviarlos sin esperar drain; si el socket tiene datos pendientes, se destruye. Ya no se encolan frames/chunks protegidos después de la revocación. Los bytes entregados antes al transporte/red/dispositivo no pueden recuperarse retroactivamente.
 
-`contextualTableClient` crea una instancia inmutable con transporte/aborts/cursor/cola propios y reutiliza BrowserTableClient. Terminal invalida peticiones, incrementa generación, cancela timers/retries y borra snapshot, cámara, dados, punteros, áreas y URLs; notifica callback para que011 desmonte la proyección. Todas las lecturas y conexiones fijan openingId/generation. OPENING_CHANGED o un sobre válido de otra apertura termina la instancia; un409 de revisión de mapa sigue siendo recuperable. Una respuesta que resuelve después de abort no repuebla. Replaced detiene la pestaña anterior hasta un inicio explícito. Una desconexión transitoria conserva vista desactualizada y reintenta;401/403/404 termina acceso. No reusa el secreto de invitación ni reingresa por alias automáticamente. La pantalla visible se prueba en011, no se atribuye a estas pruebas del adaptador.
+`contextualTableClient` crea una instancia inmutable con transporte/aborts/cursor/cola propios y reutiliza BrowserTableClient. Terminal invalida peticiones, incrementa generación, cancela timers/retries y borra snapshot, cámara, dados, punteros, áreas y URLs; notifica callback para que011 desmonte la proyección. Todas las lecturas y conexiones fijan openingId/generation. OPENING_CHANGED o un sobre válido de otra apertura termina la instancia; un409 de revisión de mapa sigue siendo recuperable. Una respuesta que resuelve después de abort no repuebla. Replaced detiene la pestaña anterior hasta un inicio explícito. Una desconexión transitoria conserva vista desactualizada y reintenta;401/403/404 termina acceso. No reusa el secreto de invitación ni reingresa por alias automáticamente. La evidencia de pantalla de011 se registra separadamente de estas pruebas del adaptador.
 
 ## Cuotas y operación
 
diff --git a/docs/owned-data.md b/docs/owned-data.md
index a93cb18..3b21eed 100644
--- a/docs/owned-data.md
+++ b/docs/owned-data.md
@@ -1,6 +1,6 @@
 # Partidas y recursos privados (008)
 
-Versión 3.10.0, ciclo 2. Backend preparado para011, sin pantallas nuevas ni invitaciones funcionales. La API global histórica continúa en local+SQLite y conserva su guard contra PostgreSQL/producción. `TTRPG_IDENTITY_ENABLED=true` monta, además de identidad007, las familias `/api/v1/dm` y `/api/v1/admin/systems` contra `control.sqlite`. Cada familia mantiene sus datos y credenciales independientes: las cuentas nuevas nunca autorizan la mesa global. El arnés `pnpm test:owned` monta exactamente los handlers de identidad y DM sobre PostgreSQL real sin construir ServiceStore. Este arnés no es un modo de despliegue productivo.011 realizará el corte integrado.
+El servicio final3.13.0 compone `/api/v1/dm` y `/api/v1/admin/systems` sobre SQLite/local o PostgreSQL/production conTLS, sin almacén global ni claves legadas. Las cuentas siempre se validan y el administrador no obtiene capacidadDM. Las pantallas consumen revisiones/bindings y catálogo exacto.
 
 ## Datos y autorización
 
@@ -10,7 +10,7 @@ La migración3 de `pnpm db:migrate` extiende el catálogo006 y crea tablas funci
 
 Las unidades de trabajo prestadas por `IdentityService.authorized` contienen `games`, `systems`, `links`, recursos, assets, aperturas e idempotencia. Comparten conexión/COMMIT/ROLLBACK con la revalidación de identidad y mantienen el bloqueo007 frente a revocaciones. Se comprueba principal antes del cuerpo y de nuevo dentro de la transacción; el resultado deduplicado también exige sesión vigente. Se registra cada método completo: un rechazo incluso capturado por el callback, una operación sin await o un fallo posterior revierte toda la operación. Una marca irreversible conserva el primer motivo; rechazar sin argumento, con null, false, cero o cadena vacía también aborta y no permite que un rechazo posterior borre el fallo. Se capturan argumentos antes del primer await; la revalidación final comprueba disponibilidad de todos los usos nuevos y coherencia de los enlaces. Los puertos caducan al salir del callback. Los callbacks deben terminar y no realizar red prolongada; PostgreSQL conserva sus timeouts006. La exclusión global007 serializa mutaciones autorizadas entre conexiones: no se promete rendimiento horizontal.
 
-## HTTP para011
+## HTTP de recursos propios
 
 Todas las rutas requieren cookie de cuenta DM activa, contraseña temporal ya cambiada, Host correcto y Origin exacto para mutaciones. No se acepta cookie legada ni rol admin como DM. Se conservan límites de10MiB JSON,20MiB imagen,40millones de píxeles y decodificador acotado de002. Respuestas JSON `{ok:true,...}` o `{ok:false,error:{code,message}}`. Ausencia de principal401; rol incorrecto403; recurso ausente o ajeno404 sin distinguirlos; validación422; revisión/conflicto409; corrupción500; almacenamiento503. Referencias de imagen no resolubles devuelven `url:null` y avisos genéricos, sin comprobar la existencia en otro owner.
 
@@ -24,10 +24,11 @@ Todas las rutas requieren cookie de cuenta DM activa, contraseña temporal ya ca
 | GET `scenes/:id/links/candidates` | Candidatos de marcadores propios, contrato existente. |
 | POST `assets` | Bytes PNG/JPEG/WebP y Content-Type exacto.201 `{asset:{id,reference,url,mimeType,byteLength}}`. UUID servidor; assets inmutables, sin limpieza automática. |
 | GET/HEAD `assets/:id`, POST `assets/resolve` | Bytes privados o404. Resolve `{references}`→`{assets:[{reference,url}]}`. Solo URLs `/api/v1/dm/assets/...` propias. Hash SHA256 y longitud verificados al leer bytes persistidos. |
+| GET `definitions/:kind/:id` | kind=`scenes` o `monsters`; resuelve exclusivamente bindings del recurso propio. `{templates,monsters}` contiene definiciones exactas y mapa monsterId→índice en templates (deduplicadas por referencia completa) para evitar colisiones de IDs privados/compartidos. No es un catálogo de selección nuevo. |
 | GET `monster-templates` | Página personal `limit/offset`→`{builtIn,templates,total}`; builtIn se entrega separado, no consume paginación personal. |
 | GET `monster-templates/:id` | Fachada de lectura histórica. Prioriza la definición privada del owner ante ID coincidente. PUT/DELETE devuelven 409 `IMMUTABLE`, incluso si nadie la referencia. |
 | GET/POST `libraries/:kind`, GET/PUT `libraries/:kind/:id` | kind=`monsters`, `npcs`, `player-characters`. Campos `{entry,bindings?}` y normalizadores/casos de uso anteriores. Respuestas `{entry}` con revisión; listas `{entries,total}`, `text`, `limit`, `offset`. No se añade DELETE. |
-| POST `scene-links/connect`, `disconnect` | Campos anteriores más `expectedRevisions:{[sceneId]:revision}` para todos los extremos modificados, incluida tercera escena de reconexión. Operación atómica completa. |
+| POST `scene-links/connect`, `disconnect` | Campos anteriores más `expectedRevisions:{[sceneId]:revision}` para todos los extremos modificados, incluida tercera escena de reconexión. Operación atómica completa; respuesta `revisions:{[sceneId]:revisionConfirmada}` para actualizar CAS sin releer una revisión posterior. |
 | POST `scene-links/validate`, `navigate` | Contratos anteriores, solo escenas propias; validate conserva diagnóstico genérico de destino ausente. |
 
 Toda mutación persistida lleva `Idempotency-Key: UUID`; GET/HEAD y los POST de solo lectura resolve/validate/navigate no la requieren. Editar/borrar exige `If-Match: "revision"` (se acepta también número sin comillas). La creación de un borrador exige revisión 0. La revisión es entera y aumenta en cada escritura; no vive dentro del documento portable. Las creaciones no aceptan IDs/owner/fechas/revisión del body. Eliminar devuelve200 `{ok:true}`, por lo que DELETE envía JSON `{}` y Content-Type; no hay cuerpo vacío implícito.
@@ -143,7 +144,7 @@ pg_restore --list /ruta/privada/respaldo.dump
 pg_restore --no-password --exit-on-error --no-owner --no-acl --dbname BASE_RESTAURACION /ruta/privada/respaldo.dump
 ```
 
-Configurar PGHOST/PGPORT/PGUSER/PGSSLMODE=verify-full/PGSSLROOTCERT y PGPASSFILE por entorno privado. Una restauración completa PostgreSQL incluye identidad; tratar dump como secreto y revalidar/cerrar sesiones según operación007. No usar `--clean` sobre una base con escrituras. Esta receta es distinta del paquete funcional, que excluye identidad. La evidencia008 prueba restauración temporal SQLite y transferencia a PostgreSQL; el dump/restore integral productivo se verifica durante el corte011.
+Configurar PGHOST/PGPORT/PGUSER/PGSSLMODE=verify-full/PGSSLROOTCERT y PGPASSFILE por entorno privado. Una restauración completa PostgreSQL incluye identidad; tratar dump como secreto y revalidar/cerrar sesiones según operación007. No usar `--clean` sobre una base con escrituras. Esta receta es distinta del paquete funcional, que excluye identidad. La evidencia008 prueba restauración temporal SQLite y transferencia a PostgreSQL; el gate de moderación incluye roundtrip integral real y cookies antiguas rechazadas antes de servir.
 
 ## Verificación reproducible
 
@@ -160,4 +161,8 @@ pnpm test:identity
 pnpm test:owned
 ```
 
-Los gates fallan si PostgreSQL real/TLS no están disponibles; no omiten motor. Crean y retiran basesUUID/directorios/HTTP propios y no tocan perfiles/env personales. `test:owned` incluye principal Better Auth real, CRUD y matriz de aislamiento, carreras entre conexiones, corrupción, rollback tras await, enlaces2/3 escenas, lease con reloj, bytea/BLOB, imágenes huérfanas, Unicode/Markdown, transferencia/adopción/rollback/restauración y CLI inspect/verify/import compilado. La UI011, invitaciones009 y moderación010 siguen pendientes; sin humo visual nuevo por este backend. Electron local conserva abrir/guardar/Player sin cuentas/API/PG.
+Los gates fallan si PostgreSQL real/TLS no están disponibles; no omiten motor. Crean y retiran basesUUID/directorios/HTTP propios y no tocan perfiles/env personales. `test:owned` incluye principal Better Auth real, CRUD y matriz de aislamiento, carreras entre conexiones, corrupción, rollback tras await, enlaces2/3 escenas, lease con reloj, bytea/BLOB, imágenes huérfanas, Unicode/Markdown, transferencia/adopción/rollback/restauración y CLI inspect/verify/import compilado. La UI011 consume estos contratos; su evidencia visual se registra separadamente de los contratos backend. Electron local conserva abrir/guardar/Player sin cuentas/API/PG.
+
+GET `/api/v1/dm/definitions/{scenes,monsters}/:id` devuelve `{ok,templates}` únicamente para los bindings de la instancia propia. Conserva definiciones privadas retenidas y versiones exactas; no resuelve referencias libres, no admite admin ni publica definiciones a invitados.
+
+El cliente011 separa presentaciones habilitadas para crear de la definición exacta retenida de cada instancia. Reutilizar una ficha de biblioteca comprueba su referencia exacta antes de agregarla; persistencia vuelve a validar autoridad/disponibilidad. Una coincidencia de templateId no convierte una privada en compartida ni cambia su binding.
diff --git a/docs/private-api.md b/docs/private-api.md
index 2997590..68e36f2 100644
--- a/docs/private-api.md
+++ b/docs/private-api.md
@@ -1,143 +1,36 @@
-# Servicio privado HTTP (3.6.0)
+# API privada del servicio de cuentas
 
-Este documento describe los contratos legados. Las rutas optativas de cuentas007 tienen cookies, errores y persistencia independientes: [identidad](identity.md). Una cuenta nueva no autoriza las rutas globales de este documento.
+El artefacto `out/api/index.mjs` compone identidad, propiedad, invitaciones y runtime contextual. Requiere Node24. `pnpm start:api` carga `.env`; variables del entorno explícito tienen precedencia. No abre `ServiceStore`, no crea cuentas al arrancar y no adopta datos legados automáticamente.
 
-El servicio Node.js 24 administra una instancia privada. Electron conserva su modo local y su perfil. Incluye el [cliente navegador](browser-client.md). La [mesa sincronizada](synchronized-table.md) añade SSE, publicación y assets autorizados para jugadores.
-
-La infraestructura de [catálogo multi-DB](database.md) todavía no sustituye este almacenamiento global. Desde 3.8.0, la API rechaza postgres/production antes de abrir datos; sin variables nuevas conserva local + sqlite. No se añaden cuentas ni autorización de partidas a estas rutas.
-
-## Arranque y configuración
-
-Instalar con `pnpm install`, compilar con `pnpm build:api` y ejecutar con `pnpm start:api`. `pnpm dev:api` compila y ejecuta; reiniciarlo tras editar fuentes. El entry es `out/api/index.mjs`; conservar todo `out/api`, incluidos los chunks compartidos y `db-migrate.mjs`,, independiente de Electron. Para trasladarlo conservar `node_modules` de producción (Zod, honeycomb-grid y sharp son externos al bundle; sharp requiere los binarios de su plataforma instalados por pnpm). `pnpm dev` continúa ejecutando Electron local.
-
-| Variable | Regla |
+| Configuración | Uso |
 | --- | --- |
-| `TTRPG_HOST` | Bind; predeterminado `127.0.0.1`. Mantener loopback detrás del proxy. |
-| `TTRPG_PORT` | Entero 0–65535, predeterminado 8787; 0 sirve para pruebas con puerto efímero. |
-| `TTRPG_DATA_DIR` | Obligatorio; ruta absoluta física a un directorio exclusivo, sin symlinks. No usar el perfil Electron. |
-| `TTRPG_PUBLIC_ORIGIN` | Obligatorio; origen exacto, sin barra final/ruta/credenciales. Ejemplo `http://127.0.0.1:8787`. |
-| `TTRPG_DM_KEY`, `TTRPG_PLAYER_KEY` | Obligatorias, distintas, entre 32 y 1024 caracteres, aleatorias y privadas. No existen valores predeterminados. |
-
-Ejemplo de entorno, usando claves generadas previamente por el operador (los marcadores no son claves utilizables):
-
-```sh
-export TTRPG_HOST=127.0.0.1
-export TTRPG_PORT=8787
-export TTRPG_DATA_DIR=/ruta/fisica/privada/ttrpg-service
-export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787
-# Proporcionar TTRPG_DM_KEY y TTRPG_PLAYER_KEY desde un gestor de secretos.
-pnpm build:api
-pnpm start:api
-```
-
-Solo se permite HTTP para `localhost`, `127.0.0.1` o `[::1]`; para acceso remoto usar HTTPS en un proxy inverso. El proxy debe preservar `Host` igual al host/puerto de `TTRPG_PUBLIC_ORIGIN` y `Origin` del navegador. Reenviar `/api/v1/` al bind privado; servir el frontend desde ese mismo origen. No exponer el puerto Node a Internet. Por ejemplo, si el origen es `https://mesa.example`, el upstream recibe `Host: mesa.example`; si es `https://mesa.example:8443`, debe recibir ese puerto también. En desarrollo un proxy web puede conservar su propio origen configurado y reescribir el Host upstream a ese mismo host/puerto. No se aceptan hosts alternativos automáticamente.
-
-El servidor no confía en `Forwarded` ni `X-Forwarded-*`, no habilita CORS y no deduce HTTPS del socket del proxy. La cookie Secure depende únicamente del origen configurado. Los límites de conexión se aplican a la IP real del par: clientes detrás de un mismo proxy comparten la cuota. Configurar también límites de cuerpo/tiempo en el proxy. Nunca añadir claves a URLs, bundles web, localStorage o logs.
-
-## Sesiones, errores y límites
-
-Prefijo de todas las rutas: `/api/v1`. Enviar `Content-Type: application/json` en JSON y `credentials: "same-origin"` desde el cliente. Cada mutación requiere `Origin` exactamente igual al configurado, incluido login/logout/upload. Un Origin ausente, `null` o distinto devuelve 403. GET autenticado puede omitirlo (imágenes/clientes HTTP), pero si lo incluye debe coincidir. CLI y pruebas deben enviarlo explícitamente; `curl` no lo añade solo.
-
-Login acepta `{key:string}` y devuelve `{ok:true,role:"dm"|"player",expiresAt:ISO}`. El rol deriva de la clave; campos extra como `role` se rechazan. La cookie es `ttrpg_session`, aleatoria de 256 bits, `HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=28800`, más `Secure` con HTTPS, sin Domain. Expira absolutamente a las ocho horas en servidor; login rota la sesión enviada y logout la revoca. Máximo 1000 sesiones; vencidas se limpian. Reiniciar borra todas las sesiones, no los recursos.
-
-Error común: `{ok:false,error:{code,message}}`, mensaje en español sin stack, SQL ni rutas físicas. Códigos: `VALIDATION_ERROR` (422), `INVALID_JSON`/`INVALID_ID`/`INVALID_PATH`/`INVALID_QUERY`/`INVALID_BODY` (400), `UNAUTHORIZED` (401), `FORBIDDEN`/`INVALID_ORIGIN`/`INVALID_HOST`/`BUILT_IN_TEMPLATE` (403), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `REQUEST_TIMEOUT` (408), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE`/`UNSUPPORTED_IMAGE_VARIANT` (415), `RATE_LIMITED` (429), `STORAGE_CORRUPT`/`INTERNAL_ERROR` (500). Un JSON bien formado con campos/tipos inválidos es 422. No hay hoy un flujo que produzca 409. Cualquier respuesta incluye `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`.
-
-Límites centralizados en `src/server/config.ts`: login 10 intentos/minuto/IP; general 600 solicitudes/minuto/IP; mapa de cuotas hasta 10 000 claves; 429 con `Retry-After: 60`. Máximo 100 conexiones y 100 peticiones por socket. Cabeceras 16 KiB/10 segundos; cuerpo 30 segundos; keep-alive 5 segundos. JSON 10 MiB; login/logout 4 KiB; imagen 20 MiB. El contador se aplica también sin Content-Length. Al exceder un cuerpo chunked se descarta el buffer y se drena sin retener hasta finalización o timeout para devolver un error HTTP usable. Los errores tempranos con cuerpo pendiente cierran la conexión. No se escriben temporales de upload. Se admiten como máximo dos decodificaciones de imagen simultáneas por servidor, sin cola: saturación devuelve 429. Cada decodificación tiene límite de procesamiento de 15 segundos y 40 millones de píxeles; el resultado temporal RGBA de 8 bits no supera 160 millones de bytes por imagen.
-
-## Rutas y DTO efectivos
-
-Las rutas privadas devuelven 401 sin sesión y 403 con sesión jugador, antes de leer el cuerpo. El jugador consulta/cierra su sesión y usa las rutas de mesa y assets de la publicación vigente, descritas abajo. Escenas completas, plantillas y bibliotecas siguen reservadas al DM. Conocer un ID no concede acceso.
-
-| Método/ruta | Acceso | Entrada | Éxito |
-| --- | --- | --- | --- |
-| GET `/health` | Todos | Sin query | 200 `{ok:true,status:"ok",version}` (package.json) |
-| POST `/auth/login` | Todos | `{key}` | 200 SessionDto y cookie |
-| GET `/auth/session` | DM/jugador | Cookie | 200 SessionDto |
-| POST `/auth/logout` | Todos, idempotente | Sin cuerpo | 204 y cookie borrada |
-| GET `/scenes` | DM | `limit=1..100` (50), `offset>=0` (0) | 200 `{ok:true,scenes:SceneSummary[],total}` |
-| POST `/scenes` | DM | `{name,scene}` | 201 `{ok:true,resource}` y Location |
-| POST `/scenes/import` | DM | `{name,scene}` (v1 o v2) | Igual creación, nuevo ID |
-| GET `/scenes/:id` | DM | UUID | 200 `{ok:true,resource}` |
-| PUT `/scenes/:id` | DM | `{name,scene}` | 200 `{ok:true,resource}`; desconocido 404 |
-| DELETE `/scenes/:id` | DM | UUID | 204; desconocido 404 |
-| GET `/scenes/:id/export` | DM | UUID | 200 documento JSON sin envoltorio, attachment `scene-UUID.ttrpgscene` |
-| POST `/assets` | DM | Bytes PNG/JPEG/WebP, MIME exacto | 201 `{ok:true,asset:AssetDto}` |
-| GET/HEAD `/assets/:id` | DM; jugador solo si publicado | UUID | 200 bytes con MIME verificado |
-| POST `/assets/resolve` | DM; jugador solo referencias publicadas | `{references:string[]}` (máx. 200, cada referencia 2048 caracteres) | 200 `{ok:true,assets:[{reference,url:string|null}]}` |
-| GET `/monster-templates` | DM | Sin query | 200 `{ok:true,templates:MonsterTemplate[]}` |
-| PUT `/monster-templates/:id` | DM | `{template:MonsterTemplate}` | 200 `{ok:true,templates}` |
-| DELETE `/monster-templates/:id` | DM | ID de usuario | 200 `{ok:true,templates}`; ausente 404 |
-| GET `/libraries/:kind` | DM | `text` hasta 200 caracteres, `limit=1..100` (50) | 200 `{ok:true,entries}` |
-| GET `/libraries/:kind/:id` | DM | UUID | 200 `{ok:true,entry}`; ausente 404 |
-| POST `/libraries/:kind` | DM | `{entry:SaveInput}` sin `id` | 201 `{ok:true,entry}` |
-| PUT `/libraries/:kind/:id` | DM | `{entry:SaveInput}` sin `id` | 200 `{ok:true,entry}`; ausente 404 |
-
-Queries desconocidas/repetidas son 400; cuerpos de DTO admiten solo los campos declarados. Los métodos no soportados en rutas existentes son 405. `:kind` admite únicamente `monsters`, `npcs`, `player-characters`. Los UUID de recursos son generados en servidor; no se aceptan nombres de archivo, propietarios ni rutas de destino. IDs de plantillas existentes son `[a-zA-Z0-9_-]{1,128}` y pueden ser elegidos por el editor, conservando el contrato local. Built-ins no pueden guardarse ni eliminarse.
-
-Tipos compartidos de respuesta: `src/shared/contracts/http-api.ts`. Tipos de escena/biblioteca/plantillas: los contratos de dominio reexportados por `src/shared/api/`. Esquemas estrictos de entrada HTTP: `src/server/schemas.ts`.
-
-- `SceneSummary = {id,name,createdAt,updatedAt}`; nombre 1–200 caracteres tras trim, fechas ISO UTC. Lista por updatedAt descendente e ID ascendente.
-- `SceneResource = {...SceneSummary,scene:SceneDocumentV2,warnings,missingImages}`. Warnings `{code:"scene-format-outdated"|"external-link-unresolved",message}`. `missingImages = [{reference,locations:string[]}]`, lugares `maps/<mapId>/map`, `maps/<mapId>/tokens/<tokenId>` y `sceneAside/<monsters|npcs|playerCharacters>/<id>`.
-- `AssetDto = {id,reference:"asset:<UUID>",url:"/api/v1/assets/<UUID>",mimeType,byteLength}`. Guardar `reference` en `imagePath`, usar `url` para mostrar. No guardar el origen público como parte del documento.
-- `MonsterTemplate` contiene `id,name,system,markdown,css,builtIn:false,updatedAt` (ISO válido). El servidor reemplaza updatedAt. Nombre/sistema 1–200 caracteres, markdown hasta 1 000 000, CSS hasta 200 000.
-- `monsters` SaveInput: `name,system,contentMarkdown` obligatorios, `templateId?,imagePath?` opcionales y nullable. Nombre/sistema hasta 200, markdown hasta 1 000 000.
-- `npcs`: `name` obligatorio, `imagePath?,notes?` opcionales.
-- `player-characters`: `characterName` obligatorio; opcionales `playerName,level,species,classes,imagePath,stats,initiative,armorClass,passivePerception,hitPoints,spellSaveDc,speeds,notes`. stats acepta seis strings opcionales (`strength,constitution,dexterity,intelligence,wisdom,charisma`). Campos breves hasta 200, notes hasta 1 000 000, imagePath hasta 2048 y nullable. armorClass vacío, número o dos números separados por `/`. No se aceptan `id`, `createdAt`, `updatedAt` en SaveInput. Respuesta usa el Entry de dominio completo con metadatos de servidor.
+| `TTRPG_HOST`, `TTRPG_PORT` | Listener; defaults127.0.0.1 y8787. |
+| `TTRPG_PUBLIC_ORIGIN` | Origen raíz exacto; HTTPS fuera de loopback. |
+| `TTRPG_WEB_DIR` | Build web absoluto/físico. Nunca raíz del proyecto. |
+| `TTRPG_AUTH_SECRET` | Aleatorio base64url de al menos32bytes, privado y persistente. |
+| `TTRPG_DB_DRIVER`, `TTRPG_DEPLOYMENT` | SQLite/local o PostgreSQL; production exige PostgreSQL. |
+| `TTRPG_DATA_DIR` | Solo SQLite: directorio absoluto privado; `control.sqlite`. |
+| `TTRPG_DATABASE_URL`, `TTRPG_DB_TLS`, `TTRPG_DB_CA_FILE` | PostgreSQL con TLS verify-full/CA en producción. Assets en bytea; sin SQLite auxiliar. |
 
-## Imágenes e importación
+`TTRPG_IDENTITY_ENABLED` ya no selecciona acceso legado: ausente/true usan cuentas obligatorias; false u otro valor aborta antes de escuchar. `TTRPG_DM_KEY` y `TTRPG_PLAYER_KEY` antiguos no autorizan y setup no los genera. Sus valores existentes no se reemplazan inadvertidamente.
 
-Importar JSON no lee archivos ni hace fetch: referencias absolutas, relativas y URLs quedan ausentes. Enlaces legacy se conservan con advertencia y no se siguen. Se normaliza con el esquema/migración existente y se rechazan escenas sin mapas y versiones futuras. Se preservan IDs de mapas/objetos, geometría, calibración, contenido privado y mapas inactivos. La versión del formato continúa siendo 2.
+## Familias de autoridad
 
-Recuperación para 003: subir bytes a POST `/assets`, sustituir las referencias afectadas en la escena cliente (usar las reglas de sustitución de mapas existentes para preservar geometría/IDs), guardar PUT y releer. `missingImages` desaparece para esas referencias; resolve devuelve URL. Una referencia a un asset ausente no invalida toda la escena. Exportar no incrusta imágenes ni transfiere assets: Electron puede abrir el JSON y necesitar sustitución de referencias `asset:` por archivos locales.
-
-PNG/JPEG/WebP se verifican por firma y estructura, no extensión. PNG: CRC de cada chunk, IHDR, IEND, dimensiones, descompresión zlib acotada y scanlines; solo no entrelazado. JPEG: segmentos delimitados, frame de 8 bits, tablas, scan y fin exacto. WebP: contenedor RIFF, tamaños/chunks/frame/dimensiones; solo estático. Máximo 40 millones de píxeles y 160 MiB de scanlines PNG. Después de validar el contenedor, sharp 0.35.5 decodifica el frame completo (también VP8/VP8L) a RGBA y falla ante avisos/errores/truncamientos. Se descarta ese resultado y se guardan los bytes originales: no se recodifica ni eliminan metadatos. No basta leer metadata para confirmar un asset. SVG/HTML, formato no soportado, MIME discordante, corrupción detectada y truncamiento se rechazan con 415/422. JPEG/WebP de prueba son imágenes reales propias. PNG entrelazado y WebP animado requieren conversión por el operador antes de subirlos; devuelven 415 `UNSUPPORTED_IMAGE_VARIANT` con una instrucción de conversión, sin afirmar que el archivo está dañado.
-
-La dependencia nativa sharp se añadió para cerrar el caso de un WebP de 26 bytes cuyo contenedor parecía válido pero carecía de píxeles decodificables. Solo se importa desde infraestructura del servidor; no se incorpora al renderer/preload. En macOS arm64 de esta verificación, libvips ocupa aproximadamente 17 MiB y el binding nativo 300 KiB, más el paquete JavaScript y dependencias. Instalar con `pnpm install --frozen-lockfile` en la plataforma/arquitectura del servicio; no copiar node_modules entre arquitecturas. Se usan `failOn: "warning"`, `limitInputPixels`, `limitInputChannels` y `timeout` según la [documentación oficial del constructor](https://sharp.pixelplumbing.com/api-constructor/) y [timeout](https://sharp.pixelplumbing.com/api-output/#timeout). El límite temporal comienza al procesar en libvips; no incluye espera por el hilo de libuv, acotada por la cuota de solicitudes.
-
-La autorización de mesa y assets está en `src/server/table-http.ts` y `src/server/http.ts`: el jugador solo resuelve o descarga referencias del conjunto reconstruido por `publicTableProjection`. `SceneService.resolve` por sí mismo no concede autorización. Escenas completas, bibliotecas y sus missingImages permanecen exclusivas del DM.
-
-## Persistencia y operación
-
-`ServiceStore` mantiene `service.sqlite` (escenas, assets como BLOB y plantillas), `monsters.sqlite` y `entities.sqlite` (repositorios existentes con migraciones independientes). Cada recurso/catalogación se confirma mediante una sentencia atómica SQLite; los bytes de asset solo se insertan después de validación. WAL y serialización síncrona impiden JSON parcial y pérdidas de catálogo por carreras. PUT aplica última escritura confirmada, sin control optimista de revisión. No hay una transacción entre recursos distintos ni colaboración multi-DM. Borrar una escena no borra assets compartidos; no hay limpieza automática de assets.
-
-`service.lock` excluye instancias simultáneas. Se rechazan symlinks/hardlinks en bases y sidecars al arrancar y rutas de datos con ancestros enlazados; el directorio debe ser privado del usuario del servicio (recién creado usa 0700). No hay endpoints de filesystem ni nombres de archivo derivados de clientes. Un administrador local con escritura al directorio durante ejecución está fuera del aislamiento de red: no permitir procesos ajenos allí. El bloqueo se retira al cerrar por SIGINT/SIGTERM. Tras un cierre forzado, comprobar que no existe proceso vivo y retirar únicamente `service.lock` antes de reiniciar; SQLite recupera WAL. No borrar las bases ni sidecars.
-
-Para backup consistente, detener el servicio y copiar las tres bases y sus sidecars presentes como una unidad; guardar las claves aparte. Restaurar con el servicio detenido y permisos privados. Las sesiones no se respaldan. No se migran ni modifican datos personales Electron. Las lecturas de escenas validan el sobre, UUID, nombre, fechas y su coherencia con las columnas del catálogo, además del documento con el parser/migración vigente y la regla de mapas. Versiones futuras, JSON inválido y sobres inconsistentes devuelven 500 `STORAGE_CORRUPT`, sin exportarse ni sobrescribirse mediante PUT. Solo se aplican las migraciones existentes en memoria, con advertencia. Las plantillas guardadas se revalidan por esquema, identidad, fechas y protección de built-ins; una biblioteca corrupta no se convierte en array vacío y bloquea guardados parciales. El operador puede restaurar una copia válida; otros recursos sanos continúan accesibles. Los demás errores internos devuelven 500 genérico. Al cerrar se liberan sockets/bases.
-
-Verificación: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`. Las pruebas HTTP usan puertos efímeros, directorios temporales y credenciales ficticias; cubren reinicio, roles, límites, fallo SQLite, symlinks, exportación y uploads interrumpidos.
-
-## Cliente y estáticos (3.4.0)
-
-`TTRPG_WEB_DIR` opcional permite servir `out/web`. GET/HEAD confinados al build, CSP sin evaluación dinámica y fallback solo navegación HTML sin extensión; no se aplica a `/api/v1`, archivos ocultos ni assets ausentes. Guía de desarrollo/producción: [cliente navegador](browser-client.md).
-
-Enlaces, todos exclusivos del DM y con esquema estricto:
-
-| Método/ruta | Payload/resultado |
+| Rutas | Autoridad y documentación |
 | --- | --- |
-| GET `/api/v1/scenes/:id/links/candidates` | `{ok,candidate:{filePath,markers}}`; ID UUID en ruta |
-| POST `/api/v1/scene-links/connect` | `{sourceScenePath,sourceMarkerId,targetScenePath,targetMarkerId}` → `{ok,mapAnnotations}` |
-| POST `/api/v1/scene-links/disconnect` | `{scenePath,markerId}` → `{ok,mapAnnotations,warning?}` |
-| POST `/api/v1/scene-links/validate` | `{scenePath,markers}` → `{ok,statuses}` |
-| POST `/api/v1/scene-links/navigate` | `{scenePath,markerId}` → `{ok,resource,entryPoint}` |
-
-Los campos `scenePath` son referencias `scene:UUID`, no rutas. El servidor rechaza IDs ambiguos/bloqueados, revalida reciprocidad y actualiza extremos en transacción, acumulando cambios si el destino anterior y el nuevo pertenecen a la misma escena. Reparar un destino ausente conserva un aviso explícito si ese extremo anterior no pudo actualizarse. La desconexión de un destino ausente limpia el extremo local con aviso; nunca afirma reparación del remoto ausente. Las imágenes Markdown de notas se incluyen en `missingImages`.
-
-El endpoint de conexión entre escenas rechaza marcadores que aún tienen un enlace interno (`peer.mapId`). El cliente exige **Desligar** antes de cambiar de modalidad y solo aplica la desconexión interna cuando el guardado tiene éxito; el dominio rechaza sobrescribir un enlace remoto con uno interno. Esto conserva ambos extremos si la transición se rechaza o falla.
-
-## Mesa privada (3.5.0)
-
-La [mesa sincronizada](synchronized-table.md) completa `/table/*` y `/dice/*`, SSE, presencia e idempotencia. Assets GET/HEAD y resolve aceptan sesión jugador exclusivamente para referencias del conjunto público vigente; no exponen escenas ni bibliotecas privadas.
-
-Guía operativa completa de producción, Electron servicio, HTTPS y respaldo: [Operar el servicio](service-operations.md).
-
-## Identidad de cuentas optativa (007)
-
-La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.
+| `/api/v1/health` | Salud con versión del manifiesto. |
+| `/api/v1/identity/*` | Cuenta/cambio de contraseña/admin DM: [identidad](identity.md). |
+| `/api/v1/admin/systems/*` | Administrador de catálogo, sin acceso DM: [datos privados](owned-data.md). |
+| `/api/v1/dm/{games,scenes,assets,libraries,scene-links,systems}/*` | DM propietario, revisiones y bindings: [datos privados](owned-data.md). |
+| `/api/v1/dm/definitions/{scenes,monsters}/:id` GET | Presentaciones de los bindings de una instancia propia retenida. No admite referencias arbitrarias, no consulta otra cuenta ni reemplaza ID privado por built-in. |
+| `/api/v1/dm/games/:gameId/{opening,invitation}/*` | Apertura/invitación: [invitaciones](invitations.md). |
+| `/api/v1/games/:gameId/{admission,guest/session,guest/leave}` | Invitado por cookie de path, independiente de cuentaDM. |
+| `/api/v1/{dm/}games/:gameId/{table,dice,participants,assets}/*` | Audiencias separadas, SSE contextual, moderación: [protocolo](moderation.md). |
 
-## Backend privado008
+Las rutas globales antiguas `/auth/*`, `/scenes`, `/assets`, `/libraries`, `/monster-templates`, `/table/*`, `/dice/*` bajo `/api/v1` devuelven404 sin datos. Cookie `ttrpg_session` y query `?view=player` no otorgan acceso. `/api/*` jamás cae al shell HTML.
 
-Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
+Host y Origin exactos; mutaciones requieren Origin. Sin CORS, contenido remoto ni confianza en X-Forwarded-For. Cookies HttpOnly/SameSite Strict y Secure con HTTPS. Respuestas no-store/no-referrer, CSP restrictiva y estáticos confinados a build físico sin symlinks. No se sirven env, respaldos ni `.local`.
 
-## Familia contextual010
+General600solicitudes/minuto/IP,10000entradas,100conexiones,100requests/socket, cabeceras16KiB/10s, cuerpo30s y keep-alive5s. JSON10MiB, imagen20MiB/40millones píxeles; validación de imagen acotada. Cuotas específicas de login/admisión/runtime y reservaDM se describen en sus guías.429 conserva Retry-After. No hay autorización por capacidades UI ni caché de otra cuenta.
 
-La composición optativa de cuentas007–010 entrega [moderación, HTTP/SSE por partida y assets contextuales](moderation.md). Usa las cookies/autoridades propias de cada namespace y exclusión de proceso; las credenciales nuevas siguen sin autorizar la mesa global. La pantalla y el corte integrado pertenecen a011.
+Un runtime por base; exclusión antes del listener. Pérdida de lock termina accesos y falla cerrada. Reinicio conserva datos/sesiones/plazos, vacía proyección/dados y no reabre partidas. [Operación, migración y restauración](service-operations.md).
diff --git a/docs/service-operations.md b/docs/service-operations.md
index 581aef4..4ca5e75 100644
--- a/docs/service-operations.md
+++ b/docs/service-operations.md
@@ -1,156 +1,71 @@
-# Operar el servicio y conectar Electron — 3.8.0
+# Operación del servicio de cuentas
 
-Electron arranca **local** por defecto. El modo **service** carga exactamente el cliente web y guarda en el servicio indicado por el título de ventana; no abre la biblioteca ni los archivos del perfil local. No inicia un servidor. El formato `.ttrpgscene` continúa en v2, con migración de v1.
+## Preparación local
 
-La [infraestructura multi-DB y catálogo](database.md) añade `control.sqlite` local y PostgreSQL para migraciones/pruebas. La API descrita aquí sigue usando almacenamiento legado: solo admite `TTRPG_DEPLOYMENT=local` y `TTRPG_DB_DRIVER=sqlite` (defaults). Declarar production/postgres falla antes de arrancar; no hay aún servicio completo PostgreSQL.
+Usa Node24 y pnpm desde la raíz física del proyecto:
 
-## Instalar, construir y ejecutar
-
-Requiere Node.js **24**, pnpm y, para Electron, un escritorio compatible. Desde la raíz del proyecto:
-
-```sh
+```bash
 pnpm install --frozen-lockfile
+pnpm setup:env
 pnpm build:api
 pnpm build:web
-pnpm build
-```
-
-Las salidas independientes son `out/api` (entry `index.mjs`, comando `db-migrate.mjs` y chunks compartidos), `out/web`, y `out/main` + `out/preload` + `out/renderer`. Ningún build borra los otros. El empaquetado Electron solo incluye sus tres directorios; no incorpora el build API/web, datos ni configuración. No hace falta empaquetar para ejecutar el main compilado. En un servidor sin escritorio bastan los dos primeros builds, package.json y dependencias de producción instaladas en la arquitectura destino; sharp contiene binarios nativos. No trasladar node_modules entre arquitecturas.
-
-Prepara una vez la configuración privada con el script Bash:
-
-```sh
-pnpm setup:env
-```
-
-Crea `.env` para la API y `.env.electron` para el cliente, ambos con permisos **0600**, y un directorio de datos **0700** bajo `~/.local/share/ttrpg-effects-service`. Guarda rutas absolutas reales y genera dos claves aleatorias diferentes, que permanecen entre arranques. No imprime claves ni sobrescribe archivos existentes; rechaza enlaces simbólicos. Puedes seleccionar otro directorio al prepararlo por primera vez con `TTRPG_DATA_DIR=/ruta/privada/mesa pnpm setup:env`.
-
-Los archivos privados están ignorados por Git y excluidos del empaquetado. Las plantillas `.env.example` y `.env.electron.example` documentan las variables sin secretos. Consulta las claves DM/jugador en tu `.env` privado para iniciar sesión; no las copies a `.env.electron`, `VITE_*` ni URLs.
-
-Después basta arrancar la API desde la raíz del proyecto:
-
-```sh
+pnpm db:migrate
+pnpm identity:bootstrap
+pnpm identity:password
+pnpm identity:provision-dm
 pnpm start:api
 ```
 
-Abre `http://127.0.0.1:8787`. En otra terminal, conecta Electron:
+Las herramientas de identidad solicitan contraseñas en TTY oculto y confirmación. No usar contraseñas en argv, pipes, variables de provisión, screenshots o logs. Bootstrap crea el único administrador inicial con cambio obligatorio; no ejecutarlo en cada arranque. Admin y DM son cuentas diferentes. El servicio no crea usuarios ni asigna contenido al primer login.
 
-```sh
-pnpm start:service
-```
+Setup crea `.env`/`.env.electron` con0600 y `.local/service/{data,backups,logs}` con0700. Usa rutas absolutas derivadas de la raíz, incluso con espacios. `/.local/` y los env privados están ignorados y excluidos de bundles/DMG. SQLite usa `control.sqlite` dentro de data; PostgreSQL guarda también assets en su base y no necesita dataDir ni una copia local de bytes. Setup rechaza symlinks y conserva archivos/secretos existentes. Una instalación antigua incompleta da diagnóstico, sin activarla silenciosamente.
 
-Node carga `.env` para la API y únicamente `.env.electron` para el comando Electron. El entorno explícito del proceso tiene precedencia sobre el archivo. Los archivos son opcionales si ya proporcionas variables desde el entorno; no se ejecutan como Bash ni expanden `$HOME`/`$PWD`. Cambiar la configuración requiere reiniciar el proceso.
-
-En `.env.electron`, `TTRPG_ELECTRON_MODE=service` selecciona servicio y `TTRPG_SERVICE_URL=http://127.0.0.1:8787` define el destino. Cambia el modo a `local` para usar almacenamiento local mediante el mismo comando. Sin archivo ni variables, Electron conserva su valor predeterminado local. `pnpm dev` sigue siendo el desarrollo local tradicional y no carga `.env.electron`; `pnpm dev:service` sí lo carga. El DMG instalado no busca estos archivos del repositorio: esta carga pertenece a los comandos pnpm.
-
-En modo servicio, `start:service` ejecuta Electron y carga el build web de la API, no `out/renderer`. La sesión Electron es efímera: recargar conserva la cookie y cerrar la aplicación exige un nuevo acceso. No comparte cookies con Electron local, navegador ni otro proceso Electron servicio. Para proyectar, publica y copia el **Enlace jugador** de Mesa a un navegador/perfil independiente; allí accede con clave Jugador. `Abrir enlace` se bloquea en Electron por la política de ventanas; el campo Enlace jugador permanece visible y seleccionable. La política de permisos puede impedir el botón Copiar: en ese caso aparece «Selecciona el enlace y cópialo manualmente»; selecciona el campo y usa Cmd/Ctrl+C o Editar → Copiar. La URL por sí sola no cambia el rol de una cookie DM.
-
-Si cierras la ventana o sales de Electron con cambios pendientes, aparece una confirmación nativa: **Seguir editando** conserva el borrador para que puedas guardarlo; **Descartar y salir** cierra perdiendo esos cambios. Escape cancela la salida. Sin cambios pendientes, la aplicación cierra normalmente.
-
-Desarrollo API/web: `TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:5175 pnpm dev:api` con el resto de variables en `.env`; en otra terminal `pnpm dev:web`. Este Vite usa puerto 5175 y proxy hacia API 8787. Para probar Electron sobre ese frontend: `TTRPG_SERVICE_URL=http://127.0.0.1:5175 pnpm dev:service`. Modo servicio tiene precedencia sobre `ELECTRON_RENDERER_URL`. Para desarrollo Electron local, usa `pnpm dev` sin `TTRPG_ELECTRON_MODE`; no necesita servicio ni claves.
-
-## Variables
-
-| Variable | Obligatoria / valor por defecto |
-| --- | --- |
-| `TTRPG_HOST` | API: `127.0.0.1`; conservar bind privado tras proxy. |
-| `TTRPG_PORT` | API: `8787`; entero 0–65535, 0 para pruebas. |
-| `TTRPG_DATA_DIR` | API: obligatoria, absoluta, física y exclusiva, sin enlaces simbólicos. |
-| `TTRPG_WEB_DIR` | API: opcional, absoluta al build web. Para esta entrega full stack, establecerla; si falta index.html el arranque falla. Sin variable la API sirve solo HTTP/API. |
-| `TTRPG_PUBLIC_ORIGIN` | API: obligatoria, origen exacto sin barra final, ruta, query ni credenciales. HTTPS fuera de localhost/127.0.0.1/::1. |
-| `TTRPG_DM_KEY`, `TTRPG_PLAYER_KEY` | API: obligatorias, distintas, aleatorias, 32–1024 caracteres; sin defaults. |
-| `TTRPG_ELECTRON_MODE` | Electron: `local` por defecto o `service` explícito; un valor desconocido falla sin fallback. |
-| `TTRPG_SERVICE_URL` | Electron service: obligatoria; origen raíz HTTP(S), sin credenciales/query/fragmento. HTTPS excepto localhost exacto e IP loopback (127/8, ::1). Se normaliza esquema/host/puerto. |
-| `ELECTRON_RENDERER_URL` | Interna de electron-vite en desarrollo local; solo renderer loopback aprobado. No selecciona modo servicio. |
-
-No se desactiva validación TLS. Los permisos de cámara, micrófono, geolocalización y notificaciones, popups y webviews están bloqueados. Las ventanas de servicio no tienen preload, Node ni IPC; importar archivos requiere el selector web explícito y exportar utiliza descargas normales. El menú servicio conserva edición/ventana/salida y reintento de conexión únicamente en recuperación; no hay recientes ni gestores locales.
-
-## HTTPS y proxy
-
-Para LAN/remoto necesitas un nombre y certificado HTTPS confiable por los clientes. Ejemplo Nginx orientativo (no desplegado aquí), origen `https://mesa.example`, API enlazada a 127.0.0.1:8787 y `TTRPG_PUBLIC_ORIGIN=https://mesa.example`:
-
-```nginx
-server {
-    listen 443 ssl;
-    server_name mesa.example;
-    ssl_certificate /ruta/privada/fullchain.pem;
-    ssl_certificate_key /ruta/privada/privkey.pem;
-    client_max_body_size 21m;
-    location / {
-        proxy_pass http://127.0.0.1:8787;
-        proxy_http_version 1.1;
-        proxy_set_header Host mesa.example;
-        proxy_set_header Origin $http_origin;
-        proxy_set_header Connection "";
-        proxy_buffering off;
-        proxy_cache off;
-        proxy_read_timeout 3600s;
-        proxy_send_timeout 60s;
-    }
-}
-```
+`pnpm start:api` carga `.env`; el entorno explícito prevalece. Conserva `TTRPG_AUTH_SECRET` en reinicios ordinarios. Ausencia del secreto/migraciones falla antes de servir. Retira `TTRPG_IDENTITY_ENABLED=false`; las claves globales antiguas nunca autorizan. Antes de modificar configuración existente, crea respaldo privado y conserva sus valores originales.
 
-Con puerto público no estándar conserva también ese puerto en Host y origen. El backend no confía en Forwarded/X-Forwarded-*; no deriva HTTPS de esas cabeceras. Las cuotas usan la IP del par inmediato y los clientes detrás del proxy comparten cuota. No se necesita CORS: API/web comparten origen. No habilitar CORS comodín, omitir TLS ni poner claves en URL. SSE requiere buffering desactivado y timeout largo. Las cookies Secure derivan del origen configurado.
+## Navegador y Electron
 
-## Sesiones, claves y almacenamiento
+Abre el origen de la API en navegador. `pnpm build` prepara Electron y `pnpm start:service` carga `.env.electron`, que solo contiene modo y URL raíz. La ventana servicio no tiene preload, Node ni puente IPC. Usa partición efímera: reload mantiene cookies; cerrar exige autenticar/admitir otra vez. Un enlace completo puede pegarse en la pantalla de acceso mediante «Entrar con invitación de jugador», siempre del mismo origen.
 
-Los párrafos de claves/globales de esta sección describen el acceso legado. Las sesiones de cuentas007 sí persisten tras reinicio y se revocan al rotar TTRPG_AUTH_SECRET; su provisión, recuperación y respaldo completo están en [identidad](identity.md). No aplicar a esas cuentas la afirmación de sesiones exclusivamente en memoria.
+Para Electron autónomo, usa `pnpm dev` sin modo service o ejecuta la app con `TTRPG_ELECTRON_MODE=local`. No depende de cuenta, DB remota ni servicio; conserva archivos, bibliotecas, plantillas y PlayerIPC. No se migra su perfil por iniciar servicio.
 
-Login establece cookie HttpOnly/SameSite=Strict limitada a `/api/v1`, Secure con HTTPS. La sesión vence absolutamente a ocho horas. Logout la revoca; un fallo de red conserva el estado con error, sin afirmar que la revocación ocurrió. Reautenticar DM recupera cambios en memoria tras expiración; cambiar de rol exige descartarlos. Una recarga no recupera trabajo sin guardar.
+Si falla conexión/certificado: Reintentar/Salir; no ignorar TLS. El cierre con borrador pide Seguir editando/Descartar y salir; Escape conserva trabajo. Copy puede estar restringido: selecciona el enlace y usa Editar→Copiar. [Recorridos de interfaz](browser-client.md).
 
-Para rotar claves, detener limpiamente la API, cambiar ambas en la configuración privada y arrancar. El reinicio invalida **todas** las sesiones, publicación, presencia y dados, que viven en memoria. No existe recarga dinámica de variables ni revocación retroactiva de bytes descargados. Los jugadores deben acceder otra vez y el DM volver a publicar.
+## Producción PostgreSQL y red
 
-`TTRPG_DATA_DIR` contiene `service.sqlite` (escenas, imágenes BLOB, plantillas y metadatos), `monsters.sqlite`, `entities.sqlite` y sus sidecars SQLite mientras existan. No hay carpeta separada de assets: están en service.sqlite. `service.lock` evita otra instancia. Si se ejecutó `db:migrate` local, el directorio también contiene `control.sqlite` y sus sidecars, con exclusión independiente `control.lock`; incluirlos en el respaldo completo. Directorio 0700 y configuración 0600; no compartir escritura con otros procesos. El perfil Electron local es independiente y no se migra. Reiniciar conserva recursos guardados, no estado de mesa ni borradores clientes.
+`TTRPG_DEPLOYMENT=production`, `TTRPG_DB_DRIVER=postgres`, URL privada, `TTRPG_DB_TLS=verify-full` y CA absoluta. No fallback, downgrade ni SQLite auxiliar. Un proceso por base: otro runtime falla antes de escuchar. Configura origenHTTPS exacto y proxy con Host/Origin conservados, bufferingSSE desactivado y timeouts largos. El servicio no confía en X-Forwarded-*; la cuota porIP ve el par del proxy. No agregar CORS comodín ni secretos VITE. [Persistencia](database.md) y [cuotas/contexto](moderation.md).
 
-## Backup y restauración
+## Adopción explícita del legado
 
-1. Detén limpiamente el proceso API con SIGTERM o Ctrl+C y espera su salida; debe retirar `service.lock`. No copies solo SQLite mientras está ejecutándose.
-2. Respalda **todo** el directorio, incluidas las tres bases y cualquier WAL/SHM presente, como unidad. Guarda separadamente y con permisos privados la configuración, versión de aplicación y claves. Un respaldo de claves es secreto.
-3. Extrae a un directorio nuevo físico y privado, sin sobrescribir la biblioteca personal. Con el servicio detenido, configura ese directorio absoluto y el origen/puerto correcto. Inicia la misma versión antes de cualquier actualización.
-4. Accede de nuevo como DM y comprueba escena, imágenes y biblioteca. No esperes recuperar sesiones o proyección; publica otra vez.
+Conserva el binario/configuración anterior y su fuente. Detén escritores solo al corte. Usa los comandos existentes de [transferencia](owned-data.md): `pnpm data backup-legacy`, `export-legacy`, `inspect`, `import`, `verify`, `export-owned` y `restore-legacy`, con las opciones allí documentadas. Backup de legado incluye tres bases y sidecars presentes como unidad; configuración se respalda aparte.
 
-Ejemplo con API ya detenida y variables del operador:
+Importar exige DM propietario real explícito; el administrador no es propietario válido. El mapa de propietarios debe usar IDs verificados, completo e inyectivo. No inferir por nombre/email ni leer perfil Electron. Destino nuevo separado de la fuente; conservar la fuente tras verificar. Si falta propietario o referencia, mantener el legado preservado y registrar pendiente. Paquete funcional v3 transporta catálogo/hash/bindings y contenido, no cuentas/sesiones/aperturas. `.ttrpgscene`v2 sigue portable, con lectura/migraciónv1 y sin autoridad ni catálogo incorporado.
 
-```sh
-umask 077
-tar -C "$TTRPG_DATA_DIR" -czf /ruta/privada/respaldo-mesa.tar.gz .
-mkdir -m 700 /ruta/fisica/privada/mesa-restaurada
-tar -C /ruta/fisica/privada/mesa-restaurada -xzf /ruta/privada/respaldo-mesa.tar.gz
-TTRPG_DATA_DIR=/ruta/fisica/privada/mesa-restaurada pnpm start:api
-```
-
-Si hubo muerte forzada y queda lock, confirma primero que no existe proceso vivo; retira únicamente `service.lock`, conserva bases y sidecars para recuperación SQLite. Ante corrupción recupera un respaldo válido. No borres sidecars para forzar apertura.
+## Respaldo integral y restauración
 
-## Escenas y errores recuperables
+El respaldo integral contiene cuentas/hashes/sesiones: trátalo como secreto0600, directorios0700. No confundirlo con exportación funcional. Conserva fuente y respaldo; nunca `--clean` sobre datos operativos ni sobrescritura de una fuente que recibió cambios.
 
-Importar `.ttrpgscene` v1 migra en memoria a v2 y conserva mapas, IDs y geometría. Exportar descarga JSON explícitamente; no incluye bytes de imagen. Las rutas de archivos locales ausentes se informan y pueden reemplazarse mediante upload; nunca se leen implícitamente en el servidor. `asset:UUID` y `scene:UUID` pertenecen a esta instancia: trasladar solo JSON no traslada imágenes ni destinos de enlaces. Para mover la instancia entera usa backup/restore; para intercambio parcial reemplaza imágenes y repara enlaces explícitamente.
+SQLite: detén API, copia `control.sqlite` y todos sus sidecars presentes a un destino nuevo privado. No copiar en caliente una base SQLite. Verifica inventario, esquema, conteos, hashes, relaciones y cuentas antes de servir. El árbol de datos legados es una unidad aparte.
 
-- Conexión inicial rechazada, DNS o certificado: Electron muestra destino y Reintentar/Salir, utilizables con Tab/Enter; arregla servicio/certificado antes de reintentar. No hay fallback con privilegios.
-- Caída de API/SSE durante edición: conserva cambios y muestra reconexión; evita recargar. Vuelve a guardar cuando el servicio responda. Si reinició, accede de nuevo y publica.
-- 403 origen/cookies: comprueba coincidencia exacta de Host, Origin, esquema y puerto y contexto de navegador independiente por rol. No abrir index.html directamente como file.
-- Almacenamiento: comprueba directorio absoluto/físico, permisos privados y exclusividad del lock. Los errores de arranque se muestran en stdout/stderr sin claves, SQL ni rutas privadas.
-- Imagen ausente: reemplaza la referencia desde el mapa/ficha/nota; un JSON importado no concede acceso al disco. Una imagen de jugador requiere estar en la publicación vigente.
-- Diagnóstico frontend: consola/red de herramientas de desarrollo. No compartas cabeceras Cookie, claves ni cuerpos de escena privados en reportes.
+PostgreSQL: usa clientes oficiales pg_dump/pg_restore compatibles con versión del servidor. Configura PGHOST/PGPORT/PGUSER/PGDATABASE/PGSSLMODE=verify-full/PGSSLROOTCERT y PGPASSFILE0600 en entorno privado; no contraseña en argv ni salida. Ejemplo con destinos nuevos:
 
-## Matriz final
-
-| Cliente | Roles y persistencia | Evidencia y límites |
-| --- | --- | --- |
-| Electron local | DM + Player IPC; escenas/recientes/bibliotecas locales | Flujos previos 001–004 conservados; protección de navegación y humo de esta entrega en build 005. |
-| Navegador | DM privado + jugador filtrado, HTTP/SSE; almacenamiento API | Suites y humo real 003/004: mapa, guardar/cargar/importar/exportar, cámaras, puntero/áreas y dados públicos/ocultos, sesiones/reconexión. No se repite exhaustivamente cada herramienta. |
-| Electron servicio | Mismo frontend/API con rol servidor, sin bridge; publicación a jugador de otro contexto | Configuración, aislamiento y fronteras reales, recuperación y roles documentados en build 005. |
-| Producción API/web | Node 24 sin Electron/dev server; recursos persistentes y mesa efímera | Reinicio y backup/restore temporal con escena/imagen/biblioteca; ver atribución y comandos en build 005. |
+```bash
+pg_dump --format=custom --file /ruta/privada/respaldo.dump
+pg_restore --no-owner --no-privileges --exit-on-error --dbname destino_nuevo /ruta/privada/respaldo.dump
+```
 
-El detalle reproducible y los límites concretos están en [build 005](../factory/jobs/005-electron-servicio/build.md). No se certifican distribución firmada, despliegue remoto, proyector físico ni una prueba manual de todas las combinaciones de herramientas.
+No copies el directorio del motor. Restaura primero aislado, compara esquema/conteos/hashes/relaciones y prueba accesoA/B por API. Mantén el origen y backup hasta completar verificación.
 
-## Identidad de cuentas optativa (007)
+Antes de escuchar con una restauración antigua:
 
-La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.
+1. Apunta la configuración solo al destino nuevo restaurado, con API detenida.
+2. Ejecuta `pnpm invitations:invalidate`: cierra aperturas y revoca participantes/credenciales.
+3. Rota explícitamente `TTRPG_AUTH_SECRET` con un secreto aleatorio nuevo. Abrir identidad revoca persistentemente sesiones anteriores antes del listener.
+4. Comprueba rechazo de cookies antiguas, acceso nuevo de cuentas y aislamiento de datos. Si falla cualquier paso, no sirvas ese destino.
 
-## Backend privado008
+Ambos pasos son repetibles y conservan contenido/cuentas. Esta rotación deliberada de restore no se hace en setup ni reinicio ordinario. Los contratos finales incluyen roundtripSQLite y pg_dump/pg_restore reales conTLS, cookies antiguas rechazadas y bytes/propietarios conservados.
 
-Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
+## Corte y retorno
 
-## Operación del backend contextual010
+Anota hora de corte y escrituras posteriores. Tras aceptación técnica, integra los cambios autorizados y genera el DMG con `./scripts/build-dmg.sh`; versión solo de package.json. El cierre operativo concreto se registra por el orquestador. Durante construcción se usan fixtures; no detener servicios personales para pruebas.
 
-Consultar [moderación y exclusión de proceso](moderation.md) antes de componer `openModerationBackend`. La conexión PostgreSQL dedicada conserva el advisory lock783496103; perderla deja el emisor indisponible y termina sus streams. Solo un proceso por base, sin takeover por timeout. Migración6 es explícita; restaurar un backup requiere invalidar acceso009 antes de escuchar. Reinicio crea transporte vacío y nuevo epoch, conserva plazos y exige republicaciónDM. El guard de `start:api` legado se conserva hasta011.
+Si falla destino: detenlo, conserva sus datos y regresa a copia nueva verificada de fuente/configuración/binario anteriores. No hay sincronización bidireccional ni fallback automático. El binario anterior también trae su modelo de acceso antiguo: el retorno es decisión explícita del operador. Verifica salud/version/HTML y recorrido autenticado después de cada corte.
diff --git a/docs/synchronized-table.md b/docs/synchronized-table.md
index 318a892..ab33d15 100644
--- a/docs/synchronized-table.md
+++ b/docs/synchronized-table.md
@@ -1,12 +1,12 @@
 # Mesa sincronizada privada — 3.5.0
 
-La API administra una proyección efímera por instancia. El mismo VTT React/Pixi y el replay de dados funcionan en DM y Player. Las escenas y assets guardados conservan la persistencia anterior; reiniciar la API cambia la época y vacía mesa, cámaras, conexiones y dados hasta que el DM publique otra vez. Electron local conserva IPC; Electron remoto pertenece a la entrega 005.
+La API administra una proyección efímera por partida/apertura. El VTTReact/Pixi y dados son comunes a los clientes. Reinicio conserva guardados, sesiones y plazos, pero vacía estado visual hasta publicación explícita. Electron local conservaIPC.
 
 ## Conectar jugadores
 
-El DM abre la proyección desde el control existente y consulta **Mesa compartida** abajo a la izquierda. En Player, Cerrar sesión, brújula y Mesa ocupan filas separadas arriba a la derecha; el indicador de escala permanece abajo a la izquierda. El enlace seleccionable y las acciones copiar/abrir usan el origen público, sin claves ni tokens. El jugador debe acceder desde otro navegador o perfil independiente con su clave. Una pestaña normal comparte cookie DM y conserva ese rol aunque la URL tenga `view=player`; el query solo preselecciona el formulario si no existe sesión.
+Inicia/continúa una partida desde su catálogo. Mesa contiene enlace de invitación, copia/rotación explícita y panel privado de participantes. Cada invitado entra con alias; la cookie de esa partida conserva suID al recargar. CuentaDM y cookies invitadas pueden coexistir. Expulsar confirma alias+discriminador y cambia el enlace conservando los demás.
 
-Dos regiones live persistentes fuera del detalle anuncian cambios relevantes de conexión, publicación, carga y error aun con Mesa cerrada; los reportes de navegación no cambian el anuncio. La cabecera compacta distingue conectado/desconectado; el detalle muestra publicación, cantidad de jugadores, identificador abreviado del principal, carga y error. Sin publicación, Player espera al DM. Con pérdida de red conserva la escena marcada desactualizada y no confirma reportes; reconecta automáticamente. Logout/caducidad oculta y desmonta la vista jugador. Los borradores DM conservan la protección de recuperación de 003.
+Las regioneslive anuncian conexión/publicación/error sin narrar cada heartbeat. Sin escena, Player espera publicación. Corte de red conserva vista desactualizada; terminal retira proyección/efectos y detiene reintentos. [Interfaz y borradores](browser-client.md).
 
 ## Frontera pública y assets
 
@@ -18,7 +18,7 @@ La niebla **no protege los píxeles del mapa**: el jugador recibe la imagen comp
 
 ## Contrato HTTP
 
-Rutas bajo `/api/v1`. Misma cookie HttpOnly/SameSite, Host/Origin y límites de la API base. Todo POST de mesa/dados lleva `{requestId: UUID, context: UUID|null, connectionId?: UUID, revision?: number, payload}`. El rol proviene exclusivamente de la sesión, que se revalida tras recibir cuerpos y decodificar imágenes, antes de actuar. `connectionId` se obtiene del bootstrap SSE y está ligado a esa cookie; no lo elige el cliente. El contexto lo genera el servicio al cambiar escena/mapa/cameraSyncKey.
+Rutas bajo `/api/v1/dm/games/:gameId` paraDM y `/api/v1/games/:gameId` para invitado; autoridades/cookies distintas. TodoPOST contextual lleva `{openingId,generation,command:{requestId,context,connectionId?,revision?,payload},sceneResourceId?}`. Consulta [protocolo2 vigente](moderation.md); las tablas siguientes describen los payloads internos comunes. El rol proviene exclusivamente de la sesión, que se revalida tras recibir cuerpos y decodificar imágenes, antes de actuar. `connectionId` se obtiene del bootstrap SSE y está ligado a esa cookie; no lo elige el cliente. El contexto lo genera el servicio al cambiar escena/mapa/cameraSyncKey.
 
 | Ruta | Rol y payload | Resultado |
 | --- | --- | --- |
@@ -58,7 +58,7 @@ DiceRollSession valida contexto, composición, simulación y resultado. Solo el
 
 ## SSE, orden y límites
 
-Cada evento `event: table` tiene ID `época:audiencia:secuencia` y JSON `{protocolVersion:1,epoch,context,revision,serverTime,sequence,type,state?,payload?}`. Tipos: bootstrap, scene, camera, camera-command, pointer, highlight, presence, image-status, dice, sizes, render-error. Heartbeat es comentario SSE cada segundo. Secuencias DM/jugador independientes: las acciones privadas no incrementan la secuencia jugador.
+Cada evento contextual tiene ID `gameId:openingId:generation:epoch:audience:sequence` y sobre protocolVersion2 con sistema/ref/hash/modules públicos; bootstrap contiene el estado internoprotocolVersion1. Tipos: bootstrap, scene, camera, camera-command, pointer, highlight, presence, image-status, dice, sizes, render-error. Heartbeat es comentario SSE cada segundo. Secuencias DM/jugador independientes: las acciones privadas no incrementan la secuencia jugador.
 
 Bootstrap se emite en la misma transición síncrona que registra la suscripción. Todo cursor válido (incluido viejo/desconocido) recupera snapshot actual; no hay replay de mapas anteriores. Cursores malformados se rechazan. Cliente descarta duplicados, revisiones antiguas, contexto ajeno y chunks de generaciones anteriores incluso si `read()` resuelve después del abort. Bootstrap no reinicia navegación local ni acciones ya aplicadas. Las publicaciones HTTP se serializan por cliente; no pueden resolverse fuera de orden.
 
@@ -72,4 +72,4 @@ Pruebas ejecutables: `public-table-projection.test.ts`, `table-http.test.ts`, `t
 
 ## Mesas por partida/apertura (010)
 
-La [guía contextual](moderation.md) define protocolo2, aislamiento de cámaras/dados/proyección, roster privado, revocación en la frontera de envío y callback terminal del adaptador. El camino legado conserva protocolo1. Runtimes y streams tienen cuotas globales además de las de cada mesa; no hay una partida activa global en la composición nueva.
+La [guía contextual](moderation.md) define protocolo2, aislamiento de cámaras/dados/proyección, roster privado, revocación en la frontera de envío y callback terminal del adaptador. El listener de producto retira el camino legado; protocolo1 solo permanece en el motor interno y fixtures históricos. Runtimes y streams tienen cuotas globales además de las de cada mesa; no hay una partida activa global en la composición nueva.
diff --git a/eslint.config.js b/eslint.config.js
index cce72d4..b83e978 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -3,7 +3,7 @@ import tseslint from "typescript-eslint";
 
 export default tseslint.config(
   {
-    ignores: ["dist", "out", "node_modules", "index.js", "src/render/three/dice/vendor/**/*.js"]
+    ignores: [".local/**", "dist", "out", "node_modules", "index.js", "src/render/three/dice/vendor/**/*.js"]
   },
   js.configs.recommended,
   ...tseslint.configs.recommended,
diff --git a/package.json b/package.json
index 01cf4e1..26a4371 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.12.0",
+  "version": "3.13.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -36,7 +36,7 @@
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
     "productName": "TTRPG Effects",
-    "copyright": "Copyright \u00a9 2026 Luis Moncaris",
+    "copyright": "Copyright © 2026 Luis Moncaris",
     "directories": {
       "output": "dist"
     },
diff --git a/scripts/setup-env.sh b/scripts/setup-env.sh
index d5b6d02..6ea6367 100644
--- a/scripts/setup-env.sh
+++ b/scripts/setup-env.sh
@@ -29,7 +29,7 @@ try {
   const driver = api?.TTRPG_DB_DRIVER ?? process.env.TTRPG_DB_DRIVER ?? 'sqlite';
   if (!['sqlite', 'postgres'].includes(driver)) throw new Error('TTRPG_DB_DRIVER inválido.');
   if (driver === 'postgres' && api === null) throw new Error('Prepara manualmente .env para PostgreSQL; consulta la guía de persistencia.');
-  const dataDir = api?.TTRPG_DATA_DIR ?? process.env.TTRPG_DATA_DIR ?? join(homedir(), '.local/share/ttrpg-effects-service');
+  const dataDir = api?.TTRPG_DATA_DIR ?? process.env.TTRPG_DATA_DIR ?? join(process.cwd(), '.local/service/data');
   if (driver === 'sqlite') {
   if (!isAbsolute(dataDir) || [resolve('/'), resolve(homedir())].includes(resolve(dataDir))) {
     throw new Error('TTRPG_DATA_DIR debe ser un directorio absoluto exclusivo del servicio.');
@@ -41,6 +41,11 @@ try {
   mkdirSync(dataDir, { recursive: true, mode: 0o700 });
   chmodSync(dataDir, 0o700);
   }
+  for (const relative of ['.local', '.local/service', '.local/service/data', '.local/service/backups', '.local/service/logs']) {
+    const directory = join(process.cwd(), relative);
+    if (existsSync(directory) && (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory() || realpathSync(directory) !== directory)) throw new Error('Los directorios privados deben ser físicos, sin enlaces simbólicos.');
+    if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 }); chmodSync(directory, 0o700);
+  }
   if (api === null) {
     const contents = [
       '# Configuración privada de la API. No subir a Git ni compartir las claves.',
@@ -49,24 +54,23 @@ try {
       'TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787',
       `TTRPG_WEB_DIR=${JSON.stringify(join(process.cwd(), 'out/web'))}`,
       `TTRPG_DATA_DIR=${JSON.stringify(resolve(dataDir))}`,
-      `TTRPG_DM_KEY=${randomBytes(32).toString('hex')}`,
-      `TTRPG_PLAYER_KEY=${randomBytes(32).toString('hex')}`, ''
+      `TTRPG_AUTH_SECRET=${randomBytes(32).toString('base64url')}`, ''
     ].join('\n');
     writeFileSync('.env', contents, { flag: 'wx', mode: 0o600 });
   }
+  const clientOrigin = api?.TTRPG_PUBLIC_ORIGIN ?? 'http://127.0.0.1:8787';
+  const parsedOrigin = new URL(clientOrigin);
+  if (parsedOrigin.origin !== clientOrigin || !['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.protocol === 'http:' && !['localhost','127.0.0.1','[::1]'].includes(parsedOrigin.hostname)) throw new Error('TTRPG_PUBLIC_ORIGIN debe ser un origen raíz seguro.');
   if (!existsSync('.env.electron')) {
-    writeFileSync('.env.electron', '# Cliente Electron: service usa la API; local usa archivos locales.\nTTRPG_ELECTRON_MODE=service\nTTRPG_SERVICE_URL=http://127.0.0.1:8787\n', { flag: 'wx', mode: 0o600 });
+    writeFileSync('.env.electron', `# Cliente Electron: service usa la API; local usa archivos locales.\nTTRPG_ELECTRON_MODE=service\nTTRPG_SERVICE_URL=${clientOrigin}\n`, { flag: 'wx', mode: 0o600 });
   }
   chmodSync('.env', 0o600);
   chmodSync('.env.electron', 0o600);
-  console.log(driver === 'sqlite' ? 'Configuración lista: .env y .env.electron (600), directorio de datos (700).' : 'Configuración PostgreSQL conservada; no se creó almacenamiento SQLite.');
-  if (driver === 'postgres') {
-    console.log('Se conservaron los valores existentes. Siguiente paso: pnpm build:api y pnpm db:migrate.');
-    console.log('El servicio completo PostgreSQL permanece bloqueado en esta entrega. Consulta docs/database.md.');
-  } else {
-    console.log('Se conservaron los valores existentes. Consulta las claves de acceso en .env.');
-    console.log('Arranque: pnpm start:api; en otra terminal, pnpm start:service.');
+  console.log('Configuración privada conservada; directorios internos 700 y archivos 600.');
+  if (api && (!api.TTRPG_AUTH_SECRET || api.TTRPG_IDENTITY_ENABLED === 'false')) {
+    throw new Error('Configuración anterior incompleta: conserva una copia y añade un secreto independiente TTRPG_AUTH_SECRET; retira TTRPG_IDENTITY_ENABLED=false. Las claves anteriores ya no autorizan. Consulta docs/service-operations.md.');
   }
+  console.log('Siguiente: pnpm build:api, pnpm db:migrate e identity:bootstrap (TTY). Después: pnpm start:api. No se crearon cuentas.');
 } catch (error) {
   // No volcar contenido de configuración, claves ni detalles de errores del sistema.
   console.error(error.code ? 'No se pudo preparar la configuración. Comprueba rutas y permisos.' : error.message);
diff --git a/src/infrastructure/browser/browser-client.test.ts b/src/infrastructure/browser/browser-client.test.ts
index ef16cc2..9cbc679 100644
--- a/src/infrastructure/browser/browser-client.test.ts
+++ b/src/infrastructure/browser/browser-client.test.ts
@@ -5,7 +5,7 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { request } from "node:http";
 import { DatabaseSync } from "node:sqlite";
-import { createApi } from "../../server/http";
+import { createApi } from "../../server/legacy-http.fixture";
 import { connectInternalSceneLink, disconnectInternalSceneLink } from "../../domain/annotations/internal-scene-links";
 import { createDefaultSceneMap, createSceneWithMap, syncRuntimeFieldsFromActiveMap } from "../../domain/sessions/scene-maps";
 import { createDefaultScene } from "../../domain/sessions/default-scene";
diff --git a/src/infrastructure/browser/browser-client.ts b/src/infrastructure/browser/browser-client.ts
index 1461692..44e6575 100644
--- a/src/infrastructure/browser/browser-client.ts
+++ b/src/infrastructure/browser/browser-client.ts
@@ -1,3 +1,5 @@
+import { Mutations } from "./mutations";
+import { resourceBindingsSchema, type ResourceBindings, type ResolvedSystem, type SystemVersion } from "../../domain/systems/system-catalog";
 import { BrowserTableClient } from "./table-client";
 import { z } from "zod";
 import { version } from "../../../package.json";
@@ -9,7 +11,7 @@ import { sceneDocumentV1Schema } from "../../domain/sessions/scene-schema";
 const mapAnnotationsSchema = sceneDocumentV1Schema.shape.mapAnnotations;
 import { composeImportedSceneMap } from "../../application/use-cases/compose-imported-scene-map";
 import { assetUrl, sceneId, sceneReference } from "../../shared/contracts/service-references";
-import { HttpTransport, result } from "./http";
+import { HttpTransport, ServiceError, result } from "./http";
 import { downloadScene, selectBrowserFile } from "./files";
 
 const ok = z.literal(true);
@@ -17,7 +19,7 @@ const id = z.uuid();
 const timestamp = z.string().datetime();
 const summary = z.object({ id, name: z.string(), createdAt: timestamp, updatedAt: timestamp });
 const sceneSchema = z.unknown().transform((value, ctx) => { try { return parseSceneDocument(value); } catch { ctx.addIssue({ code: "custom", message: "Escena inválida" }); return z.NEVER; } });
-const resource = summary.extend({ scene: sceneSchema, warnings: z.array(z.object({ code: z.enum(["scene-format-outdated", "external-link-unresolved"]), message: z.string() })), missingImages: z.array(z.object({ reference: z.string(), locations: z.array(z.string()) })) });
+const resource = summary.extend({ revision:z.number().int().positive().optional(), bindings:resourceBindingsSchema.optional(), scene: sceneSchema, warnings: z.array(z.object({ code: z.enum(["scene-format-outdated", "external-link-unresolved"]), message: z.string() })), missingImages: z.array(z.object({ reference: z.string(), locations: z.array(z.string()) })) });
 const resourceReply = z.object({ ok, resource });
 const template = z.object({ id: z.string(), name: z.string(), system: z.string(), markdown: z.string(), css: z.string(), builtIn: z.boolean(), updatedAt: z.string() });
 const templates = z.object({ ok, templates: z.array(template) });
@@ -31,25 +33,44 @@ export interface BrowserDialogs {
   selectScene(): Promise<string | null>;
   sceneName(initial: string): Promise<string | null>;
 }
-export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs, chooseFile = selectBrowserFile) {
+export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs, chooseFile = selectBrowserFile, owned?: { gameId:string; configuration:ResolvedSystem; version:SystemVersion; table:BrowserTableClient }) {
   const names = new Map<string, string>();
-  const table = new BrowserTableClient(http);
+  const table = owned?.table ?? new BrowserTableClient(http);
+  const mutations = new Mutations(http);
+  const uploads = new Map<string,string>();
+  const versions = new Map<string,{revision:number;bindings?:ResourceBindings}>();
+  let currentResource: string | undefined;
+  let currentBindings:ResourceBindings|undefined;
+  const urlFor = (reference:string) => { const legacy=assetUrl(reference); return legacy && owned ? legacy.replace("/api/v1/assets/","/api/v1/dm/assets/") : legacy; };
+  function binding(templateId:string|null) { if(!owned)throw new Error("Falta configuración de sistema.");return {scope:"catalog" as const,...owned.configuration.ref,templateId:templateId??"generic-markdown"}; }
+  function sceneBindings(scene:SceneDocument,previous?:ResourceBindings):ResourceBindings {
+    return {monsters:Object.fromEntries(scene.sceneAside.monsters.map(m=>[m.id,previous?.monsters[m.id]?.templateId===(m.templateId??"generic-markdown")?previous.monsters[m.id]:binding(m.templateId??null)]))};
+  }
+  function remember(key:string,item:{revision?:number;bindings?:ResourceBindings}) { if(item.revision)versions.set(key,{revision:item.revision,bindings:item.bindings}); }
+  async function mutate<T>(path:string,schema:z.ZodType<T>,method:string,payload:unknown,revision?:number) { return owned?mutations.send(path,schema,method,payload,revision):http.json(path,schema,method,payload); }
+  const retainedTemplates = new Map<string,z.infer<typeof template>>();
+  async function definitions(kind:string,id:string) {
+    if(!owned)return;
+    const r=await http.request(`/definitions/${kind}/${id}`,templates.extend({monsters:z.record(z.string(),z.number().int().nonnegative())}));if(kind==="scenes"){retainedTemplates.clear();for(const [id,index] of Object.entries(r.monsters)){const value=r.templates[index];if(!value)throw new Error("Definición retenida inválida.");retainedTemplates.set(id,value);}}
+  }
+
   const ensureActive = (signal: AbortSignal) => { if (signal.aborted) throw new Error("Operación de una sesión anterior descartada."); };
   async function selectScene() { const signal=http.sessionSignal;const selected=await dialogs.selectScene();ensureActive(signal);return selected; }
   const resolveUrl = async (reference: string): Promise<string | null> => {
     if (!assetUrl(reference)) return null;
     const reply = await http.json("/assets/resolve", z.object({ ok, assets: z.array(z.object({ reference: z.string(), url: z.string().nullable() })) }), "POST", { references: [reference] });
     const url = reply.assets.find(a => a.reference === reference)?.url ?? null;
-    if (url !== null && url !== assetUrl(reference)) throw new Error("Referencia de imagen inválida.");
+    if (url !== null && url !== urlFor(reference)) throw new Error("Referencia de imagen inválida.");
     return url;
   };
   async function hydrate(item: z.infer<typeof resource>): Promise<Extract<SceneOperationResult, {ok:true}>> {
-    names.set(sceneReference(item.id), item.name);
+    names.set(sceneReference(item.id), item.name); remember(`scenes/${item.id}`,item); if(currentResource!==item.id)table.setSceneResource(undefined);currentResource=item.id;currentBindings=item.bindings;
+    if(owned)await definitions("scenes",item.id);
     const refs = [...new Set(item.scene.maps.flatMap(m => [m.map.imagePath, ...m.tokens.map(t => t.imagePath)]).filter((r): r is string => !!r && !!assetUrl(r)))];
     const urls = new Map<string,string>();
     for (let i=0; i<refs.length; i+=200) {
       const reply = await http.json("/assets/resolve", z.object({ ok, assets: z.array(z.object({ reference:z.string(),url:z.string().nullable() })) }), "POST", { references:refs.slice(i,i+200) });
-      for (const entry of reply.assets) if (entry.url && entry.url === assetUrl(entry.reference)) urls.set(entry.reference,entry.url);
+      for (const entry of reply.assets) if (entry.url && entry.url === urlFor(entry.reference)) urls.set(entry.reference,entry.url);
     }
     const mapImageUrls = Object.fromEntries(item.scene.maps.flatMap(m => { const url = urls.get(m.map.imagePath ?? ""); return url ? [[m.id,url]] : []; }));
     const tokenImageUrls = Object.fromEntries(item.scene.tokens.flatMap(t => { const url = urls.get(t.imagePath); return url ? [[t.id,url]] : []; }));
@@ -62,7 +83,9 @@ export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs
     const name = reference ? names.get(reference) ?? (await http.request(`/scenes/${sceneId(reference)}`,resourceReply)).resource.name : await dialogs.sceneName("Nueva escena");
     ensureActive(signal);
     if (name === null) return {ok:false as const,error:"Guardado cancelado."};
-    const reply = await http.json(reference ? `/scenes/${sceneId(reference)}` : "/scenes", resourceReply, reference ? "PUT":"POST", {name,scene:JSON.parse(serializeSceneDocument(scene))});
+    const key=reference?`scenes/${sceneId(reference)}`:undefined;
+    if(owned&&key&&!versions.has(key))throw new Error("Vuelve a abrir la escena para conocer su revisión antes de guardar.");
+    const reply = await mutate(reference ? `/scenes/${sceneId(reference)}` : "/scenes", resourceReply, reference ? "PUT":"POST", {name,scene:JSON.parse(serializeSceneDocument(scene)),...(owned?{bindings:sceneBindings(scene,key?versions.get(key)?.bindings:currentBindings)}:{})},key?versions.get(key)?.revision:undefined);
     return hydrate(reply.resource);
   }
   async function upload() {
@@ -72,31 +95,52 @@ export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs
     if (!file) return null;
     if (!["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("Formato no admitido. Elige PNG, JPEG o WebP estático; convierte HEIC antes de subirlo.");
     if(file.size>20*1024*1024) throw new Error("La imagen supera el límite de 20 MiB.");
-    const reply = await http.request("/assets",asset,{method:"POST",headers:{"Content-Type":file.type},body:file});
-    if(reply.asset.url!==assetUrl(reply.asset.reference) || reply.asset.reference!==`asset:${reply.asset.id}`) throw new Error("Referencia de imagen inválida.");
+    let fingerprint="",key="";
+    if(owned){const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());ensureActive(signal);fingerprint=file.type+":"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");key=uploads.get(fingerprint)??crypto.randomUUID();uploads.set(fingerprint,key);}
+    let reply:z.infer<typeof asset>;
+    try {reply = await http.request("/assets",asset,{method:"POST",headers:{"Content-Type":file.type,...(owned?{"Idempotency-Key":key}:{})},body:file});uploads.delete(fingerprint);}
+    catch(error){if(error instanceof ServiceError&&![0,429,503].includes(error.status))uploads.delete(fingerprint);throw error;}
+    if(reply.asset.url!==urlFor(reply.asset.reference) || reply.asset.reference!==`asset:${reply.asset.id}`) throw new Error("Referencia de imagen inválida.");
     return {ok:true as const,imagePath:reply.asset.reference,imageUrl:reply.asset.url};
   }
   const openImage = () => result(async()=>await upload() ?? {ok:false as const,error:"Selección cancelada."});
-  function library<T>(kind:string, schema:z.ZodType<T>) {
+  function library<T extends {id:string}>(kind:string, schema:z.ZodType<T>) {
+    const enriched=schema.and(z.object({revision:z.number().optional(),bindings:resourceBindingsSchema.optional()}));
     return {
-      search:(query:{text:string;limit?:number})=>result(()=>http.request(`/libraries/${kind}?${new URLSearchParams({text:query.text,limit:String(query.limit ?? 50)})}`,z.object({ok,entries:z.array(schema)}))),
-      get:(value:string)=>result(()=>http.request(`/libraries/${kind}/${id.parse(value)}`,z.object({ok,entry:schema}))),
-      save:(input:{readonly id?:string|null})=>result(()=> { const {id:value,...entry}=input; return http.json(`/libraries/${kind}${value ? `/${id.parse(value)}`:""}`,z.object({ok,entry:schema}),value?"PUT":"POST",{entry}); })
+      search:(query:{text:string;limit?:number})=>result(async()=>{const r=await http.request(`/libraries/${kind}?${new URLSearchParams({text:query.text,limit:String(query.limit??50)})}`,z.object({ok,entries:z.array(enriched)}));for(const e of r.entries)remember(`${kind}/${e.id}`,e);return r;}),
+      get:(value:string)=>result(async()=>{const r=await http.request(`/libraries/${kind}/${id.parse(value)}`,z.object({ok,entry:enriched}));remember(`${kind}/${value}`,r.entry);if(kind==="monsters")await definitions(kind,value);return r;}),
+      save:(input:{readonly id?:string|null})=>result(async()=>{const {id:value,...entry}=input;const previous=value?versions.get(`${kind}/${value}`):undefined;if(owned&&value&&!previous)throw new Error("Abre la ficha antes de editarla; falta su revisión.");const templateId=(entry as {templateId?:string|null}).templateId??null;
+        const bindings=kind==="monsters"?{monsters:{},root:previous?.bindings?.root?.templateId===(templateId??"generic-markdown")?previous.bindings.root:owned?binding(templateId):undefined}:undefined;
+        const r=await mutate(`/libraries/${kind}${value?`/${id.parse(value)}`:""}`,z.object({ok,entry:enriched}),value?"PUT":"POST",{entry,...(owned?{bindings}: {})},previous?.revision);remember(`${kind}/${r.entry.id}`,r.entry);return r;})
     };
   }
+  async function linkMutation<T>(path:string,schema:z.ZodType<T>,request:unknown) {
+    if(!owned)return http.json(path,schema,"POST",request);
+    const input=request as {sourceScenePath?:string;scenePath?:string;targetScenePath?:string;sourceMarkerId?:string;markerId?:string};
+    const refs=new Set([input.sourceScenePath??input.scenePath,input.targetScenePath].filter((v):v is string=>!!v));
+    const sourceRef=input.sourceScenePath??input.scenePath!;
+    const source=(await http.request(`/scenes/${sceneId(sourceRef)}`,resourceReply)).resource;
+    const marker=source.scene.maps.flatMap(m=>m.mapAnnotations.sceneLinks).find(m=>m.id===(input.sourceMarkerId??input.markerId));
+    if(marker?.connection)refs.add(marker.connection.peer.scenePath);
+    const expectedRevisions:Record<string,number>={};
+    for(const ref of refs){const key=sceneId(ref);if(!versions.has(`scenes/${key}`)){const current=(await http.request(`/scenes/${key}`,resourceReply)).resource;remember(`scenes/${key}`,current);}expectedRevisions[key]=versions.get(`scenes/${key}`)!.revision;}
+    const response=await mutations.send(path,schema,"POST",{...request as object,expectedRevisions});
+    const confirmed=(response as {revisions?:Record<string,number>}).revisions;if(!confirmed)throw new Error("No se confirmó la revisión de los enlaces. Vuelve a abrir la escena.");for(const [id,revision] of Object.entries(confirmed)){const old=versions.get(`scenes/${id}`);versions.set(`scenes/${id}`,{...old,revision});}
+    return response;
+  }
   const monsters=library("monsters",monster), npcs=library("npcs",npc), characters=library("player-characters",character);
   const api:TtrpgApi = {
     getAppInfo:()=>({name:"TTRPG Effects",version,status:"Bootstrap listo"}),
     saveScene:(scene,options)=>result(()=>save(scene,options?.suggestedFilePath)), saveSceneToPath:(scene,path)=>result(()=>save(scene,path)),
     loadScene:()=>result(async()=>{const selected=await selectScene();return selected ? load(selected):{ok:false as const,error:"Carga cancelada."};}),
-    importSceneAsMap:(scene)=>result(async()=>{const selected=await selectScene();if(!selected)return {ok:false as const,error:"Importación cancelada."};const loaded=await load(selected);return composeImportedSceneMap(scene,{...loaded,mapImageUrls:loaded.mapImageUrls??{},tokenImageUrls:loaded.tokenImageUrls??{}},selected);}),
+    importSceneAsMap:(scene)=>result(async()=>{const selected=await selectScene();if(!selected)return {ok:false as const,error:"Importación cancelada."};const source=await http.request(`/scenes/${sceneId(selected)}`,resourceReply);const previousResource=currentResource,previousBindings=currentBindings,previousDefinitions=new Map(retainedTemplates);const loaded=await hydrate(source.resource);currentResource=previousResource;currentBindings=previousBindings;retainedTemplates.clear();for(const [id,definition] of previousDefinitions)retainedTemplates.set(id,definition);table.setSceneResource(undefined);return composeImportedSceneMap(scene,{...loaded,mapImageUrls:loaded.mapImageUrls??{},tokenImageUrls:loaded.tokenImageUrls??{}},selected);}),
     selectSceneLinkTargetFile:()=>result(async()=>({ok:true as const,filePath:await selectScene()})),
-    listSceneLinkCandidates:path=>result(()=>http.request(`/scenes/${sceneId(path)}/links/candidates`,z.object({ok,candidate:z.object({filePath:z.string(),markers:z.array(z.object({id:z.string(),name:z.string(),position:z.object({x:z.number(),y:z.number()}),available:z.boolean()}))})}))),
-    connectSceneLink:request=>result(()=>http.json("/scene-links/connect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional()}),"POST",request)),
-    disconnectSceneLink:request=>result(()=>http.json("/scene-links/disconnect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional()}),"POST",request)),
+    listSceneLinkCandidates:path=>result(async()=>{if(owned){const r=(await http.request(`/scenes/${sceneId(path)}`,resourceReply)).resource;remember(`scenes/${r.id}`,r);}return http.request(`/scenes/${sceneId(path)}/links/candidates`,z.object({ok,candidate:z.object({filePath:z.string(),markers:z.array(z.object({id:z.string(),name:z.string(),position:z.object({x:z.number(),y:z.number()}),available:z.boolean()}))})}));}),
+    connectSceneLink:request=>result(()=>linkMutation("/scene-links/connect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional(),revisions:z.record(z.string(),z.number()).optional()}),request)),
+    disconnectSceneLink:request=>result(()=>linkMutation("/scene-links/disconnect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional(),revisions:z.record(z.string(),z.number()).optional()}),request)),
     validateSceneLinks:request=>result(()=>http.json("/scene-links/validate",z.object({ok,statuses:z.record(z.string(),z.discriminatedUnion("state",[z.object({state:z.literal("unlinked")}),z.object({state:z.literal("valid")}),z.object({state:z.literal("validating")}),z.object({state:z.literal("broken"),reason:z.enum(["file-missing","scene-invalid","marker-missing","connection-mismatch","read-failed"]),message:z.string()})]))}),"POST",request)),
     loadSceneLinkTarget:request=>result(async()=>{const reply=await http.json("/scene-links/navigate",z.object({ok,resource,entryPoint:z.object({x:z.number(),y:z.number()})}),"POST",request);return {ok:true as const,sceneResult:await hydrate(reply.resource),entryPoint:reply.entryPoint};}),
-    listMonsterTemplates:()=>result(()=>http.request("/monster-templates",templates)),saveMonsterTemplate:value=>result(()=>http.json(`/monster-templates/${encodeURIComponent(value.id)}`,templates,"PUT",{template:value})),deleteMonsterTemplate:value=>result(()=>http.json(`/monster-templates/${encodeURIComponent(value)}`,templates,"DELETE")),
+    listMonsterTemplates:()=>result(async()=>owned?{ok:true as const,templates:owned.configuration.definition.presentations.filter(t=>owned.configuration.availability==="enabled"&&owned.version.templates[t.id]?.availability==="enabled")}:http.request("/monster-templates",templates)),saveMonsterTemplate:value=>result(()=>{if(owned)throw new Error("Las plantillas se administran en el catálogo por un administrador.");return http.json(`/monster-templates/${encodeURIComponent(value.id)}`,templates,"PUT",{template:value});}),deleteMonsterTemplate:value=>result(()=>{if(owned)throw new Error("No se permite borrar plantillas del servicio.");return http.json(`/monster-templates/${encodeURIComponent(value)}`,templates,"DELETE");}),
     searchMonsterLibrary:monsters.search,getMonsterLibraryEntry:monsters.get,saveMonsterLibraryEntry:monsters.save,
     searchNpcLibrary:npcs.search,getNpcLibraryEntry:npcs.get,saveNpcLibraryEntry:npcs.save,
     searchPlayerCharacterLibrary:characters.search,getPlayerCharacterLibraryEntry:characters.get,savePlayerCharacterLibraryEntry:characters.save,
@@ -107,12 +151,17 @@ export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs
   };
   return {
     table,
-    client:createClient(api,{scenes:true,images:true,libraries:true,player:true,dice:true,nativeMenus:false},"service"),
+    client:createClient(api,{scenes:true,images:true,libraries:true,templateAdministration:!owned,player:true,dice:true,nativeMenus:false},"service",owned?{
+      forMonster:(id,templateId,available)=>{const retained=retainedTemplates.get(id);return retained&&retained.id===templateId?[retained,...available.filter(t=>t.id!==retained.id)]:available;},
+      validateLibraryUse:async(id)=>{const entry=await monsters.get(id);if(!entry.ok)throw new Error(entry.error);const ref=versions.get(`monsters/${id}`)?.bindings?.root;if(!ref||ref.scope!=="catalog"||ref.systemId!==owned.configuration.ref.systemId||ref.version!==owned.configuration.ref.version||owned.configuration.availability!=="enabled"||owned.version.templates[ref.templateId]?.availability!=="enabled")throw new Error("Esta ficha conserva una presentación privada, deshabilitada o de otra versión. Puedes editar su instancia existente, pero no crear un vínculo nuevo en esta partida.");}
+    }:undefined),
     listScenes:async(offset=0)=>{const reply=await http.request(`/scenes?limit=50&offset=${offset}`,z.object({ok,scenes:z.array(summary),total:z.number().int().nonnegative()}));for(const scene of reply.scenes)names.set(sceneReference(scene.id),scene.name);return reply;},
     name:(reference:string)=>names.get(reference)??"Escena del servicio",
-    importFile:()=>result(async()=>{const signal=http.sessionSignal;const file=await chooseFile(".ttrpgscene,application/json",signal);ensureActive(signal);if(!file)return {ok:false as const,error:"Importación cancelada."};if(file.size>10*1024*1024)throw new Error("La escena supera el límite de 10 MiB.");const scene=parseSceneJson(await file.text());ensureActive(signal);const reply=await http.json("/scenes/import",resourceReply,"POST",{name:file.name.replace(/\.ttrpgscene$/i,"").slice(0,200)||"Escena importada",scene:JSON.parse(serializeSceneDocument(scene))});return hydrate(reply.resource);}),
+    importFile:()=>result(async()=>{const signal=http.sessionSignal;const file=await chooseFile(".ttrpgscene,application/json",signal);ensureActive(signal);if(!file)return {ok:false as const,error:"Importación cancelada."};if(file.size>10*1024*1024)throw new Error("La escena supera el límite de 10 MiB.");const scene=parseSceneJson(await file.text());ensureActive(signal);const reply=await mutate("/scenes/import",resourceReply,"POST",{name:file.name.replace(/\.ttrpgscene$/i,"").slice(0,200)||"Escena importada",scene:JSON.parse(serializeSceneDocument(scene)),...(owned?{bindings:sceneBindings(scene)}:{})});return hydrate(reply.resource);}),
     exportFile:async(scene:SceneDocument,reference:string|null)=>downloadScene(serializeSceneDocument(scene),reference?names.get(reference)??"escena":"escena"),
-    clear:()=>{table.clear();http.invalidate();names.clear();}
+    revalidate:async()=>{if(!owned)return;for(const [key,stored] of versions){const [kind,id]=key.split("/");const path=kind==="scenes"?`/scenes/${id}`:`/libraries/${kind}/${id}`;const value=await http.request(path,z.object({ok,resource:z.object({revision:z.number()}).optional(),entry:z.object({revision:z.number()}).optional()}));if((value.resource??value.entry)?.revision!==stored.revision)throw new Error("Los recursos cambiaron mientras la sesión estaba cerrada. Conserva tu borrador; descártalo explícitamente o vuelve a abrir la escena antes de guardar.");}},
+    associateCurrent:async()=>{if(!owned||!currentResource)throw new Error("Guarda o abre la escena antes de asociarla a esta partida.");await mutations.send(`/games/${owned.gameId}/resources`,z.object({ok}),"POST",{kind:"scenes",resourceId:currentResource});table.setSceneResource(currentResource);},
+    clear:()=>{table.clear();http.invalidate();names.clear();versions.clear();retainedTemplates.clear();mutations.clear();uploads.clear();}
   };
 }
 export type BrowserClient = ReturnType<typeof createBrowserClient>;
diff --git a/src/infrastructure/browser/http.ts b/src/infrastructure/browser/http.ts
index f687016..aea2229 100644
--- a/src/infrastructure/browser/http.ts
+++ b/src/infrastructure/browser/http.ts
@@ -1,7 +1,7 @@
 import { z } from "zod";
 import { API_PREFIX } from "../../shared/contracts/http-api";
 export class ServiceError extends Error {
-  constructor(readonly code: string, message: string, readonly status = 0) { super(message); }
+  constructor(readonly code: string, message: string, readonly status = 0, readonly retryAfter = 0) { super(message); }
 }
 const failure = z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });
 export const sessionSchema = z.object({ ok: z.literal(true), role: z.enum(["dm", "player"]), expiresAt: z.string().datetime() });
@@ -10,27 +10,32 @@ export class HttpTransport {
   private lifecycle = new AbortController();
   get sessionSignal(): AbortSignal { return this.lifecycle.signal; }
   private blocked = false;
+  private retryNotBefore = 0;
+  private checkRetry(){const seconds=Math.ceil((this.retryNotBefore-Date.now())/1000);if(seconds>0)throw new ServiceError("RATE_LIMITED",`Espera ${seconds} segundos antes de reintentar.`,429,seconds);}
+  private retryAfter(response:Response){const value=Number(response.headers.get("Retry-After")??0);const seconds=Number.isFinite(value)?Math.max(1,Math.min(3600,value)):1;if(response.status===429)this.retryNotBefore=Date.now()+seconds*1000;return seconds;}
   private readonly pending = new Set<AbortController>();
   constructor(private readonly fetcher: typeof fetch = fetch, private readonly expired: () => void = () => {}, private readonly prefix = API_PREFIX, private readonly readQuery = "") {}
   invalidate(): void { this.lifecycle.abort(); this.lifecycle = new AbortController(); this.generation++; this.blocked = true; for (const request of this.pending) request.abort(); this.pending.clear(); }
   resume(): void { this.blocked = false; }
   async request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
     if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) throw new ServiceError("INVALID_PATH", "Ruta inválida.");
-    if (this.blocked && !path.startsWith("/auth/")) throw new ServiceError("UNAUTHORIZED", "La sesión expiró. Vuelve a acceder para guardar.", 401);
+    if (this.blocked && !path.startsWith("/identity/") && !path.startsWith("/auth/")) throw new ServiceError("UNAUTHORIZED", "La sesión expiró. Vuelve a acceder para guardar.", 401);
+    this.checkRetry();
     const generation = this.generation;
     const controller = new AbortController(); this.pending.add(controller);
     try {
       const fetchRequest = this.fetcher;
       const response = await fetchRequest(this.prefix + path + ((init.method ?? "GET") === "GET" ? this.readQuery : ""), { ...init, credentials: "same-origin", signal: controller.signal });
       if (generation !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
-      if (response.status === 401 && !path.startsWith("/auth/")) { this.invalidate(); this.expired(); }
+      if (response.status === 401 && !path.startsWith("/identity/") && !path.startsWith("/auth/")) { this.invalidate(); this.expired(); }
       const bodyGeneration = this.generation;
       if (!response.ok) {
         let details: z.infer<typeof failure> | undefined;
         try { details = failure.parse(await response.json()); } catch { /* El status conserva su semántica aunque el proxy devuelva HTML. */ }
+        if(details?.error.code === "PASSWORD_CHANGE_REQUIRED") { this.invalidate(); this.expired(); }
         if (this.readQuery && ([403, 404].includes(response.status) || response.status === 409 && details?.error.code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
         if (bodyGeneration !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
-        throw new ServiceError(details?.error.code ?? `HTTP_${response.status}`, details?.error.message ?? ({ 401: "La sesión expiró. Vuelve a acceder.", 403: "No tienes permiso para esta operación.", 404: "El recurso ya no existe.", 413: "El archivo supera el límite permitido." }[response.status] ?? "El servicio no pudo completar la operación. Reintenta."), response.status);
+        throw new ServiceError(details?.error.code ?? `HTTP_${response.status}`, details?.error.message ?? ({ 401: "La sesión expiró. Vuelve a acceder.", 403: "No tienes permiso para esta operación.", 404: "El recurso ya no existe.", 413: "El archivo supera el límite permitido." }[response.status] ?? "El servicio no pudo completar la operación. Reintenta."), response.status, this.retryAfter(response));
       }
       let raw: unknown;
       try { raw = response.status === 204 ? undefined : response.headers.get("content-type")?.includes("application/json") ? await response.json() : null; }
@@ -46,6 +51,7 @@ export class HttpTransport {
   }
   async stream(path: string, signal: AbortSignal, cursor?: string): Promise<Response> {
     if (this.blocked) throw new ServiceError("UNAUTHORIZED", "La sesión expiró.", 401);
+    this.checkRetry();
     const fetchRequest = this.fetcher;
     const response = await fetchRequest(this.prefix + path + this.readQuery, { credentials: "same-origin", signal, headers: cursor ? { "Last-Event-ID": cursor } : {} });
     if (response.status === 401) { this.invalidate(); this.expired(); }
@@ -53,7 +59,7 @@ export class HttpTransport {
       let code = "STREAM";
       if (this.readQuery && response.status === 409) { try { code = failure.parse(await response.json()).error.code; } catch { /* Conflicto sin causa contextual verificable. */ } }
       if (this.readQuery && ([403, 404].includes(response.status) || code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
-      throw new ServiceError(code, "No se pudo conectar la mesa.", response.status);
+      throw new ServiceError(code, "No se pudo conectar la mesa.", response.status,this.retryAfter(response));
     }
     if (!response.headers.get("content-type")?.includes("text/event-stream")) throw new ServiceError("STREAM", "El servicio devolvió un stream inválido.");
     return response;
diff --git a/src/infrastructure/browser/mutations.ts b/src/infrastructure/browser/mutations.ts
new file mode 100644
index 0000000..ebadbb9
--- /dev/null
+++ b/src/infrastructure/browser/mutations.ts
@@ -0,0 +1,14 @@
+import { z } from "zod";
+import { HttpTransport, ServiceError } from "./http";
+/** Retains uncertain operation keys. Never changes payload/preconditions while retrying. */
+export class Mutations {
+  private uncertain = new Map<string,string>();
+  constructor(readonly http:HttpTransport) {}
+  async send<T>(path:string,schema:z.ZodType<T>,method:string,payload:unknown,revision?:number) {
+    const fingerprint=JSON.stringify([path,method,payload,revision]);
+    const key=this.uncertain.get(fingerprint)??crypto.randomUUID(); this.uncertain.set(fingerprint,key);
+    try { const response=await this.http.request(path,schema,{method,headers:{"Content-Type":"application/json","Idempotency-Key":key,...(revision===undefined?{}:{"If-Match":String(revision)})},body:JSON.stringify(payload)});this.uncertain.delete(fingerprint);return response; }
+    catch(error){if(error instanceof ServiceError && ![0,429,503].includes(error.status))this.uncertain.delete(fingerprint);throw error;}
+  }
+  clear(){this.uncertain.clear();}
+}
diff --git a/src/infrastructure/browser/owned-client.test.ts b/src/infrastructure/browser/owned-client.test.ts
new file mode 100644
index 0000000..7f149f5
--- /dev/null
+++ b/src/infrastructure/browser/owned-client.test.ts
@@ -0,0 +1,31 @@
+import { expect, it, vi } from "vitest";
+import { z } from "zod";
+import { HttpTransport } from "./http";
+import { Mutations } from "./mutations";
+import { createBrowserClient } from "./browser-client";
+import { BrowserTableClient } from "./table-client";
+import { systemSeeds, type ResourceBindings } from "../../domain/systems/system-catalog";
+import { createDefaultScene } from "../../domain/sessions/default-scene";
+const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
+it("la respuesta perdida reintenta misma clave, payload y CAS; conflicto no pisa la revisión",async()=>{
+ const f=vi.fn().mockRejectedValueOnce(new Error("perdida")).mockResolvedValueOnce(response({ok:true})).mockResolvedValueOnce(response({ok:false,error:{code:"REVISION_CONFLICT",message:"Conserva el borrador"}},409));const m=new Mutations(new HttpTransport(f));const dto=z.object({ok:z.literal(true)});
+ await expect(m.send("/dm/scenes",dto,"PUT",{name:"primero"},3)).rejects.toMatchObject({code:"NETWORK"});await m.send("/dm/scenes",dto,"PUT",{name:"primero"},3);expect(f.mock.calls[0][1].headers).toEqual(f.mock.calls[1][1].headers);expect(f.mock.calls[0][1].body).toBe(f.mock.calls[1][1].body);expect(f.mock.calls[0][1].headers["If-Match"]).toBe("3");await expect(m.send("/dm/scenes",dto,"PUT",{name:"otro"},3)).rejects.toMatchObject({code:"REVISION_CONFLICT"});
+});
+it("escena propia conserva binding privado retenido y revisión fuera del documento portable",async()=>{
+ const id="01010101-0101-4101-8101-010101010101",base=createDefaultScene(),scene={...base,sceneAside:{...base.sceneAside,monsters:[{id:"monster",name:"Retenido",imagePath:null,visibleToPlayer:false,notes:"x",templateId:"generic-markdown"}]}};
+ const bindings:ResourceBindings={monsters:{monster:{scope:"private",ownerId:"owner",templateId:"generic-markdown",version:1,hash:"a".repeat(64)}}};
+ const resource={id,name:"Privada",scene,revision:4,bindings,createdAt:"2026-10-31T00:00:00.000Z",updatedAt:"2026-10-31T00:00:00.000Z",warnings:[],missingImages:[]};const seed=systemSeeds[0];
+ const f=vi.fn(async(path:string,init?:RequestInit)=>path.includes("/definitions/")?response({ok:true,templates:[{...seed.definition.presentations[0],name:"Privada coincidente"}],monsters:{monster:0}}):init?.method==="PUT"?response({ok:true,resource:{...resource,revision:5}}):response({ok:true,resource}));
+ const http=new HttpTransport(f as typeof fetch,()=>{},"/api/v1/dm");const browser=createBrowserClient(http,{selectScene:async()=>`scene:${id}`,sceneName:async()=>"nombre"},undefined,{gameId:id,configuration:{ref:seed.ref,definition:seed.definition,hash:"b".repeat(64),availability:"enabled"},version:{...seed.ref,state:"published",createdAt:resource.createdAt,publishedAt:resource.createdAt,revision:1,availability:"enabled",definition:seed.definition,hash:"b".repeat(64),templates:{"generic-markdown":{availability:"enabled",revision:1}}},table:new BrowserTableClient(http)});
+ expect((await browser.client.api.loadScene()).ok).toBe(true);const templates=await browser.client.api.listMonsterTemplates();expect(templates.ok&&templates.templates[0].name).not.toBe("Privada coincidente");if(templates.ok){expect(browser.client.presentations?.forMonster("monster","generic-markdown",templates.templates)[0].name).toBe("Privada coincidente");expect(browser.client.presentations?.forMonster("new","generic-markdown",templates.templates)[0].name).not.toBe("Privada coincidente");}expect((await browser.client.api.saveSceneToPath(scene,`scene:${id}`)).ok).toBe(true);const saved=f.mock.calls.find(([,init])=>init?.method==="PUT")![1]!;expect((saved.headers as Record<string,string>)["If-Match"]).toBe("4");const payload=JSON.parse(saved.body as string);expect(payload.bindings).toEqual(bindings);expect(payload.scene).not.toHaveProperty("bindings");expect(payload.scene).not.toHaveProperty("revision");browser.clear();
+});
+it("una respuesta de cuenta anterior no reaparece aunque fetch ignore abort",async()=>{let complete!:(r:Response)=>void;const h=new HttpTransport(()=>new Promise<Response>(r=>{complete=r;}));const p=h.request("/dm/games",z.unknown());h.invalidate();h.resume();complete(response({private:"old"}));await expect(p).rejects.toMatchObject({code:"STALE"});});
+
+it("respeta Retry-After sin enviar otra mutación y conserva su clave incierta",async()=>{vi.useFakeTimers();try{const f=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ok:false,error:{code:"RATE_LIMITED",message:"Espera"}}),{status:429,headers:{"Content-Type":"application/json","Retry-After":"12"}})).mockResolvedValueOnce(response({ok:true}));const m=new Mutations(new HttpTransport(f));const dto=z.object({ok:z.literal(true)});await expect(m.send("/dm/games",dto,"POST",{name:"Partida"})).rejects.toMatchObject({status:429});await expect(m.send("/dm/games",dto,"POST",{name:"Partida"})).rejects.toMatchObject({status:429});expect(f).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(12000);await m.send("/dm/games",dto,"POST",{name:"Partida"});expect(f.mock.calls[0][1].headers).toEqual(f.mock.calls[1][1].headers);}finally{vi.useRealTimers();}});
+it("reintenta una imagen incierta con la misma clave y contenido",async()=>{
+ const seed=systemSeeds[0],id="01010101-0101-4101-8101-010101010101",at="2026-10-31T00:00:00.000Z";
+ const f=vi.fn().mockRejectedValueOnce(new Error("respuesta perdida")).mockResolvedValueOnce(response({ok:true,asset:{id,reference:`asset:${id}`,url:`/api/v1/dm/assets/${id}`,mimeType:"image/png",byteLength:3}}));
+ const http=new HttpTransport(f,()=>{},"/api/v1/dm");const file=new File([new Uint8Array([1,2,3])],"fixture.png",{type:"image/png"});
+ const browser=createBrowserClient(http,{selectScene:async()=>null,sceneName:async()=>null},async()=>file,{gameId:id,configuration:{ref:seed.ref,definition:seed.definition,hash:"a".repeat(64),availability:"enabled"},version:{...seed.ref,state:"published",createdAt:at,publishedAt:at,revision:1,availability:"enabled",definition:seed.definition,hash:"a".repeat(64),templates:{"generic-markdown":{availability:"enabled",revision:1}}},table:new BrowserTableClient(http)});
+ expect((await browser.client.api.openMapImage()).ok).toBe(false);expect((await browser.client.api.openMapImage()).ok).toBe(true);expect(f.mock.calls[0][1].headers).toEqual(f.mock.calls[1][1].headers);expect(f.mock.calls[0][1].body).toBe(f.mock.calls[1][1].body);browser.clear();
+});
diff --git a/src/infrastructure/browser/table-client.ts b/src/infrastructure/browser/table-client.ts
index 92dc178..66883ca 100644
--- a/src/infrastructure/browser/table-client.ts
+++ b/src/infrastructure/browser/table-client.ts
@@ -35,6 +35,8 @@ export class BrowserTableClient {
   private applied = new Set<string>();
   constructor(private readonly http: HttpTransport, private readonly contextual?: { gameId: string; openingId: string; generation: number; audience: ServiceRole; terminal: (reason: "access-ended" | "replaced" | "unavailable") => void; roster?: () => void }) {}
   private get reply() { return z.object({ ok, state: this.contextual ? contextualStateSchema.transform(value => { if (value.gameId !== this.contextual!.gameId || value.openingId !== this.contextual!.openingId || value.generation !== this.contextual!.generation || value.audience !== this.contextual!.audience) { this.terminal("access-ended"); throw new Error("Contexto de mesa inválido."); } return tableStateSchema.parse({ ...value, protocolVersion: 1 }); }) : tableStateSchema, playerUrl: z.string().optional() }); }
+  private sceneResourceId: string | undefined;
+  setSceneResource(id: string | undefined) { this.sceneResourceId = id; }
   private ended = false;
   accessEnded() { this.terminal("access-ended"); }
   private terminal(reason: "access-ended" | "replaced" | "unavailable") { if (this.ended) return; this.ended = true; this.http.invalidate(); this.clear(); this.emit("closed"); this.contextual?.terminal(reason); }
@@ -87,6 +89,7 @@ export class BrowserTableClient {
         }
       } catch (error) {
         if (generation !== this.generation || session.aborted) return;
+        if(this.contextual&&(error instanceof z.ZodError||error instanceof SyntaxError||error instanceof ServiceError&&error.code==="INVALID_RESPONSE")){this.terminal("unavailable");return;}
         this.setStatus({ phase: "disconnected", error: "Mesa desconectada. La vista está desactualizada; reconectando…" });
         if (error instanceof ServiceError && [401, 403, 404].includes(error.status)) { if (this.contextual) this.terminal("access-ended"); return; }
         this.retry = setTimeout(() => { void connect(count + 1); }, Math.min(30000, 500 * 2 ** Math.min(count, 6)));
@@ -174,8 +177,8 @@ export class BrowserTableClient {
     const body = { requestId: crypto.randomUUID(), context: this.current?.context ?? null, connectionId: this.connectionId, revision: this.current?.revision, ...captured, payload };
     const startedAt = Date.now();
     // Un único reintento con el mismo ID, dentro de la ventana de cinco minutos.
-    try { return await this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body } : body); }
-    catch (error) { if (!(error instanceof ServiceError) || error.code !== "NETWORK" || Date.now() - startedAt >= 300000) throw error; return this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body } : body); }
+    try { return await this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body, ...(path === "/table/scene" && this.sceneResourceId ? { sceneResourceId: this.sceneResourceId } : {}) } : body); }
+    catch (error) { if (!(error instanceof ServiceError) || error.code !== "NETWORK" || Date.now() - startedAt >= 300000) throw error; return this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body, ...(path === "/table/scene" && this.sceneResourceId ? { sceneResourceId: this.sceneResourceId } : {}) } : body); }
   }
   private mutation(action: string, payload: unknown) {
     const expectedContext = this.current?.context;
@@ -202,7 +205,7 @@ export class BrowserTableClient {
     notifyPlayerContentReady: () => this.mutation("ready", {}), reportPlayerMapImageStatus: async value => { await this.mutation("map-image-status", value); },
     getPlayerWindowState: async () => {
       try { if (!this.current) this.applyState((await this.http.request("/table/state", this.reply)).state); }
-      catch (error) { this.setStatus({ error: error instanceof Error ? error.message : "No se pudo cargar la mesa." }); }
+      catch (error) { if(this.contextual&&error instanceof ServiceError&&error.code==="INVALID_RESPONSE")this.terminal("unavailable");this.setStatus({ error: error instanceof Error ? error.message : "No se pudo cargar la mesa." }); }
       return { snapshot:this.current?.snapshot ?? null,camera:this.current?.camera ?? null,cameraCommand:this.current?.cameraCommand ?? null,isOpen:(this.status.presence?.count ?? 0)>0 };
     },
     onPlayerScene: h => this.on("scene", h),onPlayerCamera: h => this.on("camera", h),onPlayerCameraCommand: h => this.on("command", h),onPlayerCameraReport: h => this.on("report", h),onPlayerPointer: h => this.on("pointer", h),onPlayerInformationAreaHighlight: h => this.on("highlight", h),onPlayerWindowClosed: h => this.on("closed", h),onPlayerWindowReady: h => this.on("ready", h),onPlayerMapImageStatus: h => this.on("image", h),
diff --git a/src/infrastructure/server/database/catalog.contract.ts b/src/infrastructure/server/database/catalog.contract.ts
index 0743548..e1af61d 100644
--- a/src/infrastructure/server/database/catalog.contract.ts
+++ b/src/infrastructure/server/database/catalog.contract.ts
@@ -3,8 +3,7 @@ import { request } from "node:http";
 import { spawn, execFile } from "node:child_process";
 import { promisify } from "node:util";
 import { resolve } from "node:path";
-import { createDefaultScene } from "../../../domain/sessions/default-scene";
-import { randomUUID } from "node:crypto";
+import { randomBytes, randomUUID } from "node:crypto";
 import { mkdtempSync, realpathSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync, linkSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
@@ -220,24 +219,25 @@ for (const kind of ["sqlite", "postgres"] as const) it(`comando pnpm db:migrate
   expect(second.stdout).toContain("sin migraciones pendientes");
   if (config.driver === "postgres") { expect(env.TTRPG_DATA_DIR).toBeUndefined(); expect(first.stdout + first.stderr).not.toContain(config.url); }
 });
-it("start:api rechaza combinaciones productivas antes de datos/socket y no filtra URL", async () => {
+it("start:api rechaza identidad incompleta antes de datos/socket y no filtra URL", async () => {
   requireBuild(); const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
   const root = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-guard-"))); cleanups.push(async () => { rmSync(root, { recursive: true, force: true }); });
   for (const deployment of ["local", "production"] as const) {
     try { await exec("pnpm", ["start:api"], { env: { ...commandEnv({ ...config, deployment }), TTRPG_DATA_DIR: join(root, "no-crear") }, timeout: 10000 }); throw new Error("Arranque inesperado"); }
     catch (error) {
       const result = error as { code?: number; stdout?: string; stderr?: string };
-      expect(result.code).not.toBe(0); expect(result.stderr).toContain("Falta migrar"); expect(result.stdout).not.toContain("lista.");
+      expect(result.code).not.toBe(0); expect(result.stderr).toContain("TTRPG_AUTH_SECRET"); expect(result.stdout).not.toContain("lista.");
       expect(result.stderr).not.toContain(config.url); expect(existsSync(join(root, "no-crear"))).toBe(false);
     }
   }
   await expect(exec("pnpm", ["start:api"], { env: { ...commandEnv({ driver: "sqlite", deployment: "local", dataDir: join(root, "no-crear") }), TTRPG_DEPLOYMENT: "production" }, timeout: 10000 })).rejects.toMatchObject({ code: 1 });
   expect(existsSync(join(root, "no-crear"))).toBe(false);
 });
-it("API compilada local conserva login, guardado y reapertura de escena sin migrar catálogo", async () => {
+it("API compilada exige catálogo migrado y retira las claves globales", async () => {
   requireBuild(); const config = await fixture("sqlite"); if (config.driver !== "sqlite") throw new Error();
+  await migrateCatalog(config);
   const key = randomUUID(), playerKey = randomUUID();
-  const env = { ...commandEnv(config), TTRPG_HOST: "127.0.0.1", TTRPG_PORT: "0", TTRPG_PUBLIC_ORIGIN: "http://127.0.0.1:8787", TTRPG_DM_KEY: key, TTRPG_PLAYER_KEY: playerKey };
+  const env = { ...commandEnv(config), TTRPG_HOST: "127.0.0.1", TTRPG_PORT: "0", TTRPG_PUBLIC_ORIGIN: "http://127.0.0.1:8787", TTRPG_DM_KEY: key, TTRPG_PLAYER_KEY: playerKey, TTRPG_AUTH_SECRET: randomBytes(32).toString("base64url") };
   async function start() {
     const child = spawn(process.execPath, [resolve("out/api/index.mjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
     const stopped = new Promise<number | null>(resolve => child.once("exit", resolve));
@@ -265,16 +265,11 @@ it("API compilada local conserva login, guardado y reapertura de escena sin migr
   }
   const first = await start();
   expect((await call(first.port, "/health")).status).toBe(200);
-  const login = await call(first.port, "/auth/login", "POST", { key }); expect(login.status).toBe(200);
-  const cookie = login.headers.get("set-cookie")!.split(";")[0];
-  const saved = await call(first.port, "/scenes", "POST", { name: "Legado intacto", scene: createDefaultScene() }, cookie); expect(saved.status).toBe(201);
-  const resource = (await saved.json()).resource;
-  await first.stop();
-  const second = await start();
-  const login2 = await call(second.port, "/auth/login", "POST", { key }); const cookie2 = login2.headers.get("set-cookie")!.split(";")[0];
-  const loaded = await call(second.port, `/scenes/${resource.id}`, "GET", undefined, cookie2);
-  expect(loaded.status).toBe(200); expect((await loaded.json()).resource.scene).toEqual(resource.scene);
-  await second.stop(); expect(existsSync(join(config.dataDir, "control.sqlite"))).toBe(false);
+  expect((await call(first.port,"/auth/login","POST",{key})).status).toBe(404);
+  expect((await call(first.port,"/dm/games","GET",undefined,"ttrpg_session=old")).status).toBe(401);
+  await first.stop();const second=await start();expect((await call(second.port,"/health")).status).toBe(200);
+  expect((await call(second.port,"/scenes")).status).toBe(404);await second.stop();expect(existsSync(join(config.dataDir,"control.sqlite"))).toBe(true);
+
 });
 
 it("variables PG heredadas no cambian destino, TLS, contraseña ni search_path", async () => {
diff --git a/src/infrastructure/server/database/config.test.ts b/src/infrastructure/server/database/config.test.ts
index f201dd5..57b0415 100644
--- a/src/infrastructure/server/database/config.test.ts
+++ b/src/infrastructure/server/database/config.test.ts
@@ -1,7 +1,7 @@
 import { expect, it } from "vitest";
 import { readDatabaseConfig } from "./config";
 import { readConfig } from "../../../server/config";
-import { createApi } from "../../../server/http";
+import { createApi } from "../../../server/legacy-http.fixture";
 
 it("defaults explícitos locales y selección independiente de NODE_ENV", () => {
   expect(readDatabaseConfig({ TTRPG_DATA_DIR: "/tmp/example", NODE_ENV: "production" })).toEqual({ driver: "sqlite", deployment: "local", dataDir: "/tmp/example" });
@@ -23,6 +23,6 @@ it.each([
   expect(() => readDatabaseConfig({ TTRPG_DATA_DIR: "/tmp/example", ...fields })).toThrow(/TTRPG_/);
 });
 it("guard antes de claves/rutas legacy y también en composición directa", () => {
-  expect(() => readConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u:secret@localhost/db" })).toThrow(/Falta migrar/);
+  expect(() => readConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u:secret@localhost/db" })).toThrow(/TTRPG_AUTH_SECRET/);
   expect(() => createApi({ host: "127.0.0.1", port: 0, dataDir: "/no-crear", publicOrigin: "", dmKey: "", playerKey: "", database: { deployment: "production", driver: "postgres", url: "postgres://u@localhost/db", tls: "verify-full" } }, { version: "test" })).toThrow(/Falta migrar/);
 });
diff --git a/src/infrastructure/server/identity/config.ts b/src/infrastructure/server/identity/config.ts
index 667593c..b90774a 100644
--- a/src/infrastructure/server/identity/config.ts
+++ b/src/infrastructure/server/identity/config.ts
@@ -6,9 +6,9 @@ export function validateIdentityConfig(config: IdentityConfig): void {
   if (origin.origin !== config.publicOrigin || !["http:", "https:"].includes(origin.protocol) || (origin.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) throw new Error("TTRPG_PUBLIC_ORIGIN requiere HTTPS fuera de loopback y un origen exacto.");
 }
 export function readIdentityConfig(env: NodeJS.ProcessEnv = process.env, required = false): IdentityConfig | undefined {
-  const enabled = env.TTRPG_IDENTITY_ENABLED ?? "false";
-  if (!["true", "false"].includes(enabled)) throw new Error("TTRPG_IDENTITY_ENABLED debe ser true o false.");
-  if (!required && enabled === "false") return undefined;
+  const enabled = env.TTRPG_IDENTITY_ENABLED ?? "true";
+  if (enabled !== "true") throw new Error("TTRPG_IDENTITY_ENABLED: retira el selector legado o usa true; configura TTRPG_AUTH_SECRET y ejecuta pnpm db:migrate.");
+  void required;
   const config = { secret: env.TTRPG_AUTH_SECRET ?? "", publicOrigin: env.TTRPG_PUBLIC_ORIGIN ?? "" };
   validateIdentityConfig(config);
   if ([env.TTRPG_DM_KEY, env.TTRPG_PLAYER_KEY].includes(config.secret)) throw new Error("TTRPG_AUTH_SECRET debe ser independiente de las claves legadas.");
diff --git a/src/infrastructure/server/identity/identity.contract.ts b/src/infrastructure/server/identity/identity.contract.ts
index a483c2c..e77a88f 100644
--- a/src/infrastructure/server/identity/identity.contract.ts
+++ b/src/infrastructure/server/identity/identity.contract.ts
@@ -15,7 +15,7 @@ import { openIdentity } from "./index";
 import { passwordCodec } from "./password";
 import type { IdentityService } from "../../../application/services/identity";
 import { createIdentityHttp } from "../../../server/identity-http";
-import { createApi } from "../../../server/http";
+import { createApi } from "../../../server/legacy-http.fixture";
 import { runIdentityCommand } from "../../../server/identity-commands";
 
 if (!process.env.TTRPG_TEST_DATABASE_URL || !process.env.TTRPG_TEST_DB_CA_FILE) throw new Error("test:identity requiere PostgreSQL temporal real y TLS: TTRPG_TEST_DATABASE_URL y TTRPG_TEST_DB_CA_FILE.");
@@ -337,7 +337,7 @@ it("API compilada activa identidad migrada y rechaza configuración inválida an
   });
   expect((await http(port, "/api/v1/health")).status).toBe(200);
   const login = await http(port, "/api/v1/identity/login", "POST", { email: adminInput.email, password: initial }); expect(login.status).toBe(200);
-  expect((await http(port, "/api/v1/scenes", "GET", undefined, token(login.cookie[0]))).status).toBe(401);
+  expect((await http(port, "/api/v1/scenes", "GET", undefined, token(login.cookie[0]))).status).toBe(404);
   child.kill("SIGTERM"); expect(await exited).toBe(0);
   const untouched = join(config.dataDir, "must-not-exist");
   await expect(promisify(execFile)(process.execPath, ["out/api/index.mjs"], { env: { ...baseEnv, TTRPG_DATA_DIR: untouched, TTRPG_AUTH_SECRET: "invalid" }, timeout: 10000 })).rejects.toMatchObject({ code: 1 });
diff --git a/src/infrastructure/server/identity/password.test.ts b/src/infrastructure/server/identity/password.test.ts
index 691d589..00e2cf0 100644
--- a/src/infrastructure/server/identity/password.test.ts
+++ b/src/infrastructure/server/identity/password.test.ts
@@ -23,7 +23,7 @@ describe("Política de identidad", () => {
     const id = new LoginQuota(); for (let n = 0; n < 5; n++) id.consume("ip" + n, "same"); expect(() => id.consume("other", "same")).toThrow();
     const ip = new LoginQuota(); for (let n = 0; n < 10; n++) ip.consume("same", "id" + n); expect(() => ip.consume("same", "other")).toThrow();
     expect(canonicalEmail("  USER+tag@Example.test  ")).toBe("user+tag@example.test"); expect(() => canonicalEmail("x\n@y.test")).toThrow();
-    expect(readIdentityConfig({})).toBeUndefined(); expect(() => readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true" })).toThrow();
+    expect(() => readIdentityConfig({})).toThrow(/TTRPG_AUTH_SECRET/); expect(() => readIdentityConfig({TTRPG_IDENTITY_ENABLED:"false"})).toThrow(/retira el selector legado/); expect(() => readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true" })).toThrow();
     const secret = randomBytes(32).toString("base64url");
     expect(readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true", TTRPG_AUTH_SECRET: secret, TTRPG_PUBLIC_ORIGIN: "https://example.test" })).toEqual({ secret, publicOrigin: "https://example.test" });
     expect(() => readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true", TTRPG_AUTH_SECRET: secret, TTRPG_DM_KEY: secret, TTRPG_PUBLIC_ORIGIN: "https://example.test" })).toThrow();
diff --git a/src/infrastructure/server/moderation/service-final.contract.ts b/src/infrastructure/server/moderation/service-final.contract.ts
new file mode 100644
index 0000000..66c93df
--- /dev/null
+++ b/src/infrastructure/server/moderation/service-final.contract.ts
@@ -0,0 +1,87 @@
+import { afterEach, expect, it } from "vitest";
+import { createHash, randomBytes, randomUUID } from "node:crypto";
+import { spawn, spawnSync } from "node:child_process";
+import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
+import { join, resolve } from "node:path";
+import { accounts, admin, changed, cleanup, directory, fixture, http, origin, png, raw, secret } from "../owned/fixtures";
+import { postgresPool } from "../database/driver";
+import { openServiceApi } from "../../../server/http";
+import { invalidateRestoredAccess } from "../invitations/restore-access";
+import { snapshot, stream, context, invitationSecret } from "./fixtures";
+import { systemSeeds } from "../../../domain/systems/system-catalog";
+import type { DatabaseConfig } from "../database/config";
+const config=(database:DatabaseConfig,authSecret=secret)=>({database,identity:{publicOrigin:origin,secret:authSecret},publicOrigin:origin,host:"127.0.0.1",port:0,dataDir:database.driver==="sqlite"?database.dataDir:"",dmKey:"",playerKey:""});
+async function inventory(database:DatabaseConfig){return raw(database,async c=>{const tables=(await c.query(database.driver==="sqlite"?"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'":"SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows;const result:Record<string,{count:number;hash:string}>={};for(const row of tables){const name=String(row.name);if(!/^[a-z_][a-z0-9_]*$/.test(name))throw new Error("Tabla de fixture inesperada");const rows=(await c.query(`SELECT * FROM "${name}"`)).rows;const serialized=rows.map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort();result[name]={count:rows.length,hash:createHash("sha256").update(serialized.join("\n")).digest("hex")};}return result;});}
+afterEach(async()=>{for(const action of cleanup.splice(0).reverse())await action();});
+for(const kind of ["sqlite","postgres"] as const){
+  it(`servicio final ${kind}: dos propietarios, A1/A2/B1, catálogo retenido y corte sin rutas globales`,async()=>{
+    const database=await fixture(kind), users=await accounts(database);await users.identity.close();
+    const app=await openServiceApi(config(database),"3.13.0");cleanup.push(()=>app.close());const port=await app.listen();
+    const health=await http(port,"/api/v1/health","");expect(health.json.version).toBe("3.13.0");
+    for(const route of ["auth/login","auth/session","auth/logout","scenes","assets/resolve","monster-templates","libraries/monsters","table/state","table/events","dice/session"]){const r=await http(port,`/api/v1/${route}`,"ttrpg_session=legacy");expect([404,410]).toContain(r.status);expect(r.bytes.toString()).not.toContain("<!doctype");}
+    const create=async(cookie:string,name:string,systemId:string)=>{const r=await http(port,"/games",cookie,"POST",{name,systemRef:{systemId,version:1}});expect(r.status).toBe(201);return r.json.game as {id:string;revision:number};};
+    const a1=await create(users.aCookie,"A1","generic"),a2=await create(users.aCookie,"A2","dnd-55e"),b1=await create(users.bCookie,"B1","generic");
+    expect((await http(port,`/games/${b1.id}`,users.aCookie)).status).toBe(404);expect((await http(port,`/games/${a1.id}`,users.adminCookie)).status).toBe(403);
+    const uploaded=await http(port,"/assets",users.aCookie,"POST",png,{"content-type":"image/png"});expect(uploaded.status).toBe(201);const asset=(uploaded.json.asset as {id:string}).id;
+    const image=snapshot(asset);const stored=await http(port,"/scenes",users.aCookie,"POST",{name:"Privada A",scene:image.scene});expect(stored.status).toBe(201);const resource=stored.json.resource as {id:string;revision:number};
+    const definitionRef={scope:"catalog",systemId:"generic",version:1,templateId:"generic-markdown"};
+    const defined=await http(port,"/scenes",users.aCookie,"POST",{name:"Definiciones exactas",scene:{...image.scene,sceneAside:{...image.scene.sceneAside,monsters:["first","second"].map(id=>({id,name:id,templateId:"generic-markdown",notes:"# Ficha",imagePath:null,visibleToPlayer:false}))}},bindings:{monsters:{first:definitionRef,second:definitionRef}}});expect(defined.status).toBe(201);
+    const definedId=(defined.json.resource as {id:string}).id;const definitions=await http(port,`/definitions/scenes/${definedId}`,users.aCookie);expect(definitions.status).toBe(200);expect(definitions.json.templates).toHaveLength(1);expect(definitions.json.monsters).toEqual({first:0,second:0});expect((await http(port,`/definitions/scenes/${definedId}`,users.bCookie)).status).toBe(404);
+    for(const path of [`/scenes/${resource.id}`,`/scenes/${resource.id}/export`,`/assets/${asset}`,`/definitions/scenes/${resource.id}`])expect((await http(port,path,users.bCookie)).status).toBe(404);
+    expect((await http(port,`/assets/${asset}`,users.bCookie,"HEAD")).status).toBe(404);
+    expect((await http(port,"/assets/resolve",users.bCookie,"POST",{references:[`asset:${asset}`]})).json.assets).toEqual([{reference:`asset:${asset}`,url:null}]);
+    const start=await app.backend.invitations.start(users.aCookie,a1.id,null,1,randomUUID());
+    const guests=await Promise.all(["Mismo alias","Mismo alias","日本語"].map(alias=>app.backend.invitations.guests.admit(a1.id,{alias,secret:invitationSecret(start)},randomUUID(),null)));
+    const listeners=guests.map(g=>stream(port,a1.id,`ttrpg_guest=${g.token}`));await Promise.all(listeners.map(s=>s.until(()=>s.events.length>0)));
+    const publish=await http(port,`/games/${a1.id}/table/scene`,users.aCookie,"POST",{...context(start),command:{requestId:randomUUID(),context:null,payload:image},sceneResourceId:resource.id});expect(publish.status).toBe(200);
+    await listeners[0].until(()=>listeners[0].events.some(e=>e.type==="scene"));expect(listeners[0].bytes).not.toContain("PRIVADO_CENTINELA");
+    const key=randomUUID(),payload={...context(start),expectedInvitationVersion:1},kick=`/games/${a1.id}/participants/${guests[0].guest.participantId}/kick`;
+    expect((await http(port,kick,users.aCookie,"POST",payload,{"if-match":"1","idempotency-key":key})).status).toBe(200);await listeners[0].until(()=>listeners[0].ended);expect(listeners[1].ended).toBe(false);
+    const replay=await http(port,kick,users.aCookie,"POST",payload,{"if-match":"1","idempotency-key":key});expect(replay.json.replayed).toBe(true);expect(replay.json).not.toHaveProperty("invitationUrl");
+    expect((await http(port,`/api/v1/games/${a1.id}/assets/${asset}`,`ttrpg_guest=${guests[0].token}`)).status).toBe(401);
+    expect((await http(port,`/api/v1/games/${a1.id}/assets/${asset}`,`ttrpg_guest=${guests[1].token}`)).bytes).toEqual(png);
+    const disabled=await http(port,"/api/v1/admin/systems/generic/versions/1/availability",users.adminCookie,"PATCH",{availability:"disabled"},{"if-match":"1"});expect(disabled.status).toBe(200);
+    expect((await http(port,`/games/${a1.id}/configuration`,users.aCookie)).status).toBe(200);
+    expect((await http(port,"/games",users.aCookie,"POST",{name:"Rechazada",systemRef:{systemId:"generic",version:1}})).status).toBe(409);
+    expect((await http(port,"/games",users.aCookie)).json.games).toHaveLength(2);expect(a2.id).not.toBe(a1.id);
+    if(kind==="postgres")expect(database).not.toHaveProperty("dataDir");
+  },60000);
+  it(`respaldo integral ${kind}, restauración aislada e invalidación antes de servir`,async()=>{
+    const database=await fixture(kind),u=await accounts(database);await u.identity.close();const app=await openServiceApi(config(database),"3.13.0");
+    const game=await app.backend.identity.authorized(u.aCookie,"dm",(_,tx)=>tx.games.create(u.a.id,"Respaldo A",{systemId:"generic",version:1}));
+    await app.backend.identity.authorized(u.bCookie,"dm",(_,tx)=>tx.games.create(u.b.id,"Respaldo B",{systemId:"dnd-55e",version:1}));
+    const start=await app.backend.invitations.start(u.aCookie,game.id,null,1,randomUUID()),guest=await app.backend.invitations.guests.admit(game.id,{alias:"Restaurado",secret:invitationSecret(start)},randomUUID(),null);
+    const asset=randomUUID();await app.backend.identity.authorized(u.aCookie,"dm",(_,tx)=>tx.assets.create(asset,"image/png",png));
+    await app.backend.identity.authorized(u.adminCookie,"admin",(_,tx)=>tx.systems.draft({systemId:"generic",version:2},systemSeeds[0].definition,0));
+    const sourcePort=await app.listen();const saved=await http(sourcePort,"/scenes",u.aCookie,"POST",{name:"Escena de respaldo",scene:snapshot(asset).scene});expect(saved.status).toBe(201);const sceneId=(saved.json.resource as {id:string}).id;
+    await app.backend.identity.authorized(u.aCookie,"dm",(_,tx)=>tx.links.link(game.id,"scenes",sceneId));await app.close();
+    const sourceInventory=await inventory(database);
+    let restored:DatabaseConfig;
+    if(database.driver==="sqlite"){
+      const target=directory();for(const name of readdirSync(database.dataDir).filter(name=>/^control\.sqlite(?:-wal|-shm)?$/.test(name)))copyFileSync(join(database.dataDir,name),join(target,name));restored={...database,dataDir:target};expect(statSync(join(target,"control.sqlite")).size).toBeGreaterThan(0);
+    }else{
+      const name=`ttrpg_restore_${randomUUID().replaceAll("-","")}`,pool=postgresPool(admin);try{await pool.query(`CREATE DATABASE "${name}"`);}finally{await pool.end();}
+      cleanup.push(async()=>{const p=postgresPool(admin);try{await p.query(`DROP DATABASE "${name}"`);}finally{await p.end();}});const url=new URL(database.url);const targetUrl=new URL(database.url);targetUrl.pathname=`/${name}`;restored={...database,url:targetUrl.href};
+      const tools=JSON.parse(readFileSync(process.env.TTRPG_TEST_PG_TOOLS??"/tmp/ttrpg-auth-pg-tools.json","utf8")) as {pg_dump:string;pg_restore:string};
+      const temp=directory(),pass=join(temp,"pgpass"),dump=join(temp,"backup.dump");const escape=(s:string)=>s.replaceAll("\\","\\\\").replaceAll(":","\\:");writeFileSync(pass,`${escape(url.hostname)}:${url.port||"5432"}:*:${escape(decodeURIComponent(url.username))}:${escape(decodeURIComponent(url.password))}\n`,{mode:0o600});
+      const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGSSLMODE:"verify-full",PGSSLROOTCERT:database.caFile,PGPASSFILE:pass};
+      const dumped=spawnSync(tools.pg_dump,["--format=custom","--file",dump],{env:{...env,PGDATABASE:decodeURIComponent(url.pathname.slice(1))},stdio:"pipe"});expect(dumped.status,"pg_dump debe terminar sin imprimir secretos").toBe(0);
+      const recovered=spawnSync(tools.pg_restore,["--no-owner","--no-privileges","--exit-on-error","--dbname",name,dump],{env,stdio:"pipe"});expect(recovered.status,"pg_restore aislado debe terminar correctamente").toBe(0);
+    }
+    expect(await raw(restored,async c=>(await c.query("SELECT count(*) AS n FROM ttrpg_games")).rows[0].n)).toEqual(await raw(database,async c=>(await c.query("SELECT count(*) AS n FROM ttrpg_games")).rows[0].n));
+    expect(await inventory(restored)).toEqual(sourceInventory);
+    await invalidateRestoredAccess(restored);const next=await openServiceApi(config(restored,randomBytes(32).toString("base64url")),"3.13.0");cleanup.push(()=>next.close());const port=await next.listen();
+    expect((await http(port,"/api/v1/identity/session",u.aCookie)).status).toBe(401);expect((await http(port,`/api/v1/games/${game.id}/guest/session`,`ttrpg_guest=${guest.token}`)).status).toBe(401);
+    const login=await next.backend.identity.login(u.a.email,changed,"restore-a"),b=await next.backend.identity.login(u.b.email,changed,"restore-b");expect((await http(port,`/assets/${asset}`,login.cookie)).bytes).toEqual(png);expect((await http(port,`/assets/${asset}`,b.cookie)).status).toBe(404);expect((await http(port,`/scenes/${sceneId}`,login.cookie)).status).toBe(200);expect((await http(port,`/scenes/${sceneId}`,b.cookie)).status).toBe(404);
+    expect((await next.backend.identity.listDms((await next.backend.identity.login("admin@example.test",changed,"restore-admin")).cookie,50,0)).total).toBe(2);
+  },60000);
+  it(`artefacto compilado ${kind} carga .env, precedencia y no abre SQLite auxiliar`,async()=>{
+    const database=await fixture(kind),dir=directory();mkdirSync(join(dir,"web"));writeFileSync(join(dir,"web/index.html"),"<!doctype html><title>Acceso fixture</title>");
+    const values:Record<string,string>={TTRPG_PORT:"0",TTRPG_HOST:"127.0.0.1",TTRPG_PUBLIC_ORIGIN:origin,TTRPG_AUTH_SECRET:secret,TTRPG_WEB_DIR:join(dir,"web"),TTRPG_DB_DRIVER:database.driver,TTRPG_DEPLOYMENT:database.deployment,...(database.driver==="sqlite"?{TTRPG_DATA_DIR:database.dataDir}:{TTRPG_DATABASE_URL:database.url,TTRPG_DB_TLS:database.tls,TTRPG_DB_CA_FILE:database.caFile!})};
+    const file=join(dir,".env");writeFileSync(file,Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join("\n"),{mode:0o600});
+    const child=spawn(process.execPath,[`--env-file=${file}`,resolve("out/api/index.mjs")],{cwd:dir,env:{PATH:process.env.PATH,TTRPG_HOST:"127.0.0.1"},stdio:["ignore","pipe","pipe"]});cleanup.push(async()=>{if(child.exitCode===null){child.kill("SIGTERM");await new Promise<void>(resolve=>child.once("exit",()=>resolve()));}});
+    const port=await new Promise<number>((resolve,reject)=>{let output="";const timer=setTimeout(()=>reject(new Error("API compilada no arrancó")),15000);child.once("exit",()=>{clearTimeout(timer);reject(new Error("API compilada terminó antes de escuchar"));});child.stdout.on("data",chunk=>{output+=chunk;const m=/Puerto: (\d+)/.exec(output);if(m){clearTimeout(timer);resolve(Number(m[1]));}});});
+    expect((await http(port,"/api/v1/health","")).status).toBe(200);expect((await http(port,"/api/v1/scenes","ttrpg_session=old")).status).toBe(404);
+    expect(readdirSync(dir).filter(n=>n.endsWith(".sqlite"))).toEqual([]);
+  },30000);
+}
diff --git a/src/renderer/src/App.tsx b/src/renderer/src/App.tsx
index 4247c69..18f25fe 100644
--- a/src/renderer/src/App.tsx
+++ b/src/renderer/src/App.tsx
@@ -303,7 +303,7 @@ export function App({ service }: { readonly service?: ServiceWorkspace } = {}):
   const nativeMenusApi = useTtrpgApi("nativeMenus");
   const librariesApi = useTtrpgApi("libraries");
   const [scene, setSceneState] = useState<SceneDocument>(() => {
-    if (service) return createEmptyScene();
+    if (service) { const empty=createEmptyScene(); return {...empty,settings:{...empty.settings,diagonalMode:service.defaultDiagonalMode??empty.settings.diagonalMode}}; }
     try {
       const snapshot = sessionStorage.getItem("ttrpg:session-scene");
       if (snapshot !== null) {
@@ -1574,7 +1574,8 @@ export function App({ service }: { readonly service?: ServiceWorkspace } = {}):
 
   const resetToNewScene = useCallback((): void => {
     resetMapImageSession();
-    const defaultScene = createEmptyScene();
+    const empty = createEmptyScene();
+    const defaultScene = service ? {...empty,settings:{...empty.settings,diagonalMode:service.defaultDiagonalMode??empty.settings.diagonalMode}} : empty;
     if (!service) sessionStorage.removeItem("ttrpg:session-scene");
     setScene(defaultScene);
     setSceneAside(createDefaultSceneAside());
@@ -1974,6 +1975,7 @@ export function App({ service }: { readonly service?: ServiceWorkspace } = {}):
     lastSavedSceneJsonRef.current = JSON.stringify({ ...sceneRef.current, sceneAside });
     return true;
   }
+  useEffect(() => service?.registerLeave?.(allowServiceLeave));
   async function handleServiceAction(action: "import" | "export" | "logout"): Promise<void> {
     if (!service) return;
     try {
@@ -2052,6 +2054,7 @@ export function App({ service }: { readonly service?: ServiceWorkspace } = {}):
       setScene(result.scene);
       setMapAnnotationModal(null);
       setSceneLinkModalId(null);
+      if(service) await refreshMonsterTemplates();
       const loadedSceneAside = result.scene.sceneAside ?? createDefaultSceneAside();
       setSceneAside(loadedSceneAside);
       if (actionLabel === "cargada") {
@@ -3432,7 +3435,7 @@ export function App({ service }: { readonly service?: ServiceWorkspace } = {}):
     <main className="app-shell vtt-interface" aria-label="TTRPG Effects">
       <WorkspaceHeader
         sceneName={currentFilePath ? service?.browser.name(currentFilePath) ?? getFileBaseName(currentFilePath) : "Escena sin guardar"}
-        serviceActions={service ? { onImport: () => void handleServiceAction("import"), onExport: () => void handleServiceAction("export"), onLogout: () => void handleServiceAction("logout"), onTemplates: () => setIsMonsterTemplateManagerOpen(true) } : undefined}
+        serviceActions={service ? { onImport: () => void handleServiceAction("import"), onExport: () => void handleServiceAction("export"), onLogout: () => void handleServiceAction("logout"), onTemplates: undefined } : undefined}
         mapName={scene.maps.find(map => map.id === scene.activeMapId)?.name ?? "Sin mapa"}
         busy={isBusy}
         canCreate={canCreateNewScene}
diff --git a/src/renderer/src/components/aside/MonsterLibraryModal.tsx b/src/renderer/src/components/aside/MonsterLibraryModal.tsx
index b78ab9f..6216e2c 100644
--- a/src/renderer/src/components/aside/MonsterLibraryModal.tsx
+++ b/src/renderer/src/components/aside/MonsterLibraryModal.tsx
@@ -1,4 +1,4 @@
-import { useTtrpgApi } from "../../client/ClientProvider";
+import { useTtrpgApi, useTtrpgClient } from "../../client/ClientProvider";
 import { useEffect, useMemo, useRef, useState, type JSX } from "react";
 import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
 import {
@@ -32,6 +32,7 @@ export function MonsterLibraryModal({
   onAddMonster,
   onClose
 }: MonsterLibraryModalProps): JSX.Element {
+  const client = useTtrpgClient();
   const librariesApi = useTtrpgApi("libraries");
   const imagesApi = useTtrpgApi("images");
   const [query, setQuery] = useState("");
@@ -40,13 +41,13 @@ export function MonsterLibraryModal({
   const [isLoading, setIsLoading] = useState(false);
   const [feedback, setFeedback] = useState<Feedback | null>(null);
   const [isCreating, setIsCreating] = useState(false);
-  const [draft, setDraft] = useState<NewMonsterDraft>(() => createEmptyDraft(templates));
+  const [draft, setDraft] = useState<NewMonsterDraft>(() => createEmptyDraft(templates,!!client?.presentations));
 
   const libraryGeneration = useRef(0);
   useEffect(() => {
     libraryGeneration.current++;
     setIsCreating(false);
-    setDraft(createEmptyDraft(templates));
+    setDraft(createEmptyDraft(templates,!!client?.presentations));
     return () => { libraryGeneration.current++; };
   }, [librariesApi, imagesApi]);
 
@@ -89,7 +90,10 @@ export function MonsterLibraryModal({
     [templates]
   );
 
-  function addEntryToScene(entry: MonsterLibraryEntry): void {
+  async function addEntryToScene(entry: MonsterLibraryEntry): Promise<void> {
+    const generation = libraryGeneration.current;
+    try { await client?.presentations?.validateLibraryUse(entry.id); } catch(error) { setFeedback({kind:"error",message:error instanceof Error?error.message:"No se puede crear este vínculo."});return; }
+    if(generation !== libraryGeneration.current)return;
     onAddMonster(createSceneMonsterFromLibraryEntry(entry, existingIds));
     onClose();
   }
@@ -135,7 +139,7 @@ export function MonsterLibraryModal({
       return;
     }
 
-    addEntryToScene(result.entry);
+    await addEntryToScene(result.entry);
   }
 
   return (
@@ -181,7 +185,7 @@ export function MonsterLibraryModal({
                   <div className="monster-library-card__body">
                     <strong>{entry.name}</strong>
                     <span>{entry.system}{entry.templateId !== null ? ` · ${templateById.get(entry.templateId)?.name ?? entry.templateId}` : ""}</span>
-                    <button type="button" onClick={() => addEntryToScene(entry)}>
+                    <button type="button" onClick={() => void addEntryToScene(entry)}>
                       Agregar a escena
                     </button>
                   </div>
@@ -212,7 +216,7 @@ export function MonsterLibraryModal({
                     value={draft.templateId ?? ""}
                     onChange={(event) => handleTemplateChange(event.currentTarget.value)}
                   >
-                    <option value="">Sin template</option>
+                    {(!client?.presentations || templates.some(t=>t.id==="generic-markdown"))&&<option value="">Sin template</option>}
                     {templates.map((template) => (
                       <option key={template.id} value={template.id}>
                         {template.name} ({template.system})
@@ -250,13 +254,13 @@ export function MonsterLibraryModal({
   );
 }
 
-function createEmptyDraft(templates: readonly MonsterTemplate[]): NewMonsterDraft {
+function createEmptyDraft(templates: readonly MonsterTemplate[], explicit=false): NewMonsterDraft {
   const defaultTemplate = templates[0] ?? null;
 
   return {
     name: "",
     system: defaultTemplate?.system ?? "Sin sistema",
-    templateId: null,
+    templateId: explicit ? defaultTemplate?.id ?? null : null,
     contentMarkdown: "",
     imagePath: null,
     imageUrl: null
diff --git a/src/renderer/src/components/aside/MonsterSection.tsx b/src/renderer/src/components/aside/MonsterSection.tsx
index 841d0ab..9f5fa4b 100644
--- a/src/renderer/src/components/aside/MonsterSection.tsx
+++ b/src/renderer/src/components/aside/MonsterSection.tsx
@@ -1,4 +1,4 @@
-import { useTtrpgApi } from "../../client/ClientProvider";
+import { useTtrpgApi, useTtrpgClient } from "../../client/ClientProvider";
 import { useCallback, useEffect, useState, type JSX } from "react";
 import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
 import type { SceneMonster } from "../../../../domain/sessions/scene-aside";
@@ -23,6 +23,8 @@ export function MonsterSection({
   onRemove,
   onToggleVisibility
 }: MonsterSectionProps): JSX.Element {
+  const client = useTtrpgClient();
+  const forMonster = (m: SceneMonster) => client?.presentations?.forMonster(m.id,m.templateId ?? null,templates) ?? templates;
   const [detailMonster, setDetailMonster] = useState<SceneMonster | null>(null);
   const [editingMonster, setEditingMonster] = useState<SceneMonster | null | "new">(null);
   const [isLibraryOpen, setIsLibraryOpen] = useState(false);
@@ -77,7 +79,7 @@ export function MonsterSection({
       {syncedDetail !== null && (
         <MonsterDetailModal
           monster={syncedDetail}
-          templates={templates}
+          templates={forMonster(syncedDetail)}
           onClose={closeDetail}
           onToggleVisibility={() => onToggleVisibility(syncedDetail.id)}
           onEdit={() => handleEditFromDetail(syncedDetail)}
@@ -89,7 +91,7 @@ export function MonsterSection({
         <MonsterModal
           initial={editingMonster === "new" ? null : editingMonster}
           existingIds={existingIds}
-          templates={templates}
+          templates={editingMonster === "new" ? templates : forMonster(editingMonster)}
           onSave={handleSave}
           onClose={() => setEditingMonster(null)}
         />
diff --git a/src/renderer/src/components/aside/MonsterTemplateFields.tsx b/src/renderer/src/components/aside/MonsterTemplateFields.tsx
new file mode 100644
index 0000000..71f98b7
--- /dev/null
+++ b/src/renderer/src/components/aside/MonsterTemplateFields.tsx
@@ -0,0 +1,10 @@
+import { useId, useMemo, useState } from "react";
+import { getMonsterTemplateRenderClass, scopeMonsterTemplateCss, type MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
+import { renderMarkdown } from "./markdown";
+/** Campos compartidos por el gestor local y los borradores del catálogo de servicio. */
+export function MonsterTemplateFields({template,onChange}:{template:MonsterTemplate;onChange:(template:MonsterTemplate)=>void}){
+  const[preview,setPreview]=useState(false);const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");const scope=`template-preview-${id}`;
+  const html=useMemo(()=>renderMarkdown(template.markdown),[template.markdown]);
+  const css=useMemo(()=>scopeMonsterTemplateCss(template.css,scope),[template.css,scope]);
+  return <div className="monster-template-fields"><label>Nombre<input required maxLength={200} value={template.name} onChange={e=>onChange({...template,name:e.target.value})}/></label><label>Sistema<input required maxLength={200} value={template.system} onChange={e=>onChange({...template,system:e.target.value})}/></label><button type="button" onClick={()=>setPreview(p=>!p)}>{preview?"Editar contenido":"Previsualizar ficha"}</button>{preview?<div className={`markdown-content ${scope}`}><style>{css}</style><div className={getMonsterTemplateRenderClass(template)} dangerouslySetInnerHTML={{__html:html}}/></div>:<><label>Markdown<textarea rows={8} spellCheck={false} value={template.markdown} onChange={e=>onChange({...template,markdown:e.target.value})}/></label><p>Define campos escribiendo marcadores como {"{{Nombre}}"} o {"{{CA}}"} en el Markdown. La ficha conserva estos marcadores editables.</p><label>CSS scoped<textarea rows={6} spellCheck={false} value={template.css} onChange={e=>onChange({...template,css:e.target.value})}/></label></>}</div>;
+}
diff --git a/src/renderer/src/components/aside/MonsterTemplateManagerModal.tsx b/src/renderer/src/components/aside/MonsterTemplateManagerModal.tsx
index c45c09e..30a8f26 100644
--- a/src/renderer/src/components/aside/MonsterTemplateManagerModal.tsx
+++ b/src/renderer/src/components/aside/MonsterTemplateManagerModal.tsx
@@ -1,14 +1,12 @@
-import { useMemo, useState, type JSX } from "react";
+import { MonsterTemplateFields } from "./MonsterTemplateFields";
+import { useState, type JSX } from "react";
 import type { MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
 import {
-  createEmptyMonsterTemplate,
-  getMonsterTemplateRenderClass,
-  scopeMonsterTemplateCss
+  createEmptyMonsterTemplate
 } from "../../../../domain/monster-templates/monster-template";
 import { ensureUniqueSlug, slugify } from "../../../../domain/sessions/scene-aside";
 import { FeedbackAlert, type Feedback } from "./FeedbackAlert";
 import { ModalBackdrop } from "./ModalBackdrop";
-import { renderMarkdown } from "./markdown";
 
 interface MonsterTemplateManagerModalProps {
   readonly templates: readonly MonsterTemplate[];
@@ -26,17 +24,8 @@ export function MonsterTemplateManagerModal({
   const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
   const selectedTemplate = templates.find((template) => template.id === selectedId) ?? templates[0] ?? null;
   const [draft, setDraft] = useState<MonsterTemplate | null>(selectedTemplate);
-  const [isPreviewMode, setIsPreviewMode] = useState(false);
   const [feedback, setFeedback] = useState<Feedback | null>(null);
 
-  const html = useMemo(() => renderMarkdown(draft?.markdown ?? ""), [draft?.markdown]);
-  const scopeClass = draft !== null ? `monster-template-manager-${toCssSafeId(draft.id)}` : "";
-  const scopedCss = useMemo(
-    () => draft !== null ? scopeMonsterTemplateCss(draft.css, scopeClass) : "",
-    [draft, scopeClass]
-  );
-  const renderClass = draft !== null ? getMonsterTemplateRenderClass(draft) : "monster-card";
-
   function selectTemplate(template: MonsterTemplate): void {
     setSelectedId(template.id);
     setDraft(template);
@@ -51,7 +40,6 @@ export function MonsterTemplateManagerModal({
     const template = createEmptyMonsterTemplate(id);
     setSelectedId(template.id);
     setDraft(template);
-    setIsPreviewMode(false);
     setFeedback({ message: "Nuevo template sin guardar.", kind: "info" });
   }
 
@@ -68,7 +56,6 @@ export function MonsterTemplateManagerModal({
     };
     setSelectedId(next.id);
     setDraft(next);
-    setIsPreviewMode(false);
     setFeedback({ message: "Copia sin guardar.", kind: "info" });
   }
 
@@ -121,23 +108,6 @@ export function MonsterTemplateManagerModal({
           {draft !== null ? (
             <section className="monster-template-manager__editor">
               <div className="monster-template-manager__toolbar">
-                <label>
-                  Nombre
-                  <input
-                    value={draft.name}
-                    onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })}
-                  />
-                </label>
-                <label>
-                  Sistema
-                  <input
-                    value={draft.system}
-                    onChange={(event) => setDraft({ ...draft, system: event.currentTarget.value })}
-                  />
-                </label>
-                <button type="button" onClick={() => setIsPreviewMode((value) => !value)}>
-                  {isPreviewMode ? "Editar" : "Previsualizar"}
-                </button>
                 <button type="button" onClick={duplicateTemplate}>
                   Duplicar
                 </button>
@@ -151,38 +121,7 @@ export function MonsterTemplateManagerModal({
 
               {feedback !== null ? <FeedbackAlert feedback={feedback} /> : null}
 
-              {isPreviewMode ? (
-                <div className="monster-template-manager__preview">
-                  {scopedCss !== "" ? <style>{scopedCss}</style> : null}
-                  <div
-                    className={`markdown-content ${scopeClass}`}
-                  >
-                    <div
-                      className={renderClass}
-                      dangerouslySetInnerHTML={{ __html: html }}
-                    />
-                  </div>
-                </div>
-              ) : (
-                <div className="monster-template-manager__fields">
-                  <label>
-                    Markdown
-                    <textarea
-                      value={draft.markdown}
-                      onChange={(event) => setDraft({ ...draft, markdown: event.currentTarget.value })}
-                      spellCheck={false}
-                    />
-                  </label>
-                  <label>
-                    CSS scoped
-                    <textarea
-                      value={draft.css}
-                      onChange={(event) => setDraft({ ...draft, css: event.currentTarget.value })}
-                      spellCheck={false}
-                    />
-                  </label>
-                </div>
-              )}
+              <MonsterTemplateFields template={draft} onChange={setDraft}/>
             </section>
           ) : (
             <section className="monster-template-manager__empty">
@@ -194,7 +133,3 @@ export function MonsterTemplateManagerModal({
     </ModalBackdrop>
   );
 }
-
-function toCssSafeId(value: string): string {
-  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
-}
diff --git a/src/renderer/src/components/workspace/WorkspaceHeader.tsx b/src/renderer/src/components/workspace/WorkspaceHeader.tsx
index 903584e..868f281 100644
--- a/src/renderer/src/components/workspace/WorkspaceHeader.tsx
+++ b/src/renderer/src/components/workspace/WorkspaceHeader.tsx
@@ -4,7 +4,7 @@ import { ChevronDown, Dices, FilePlus, FolderOpen, Monitor, PanelLeft, PanelRigh
 import logoUrl from "../../../../../assets/logo/ttrpg-effects-icon.png";
 
 interface WorkspaceHeaderProps {
-  readonly serviceActions?: { onImport: () => void; onExport: () => void; onLogout: () => void; onTemplates: () => void };
+  readonly serviceActions?: { onImport: () => void; onExport: () => void; onLogout: () => void; onTemplates?: () => void };
   readonly sceneName: string;
   readonly mapName: string;
   readonly busy: boolean;
@@ -55,7 +55,7 @@ export function WorkspaceHeader(props: WorkspaceHeaderProps): JSX.Element {
         {props.serviceActions && <>
           <button disabled={props.busy} onClick={() => run(props.serviceActions!.onImport)}>Importar archivo .ttrpgscene</button>
           <button disabled={props.busy} onClick={() => run(props.serviceActions!.onExport)}>Exportar archivo .ttrpgscene</button>
-          <button disabled={props.busy} onClick={() => run(props.serviceActions!.onTemplates)}>Administrar plantillas</button>
+          {props.serviceActions.onTemplates && <button disabled={props.busy} onClick={() => run(props.serviceActions!.onTemplates!)}>Administrar plantillas</button>}
           <p className="service-menu-note">Servicio privado · DM<br />Proyección y dados compartidos disponibles.</p>
           <button disabled={props.busy} onClick={() => run(props.serviceActions!.onLogout)}>Cerrar sesión</button>
         </>}
diff --git a/src/renderer/src/styles.css b/src/renderer/src/styles.css
index f828a3f..44dae19 100644
--- a/src/renderer/src/styles.css
+++ b/src/renderer/src/styles.css
@@ -3679,13 +3679,13 @@ body {
 
 .monster-template-manager__toolbar {
   display: grid;
-  grid-template-columns: minmax(0, 1fr) minmax(0, 0.7fr) repeat(4, auto);
+  grid-template-columns: repeat(3, max-content);
   align-items: end;
   gap: 8px;
 }
 
 .monster-template-manager__toolbar label,
-.monster-template-manager__fields label {
+.monster-template-fields label {
   display: grid;
   gap: 4px;
   color: #c8d2cc;
@@ -3711,9 +3711,9 @@ body {
   line-height: 1.45;
 }
 
-.monster-template-manager__fields {
+.monster-template-fields {
   display: grid;
-  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
+  grid-template-columns: minmax(0, 1fr);
   gap: 12px;
   min-height: 0;
 }
@@ -5769,3 +5769,15 @@ body {
   min-width: 0;
   width: 100%;
 }
+
+.monster-template-fields { min-width:0; align-content:start; }
+.monster-template-fields label { min-width:0; }
+.monster-template-fields input,.monster-template-fields textarea { box-sizing:border-box; width:100%; min-width:0; }
+.monster-template-fields>button { justify-self:start; }
+.monster-template-fields p { margin:0; overflow-wrap:anywhere; }
+.monster-template-fields .markdown-content { overflow:auto; min-width:0; }
+@media(max-width:900px) {
+  .monster-template-manager__body { grid-template-columns: minmax(0,1fr); }
+  .monster-template-manager__list { max-height:160px; }
+  .monster-template-manager textarea { min-height:160px; }
+}
diff --git a/src/server/config.ts b/src/server/config.ts
index 928ca20..664d3ca 100644
--- a/src/server/config.ts
+++ b/src/server/config.ts
@@ -17,15 +17,15 @@ export interface ServerConfig {
 }
 export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
   const database = readDatabaseConfig(env);
-  assertLegacyDatabase(database);
+
   const config = {
-    database, identity: readIdentityConfig(env),
+    database, identity: readIdentityConfig(env, true),
     webDir: env.TTRPG_WEB_DIR,
     host: env.TTRPG_HOST ?? "127.0.0.1", port: Number(env.TTRPG_PORT ?? "8787"),
     dataDir: env.TTRPG_DATA_DIR ?? "", publicOrigin: env.TTRPG_PUBLIC_ORIGIN ?? "",
-    dmKey: env.TTRPG_DM_KEY ?? "", playerKey: env.TTRPG_PLAYER_KEY ?? ""
+    dmKey: "", playerKey: ""
   };
-  validateConfig(config);
+  validateServiceConfig(config);
   return config;
 }
 export function validateConfig(c: ServerConfig): void {
@@ -42,3 +42,12 @@ export function validateConfig(c: ServerConfig): void {
   if (origin.origin !== c.publicOrigin || !["http:", "https:"].includes(origin.protocol)) throw new Error("TTRPG_PUBLIC_ORIGIN debe contener solo esquema, host y puerto.");
   if (origin.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new Error("Un origen remoto requiere HTTPS mediante proxy inverso.");
 }
+
+/** Configuración de la composición de cuentas; no abre almacenes legados. */
+export function validateServiceConfig(c: ServerConfig): asserts c is ServerConfig & { database: DatabaseConfig; identity: IdentityConfig } {
+  if (!c.database || !c.identity) throw new Error("TTRPG_AUTH_SECRET y persistencia son obligatorios; ejecuta setup:env, db:migrate e identity:bootstrap.");
+  validateDatabaseConfig(c.database); validateIdentityConfig(c.identity);
+  if (c.identity.publicOrigin !== c.publicOrigin) throw new Error("TTRPG_PUBLIC_ORIGIN debe coincidir con identidad.");
+  if (c.webDir !== undefined && !isAbsolute(c.webDir)) throw new Error("TTRPG_WEB_DIR debe ser absoluto.");
+  if (!c.host || !Number.isInteger(c.port) || c.port < 0 || c.port > 65535) throw new Error("TTRPG_HOST/TTRPG_PORT inválidos.");
+}
diff --git a/src/server/environment-setup.test.ts b/src/server/environment-setup.test.ts
index 7c36346..16b60be 100644
--- a/src/server/environment-setup.test.ts
+++ b/src/server/environment-setup.test.ts
@@ -27,13 +27,12 @@ it("prepara claves persistentes y permisos privados sin sobrescribir configuraci
   const original = readFileSync(join(root, ".env"), "utf8");
   const api = parseEnv(original);
   expect(api.TTRPG_DATA_DIR).toBe(data);
-  expect(api.TTRPG_DM_KEY).toMatch(/^[a-f0-9]{64}$/);
-  expect(api.TTRPG_PLAYER_KEY).toMatch(/^[a-f0-9]{64}$/);
-  expect(api.TTRPG_DM_KEY).not.toBe(api.TTRPG_PLAYER_KEY);
-  expect(result.stdout).not.toContain(api.TTRPG_DM_KEY);
-  expect(result.stdout).toContain("Consulta las claves de acceso en .env");
+  expect(api.TTRPG_AUTH_SECRET).toMatch(/^[A-Za-z0-9_-]{43}$/);
+  expect(api.TTRPG_DM_KEY).toBeUndefined();expect(api.TTRPG_PLAYER_KEY).toBeUndefined();
+  expect(result.stdout).not.toContain(api.TTRPG_AUTH_SECRET);
+  expect(result.stdout).toContain("No se crearon cuentas");
   expect(result.stdout).toContain("pnpm start:api");
-  expect(result.stdout).toContain("pnpm start:service");
+  for(const directory of [".local",".local/service/data",".local/service/logs",".local/service/backups"])expect(statSync(join(root,directory)).mode&0o777).toBe(0o700);
   const custom = original.replace("TTRPG_PORT=8787", "TTRPG_PORT=8989");
   writeFileSync(join(root, ".env"), custom);
   writeFileSync(join(root, ".env.electron"), "TTRPG_ELECTRON_MODE=local\n");
@@ -70,13 +69,11 @@ it("configuración PostgreSQL existente no crea directorio SQLite ni cambia URL
   const { root, data, run } = fixture();
   const configuration = "TTRPG_DEPLOYMENT=production\nTTRPG_DB_DRIVER=postgres\nTTRPG_DATABASE_URL=postgresql://user:synthetic-secret@localhost/test\n";
   writeFileSync(join(root, ".env"), configuration, { mode: 0o600 });
-  const result = run(); expect(result.status).toBe(0);
+  const result = run(); expect(result.status).toBe(1);
   expect(readFileSync(join(root, ".env"), "utf8")).toBe(configuration);
   expect(() => statSync(data)).toThrow();
   expect(result.stdout + result.stderr).not.toContain("synthetic-secret");
-  expect(result.stdout).toContain("pnpm build:api y pnpm db:migrate");
-  expect(result.stdout).toContain("PostgreSQL permanece bloqueado");
-  expect(result.stdout).toContain("docs/database.md");
+  expect(result.stderr).toContain("Configuración anterior incompleta");
   expect(result.stdout).not.toMatch(/start:api|start:service|claves de acceso/);
   expect(readFileSync(join(root, ".env.electron"), "utf8")).not.toContain("DATABASE");
 });
diff --git a/src/server/http.test.ts b/src/server/http.test.ts
index 0a0e811..f322b7a 100644
--- a/src/server/http.test.ts
+++ b/src/server/http.test.ts
@@ -5,7 +5,7 @@ import { join } from "node:path";
 import { request } from "node:http";
 import { DatabaseSync } from "node:sqlite";
 import { randomUUID } from "node:crypto";
-import { createApi } from "./http";
+import { createApi } from "./legacy-http.fixture";
 import { LIMITS, readConfig, type ServerConfig } from "./config";
 import { createDefaultScene } from "../domain/sessions/default-scene";
 import { createDefaultSceneMap, createSceneWithMap } from "../domain/sessions/scene-maps";
diff --git a/src/server/http.ts b/src/server/http.ts
index 09d7050..760b123 100644
--- a/src/server/http.ts
+++ b/src/server/http.ts
@@ -1,218 +1,50 @@
-import { createInvitationHttp, isInvitationPath } from "./invitation-http";
-import type { InvitationService } from "../application/services/invitations";
-import { body, json } from "./request-body";
-import { createOwnedHttp } from "./owned-http";
-import { createIdentityHttp } from "./identity-http";
-import type { IdentityService } from "../application/services/identity";
-import { createTableHttp } from "./table-http";
+import { isModerationPath } from "./moderation-http";
+import { isInvitationPath } from "./invitation-http";
+import { createServer } from "node:http";
+import { openModerationBackend } from "./moderation-backend";
+import { validateServiceConfig, LIMITS, type ServerConfig } from "./config";
 import { createStaticHandler } from "./static-files";
-import { SceneLinksService, connectSchema, linkSchema, validateLinksSchema, sceneReference } from "./scene-links";
-import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
-import { randomUUID } from "node:crypto";
-import { API_PREFIX } from "../shared/contracts/http-api";
-import { builtInMonsterTemplates } from "../domain/monster-templates/monster-template";
-import { saveMonsterLibraryEntryUseCase, searchMonsterLibraryUseCase } from "../application/use-cases/monster-library";
-import { saveNpcLibraryEntryUseCase, savePlayerCharacterLibraryEntryUseCase, searchNpcLibraryUseCase, searchPlayerCharacterLibraryUseCase } from "../application/use-cases/entity-library";
-import { deleteMonsterTemplateUseCase, listMonsterTemplatesUseCase, saveMonsterTemplateUseCase } from "../application/use-cases/monster-templates";
-import { ServiceStore } from "../infrastructure/server/service-store";
-import { ImageValidationService } from "../infrastructure/server/image-validation";
-import { StoredDataError } from "../infrastructure/server/persisted-records";
-import { Auth } from "./auth";
-import { LIMITS, validateConfig, type ServerConfig } from "./config";
-import { HttpError, invalid, missing } from "./errors";
-import { SceneService } from "./scene-service";
-import { characterSchema, loginSchema, monsterSchema, npcSchema, numberQuery, parse, query, resolveSchema, routeId, sceneInputSchema, templateSchema } from "./schemas";
-
-function send(res: ServerResponse, status: number, value?: unknown): void {
-  res.statusCode = status;
-  if (value === undefined) { res.end(); return; }
-  res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value));
-}
-function method(req: IncomingMessage, allowed: readonly string[]): string {
-  const value = req.method ?? "GET";
-  if (!allowed.includes(value)) throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible para esta ruta.");
-  return value;
-}
-export function createApi(config: ServerConfig, options: { readonly version: string; readonly now?: () => number; readonly identity?: IdentityService; readonly invitations?: InvitationService }) {
-  validateConfig(config);
-  if (Boolean(config.identity) !== Boolean(options.identity)) throw new Error("TTRPG_IDENTITY_ENABLED requiere composición explícita de identidad migrada.");
-  const identityHttp = options.identity ? createIdentityHttp(options.identity, config.publicOrigin) : undefined;
-  const now = options.now ?? Date.now;
-  const invitationHttp = options.invitations && options.identity ? createInvitationHttp(options.invitations, options.identity, config.publicOrigin, now) : undefined;
-  const ownedHttp = options.identity ? createOwnedHttp(options.identity, config.publicOrigin, now) : undefined;
-  const serveStatic = config.webDir ? createStaticHandler(config.webDir) : null;
-  const store = new ServiceStore(config.dataDir);
-  const scenes = new SceneService(store, now);
-  const links = new SceneLinksService(scenes, store);
-  const imageValidation = new ImageValidationService();
-  const auth = new Auth(config, now);
-  const realtime = createTableHttp(auth, now, config.publicOrigin);
-  const origin = new URL(config.publicOrigin);
-  const playerRepository = {
-    search: store.entities.searchPlayerCharacters.bind(store.entities), findById: store.entities.findPlayerCharacterById.bind(store.entities), save: store.entities.savePlayerCharacter.bind(store.entities)
-  };
-  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
-    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
+import { HttpError, missing } from "./errors";
+/** Único listener del producto: autoridad contextual, sin ServiceStore ni claves globales. */
+export async function openServiceApi(config: ServerConfig, version: string) {
+  validateServiceConfig(config);
+  const serve = config.webDir ? createStaticHandler(config.webDir) : null;
+  const backend = await openModerationBackend(config.database, config.identity);
+  const rates=new Map<string,{count:number;until:number}>();
+  const server = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
+    res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer");
+    res.setHeader("X-Content-Type-Options", "nosniff");
     res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
-    if (req.headers.host !== origin.host) throw new HttpError(403, "INVALID_HOST", "El host no está permitido.");
-    const mutating = !["GET", "HEAD"].includes(req.method ?? "GET");
-    if ((req.headers.origin !== undefined && req.headers.origin !== config.publicOrigin) || (mutating && req.headers.origin !== config.publicOrigin)) throw new HttpError(403, "INVALID_ORIGIN", "El origen no está permitido.");
-    auth.rate(req);
-    const rawPath = (req.url ?? "").split("?")[0];
-    let path: string;
-    try { path = decodeURIComponent(rawPath); } catch { throw new HttpError(400, "INVALID_PATH", "La ruta no es válida."); }
-    if (/%(?:2f|5c)/i.test(rawPath) || /[%\\\0]/.test(path) || path.split("/").some((part) => part === "." || part === "..")) throw new HttpError(400, "INVALID_PATH", "La ruta no es válida.");
-    if (!path.startsWith(API_PREFIX + "/")) {
-      if (path === API_PREFIX || path.startsWith("/api/") || !serveStatic) throw missing();
-      serveStatic(req, res, path); return;
-    }
-    const url = new URL(req.url ?? "/", config.publicOrigin);
-    const parts = path.slice(API_PREFIX.length + 1).split("/");
-    if (parts[0] === "health" && parts.length === 1) { method(req, ["GET"]); query(url, []); send(res, 200, { ok: true, status: "ok", version: options.version }); return; }
-    if (parts[0] === "auth" && parts.length === 2) {
-      query(url, []);
-      if (parts[1] === "login") {
-        method(req, ["POST"]); auth.rate(req, true);
-        const input = parse(loginSchema, await json(req, res, LIMITS.loginBytes));
-        const { token, session } = auth.login(req, input.key); realtime.revoke(req); res.setHeader("Set-Cookie", auth.cookie(token));
-        send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return;
-      }
-      if (parts[1] === "logout") { method(req, ["POST"]); await body(req, res, LIMITS.loginBytes); auth.logout(req); realtime.revoke(req); res.setHeader("Set-Cookie", auth.cookie("")); send(res, 204); return; }
-      if (parts[1] === "session") { method(req, ["GET"]); const session = auth.require(req); send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return; }
-      throw missing();
-    }
-    if (isInvitationPath(path) && invitationHttp) { await invitationHttp(req, res); return; }
-    if (parts[0] === "identity") { if (!identityHttp) throw missing(); await identityHttp(req, res); return; }
-    if (parts[0] === "dm" || parts[0] === "admin" && parts[1] === "systems") { if (!ownedHttp) throw missing(); await ownedHttp(req, res); return; }
-    const session = auth.require(req);
-    // Volver a validar después de cada espera antes de usar el rol capturado.
-    const requireCurrentSession = () => {
-      if (auth.require(req) !== session) throw new HttpError(401, "UNAUTHORIZED", "La sesión cambió. Inicia sesión de nuevo.");
-    };
-    const protectedJson = async () => {
-      const input = await json(req, res); requireCurrentSession(); return input;
-    };
-    if (["table", "dice"].includes(parts[0]) && parts.length === 2) {
-      realtime.validateQuery(url);
-      if (parts[0] === "table" && parts[1] === "events") { method(req, ["GET"]); realtime.stream(req, res, session.role); return; }
-      if (req.method === "GET") { send(res, 200, { ...realtime.read(parts[0], parts[1], session.role), serverTime: now() }); return; }
-      method(req, ["POST"]);
-      const input = await protectedJson();
-      requireCurrentSession();
-      send(res, 200, { ...(realtime.execute(req, parts[0], parts[1], session.role, input) as object), serverTime: now() }); return;
-    }
-    if (parts[0] === "assets" && parts.length === 2) {
-      query(url, []);
-      if (parts[1] === "resolve") {
-        method(req, ["POST"]); const input = parse(resolveSchema, await protectedJson());
-        requireCurrentSession();
-        send(res, 200, { ok: true, assets: input.references.map(reference => ({ reference, url: session.role === "dm" || realtime.table.allows(reference) ? scenes.resolve(reference) : null })) }); return;
+    void (async () => {
+      if (req.headers.host !== new URL(config.publicOrigin).host) throw new HttpError(403, "INVALID_HOST", "Host no permitido.");
+      if (req.headers.origin !== undefined && req.headers.origin !== config.publicOrigin || !["GET", "HEAD"].includes(req.method ?? "GET") && req.headers.origin !== config.publicOrigin) throw new HttpError(403, "INVALID_ORIGIN", "Origen no permitido.");
+      const raw = (req.url ?? "/").split("?")[0];
+      let path: string; try { path = decodeURIComponent(raw); } catch { throw missing(); }
+      if (/%(?:2f|5c)/i.test(raw) || /[%\\\0]/.test(path) || path.split("/").some(p => p === "." || p === "..")) throw missing();
+      // Mesa y admisión conservan las cuotas y reserva DM de sus handlers.
+      if(!isModerationPath(path)&&!isInvitationPath(path)){
+      const at=Date.now();for(const [key,value] of rates)if(value.until<=at)rates.delete(key);
+      const peer=req.socket.remoteAddress??"unknown",rate=rates.get(peer)??{count:0,until:at+60000};
+      if(!rates.has(peer)&&rates.size>=LIMITS.rateEntries||++rate.count>LIMITS.requestsPerMinute){res.setHeader("Retry-After","60");throw new HttpError(429,"RATE_LIMITED","Espera un minuto antes de reintentar.");}rates.set(peer,rate);
       }
-      method(req, ["GET", "HEAD"]); const id = routeId(parts[1]);
-      if (session.role !== "dm" && !realtime.table.allows(`asset:${id}`)) throw missing();
-      const asset = store.getAsset(id); if (!asset) throw missing();
-      res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", asset.bytes.length); res.end(req.method === "HEAD" ? undefined : asset.bytes); return;
-    }
-    if (session.role !== "dm") throw new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
-    if (parts[0] === "scene-links" && parts.length === 2) {
-      method(req, ["POST"]); query(url, []); const input = await protectedJson();
-      const value = parts[1] === "connect" ? links.connect(parse(connectSchema, input))
-        : parts[1] === "disconnect" ? links.disconnect(parse(linkSchema, input))
-        : parts[1] === "validate" ? links.validate(parse(validateLinksSchema, input))
-        : parts[1] === "navigate" ? links.navigate(parse(linkSchema, input)) : null;
-      if (!value) throw missing(); send(res, 200, value); return;
-    }
-    if (parts[0] === "scenes") {
-      if (parts.length === 1 && req.method === "GET") {
-        query(url, ["limit", "offset"]);
-        const result = store.listScenes(numberQuery(url, "limit", 50, 1, 100), numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER));
-        send(res, 200, { ok: true, scenes: result.scenes.map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt })), total: result.total }); return;
+      if (path === "/api/v1/health" && req.method === "GET" && !req.url?.includes("?")) {
+        res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true, status: "ok", version })); return;
       }
-      query(url, []);
-      if (parts.length === 1 || (parts.length === 2 && parts[1] === "import")) {
-        method(req, ["POST"]); const input = parse(sceneInputSchema, await protectedJson()); const resource = scenes.save(input.name, input.scene);
-        res.setHeader("Location", `${API_PREFIX}/scenes/${resource.id}`); send(res, 201, { ok: true, resource }); return;
-      }
-      const id = routeId(parts[1]);
-      if (parts.length === 4 && parts[2] === "links" && parts[3] === "candidates") { method(req, ["GET"]); send(res, 200, links.candidates(sceneReference(id))); return; }
-      if (parts.length === 3 && parts[2] === "export") { method(req, ["GET"]); const resource = scenes.get(id); res.setHeader("Content-Disposition", `attachment; filename="scene-${id}.ttrpgscene"`); send(res, 200, resource.scene); return; }
-      if (parts.length !== 2) throw missing();
-      const action = method(req, ["GET", "PUT", "DELETE"]);
-      if (action === "GET") send(res, 200, { ok: true, resource: scenes.get(id) });
-      else if (action === "DELETE") { if (!store.deleteScene(id)) throw missing(); send(res, 204); }
-      else { const input = parse(sceneInputSchema, await protectedJson()); send(res, 200, { ok: true, resource: scenes.save(input.name, input.scene, id) }); }
-      return;
-    }
-    if (parts[0] === "assets") {
-      query(url, []);
-      if (parts.length === 1) {
-        method(req, ["POST"]); const mime = req.headers["content-type"] ?? "";
-        if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Solo se admiten PNG, JPEG y WebP.");
-        const bytes = await body(req, res, LIMITS.imageBytes); requireCurrentSession(); await imageValidation.validate(bytes, mime); requireCurrentSession();
-        const id = randomUUID(); store.saveAsset(id, mime, bytes);
-        send(res, 201, { ok: true, asset: { id, reference: `asset:${id}`, url: `${API_PREFIX}/assets/${id}`, mimeType: mime, byteLength: bytes.length } }); return;
-      }
-      if (parts.length !== 2) throw missing();
-      if (parts[1] === "resolve") { method(req, ["POST"]); const input = parse(resolveSchema, await protectedJson());
-        requireCurrentSession(); send(res, 200, { ok: true, assets: input.references.map((reference) => ({ reference, url: scenes.resolve(reference) })) }); return; }
-      method(req, ["GET"]); const asset = store.getAsset(routeId(parts[1])); if (!asset) throw missing();
-      res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", asset.bytes.length); res.end(asset.bytes); return;
-    }
-    if (parts[0] === "monster-templates") {
-      query(url, []);
-      if (parts.length === 1) { method(req, ["GET"]); send(res, 200, { ok: true, templates: await listMonsterTemplatesUseCase(store) }); return; }
-      if (parts.length !== 2) throw missing();
-      const id = routeId(parts[1], true); const action = method(req, ["PUT", "DELETE"]);
-      if (builtInMonsterTemplates.some((template) => template.id === id)) throw new HttpError(403, "BUILT_IN_TEMPLATE", "Las plantillas incorporadas no se pueden modificar.");
-      if (action === "DELETE") { if (!(await store.listUserTemplates()).some((template) => template.id === id)) throw missing(); requireCurrentSession(); send(res, 200, { ok: true, templates: await deleteMonsterTemplateUseCase(store, id) }); }
-      else { const input = parse(templateSchema, await protectedJson()); if (input.template.id !== id) throw invalid("El ID no coincide con la ruta."); send(res, 200, { ok: true, templates: await saveMonsterTemplateUseCase(store, input.template) }); }
-      return;
-    }
-    if (parts[0] === "libraries" && (parts.length === 2 || parts.length === 3)) {
-      const kind = parts[1]; if (!["monsters", "npcs", "player-characters"].includes(kind)) throw missing();
-      const id = parts.length === 3 ? routeId(parts[2]) : undefined;
-      const action = method(req, id ? ["GET", "PUT"] : ["GET", "POST"]);
-      if (!id && action === "GET") {
-        query(url, ["text", "limit"]); const text = url.searchParams.get("text") ?? ""; if (text.length > 200) throw new HttpError(400, "INVALID_QUERY", "La búsqueda es demasiado larga.");
-        const search = { text, limit: numberQuery(url, "limit", 50, 1, 100) };
-        const entries = kind === "monsters" ? await searchMonsterLibraryUseCase(store.monsters, search) : kind === "npcs" ? await searchNpcLibraryUseCase(store.entities, search) : await searchPlayerCharacterLibraryUseCase(playerRepository, search);
-        requireCurrentSession(); send(res, 200, { ok: true, entries }); return;
-      }
-      query(url, []);
-      if (id) {
-        const entry = kind === "monsters" ? await store.monsters.findById(id) : kind === "npcs" ? await store.entities.findById(id) : await playerRepository.findById(id);
-        requireCurrentSession(); if (!entry) throw missing(); if (action === "GET") { send(res, 200, { ok: true, entry }); return; }
-      }
-      const payload = await protectedJson(); const saveOptions = { createId: randomUUID, now: () => new Date(now()) };
-      const entry = kind === "monsters" ? await saveMonsterLibraryEntryUseCase(store.monsters, { ...parse(monsterSchema, payload).entry, id }, saveOptions)
-        : kind === "npcs" ? await saveNpcLibraryEntryUseCase(store.entities, { ...parse(npcSchema, payload).entry, id }, saveOptions)
-          : await savePlayerCharacterLibraryEntryUseCase(playerRepository, { ...parse(characterSchema, payload).entry, id }, saveOptions);
-      send(res, id ? 200 : 201, { ok: true, entry }); return;
-    }
-    throw missing();
-  }
-  const server = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
-    void handle(req, res).catch((error: unknown) => {
+      if (path.startsWith("/api/v1/identity/") || path.startsWith("/api/v1/dm/") || path.startsWith("/api/v1/games/") || path.startsWith("/api/v1/admin/systems")) { await backend.handler(req, res); return; }
+      if (path.startsWith("/api") || !serve) throw missing();
+      serve(req, res, path);
+    })().catch((error: unknown) => {
       if (res.destroyed || res.writableEnded) return;
-      const failure = error instanceof HttpError ? error : error instanceof StoredDataError ? new HttpError(500, "STORAGE_CORRUPT", "El recurso guardado está dañado o es incompatible. Restaura una copia válida y vuelve a intentar.") : new HttpError(500, "INTERNAL_ERROR", "No se pudo completar la operación. Intenta de nuevo.");
-      if (failure.status === 429) res.setHeader("Retry-After", "60");
-      // Cerrar la conexión si queda un cuerpo sin leer después del rechazo.
+      const failure = error instanceof HttpError ? error : new HttpError(503, "UNAVAILABLE", "Servicio no disponible. Reintenta.");
       if (!req.complete) res.setHeader("Connection", "close");
-      send(res, failure.status, { ok: false, error: { code: failure.code, message: failure.message } });
+      res.writeHead(failure.status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: { code: failure.code, message: failure.message } }));
     });
   });
   server.headersTimeout = LIMITS.headersMs; server.requestTimeout = LIMITS.bodyMs; server.keepAliveTimeout = 5000;
   server.maxConnections = 100; server.maxRequestsPerSocket = 100;
   let closed = false;
-  return {
-    server,
-    async listen(): Promise<number> {
-      await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(config.port, config.host, () => { server.off("error", reject); resolve(); }); });
-      const address = server.address(); if (!address || typeof address === "string") throw new Error("No se pudo abrir el puerto."); return address.port;
-    },
-    async close(): Promise<void> {
-      if (closed) return; closed = true; realtime.close();
-      await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); store.close(); await options.invitations?.close(); await options.identity?.close();
-    }
+  return { server, backend,
+    async listen() { await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(config.port, config.host, () => { server.off("error", reject); resolve(); }); }); const address = server.address(); if (!address || typeof address === "string") throw new Error("No se pudo iniciar el servicio."); return address.port; },
+    async close() { if (closed) return; closed = true; await backend.close(); await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
   };
 }
diff --git a/src/server/index.ts b/src/server/index.ts
index 5f85802..1136891 100644
--- a/src/server/index.ts
+++ b/src/server/index.ts
@@ -1,16 +1,11 @@
-import { openInvitations } from "../infrastructure/server/invitations";
-import { openIdentity } from "../infrastructure/server/identity";
 import { readConfig } from "./config";
-import { createApi } from "./http";
+import { openServiceApi } from "./http";
 import { version } from "../../package.json";
 
 async function main(): Promise<void> {
   if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("El servicio requiere Node.js 24.");
   const config = readConfig();
-  const identity = config.identity ? await openIdentity(config.database!, config.identity) : undefined;
-  const invitations = identity ? await openInvitations(config.database!, identity, config.publicOrigin).catch(async error => { await identity.close(); throw error; }) : undefined;
-  let api: ReturnType<typeof createApi>;
-  try { api = createApi(config, { version, identity, invitations }); } catch (error) { await invitations?.close(); await identity?.close(); throw error; }
+  const api = await openServiceApi(config, version);
   let port: number;
   try { port = await api.listen(); } catch { await api.close(); throw new Error("No se pudo iniciar el servicio. Comprueba el puerto y el almacenamiento."); }
   process.stdout.write(`TTRPG Effects API ${version} lista.\nHost: ${config.host} | Puerto: ${port}\nAbrir: ${config.publicOrigin}\n`);
diff --git a/src/server/legacy-http.fixture.ts b/src/server/legacy-http.fixture.ts
new file mode 100644
index 0000000..3e3aaf9
--- /dev/null
+++ b/src/server/legacy-http.fixture.ts
@@ -0,0 +1,219 @@
+/** Arnés histórico exclusivo de pruebas; no está conectado ni incluido en el artefacto de producto. */
+import { createInvitationHttp, isInvitationPath } from "./invitation-http";
+import type { InvitationService } from "../application/services/invitations";
+import { body, json } from "./request-body";
+import { createOwnedHttp } from "./owned-http";
+import { createIdentityHttp } from "./identity-http";
+import type { IdentityService } from "../application/services/identity";
+import { createTableHttp } from "./table-http";
+import { createStaticHandler } from "./static-files";
+import { SceneLinksService, connectSchema, linkSchema, validateLinksSchema, sceneReference } from "./scene-links";
+import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
+import { randomUUID } from "node:crypto";
+import { API_PREFIX } from "../shared/contracts/http-api";
+import { builtInMonsterTemplates } from "../domain/monster-templates/monster-template";
+import { saveMonsterLibraryEntryUseCase, searchMonsterLibraryUseCase } from "../application/use-cases/monster-library";
+import { saveNpcLibraryEntryUseCase, savePlayerCharacterLibraryEntryUseCase, searchNpcLibraryUseCase, searchPlayerCharacterLibraryUseCase } from "../application/use-cases/entity-library";
+import { deleteMonsterTemplateUseCase, listMonsterTemplatesUseCase, saveMonsterTemplateUseCase } from "../application/use-cases/monster-templates";
+import { ServiceStore } from "../infrastructure/server/service-store";
+import { ImageValidationService } from "../infrastructure/server/image-validation";
+import { StoredDataError } from "../infrastructure/server/persisted-records";
+import { Auth } from "./auth";
+import { LIMITS, validateConfig, type ServerConfig } from "./config";
+import { HttpError, invalid, missing } from "./errors";
+import { SceneService } from "./scene-service";
+import { characterSchema, loginSchema, monsterSchema, npcSchema, numberQuery, parse, query, resolveSchema, routeId, sceneInputSchema, templateSchema } from "./schemas";
+
+function send(res: ServerResponse, status: number, value?: unknown): void {
+  res.statusCode = status;
+  if (value === undefined) { res.end(); return; }
+  res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value));
+}
+function method(req: IncomingMessage, allowed: readonly string[]): string {
+  const value = req.method ?? "GET";
+  if (!allowed.includes(value)) throw new HttpError(405, "METHOD_NOT_ALLOWED", "El método no está disponible para esta ruta.");
+  return value;
+}
+export function createApi(config: ServerConfig, options: { readonly version: string; readonly now?: () => number; readonly identity?: IdentityService; readonly invitations?: InvitationService }) {
+  validateConfig(config);
+  if (Boolean(config.identity) !== Boolean(options.identity)) throw new Error("TTRPG_IDENTITY_ENABLED requiere composición explícita de identidad migrada.");
+  const identityHttp = options.identity ? createIdentityHttp(options.identity, config.publicOrigin) : undefined;
+  const now = options.now ?? Date.now;
+  const invitationHttp = options.invitations && options.identity ? createInvitationHttp(options.invitations, options.identity, config.publicOrigin, now) : undefined;
+  const ownedHttp = options.identity ? createOwnedHttp(options.identity, config.publicOrigin, now) : undefined;
+  const serveStatic = config.webDir ? createStaticHandler(config.webDir) : null;
+  const store = new ServiceStore(config.dataDir);
+  const scenes = new SceneService(store, now);
+  const links = new SceneLinksService(scenes, store);
+  const imageValidation = new ImageValidationService();
+  const auth = new Auth(config, now);
+  const realtime = createTableHttp(auth, now, config.publicOrigin);
+  const origin = new URL(config.publicOrigin);
+  const playerRepository = {
+    search: store.entities.searchPlayerCharacters.bind(store.entities), findById: store.entities.findPlayerCharacterById.bind(store.entities), save: store.entities.savePlayerCharacter.bind(store.entities)
+  };
+  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
+    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
+    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
+    if (req.headers.host !== origin.host) throw new HttpError(403, "INVALID_HOST", "El host no está permitido.");
+    const mutating = !["GET", "HEAD"].includes(req.method ?? "GET");
+    if ((req.headers.origin !== undefined && req.headers.origin !== config.publicOrigin) || (mutating && req.headers.origin !== config.publicOrigin)) throw new HttpError(403, "INVALID_ORIGIN", "El origen no está permitido.");
+    auth.rate(req);
+    const rawPath = (req.url ?? "").split("?")[0];
+    let path: string;
+    try { path = decodeURIComponent(rawPath); } catch { throw new HttpError(400, "INVALID_PATH", "La ruta no es válida."); }
+    if (/%(?:2f|5c)/i.test(rawPath) || /[%\\\0]/.test(path) || path.split("/").some((part) => part === "." || part === "..")) throw new HttpError(400, "INVALID_PATH", "La ruta no es válida.");
+    if (!path.startsWith(API_PREFIX + "/")) {
+      if (path === API_PREFIX || path.startsWith("/api/") || !serveStatic) throw missing();
+      serveStatic(req, res, path); return;
+    }
+    const url = new URL(req.url ?? "/", config.publicOrigin);
+    const parts = path.slice(API_PREFIX.length + 1).split("/");
+    if (parts[0] === "health" && parts.length === 1) { method(req, ["GET"]); query(url, []); send(res, 200, { ok: true, status: "ok", version: options.version }); return; }
+    if (parts[0] === "auth" && parts.length === 2) {
+      query(url, []);
+      if (parts[1] === "login") {
+        method(req, ["POST"]); auth.rate(req, true);
+        const input = parse(loginSchema, await json(req, res, LIMITS.loginBytes));
+        const { token, session } = auth.login(req, input.key); realtime.revoke(req); res.setHeader("Set-Cookie", auth.cookie(token));
+        send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return;
+      }
+      if (parts[1] === "logout") { method(req, ["POST"]); await body(req, res, LIMITS.loginBytes); auth.logout(req); realtime.revoke(req); res.setHeader("Set-Cookie", auth.cookie("")); send(res, 204); return; }
+      if (parts[1] === "session") { method(req, ["GET"]); const session = auth.require(req); send(res, 200, { ok: true, role: session.role, expiresAt: new Date(session.expiresAt).toISOString() }); return; }
+      throw missing();
+    }
+    if (isInvitationPath(path) && invitationHttp) { await invitationHttp(req, res); return; }
+    if (parts[0] === "identity") { if (!identityHttp) throw missing(); await identityHttp(req, res); return; }
+    if (parts[0] === "dm" || parts[0] === "admin" && parts[1] === "systems") { if (!ownedHttp) throw missing(); await ownedHttp(req, res); return; }
+    const session = auth.require(req);
+    // Volver a validar después de cada espera antes de usar el rol capturado.
+    const requireCurrentSession = () => {
+      if (auth.require(req) !== session) throw new HttpError(401, "UNAUTHORIZED", "La sesión cambió. Inicia sesión de nuevo.");
+    };
+    const protectedJson = async () => {
+      const input = await json(req, res); requireCurrentSession(); return input;
+    };
+    if (["table", "dice"].includes(parts[0]) && parts.length === 2) {
+      realtime.validateQuery(url);
+      if (parts[0] === "table" && parts[1] === "events") { method(req, ["GET"]); realtime.stream(req, res, session.role); return; }
+      if (req.method === "GET") { send(res, 200, { ...realtime.read(parts[0], parts[1], session.role), serverTime: now() }); return; }
+      method(req, ["POST"]);
+      const input = await protectedJson();
+      requireCurrentSession();
+      send(res, 200, { ...(realtime.execute(req, parts[0], parts[1], session.role, input) as object), serverTime: now() }); return;
+    }
+    if (parts[0] === "assets" && parts.length === 2) {
+      query(url, []);
+      if (parts[1] === "resolve") {
+        method(req, ["POST"]); const input = parse(resolveSchema, await protectedJson());
+        requireCurrentSession();
+        send(res, 200, { ok: true, assets: input.references.map(reference => ({ reference, url: session.role === "dm" || realtime.table.allows(reference) ? scenes.resolve(reference) : null })) }); return;
+      }
+      method(req, ["GET", "HEAD"]); const id = routeId(parts[1]);
+      if (session.role !== "dm" && !realtime.table.allows(`asset:${id}`)) throw missing();
+      const asset = store.getAsset(id); if (!asset) throw missing();
+      res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", asset.bytes.length); res.end(req.method === "HEAD" ? undefined : asset.bytes); return;
+    }
+    if (session.role !== "dm") throw new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
+    if (parts[0] === "scene-links" && parts.length === 2) {
+      method(req, ["POST"]); query(url, []); const input = await protectedJson();
+      const value = parts[1] === "connect" ? links.connect(parse(connectSchema, input))
+        : parts[1] === "disconnect" ? links.disconnect(parse(linkSchema, input))
+        : parts[1] === "validate" ? links.validate(parse(validateLinksSchema, input))
+        : parts[1] === "navigate" ? links.navigate(parse(linkSchema, input)) : null;
+      if (!value) throw missing(); send(res, 200, value); return;
+    }
+    if (parts[0] === "scenes") {
+      if (parts.length === 1 && req.method === "GET") {
+        query(url, ["limit", "offset"]);
+        const result = store.listScenes(numberQuery(url, "limit", 50, 1, 100), numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER));
+        send(res, 200, { ok: true, scenes: result.scenes.map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt })), total: result.total }); return;
+      }
+      query(url, []);
+      if (parts.length === 1 || (parts.length === 2 && parts[1] === "import")) {
+        method(req, ["POST"]); const input = parse(sceneInputSchema, await protectedJson()); const resource = scenes.save(input.name, input.scene);
+        res.setHeader("Location", `${API_PREFIX}/scenes/${resource.id}`); send(res, 201, { ok: true, resource }); return;
+      }
+      const id = routeId(parts[1]);
+      if (parts.length === 4 && parts[2] === "links" && parts[3] === "candidates") { method(req, ["GET"]); send(res, 200, links.candidates(sceneReference(id))); return; }
+      if (parts.length === 3 && parts[2] === "export") { method(req, ["GET"]); const resource = scenes.get(id); res.setHeader("Content-Disposition", `attachment; filename="scene-${id}.ttrpgscene"`); send(res, 200, resource.scene); return; }
+      if (parts.length !== 2) throw missing();
+      const action = method(req, ["GET", "PUT", "DELETE"]);
+      if (action === "GET") send(res, 200, { ok: true, resource: scenes.get(id) });
+      else if (action === "DELETE") { if (!store.deleteScene(id)) throw missing(); send(res, 204); }
+      else { const input = parse(sceneInputSchema, await protectedJson()); send(res, 200, { ok: true, resource: scenes.save(input.name, input.scene, id) }); }
+      return;
+    }
+    if (parts[0] === "assets") {
+      query(url, []);
+      if (parts.length === 1) {
+        method(req, ["POST"]); const mime = req.headers["content-type"] ?? "";
+        if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Solo se admiten PNG, JPEG y WebP.");
+        const bytes = await body(req, res, LIMITS.imageBytes); requireCurrentSession(); await imageValidation.validate(bytes, mime); requireCurrentSession();
+        const id = randomUUID(); store.saveAsset(id, mime, bytes);
+        send(res, 201, { ok: true, asset: { id, reference: `asset:${id}`, url: `${API_PREFIX}/assets/${id}`, mimeType: mime, byteLength: bytes.length } }); return;
+      }
+      if (parts.length !== 2) throw missing();
+      if (parts[1] === "resolve") { method(req, ["POST"]); const input = parse(resolveSchema, await protectedJson());
+        requireCurrentSession(); send(res, 200, { ok: true, assets: input.references.map((reference) => ({ reference, url: scenes.resolve(reference) })) }); return; }
+      method(req, ["GET"]); const asset = store.getAsset(routeId(parts[1])); if (!asset) throw missing();
+      res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", asset.bytes.length); res.end(asset.bytes); return;
+    }
+    if (parts[0] === "monster-templates") {
+      query(url, []);
+      if (parts.length === 1) { method(req, ["GET"]); send(res, 200, { ok: true, templates: await listMonsterTemplatesUseCase(store) }); return; }
+      if (parts.length !== 2) throw missing();
+      const id = routeId(parts[1], true); const action = method(req, ["PUT", "DELETE"]);
+      if (builtInMonsterTemplates.some((template) => template.id === id)) throw new HttpError(403, "BUILT_IN_TEMPLATE", "Las plantillas incorporadas no se pueden modificar.");
+      if (action === "DELETE") { if (!(await store.listUserTemplates()).some((template) => template.id === id)) throw missing(); requireCurrentSession(); send(res, 200, { ok: true, templates: await deleteMonsterTemplateUseCase(store, id) }); }
+      else { const input = parse(templateSchema, await protectedJson()); if (input.template.id !== id) throw invalid("El ID no coincide con la ruta."); send(res, 200, { ok: true, templates: await saveMonsterTemplateUseCase(store, input.template) }); }
+      return;
+    }
+    if (parts[0] === "libraries" && (parts.length === 2 || parts.length === 3)) {
+      const kind = parts[1]; if (!["monsters", "npcs", "player-characters"].includes(kind)) throw missing();
+      const id = parts.length === 3 ? routeId(parts[2]) : undefined;
+      const action = method(req, id ? ["GET", "PUT"] : ["GET", "POST"]);
+      if (!id && action === "GET") {
+        query(url, ["text", "limit"]); const text = url.searchParams.get("text") ?? ""; if (text.length > 200) throw new HttpError(400, "INVALID_QUERY", "La búsqueda es demasiado larga.");
+        const search = { text, limit: numberQuery(url, "limit", 50, 1, 100) };
+        const entries = kind === "monsters" ? await searchMonsterLibraryUseCase(store.monsters, search) : kind === "npcs" ? await searchNpcLibraryUseCase(store.entities, search) : await searchPlayerCharacterLibraryUseCase(playerRepository, search);
+        requireCurrentSession(); send(res, 200, { ok: true, entries }); return;
+      }
+      query(url, []);
+      if (id) {
+        const entry = kind === "monsters" ? await store.monsters.findById(id) : kind === "npcs" ? await store.entities.findById(id) : await playerRepository.findById(id);
+        requireCurrentSession(); if (!entry) throw missing(); if (action === "GET") { send(res, 200, { ok: true, entry }); return; }
+      }
+      const payload = await protectedJson(); const saveOptions = { createId: randomUUID, now: () => new Date(now()) };
+      const entry = kind === "monsters" ? await saveMonsterLibraryEntryUseCase(store.monsters, { ...parse(monsterSchema, payload).entry, id }, saveOptions)
+        : kind === "npcs" ? await saveNpcLibraryEntryUseCase(store.entities, { ...parse(npcSchema, payload).entry, id }, saveOptions)
+          : await savePlayerCharacterLibraryEntryUseCase(playerRepository, { ...parse(characterSchema, payload).entry, id }, saveOptions);
+      send(res, id ? 200 : 201, { ok: true, entry }); return;
+    }
+    throw missing();
+  }
+  const server = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
+    void handle(req, res).catch((error: unknown) => {
+      if (res.destroyed || res.writableEnded) return;
+      const failure = error instanceof HttpError ? error : error instanceof StoredDataError ? new HttpError(500, "STORAGE_CORRUPT", "El recurso guardado está dañado o es incompatible. Restaura una copia válida y vuelve a intentar.") : new HttpError(500, "INTERNAL_ERROR", "No se pudo completar la operación. Intenta de nuevo.");
+      if (failure.status === 429) res.setHeader("Retry-After", "60");
+      // Cerrar la conexión si queda un cuerpo sin leer después del rechazo.
+      if (!req.complete) res.setHeader("Connection", "close");
+      send(res, failure.status, { ok: false, error: { code: failure.code, message: failure.message } });
+    });
+  });
+  server.headersTimeout = LIMITS.headersMs; server.requestTimeout = LIMITS.bodyMs; server.keepAliveTimeout = 5000;
+  server.maxConnections = 100; server.maxRequestsPerSocket = 100;
+  let closed = false;
+  return {
+    server,
+    async listen(): Promise<number> {
+      await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(config.port, config.host, () => { server.off("error", reject); resolve(); }); });
+      const address = server.address(); if (!address || typeof address === "string") throw new Error("No se pudo abrir el puerto."); return address.port;
+    },
+    async close(): Promise<void> {
+      if (closed) return; closed = true; realtime.close();
+      await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); store.close(); await options.invitations?.close(); await options.identity?.close();
+    }
+  };
+}
diff --git a/src/server/moderation-http.ts b/src/server/moderation-http.ts
index 36753d0..8a61a94 100644
--- a/src/server/moderation-http.ts
+++ b/src/server/moderation-http.ts
@@ -89,7 +89,6 @@ export function createModerationHttp(identity: IdentityService, invitations: Inv
           await scope.deliver(() => {
             if (transportClosed || res.destroyed || res.writableEnded) return;
             // El cierre puede ser llamado por la reserva antes de crear el transporte.
-            // eslint-disable-next-line prefer-const
             let closed = false, connection: { id: string; close(): void } | undefined, timer: ReturnType<typeof setInterval> | undefined;
             let release = () => {}, pendingBytes = 0, heartbeatPending = false, chain = Promise.resolve(), roster = scope.roster, deliveredSequence = -1;
             const table = registry.runtime(scope.context);
diff --git a/src/server/owned-http.ts b/src/server/owned-http.ts
index 31d3af8..8b71470 100644
--- a/src/server/owned-http.ts
+++ b/src/server/owned-http.ts
@@ -70,6 +70,15 @@ export function createOwnedHttp(identity: IdentityService, origin: string, now =
             throw missing();
           }
           if (permission === "admin") throw missing();
+          if (parts[0] === "definitions" && parts.length === 3 && method === "GET") {
+            query(url, []); const kind=parse(z.enum(["scenes","monsters"]),parts[1]);const item=await tx.resources.get(kind,routeId(parts[2]));if(!item)throw missing();
+            const refs=[...(item.bindings?.root?[item.bindings.root]:[]),...Object.values(item.bindings?.monsters??{})];
+            const unique=[...new Map(refs.map(ref=>[JSON.stringify(ref),ref])).entries()];
+            const templates=await Promise.all(unique.map(([,ref])=>tx.systems.definition(ref)));
+            const indices=new Map(unique.map(([key],index)=>[key,index]));
+            const monsters=Object.fromEntries(Object.entries(item.bindings?.monsters??{}).map(([id,ref])=>[id,indices.get(JSON.stringify(ref))!]));
+            return {value:{ok:true,templates,monsters}};
+          }
           if (parts[0] === "games") {
             if (parts.length === 1 && method === "GET") { query(url, ["limit", "offset"]); return { value: { ok: true, ...await games.list({ limit: numberQuery(url, "limit", 50, 1, 100), offset: numberQuery(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER) }) } }; }
             query(url, []);
diff --git a/src/server/owned-scene-links.ts b/src/server/owned-scene-links.ts
index 91b5e9c..72e2cec 100644
--- a/src/server/owned-scene-links.ts
+++ b/src/server/owned-scene-links.ts
@@ -40,14 +40,14 @@ export class OwnedSceneLinksService {
     const nextSource=this.replace(updates.get(source.id)?.scene??source.scene,nextA);
     updates.set(source.id,{name:source.name,scene:nextSource});updates.set(target.id,{name:target.name,scene:this.replace(updates.get(target.id)?.scene??target.scene,nextB)});
     for(const [id,item] of updates) await this.scenes.save(item.name,item.scene,id,this.revision(id));
-    return {ok:true as const,mapAnnotations:nextSource.mapAnnotations,warning};
+    return {ok:true as const,mapAnnotations:nextSource.mapAnnotations,warning,revisions:Object.fromEntries([...updates.keys()].map(id=>[id,this.revision(id)+1]))};
   }
   async disconnect(request:z.infer<typeof linkSchema>) {
     const source=await this.read(request.scenePath);const marker=this.marker(source.scene,request.markerId);if(marker.locked)throw invalid("El marcador está bloqueado.");
     const next=this.replace(source.scene,disconnectSceneLinkMarker(marker));let remote:Awaited<ReturnType<OwnedSceneLinksService["read"]>>|undefined;let nextRemote:SceneDocument|undefined;let warning:string|undefined;
     if(marker.connection){try {remote=await this.read(marker.connection.peer.scenePath);const peer=this.marker(remote.scene,marker.connection.peer.markerId);if(validateReciprocalSceneLink(marker,request.scenePath,peer,marker.connection.peer.scenePath))nextRemote=this.replace(remote.scene,disconnectSceneLinkMarker(peer));else warning="Se desligó el marcador local; el destino no tenía una conexión recíproca válida.";}catch(error){if(error instanceof OwnedError)throw error;warning="Se desligó el marcador local. El destino ausente permanece sin resolver.";}}
     await this.scenes.save(source.name,next,source.id,this.revision(source.id));if(remote&&nextRemote)await this.scenes.save(remote.name,nextRemote,remote.id,this.revision(remote.id));
-    return {ok:true as const,mapAnnotations:next.mapAnnotations,warning};
+    return {ok:true as const,mapAnnotations:next.mapAnnotations,warning,revisions:{[source.id]:this.revision(source.id)+1,...(remote&&nextRemote?{[remote.id]:this.revision(remote.id)+1}:{})}};
   }
   async validate(request:z.infer<typeof validateLinksSchema>) {
     const current=await this.read(request.scenePath);const statuses:Record<string,SceneLinkValidationStatus>={};
diff --git a/src/server/table-http.test.ts b/src/server/table-http.test.ts
index c8987b9..430ae6b 100644
--- a/src/server/table-http.test.ts
+++ b/src/server/table-http.test.ts
@@ -4,7 +4,7 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { request } from "node:http";
 import { randomUUID } from "node:crypto";
-import { createApi } from "./http";
+import { createApi } from "./legacy-http.fixture";
 import { LIMITS, type ServerConfig } from "./config";
 import sharp from "sharp";
 import { privateFixture, refs } from "../application/services/public-table-projection.fixture";
diff --git a/src/shared/api/client.ts b/src/shared/api/client.ts
index fb4fe77..7839ea6 100644
--- a/src/shared/api/client.ts
+++ b/src/shared/api/client.ts
@@ -1,3 +1,4 @@
+import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
 import type { TtrpgApi } from "./ttrpg-api";
 
 /** Availability of operations, never authorization or a security boundary. */
@@ -5,6 +6,7 @@ export interface ClientCapabilities {
   readonly scenes: boolean;
   readonly images: boolean;
   readonly libraries: boolean;
+  readonly templateAdministration?: boolean;
   readonly player: boolean;
   readonly dice: boolean;
   readonly nativeMenus: boolean;
@@ -14,6 +16,10 @@ export interface TtrpgClient {
   readonly api: TtrpgApi;
   readonly assetReferences?: "service";
   readonly capabilities: ClientCapabilities;
+  readonly presentations?: {
+    forMonster(id: string, templateId: string | null, available: readonly MonsterTemplate[]): readonly MonsterTemplate[];
+    validateLibraryUse(id: string): Promise<void>;
+  };
 }
 
 export const LOCAL_CAPABILITIES: ClientCapabilities = Object.freeze({
@@ -21,6 +27,6 @@ export const LOCAL_CAPABILITIES: ClientCapabilities = Object.freeze({
 });
 
 /** The full contract stays required; only tests/labs may provide partial doubles. */
-export function createClient(api: TtrpgApi, capabilities: ClientCapabilities, assetReferences?: "service"): TtrpgClient {
-  return Object.freeze({ api, assetReferences, capabilities: Object.freeze({ ...capabilities }) });
+export function createClient(api: TtrpgApi, capabilities: ClientCapabilities, assetReferences?: "service", presentations?: TtrpgClient["presentations"]): TtrpgClient {
+  return Object.freeze({ api, assetReferences, presentations, capabilities: Object.freeze({ ...capabilities }) });
 }
diff --git a/src/shared/contracts/service-references.ts b/src/shared/contracts/service-references.ts
index 8192899..cb2dbb4 100644
--- a/src/shared/contracts/service-references.ts
+++ b/src/shared/contracts/service-references.ts
@@ -10,4 +10,4 @@ export function assetUrl(reference: string): string | null {
   const id = reference.startsWith("asset:") ? reference.slice(6) : "";
   return uuid.test(id) ? `/api/v1/assets/${id}` : null;
 }
-export function isServiceAssetUrl(url: string): boolean { return url.startsWith("/api/v1/assets/") && assetUrl(`asset:${url.slice(15)}`) === url; }
+export function isServiceAssetUrl(url: string): boolean { const match=/^\/api\/v1\/(?:dm\/|games\/([0-9a-f-]+)\/)?assets\/([0-9a-f-]+)$/.exec(url); return !!match && (!match[1] || uuid.test(match[1])) && uuid.test(match[2]); }
diff --git a/src/web/AccountAccess.tsx b/src/web/AccountAccess.tsx
new file mode 100644
index 0000000..8b83fec
--- /dev/null
+++ b/src/web/AccountAccess.tsx
@@ -0,0 +1,21 @@
+import { useState, type FormEvent } from "react";
+import { z } from "zod";
+import type { AccountDto } from "../shared/contracts/identity";
+import type { HttpTransport } from "../infrastructure/browser/http";
+import { ServiceError } from "../infrastructure/browser/http";
+import { identitySchema, failureMessage } from "./service-model";
+export function PasswordInput({label,value,onChange,autoComplete="current-password",describedBy,invalid=false}:{label:string;value:string;onChange:(s:string)=>void;autoComplete?:string;describedBy?:string;invalid?:boolean}){
+  const [visible,setVisible]=useState(false);
+  return <label>{label}<span className="password-field"><input required type={visible?"text":"password"} aria-describedby={describedBy} aria-invalid={invalid} value={value} autoComplete={autoComplete} onChange={e=>onChange(e.target.value)}/><button type="button" aria-label={`${visible?"Ocultar":"Mostrar"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?"Ocultar":"Mostrar"}</button></span></label>;
+}
+function InvitationLink({onInvitation}:{onInvitation?:(url:URL)=>void}){const[link,setLink]=useState(""),[error,setError]=useState("");return <details><summary>Entrar con invitación de jugador</summary><form onSubmit={e=>{e.preventDefault();try{const url=new URL(link);if(url.origin!==location.origin||!/^\/jugar\/[0-9a-f-]+$/.test(url.pathname)||url.search)throw new Error("Usa una invitación de este mismo servicio.");setLink("");if(onInvitation)onInvitation(url);else location.assign(url.href);}catch(e){setError(failureMessage(e));}}}><label>Enlace de invitación<input type="password" autoComplete="off" value={link} onChange={e=>setLink(e.target.value)}/></label><button>Abrir invitación</button><p role="alert">{error}</p></form></details>;}
+export function AccountAccess({http,onAccount,retained,onInvitation}:{http:HttpTransport;onAccount:(a:AccountDto)=>void;retained?:boolean;onInvitation?:(url:URL)=>void}){
+  const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState(""),[until,setUntil]=useState(0);
+  async function submit(e:FormEvent){e.preventDefault();if(pending||Date.now()<until)return;setPending(true);setError("");try{const r=await http.json("/identity/login",identitySchema,"POST",{email,password});http.resume();onAccount(r.account);}catch(e){setError(failureMessage(e));if(e instanceof ServiceError&&e.status===429)setUntil(Date.now()+Math.max(1,e.retryAfter)*1000);}finally{setPassword("");setPending(false);}}
+  return <main className="service-access"><section><p className="service-eyebrow">TTRPG Effects · Servicio privado</p><h1>{retained?"Recuperar sesión":"Acceso a tu mesa"}</h1>{retained&&<p>El borrador está protegido en memoria para su cuenta original.</p>}<form onSubmit={e=>void submit(e)}><label>Correo electrónico<input type="email" required autoComplete="username" aria-describedby="access-error" aria-invalid={!!error} value={email} onChange={e=>setEmail(e.target.value)} /></label><PasswordInput label="Contraseña" value={password} onChange={setPassword} describedBy="access-error" invalid={!!error}/><p id="access-error" role="alert">{error}</p><button disabled={pending}>{pending?"Accediendo…":"Acceder"}</button><p>El administrador proporciona las cuentas. No hay registro público ni recuperación por correo.</p></form><InvitationLink onInvitation={onInvitation}/></section></main>;
+}
+export function ChangePassword({http,account,onExit}:{http:HttpTransport;account:AccountDto;onExit:()=>Promise<void>}){
+  const[current,setCurrent]=useState(""),[next,setNext]=useState(""),[confirm,setConfirm]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
+  async function submit(e:FormEvent){e.preventDefault();if(pending)return;if(next!==confirm){setError("La confirmación no coincide.");return;}setPending(true);try{await http.json("/identity/password",z.undefined(),"POST",{currentPassword:current,newPassword:next});await onExit();}catch(e){setError(failureMessage(e));}finally{setCurrent("");setNext("");setConfirm("");setPending(false);}}
+  return <main className="service-access"><section><h1>Cambiar contraseña</h1><p>{account.name}: {account.mustChangePassword?"debes cambiar la contraseña temporal para continuar.":"el cambio cerrará tus sesiones."}</p><form onSubmit={e=>void submit(e)}><PasswordInput describedBy="password-guidance password-error" invalid={!!error} label="Contraseña actual" value={current} onChange={setCurrent}/><PasswordInput describedBy="password-guidance password-error" invalid={!!error} label="Contraseña nueva" autoComplete="new-password" value={next} onChange={setNext}/><PasswordInput describedBy="password-guidance password-error" invalid={!!error} label="Confirmar contraseña" autoComplete="new-password" value={confirm} onChange={setConfirm}/><p id="password-guidance">Entre 15 y 128 caracteres Unicode, máximo 512 bytes. Se conservan espacios y caracteres tal como los escribes.</p><p id="password-error" role="alert">{error}</p><button disabled={pending}>Cambiar contraseña y salir</button><button type="button" disabled={pending} onClick={()=>void onExit().catch(e=>setError(failureMessage(e)))}>Cerrar sesión</button></form></section></main>;
+}
diff --git a/src/web/AdminAccounts.tsx b/src/web/AdminAccounts.tsx
new file mode 100644
index 0000000..242358d
--- /dev/null
+++ b/src/web/AdminAccounts.tsx
@@ -0,0 +1,16 @@
+import { useEffect, useMemo, useState } from "react";
+import { z } from "zod";
+import type { AccountDto } from "../shared/contracts/identity";
+import type { HttpTransport } from "../infrastructure/browser/http";
+import { accountSchema, ok, failureMessage } from "./service-model";
+import { PasswordInput } from "./AccountAccess";
+import { ServiceDialog } from "./dialogs";
+export function AdminAccounts({http}:{http:HttpTransport}){
+  const[accounts,setAccounts]=useState<AccountDto[]>([]),[page,setPage]=useState(0),[total,setTotal]=useState(0),[refresh,setRefresh]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false);
+  const[name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[action,setAction]=useState<{account:AccountDto;kind:string}|null>(null);
+  const labels=useMemo(()=>({disable:"Deshabilitar cuenta",enable:"Habilitar cuenta",password:"Asignar contraseña temporal","revoke-sessions":"Revocar sesiones"}),[]);
+  useEffect(()=>{let live=true;void http.request(`/identity/admin/dms?limit=20&offset=${page*20}`,z.object({ok,accounts:z.array(accountSchema),total:z.number()})).then(r=>{if(live){setAccounts(r.accounts);setTotal(r.total);}}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,page,refresh]);
+  async function create(){if(busy)return;setBusy(true);setError("");try{await http.json("/identity/admin/dms",z.object({ok,account:accountSchema}),"POST",{name,email,password});setName("");setEmail("");setRefresh(n=>n+1);}catch(e){setError(failureMessage(e));}finally{setPassword("");setBusy(false);}}
+  async function apply(){if(!action||busy)return;setBusy(true);try{await http.json(`/identity/admin/dms/${action.account.id}/${action.kind}`,z.undefined(),"POST",action.kind==="password"?{password}:{});setAction(null);setRefresh(n=>n+1);}catch(e){setError(failureMessage(e));}finally{setPassword("");setBusy(false);}}
+  return <section><h2>Cuentas DM</h2><p>Solo un administrador proporciona cuentas. Entrega la contraseña temporal por un canal privado; el primer acceso exige cambiarla.</p><form onSubmit={e=>{e.preventDefault();void create();}} className="service-form"><label>Nombre<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><label>Correo electrónico<input required type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)}/></label>{!action&&<PasswordInput label="Contraseña temporal" autoComplete="new-password" value={password} onChange={setPassword}/>}<button disabled={busy||!!action}>Crear DM</button></form><p role="alert">{error}</p><ul className="service-cards">{accounts.map(a=><li key={a.id}><h3>{a.name}</h3><p>{a.email} · {a.enabled?"Habilitada":"Deshabilitada"}{a.mustChangePassword?" · cambio obligatorio":""}</p>{([a.enabled?"disable":"enable","password","revoke-sessions"] as const).map(kind=><button key={kind} onClick={()=>{setPassword("");setAction({account:a,kind});}}>{labels[kind]}</button>)}</li>)}</ul><nav><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1}</span><button disabled={(page+1)*20>=total} onClick={()=>setPage(p=>p+1)}>Siguiente</button></nav>{action&&<ServiceDialog title={labels[action.kind as keyof typeof labels]} onCancel={()=>{if(!busy){setAction(null);setPassword("");}}}><p>{action.account.name} · {action.account.email}</p><p>{action.kind==="enable"?"Habilitar permite nuevos accesos, sin reabrir partidas.":"Se revocarán los accesos afectados. La deshabilitación también termina sus partidas abiertas."}</p>{action.kind==="password"&&<PasswordInput label="Contraseña temporal" autoComplete="new-password" value={password} onChange={setPassword}/>}<p role="alert">{error}</p><footer><button disabled={busy} autoFocus onClick={()=>{setAction(null);setPassword("");}}>Cancelar</button><button disabled={busy} onClick={()=>void apply()}>Confirmar</button></footer></ServiceDialog>}</section>;
+}
diff --git a/src/web/AdminSystems.tsx b/src/web/AdminSystems.tsx
new file mode 100644
index 0000000..0cc7d22
--- /dev/null
+++ b/src/web/AdminSystems.tsx
@@ -0,0 +1,19 @@
+import { MonsterTemplateFields } from "../renderer/src/components/aside/MonsterTemplateFields";
+import { createEmptyMonsterTemplate } from "../domain/monster-templates/monster-template";
+import { useEffect, useMemo, useState } from "react";
+import { z } from "zod";
+import { systemSeeds, type SystemDefinition, type SystemVersion } from "../domain/systems/system-catalog";
+import type { HttpTransport } from "../infrastructure/browser/http";
+import { Mutations, systemsReply, versionSchema, ok, failureMessage } from "./service-model";
+import { ServiceDialog } from "./dialogs";
+export function AdminSystems({http}:{http:HttpTransport}){
+  const mutations=useMemo(()=>new Mutations(http),[http]);
+  const[feedback,setFeedback]=useState("");
+  const[systems,setSystems]=useState<z.infer<typeof systemsReply>["systems"]>([]),[refresh,setRefresh]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false),[id,setId]=useState(""),[name,setName]=useState("");
+  const[draft,setDraft]=useState<{systemId:string;version:number;revision:number;definition:SystemDefinition}|null>(null);
+  const[confirmation,setConfirmation]=useState<{version:SystemVersion;template?:string;availability:"enabled"|"disabled"}|null>(null);
+  useEffect(()=>{let live=true;void http.request("/admin/systems",systemsReply).then(r=>{if(live)setSystems(r.systems);}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,refresh]);
+  async function run(work:()=>Promise<unknown>){if(busy)return;setBusy(true);setError("");setFeedback("");try{await work();setRefresh(n=>n+1);}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
+
+  return <section><h2>Sistemas y versiones</h2><p>Las publicaciones conservan su contenido y hash. Deshabilitar impide usos nuevos; las partidas existentes conservan su versión. No se borran sistemas ni plantillas.</p><form className="service-form" onSubmit={e=>{e.preventDefault();void run(async()=>{await mutations.send("/admin/systems",z.object({ok}),"POST",{systemId:id,name});setId("");setName("");});}}><label>ID del sistema<input required pattern="[a-z][a-z0-9-]{0,79}" value={id} onChange={e=>setId(e.target.value)}/></label><label>Nombre<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><button disabled={busy}>Crear sistema</button></form><p role="alert">{error}</p><ul className="service-cards">{systems.map(s=><li key={s.systemId}><h3>{s.name} · {s.systemId}</h3><button onClick={()=>setDraft({systemId:s.systemId,version:Math.max(0,...s.versions.map(v=>v.version))+1,revision:0,definition:structuredClone(s.versions.at(-1)?.definition??systemSeeds[0].definition)})}>Crear otra versión</button>{s.versions.map(v=><section key={v.version}><h4>Versión {v.version} · {v.state==="draft"?"Borrador":"Publicada"} · {v.availability==="enabled"?"Habilitada":"Deshabilitada para usos nuevos"}</h4><p className="service-hash">Hash: {v.hash||"Pendiente de publicación"}</p>{v.state==="draft"?<><button onClick={()=>setDraft({systemId:s.systemId,version:v.version,revision:v.revision,definition:structuredClone(v.definition)})}>Editar borrador</button><button disabled={busy} onClick={()=>void run(()=>mutations.send(`/admin/systems/${s.systemId}/versions/${v.version}/publish`,z.object({ok,version:versionSchema}),"POST",{},v.revision))}>Publicar versión</button></>:<><button onClick={()=>setConfirmation({version:v,availability:v.availability==="enabled"?"disabled":"enabled"})}>{v.availability==="enabled"?"Deshabilitar versión":"Habilitar versión"}</button>{v.definition.presentations.map(t=><p key={t.id}>{t.name} · {t.id} · {v.templates[t.id]?.availability==="enabled"?"Habilitada":"Deshabilitada"} <button onClick={()=>setConfirmation({version:v,template:t.id,availability:v.templates[t.id]?.availability==="enabled"?"disabled":"enabled"})}>Cambiar disponibilidad de {t.name}</button></p>)}</>}</section>)}</li>)}</ul>{draft&&<ServiceDialog title={`Borrador ${draft.systemId} · versión ${draft.version}`} onCancel={()=>{if(!busy)setDraft(null);}}><form onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await mutations.send(`/admin/systems/${draft.systemId}/versions/${draft.version}`,z.object({ok,version:versionSchema}),"PUT",draft.definition,draft.revision);setDraft({...draft,revision:r.version.revision});setFeedback("Borrador guardado. Puedes cerrarlo y publicar la versión.");});}}><label>Perfil de reglas<select value={draft.definition.manifest.rules} onChange={e=>{const seed=systemSeeds.find(s=>s.definition.manifest.rules===e.target.value)!;setDraft({...draft,definition:structuredClone(seed.definition)});}}><option value="generic-v1">Genérico</option><option value="dnd-55e-v1">D&D 5.5</option></select></label><label>Diagonal para documentos nuevos<select value={draft.definition.rules.defaultDiagonalMode} onChange={e=>setDraft({...draft,definition:{...draft.definition,rules:{...draft.definition.rules,defaultDiagonalMode:e.target.value as SystemDefinition["rules"]["defaultDiagonalMode"]}}})}>{["euclidean","dnd5e-default","dnd5e-alternating","manhattan"].map(x=><option key={x} value={x}>{{euclidean:"Euclidiana", "dnd5e-default":"D&D: diagonal simple", "dnd5e-alternating":"D&D: diagonal alternada",manhattan:"Manhattan: suma de ejes"}[x]}</option>)}</select></label>{draft.definition.presentations.map((t,index)=><fieldset key={t.id}><legend>Presentación {t.id}</legend><MonsterTemplateFields template={t} onChange={value=>setDraft({...draft,definition:{...draft.definition,presentations:draft.definition.presentations.map((item,i)=>i===index?value:item)}})}/><button type="button" onClick={()=>setDraft({...draft,definition:{...draft.definition,presentations:[...draft.definition.presentations,{...t,id:`template-${crypto.randomUUID()}`,name:`${t.name} copia`,builtIn:false}]}})}>Duplicar presentación</button></fieldset> )}<button type="button" onClick={()=>setDraft({...draft,definition:{...draft.definition,presentations:[...draft.definition.presentations,createEmptyMonsterTemplate(`template-${crypto.randomUUID()}`)]}})}>Nueva presentación</button><p role="status">{feedback}</p><p role="alert">{error}</p><footer><button type="button" disabled={busy} onClick={()=>setDraft(null)}>Cerrar borrador</button><button disabled={busy}>Guardar borrador</button></footer></form></ServiceDialog>}{confirmation&&<ServiceDialog title="Cambiar disponibilidad" onCancel={()=>{if(!busy)setConfirmation(null);}}><p>{confirmation.version.systemId} · versión {confirmation.version.version}{confirmation.template?` · plantilla ${confirmation.template}`:""}</p><p>Deshabilitar impide usos nuevos y conserva instancias existentes. Rehabilitar la versión no rehabilita plantillas individualmente.</p><p role="alert">{error}</p><footer><button autoFocus disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</button><button disabled={busy} onClick={()=>void run(async()=>{await mutations.send(`/admin/systems/${confirmation.version.systemId}/versions/${confirmation.version.version}/${confirmation.template?`templates/${confirmation.template}/`:""}availability`,z.object({ok,version:versionSchema}),"PATCH",{availability:confirmation.availability},confirmation.template?confirmation.version.templates[confirmation.template].revision:confirmation.version.revision);setConfirmation(null);})}>Confirmar {confirmation.availability==="enabled"?"habilitación":"deshabilitación"}</button></footer></ServiceDialog>}</section>;
+}
diff --git a/src/web/GameCatalog.tsx b/src/web/GameCatalog.tsx
new file mode 100644
index 0000000..ca73b13
--- /dev/null
+++ b/src/web/GameCatalog.tsx
@@ -0,0 +1,14 @@
+import { useEffect, useMemo, useState } from "react";
+import { z } from "zod";
+import type { GameMetadata } from "../domain/games/game-metadata";
+import type { HttpTransport } from "../infrastructure/browser/http";
+import { Mutations, gamesReply, gameReply, selectableReply, openingReply, ok, failureMessage } from "./service-model";
+import { ServiceDialog } from "./dialogs";
+export function GameCatalog({http,onOpen}:{http:HttpTransport;onOpen:(id:string)=>void}){
+  const mutations=useMemo(()=>new Mutations(http),[http]);
+  const[openings,setOpenings]=useState<Record<string,string>>({});
+  const[games,setGames]=useState<GameMetadata[]>([]),[systems,setSystems]=useState<z.infer<typeof selectableReply>["systems"]>([]),[page,setPage]=useState(0),[total,setTotal]=useState(0),[refresh,setRefresh]=useState(0),[name,setName]=useState(""),[selection,setSelection]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[action,setAction]=useState<{game:GameMetadata;kind:"rename"|"archive"|"restore"|"delete";name:string}|null>(null);
+  useEffect(()=>{let live=true;void Promise.all([http.request(`/dm/games?limit=20&offset=${page*20}`,gamesReply),http.request("/dm/systems/selectable",selectableReply)]).then(async([g,s])=>{if(live){setGames(g.games);setTotal(g.total);setSystems(s.systems);setOpenings({});}const states=await Promise.all(g.games.map(async game=>{try{const value=await http.request(`/dm/games/${game.id}/opening`,openingReply);return [game.id,value.status] as const;}catch{return [game.id,"unavailable"] as const;}}));if(live)setOpenings(Object.fromEntries(states));}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,page,refresh]);
+  async function run(work:()=>Promise<unknown>){if(busy)return;setBusy(true);setError("");try{await work();setRefresh(n=>n+1);}catch(e){setError(failureMessage(e));setRefresh(n=>n+1);}finally{setBusy(false);}}
+  return <section><h1>Tus partidas</h1><p>Las escenas y bibliotecas son tuyas y pueden reutilizarse. Cada partida conserva su sistema y versión.</p><form className="service-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const system=systems.find(s=>`${s.ref.systemId}:${s.ref.version}`===selection);if(!system)throw new Error("Selecciona un sistema y versión habilitados.");const r=await mutations.send("/dm/games",gameReply,"POST",{name,systemRef:system.ref});setName("");onOpen(r.game.id);});}}><label>Nombre de la partida<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><label>Sistema y versión<select required value={selection} onChange={e=>setSelection(e.target.value)}><option value="">Selecciona explícitamente</option>{systems.map(s=><option key={`${s.ref.systemId}:${s.ref.version}`} value={`${s.ref.systemId}:${s.ref.version}`}>{s.name} · {s.ref.systemId} · v{s.ref.version}</option>)}</select></label><button disabled={busy||!systems.length}>Crear partida</button></form>{!systems.length&&<p>No hay sistemas habilitados para nuevas partidas. Contacta al administrador.</p>}<p role="alert">{error}</p><ul className="service-cards">{games.map(g=><li key={g.id}><h2>{g.name}</h2><p>{g.systemRef.systemId} · versión {g.systemRef.version} · {g.state==="ready"?"Disponible":"Archivada"}</p><p>Apertura: {({fresh:"Anfitrión conectado",reconnecting:"Anfitrión reconectando",expired:"Acceso caducado",absent:"Sin apertura",unavailable:"No se pudo comprobar"} as Record<string,string>)[openings[g.id]]??"Comprobando…"}</p><button disabled={g.state!=="ready"} onClick={()=>onOpen(g.id)}>Abrir editor</button><button onClick={()=>setAction({game:g,kind:"rename",name:g.name})}>Renombrar</button><button onClick={()=>setAction({game:g,kind:g.state==="ready"?"archive":"restore",name:g.name})}>{g.state==="ready"?"Archivar":"Restaurar"}</button><button onClick={()=>setAction({game:g,kind:"delete",name:g.name})}>Eliminar</button></li>)}</ul><nav aria-label="Páginas de partidas"><button disabled={!page||busy} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1}</span><button disabled={(page+1)*20>=total||busy} onClick={()=>setPage(p=>p+1)}>Siguiente</button></nav>{action&&<ServiceDialog title={{rename:"Renombrar partida",archive:"Archivar partida",restore:"Restaurar partida",delete:"Eliminar partida"}[action.kind]} onCancel={()=>{if(!busy)setAction(null);}}><p>{action.game.name} · {action.game.systemRef.systemId} v{action.game.systemRef.version}</p>{action.kind==="rename"?<label>Nombre<input value={action.name} onChange={e=>setAction({...action,name:e.target.value})}/></label>:<p>{action.kind==="restore"?"La partida vuelve al catálogo disponible; no se abre automáticamente.":"Termina el acceso a esta partida. Las escenas, imágenes y bibliotecas reutilizables permanecen. El borrado de partida no tiene recuperación HTTP."}</p>}<p role="alert">{error}</p><footer><button autoFocus disabled={busy} onClick={()=>setAction(null)}>Cancelar</button><button disabled={busy} onClick={()=>void run(async()=>{await mutations.send(`/dm/games/${action.game.id}`,action.kind==="delete"?z.object({ok}):gameReply,action.kind==="delete"?"DELETE":"PATCH",action.kind==="rename"?{name:action.name}:action.kind==="delete"?{}:{state:action.kind==="archive"?"archived":"ready"},action.game.revision);setAction(null);})}>Confirmar</button></footer></ServiceDialog>}</section>;
+}
diff --git a/src/web/GameEditor.tsx b/src/web/GameEditor.tsx
new file mode 100644
index 0000000..41e31cf
--- /dev/null
+++ b/src/web/GameEditor.tsx
@@ -0,0 +1,42 @@
+import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
+import { z } from "zod";
+import { App } from "../renderer/src/App";
+import { ClientProvider } from "../renderer/src/client/ClientProvider";
+import { PortalTargetProvider } from "../renderer/src/client/PortalTarget";
+import { createBrowserClient } from "../infrastructure/browser/browser-client";
+import { contextualTableClient } from "../infrastructure/browser/contextual-table-client";
+import { HttpTransport } from "../infrastructure/browser/http";
+import { resolveCompiledModules } from "../domain/systems/system-catalog";
+import { DialogBroker, DialogHost, ServiceDialog } from "./dialogs";
+import { Participants } from "./Participants";
+import { Mutations, gameReply, configurationReply, openingReply, versionSchema, ok, failureMessage, identitySchema, type OpeningReply } from "./service-model";
+import type { ServiceWorkspace } from "./workspace";
+import type { GameMetadata } from "../domain/games/game-metadata";
+import type { ResolvedSystem, SystemVersion } from "../domain/systems/system-catalog";
+export type LeaveRegistration=(guard:()=>Promise<boolean>)=>()=>void;
+export function GameEditor({http,gameId,active,expired,onExit,onLogout,registerLeave}:{http:HttpTransport;gameId:string;active:boolean;expired:()=>void;onExit:()=>void;onLogout:()=>Promise<void>;registerLeave:LeaveRegistration}){
+  const[loaded,setLoaded]=useState<{game:GameMetadata;configuration:ResolvedSystem;version:SystemVersion}|null>(null),[opening,setOpening]=useState<OpeningReply|null>(null),[running,setRunning]=useState(false),[url,setUrl]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState<"reopen"|"close"|"rotate"|null>(null),[terminal,setTerminal]=useState("");
+  useEffect(()=>{if(!active)setUrl("");},[active]);
+  const mutations=useMemo(()=>new Mutations(http),[http]);const guard=useRef<()=>Promise<boolean>>(async()=>true);
+  const localRegister=useMemo<LeaveRegistration>(()=>fn=>{guard.current=fn;const unregister=registerLeave(fn);return()=>{guard.current=async()=>true;unregister();};},[registerLeave]);
+  useEffect(()=>{let live=true;void Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply),http.request(`/dm/games/${gameId}/opening`,openingReply)]).then(async([g,c,o])=>{resolveCompiledModules(c.configuration.definition.manifest);const v=await http.request(`/dm/systems/${c.configuration.ref.systemId}/versions/${c.configuration.ref.version}`,z.object({ok,version:versionSchema}));if(live){setLoaded({game:g.game,configuration:c.configuration,version:v.version});setOpening(o);}}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,gameId]);
+  async function start(reopen=false){if(!loaded||!opening||busy)return;setBusy(true);setError("");try{const o=opening.opening;const r=await mutations.send(`/dm/games/${gameId}/opening/${reopen?"reopen":"start"}`,openingReply,"POST",{expectedOpening:o?{id:o.id,generation:o.generation,revision:o.revision}:null},loaded.game.revision);const actual=await http.request(`/dm/games/${gameId}/opening`,openingReply);if(actual.opening?.id!==r.opening?.id)throw new Error("El resultado corresponde a una apertura anterior. Revisa el estado actual.");setOpening(actual);setUrl(r.invitationUrl??"");setRunning(true);setTerminal("");setConfirmation(null);}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
+  async function continueGame(){if(!opening?.opening||busy)return;setBusy(true);try{const r=await http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening.id,generation:opening.opening.generation});setOpening(r);setRunning(true);setTerminal("");}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
+  async function apply(){if(!opening?.opening||!confirmation||busy)return;if(confirmation!=="rotate"&&!await guard.current())return;if(confirmation==="reopen"){await start(true);return;}setBusy(true);try{const o=opening.opening;if(confirmation==="close"){await mutations.send(`/dm/games/${gameId}/opening/close`,z.undefined(),"POST",{openingId:o.id,generation:o.generation},o.revision);setRunning(false);setUrl("");}else{const r=await mutations.send(`/dm/games/${gameId}/invitation/rotate`,openingReply,"POST",{openingId:o.id,generation:o.generation,expectedInvitationVersion:opening.invitation?.version??0},o.revision);setUrl(r.invitationUrl??"");}setOpening(await http.request(`/dm/games/${gameId}/opening`,openingReply));setConfirmation(null);}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
+  async function requestAction(action:"close"|"reopen"|"rotate"){try{setOpening(await http.request(`/dm/games/${gameId}/opening`,openingReply));setConfirmation(action);}catch(e){setError(failureMessage(e));}}
+  const title=loaded?`${loaded.game.name} · ${loaded.configuration.ref.systemId} v${loaded.configuration.ref.version}`:"Cargando partida…";
+  return <div className="game-shell"><header className="game-bar" onKeyDown={e=>e.stopPropagation()}><button onClick={()=>void guard.current().then(ok=>{if(ok)onExit();})}>Partidas</button><strong>{title}</strong>{loaded?.configuration.availability==="disabled"&&<span>Deshabilitada para usos nuevos</span>}{running&&<><button disabled={busy} onClick={()=>void requestAction("close")}>Cerrar partida</button><button disabled={busy} onClick={()=>void requestAction("reopen")}>Reabrir partida</button></>}</header>{running&&loaded&&opening?.opening?<LiveEditor key={`${opening.opening.id}:${opening.opening.generation}`} {...{http,gameId,active,expired,onLogout,opening,loaded,registerLeave:localRegister,url}} frozen={!!terminal} onInvitation={setUrl} onRotate={()=>void requestAction("rotate")} onTerminal={reason=>{void http.request("/identity/session",identitySchema).then(()=>{setTerminal(reason);}).catch(()=>expired());}}/>:<main className="service-page"><h1>{title}</h1>{terminal&&<p role="alert">{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"Servicio no disponible. Reintenta explícitamente.":"Tu acceso a esta partida ya no está disponible."}</p>}<p>Iniciar abre la partida. Continuar conserva su generación. Publicar la escena es una acción posterior.</p>{opening&&<p>Estado del anfitrión: {opening.status==="fresh"?"Conectado":opening.status==="reconnecting"?"Reconectando":opening.status==="expired"?"Acceso caducado":"Sin apertura"}</p>}{loaded?.game.state==="ready"&&opening&&(opening.status==="fresh"||opening.status==="reconnecting"?<button disabled={busy} onClick={()=>void continueGame()}>Continuar partida</button>:<button disabled={busy} onClick={()=>void start()}>Iniciar partida</button>)}</main>}{terminal&&running&&<ServiceDialog title="Borrador conservado" onCancel={()=>{}}><p>{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"El servicio no está disponible.":"El acceso a esta apertura terminó."} La mesa se ha detenido. Tu borrador permanece en memoria hasta que decidas descartarlo.</p><button onClick={()=>{setRunning(false);setTerminal("");}}>Descartar borrador y volver a la partida</button></ServiceDialog>}{error&&<p className="service-floating-error" role="alert">{error}</p>}{confirmation&&<ServiceDialog title={{close:"Cerrar partida",reopen:"Reabrir partida",rotate:"Crear enlace nuevo"}[confirmation]} onCancel={()=>{if(!busy)setConfirmation(null);}}><p>{title}</p><p>{confirmation==="rotate"?"El enlace anterior dejará de admitir. Los participantes actuales continúan.":"Termina el acceso de los participantes actuales. Reabrir crea otra apertura e invitación."}</p><p role="alert">{error}</p><footer><button autoFocus disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</button><button disabled={busy} onClick={()=>void apply()}>Confirmar</button></footer></ServiceDialog>}</div>;
+}
+function LiveEditor({http,gameId,active,frozen,expired,onLogout,opening,loaded,registerLeave,url,onInvitation,onRotate,onTerminal}:{http:HttpTransport;gameId:string;active:boolean;frozen:boolean;expired:()=>void;onLogout:()=>Promise<void>;opening:OpeningReply;loaded:{game:GameMetadata;configuration:ResolvedSystem;version:SystemVersion};registerLeave:LeaveRegistration;url:string;onInvitation:(url:string)=>void;onRotate:()=>void;onTerminal:(reason:string)=>void}){
+  const[validating,setValidating]=useState(true),[resumeError,setResumeError]=useState(""),[signal,setSignal]=useState(0),[feedback,setFeedback]=useState(""),[portal,setPortal]=useState<HTMLDivElement|null>(null);
+  const callbacks=useRef({expired,onTerminal});callbacks.current={expired,onTerminal};
+  const broker=useMemo(()=>new DialogBroker(),[]);
+  const resources=useMemo(()=>new HttpTransport(fetch,()=>callbacks.current.expired(),"/api/v1/dm"),[]);
+  const table=useMemo(()=>contextualTableClient({gameId,openingId:opening.opening!.id,generation:opening.opening!.generation,audience:"dm"},reason=>callbacks.current.onTerminal(reason),fetch,()=>setSignal(n=>n+1)),[gameId,opening.opening!.id,opening.opening!.generation]);
+  const browser=useMemo(()=>createBrowserClient(resources,broker,undefined,{gameId,configuration:loaded.configuration,version:loaded.version,table}),[resources,broker,gameId,loaded,table]);
+  const workspace=useMemo<ServiceWorkspace>(()=>({browser,confirmLeave:broker.leave,logout:onLogout,registerLeave,defaultDiagonalMode:loaded.configuration.definition.rules.defaultDiagonalMode}),[browser,broker,onLogout,registerLeave,loaded]);
+  const status=useSyncExternalStore(table.subscribeStatus,table.getStatus);
+  useEffect(()=>{if(!active||frozen){setValidating(true);resources.invalidate();table.clear();broker.finish(null);return;}resources.resume();setValidating(true);let stop=()=>{};let live=true;void (async()=>{const [g,c]=await Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply)]);if(g.game.state!=="ready"||c.configuration.hash!==loaded.configuration.hash)throw new Error("La partida cambió mientras la sesión estaba cerrada. Conserva tu borrador y revisa el contexto antes de continuar.");await browser.revalidate();await http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening!.id,generation:opening.opening!.generation});if(live){setResumeError("");setValidating(false);stop=table.start("dm");}})().catch(e=>{if(live)setResumeError(failureMessage(e));});const contact=()=>{void http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening!.id,generation:opening.opening!.generation}).catch(e=>{if(live)setFeedback(failureMessage(e));});};contact();const timer=setInterval(contact,10000);return()=>{live=false;clearInterval(timer);stop();};},[active,frozen,resources,table,http,gameId,opening.opening!.id,opening.opening!.generation,broker,browser,loaded.configuration.hash]);
+  useEffect(()=>()=>{browser.clear();broker.finish(null);},[browser,broker]);
+  return <><div className="service-workspace" hidden={validating||frozen} inert={validating||frozen||!!resumeError}><div ref={setPortal}/>{portal&&<PortalTargetProvider target={portal}><ClientProvider client={browser.client}><App service={workspace}/></ClientProvider><DialogHost broker={broker} browser={browser}/></PortalTargetProvider>}</div>{validating&&!frozen&&!resumeError&&<p role="status">Comprobando la partida y sus revisiones…</p>}{resumeError&&!frozen&&<ServiceDialog title="Borrador retenido en conflicto" onCancel={()=>{}}><p>{resumeError}</p><button onClick={()=>location.reload()}>Descartar borrador y recargar</button></ServiceDialog>}<aside hidden={validating||frozen} className="service-table-status" onKeyDown={e=>e.stopPropagation()}><span className="service-live-message" role="status">{status.phase==="connected"?(status.published?"Escena publicada":"Vuelve a publicar la escena"):"Mesa desconectada. Reconectando…"}</span><span className="service-live-message" role="alert">{status.error}</span><details><summary>Mesa · {status.presence?.count??0} jugadores · {status.phase==="connected"?"Conectada":"Reconectando"}</summary><p role="status">{status.published?"Escena publicada":"Vuelve a publicar la escena. El estado visual no persiste en el servidor."}</p><button onClick={()=>void browser.associateCurrent().then(()=>setFeedback("Escena guardada asociada. Ya puedes publicarla.")).catch(e=>setFeedback(failureMessage(e)))}>Asociar escena guardada a la partida</button><label>Enlace vigente<input readOnly value={url} placeholder="Crea un enlace nuevo para compartir" onFocus={e=>e.target.select()}/></label><button disabled={!url} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setFeedback("Enlace copiado.")).catch(()=>setFeedback("Selecciona el enlace y cópialo manualmente."))}>Copiar enlace</button><button onClick={onRotate}>Crear enlace nuevo</button><p role="status">{feedback}</p><p role="alert">{status.error}</p><Participants {...{http,gameId,opening,signal,onInvitation}} gameName={loaded.game.name}/></details></aside></>;
+}
diff --git a/src/web/GuestEntry.tsx b/src/web/GuestEntry.tsx
new file mode 100644
index 0000000..da0b822
--- /dev/null
+++ b/src/web/GuestEntry.tsx
@@ -0,0 +1,35 @@
+import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
+import { z } from "zod";
+import { guestSchema, type GuestDto } from "../shared/contracts/invitations";
+import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
+import { contextualTableClient } from "../infrastructure/browser/contextual-table-client";
+import { createClient } from "../shared/api/client";
+import { ClientProvider } from "../renderer/src/client/ClientProvider";
+import { PlayerApp } from "../renderer/src/PlayerApp";
+import { createBrowserClient } from "../infrastructure/browser/browser-client";
+import { DialogBroker } from "./dialogs";
+import { Mutations, ok, failureMessage } from "./service-model";
+import { captureInvitation } from "./invitation-fragment";
+export type CapturedInvitation=ReturnType<typeof captureInvitation>;
+const reply=guestSchema.extend({ok,replayed:z.boolean().optional()});
+export function GuestEntry({gameId,invitation}:{gameId:string;invitation:CapturedInvitation}){
+  const[guest,setGuest]=useState<GuestDto|null>(null),[alias,setAlias]=useState(""),[link,setLink]=useState(""),[checking,setChecking]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false),[terminal,setTerminal]=useState("");
+  const secret=useRef<string|undefined>(undefined);const captured=useRef(false);
+  if(!captured.current){captured.current=true;secret.current=invitation.consume();}
+  const http=useMemo(()=>new HttpTransport(fetch,()=>{},`/api/v1/games/${gameId}`),[gameId]);
+  const operations=useMemo(()=>new Mutations(http),[http]);
+  async function session(){http.resume();try{const r=await http.request("/guest/session",reply);secret.current=undefined;setGuest(r);setTerminal("");setError("");}catch{setError("El acceso no está disponible. Usa una invitación vigente del DM.");}finally{http.resume();setChecking(false);}}
+  useEffect(()=>{let live=true;http.resume();void http.request("/guest/session",reply).then(r=>{if(live){secret.current=undefined;setGuest(r);}}).catch(()=>{}).finally(()=>{if(live){http.resume();setChecking(false);}});return()=>{live=false;http.invalidate();};},[http]);
+  async function admit(){if(busy)return;setBusy(true);setError("");http.resume();try{let value=secret.current;if(link){const parsed=new URL(link);if(parsed.origin!==location.origin||parsed.pathname!==`/jugar/${gameId}`||parsed.search)throw new Error("Pega una invitación de esta partida y del mismo servicio.");value=captureInvitation({pathname:parsed.pathname,search:"",hash:parsed.hash},{state:null,replaceState:()=>{}}).consume();setLink("");secret.current=value;}if(!value)throw new Error("Solicita un enlace vigente al DM y pégalo aquí.");const r=await operations.send("/admission",reply,"POST",{secret:value,alias});secret.current=undefined;setGuest(r);setTerminal("");}catch(e){if(e instanceof ServiceError&&(e.status===401||e.code==="ADMISSION_ALREADY_PROCESSED")){secret.current=undefined;setLink("");setError(e.code==="ADMISSION_ALREADY_PROCESSED"?"La entrada anterior fue procesada pero no se recuperó su acceso. Pega una invitación vigente para iniciar una entrada nueva, con otra identidad.":"El enlace no está disponible. Solicita uno vigente al DM y pégalo aquí.");}else setError(failureMessage(e));}finally{http.resume();setBusy(false);}}
+  async function leave(){setBusy(true);try{http.resume();await http.json("/guest/leave",z.undefined(),"POST",{});setGuest(null);secret.current=undefined;setError("Has salido. Necesitas una invitación vigente para volver a entrar.");}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
+  if(guest)return <GuestWorkspace key={`${guest.openingId}:${guest.generation}:${guest.participantId}`} guest={guest} onTerminal={reason=>{secret.current=undefined;setGuest(null);setTerminal(reason);}} onLeave={()=>void leave()} error={error}/>;
+  return <main className="service-access"><section><h1>Entrar a la partida</h1>{checking?<p role="status">Comprobando acceso…</p>:<><p>{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"Servicio no disponible. Reintenta explícitamente.":terminal==="access-ended"?"Tu acceso a esta partida ya no está disponible.":"Elige un alias. El DM verá tu nombre y un número que distingue alias repetidos."}</p>{terminal&&<button onClick={()=>void session()}>Comprobar acceso y retomar</button>}<form onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();secret.current=undefined;setLink("");setError("Entrada cancelada. Pega una invitación vigente para continuar.");}}} onSubmit={e=>{e.preventDefault();void admit();}}><label>Alias<input autoComplete="nickname" required value={alias} onChange={e=>setAlias(e.target.value)} /></label>{!secret.current&&<label>Invitación del mismo servicio<input type="password" autoComplete="off" value={link} onChange={e=>setLink(e.target.value)}/></label>}<button disabled={busy}>{busy?"Entrando…":"Entrar"}</button><button type="button" disabled={busy} onClick={()=>{secret.current=undefined;setLink("");setError("Entrada cancelada. Solicita una invitación para volver a intentarlo.");}}>Cancelar entrada</button><p role="alert">{error}</p></form></>}</section></main>;
+}
+function GuestWorkspace({guest,onTerminal,onLeave,error}:{guest:GuestDto;onTerminal:(reason:string)=>void;onLeave:()=>void;error:string}){
+  const callback=useRef(onTerminal);callback.current=onTerminal;
+  const table=useMemo(()=>contextualTableClient({gameId:guest.gameId,openingId:guest.openingId,generation:guest.generation,audience:"player"},reason=>callback.current(reason)),[guest.gameId,guest.openingId,guest.generation]);
+  const client=useMemo(()=>{const base=createBrowserClient(new HttpTransport(fetch,()=>{}),new DialogBroker());return createClient({...base.client.api,...table.api},{scenes:false,images:true,libraries:false,templateAdministration:false,player:true,dice:true,nativeMenus:false},"service");},[table]);
+  const status=useSyncExternalStore(table.subscribeStatus,table.getStatus);
+  useEffect(()=>{const stop=table.start("player");return()=>{stop();table.clear();};},[table]);
+  return <div className="service-player-workspace"><ClientProvider client={client}><PlayerApp unavailableMessage={status.phase!=="connected"?"Mesa desconectada. Reconectando…":"Esperando publicación del DM"}/></ClientProvider><button className="service-player-logout" onClick={onLeave}>Salir de la partida</button><aside className="service-table-status service-table-status--player"><p role="status">{guest.alias} #{guest.discriminator} · {status.phase!=="connected"?"Reconectando":status.published?"Conectado":"Esperando publicación"}</p><p role="alert">{error||status.error}</p></aside></div>;
+}
diff --git a/src/web/Participants.tsx b/src/web/Participants.tsx
new file mode 100644
index 0000000..945135d
--- /dev/null
+++ b/src/web/Participants.tsx
@@ -0,0 +1,15 @@
+import { useEffect, useMemo, useState } from "react";
+import type { HttpTransport } from "../infrastructure/browser/http";
+import { Mutations, rosterReply, kickReply, openingReply, type OpeningReply, failureMessage } from "./service-model";
+import type { z } from "zod";
+import { ServiceDialog } from "./dialogs";
+export function Participants({http,gameId,gameName,opening,signal,onInvitation}:{http:HttpTransport;gameId:string;gameName:string;opening:OpeningReply;signal:number;onInvitation:(url:string)=>void}){
+  const mutations=useMemo(()=>new Mutations(http),[http]);
+  const[roster,setRoster]=useState<z.infer<typeof rosterReply>|null>(null),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false),[target,setTarget]=useState<{participant:z.infer<typeof rosterReply>["items"][number];opening:OpeningReply}|null>(null);
+  const current=opening.opening!;
+  useEffect(()=>{let live=true;void http.request(`/dm/games/${gameId}/participants?openingId=${current.id}&generation=${current.generation}&limit=20&offset=${page*20}`,rosterReply).then(r=>{if(live)setRoster(r);}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,gameId,current.id,current.generation,page,refresh,signal]);
+  const names={connected:"Conectado",reconnecting:"Reconectando",revoked:"Expulsado",left:"Salió",expired:"Expirado"};
+  async function select(participant:z.infer<typeof rosterReply>["items"][number]){try{const latest=await http.request(`/dm/games/${gameId}/opening`,openingReply);if(latest.opening?.id!==current.id)throw new Error("La apertura cambió. Vuelve a entrar desde el catálogo.");setTarget({participant,opening:latest});}catch(e){setError(failureMessage(e));}}
+  async function kick(){if(!target||busy)return;setBusy(true);setError("");const captured=target;try{const o=captured.opening.opening!;const r=await mutations.send(`/dm/games/${gameId}/participants/${captured.participant.participantId}/kick`,kickReply,"POST",{openingId:o.id,generation:o.generation,expectedInvitationVersion:captured.opening.invitation?.version??0},o.revision);onInvitation(r.invitationUrl??"");setTarget(null);setRefresh(n=>n+1);}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
+  return <section><h3>Participantes · {roster?.total??0}</h3><ul className="participant-list">{roster?.items.map(p=><li key={p.participantId}><strong>{p.alias} #{p.discriminator}</strong><span>{names[p.presence]}</span>{p.admission==="admitted"&&p.presence!=="expired"&&<button disabled={busy} onClick={()=>void select(p)}>Expulsar {p.alias} #{p.discriminator}</button>}</li>)}</ul><nav><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Anterior</button><button disabled={(page+1)*20>=(roster?.total??0)} onClick={()=>setPage(p=>p+1)}>Siguiente</button></nav><p role="alert">{error}</p>{target&&<ServiceDialog title="Expulsar participante" onCancel={()=>{if(!busy)setTarget(null);}}><p><strong>{target.participant.alias} #{target.participant.discriminator}</strong></p><p>Partida: {gameName}. Pierde acceso y cambia el enlace. Los demás participantes continúan. No es un veto permanente si recibe una invitación nueva.</p><p role="alert">{error}</p><footer><button autoFocus disabled={busy} onClick={()=>setTarget(null)}>Cancelar</button><button disabled={busy} onClick={()=>void kick()}>{busy?"Expulsando…":"Confirmar expulsión"}</button></footer></ServiceDialog>}</section>;
+}
diff --git a/src/web/ServiceApp.test.tsx b/src/web/ServiceApp.test.tsx
index 647df97..35da5c7 100644
--- a/src/web/ServiceApp.test.tsx
+++ b/src/web/ServiceApp.test.tsx
@@ -1,81 +1,40 @@
 // @vitest-environment jsdom
-import { TableSession } from "../application/services/table-session";
-import { privateFixture } from "../application/services/public-table-projection.fixture";
-import { randomUUID } from "node:crypto";
 import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, expect, it, vi } from "vitest";
-import { ModalBackdrop } from "../renderer/src/components/aside/ModalBackdrop";
 import { ServiceApp } from "./ServiceApp";
 import { DialogBroker, DialogHost } from "./dialogs";
 import { createBrowserClient } from "../infrastructure/browser/browser-client";
 import { HttpTransport } from "../infrastructure/browser/http";
-import { useTtrpgApi } from "../renderer/src/client/ClientProvider";
-vi.mock("../renderer/src/App",()=>({App:({service}:{service:{logout:()=>Promise<void>}})=>{const api=useTtrpgApi("scenes");return <div><span>VTT privado DM</span><ModalBackdrop onClose={()=>{}}><input aria-label="Borrador portal" defaultValue="Secreto conservado"/></ModalBackdrop><input aria-label="Cambio privado"/><button onClick={()=>void api?.loadScene()}>Cargar escena</button><button onClick={()=>void service.logout()}>Cerrar sesión</button></div>;}}));
-vi.mock("../renderer/src/PlayerApp",()=>({PlayerApp:({unavailableMessage}:{unavailableMessage:string})=><div>Jugador: {unavailableMessage}</div>}));
+vi.mock("./GameEditor",()=>({GameEditor:({expired}:{expired:()=>void})=><div>VTT privado<input aria-label="Borrador" defaultValue="secreto"/><button onClick={expired}>Simular expiración</button><div data-portal>Portal protegido</div></div>}));
+vi.mock("./GameCatalog",()=>({GameCatalog:()=> <div>Catálogo privado</div>}));
+vi.mock("./AdminAccounts",()=>({AdminAccounts:()=> <div>Cuentas administradas</div>}));
+vi.mock("./AdminSystems",()=>({AdminSystems:()=> <div>Sistemas administrados</div>}));
+vi.mock("./GuestEntry",()=>({GuestEntry:()=> <div>Entrada invitada separada</div>}));
 let host:HTMLDivElement,root:Root;
-const session=(role="dm")=>({ok:true,role,expiresAt:"2026-10-29T12:00:00.000Z"});
+const account={id:"account-a",email:"a@example.test",name:"DM A",role:"dm",enabled:true,mustChangePassword:false,emailVerified:false,createdAt:"2026-10-31T00:00:00.000Z",updatedAt:"2026-10-31T00:00:00.000Z"};
+const session=(changes:object={})=>({ok:true,account:{...account,...changes},sessionId:"session",expiresAt:"2026-10-31T20:00:00.000Z"});
 const response=(value:unknown,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
-const fail=()=>response({ok:false,error:{code:"UNAUTHORIZED",message:"Clave inválida"}},401);
-beforeEach(()=>{vi.spyOn(HttpTransport.prototype,"stream").mockImplementation((_path,signal)=>new Promise((_resolve,reject)=>{signal.addEventListener("abort",()=>reject(new Error("cerrado")),{once:true});}));Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement("div");document.body.append(host);root=createRoot(host);HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};});
+const fail=()=>response({ok:false,error:{code:"UNAUTHORIZED",message:"Acceso inválido"}},401);
+beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});history.replaceState(null,"","/");host=document.createElement("div");document.body.append(host);root=createRoot(host);HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};});
 afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
 async function render(){await act(async()=>root.render(<ServiceApp/>));}
 async function click(text:string){const element=[...host.querySelectorAll("button")].find(b=>b.textContent===text);expect(element).toBeTruthy();await act(async()=>element!.click());}
 async function fill(selector:string,value:string){const element=host.querySelector<HTMLInputElement>(selector)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new Event("input",{bubbles:true}));});}
 async function submit(){await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));}
-it("consulta inicial sin destello privado, acceso fallido y válido; limpia clave y logout",async()=>{
- let resolve!:(response:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>{resolve=r;})).mockResolvedValueOnce(fail()).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(null,204));vi.stubGlobal("fetch",fetcher);
- await render();expect(host.textContent).toContain("Comprobando sesión");expect(host.textContent).not.toContain("VTT privado");await act(async()=>resolve(fail()));
- await fill('input[type="password"]',"incorrecta");await submit();expect(host.textContent).toContain("Clave inválida");expect(host.querySelector<HTMLInputElement>('input[type="password"]')!.value).toBe("");
- await fill('input[type="password"]',"d".repeat(32));await submit();expect(host.textContent).toContain("VTT privado DM");expect(fetcher.mock.calls[2][1].credentials).toBe("same-origin");
- await click("Cerrar sesión");expect(host.textContent).not.toContain("VTT privado DM");expect(host.textContent).toContain("Acceso a tu mesa");
-});
-it("rol jugador del servidor nunca monta App ni consulta recursos privados",async()=>{
- const fetcher=vi.fn(async()=>response(session("player")));vi.stubGlobal("fetch",fetcher);window.history.replaceState({},"","/?view=dm");await render();expect(host.textContent).toContain("Jugador:");expect(host.textContent).not.toContain("VTT privado");expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]).toBeDefined();
-});
-it("selector vacío, error/reintento, confirmación y cancelación",async()=>{
- const broker=new DialogBroker();const fetcher=vi.fn().mockResolvedValueOnce(response({ok:true,scenes:[],total:0})).mockResolvedValueOnce(response({ok:false,error:{code:"INTERNAL_ERROR",message:"Reintenta carga"}},500)).mockResolvedValueOnce(response({ok:true,scenes:[{id:"01010101-0101-4101-8101-010101010101",name:"Escena muy larga",createdAt:"2026-10-29T12:00:00.000Z",updatedAt:"2026-10-29T12:00:00.000Z"}],total:1}));
- const browser=createBrowserClient(new HttpTransport(fetcher),broker);await act(async()=>root.render(<DialogHost broker={broker} browser={browser}/>));
- let picked!:Promise<string|null>;await act(async()=>{picked=broker.selectScene();});expect(host.textContent).toContain("No hay escenas guardadas");await click("Cancelar");expect(await picked).toBeNull();
- await act(async()=>{picked=broker.selectScene();});expect(host.textContent).toContain("Reintenta carga");await click("Reintentar");const select=host.querySelector("select")!;await act(async()=>{select.value="01010101-0101-4101-8101-010101010101";select.dispatchEvent(new Event("change",{bubbles:true}));});await click("Abrir escena");expect(await picked).toBe("scene:01010101-0101-4101-8101-010101010101");
-});
-it("diálogo cambios pendientes: guardar, descartar, cancelar y Escape",async()=>{
- const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn()),broker);await act(async()=>root.render(<DialogHost broker={broker} browser={browser}/>));
- for(const [label,value]of [["Guardar y continuar","save"],["Descartar","discard"],["Cancelar",null]] as const){let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await click(label);expect(await choice).toBe(value);}
- let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await act(async()=>host.querySelector("dialog")!.dispatchEvent(new Event("cancel",{cancelable:true})));expect(await choice).toBeNull();
-});
-it("expiración oculta DM, conserva cambios en memoria y solo recupera con el mismo rol",async()=>{
- const fetcher=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(fail()).mockResolvedValueOnce(response(session("player"))).mockResolvedValueOnce(response(null,204)).mockResolvedValueOnce(response(session()));vi.stubGlobal("fetch",fetcher);await render();await fill('[aria-label="Cambio privado"]',"Pendiente privado");
- await click("Cargar escena");expect(host.textContent).toContain("Recuperar sesión");expect(host.querySelector('.service-workspace')?.hasAttribute("hidden")).toBe(true);expect(document.querySelector('[aria-label="Borrador portal"]')?.closest("[hidden][inert]")).not.toBeNull();expect(host.querySelector('select')?.disabled).toBe(true);
- await fill('input[type="password"]',"p".repeat(32));await submit();expect(host.textContent).toContain("La clave no corresponde");expect(host.querySelector('.service-workspace')?.hasAttribute("hidden")).toBe(true);
- await fill('input[type="password"]',"d".repeat(32));await submit();expect(host.querySelector('.service-workspace')?.hasAttribute("hidden")).toBe(false);expect(host.querySelector<HTMLInputElement>('[aria-label="Cambio privado"]')!.value).toBe("Pendiente privado");expect(document.querySelector<HTMLInputElement>('[aria-label="Borrador portal"]')!.value).toBe("Secreto conservado");expect(document.querySelector('[aria-label="Borrador portal"]')?.closest("[hidden], [inert]")).toBeNull();
-});
-it("descartar durante expiración ofrece cancelar sin prometer guardado; restaura foco",async()=>{
- const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn()),broker);await act(async()=>root.render(<><button>Disparador</button><DialogHost broker={broker} browser={browser}/></>));const trigger=host.querySelector('button')!;trigger.focus();let choice!:Promise<string|null>;await act(async()=>{choice=broker.discard();});expect(host.textContent).toContain("vuelve a acceder como DM");expect(host.textContent).not.toContain("Guardar y continuar");await click("Cancelar");expect(await choice).toBeNull();expect(document.activeElement).toBe(trigger);
-});
-
-it("anuncia estados y errores con Mesa cerrado sin anunciar reportes de cámara",async()=>{
-  let controller!:ReadableStreamDefaultController<Uint8Array>;
-  vi.mocked(HttpTransport.prototype.stream).mockResolvedValue(new Response(new ReadableStream<Uint8Array>({start(c){controller=c;}}),{headers:{"content-type":"text/event-stream"}}));
-  vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();
-  const table=new TableSession(Date.now,randomUUID);
-  const flush=async()=>act(async()=>{for(let i=0;i<20;i++)await Promise.resolve();});
-  const dm=table.connect("dm","dm",e=>controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`)));
-  const player=table.connect("p","player",()=>{});table.publish(privateFixture());await flush();
-  const live=host.querySelector('.service-table-status > [role="status"]')!;
-  expect(live.closest("details")).toBeNull();expect(host.querySelector('details')?.open).toBe(false);expect(live.textContent).toContain("cargando");
-  table.imageStatus("p",player.id,table.revision,{imageUrl:table.state("player").snapshot!.mapImageUrl!,ok:false});await flush();expect(live.textContent).toContain("Error de imagen");
-  table.imageStatus("p",player.id,table.revision,{imageUrl:table.state("player").snapshot!.mapImageUrl!,ok:true});table.ready("p",player.id,table.revision);await flush();expect(live.textContent).toContain("Jugador listo");
-  const stable=live.textContent;table.report("p",player.id,{reportRevision:1,acknowledgedCommandRevision:null,camera:{center:{x:99,y:99},zoom:2},origin:"local-navigation",final:true});await flush();expect(live.textContent).toBe(stable);
-  table.emit("render-error","Error de prueba seguro","dm");await flush();expect(host.querySelector('.service-table-status > [role="alert"]')?.textContent).toBe("Error de prueba seguro");
-  controller.close();await flush();expect(live.textContent).toContain("desconectada");dm.close();player.close();
-});
+it("login sin selector conserva email y limpia contraseña al fallar; autoriza por cuenta",async()=>{
+ let resolve!:(r:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>{resolve=r;})).mockResolvedValueOnce(fail()).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(null,204));vi.stubGlobal("fetch",fetcher);
+ await render();expect(host.textContent).toContain("Comprobando sesión");expect(host.textContent).not.toContain("Catálogo privado");await act(async()=>resolve(fail()));expect(host.querySelector("select")).toBeNull();
+ await fill('input[type="email"]',account.email);await fill('input[type="password"]',"incorrecta");await submit();expect(host.textContent).toContain("Acceso inválido");expect(host.querySelector<HTMLInputElement>('input[type="password"]')!.value).toBe("");expect(host.querySelector<HTMLInputElement>('input[type="email"]')!.value).toBe(account.email);
+ await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.textContent).toContain("Catálogo privado");expect(fetcher.mock.calls[2][0]).toBe("/api/v1/identity/login");await click("Cerrar sesión");expect(host.textContent).not.toContain("Catálogo privado");
+});
+it("cambio obligatorio no carga catálogo ni editor aun con URL directa",async()=>{history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn(async()=>response(session({mustChangePassword:true})));vi.stubGlobal("fetch",f);await render();expect(host.textContent).toContain("Cambiar contraseña");expect(host.textContent).not.toContain("VTT privado");expect(f).toHaveBeenCalledTimes(1);});
+it("expiración oculta canvas y portales; mismo ID recupera; email igual con otro ID exige descarte",async()=>{
+ history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session({id:"other"})));vi.stubGlobal("fetch",f);await render();await fill('[aria-label="Borrador"]',"Pendiente");await click("Simular expiración");expect(host.querySelector('[data-portal]')?.closest('[hidden][inert]')).not.toBeNull();await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.querySelector<HTMLInputElement>('[aria-label="Borrador"]')?.value).toBe("Pendiente");expect(host.querySelector('[data-portal]')?.closest('[hidden]')).toBeNull();await click("Simular expiración");await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.textContent).toContain("Cambiar de cuenta");expect(host.querySelector('[data-portal]')?.closest('[hidden][inert]')).not.toBeNull();await click("Descartar borrador y cambiar cuenta");expect(host.querySelector('[aria-label="Borrador"]')).toBeNull();expect(host.textContent).toContain("Catálogo privado");
+});
+it("invitado usa ruta reservada y no consulta identidad; view=player no autoriza",async()=>{history.replaceState(null,"","/jugar/01010101-0101-4101-8101-010101010101");const f=vi.fn();vi.stubGlobal("fetch",f);await render();expect(host.textContent).toContain("Entrada invitada separada");expect(f).not.toHaveBeenCalled();});
+it("administrador tiene pantalla separada sin capacidades de mapa",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>response(session({role:"admin"}))));await render();expect(host.textContent).toContain("Cuentas administradas");expect(host.textContent).not.toContain("VTT privado");await click("Sistemas");expect(host.textContent).toContain("Sistemas administrados");});
+it("diálogo pendiente guarda/descarta/cancela y Escape devuelve foco",async()=>{const broker=new DialogBroker(),browser=createBrowserClient(new HttpTransport(vi.fn()),broker);await act(async()=>root.render(<><button>Disparador</button><DialogHost broker={broker} browser={browser}/></>));const trigger=host.querySelector("button")!;trigger.focus();for(const [label,value] of [["Guardar y continuar","save"],["Descartar","discard"],["Cancelar",null]] as const){let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await click(label);expect(await choice).toBe(value);}let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await act(async()=>host.querySelector("dialog")!.dispatchEvent(new Event("cancel",{cancelable:true})));expect(await choice).toBeNull();expect(document.activeElement).toBe(trigger);});
 
-it("el fallo de logout jugador permanece visible en el flujo de Mesa cerrada",async()=>{
-  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(response(session("player"))).mockResolvedValueOnce(response({ok:false,error:{code:"INTERNAL_ERROR",message:"No se pudo cerrar sesión. Reintenta."}},503)));
-  await render();await click("Cerrar sesión");
-  const error=host.querySelector('.service-table-status > .service-player-error');
-  expect(error?.getAttribute("role")).toBe("alert");expect(error?.textContent).toContain("No se pudo cerrar sesión");
-  expect(error?.closest("details")).toBeNull();expect(host.querySelector('details')?.open).toBe(false);
-  expect(host.textContent).toContain("Jugador:");
-});
+it("reset obligatorio del mismo ID conserva borrador oculto hasta nueva autenticación",async()=>{
+ history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session({mustChangePassword:true}))).mockResolvedValueOnce(response(null,204)).mockResolvedValueOnce(response(null,204)).mockResolvedValueOnce(response(session()));vi.stubGlobal("fetch",f);await render();await fill('[aria-label="Borrador"]',"Retener durante reset");const draft=host.querySelector('[aria-label="Borrador"]');await click("Simular expiración");await fill('input[type="password"]',"temporal de fixture");await submit();expect(host.textContent).toContain("debes cambiar la contraseña temporal");expect(host.querySelector('[aria-label="Borrador"]')).toBe(draft);expect(draft?.closest('[hidden][inert]')).not.toBeNull();expect(f).toHaveBeenCalledTimes(2);const passwords=host.querySelectorAll<HTMLInputElement>('input[type="password"]');for(const [index,value] of ["temporal de fixture","nueva passphrase de fixture","nueva passphrase de fixture"].entries()){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(passwords[index],value);passwords[index].dispatchEvent(new Event("input",{bubbles:true}));});}await submit();expect(host.textContent).toContain("Recuperar sesión");expect(host.querySelector('[aria-label="Borrador"]')).toBe(draft);await fill('input[type="password"]',"nueva passphrase de fixture");await submit();expect(host.querySelector<HTMLInputElement>('[aria-label="Borrador"]')?.value).toBe("Retener durante reset");expect(draft?.closest('[hidden]')).toBeNull();});
diff --git a/src/web/ServiceApp.tsx b/src/web/ServiceApp.tsx
index 4b698cb..64ab21d 100644
--- a/src/web/ServiceApp.tsx
+++ b/src/web/ServiceApp.tsx
@@ -1,71 +1,34 @@
-import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
+import { useCallback, useEffect, useMemo, useRef, useState } from "react";
 import { z } from "zod";
-import { App } from "../renderer/src/App";
-import { PlayerApp } from "../renderer/src/PlayerApp";
-import { PortalTargetProvider } from "../renderer/src/client/PortalTarget";
-import { ClientProvider } from "../renderer/src/client/ClientProvider";
-import { createClient } from "../shared/api/client";
-import type { ServiceRole } from "../shared/contracts/http-api";
-import { createBrowserClient } from "../infrastructure/browser/browser-client";
-import { HttpTransport, ServiceError, sessionSchema } from "../infrastructure/browser/http";
-import { DialogBroker, DialogHost } from "./dialogs";
-export function ServiceApp() {
-  const [linkFeedback,setLinkFeedback]=useState("");
-  const [role,setRole]=useState<ServiceRole|null>(null),[checking,setChecking]=useState(true),[expired,setExpired]=useState(false),[error,setError]=useState(""),[key,setKey]=useState(""),[requestedRole,setRequestedRole]=useState<ServiceRole>(new URLSearchParams(location.search).get("view")==="player"?"player":"dm"),[pending,setPending]=useState(false),[retry,setRetry]=useState(0);
-  const [portalTarget,setPortalTarget]=useState<HTMLDivElement|null>(null);
-  const broker=useMemo(()=>new DialogBroker(),[]);
-  const http=useMemo(()=>new HttpTransport(fetch,()=>{broker.finish(null);setExpired(true);setError("Tu sesión expiró. Los cambios permanecen en memoria. Accede como DM para recuperarlos.");}),[broker]);
-  const browser=useMemo(()=>createBrowserClient(http,broker),[http,broker]);
-  const playerClient=useMemo(()=>createClient(browser.client.api,{scenes:false,images:true,libraries:false,player:true,dice:true,nativeMenus:false},"service"),[browser]);
-  const tableStatus = useSyncExternalStore(browser.table.subscribeStatus, browser.table.getStatus);
-  useEffect(() => { if (role && !expired && !checking) return browser.table.start(role); }, [browser, role, expired, checking]);
-  useEffect(()=>{let live=true;setChecking(true);void http.request("/auth/session",sessionSchema).then(session=>{if(live){setRole(session.role);http.resume();setError("");}}).catch(error=>{if(live){setRole(null);setError(error instanceof ServiceError&&error.status===401?"":error.message);}}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[http,retry]);
-  useEffect(()=>()=>{browser.clear();broker.finish(null);},[browser,broker]);
-  const workspace=useMemo(()=>({browser,confirmLeave:broker.leave,logout:async()=>{
-    // Primero confirmar revocación: si la red falla no se afirma un cierre exitoso.
-    await http.json("/auth/logout",z.undefined(),"POST");browser.clear();broker.finish(null);setRole(null);setExpired(false);setError("");
-  }}),[browser,broker,http]);
-  async function login(event:FormEvent) {
-    event.preventDefault();setPending(true);setError("");const submittedKey=key;setKey("");
-    try {
-      const session=await http.json("/auth/login",sessionSchema,"POST",{key:submittedKey});
-      if(session.role!==(expired?role:requestedRole)){await http.json("/auth/logout",z.undefined(),"POST");throw new Error("La clave no corresponde al rol seleccionado. Usa la clave adecuada.");}
-      http.resume();setRole(session.role);setExpired(false);
-    }catch(error){setError(error instanceof Error?error.message:"No se pudo acceder.");}finally{setPending(false);}
-  }
-  const access=checking||role===null||expired;
-  const connectionMessage = tableStatus.phase !== "connected" ? "Mesa desconectada. Reconectando… La vista está desactualizada." : role === "dm"
-    ? `Proyección ${tableStatus.published ? "publicada" : "sin publicar"}. ${tableStatus.presence?.ready ? "Jugador listo" : tableStatus.presence?.imageStatus === "error" ? "Error de imagen" : tableStatus.presence?.count ? "Jugador conectado / cargando" : "Esperando jugador"}.`
-    : tableStatus.published ? "Mesa conectada." : "Esperando al DM.";
-  return <>
-    {role==="dm"&&<div className="service-workspace" hidden={access} inert={access}><div ref={setPortalTarget}/>{portalTarget&&<PortalTargetProvider target={portalTarget}><ClientProvider client={browser.client}><App service={workspace}/></ClientProvider></PortalTargetProvider>}</div>}
-    {role==="player"&&!access&&<div className="service-player-workspace"><ClientProvider client={playerClient}><PlayerApp key={tableStatus.published?"published":"waiting"} unavailableMessage={tableStatus.phase === "disconnected" ? "Mesa desconectada. Reconectando…" : "Esperando al DM"}/></ClientProvider><button className="service-player-logout" onClick={()=>void workspace.logout().catch(error=>setError(error.message))}>Cerrar sesión</button></div>}
-    {role && !access && <aside className={`service-table-status${role === "player" ? " service-table-status--player" : ""}`} onKeyDown={event=>event.stopPropagation()}>
-      <span className="service-live-message" role="status" aria-live="polite" aria-atomic="true">{connectionMessage}</span>
-      <span className="service-live-message" role="alert" aria-atomic="true">{tableStatus.error}</span>
-      {role==="player"&&error&&<p className="service-player-error" role="alert">{error}</p>}
-      <details onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}><summary>{tableStatus.phase === "connected" ? role === "dm" ? `Mesa · ${tableStatus.presence?.count ?? 0} jugadores` : tableStatus.published ? "Mesa conectada" : "Esperando al DM" : "Mesa desconectada"}</summary>
-        <p>{connectionMessage}{role === "player" && tableStatus.phase === "connected" ? " Puedes navegar localmente; las órdenes explícitas del DM recentran la vista." : ""}</p>
-        {role === "dm" && <><p>Preview principal: {tableStatus.presence?.primaryId?.slice(0,8) ?? "sin conexión"}</p><p>En otro navegador o perfil independiente, entra con la clave Jugador. Una pestaña con la cookie DM conserva su rol.</p>
-          <label>Enlace jugador<input readOnly value={tableStatus.playerUrl || `${location.origin}/?view=player`} onFocus={event=>event.target.select()}/></label>
-          <button onClick={()=>void navigator.clipboard.writeText(tableStatus.playerUrl || `${location.origin}/?view=player`).then(()=>setLinkFeedback("Enlace copiado.")).catch(()=>setLinkFeedback("Selecciona el enlace y cópialo manualmente."))}>Copiar enlace</button>
-          <a href={tableStatus.playerUrl || `${location.origin}/?view=player`} target="_blank" rel="noreferrer">Abrir enlace</a>
-          {linkFeedback && <p role="status">{linkFeedback}</p>}
-          <p>La niebla no oculta los píxeles descargados del mapa. Ocultar un objeto revoca futuras lecturas; no retira bytes ya descargados.</p></>}
-        {tableStatus.error && <p>{tableStatus.error}</p>}
-      </details>
-    </aside>}
-    {access&&<main className="service-access" onKeyDown={event=>event.stopPropagation()}><section><p className="service-eyebrow">TTRPG Effects · Servicio privado</p><h1>{expired?"Recuperar sesión":"Acceso a tu mesa"}</h1>
-      {checking?<p role="status">Comprobando sesión…</p>:<form onSubmit={login}>
-        <label>Rol<select aria-label="Rol" value={expired?role??"dm":requestedRole} disabled={pending||expired} onChange={e=>setRequestedRole(e.target.value as ServiceRole)}><option value="dm">DM</option><option value="player">Jugador</option></select></label>
-        <label>Clave de acceso<input type="password" autoComplete="off" required maxLength={1024} value={key} disabled={pending} onChange={e=>setKey(e.target.value)}/></label>
-        <button disabled={pending||!key}>{pending?"Accediendo…":"Acceder"}</button>
-        {error&&<p role="alert">{error}</p>}
-        {!expired&&error&&<button type="button" disabled={pending} onClick={()=>setRetry(n=>n+1)}>Reintentar sesión</button>}
-        {expired&&<button type="button" disabled={pending} onClick={()=>{void broker.discard().then(async choice=>{if(choice!=="discard")return;try{await workspace.logout();}catch(error){setError(error instanceof Error?error.message:"No se pudo cerrar sesión.");}});}}>Descartar cambios y cerrar sesión</button>}
-        <p>La clave se valida en el servicio. El jugador recibe únicamente la proyección publicada por el DM.</p>
-      </form>}
-    </section></main>}
-    <DialogHost broker={broker} browser={browser}/>
-  </>;
+import type { AccountDto } from "../shared/contracts/identity";
+import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
+import { AccountAccess, ChangePassword } from "./AccountAccess";
+import { AdminAccounts } from "./AdminAccounts";
+import { AdminSystems } from "./AdminSystems";
+import { GameCatalog } from "./GameCatalog";
+import { GameEditor, type LeaveRegistration } from "./GameEditor";
+import { GuestEntry, type CapturedInvitation } from "./GuestEntry";
+import { captureInvitation } from "./invitation-fragment";
+import { ServiceDialog } from "./dialogs";
+import { identitySchema, failureMessage } from "./service-model";
+export function ServiceApp({invitation:provided}:{invitation?:CapturedInvitation}){
+  const [invitation,setInvitation]=useState(()=>provided??captureInvitation(location,history));
+  const[account,setAccount]=useState<AccountDto|null>(null),[retained,setRetained]=useState<AccountDto|null>(null),[checking,setChecking]=useState(true),[path,setPath]=useState(location.pathname),[error,setError]=useState(""),[incoming,setIncoming]=useState<AccountDto|null>(null),[password,setPassword]=useState(false);
+  const transport=useRef<HttpTransport|null>(null);
+  const guard=useRef<()=>Promise<boolean>>(async()=>true);const principal=useRef<AccountDto|null>(null);principal.current=account??retained;
+  const expired=useCallback(()=>{transport.current?.invalidate();setRetained(principal.current);setAccount(null);setChecking(false);},[]);
+  const http=useMemo(()=>new HttpTransport(fetch,expired),[expired]);transport.current=http;
+  const guestMatch=/^\/jugar\/([0-9a-f-]+)$/.exec(path);
+  const registerLeave=useCallback<LeaveRegistration>(fn=>{guard.current=fn;return()=>{if(guard.current===fn)guard.current=async()=>true;};},[]);
+  const navigate=useCallback(async(next:string)=>{if(!await guard.current())return;history.pushState(null,"",next);setPath(next);setError("");setPassword(false);},[]);
+  useEffect(()=>{if(guestMatch){setChecking(false);return;}let live=true;void http.request("/identity/session",identitySchema).then(r=>{if(live){setAccount(r.account);http.resume();}}).catch(e=>{if(live&&!(e instanceof ServiceError&&e.status===401))setError(failureMessage(e));}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[http,!!guestMatch]);
+  useEffect(()=>{const pop=()=>{const next=location.pathname;history.replaceState(null,"",path);void navigate(next);};window.addEventListener("popstate",pop);return()=>window.removeEventListener("popstate",pop);},[path,navigate]);
+  const logout=useCallback(async()=>{await http.json("/identity/logout",z.undefined(),"POST",{});http.invalidate();setAccount(null);setRetained(null);setPassword(false);history.replaceState(null,"","/");setPath("/");},[http]);
+  const leavePassword=useCallback(async()=>{if(!retained){await logout();return;}await http.json("/identity/logout",z.undefined(),"POST",{});http.invalidate();setAccount(null);setPassword(false);},[http,retained,logout]);
+  function authenticated(next:AccountDto){if(retained&&retained.id!==next.id){setIncoming(next);return;}setAccount(next);if(!next.mustChangePassword)setRetained(null);setError("");if(!/^\/partidas(?:\/|$)/.test(path)&&next.role==="dm"){history.replaceState(null,"","/partidas");setPath("/partidas");}}
+  if(guestMatch)return <GuestEntry gameId={guestMatch[1]} invitation={invitation}/>;
+  const editor=/^\/partidas\/([0-9a-f-]+)$/.exec(path);
+  const identity=account??retained;
+  const authorized=!!account&&!account.mustChangePassword&&!password;
+  return <><div hidden={!authorized} inert={!authorized} className="account-guard">{identity&&<><header className="account-bar"><span>{identity.name} · {identity.role==="admin"?"Administrador":"DM"}</span><nav>{identity.role==="admin"?<><button onClick={()=>void navigate("/admin/cuentas")}>Cuentas DM</button><button onClick={()=>void navigate("/admin/sistemas")}>Sistemas</button></>:<button onClick={()=>void navigate("/partidas")}>Partidas</button>}<button onClick={()=>void guard.current().then(ok=>{if(ok)setPassword(true);})}>Cambiar contraseña</button><button onClick={()=>void guard.current().then(async ok=>{if(ok)await logout();}).catch(e=>setError(failureMessage(e)))}>Cerrar sesión</button></nav></header>{identity.role==="dm"?editor&&(!identity.mustChangePassword||retained?.id===identity.id)?<GameEditor key={`${identity.id}:${editor[1]}`} http={http} gameId={editor[1]} active={authorized} expired={expired} onExit={()=>void navigate("/partidas")} onLogout={logout} registerLeave={registerLeave}/>:authorized&&<main className="service-page"><GameCatalog http={http} onOpen={id=>void navigate(`/partidas/${id}`)}/></main>:authorized&&<main className="service-page">{path==="/admin/sistemas"?<AdminSystems http={http}/>:<AdminAccounts http={http}/>}</main>}</>}{error&&<p role="alert">{error}</p>}</div>{checking?<main className="service-access"><p role="status">Comprobando sesión…</p></main>:!account?<AccountAccess http={http} onAccount={authenticated} retained={!!retained} onInvitation={url=>{setInvitation(captureInvitation({pathname:url.pathname,search:"",hash:url.hash},{state:null,replaceState:()=>{}}));history.pushState(null,"",url.pathname);setPath(url.pathname);}}/>:account.mustChangePassword||password?<ChangePassword http={http} account={account} onExit={leavePassword}/>:null}{incoming&&<ServiceDialog title="Cambiar de cuenta" onCancel={()=>{void http.json("/identity/logout",z.undefined(),"POST",{}).finally(()=>setIncoming(null));}}><p>Hay un borrador de otra cuenta. Debes descartarlo antes de abrir el espacio de {incoming.name}. No se guardará con esta cuenta.</p><footer><button autoFocus onClick={()=>{void http.json("/identity/logout",z.undefined(),"POST",{}).finally(()=>setIncoming(null));}}>Cancelar</button><button onClick={()=>{setRetained(null);setAccount(incoming);setIncoming(null);history.replaceState(null,"",incoming.role==="admin"?"/admin/cuentas":"/partidas");setPath(incoming.role==="admin"?"/admin/cuentas":"/partidas");}}>Descartar borrador y cambiar cuenta</button></footer></ServiceDialog>}</>;
 }
diff --git a/src/web/dialogs.tsx b/src/web/dialogs.tsx
index 417b1c8..497aa73 100644
--- a/src/web/dialogs.tsx
+++ b/src/web/dialogs.tsx
@@ -17,8 +17,8 @@ export class DialogBroker implements BrowserDialogs {
 }
 export function ServiceDialog({title,onCancel,children}:{title:string;onCancel:()=>void;children:ReactNode}) {
   const ref=useRef<HTMLDialogElement>(null);
-  useEffect(()=>{const trigger=document.querySelector("[data-dialog-return-focus]") ?? document.activeElement;ref.current?.showModal();return()=>{ref.current?.close();restoreDialogFocus(trigger);};},[]);
-  return <dialog className="service-dialog" ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();onCancel();}} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
+  useEffect(()=>{const active=document.activeElement;const trigger=active instanceof HTMLElement&&active!==document.body?active:document.querySelector("[data-dialog-return-focus]");const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();restoreDialogFocus(trigger?.isConnected?trigger:document.querySelector("[data-dialog-return-focus]"));};},[]);
+  return <dialog className="service-dialog" ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();onCancel();}} onKeyDown={event=>{event.stopPropagation();if(event.key!=="Tab")return;const elements=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>!e.closest('[hidden],[inert]'));if(!elements.length){event.preventDefault();return;}const index=elements.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&(index<=0)||!event.shiftKey&&(index===elements.length-1||index<0)){event.preventDefault();elements[event.shiftKey?elements.length-1:0].focus();}}} onKeyUp={event=>event.stopPropagation()}>
     <h2>{title}</h2>{children}
   </dialog>;
 }
diff --git a/src/web/main.tsx b/src/web/main.tsx
index 8ae645f..d207afd 100644
--- a/src/web/main.tsx
+++ b/src/web/main.tsx
@@ -1,8 +1,10 @@
 // Polyfills de Pixi que evitan generación dinámica de código y conservan CSP sin unsafe-eval.
 import "pixi.js/unsafe-eval";
 import { createRoot } from "react-dom/client";
+import { captureInvitation } from "./invitation-fragment";
 import { ServiceApp } from "./ServiceApp";
 import "../renderer/src/styles.css";
 import "../renderer/src/components/workspace/workspace.css";
 import "./service.css";
-createRoot(document.getElementById("root")!).render(<ServiceApp/>);
+const invitation = captureInvitation(location, history);
+createRoot(document.getElementById("root")!).render(<ServiceApp invitation={invitation}/>);
diff --git a/src/web/service-model.ts b/src/web/service-model.ts
new file mode 100644
index 0000000..86cc029
--- /dev/null
+++ b/src/web/service-model.ts
@@ -0,0 +1,19 @@
+import { z } from "zod";
+import { systemRefSchema, systemDefinitionSchema, availabilitySchema } from "../domain/systems/system-catalog";
+import { gameMetadataSchema } from "../domain/games/game-metadata";
+export const ok = z.literal(true);
+export const accountSchema = z.object({ id:z.string(), email:z.string(), name:z.string(), role:z.enum(["admin","dm"]), enabled:z.boolean(), mustChangePassword:z.boolean(), emailVerified:z.boolean(), createdAt:z.string(), updatedAt:z.string() });
+export const identitySchema = z.object({ ok, account:accountSchema, sessionId:z.string(), expiresAt:z.string() });
+export const gameReply = z.object({ok,game:gameMetadataSchema});
+export const gamesReply = z.object({ok,games:z.array(gameMetadataSchema),total:z.number()});
+export const versionSchema = z.object({systemId:z.string(),version:z.number(),state:z.enum(["draft","published"]),createdAt:z.string(),publishedAt:z.string().nullable(),revision:z.number(),availability:availabilitySchema,definition:systemDefinitionSchema,hash:z.string(),templates:z.record(z.string(),z.object({availability:availabilitySchema,revision:z.number()}))});
+export const systemsReply = z.object({ok,systems:z.array(z.object({systemId:z.string(),name:z.string(),versions:z.array(versionSchema)}))});
+export const selectableReply = z.object({ok,systems:z.array(z.object({ref:systemRefSchema,name:z.string(),templates:z.array(z.object({id:z.string(),name:z.string()}))}))});
+export const configurationReply = z.object({ok,configuration:z.object({ref:systemRefSchema,definition:systemDefinitionSchema,hash:z.string(),availability:availabilitySchema})});
+export const openingSchema = z.object({id:z.string(),gameId:z.string(),generation:z.number(),revision:z.number(),state:z.enum(["open","closed"])}).passthrough();
+export const openingReply = z.object({ok,opening:openingSchema.nullable(),invitation:z.object({version:z.number(),createdAt:z.string(),expiresAt:z.string()}).nullable(),systemRef:systemRefSchema,status:z.enum(["fresh","reconnecting","expired","absent"]),invitationUrl:z.string().optional(),secretAvailable:z.boolean().optional(),replayed:z.boolean().optional()});
+export type OpeningReply = z.infer<typeof openingReply>;
+export const rosterReply = z.object({ok,openingId:z.string(),generation:z.number(),status:z.enum(["open","closed","expired"]),items:z.array(z.object({participantId:z.string(),alias:z.string(),discriminator:z.number(),admission:z.enum(["admitted","left","revoked"]),presence:z.enum(["connected","reconnecting","revoked","left","expired"]),admittedAt:z.string()})),total:z.number(),revision:z.number(),presenceSequence:z.number()});
+export const kickReply = z.object({ok,participantId:z.string(),outcome:z.enum(["revoked","already-revoked"]),secretAvailable:z.boolean(),replayed:z.boolean(),invitationUrl:z.string().optional()}).passthrough();
+export { Mutations } from "../infrastructure/browser/mutations";
+export function failureMessage(error:unknown){return error instanceof Error?error.message:"No se pudo completar la operación.";}
diff --git a/src/web/service.css b/src/web/service.css
index ee1f76b..4782fb2 100644
--- a/src/web/service.css
+++ b/src/web/service.css
@@ -41,3 +41,30 @@
 
 /* Reservar filas distintas para sesión, brújula y estado de mesa del servicio. */
 .service-player-workspace .player-workspace-root .compass-overlay.compass-overlay--player { top: 70px; }
+
+.account-guard { height:100%; }
+.account-guard[hidden] { display:none; }
+.account-bar, .game-bar { display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#202830;color:#ebedef;padding:8px 16px; }
+.account-bar nav { margin-left:auto;display:flex;gap:8px;flex-wrap:wrap; }
+.account-bar button,.game-bar button,.service-page button { padding:8px 12px;border:1px solid #6d817f;border-radius:5px;color:#f1f6f4;background:#283d38;cursor:pointer;font:inherit; }
+.account-bar button:focus-visible,.game-bar button:focus-visible,.service-page :focus-visible { outline:2px solid #99e7c3;outline-offset:3px; }
+.service-page { height:calc(100dvh - 60px);overflow:auto;padding:24px clamp(16px,5vw,70px);background:#191f23;color:#eef2f1;box-sizing:border-box; }
+.service-page h1 { font-size:28px; }
+.service-page input,.service-page select,.service-page textarea,.service-dialog textarea { color:#eef2f1;background:#10181c;border:1px solid #7d8d94;border-radius:4px;padding:10px;font:inherit;width:100%;min-width:0;box-sizing:border-box; }
+.service-form { display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));align-items:end;margin:24px 0; }
+.service-page label { display:grid;gap:8px; }
+.service-cards { list-style:none;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr)); }
+.service-cards>li { border:1px solid #4d5e65;border-radius:8px;padding:20px;overflow-wrap:anywhere; }
+.service-cards button { margin:4px; }
+.service-page nav { display:flex;gap:16px;align-items:center;padding:12px 0; }
+.service-hash { font-family:monospace;overflow-wrap:anywhere; }
+.password-field { display:flex;gap:6px;min-width:0; }
+.password-field input { flex:1;min-width:0; }
+.password-field button { flex:none; }
+.game-shell { height:calc(100% - 54px);display:flex;flex-direction:column; }
+.game-shell>.service-workspace { flex:1;min-height:0;height:auto; }
+.game-shell .service-page { height:auto;flex:1; }
+.participant-list { list-style:none;padding:0; }
+.participant-list li { padding:12px 0;border-bottom:1px solid #526173;display:grid;gap:5px;overflow-wrap:anywhere; }
+.service-floating-error { position:fixed;bottom:16px;right:16px;max-width:440px;background:#4e2227;color:#fff;padding:14px;z-index:50; }
+.service-page button:disabled { opacity:.5;cursor:default; }
diff --git a/src/web/workspace.ts b/src/web/workspace.ts
index b5cd695..b4e6332 100644
--- a/src/web/workspace.ts
+++ b/src/web/workspace.ts
@@ -2,5 +2,7 @@ import type { BrowserClient } from "../infrastructure/browser/browser-client";
 export interface ServiceWorkspace {
   readonly browser:BrowserClient;
   readonly confirmLeave:()=>Promise<string|null>;
+  readonly registerLeave?: (guard: () => Promise<boolean>) => () => void;
+  readonly defaultDiagonalMode?: import("../domain/systems/system-catalog").SystemDefinition["rules"]["defaultDiagonalMode"];
   readonly logout:()=>Promise<void>;
 }

```
