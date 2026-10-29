# 004 — Mesa sincronizada privada

Fecha: 2026-10-28. Ciclo 1. Estado: propuesta; no acredita implementación ni pruebas ejecutadas.

## Objetivo, dependencia y autorización

Completar una proyección activa por instancia privada entre el DM y navegadores jugadores mediante HTTP para comandos y SSE para eventos. El servidor mantiene el estado autorizado; los jugadores reciben exclusivamente una proyección pública construida en servidor. Reutilizar React/PixiJS y la simulación de dados existentes.

Aplican [solicitud](solicitud.md), [migración](../../migracion-servicio.md), [001](../001-contrato-clientes/spec.md), [002](../002-api-privada/spec.md) y [003](../003-cliente-navegador/spec.md). La construcción espera entrega y aprobación técnica de 003 y orden del orquestador. Al redactar todavía no hay artefactos de construcción de las dependencias; las rutas de módulos nuevas se reconciliarán con esas entregas, sin reemplazarlas por adaptadores simulados.

Trabajar exclusivamente en `feature/fabrica-software`, conservando cambios anteriores. Sin cambio de rama, staging, commits, push, merge, despliegue ni DMG. Al finalizar: versión 3.5.0 en `package.json`, bump minor único y entrada fechada en español en `CHANGELOG.md`.

## Base que se reutiliza y fronteras

- Contrato común, composición por raíz y capacidades de 001; servidor, sesiones, almacenamiento y referencias `asset:<id>` de 002; cliente HTTP, autenticación, URL web y vistas de 003.
- `src/domain/player/player-window.ts`, `player-window-snapshot.ts`, `player-camera-control.ts`, `map-image-report.ts`, anotaciones y puntero: tipos, coordenadas, validadores y tolerancias existentes. Su saneamiento estructural no equivale a autorización ni a eliminación de secretos.
- `src/application/services/dice-roll-session.ts`, dominio de dados y render 3D existente: una resolución por tirada, replay común, historial privado, cierre y tamaños. No introducir un segundo motor o resultados independientes por navegador.
- PlayerApp, overlay de entidades, barra de combate, contadores, herramientas locales del jugador y controles de cámara. Conservar [Player](../../../specs/15-player-window/spec.md), [cámaras](../../../specs/24-player-camera-control/spec.md), [puntero](../../../specs/17-arcane-pointer/spec.md), [áreas](../../../specs/22-map-information-pins/spec.md), [turnero](../../../specs/20-combat-turn-tracker/spec.md), [dados](../../../specs/37-dm-dice-rolls/spec.md) e [interfaz VTT](../../../specs/39-vtt-interface/spec.md).
- Mantener navegación [entre escenas](../../../specs/23-scene-navigation-links/spec.md), [múltiples mapas](../../../specs/29-multi-map-scenes/spec.md) y [preview del viewport](../../../specs/32-player-viewport-preview/spec.md).

La sesión de proyección y sus casos de uso viven en aplicación/dominio testeables, sin Electron/DOM/Pixi. HTTP/SSE, autenticación y almacenamiento son adaptadores. La vista invoca el cliente y presenta estado; no decide autorización. El modo Electron local sigue usando su transporte existente.

## Alcance y exclusiones

Incluye apertura/publicación, bootstrap, presencia, ready/carga, escena pública, cámara principal/comandos/reportes, puntero, highlights, dados y tamaños; autorización de assets públicos; reconexión y limpieza; flujo de conexión jugador y pruebas reales de extremo a extremo.

Una instancia admite una única proyección y varios observadores de esa misma proyección. No incluye varias mesas, cuentas individuales, permisos por personaje, edición colaborativa, comandos de jugador sobre la escena DM, chat, lanzamiento de dados por jugador, persistencia de eventos/historial, sincronización offline, hospedaje o Electron remoto (005). No amplía las anotaciones privadas con una función nueva de publicación de notas.

Estado de mesa/dados/presencia efímero: reiniciar servidor genera una época nueva y deja la proyección vacía hasta republicación del DM. Escenas y assets guardados mantienen la persistencia de 002. Sin cambios en formato `.ttrpgscene` v2 ni lectura/migración v1; sesión, cursores SSE, cámaras efectivas y claves nunca se serializan en escenas.

## Proyección pública: contrato de privacidad

