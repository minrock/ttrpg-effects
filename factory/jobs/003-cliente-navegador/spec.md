# 003 — Cliente navegador con el frontend VTT existente

## Estado y dependencias

Especificación propuesta, ciclo 1, 2026-10-28. No constituye evidencia de implementación. Fuentes: [solicitud](solicitud.md), [migración a servicio](../../migracion-servicio.md), [contrato común](../001-contrato-clientes/solicitud.md) y [API privada](../002-api-privada/solicitud.md).

Al redactar este archivo, `package.json` indica 3.1.0 y contiene los comandos Electron actuales. Las carpetas 001/002 aún no contienen especificación, contrato HTTP implementado ni `build.md`. El frontend lee `window.ttrpg`, `main.tsx` elige App/PlayerApp mediante `?view=player`, y los resultados de escenas e imágenes todavía usan referencias de archivo/protocolos nativos. Esto describe la partida inspeccionada, no prescribe conservar ese mecanismo después de 001.

**La construcción espera la aprobación técnica y autorización de avance del orquestador para 002.** Antes de editar código, el constructor leerá las specs, contratos comunes, rutas HTTP, capacidades y evidencias efectivamente entregadas por 001/002. No inventará endpoints, sesiones, resultados ni DTOs para suplir esa dependencia. Los ajustes de API indispensables para cerrar este flujo se implementarán y probarán dentro de 003 sin reducir la autorización de 002.

## Objetivo

Permitir al DM preparar, guardar y recuperar sus escenas desde un navegador usando el mismo VTT React/PixiJS y un servicio privado del mismo origen. Permitir el acceso autenticado de jugador, claramente separado del DM, dejando explícito que la proyección y los comandos compartidos llegarán en 004. Mantener la aplicación Electron local y los laboratorios funcionales.

## Restricciones operativas

- Usar únicamente `feature/fabrica-software`, preservando los cambios previos. No crear/cambiar ramas, hacer staging, commits, push, merge, despliegues ni DMG.
- El constructor modifica solo infraestructura/adaptadores HTTP y navegador, composición/entrada web, UI de servicio, configuración, pruebas y documentación correspondientes; puede cerrar contratos necesarios de API sin ampliar el producto a otras funcionalidades.
- Versión de cierre prevista: 3.4.0, un bump minor y entrada fechada de tipo feature en `CHANGELOG.md`, en español. La versión de aplicación procede de `package.json`.
- Mantener formato `.ttrpgscene` y migraciones existentes. No cambiar a un formato incompatible para resolver identidades o assets; comunicar una incompatibilidad real antes de modificarlo.

## Alcance y exclusiones

Incluye adaptador navegador del contrato común, acceso DM/jugador, recuperación de sesión, cierre de sesión, selección accesible de escenas guardadas, guardar/cargar, importar/exportar archivos `.ttrpgscene`, importar escena como mapa, subida y selección de imágenes, reemplazo de fondos, imágenes de tokens/notas, plantillas, bibliotecas y enlaces de escenas identificadas por el servicio. Incluye desarrollo web y build estático servido de forma segura por el servicio.

No incluye sincronización SSE, publicación de proyección, cámara compartida, apuntador, áreas informativas o dados compartidos: son responsabilidad de [004](../004-mesa-sincronizada/solicitud.md). Tampoco incluye Electron remoto (005), cuentas públicas, varias mesas, almacenamiento cloud, edición offline, instalación PWA, rediseño del VTT, empaquetado o acceso arbitrario al filesystem del servidor.

## Reutilización obligatoria

- Consumir `TtrpgApi`, `DiceApi` y composición/capacidades entregadas por 001. Mantener reexports y adaptador Electron. La entrada de navegador no importa `electron`, `node:*`, módulos de main/preload o repositorios SQLite en su grafo runtime.
- Reutilizar `App`, `PlayerApp`, `MapViewport`, herramientas, hooks, componentes de bibliotecas/anotaciones y motores existentes. No sustituirlos por una pantalla demostrativa o fixtures del lab.
- Reutilizar validación, serialización y migración de escenas, casos de uso de múltiples mapas, enlaces y reemplazo de imágenes. Mantener reglas en dominio/aplicación/adaptadores y no reproducirlas dentro de la UI de login.
- Conservar las garantías de [interfaz VTT](../../../specs/39-vtt-interface/spec.md), [múltiples mapas](../../../specs/29-multi-map-scenes/spec.md), [enlaces](../../../specs/23-scene-navigation-links/spec.md), [reemplazo de imagen](../../../specs/36-replace-map-image/spec.md) y [dados](../../../specs/37-dm-dice-rolls/spec.md). Sus comportamientos locales permanecen; el intercambio entre clientes queda pendiente de 004.

## Contrato navegador y servicio

