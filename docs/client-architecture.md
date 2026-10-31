# Contrato de clientes y paridad del servicio

Cliente compartido con transporteElectron local y servicio contextual3.13.0. Desde 3.3.0 existe el [servicio HTTP privado](private-api.md) con autenticación y recursos opacos; el [cliente navegador 3.4.0](browser-client.md) implementa HTTP; la [mesa sincronizada 3.5.0](synchronized-table.md) completa SSE y dados. La matriz siguiente conserva las responsabilidades previstas de adaptación de `factory/migracion-servicio.md`.

## Fronteras implementadas

`src/shared/api/ttrpg-api.ts`, `dice-api.ts` y `client.ts` son la fuente común. Los modelos existentes se importan solo por tipo desde dominio/aplicación; esos módulos no ejecutan Electron, Node, React, DOM, PixiJS ni repositorios. Las rutas históricas de preload reexportan los tipos; la declaración opcional `Window.ttrpg` permanece allí.

El preload conserva métodos y canales específicos, resultados discriminados, cancelaciones y funciones de desuscripción. `getAppInfo` es síncrono; Vite incorpora la propiedad `version` de `package.json` en el bundle CommonJS. No lee archivos desde el renderer ni añade IPC privilegiado.

`main.tsx` obtiene una única instancia local mediante `readLocalClient` y entrega `ClientProvider` a DM o Player. Otro punto de entrada puede usar `createClient(api, capabilities)` y montar las mismas pantallas. El proveedor recibe `client: TtrpgClient | null`: `null` significa ausencia explícita y nunca vuelve al bridge. No hay registro mutable global. Solo los montajes históricos sin proveedor consultan el bridge mediante la misma frontera de compatibilidad. Los dobles parciales se limitan a pruebas/labs; la API del cliente productivo sigue siendo completa.

Los consumidores usan `useTtrpgApi(grupo)`, que devuelve la API de esa raíz o `undefined` si la capacidad no está disponible. Se reutilizan los estados recuperables de ausencia; no se crean métodos HTTP ficticios. La instancia API debe ser estable durante una conexión; cambiarla libera las suscripciones y cancela/descarta las hidrataciones protegidas. Las revisiones de dados se reinician al cambiar cliente. Los renders ordinarios conservan identidad y no reinician el canvas ni la sesión de dados. Los reportes de cámara en vuelo quedan ligados a la generación del cliente; su finalización no consume la cola de otra raíz o conexión. Las búsquedas de las tres bibliotecas invalidan consultas, resolución de imágenes e indicadores al cambiar consulta, cliente o disponibilidad, y al desmontar.

## Capacidades efectivas

Las capacidades describen disponibilidad de grupos de operaciones existentes, **no permisos ni autorización**. Todas están activas en el cliente Electron local. El adaptador navegador declara escenas/imágenes/bibliotecas/player/dice y desactiva nativeMenus; las funciones no disponibles no deben anunciar éxito.

| Capacidad | Operaciones incluidas |
| --- | --- |
| `scenes` | Abrir, guardar, guardar en ruta, importar como mapa y enlaces; hoy incluyen diálogos nativos y archivos locales. |
| `images` | Selección/importación, reemplazo y resolución de imágenes de mapa, token y contenido lateral; hoy diálogos y protocolos locales. |
| `libraries` | Lectura de presentaciones y tres bibliotecas propias. |
| `templateAdministration` | Disponibilidad de gestión local de plantillas; false en servicioDM. No es autorización. |
| `player` | Apertura de ventana, estado, snapshots, cámara, puntero, áreas, readiness y estado de imagen. |
| `dice` | Contexto, preferencias, tiradas, presentación pública, historial, visibilidad, errores y tamaños. |
| `nativeMenus` | Acciones de escenas recientes y apertura del administrador de plantillas desde el menú nativo. |

`getAppInfo` es metadato síncrono de todo cliente presente y no requiere una capacidad separada. Los grupos son deliberadamente pequeños: desactivar `images` desactiva también resolución, no únicamente el diálogo. Una adaptación que necesite granularidad adicional debe añadirla en composición sin introducir permisos de seguridad en React.

## Matriz de paridad

Esta tabla enumera todos los métodos del contrato, incluidos los que no tienen consumidor actual. La columna de servicio describe adaptación compartida. Las rutas y autoridad vigentes se definen en las guías de cuentas/datos/invitaciones/moderación. Electron actual conserva sus validaciones IPC y reglas vigentes.

