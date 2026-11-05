# 56 — Cámaras libres y foco de atención

**Estado:** Implementada en rama; pendiente de integración y de los recorridos de aceptación indicados en [validacion.md](validacion.md).
**Fecha:** 2026-11-04. **Tipo:** cambio funcional compatible con escenas existentes.
**Base:** `fc57cda`, producto 3.19.1. **Rama:** `feature/sdd-foco-atencion`.
**Dependencias:** [15 Player View](../15-player-window/spec.md), [24 Control de cámara](../24-player-camera-control/spec.md), [32 Preview de viewport](../32-player-viewport-preview/spec.md), [39 Interfaz VTT](../39-vtt-interface/spec.md), [41 Clientes](../41-contrato-clientes/spec.md), [44 Mesa](../44-mesa-sincronizada/spec.md), [50 Moderación](../50-moderacion/spec.md), [55 Dibujos compartidos](../55-mediciones-compartidas/spec.md).
**Trabajo factory:** sin asignar. **Versión de entrega prevista:** 3.20.0.

## Problema y objetivo

Cada jugador debe poder recorrer y ampliar el mapa sin depender de la cámara del DM ni de la de otros jugadores. Para guiar la narración, el DM necesita llevar sus miradas a un punto concreto, conservando el zoom que cada uno está usando.

La base actual no replica continuamente el pan/zoom ordinario del DM. Sin embargo, las órdenes de la cámara principal reemplazan **centro y zoom**, incluso con el bloqueo local activado; snapshots iniciales y cambios de `cameraSyncKey` también importan una cámara dirigida por DM. La UI conserva cámara principal, cámara virtual, rectángulos de preview y estados sincronizado/desincronizado. Este es el modelo que se sustituye.

Ejemplo: Ana está al 50 %, Bruno al 150 % y el DM al 80 %. El DM enfoca la puerta situada en `{x: 420, y: -180}`. Ana y Bruno quedan centrados exactamente en esa coordenada, al 50 % y 150 % respectivamente. La cámara del DM no cambia. Ambos pueden alejarse inmediatamente sin entrar en un estado de «desincronización».

## Alcance y sustituciones

Aplica a navegador, Electron en modo servicio y Player View de Electron autónomo. Cada ventana/conexión válida mantiene su propia cámara; no se añade soporte para abrir múltiples ventanas nativas donde hoy solo existe una.

| Comportamiento actual | Nuevo contrato al implementar SDD 56 |
| --- | --- |
| Cámara principal de jugador arrastrable desde DM | Se retira; el DM elige un punto con Foco de atención |
| Zoom remoto de jugador y recentrado de centro + zoom | Se retiran; el foco cambia únicamente el centro |
| Cámara virtual, comparaciones y estados sincronizado/desincronizado | Se retiran; navegar libremente es el estado normal |
| Rectángulos principal/auxiliar de SDD 32 | Se retiran junto con esos controles; no se sustituye por un seguimiento de todos los jugadores |
| Cámara inicial heredada de DM y órdenes almacenadas en bootstrap | Inicialización local; no reproducir focos u órdenes históricas |
| Compensación de zoom al cambiar de mapa basada en la cámara principal | Se retira; cada cliente conserva su zoom numérico al pasar a otro mapa |
| Snapshot/publicación de escena con cámara como autoridad del jugador | Publica contenido; no impone cámara a un jugador ya inicializado |

Se mantienen controles de cámara **del propio DM**, navegación local del jugador, calibración de mapa/grilla, límites de zoom del motor, puntero arcano, resaltado de áreas, dados, niebla, tokens, moderación y dibujos compartidos. El indicador opcional de zoom solo muestra el zoom local efectivo. El foco no sustituye al puntero arcano ni altera la publicación.

Fuera de alcance: seguimiento continuo, bloqueo remoto de navegación, zoom automático al área, foco dirigido a un jugador concreto, marcadores persistentes, rutas cinematográficas, selección automática de otro mapa, edición de figuras o un nuevo panel de cámaras por participante.

## Cámara local de cada jugador