Crear un constructor puro de DTO público mediante campos permitidos explícitos; no enviar `SceneDocument` por propagación superficial y confiar en filtros React. El renderer puede adaptar ese DTO al modelo existente con valores vacíos seguros. Si se conserva `PlayerWindowSnapshot` como representación de transporte, debe reconstruirse íntegramente y pasar las mismas reglas. No mutar la escena original del DM.

| Contenido | Regla de publicación |
| --- | --- |
| Mapa | Solo el mapa activo publicado. `maps` contiene como máximo ese mapa y los campos espejo de raíz coinciden con él. No enviar nombres, IDs, imágenes, cámaras ni objetos de mapas inactivos. Sin mapa se envía estado vacío renderizable. |
| Imagen, grilla, escala, norte, fondo, filtro diurno, oscuridad y niebla | Conservar los datos necesarios para el render público vigente. Referencias de imagen exclusivamente del servicio; nunca rutas locales originales ni URLs arbitrarias. Cámara privada de navegación DM no forma parte de la proyección; usar la cámara de jugador autorizada. |
| Tokens, luces y efectos | Incluir solo objetos visibles del mapa publicado. Token oculto implica ausencia de objeto, nombre, ID, ubicación y referencia de imagen, también en diccionarios auxiliares. No publicar guías privadas de edición de efectos. |
| Formas y medidas DM | Mantener geometría y presentación compartida existente. Herramientas locales Player continúan efímeras y no se publican al servidor ni al DM. |
| Labels y anotaciones | Labels vacíos; pins, áreas persistidas y enlaces de escena vacíos. No enviar títulos, descripciones, HTML/Markdown, rutas destino o IDs de otros mapas. Un highlight explícito transmite solo su geometría/tipo temporal autorizado, nunca el texto de la anotación. |
| Monstruos/NPC de `sceneAside` | Solo entidades publicadas mediante `visibleToPlayer`; conservar exclusivamente ID, nombre público necesario, imagen y visibilidad. Notas y `templateId` quedan ausentes o vacíos seguros; no transportar plantillas o biblioteca. Monstruos sin imagen no necesitan tarjeta pública. |
| Personajes y notas del aside | No enviar fichas de personajes, estadísticas, nombre del jugador, HP, notas, árbol de notas ni contenido de bibliotecas. El turnero puede publicar su representación mínima, sin arrastrar la ficha. |
| Combate | Mientras está activo, la inclusión explícita en el turnero es publicación de sus tarjetas: ID de participante, nombre, retrato, iniciativa, orden/estado y ronda necesarios. Esto también permite retratos de personajes y entidades sin tarjeta de aside visible. Un combate inactivo no publica su lista latente. No derivar fichas completas desde `entityId`. |
| Contadores | Solo los que las reglas existentes marcan visibles a jugadores; no enviar valores/nombres privados ni configuración ajena al render público. |
| URLs/diccionarios | Reconstruir `mapImageUrl`, `tokenImageUrls` y referencias de retratos a partir de los objetos autorizados. Ignorar URLs auxiliares proporcionadas por DM como fuente de permiso. No transportar advertencias de disco o metadatos de recursos privados. |
| Dados | Solo `DiceEnvelope` público y preferencias visuales necesarias; jamás draft privado, historial, solicitudes ocultas o estado interno DM. |

En el modelo actual las imágenes incrustadas en anotaciones no se publican porque esas anotaciones son privadas. Si una dependencia incorpora un contenido explícitamente visible que ya renderiza imágenes, aplicar lista permitida a ese contenido y extraer únicamente sus referencias del servicio; nunca autorizar todo HTML/Markdown, todas las imágenes de una escena o todas las del aside para resolver un caso visible. No introducir publicación de notas como atajo.

La documentación y ayuda no deben afirmar que la niebla garantiza secreto de los píxeles del mapa: el cliente recibe la imagen completa del mapa publicado para renderizarla y puede inspeccionarla. La frontera de esta entrega elimina campos/objetos privados y mapas no publicados; no incluye recorte o composición de píxeles en servidor. Tampoco puede retirar bytes legítimamente descargados antes de ocultar un objeto. Explicar estas dos limitaciones con precisión, sin presentarlas como protección implementada.

## Autorización de assets

