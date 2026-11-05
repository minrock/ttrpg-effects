# Mesa sincronizada privada — contrato vigente

La API administra una proyección efímera por partida/apertura. El VTTReact/Pixi y dados son comunes a los clientes. Reinicio conserva guardados, sesiones y plazos, pero vacía estado visual hasta publicación explícita. Electron local conservaIPC.

## Conectar jugadores

Inicia/continúa una partida desde su catálogo. La pestaña **Mesa** del lateral derecho (junto a Propiedades y Dados) contiene enlace de invitación, copia/rotación explícita y panel privado de participantes. Cada invitado entra con alias; la cookie de esa partida conserva suID al recargar. CuentaDM y cookies invitadas pueden coexistir. Expulsar confirma alias+discriminador y cambia el enlace conservando los demás.

Las regioneslive anuncian conexión/publicación/error sin narrar cada heartbeat. Sin escena, Player espera publicación. Corte de red conserva vista desactualizada; terminal retira proyección/efectos y detiene reintentos. [Interfaz y borradores](browser-client.md).

## Frontera pública y assets

`publicTableProjection` reconstruye el snapshot mediante campos permitidos. Solo publica el mapa activo, objetos visibles, geometría de formas, contadores autorizados, tarjetas visibles de monstruos/NPC y participantes del combate activo. Labels, anotaciones, enlaces, mapas inactivos, fichas de personajes, notas, plantillas y diccionarios URL de entrada no se transmiten. El combate publica nombre/retrato/iniciativa/orden, nunca la ficha de su entidad. Los campos técnicos vacíos/seguros permiten reutilizar el renderer existente.

Las referencias deben ser `asset:UUID`; las URLs se reconstruyen desde objetos públicos. No hay lectura de rutas ni descarga de URLs externas. El servidor cambia snapshot y conjunto autorizado en una transición síncrona. GET/HEAD y resolve comprueban ese conjunto antes de consultar bytes. Un recurso privado o revocado responde 404 (resolve: null), sin distinguir si existe. Cookie ausente/expirada: 401. Se conservan no-store, MIME validado y nosniff; no hay alias estático de assets de usuario. Una referencia compartida sigue autorizada mientras exista al menos un uso público.

La niebla **no protege los píxeles del mapa**: el jugador recibe la imagen completa publicada y puede inspeccionarla. Ocultar una entidad revoca lecturas futuras; no retira bytes descargados legítimamente antes. Estas limitaciones no afectan la exclusión de campos privados y mapas no publicados.

## Contrato HTTP

Rutas bajo `/api/v1/dm/games/:gameId` paraDM y `/api/v1/games/:gameId` para invitado; autoridades/cookies distintas. TodoPOST contextual lleva `{openingId,generation,command:{requestId,context,connectionId?,revision?,payload},sceneResourceId?}`. Consulta [protocolo2 vigente](moderation.md); las tablas siguientes describen los payloads internos comunes, no el sobre HTTP completo. `/table/open` pertenecía al transporte legado y no existe en el contextual: abrir por el protocolo de [invitaciones](invitations.md) y luego publicar. El rol proviene exclusivamente de la sesión, que se revalida tras recibir cuerpos y decodificar imágenes, antes de actuar. `connectionId` se obtiene del bootstrap SSE y está ligado a esa cookie; no lo elige el cliente. El contexto lo genera el servicio al cambiar escena/mapa/cameraSyncKey.

| Ruta | Rol y payload | Resultado |
| --- | --- | --- |
| GET `/table/state` | DM/jugador | `{ok,state,serverTime}` autorizado |
| GET `/table/events` | DM/jugador | SSE del rol autenticado |
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

Cada evento contextual tiene ID `gameId:openingId:generation:epoch:audience:sequence` y sobre protocolVersion2 con sistema/ref/hash/modules públicos; bootstrap contiene el estado internoprotocolVersion1. Tipos: bootstrap, scene, camera, camera-command, pointer, highlight, presence, image-status, dice, sizes, render-error. Heartbeat es comentario SSE cada segundo. Secuencias DM/jugador independientes: las acciones privadas no incrementan la secuencia jugador.

Bootstrap se emite en la misma transición síncrona que registra la suscripción. Todo cursor válido (incluido viejo/desconocido) recupera snapshot actual; no hay replay de mapas anteriores. Cursores malformados se rechazan. Cliente descarta duplicados, revisiones antiguas, contexto ajeno y chunks de generaciones anteriores incluso si `read()` resuelve después del abort. Bootstrap no reinicia navegación local ni acciones ya aplicadas. Las publicaciones HTTP se serializan por cliente; no pueden resolverse fuera de orden.