- Pan con herramienta de mano o Espacio + arrastre; rueda/trackpad y botones para zoom propio. El zoom comienza desbloqueado. El candado local puede mantenerse como protección voluntaria contra cambios accidentales, nunca como control del DM.
- Mover/centrar/hacer zoom en el editor DM, guardar, publicar de nuevo el mismo mapa, editar la grilla, abrir/cerrar laterales, entrar otro jugador o promover un cliente principal no cambia la cámara local.
- El estado vive en memoria del cliente. No se guarda en escena, DB ni datos de otros participantes. Desconexión/reconexión sin desmontaje conserva cámara; una recarga o ventana nueva puede iniciar una vista local nueva.
- Primera vista: centro del mapa publicado y zoom calculado localmente para encuadrarlo en el área útil del canvas. Si no hay imagen, centro del mundo `{0,0}` y zoom `1`. No utilizar centro/zoom del DM ni el último foco como valor inicial.
- Cambio real de mapa/escena: conservar el zoom numérico que ya tiene ese cliente. El centro inicial será el punto de entrada público cuando la navegación por conexión interna lo proporcione, o el centro del mapa destino. No recuperar zoom del DM, escalar por tamaño de celda ni publicar un foco implícito. El DM sigue decidiendo qué mapa se publica; navegar libremente no da acceso a mapas privados.
- Cambio de imagen, reglas o calibración dentro del mismo mapa no inicia una nueva cámara. Se mantiene separada la identidad de contenido/carga de la autoridad sobre navegación.
- Al terminar una apertura o cambiar de partida se descarta el estado de cámara de ese acceso. No se heredan cámaras entre usuarios/partidas.

## Foco de atención en la vista del DM

1. Acción compacta **Foco de atención**, con icono y tooltip, en el grupo de controles del mapa del DM. Botón accesible por teclado con estado activado. También acción contextual **Enfocar aquí a los jugadores** en un punto del mapa.
2. Activar el botón entra en un modo de selección: cursor específico e indicación «Haz clic para enfocar a los jugadores». El siguiente clic válido elige una coordenada de mundo exacta, sin snap a grilla, y envía un solo foco. Escape o clic derecho cancela sin envío; la herramienta vuelve al modo previo.
3. La acción contextual usa exactamente el punto donde se abrió el menú. Un clic en un control o panel nunca se interpreta como punto del mapa. Para uso solo con teclado, ofrecer en el mismo menú **Enfocar el centro de mi vista**, resuelto a una coordenada al activarlo, sin transmitir zoom.
4. Disponible solo con publicación vigente, permiso de DM y editor en la misma escena/mapa y marco geométrico que la publicación. Si prepara otro mapa o tiene transformaciones privadas, indicar «Publica o vuelve al mapa publicado para enfocar». No publicar ni navegar implícitamente.
5. Debe haber al menos un cliente jugador conectado, compatible y listo para el mapa publicado. La apertura/envío sin destinatarios muestra «No hay jugadores listos para recibir el foco» y no guarda un foco para futuros ingresos.
6. Un aro breve de 1,5 segundos marca el punto para DM y destinatarios. No es un objeto seleccionable, no se guarda y no revela contenido oculto bajo niebla. Respetar movimiento reducido mediante marcador estático que desaparece; sin sacudidas ni animaciones de cámara en esta entrega.
7. Confirmación discreta de envío, sin afirmar que todos aplicaron el foco al recibir un ACK del servidor. Si hay clientes no compatibles/no listos, avisar de forma agregada; no exponer el roster al jugador.

La cámara propia del DM no se mueve ni cambia su zoom al enviar el foco. Retirar los controles antiguos también elimina sus atajos, tooltips y estados; no dejar una segunda ruta de zoom remoto accesible por UI, API o IPC.

## Recepción en Player View

La operación se define sobre el estado **actual en el instante de aplicar**:

```text
centroNuevo = foco.position
zoomNuevo = zoomLocalActual
```

