# Mesa sincronizada privada — 3.5.0

La API administra una proyección efímera por instancia. El mismo VTT React/Pixi y el replay de dados funcionan en DM y Player. Las escenas y assets guardados conservan la persistencia anterior; reiniciar la API cambia la época y vacía mesa, cámaras, conexiones y dados hasta que el DM publique otra vez. Electron local conserva IPC; Electron remoto pertenece a la entrega 005.

## Conectar jugadores

El DM abre la proyección desde el control existente y consulta **Mesa compartida** abajo a la izquierda. En Player, Cerrar sesión, brújula y Mesa ocupan filas separadas arriba a la derecha; el indicador de escala permanece abajo a la izquierda. El enlace seleccionable y las acciones copiar/abrir usan el origen público, sin claves ni tokens. El jugador debe acceder desde otro navegador o perfil independiente con su clave. Una pestaña normal comparte cookie DM y conserva ese rol aunque la URL tenga `view=player`; el query solo preselecciona el formulario si no existe sesión.

Dos regiones live persistentes fuera del detalle anuncian cambios relevantes de conexión, publicación, carga y error aun con Mesa cerrada; los reportes de navegación no cambian el anuncio. La cabecera compacta distingue conectado/desconectado; el detalle muestra publicación, cantidad de jugadores, identificador abreviado del principal, carga y error. Sin publicación, Player espera al DM. Con pérdida de red conserva la escena marcada desactualizada y no confirma reportes; reconecta automáticamente. Logout/caducidad oculta y desmonta la vista jugador. Los borradores DM conservan la protección de recuperación de 003.

## Frontera pública y assets

`publicTableProjection` reconstruye el snapshot mediante campos permitidos. Solo publica el mapa activo, objetos visibles, geometría de formas, contadores autorizados, tarjetas visibles de monstruos/NPC y participantes del combate activo. Labels, anotaciones, enlaces, mapas inactivos, fichas de personajes, notas, plantillas y diccionarios URL de entrada no se transmiten. El combate publica nombre/retrato/iniciativa/orden, nunca la ficha de su entidad. Los campos técnicos vacíos/seguros permiten reutilizar el renderer existente.

Las referencias deben ser `asset:UUID`; las URLs se reconstruyen desde objetos públicos. No hay lectura de rutas ni descarga de URLs externas. El servidor cambia snapshot y conjunto autorizado en una transición síncrona. GET/HEAD y resolve comprueban ese conjunto antes de consultar bytes. Un recurso privado o revocado responde 404 (resolve: null), sin distinguir si existe. Cookie ausente/expirada: 401. Se conservan no-store, MIME validado y nosniff; no hay alias estático de assets de usuario. Una referencia compartida sigue autorizada mientras exista al menos un uso público.

La niebla **no protege los píxeles del mapa**: el jugador recibe la imagen completa publicada y puede inspeccionarla. Ocultar una entidad revoca lecturas futuras; no retira bytes descargados legítimamente antes. Estas limitaciones no afectan la exclusión de campos privados y mapas no publicados.

## Contrato HTTP

Rutas bajo `/api/v1`. Misma cookie HttpOnly/SameSite, Host/Origin y límites de la API base. Todo POST de mesa/dados lleva `{requestId: UUID, context: UUID|null, connectionId?: UUID, revision?: number, payload}`. El rol proviene exclusivamente de la sesión, que se revalida tras recibir cuerpos y decodificar imágenes, antes de actuar. `connectionId` se obtiene del bootstrap SSE y está ligado a esa cookie; no lo elige el cliente. El contexto lo genera el servicio al cambiar escena/mapa/cameraSyncKey.

| Ruta | Rol y payload | Resultado |
| --- | --- | --- |
| GET `/table/state` | DM/jugador | `{ok,state,serverTime}` autorizado |
| GET `/table/events` | DM/jugador | SSE del rol autenticado |
| POST `/table/open` | DM, `{snapshot?}` | `{ok,state,playerUrl,serverTime}`; no afirma presencia |
| POST `/table/scene` | DM, snapshot o null para retirar | `{ok,state,serverTime}` |
| POST `/table/camera` | DM, `{center:{x,y},zoom}` | cámara principal; no mueve la navegación local |
| POST `/table/camera-command` | DM, `{revision,camera,reason}` | orden explícita con revisión creciente |
| POST `/table/camera-report` | Jugador, `PlayerCameraReport` | requiere contexto/conexión, ack actual y reporte creciente |
| POST `/table/pointer` | DM, `{id,position,creatureSize,durationMs}` | temporal 100–10000 ms |
| POST `/table/area-highlight` | DM, `{id,areaId,areaType,cells,durationMs:5000}` | geometría temporal, sin texto |
| POST `/table/ready` | Jugador, `{}` | exige revisión actual y carga confirmada |
| POST `/table/map-image-status` | Jugador, `{imageUrl,ok,error?}` | imagen actual; descarta texto arbitrario del error y emite mensaje seguro |

Salvo open y scene, los POST de mesa devuelven un ACK compacto `{ok:true,serverTime}`; no duplican la proyección en cada reporte.

El primer jugador conectado es el principal. Solo sus reportes llegan al preview DM; los demás observan y navegan independientemente. Al salir se promueve el más antiguo restante, se limpia la confirmación y se envía bootstrap al promovido para recuperar su cámara local actual. La presencia, reconexión y montaje DM no generan órdenes de cámara; únicamente las acciones explícitas del DM lo hacen. Una sesión admite un stream; reconectar reemplaza el anterior. `isOpen` significa presencia, separado de publicación y ready. `onPlayerWindowReady`/Closed representan disponibilidad del principal, no creación de una ventana remota.