Extender `GET /api/v1/assets/:id` y `POST /api/v1/assets/resolve` de 002: DM mantiene su acceso; jugador solo puede obtener assets del conjunto calculado desde la proyección pública vigente. Incluye mapa, tokens visibles, tarjetas publicadas y retratos del turnero activo. No usar el documento completo, pertenencia a biblioteca, un flag recibido en query/body ni conocimiento del ID como permiso.

Actualizar snapshot y conjunto de assets autorizados en una única transición de sesión. Ocultar una tarjeta/token, cambiar de mapa/escena o retirar la proyección revoca futuras lecturas cuando ningún otro uso público vigente referencia el asset. Compartir la misma imagen entre objeto privado y público no invalida el uso público. Un asset eliminado del conjunto da 404 al jugador aunque exista para DM; resolver retorna null para referencias ajenas, sin revelar existencia. Sin sesión da 401. Los errores no contienen rutas internas.

No ampliar la cookie ni insertar claves en URLs para las imágenes. Conservar `no-store`, MIME verificado y `nosniff`; HEAD, rangos o caché condicional, si están soportados, deben aplicar la misma autorización antes de cualquier respuesta útil. Nunca servir bytes por un alias estático desprotegido. Logout/caducidad retira acceso inmediatamente. Una imagen ausente autorizada presenta placeholder/error recuperable y no elimina objetos de la escena.

## Contrato HTTP y eventos

Rutas bajo `/api/v1`; conservar cookie HttpOnly/SameSite, origen/Host, límites y errores de 002. Rol siempre derivado de la sesión, no de `?view=player`, body, header de rol o suscripción solicitada. Un query que pida eventos DM no concede acceso. Todos los cuerpos se validan con esquemas compartidos y límites de tamaño/cantidad; errores 400/422, rol 403, sesión 401 y contexto obsoleto/conflicto 409 según contrato base.

Nombres siguientes son el contrato de esta entrega; cualquier ajuste exigido por 002/003 debe documentarse y actualizar ambos extremos y pruebas antes de revisar.

| Ruta | Rol | Función |
| --- | --- | --- |
| `GET /table/state` | DM/jugador | Bootstrap autorizado: época, revisión de proyección, contexto, snapshot público/null, cámara principal/última orden, dados públicos y tamaños necesarios. DM añade presencia/reportes; nunca mezclar su historial en la variante jugador. |
| `GET /table/events` | DM/jugador | Stream SSE filtrado por rol de sesión, con bootstrap consistente y eventos posteriores. |
| `POST /table/open` | DM | Abrir/publicar snapshot opcional y devolver éxito real, estado y URL pública jugador sin credenciales. No implica que exista un jugador conectado. |
| `POST /table/scene` | DM | Validar snapshot/escena de publicación, construir proyección, sustituir estado y actualizar assets. |
| `POST /table/camera` | DM | Actualizar cámara principal y emitir evento compatible con `publishPlayerCamera`. |
| `POST /table/camera-command` | DM | Orden explícita, contexto y revisión; emitir confirmación efectiva solo cuando llegue reporte jugador. |
| `POST /table/camera-report` | Jugador | Reportar exclusivamente su cámara/viewport/ack, ligado a su conexión y contexto vigente. |
| `POST /table/pointer` | DM | Puntero temporal con ID único, posición, tamaño y duración acotados. |
| `POST /table/area-highlight` | DM | Geometría/tipo temporal validado, cinco segundos según dominio. |
| `POST /table/ready` | Jugador | Confirmar contenido del contexto/revisión realmente listo. |
| `POST /table/map-image-status` | Jugador | Estado de carga de una imagen autorizada del contexto actual; no eco de errores o URLs arbitrarios. |

Completar `getPlayerWindowState`, todas las publicaciones/reportes, `notifyPlayerContentReady` y todas las suscripciones Player del contrato común. `isOpen` en navegador significa al menos un jugador conectado a la proyección, separado de estado publicado/cargando/listo. `onPlayerWindowReady` y `onPlayerWindowClosed` representan transiciones de disponibilidad, no creación ficticia de ventanas. No hacer funcionar `onRecentSceneOpen` o menús nativos como eventos remotos inventados.