1. El adaptador usa rutas reales de `/api/v1` del mismo origen, con cookies de sesión administradas por el navegador. No acepta bases de API arbitrarias desde un documento de escena o parámetros de URL. Desarrollo utiliza proxy local hacia API, conservando el modelo de origen único.
2. Traduce respuestas validadas y errores a los resultados del contrato común. Diferencia cancelación del usuario, sesión expirada, falta de permiso, recurso inexistente, datos inválidos, límite de carga, error del servidor y pérdida de red. Un HTML de fallback o JSON malformado no se interpreta como éxito.
3. Identidades opacas de escena/asset permanecen separadas de nombres y archivos elegidos. Si una interfaz heredada conserva un campo llamado `filePath`/`scenePath`, el adaptador traduce una referencia segura documentada; nunca la trata como ruta del sistema. Guardar repetidamente actualiza la escena correcta; exportar descarga un archivo y no cambia su identidad de almacenamiento.
4. Selecciones locales usan las APIs estándar del navegador y consentimiento del selector. El contenido se valida y sube por los endpoints de 002; no se envían rutas locales para que el servidor las abra. Ninguna escena puede inducir lectura de `file:`, protocolos Electron o una URL externa arbitraria.
5. Revocar URLs temporales y retirar listeners al cancelar/cambiar de escena/desmontar. Las respuestas de una sesión, escena o mapa anterior no se aplican a la vista actual. No se escriben URLs `blob:`, cookies ni credenciales en escenas persistidas.
6. Adaptador real para funciones disponibles; capacidades explícitas para lo pendiente. Las llamadas de tiempo real devuelven fallos recuperables y comprensibles, sin confirmaciones ficticias ni eventos fabricados. Los consumidores evitan invocaciones continuas a una capacidad ausente. Las suscripciones pueden estar inactivas únicamente cuando la capacidad anuncia esa ausencia; no aparentan una conexión viva.

## Acceso, roles y sesión

- Una sesión anónima muestra acceso en español con selección DM/jugador, clave oculta, etiquetas accesibles, estado pendiente y error recuperable. No muestra escenas ni bibliotecas privadas mientras resuelve autenticación.
- El rol efectivo procede del servidor. Cambiar `?view=player`, una ruta o el estado local no concede permisos. Una sesión jugador nunca inicia cargas de escenas completas/bibliotecas ni monta paneles privados de App.
- Tras autenticar DM se abre el VTT real. Tras autenticar jugador se utiliza la composición de PlayerApp con un estado claro de proyección todavía no disponible en esta etapa, sin inventar escena ni abrir la escena privada del DM. Login válido no equivale a mesa sincronizada.
- Recargar conserva una sesión válida mediante consulta al servicio; no requiere guardar la clave. Claves y tokens no van a URL, logs, localStorage/sessionStorage o documentos. La clave del formulario se elimina tras resolver el acceso.
- `Cerrar sesión` está disponible para ambos roles. Revoca la sesión mediante la API y retira datos privados de la UI, caches del cliente y solicitudes pendientes. Un fallo de logout se informa sin afirmar revocación confirmada. Cambiar de rol exige una sesión autorizada por el servicio.
- Un 401 durante trabajo bloquea nuevas escrituras y ofrece volver a acceder. Conserva los cambios en memoria para recuperación por el mismo DM sin exponerlos al jugador o a otra sesión. Cerrar sesión o cambiar de escena con cambios pendientes usa protección accesible de guardar/descartar/cancelar; una escritura fallida nunca permite continuar como si se hubiera guardado.

## Escenas, archivos e imágenes

- `Cargar` abre un selector real de escenas del servicio, con nombre identificable, estado vacío, carga, error y reintento. La selección/confirmación y cancelación funcionan con teclado. No usar `prompt` para introducir IDs o rutas como flujo final.
- Guardar una escena nueva obtiene la identidad real del servicio. Guardar una escena existente la conserva. Solo una respuesta exitosa confirma el guardado y limpia el estado modificado. Recargar el navegador y volver a abrir recupera cambios persistidos.
- Importar `.ttrpgscene` valida el contenido y mantiene las migraciones existentes de versión 1 a 2. Archivo corrupto/incompatible no reemplaza el trabajo abierto. Exportar descarga JSON compatible con nombre de archivo apropiado; no incorpora bytes de imágenes ni promete portabilidad de assets que solo existan en el servicio.
- Los accesos de guardar/cargar, importar archivo y exportar archivo se distinguen en la UI. Los flujos que cambian la escena respetan cambios sin guardar y no mezclan cancelación con un error de servidor.
- Importar escena como mapa utiliza las reglas existentes de selección, identidad y conservación de múltiples mapas. No sustituye accidentalmente la escena actual ni pierde notas/objetos ajenos al alcance de ese caso de uso.
- Seleccionar/subir mapas, imágenes de tokens y de notas produce referencias persistentes del servicio. El servidor decide MIME y tamaño admitidos; el cliente muestra los límites/errores reales. No prometer HEIC en runtimes que no puedan decodificarlo: identificar el formato rechazado y permitir elegir otro, preservando la escena.
- Una escena importada con rutas locales se abre con avisos de imágenes ausentes, sin intentar abrir esas rutas en el servidor. Identificar el mapa/token/nota afectado y ofrecer reemplazo por selector local. Conservar IDs, datos y referencia original cuando corresponda para diagnóstico; no eliminar objetos para ocultar el fallo.
- Reemplazar un fondo conserva las garantías de spec 36: confirmación previa, cancelación sin efectos, mismo ID de mapa, geometría y configuración intactas, mapa inactivo sin activarse, política explícita de tamaño y conservación del contenido anterior si falla. El nuevo asset solo se asocia a la escena después de validación/confirmación. La actualización de Player en vivo permanece pendiente de 004.
- Bibliotecas de monstruos, NPCs y personajes permiten buscar, obtener, guardar y reutilizar entradas mediante endpoints reales. Plantillas permiten listar, guardar y eliminar. Persisten al reiniciar/recargar y mantienen imágenes y datos conforme al contrato de 002; el jugador carece de acceso.