| Ruta de dados | Rol/payload | Valor del resultado `{ok,value,serverTime}` |
| --- | --- | --- |
| GET `/dice/session` | DM | DiceSessionState privado |
| GET `/dice/public` | Ambos | DiceEnvelope público |
| GET `/dice/sizes` | Ambos | DiceSizes; valor DM sustituido por default para jugador |
| POST `/dice/context` | DM, DiceContext | DiceSessionState |
| POST `/dice/preferences` | DM, DiceDraft | DiceDraft |
| POST `/dice/begin` | DM, DiceRollRequest | `{rollId}` |
| POST `/dice/complete` | DM, `{rollId,simulation}` | DiceSessionState |
| POST `/dice/fail` | DM, `{rollId}` | DiceSessionState |
| POST `/dice/clear-history` | DM, `{}` | DiceSessionState; no cambia presentación pública |
| POST `/dice/dismiss` | DM, `{rollId}` | DiceSessionState |
| POST `/dice/visibility` | DM, `{rollId,visible}` | DiceSessionState |
| POST `/dice/size` | DM, DiceSizeChange | DiceSizes |
| POST `/dice/render-status` | Ambos, `{rollId,ok}` | `{ok:true,serverTime}`; solo tirada visible y contexto/conexión vigentes |

DiceRollSession valida contexto, composición, simulación y resultado. Solo el DM ejecuta física una vez; los jugadores reproducen el replay publicado. Una tirada oculta no reemplaza la pública anterior ni emite eventos jugador. Sin resumen siguen siendo visibles las caras. La recuperación usa tiempo servidor y pose actual/final; no ejecuta física ni audio de jugador. Un fallo de render conserva el resultado autorizado y comunica al DM un error seguro.

## SSE, orden y límites

Cada evento `event: table` tiene ID `época:audiencia:secuencia` y JSON `{protocolVersion:1,epoch,context,revision,serverTime,sequence,type,state?,payload?}`. Tipos: bootstrap, scene, camera, camera-command, pointer, highlight, presence, image-status, dice, sizes, render-error. Heartbeat es comentario SSE cada segundo. Secuencias DM/jugador independientes: las acciones privadas no incrementan la secuencia jugador.

Bootstrap se emite en la misma transición síncrona que registra la suscripción. Todo cursor válido (incluido viejo/desconocido) recupera snapshot actual; no hay replay de mapas anteriores. Cursores malformados se rechazan. Cliente descarta duplicados, revisiones antiguas, contexto ajeno y chunks de generaciones anteriores incluso si `read()` resuelve después del abort. Bootstrap no reinicia navegación local ni acciones ya aplicadas. Las publicaciones HTTP se serializan por cliente; no pueden resolverse fuera de orden.

- Hasta **64 streams por instancia**, **uno por sesión**. HTTP general conserva máximo 100 sockets y 600 solicitudes/minuto por dirección; login 10/minuto. Cámara intermedia máximo 10 reportes/s, con reporte final permitido. El cliente espera 100 ms desde la finalización de la petición anterior, incluida la cola mientras existe una petición en vuelo.
- Heartbeat cada **1 s** comprueba caducidad y cierra sesiones vencidas aunque no haya comandos. Logout/rotación revocan el stream de inmediato. Cliente detecta silencio a **15 s**, reintenta a 0,5/1/2/4/8/16/30 s, con máximo **30 s**. 401 y 403 detienen reintentos.
- Sin cola de eventos de aplicación. No se añade un evento si ya hay más de **2 MiB** pendientes por socket. Un buffer que no se drena en **5 s** cierra ese consumidor. Un evento máximo depende del límite JSON de entrada, más el sobre; el cliente limita el frame SSE a **12 MiB**. Al cerrar se limpian heartbeat, timers y listeners.
- Deduplicación por sesión+UUID durante **cinco minutos**, fingerprint de ruta/contexto/contenido. Reutilización distinta: 409. Reservas independientes por rol: hasta **20 000 resultados** cada una, **64 MiB estimados DM** y **8 MiB jugador** (más un resultado que cruce el umbral). Saturar reportes jugador no consume la reserva DM; una reserva llena rechaza nuevas transiciones de su rol hasta vencer entradas. El cliente reintenta una sola vez una respuesta de red incierta con el mismo UUID, inmediatamente dentro de la ventana.
- JSON máximo **10 MiB**, imágenes **20 MiB**, simulación **1 MiB/24 dados**, highlights **10 000 celdas**. Cámaras finitas y zoom 0,01–100; viewport positivo hasta 32768 px y DPR hasta 16. Errores de contexto/revisión: 409; validación: 400/422; rol:403; sesión:401; cuotas HTTP:429.

Pruebas ejecutables: `public-table-projection.test.ts`, `table-http.test.ts`, `table-client.test.ts`, más regresión HTTP/cliente/Player. Detalles y límites del recorrido visual quedan en el expediente [004/build](../factory/jobs/004-mesa-sincronizada/build.md).

## Mesas por partida/apertura (010)

La [guía contextual](moderation.md) define protocolo2, aislamiento de cámaras/dados/proyección, roster privado, revocación en la frontera de envío y callback terminal del adaptador. El camino legado conserva protocolo1. Runtimes y streams tienen cuotas globales además de las de cada mesa; no hay una partida activa global en la composición nueva.