| Métodos | Local / capacidad | Equivalencia navegador implementada | Rol y diferencia de transporte |
| --- | --- | --- | --- |
| `getAppInfo` | Metadatos síncronos de build | Metadatos del cliente; versión del servidor separada | Ambos; no convertir esta lectura en promesa. |
| `saveScene`, `saveSceneToPath` | Diálogo o escritura directa / `scenes` | HTTP guarda recurso por id; exportación explícita en navegador | DM; `filePath` y ruta sugerida no son rutas libres de servidor. |
| `loadScene` | Diálogo y validación/migración / `scenes` | Selector de recursos y HTTP; importación explícita de archivo | DM; preservar errores, cancelación, avisos de imágenes ausentes y escena previa si falla. |
| `importSceneAsMap` | Importación local / `scenes` | Selección/importación y composición de recurso | DM; conservar mapas/ids, formato y validación. |
| `selectSceneLinkTargetFile`, `listSceneLinkCandidates` | Selector y lectura de candidatos / `scenes` | Selector por ids y HTTP de candidatos autorizados | DM; nunca aceptar lectura arbitraria por ruta. |
| `connectSceneLink`, `disconnectSceneLink`, `validateSceneLinks`, `loadSceneLinkTarget` | Conexiones recíprocas y navegación / `scenes` | HTTP y transacciones entre recursos opacos | DM; adaptar identidad/rutas y conservar fallos recuperables. |
| `onRecentSceneOpen` | Evento del menú nativo / `nativeMenus` | Historial/selector propio del navegador; evento de cliente si procede | DM; no existe menú Electron en navegador. |
| `listMonsterTemplates`, `saveMonsterTemplate`, `deleteMonsterTemplate` | Repositorio local / `libraries` | ServicioDM lee presentaciones exactas/retención; escritura/borrado rechazan | Admin administra catálogo aparte; local conserva gestor. |
| `onOpenMonsterTemplateManager` | Evento del menú nativo / `nativeMenus` | Acción de UI de navegador | DM; conservar apertura sin simular IPC. |
| `searchMonsterLibrary`, `getMonsterLibraryEntry`, `saveMonsterLibraryEntry` | Biblioteca de monstruos / `libraries` | HTTP de monstruos | DM; imágenes por recursos autorizados. |
| `searchNpcLibrary`, `getNpcLibraryEntry`, `saveNpcLibraryEntry` | Biblioteca de NPC / `libraries` | HTTP de NPC | DM; no exponer notas privadas. |
| `searchPlayerCharacterLibrary`, `getPlayerCharacterLibraryEntry`, `savePlayerCharacterLibraryEntry` | Biblioteca de personajes / `libraries` | HTTP de personajes | DM; biblioteca privada incluso si un personaje aparece en proyección. |
| `openMapImage`, `selectReplacementMapImage` | Diálogo de imagen y reemplazo / `images` | Selector de archivos del navegador + subida validada | DM; conservar cancelación, dimensiones y política de escala. |
| `resolveMapUrl` | URL `map-asset:` autorizada / `images` | URL autenticada de recurso opaco | DM/jugador según publicación; no traducir una ruta enviada por cliente a lectura libre. |
| `openTokenImage`, `openAsideImage` | Diálogos nativos / `images` | Selector del navegador + subida validada | DM; límites y validación de contenido en API. |
| `resolveTokenUrl`, `resolveAsideUrl` | Resolución local / `images` | Recursos autenticados con autorización por publicación | DM/jugador según contenido publicado; no exponer imagen privada por conocer su id. |
| `openPlayerWindow` | Ventana Electron / `player` | Abrir vista de proyección y/o conexión a la mesa | DM; no equivale a crear una ventana en el servidor. |
| `getPlayerWindowState` | Estado de ventana y snapshot / `player` | HTTP de estado autorizado y conexión | Ambos con filtrado por rol; `isOpen` debe representar presencia/conexión y no una ventana nativa remota. |
| `publishPlayerScene`, `onPlayerScene` | Snapshot IPC / `player` | Comando HTTP DM + evento SSE jugador | Publica DM, reciben jugadores; servidor construye y filtra el snapshot público. |
| `publishPlayerCamera`, `onPlayerCamera` | Cámara IPC / `player` | Comando HTTP + evento SSE | DM publica, jugador recibe; conservar coordenadas de mundo. |
| `commandPlayerCamera`, `onPlayerCameraCommand` | Orden con revisión / `player` | Comando HTTP + SSE | DM ordena, jugador recibe; mantener revisiones y política de zoom. |
| `reportPlayerCamera`, `onPlayerCameraReport` | Reporte/ack de cámara / `player` | HTTP jugador + SSE DM | Jugador reporta, DM recibe; atribuir conexión y descartar revisiones obsoletas. |
| `publishPlayerPointer`, `onPlayerPointer` | Puntero efímero / `player` | HTTP DM + SSE jugador | DM publica, jugador recibe; caducidad servidor y duración acotada. |
| `publishPlayerInformationAreaHighlight`, `onPlayerInformationAreaHighlight` | Resaltado temporal / `player` | HTTP DM + SSE de contenido publicado | No enviar texto privado por el mero hecho de resaltar un área. |
| `notifyPlayerContentReady`, `onPlayerWindowReady`, `onPlayerWindowClosed` | Ready/cierre de ventana / `player` | Ready, conexión, desconexión y expiración de sesión | Jugador informa/servidor detecta; DM recibe presencia. Cierre de ventana no equivale siempre a salida de mesa. |
| `reportPlayerMapImageStatus`, `onPlayerMapImageStatus` | Estado de carga de imagen / `player` | HTTP de estado jugador + SSE DM | Vincular reporte al recurso/revisión/conexión; conservar recuperación ante fallo. |
| `updateDiceContext`, `updateDicePreferences` | Contexto/preferencias de sesión / `dice` | HTTP DM | DM; conservar protocolo y validación, no confiar en roles declarados por el cliente. |
| `beginDiceRoll`, `completeDiceRoll`, `failDiceRoll` | Ciclo de tirada / `dice` | Comandos HTTP y motor de sesión de servidor | DM; validar solicitudes/simulación, identidad y contexto. |
| `getDmDiceSession`, `clearDiceHistory`, `dismissDiceRoll`, `setDiceResultVisibility` | Sesión, historial y visibilidad / `dice` | HTTP privado y eventos públicos derivados | Solo DM; las tiradas ocultas nunca se envían al jugador. |
| `getPublicDiceState`, `onDicePresentation` | Estado/evento de presentación / `dice` | HTTP + SSE filtrados | Ambos según rol; jugador solo recibe estado público autorizado. |
| `reportDiceRenderStatus`, `onDiceRenderError` | Reporte/error de render / `dice` | HTTP de reporte + SSE de error pertinente | Ambos reportan; filtrar detalles y destinatario. |
| `getDiceSizes`, `setDiceSize`, `onDiceSizes` | Tamaños DM/Player con revisión / `dice` | HTTP y SSE | Configura DM, ambos reciben lo necesario; preservar revisión y bloqueo durante tiradas. |