Cada comando mutante de mesa lleva identificador de petición y contexto cuando corresponda. El servidor serializa sus transiciones; reenvío del mismo identificador con mismo contenido conserva el resultado y no duplica evento/acción. Reutilizarlo con otro contenido da 409. Mantener deduplicación acotada, con ventana documentada de al menos cinco minutos; el cliente no reintenta automáticamente una acción incierta fuera de esa ventana. Publicaciones de escena se serializan/coalescen en cliente para que respuestas fuera de orden no repongan una edición vieja. Contexto cambia al navegar de escena/mapa y nunca lo decide un jugador.

### SSE, bootstrap y reconexión

- SSE incluye `id`, tipo y JSON tipado con versión de protocolo, época del proceso, contexto, revisión y hora servidor. Secuencia monotónica por audiencia; eventos privados no generan huecos/avisos observables en la secuencia jugador. Nunca incluir cookie, clave ni payload privado en IDs o logs.
- El primer evento es bootstrap del estado actual autorizado, seguido de actualizaciones sin ventana de pérdida entre lectura y suscripción. `GET /table/state` por sí solo no sustituye esa garantía. Es válido implementar reconexión siempre mediante snapshot completo actual: no se exige log durable ni replay de todos los eventos intermedios.
- Aceptar un cursor anterior/`Last-Event-ID` para reconocer duplicados; cursor vencido, desconocido o de otra época fuerza bootstrap. No reproducir snapshots de mapas anteriores ni assets revocados para llenar huecos. Validar el cursor y no permitir seleccionar otro rol.
- Cliente descarta eventos duplicados, revisiones antiguas y mensajes del contexto anterior. Un bootstrap sustituye coherentemente el estado, no dispara de nuevo acciones ya aplicadas. No resetear navegación local ni dibujos Player por cada snapshot ordinario; un cambio real de escena/mapa sí limpia sus herramientas temporales.
- Puntero/highlight llevan inicio y caducidad servidor: al reconectar mostrar solo tiempo restante o descartarlos si vencieron, nunca reiniciar duración. Dados vigentes reanudan desde el instante actual o pose final sin recalcular tirada, repetir audio o celebrar otra vez un crítico vencido. Compensar desfase de reloj usando tiempo servidor; no depender de que dos equipos tengan relojes idénticos.
- Heartbeat y detección de stream muerto; reintento acotado con espera creciente (máximo 30 s) y recuperación automática de red. 401/caducidad/logout detienen reintentos y vuelven a acceso, limpiando datos y solicitudes antiguas. 403 no entra en bucle infinito. El servidor cierra streams de sesiones revocadas/vencidas aunque no haya comandos posteriores.
- Una conexión compartida por cliente, múltiples handlers locales; liberar stream, temporizadores y peticiones al desmontar/cambiar cliente/cerrar sesión. StrictMode no acumula conexiones. Servidor elimina listeners al cerrar/abortar, acota conexiones por sesión/instancia y colas; consumidor lento no causa memoria ilimitada. Documentar límites concretos y probarlos.

### Cámaras, presencia y carga

Mantener pan/zoom local independiente. Pan del DM no mueve jugadores; órdenes remotas explícitas sí, incluso con zoom local bloqueado. Reportes con throttle máximo de diez por segundo y reporte final obligatorio; validar números finitos, zoom, dimensiones y revisiones. No aceptar ack futuro, mapa ajeno ni reportes de conexión distinta como confirmación de una orden. Cambiar de contexto invalida orden/reporte/ready anteriores.

Como la UI tiene una cámara efectiva, usar una política determinista: el primer jugador conectado es proyección principal para reportes/preview; los demás reciben la misma publicación y navegan localmente sin hacer saltar la cámara efectiva del DM. Si el principal se desconecta, promover el conectado más antiguo y limpiar la confirmación anterior hasta recibir su estado. Mostrar al DM número de conexiones y cuál representa su preview; no crear administración de usuarios. Identidad efímera de conexión emitida por servidor y ligada a su sesión; el cliente no elige un ID ajeno. Reconexión reemplaza/limpia la conexión anterior y no cuenta doble.

Separar conectado, esperando publicación, cargando imagen, listo y desconectado. La recepción de SSE no prueba carga visual. Un fallo de imagen/dados queda visible para el DM con mensaje seguro, permite seguir usando herramientas y puede recuperarse al reemplazar/reintentar. Una respuesta tardía de carga de otro mapa no marca listo el actual.