## Enlaces entre escenas

- El selector de destino usa escenas guardadas del servicio y sus marcadores. No solicita ni interpreta rutas del host. Conserva enlaces internos entre mapas cuando sus IDs son válidos.
- Conectar/desconectar/navegar mediante enlaces entre escenas utiliza IDs seguros y operaciones reales de servidor, conservando reciprocidad, protección de cambios sin guardar y estados de validación de spec 23. Un fallo no deja la UI afirmando una conexión válida parcial.
- Al importar documentos, preservar las referencias que se puedan resolver inequívocamente. Los destinos locales no resolubles quedan identificados como rotos y son reparables desde el selector del servicio; no adivinar destinos por basename ni eliminar silenciosamente enlaces.
- Renombrar/mover marcadores no rompe la identidad. Doble click revalida y, si falla, conserva la escena abierta y ofrece reparación. La navegación DM está operativa en 003; las órdenes de publicación/centrado al jugador se incorporan en 004.

## Paridad y experiencia verificable

| Área | Navegador al cerrar 003 | Electron local |
| --- | --- | --- |
| Herramientas de mapa, grilla, escala, medidas, luces, efectos, niebla, anotaciones y selección | Mismos motores/reglas y acceso desde VTT | Comportamiento actual preservado |
| Escenas y múltiples mapas | Guardado en servicio, importación/exportación explícita y navegación | Diálogos y persistencia local preservados |
| Imágenes | Selección/subida segura; recuperación de ausentes | Protocolos/selección local preservados |
| Plantillas y bibliotecas | Operaciones reales persistentes para DM | Repositorios locales preservados |
| Enlaces | IDs de servicio y recuperación de referencias no resolubles | Rutas y enlaces locales preservados |
| Acceso jugador | Autenticación y estado veraz sin proyección disponible | Player View existente preservado |
| Publicación, cámaras remotas, puntero, áreas y dados compartidos | Capacidad pendiente, explicación y error recuperable; 004 | IPC y comportamiento existentes preservados |
| Labs | Entradas existentes siguen utilizables, separadas del cliente real | Sin regresiones |

- Mantener el mapa protagonista y controles discretos del VTT. Login/selector pueden ocupar el centro durante su operación, pero no permanecer tapando el mapa durante una sesión.
- Verificar al menos 1440×900, 1024×768 y 1920×1080 (proyección). Por debajo de 1100 px conservar drawers y evitar scroll horizontal de página, solapamiento de controles y botones de confirmación fuera de alcance. Nombres de escena/archivo largos no desplazan las acciones.
- Todos los controles nuevos tienen nombre accesible, foco visible y orden de tabulación lógico. Modales restauran foco al disparador, permiten Escape y no dejan foco operativo detrás. Errores/carga se anuncian de forma accesible y no dependen solo del color.
- `Escape`, `Delete`/`Backspace`, pan temporal y click derecho conservan las reglas del canvas. Escribir credenciales, nombres, búsquedas y notas no dispara atajos destructivos.
- El bloqueo de escala continúa visible y permite navegar. Abrir/cerrar paneles o seleccionar escenas en un modal no recrea innecesariamente el canvas ni descarta editores. En estado jugador no aparecen controles ni nombres de datos privados.

## Entrada web y estáticos