- El punto debe quedar en el centro exacto del área útil renderizada del mapa, considerando brújula/norte, tamaño de ventana y lateral abierto. No centrar en la página completa ni en un viewport remoto.
- No encajar la zona, ajustar zoom, modificar escala del mapa, calibración, rotación ni límites de navegación. Permitir márgenes fuera de la imagen para centrar un punto junto a su borde; no sujetar la cámara al rectángulo de la imagen si eso desplaza el punto.
- Se aplica una vez, sin seguimiento ni bloqueo posterior. El jugador puede volver a navegar inmediatamente. El candado de zoom local no impide cambiar el centro y conserva su valor.
- Si hay un gesto activo, terminar/cancelar captura de navegación y el preview de dibujo antes de recentrar, sin crear puntos por el movimiento de cámara ni borrar figuras confirmadas. Informar discretamente si se cancela un borrador sin confirmar. La cola obsoleta de movimiento no puede volver a arrastrar la cámara después del foco.
- Anuncio accesible único «El DM ha enfocado una zona»; no mover el foco de teclado ni cerrar el lateral. No usar el foco narrativo como si fuera foco DOM.
- Un foco no carga otro mapa, no abre Player View, no sale de niebla, no selecciona objetos y no altera herramientas, salvo cancelar el gesto/borrador en curso para impedir edición accidental.

## Transporte, autoridad y ciclo de vida

Reutilizar los puertos tipados, el runtime de mesa, HTTP/SSE contextual y preload/IPC específicos. Crear un contrato **de foco**, separado de `PlayerCameraCommand` que hoy exige centro y zoom. No simularlo enviando un zoom supuesto ni tomando el último reporte de un único jugador como cámara común.

Solicitud conceptual: identificador idempotente y `{position:{x,y}}` más el sobre contextual vigente (partida/apertura/generación/epoch/contexto/revisión/mapa). No admite zoom, autor arbitrario ni IDs de destinos elegidos por el cliente. El servidor obtiene destinatarios de las conexiones autorizadas.

Evento conceptual: ID de foco, secuencia creciente por contexto, posición, identidad de publicación y tiempo de emisión/vencimiento del servidor. Vida máxima **5 segundos**. La caducidad se evalúa con tiempo relativo del servidor, no suponiendo relojes de clientes sincronizados.

- Solo DM propietario autorizado puede emitir. Revalidar al aceptar, confirmar y entregar; jugadores, otras partidas y accesos revocados no pueden enviar o recibir focos indebidos. Electron valida sender y payload de forma equivalente.
- Difundir a **todos los jugadores compatibles y listos**, no solo al principal usado por el preview antiguo. Abrir/cerrar/promover una conexión no emite foco ni cambia otras cámaras. Mantener presencia/ready/carga de imágenes, desacoplándolos de la noción de cámara principal.
- Es un evento puntual, no un estado de cámara persistente. No incluir el último foco en bootstrap, cargar escena, recuperar sesión o abrir ventana. Un jugador que entra o vuelve después no salta a un foco previo.
- Si el cliente está desconectado, cargando otro contenido o no listo, no encolar el foco para aplicarlo al terminar. El DM puede enviar uno nuevo cuando esté listo. Cerrar/reabrir o cambiar contexto cancela marcadores y eventos pendientes.
- Mismo requestId/mismo contenido devuelve el resultado original sin nueva difusión ni nuevo recentrado; mismo ID/contenido distinto se rechaza. ID ya aplicado, secuencia anterior, foco vencido o contexto obsoleto se descartan. Un foco reciente reemplaza el marcador anterior, nunca se aplican en orden inverso por latencia.
- Validar coordenadas finitas y acotadas por el contrato de mundo; cuerpo máximo 4 KiB, rate limit de 2 focos/s por DM/apertura con ráfaga 4. Reutilizar deduplicación acotada y límites SSE; no reservar colas ilimitadas ni reintentar en bucle con 429.
- Error de red no se convierte en éxito. Puede reintentarse el mismo ID para resolver un resultado incierto sin repetir el efecto; jamás recuperar una cola offline de focos al reconectar.

### Compatibilidad de clientes

Negociar una capacidad/versionado de foco explícito, siguiendo el patrón de SDD 55; por ejemplo `focusVersion=1`. Solo suscriptores que la confirman reciben el evento nuevo. Mantener la negociación de dibujos de forma independiente y probar las combinaciones.

Cliente nuevo contra servicio antiguo: escena y navegación local siguen disponibles, se ignoran órdenes antiguas de cámara/zoom y se informa que el foco requiere actualizar el servicio. Servicio nuevo con cliente antiguo: no enviarle eventos desconocidos ni traducir el foco a centro+zoom; indicar al DM que ese cliente necesita actualizarse. El servidor actualizado rechaza mutaciones antiguas de cámara dirigida, incluso si una UI antigua aún ofrece esos botones. No reinterpretar silenciosamente una orden `zoom` como foco.