- Hasta **64 streams por instancia**, **uno por sesión**. HTTP general conserva máximo 100 sockets y 600 solicitudes/minuto por dirección; login 10/minuto. Cámara intermedia máximo 10 reportes/s, con reporte final permitido. El cliente espera 100 ms desde la finalización de la petición anterior, incluida la cola mientras existe una petición en vuelo.
- Heartbeat cada **1 s** comprueba caducidad y cierra sesiones vencidas aunque no haya comandos. Logout/rotación revocan el stream de inmediato. Cliente detecta silencio a **15 s**, reintenta a 0,5/1/2/4/8/16/30 s, con máximo **30 s**. 401 y 403 detienen reintentos.
- Sin cola de eventos de aplicación. No se añade un evento si ya hay más de **2 MiB** pendientes por socket. Un buffer que no se drena en **5 s** cierra ese consumidor. Un evento máximo depende del límite JSON de entrada, más el sobre; el cliente limita el frame SSE a **12 MiB**. Al cerrar se limpian heartbeat, timers y listeners.
- Deduplicación por sesión+UUID durante **cinco minutos**, fingerprint de ruta/contexto/contenido. Reutilización distinta: 409. Reservas independientes por rol: hasta **20 000 resultados** cada una, **64 MiB estimados DM** y **8 MiB jugador** (más un resultado que cruce el umbral). Saturar reportes jugador no consume la reserva DM; una reserva llena rechaza nuevas transiciones de su rol hasta vencer entradas. El cliente reintenta una sola vez una respuesta de red incierta con el mismo UUID, inmediatamente dentro de la ventana.
- JSON máximo **10 MiB**, imágenes **20 MiB**, simulación **1 MiB/24 dados**, highlights **10 000 celdas**. Cámaras finitas y zoom 0,01–100; viewport positivo hasta 32768 px y DPR hasta 16. Errores de contexto/revisión: 409; validación: 400/422; rol:403; sesión:401; cuotas HTTP:429.

Pruebas ejecutables: `public-table-projection.test.ts`, `table-http.test.ts`, `table-client.test.ts`, más regresión HTTP/cliente/Player. Detalles y límites del recorrido visual quedan en el expediente [004/build](../../factory/jobs/004-mesa-sincronizada/build.md).

## Mesas por partida/apertura (010)

La [guía contextual](moderation.md) define protocolo2, aislamiento de cámaras/dados/proyección, roster privado, revocación en la frontera de envío y callback terminal del adaptador. El listener de producto retira el camino legado; protocolo1 solo permanece en el motor interno y fixtures históricos. Runtimes y streams tienen cuotas globales además de las de cada mesa; no hay una partida activa global en la composición nueva.

## Dibujos compartidos — SDD 55 / 3.19.1

En servicio, mediciones, caminos, círculos, conos y rectángulos/cuadrados de jugadores se comparten en una capa efímera independiente de la escena. Cada jugador modifica/limpia los propios; el DM puede retirarlos o limpiar la capa con confirmación. Alias y discriminador provienen de la admisión autenticada. En el DM, «Dibujos de jugadores» comparte la pestaña Mesa del lateral derecho con participantes e invitaciones; ambos menús se despliegan dentro del lateral y usan su desplazamiento, sin flotantes independientes. El jugador accede a su alias, sistema, estado de conexión, salida y «Visible para la mesa» desde el lateral derecho retráctil (pestaña con chevrón en el borde derecho, como en el DM). Escape lo cierra; en pantallas estrechas comienza cerrado. El panel muestra nombres completos; las etiquetas del mapa acortan nombres largos. Electron autónomo conserva herramientas locales.

La extensión `annotationsVersion=1` se solicita junto a `openingId`/`generation` en `table/state` y `table/events`. Añade `annotations` (versión, tiempo de servidor, secuencia, escena de origen, autor propio e items) fuera de `snapshot.scene`; clientes antiguos no reciben eventos nuevos. Los comandos usan POST `table/annotations` bajo los namespaces contextual DM/invitado existentes, con contexto/requestId y revisión de figura. El servidor deriva las medidas con las reglas publicadas. El adaptador expone el puerto opcional `TtrpgClient.annotations`, sin ampliar IPC privilegiado.

Reconectar recupera confirmados, sin reenviar borradores offline. Previews: hasta 10/s, renovación sin movimiento una vez/s, vencimiento 3 s. Cuotas: 32 figuras/autor, 256/mesa, 256 vértices, 16 KiB/comando y 512 KiB de capa. Salir o ser expulsado retira dibujos del autor; rotar invitación conserva supervivientes. Cambiar contexto/cerrar/reabrir limpia la capa. No se guarda en DB, JSON, exportación, deshacer ni dirty state.

El DM solo superpone dibujos si coincide el marco publicado; «Ver mapa publicado» abre una vista separada sin sustituir su borrador. Un servidor sin extensión mantiene la mesa base, informa incompatibilidad y deshabilita dibujo compartido. [Contrato completo](../specs/55-mediciones-compartidas/spec.md) y [evidencia de validación](../specs/55-mediciones-compartidas/validacion.md).