- Añadir `pnpm dev:web` y `pnpm build:web` con instrucciones reproducibles junto a los comandos API de 002. El build de web no inicia Electron y tiene salida separada de los artefactos Electron.
- El servicio puede servir ese build en producción. Fallback SPA solo para navegación de aplicación: `/api/v1`, assets inexistentes y métodos no admitidos conservan respuestas/errores adecuados. No convertir 401/404 API en `index.html` ni responder HTML donde el renderer espera una imagen.
- Resolver estáticos dentro del directorio de build; rechazar traversal y no exponer `.env`, fuente del servidor, SQLite o almacenamiento privado. Mantener CSP adecuada al build, sin desactivar aislamiento para arreglar carga de recursos.
- No cambiar el arranque local predeterminado de Electron ni ofrecer acceso a preload/IPC desde el sitio. La integración remota de Electron corresponde a 005.

## Pruebas y evidencia de aceptación

1. **Adaptador:** pruebas de rutas/payloads/resultados contra contrato real; cookies de mismo origen; JSON inválido, 401/403/404/413/5xx y fallo de red; cancelación de selector; respuesta obsoleta; ausencia de éxito en funciones pendientes. Verificar URLs/referencias maliciosas y que rutas locales no provocan lectura del servidor.
2. **Integración HTTP real:** servidor temporal y almacenamiento aislado; login DM, guardar/cargar/exportar/importar, subida/lectura de imagen, bibliotecas/plantillas, enlaces, sesión jugador denegada y logout. Reiniciar servidor y volver a abrir una escena con sus assets para demostrar persistencia. No usar solo mocks para afirmar funcionamiento del servicio.
3. **UI automatizada:** acceso válido/fallido, carga inicial de sesión sin destello privado, permisos por rol, selector vacío/error/confirmación/cancelación, cambios sin guardar, sesión expirada, estado de capacidades pendientes y logout. Cubrir selección/reemplazo de imagen con conservación del mapa ante fallo/cancelación y foco/teclado de los nuevos diálogos.
4. **Regresión existente:** mantener pruebas de App/PlayerApp, reemplazo de imágenes, herramientas locales, bibliotecas y labs. La matriz de documentación cita pruebas para cada capacidad y marca limitaciones verificadas, especialmente los métodos reservados a 004.
5. **Navegador real contra API real:** registrar navegador/runtime y tamaños usados; acceder DM, subir un mapa, editar una medida/luz y nota con imagen, guardar, recargar y cargar desde selector; importar/exportar escena, probar imagen ausente y reemplazo de un mapa inactivo; abrir sesión jugador en contexto independiente y comprobar ausencia de datos DM; verificar logout y fallo de red recuperable. Registrar capturas/evidencias de los estados importantes y errores de consola/red. No sustituir esta comprobación por screenshots de un lab o DOM simulado.
6. **Electron local/labs:** humo viable con abrir mapa, guardar/cargar, Player View y al menos un lab; registrar limitación concreta si el entorno impide una comprobación. No declarar realizada una prueba que no se ejecutó.
7. **Comandos:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`, y arranque verificable mediante `pnpm dev:api`/`pnpm dev:web` y el servidor de producción de 002 sirviendo el build. Ajustar solo los nombres API a los efectivamente entregados por 002 y documentarlos. No generar DMG.

Entrega del constructor: `build.md` con archivos y decisiones, contrato utilizado, comandos/resultados reales, matriz de paridad enlazada, comprobaciones manuales y limitaciones. Documentación de producto explica arranque, acceso, guardar frente a exportar, imágenes/enlaces importados no resolubles y límites de la etapa. No basta con listar métodos: cada capacidad del alcance debe tener un flujo accesible y evidencia observable.

## Impedimentos y riesgos concretos

- **Dependencia aún ausente:** no hay contrato HTTP implementado de 002 ni composición final de 001 al redactar. Impide construir ahora; no impide fijar esta aceptación. El constructor debe reconciliar los artefactos antes de avanzar.
- **Tipos heredados locales:** resultados y consumidores contienen `filePath`/`scenePath` y el esquema de reemplazo restringe `imageUrl` a `map-asset:`. Debe cerrarse la representación HTTP segura sin relajar la validación de Electron ni introducir un cambio incompatible de escena.
- **Métodos con suscripciones y resultados de lectura no fallables:** el contrato puede requerir capacidades y guards para evitar promesas rechazadas sin manejar o éxito ficticio. Resolver explícitamente con la composición real de 001; no usar un adaptador vacío como cliente terminado.
- **Privacidad durante expiración/cambio de rol:** evitar que peticiones pendientes o caches repueblen la interfaz después de logout. Las comprobaciones incluyen sesión jugador independiente y no dependen de ocultar botones.
- **Portabilidad limitada de imágenes y enlaces:** rutas del escritorio no son identidades del servicio. Su importación debe ser recuperable y explicada, sin lectura implícita del host ni pérdidas silenciosas.
- Cualquier hueco de 002 que impida guardar/cargar, bibliotecas, assets o enlaces reales se resuelve con ajuste de contrato probado o se comunica como impedimento; no se reclasifica una función requerida como completada por documentación.