Campos antiguos de cámara pueden conservarse temporalmente por compatibilidad de lectura de snapshots, pero dejan de ser autoridad en el cliente actualizado. Retirar la reproducción de comandos antiguos en apertura/bootstrap y los emisores de esos comandos. No cambiar schemas públicos de forma incompatible sin negociación o mensaje recuperable.

## Criterios de aceptación

| ID | Condición observable | Verificación prevista |
| --- | --- | --- |
| CA-01 | Pan/zoom del DM y de un jugador no altera a los demás; cada cliente inicia con zoom libre | DM y dos jugadores con cámaras distintas; controles y snapshot |
| CA-02 | Foco lleva a todos los jugadores listos al mismo punto y conserva exactamente el zoom local al aplicarlo | Zoom 0.5 / 1.5, DM 0.8; comprobar valores antes/después |
| CA-03 | El punto cae en el centro útil con error ≤1 píxel CSS, sin snap ni clamp al borde de imagen | Unitarias + Pixi a cuatro nortes, lateral abierto/cerrado, 390 px y ventana panorámica |
| CA-04 | DM elige punto mediante herramienta/contextual; teclado permite centro propio y Escape cancela sin envío | Pruebas UI y recorrido real |
| CA-05 | Desaparecen zoom remoto, cámara principal/virtual, previews y estados de sincronización; cámara DM sigue operativa | UI, render, búsqueda de rutas y rechazo HTTP/IPC antiguos |
| CA-06 | Abrir, publicar otra vez, resize, reconectar y promover principal no impone cámara; cambio de mapa conserva zoom local | Ciclo de vida web/local, dos grillas con distinto tamaño y navegación interna |
| CA-07 | Foco duplicado/antiguo/vencido no recentra otra vez; dos focos fuera de orden dejan el más reciente | Reloj controlado, ACK perdido, SSE/reconexión, consumidor lento |
| CA-08 | No se aplica foco a otra apertura, mapa, jugador expulsado o cliente que termina de cargar después | Autoridad HTTP/SSE y carreras, SQLite/PostgreSQL aislados |
| CA-09 | Zoom cambiado localmente mientras el foco viaja se conserva; drag o preview activo no añade figuras ni revierte el centro | Pruebas de concurrencia de herramientas/cámara |
| CA-10 | Navegación inmediata tras foco y candado exclusivamente local; foco DOM y laterales se conservan | Teclado, pan, zoom y foco accesible |
| CA-11 | Foco no cambia escena persistible, grilla, niebla, tokens, dados ni dibujos confirmados | Serialización v1/v2, render y regresiones SDD 55 |
| CA-12 | Nueva/antigua versión informa capacidades sin fallar bootstrap ni enviar zoom como fallback | Matriz de versiones y negociaciones foco/dibujos |
| CA-13 | Electron local, Electron servicio y navegador aplican la misma semántica; cleanup sin listeners/temporizadores colgados | Pruebas IPC, adapters y humo nativo/autenticado |
| CA-14 | Límites, desconexión, ausencia de destinatarios y error de envío no producen éxito ficticio o saltos posteriores | Pruebas de cuotas, mensajes y recuperación |

## Reutilización, entrega y decisiones

Sin nuevas dependencias ni migraciones SQL; dominio puro para aplicar foco conservando zoom. No cambia `.ttrpgscene` v2 ni su lector v1, ni el paquete operativo v3. No resetear bases para validar. Las pruebas de autoridad deben cubrir SQLite y PostgreSQL/TLS por la participación del transporte de sesiones.

La petición define cámaras independientes y foco a centro exacto con zoom propio. Se concreta un foco puntual a todos los jugadores actuales del mapa publicado; no quedan decisiones bloqueantes para especificar. La eventual inspección pasiva de cámaras por jugador es otro alcance, no se reintroduce como requisito de este cambio.

La implementación 3.20.0 sustituye los apartados de cámara dirigida en 15, 24, 32, 39 y 44. Sus contratos anteriores quedan como historia, con aviso explícito. El plan técnico y [registro de validación](validacion.md) distinguen pruebas realizadas y pendientes; no se inició fábrica ni se autorizaron commit/merge/push para esta entrega.