## Seguridad y compatibilidad

No cambia `.ttrpgscene`: formato 2 y carga/migración de legado 1, mapas, enlaces, referencias locales y recuperación de imágenes ausentes permanecen vigentes. `SceneOperationResult.filePath`, rutas de escenas/imágenes y protocolos `map-asset:` se conservan para Electron y se traducen en el adaptador contextual. No son una autorización para acceder al filesystem del servidor. La importación/exportación debe ser explícita y los ids del servicio opacos.

Las capacidades solo ayudan a presentar disponibilidad. La API autentica y autoriza por rol; la frontera `publicTableProjection` elimina ramas privadas antes de transmitir. Las reglas y límites de assets, presencia, SSE, idempotencia y dados se detallan en [mesa sincronizada](synchronized-table.md). El snapshot local Electron conserva su transporte; nunca se usa sin reconstrucción como frontera pública.

Pruebas de composición: `src/renderer/src/client/ClientProvider.test.tsx`. Compatibilidad/versionado/IPC: `src/preload/index.test.ts`. Las suites existentes siguen cubriendo formato, enlaces, reemplazo de imagen, workspace, privacidad y herramientas Player. El expediente `factory/jobs/001-contrato-clientes/build.md` registra las verificaciones reales y límites de humo.

La matriz de adaptación histórica de este documento se complementa con la [paridad efectiva y evidencias 3.4.0](browser-client.md#matriz-de-paridad-y-evidencia). `createClient` acepta metadato opcional `assetReferences: "service"` para representación de imágenes en notas; no es autorización.

El cliente de recursos conserva CAS, bindings y operaciones inciertas por cuenta/recurso. El cliente de mesa es inmutable por partida/apertura/generación/audiencia. Rotar invitación no cambia su identidadReact. El guard superior contiene canvas y portales;401 suspende operaciones y protege borrador del ID original.