## Dados por HTTP/SSE

Añadir rutas tipadas para todos los métodos `DiceApi`; puede usarse prefijo `/dice` y acciones explícitas, con tabla final de rutas/DTO en documentación. No dejar métodos rechazando por capacidad pendiente al cerrar esta entrega.

- Solo DM: `updateDiceContext`, `updateDicePreferences`, `beginDiceRoll`, `completeDiceRoll`, `failDiceRoll`, `getDmDiceSession`, `clearDiceHistory`, `dismissDiceRoll`, `setDiceResultVisibility`, `setDiceSize`.
- DM/jugador: lectura de estado público y tamaños autorizados; `reportDiceRenderStatus` solo reporta un roll visible a esa sesión/contexto, sin modificar resultado. Suscripciones entregan presentación correspondiente a su rol y errores de render apropiados. Jugador no recibe preferencias/tamaños DM innecesarios; adaptación local puede completar defaults sin datos privados.
- Servicio aloja `DiceRollSession` y valida request/simulation/contexto con dominio actual. DM calcula la simulación existente una vez y completa la solicitud; jugadores reproducen ese replay. Invalidar finalización tras cambio de contexto y rechazar simulaciones inválidas sin publicar resultados parciales.
- Preservar tiradas abiertas con/sin resumen, ocultas, última pública, historial privado, tamaños y cierre por rollId. Una oculta no borra ni reemplaza una pública anterior. Abierta sin resumen mantiene caras visibles, según spec 37; ocultar resumen no promete ocultar los valores impresos.
- Idempotencia para begin/complete/dismiss: perder respuesta HTTP y reintentar no lanza, resuelve, cierra otra tirada ni reproduce dos veces. Reapertura/reconexión nunca recibe historial privado o una tirada oculta. Limpiar historial no modifica escenas ni la presentación pública.
- Fallo visual conserva resultado resuelto y fallback textual autorizado. Audio solo DM; no bloquear funcionalidad por autoplay denegado. No añadir sonido de jugador o reejecutar física para recuperarse de pérdida WebGL.

## Flujo y UI verificables

El control de proyección DM publica y ofrece URL de jugador del origen público configurado, con copiar enlace y abrir cuando sea viable. Nunca incluir claves/tokens en URL/QR, logs o almacenamiento web. Explicar que otro navegador/contexto independiente entra con clave jugador; abrir una pestaña normal con cookie DM compartida no la convierte en sesión jugador ni debe degradar esa sesión al fingir rol por query. Si el navegador bloquea apertura/copiar, conservar enlace seleccionable y mensaje accionable. No solicitar permisos nativos ni instalar conectores.

Reutilizar pantalla de acceso 003 y PlayerApp real. Antes de publicar: «Esperando al DM». Durante carga/desconexión: indicador compacto accesible; una escena retenida durante fallo de red se marca desactualizada y no confirma acciones. Tras caducidad/logout se limpia la vista. DM recibe errores de publicación visibles y conserva edición local; no acumular promesas rechazadas ni anunciar publicación correcta si HTTP falló.

Mantener mapa protagonista, bloqueo de escala, controles locales Player, dados, contadores y turnero. Escape cierra popovers/modales y devuelve foco; Tab/Shift+Tab y nombres accesibles funcionan. Campos de acceso/enlace no disparan Delete/Backspace ni atajos canvas. Estados usan texto/semántica además de color; anuncios live de cambios relevantes, no por heartbeat/frame. Revisar 1440×900, 1024×768 y proyección 1920×1080: sin scroll horizontal, acciones fuera de alcance ni overlays permanentes invasivos. Los controles privados y nombres de recursos secretos no aparecen en Player.

## Aceptación y pruebas ejecutables

1. **Proyección pura:** fixture con dos mapas, secretos únicos en cada campo privado, token/luz/efecto ocultos, notas HTML/Markdown, fichas completas, enlaces, contadores y diccionarios URL. Serializar salida y comprobar ausencia de cada secreto; campos públicos/turnero/tarjetas sobreviven; entrada DM inmutable. Verificar raíz y `maps` coherentes y caso sin mapa.
2. **HTTP real con cookies separadas:** iniciar servicio temporal, login DM/jugador, abrir dos streams y publicar. Jugador recibe bootstrap y actualizaciones, no puede mutar escena/cámara principal/puntero/áreas/dados ni leer historial/bibliotecas aunque falsifique rol/query/contexto. Sesión anónima denegada. Inspeccionar bytes HTTP/SSE, no solo DOM.
3. **Assets reales:** subir distintas imágenes para mapa activo/inactivo, token visible/oculto, NPC publicado/privado y personaje en turnero. Jugador descarga únicamente conjunto vigente; resolver/GET/HEAD condicional no lo eluden. Cambiar mapa, ocultar y terminar combate revoca referencias, conserva las compartidas aún públicas. Incluir imagen de nota privada y datos originales de ruta/URL externa: nunca acceso implícito ni descarga del host.
4. **Orden y recuperación:** cortar stream después de una publicación mientras ocurre otra; reconectar obtiene último estado sin pérdida final. Duplicar IDs/eventos y entregar reportes fuera de orden; no retroceder escena/cámara ni ejecutar dos veces acciones. Repetir con cursor vencido y reinicio de servicio/época. Navegar mientras llegan ready/reportes antiguos no afecta contexto nuevo.
5. **Tiempo y dados:** reloj controlado prueba puntero/highlight vencido y restante, reanudación de replay/pose final y crítico sin reinicio, incluidos relojes cliente desplazados. HTTP begin/complete con respuesta perdida y reintento produce una única entrada/evento. Oculta no deja payload, aviso ni cambios públicos. Abierta sin/con resumen, show/hide posterior y dismiss respetan último contexto y rollId.
6. **Presencia y límites:** dos jugadores, principal desconecta/reconecta, promoción determinista, preview sin alternancia por reportes secundarios; logout/expiración cierra stream y revoca assets. Abrir/cerrar repetidamente no incrementa listeners, conexiones ni timers retenidos. Comprobar payload enorme, rate limit y consumidor lento con límites declarados.
7. **UI/adaptador:** todos los métodos en alcance mapean acciones/eventos reales, cleanup StrictMode, red caída/caducidad sin `unhandledrejection`, enlace sin credenciales, errores de imagen y publicación recuperables. Verificar teclado, foco, tamaño de ventana y herramientas locales Player conservadas en snapshot ordinario.
8. **Humo navegador real/API real:** contextos DM y jugador separados; publicar mapa, editar objeto, navegar a segundo mapa, cámara independiente/recentrado, puntero/área, tarjeta NPC y turnero con retrato, tirada abierta/oculta, cortar/restaurar conexión, recargar jugador, ocultar asset y cerrar sesión. Registrar navegador, runtime, pasos, resultados, capturas relevantes y consola/red. Mocks y labs no sustituyen este recorrido.
9. **Regresión y entrega:** mantener escenas/enlaces/importación/bibliotecas de 003 y modo Electron local. Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`; arrancar API/web con comandos entregados y comprobar build servido en producción local. Humo Electron con Player y dados cuando viable; registrar impedimento concreto si no se pudo ejecutar. Sin DMG.

`build.md` identifica archivos, contratos finales de rutas/eventos, política de presencia, límites/deduplicación, comandos/resultados reales, pruebas manuales y limitaciones. Actualizar matriz de paridad/documentación de cliente y servicio para quitar el estado pendiente de estas capacidades, explicar conexión jugador, reinicio efímero y límites de privacidad. Una función simulada, un test sin ejecutar o un bloqueo de dependencia no se marca completado.

## Riesgos e impedimentos

La dependencia aún no construida impide iniciar implementación en este momento; no hay decisión funcional adicional que deba solicitarse para redactar o construir tras su entrega. Reconciliar contrato común y HTTP final antes de empezar.

La mayor superficie de riesgo es la redacción incompleta del documento: `createPlayerSceneSnapshot` actual copia contenido privado y el schema solo valida estructura. Debe sustituirse como frontera de red por la proyección explícita con fixtures exhaustivos. La segunda es autorizar imágenes a partir de referencias completas/antiguas; la aceptación exige conjunto público vigente y revocación real. La tercera es confundir recibir estado con estar listo, o reproducir efectos tras reconexión; épocas, contexto y tiempo servidor deben formar parte del contrato, no parches solo de UI.
