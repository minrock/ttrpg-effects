# 010 — Expulsión inmediata y mesas independientes por partida

## Estado, objetivo y autorización

Especificación propuesta, ciclo 1, 2026-10-29. Define backend, protocolo y adaptadores por construir; no acredita expulsión, aislamiento, PostgreSQL o interfaz de moderación ya implementados. Contexto obtenido de archivos del checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`: perfil especificador, AGENTS.md, package.json, README, [solicitud](solicitud.md), [modelo común](../../autenticacion-partidas.md), contratos y fuentes actuales. Durante esta lectura `package.json` declara 3.8.0 con trabajo de 006 en curso; ello no equivale a aprobación de dependencias.

Dependencia directa: [009 invitaciones](../009-invitaciones-jugadores/spec.md), sobre [008 propiedad](../008-partidas-propiedad/spec.md), [007 identidad](../007-cuentas-dm/spec.md) y [006 persistencia](../006-persistencia-multidb/spec.md). Son contratos propuestos, pendientes de entrega/aprobación. Construir solo después de APROBAR de 009 y orden del orquestador, reconciliando sus implementaciones finales. Los nombres nuevos de este documento son propuestas de 010, no APIs que se atribuyan como existentes a las dependencias.

Solo se escribe esta spec, mediante temporal y renombrado. Rama prevista de construcción `feature/factory-010-moderacion-tiempo-real`, a resolver por el orquestador; no modificar Git ahora. Sin staging, commits, push, merge, despliegue, DMG, datos/perfiles/servicios ajenos o `.env` reales. Los permisos anteriores de integración de 001–005 no se aplican. Al construir, bump minor único desde la versión final de 009 y changelog español fechado; formato `.ttrpgscene` v2 permanece compatible.

## Resultado esperado y límites

El DM propietario consulta los participantes de su partida y puede expulsar a uno por su ID estable. Una operación confirmada revoca todas las credenciales de ese participante y rota la invitación una sola vez. El enlace anterior deja de admitir nuevas entradas; los demás participantes conservan identidad, credenciales, conexión y vista. No se cierran todas las sesiones para expulsar a una persona.

Varias partidas, del mismo o de distintos DMs, pueden mantener simultáneamente publicación, cámaras, presencia y dados independientes. Los recursos privados pertenecen al DM y se reutilizan entre sus partidas según 008; **la autorización pública del asset depende de la partida/apertura de cada invitado**, no solo del propietario del archivo.

Incluye operaciones/datos del panel, expulsión transaccional, idempotencia, integración con revocación/lease de 007–009, runtimes por partida/apertura, HTTP/SSE/assets/dados con autorización vigente, protocolo terminal y limpieza del adaptador cliente, cuotas y pruebas reales de ambos motores. La pantalla, confirmación visual y cableado final de login/partidas son [011](../011-experiencia-autenticacion/solicitud.md); 010 entrega contratos utilizables sin presentar un panel inexistente como terminado.

No incluye identidad humana verificada, bloqueo permanente de una persona sin cuenta, sanciones por IP/dispositivo, lista negra de alias, varias audiencias privadas dentro de una partida, varios DMs colaboradores, chat, migración del perfil Electron ni un bus distribuido. **Esta serie soporta un proceso de API por base**, con exclusión comprobada; dentro de él, múltiples DMs/partidas/conexiones. PostgreSQL no implica escalado horizontal automático. Los repositorios y las carreras entre conexiones reales sí deben ser correctos.

## Base inspeccionada y reutilización

- `src/server/table-http.ts` compone una `TableSession` global, streams por hash de cookie y heartbeat SSE de 1 s. `src/server/auth.ts`/`ttrpg_session` son legado, no identidad persistida de participante. Reutilizar controles/límites, reemplazar contexto global solo en la composición nueva.
- `src/application/services/{table-session,dice-roll-session,public-table-projection}.ts`: conservar reglas puras de cámara, contexto, dados y filtro público. Instanciar motores por partida/apertura; adaptar URLs globales de assets al contexto autorizado. Ningún SQL en estos motores.
- `src/server/http.ts`: conservar Host/Origin, límites, errores y revalidación tras cuerpos/decodificación; cambiar autorización de assets nuevos a principal + partida/apertura + conjunto público + owner.
- `src/shared/contracts/table.ts` tiene protocolo 1 sin partida. `src/infrastructure/browser/{http,table-client}.ts` ya controla generación, cursores y reconexión: preparar variante contextual con invalidación terminal, sin cerrar otras partidas.
- Reutilizar unidad de trabajo de 006, propiedad/revisiones de 008 y participantes/credenciales/invitación/lease de 009; principal de cuenta de 007. No duplicar almacenes de identidad, catálogo o credenciales.
- Contratos/evidencia previa: [001](../001-contrato-clientes/spec.md), [002](../002-api-privada/spec.md), [003](../003-cliente-navegador/spec.md), [004](../004-mesa-sincronizada/spec.md), [005](../005-electron-servicio/spec.md), [API](../../../docs/private-api.md), [operación](../../../docs/service-operations.md) y [mesa](../../../docs/synchronized-table.md). Su evidencia de mesa única no prueba aislamiento multijuego.

## Identidades, estados y datos para el panel

Reutilizar las identidades coordinadas con 008/009: `gameId`, `openingId`, `generation`, ID opaco de cuenta propietaria y `participantId` estable dentro de la apertura. Partida disponible `ready`, archivada `archived`, eliminación interna no accesible. Apertura persistida abierta/cerrada; participante persistido `admitted|left|revoked`. El alias normalizado y discriminador de 009 son presentación, no clave de expulsión. Nunca resolver objetivo por alias, posición en lista, `connectionId` ni IP.

Lista privada para el propietario de la apertura: ID, alias, discriminador, estado de admisión, presencia derivada, fecha de admisión y última actividad pertinente. La presencia muestra `connected` si al menos una conexión válida está activa; `reconnecting` si sigue admitido pero no tiene una conexión activa; `revoked`/`left`/`expired` son estados terminales y no se cuentan como conectados. No inferir revocación por una desconexión de red. Un participante puede tener más de una credencial/stream registrado; contarlo una sola vez y revocar todos al expulsar.

Lista paginada (limit 1–100, default 50; offset no negativo), orden estable por admisión e ID, total del contexto, filtros cerrados por estado y revisión de roster. Incluye expulsados de la apertura para que un reintento no parezca una entrada nueva. No expone hashes, tokens, cookies, email de DM, IP, user agent, secretos, historial de partidas ajenas ni información de cuentas administrativas. Invitados no consultan esa lista; solo su identidad propia y la proyección pública. Alias se transmite como texto, nunca como HTML/Markdown ejecutable.

Cambios del roster se notifican exclusivamente al propietario de esa partida. El evento puede llevar una invalidación/revisión y requerir releer la página visible, en vez de emitir toda la lista. Un evento de presencia destinado a invitados no revela alias/IDs/acciones privadas ni el objetivo de una expulsión; la promoción del jugador principal conserva los mínimos técnicos necesarios de 004.

## Contrato HTTP nuevo propuesto

Las rutas DM extienden `/api/v1/dm/games/:gameId` de 008/009. Las invitadas usan `/api/v1/games/:gameId/`, compatible con el Path de cookie de 009. Los nombres concretos se consolidan en esquemas/guía antes de construir; no modificar los contratos de autenticación de 007/009 sin reconciliación.

| Ruta propuesta | Acceso y resultado |
| --- | --- |
| GET `/api/v1/dm/games/:gameId/participants` | DM propietario vigente; openingId/generación explícitos y paginación validada. Lista/revisión/estado del contexto, sin secretos. |
| POST `/api/v1/dm/games/:gameId/participants/:participantId/kick` | DM propietario habilitado, sin cambio de contraseña pendiente. Comando con requestId, openingId/generación y revisión de moderación/invitación esperada; respuesta confirmada y metadatos seguros, enlace nuevo solo en primera ejecución efectiva. |
| GET `/api/v1/dm/games/:gameId/table/{state,events}` | Estado/SSE del propietario de esa partida, incluye solo sus datos autorizados y roster. |
| POST `/api/v1/dm/games/:gameId/table/:action` | Publicar/retirar snapshot, cámara, orden de cámara, puntero y área; capacidades de 004 restringidas al contexto. Abrir/reabrir/lease siguen las rutas de 009, no `table/open` como atajo. |
| GET/POST `/api/v1/dm/games/:gameId/dice/:action` | Operaciones DM de 004 sobre el motor de esa partida/apertura; historial y preferencias privados. |
| GET `/api/v1/games/:gameId/table/{state,events}` | Principal invitado vigente de esa partida/apertura, proyección filtrada. |
| POST `/api/v1/games/:gameId/table/{camera-report,ready,map-image-status}` | Solo acciones invitadas existentes, con conexión/contexto/revisión propios. Ninguna mutación de escena o cámara DM. |
| GET `/api/v1/games/:gameId/dice/{public,sizes}` y POST `.../dice/render-status` | Datos públicos y reporte de render de tirada actualmente visible, sin acceso a begin/complete/history/preferences/context. |
| GET/HEAD `/api/v1/games/:gameId/assets/:assetId` y POST `.../assets/resolve` | Autenticación invitada + publicación vigente del contexto + owner del asset. No enlaza `/dm/assets` como bypass. |

El propietario obtiene assets privados por el namespace DM de 008; la presencia de una cookie DM no transforma `/games/...` en una ruta privada. Cookie invitada, identidad DM y cookie legada se validan según su familia; con varias cookies presentes no mezclar principales ni elegir el más privilegiado.

Sin credencial válida: 401. Cuenta autenticada sin capacidad DM: 403. Partida/participante/recurso ajenos e inexistentes: 404 indistinguible donde corresponde a principal válido. Invitado revocado/caducado no obtiene bytes ni estados y recibe 401 coherente con `guest/session` de 009; no necesita distinguirse de un token inválido en HTTP. Asset no publicado para invitado válido: 404; resolve: null. Contexto/revisión obsoletos: 409; validación y límites conservan 400/422/413/429. Errores españoles sin SQL, stack, IDs ajenos ni secretos.

Todos los comandos y callbacks asíncronos capturan su contexto completo antes de encolarse; al ejecutar se comprueba que siga vigente. Un ID de conexión se vincula a credencial/participante/apertura y no autoriza fuera de esa relación. No cambiar «partida activa» globalmente como efecto de atender otra petición. Revalidar Host/Origin, DTO estricto, tipo/tamaño de body y autorización después de esperas.

## Expulsión transaccional e idempotente

La operación se ejecuta bajo la unidad de trabajo de 006/008 y bloqueo/CAS del agregado partida/apertura, coordinado con admisión/rotación/cierre de 009. PostgreSQL usa un único cliente por transacción; SQLite espera callbacks async y excluye escrituras ajenas. No confirmar con una secuencia de consultas independientes que permita join entre revocación y rotación.

1. Autenticar al DM, validar estado/capacidad y resolver propiedad. Cargar partida/apertura vigentes y objetivo por ID dentro de ese contexto. Revalidar sesión y reloj después de esperas antes de confirmar; una revocación de la cuenta en vuelo no puede producir una expulsión tardía autorizada solo por un principal capturado.
2. Resolver requestId/huella con ámbito actor + partida + apertura + acción. Una operación previa idéntica no muta; un requestId con otro objetivo/contenido devuelve 409. Revalidar autorización antes de devolver resultados deduplicados.
3. Si el objetivo ya está `revoked` en esa apertura, devolver resultado explícito de ya expulsado sin generar secreto ni aumentar versión de invitación, incluso con requestId nuevo. No rotar repetidamente por clicks/reintentos. Un objetivo `left` o expirado puede marcarse revocado una primera vez si la apertura sigue vigente; la respuesta debe describir ese estado, no fingir que estaba conectado.
4. Para expulsión efectiva, marcar participante revocado y todas sus credenciales revocadas, revocar la invitación anterior, generar un secreto CSPRNG/hash con versión nueva conforme a 009 y registrar auditoría/idempotencia/revisión dentro del mismo commit. No cambiar openingId/generación, no tocar credenciales de otros participantes ni las de otra partida/apertura.
5. Aplicar la invalidación de runtime/requests/streams del objetivo antes de responder éxito. Emitir roster/presencia del contexto después del commit; nunca emitir una expulsión que luego pueda revertirse. Devolver URL/secreto nuevo solo al DM solicitante, con no-store y exclusivamente en la primera respuesta efectiva.

El comando puede expulsar durante la gracia de conexión del anfitrión si el propietario está autenticado y la apertura todavía no venció: no renueva el lease como efecto lateral ni admite nuevas entradas durante la gracia. Si lease venció, se cerró, archivó/eliminó o hay nueva apertura, rechazar contexto viejo; no mutar la siguiente apertura. La rotación creada por expulsión conserva expiración/formato de 009 y sigue sin admitir mientras no exista presencia fresca.

Si falla antes del commit, rollback de revocación, invitación, revisión, auditoría y resultado; no desconectar participantes como si hubiera éxito. Si el commit se completó pero falló la respuesta o la aplicación del estado de memoria, el estado persistido es autoridad: bloquear/descartar accesos dudosos, cerrar recursos afectados y permitir reintento idempotente, nunca deshacer la revocación para restaurar una apariencia de éxito. Una respuesta perdida no justifica otra rotación silenciosa.

**Replay coordinado con 009:** el registro durable guarda metadatos/resultado sin secreto ni URL. Primera respuesta devuelve enlace; reintento confirma expulsión/versión con `secretAvailable:false`, sin recuperar ni volver a generar el secreto. Si el DM perdió el enlace, 011 ofrece una rotación nueva explícita usando la operación de 009. No cifrar o persistir el secreto para inventar recuperación fuera de ese contrato. La versión incluida en resultado distingue versión de la operación de la versión actual; no presentar un enlace de una operación antigua como vigente.

Al expirar la ventana de deduplicación (al menos cinco minutos según 008/009), un objetivo ya revocado tampoco causa otra rotación. Dos expulsiones concurrentes del mismo objetivo tienen un único efecto; expulsiones de objetivos distintos sobre la misma revisión se serializan y la perdedora obsoleta devuelve 409 para refrescar, sin pisar la invitación ganadora. Operaciones de otro contexto no comparten clave ni respuesta.

## Revocación de HTTP, bytes, SSE y operaciones en vuelo

La garantía es de servidor: **después de confirmar expulsión no se acepta una nueva operación ni se encola nueva información protegida para ese participante**. No basta cambiar el panel, marcar un flag en cliente o cerrar un socket. Los bytes entregados o ya encolados al transporte antes del punto de revocación no se pueden retirar; la documentación no promete borrar la memoria/red/disco del expulsado.

Mantener un registro de recursos abiertos por partida/apertura/participante/credencial, no solo por cookie o último stream. Al revocar: cancelar todos los readers/tareas que aún no respondieron, retirar conexiones del motor, detener timers de esas conexiones y cerrar los streams. Las credenciales copiadas a otro navegador, varias pestañas, un stream que estaba reconectando y todas las credenciales persistidas del mismo participante pierden permiso. No depender de recibir ni borrar la cookie del navegador remoto.

La autorización final y las transiciones de moderación/publicación deben compartir una frontera ordenada que elimine el intervalo entre «comprobé permiso» y «emití/usé el resultado». Una estrategia de gate por partida/apertura con revocación persistida y comprobación de generación es válida; su implementación debe demostrar la garantía con barreras de prueba. No mantener un bloqueo global durante lectura de cuerpos lentos: cargar/validar primero y volver a comprobar al entrar a la sección final. La expulsión de A1 no espera los cuerpos/SSE lentos de B1.

Casos obligatorios:

- **Body pendiente:** comando invitado aceptado inicialmente pero detenido antes de completar body. Expulsar y después completar: 401, sin reporte/ready/dados ni cambios de presencia provenientes del objetivo.
- **Consulta DB pendiente:** asset/resolve/state detenido después de autenticar pero antes de resolver bytes. Expulsar y liberar resultado: no se envía ese contenido. Autorización previa no sirve como permiso retenido.
- **Entre lectura y escritura:** barrera inmediatamente antes de `writeHead`/`end` o entrega de frame. Expulsar primero: el envío se descarta. Si el envío se ordenó antes, documentar esa frontera sin atribuir al servidor recuperación de bytes ya entregados.
- **Transferencia/backpressure:** impedir nuevos chunks protegidos después de revocación; no drenar una cola privada completa tras cerrar acceso. Limpiar buffers propios/referencias y terminar o destruir la respuesta según ya tenga cabeceras. HEAD/304/Range/resolve no eluden autorización; no devolver 304 o metadata de asset revocado.
- **Reintento/deduplicación:** repetir una mutación o lectura con resultado cacheado después de revocación no devuelve el resultado privado ni reaplica nada. La validación de principal precede a la caché.
- **Reconexión SSE:** autenticar antes de enviar headers/bootstrap y registrar suscripción en la misma frontera ordenada. Expulsar mientras se abre una conexión no deja un stream huérfano. Cursor de otra partida/apertura o conexión vieja no recupera historial ni autoriza acceso.

Un stream autenticado puede recibir un **evento terminal mínimo** sin snapshot, alias ajenos, invitación o secreto, por ejemplo `access-ended` con contexto propio y motivo seguro. Se intenta cerrar inmediatamente, sin esperar que el cliente confirme ni que drene indefinidamente; si no puede enviarse, se cierra igualmente y el siguiente HTTP deniega. No usar el evento terminal como único control. No retransmitirlo a otros jugadores como un evento de expulsión global.

La expiración de credencial/lease se comprueba antes de cada operación/entrega, aunque un timer esté atrasado; los streams ociosos se cierran con watchdog de servidor acotado (máximo 1 s desde detectar vencimiento mediante su ciclo de mantenimiento). La expulsión explícita cierra sus recursos antes del ACK, sin esperar ese intervalo. Errores/indisponibilidad de la autoridad DB fallan cerrados y no prolongan una sesión usando datos cacheados.

## Runtimes, publicación y dados por partida

Crear el runtime solo para una apertura vigente y contexto autorizado. Clave mínima `gameId + openingId + generation`; añadir epoch nuevo de proceso/runtime para ordenar transporte tras reinicio. Epoch de transporte, generación persistida de apertura y contexto de mapa son identidades diferentes. No sustituirlas por una variable única ni aceptar epoch de cliente como autorización.

Cada runtime contiene su `TableSession`, `DiceRollSession`, snapshot/conjunto de assets, cámara/órdenes/reportes, punteros/áreas, conexiones, secuencias de audiencias y deduplicación. No reutilizar una instancia entre A1/A2 aunque compartan owner o escena. El DM puede estar conectado a varias partidas; una orden identifica a cuál pertenece. Una tirada, historial privado, promoción de jugador principal o cambio de mapa de A1 nunca cambia A2/B1. Preservar separación de secuencias DM/jugador para que acciones ocultas no filtren actividad privada.

Antes de publicar, resolver todas las referencias mediante el propietario de la partida conforme a 008 y aplicar `publicTableProjection`. Generar URLs de assets con contexto de partida, no copiar diccionarios/rutas del input. Solo mapa activo y contenido público existente; no transmitir notas, bibliotecas, mapas inactivos, enlaces privados, entidades ocultas ni resultados/historial de tiradas ocultas. Cambiar snapshot y conjunto público debe ser una transición atómica del runtime; una petición de asset en vuelo se revalida también contra la revisión/publicación actual.

Dos partidas pueden publicar el mismo asset del mismo DM. Retirarlo de A1 revoca su lectura futura allí pero lo conserva en A2 si sigue publicado; el token de A1 no lo descarga desde la URL de A2. Conocer `assetId`, `gameId`, `openingId`, `rollId` o `connectionId` no concede acceso. Un DM no puede publicar datos de otro owner mediante referencias manipuladas.

Reutilizar controles de 004: reportes de cámara ligados a conexión/contexto/revisión, navegación jugador independiente, recentrado solo explícito, principal determinista entre participantes conectados, reporte listo solo para imagen/revisión vigente, replay de dados sin ejecutar física de nuevo. Al expulsar al principal, promover al siguiente elegible de la misma partida, limpiar ACK/reporte del anterior y pedir bootstrap/confirmación; no mover cámaras ni generar una tirada como efecto de la promoción. Expulsar al último deja la publicación sin jugadores, no borra la escena guardada ni afecta otras partidas.

Un cambio de apertura destruye runtime anterior y sus callbacks/listeners/dedup; callbacks de simulación/upload/consulta iniciados en él no se aplican al nuevo. El cambio de mapa conserva las reglas actuales de contexto de dados sin confundirlo con reabrir toda la partida.

## SSE, límites y adaptador cliente

Definir un sobre nuevo validado para la familia contextual (propuesta `protocolVersion: 2`), manteniendo versión 1 en el camino legado hasta 011. Incluir gameId, openingId/generación, epoch, audiencia autorizada, secuencia, contexto/revisión y serverTime. Un ID SSE debe identificar inequívocamente ese ámbito; validar longitud/sintaxis y nunca usarlo como credencial. Un bootstrap nuevo recupera solo estado actual autorizado, no replay histórico de datos de otros mapas/partidas. Un cursor bien formado de otro ámbito produce bootstrap actual solo después de autenticar su contexto o rechazo explícito; nunca mezcla buffers.

Reutilizar orden, deduplicación y tolerancia a lecturas tardías de `BrowserTableClient`. La nueva instancia recibe contexto inmutable y principal resuelto; cambiar partida/apertura crea o limpia esa instancia. No mantener un cursor, caché de assets o cola de comandos global compartido. Distinguir reconexión transitoria de terminación de acceso.

Ante terminal de expulsión/cierre/credencial inválida: detener timers/reintentos, abortar todas las peticiones del contexto, incrementar generación cliente, vaciar snapshot/dados/punteros/áreas/URLs de imágenes y notificar al consumidor que debe desmontar la proyección. Frames, respuestas y callbacks que se resuelvan después se descartan, aunque estuvieran en buffers antes de `abort()`. No volver a intentar el secreto de invitación, no autoingresar con alias ni reactivar con un heartbeat. Estas funciones del adaptador se prueban en 010; la pantalla visible y mensaje final se verifican en 011.

Una desconexión de red sin señal terminal conserva la vista como desactualizada y reintenta dentro del contexto autorizado; al recuperar recibe bootstrap actual. La nueva validación HTTP denegada detiene el ciclo. Sobrevivientes de una expulsión conservan sus instancias/credenciales/cámaras y no reciben una orden de limpiar por una rotación de invitación.

Mantener límites existentes de 004 donde aplican: heartbeat SSE 1 s (distinto del heartbeat DM de 10 s), watchdog cliente 15 s, backoff máximo 30 s, buffer por socket 2 MiB y cierre si no drena en 5 s, frame cliente 12 MiB, límites JSON/imágenes/reportes y reservas de deduplicación por audiencia. Añadir límites globales del registro de runtimes y streams, además de los de cada partida, para que multiplicar gameIds no multiplique memoria sin cota. Conservadoramente mantener máximo global de 64 streams por proceso y límites HTTP existentes, con cuota por partida y reserva DM documentadas; no afirmar que 64 jugadores de 009 podrán todos abrir stream junto al DM si el límite global no lo permite. Responder 429 y limpiar recursos; un participant admitido sin cupo SSE permanece reconectando, no es expulsado.

Conservar un stream activo por credencial/contexto como en 004: reconexión reemplaza el anterior de esa misma credencial, no a otro participante. El cierre por reemplazo es distinguible del fin de admisión para evitar bucles entre pestañas; el cliente anterior deja de reabrir automáticamente ese stream hasta acción explícita. Expulsar cierra todos los streams del participant cualquiera sea su credencial. Definir y probar contadores por participante único, no número de sockets. Las cuotas y limpieza no crean runtimes para peticiones anónimas/IDs inválidos ni guardan un historial sin límites.

## Lease, cierre, reinicio y exclusión de proceso

009 es autoridad de admisión/presencia: heartbeat DM cada 10 s; fresco si now < último contacto + 30 s; gracia hasta `leaseExpiresAt = último contacto + 150 s`; a partir del deadline vencido. Durante gracia no hay nuevos joins, pero participantes admitidos conservan sus credenciales; conexiones pueden reconectar a la misma apertura. No rotar por SSE, cambio de pestaña, refresco ni heartbeat ordinario. La revisión de ciclo de vida es separada del contacto periódico.

- **Rotar invitación o expulsar a otro:** misma apertura, sobrevivientes intactos; no cierra ni resetea motores/cámaras/dados.
- **Salida voluntaria o vencimiento de credencial:** invalida todas las credenciales/streams de ese participante según 009, sin rotación adicional por parte de 010 y sin invalidar al resto.
- **Cierre, reapertura, archivo/eliminación o lease vencido:** ninguna autorización de apertura vieja sigue sirviendo datos. Cerrar streams y runtime, limpiar proyección del cliente mediante terminal o posterior 401; no confiar únicamente en un timer de limpieza. Nueva apertura usa generación/invitación nueva por 009.
- **Disable del propietario:** invalida las aperturas/credenciales correspondientes de manera que rehabilitar la cuenta no resucite accesos. Integrar revocación de 007; una sesión patrocinadora revocada no prueba presencia. Otra sesión válida del mismo dueño puede reanudar dentro de gracia según 009, pero no un heartbeat tardío tras vencimiento.
- **Restart ordinario dentro de gracia:** metadatos, invitaciones y credenciales siguen persistidos según 009; el runtime efímero se reconstruye vacío con nuevo epoch. El propietario debe enviar contacto válido en la nueva época antes de nuevas admisiones; no se concede otra gracia. Invitados aún autorizados pueden esperar/reconectar sin nueva identidad, pero no reciben una publicación fantasma: DM vuelve a publicar explícitamente. Cámaras, tiradas, historial, conexiones y punteros efímeros previos no se restauran ni se reproducen como eventos nuevos.
- **Restaurar backup antiguo:** distinto de restart; aplicar procedimiento de 009/008 que invalida aperturas/credenciales restauradas antes de servir. No resucitar una expulsión perdida al volver atrás la DB.

**Un proceso de API por base, acordado para esta serie:** adquirir exclusión de runtime antes de aceptar HTTP/SSE y fallar claramente si ya existe otro proceso dueño. SQLite reutiliza exclusión física segura; no borrar locks de procesos vivos ni deducir que son huérfanos solo por antigüedad. Documentar verificación del operador tras caída y conservar el procedimiento de 006. PostgreSQL usa exclusión ligada a una conexión propia mantenida viva (bloqueo consultivo o mecanismo equivalente) y un epoch/fencing de runtime verificado por las operaciones pertinentes; no basta un PID en memoria ni una fila con TTL que otro proceso pueda robar mientras el primero sigue emitiendo.

Al perder la conexión/propiedad de exclusión, el proceso deja de servir información protegida, cierra streams y termina o queda inequívocamente no disponible; no vuelve a apropiarse de runtimes viejos en segundo plano. Nuevo dueño solo inicia tras liberación confirmada del bloqueo, con epoch nuevo y estados efímeros vacíos. PostgreSQL libera bloqueo de sesión al cerrarse esa conexión; probar caída abrupta, cierre limpio y pérdida del canal para que no haya dos emisores válidos ni un takeover inseguro. No usar un timeout local como prueba suficiente de muerte del otro proceso. Comandos de migración/provisión no se confunden con otro runtime, pero respetan sus reglas de exclusión y operaciones en vivo.

Esta restricción no impide pruebas de concurrencia de dos conexiones DB ni la revocación persistida de 007. El diseño de distribución de streams/consenso entre procesos queda fuera; no añadir Redis, broker o proveedor cloud para ocultar el límite.

## Persistencia, privacidad y transición

Usar migraciones/versiones/puertos async de 006–009 y la misma unidad de datos del driver seleccionado. Persistir cambios de participante, revocaciones, invitación/versiones, idempotencia y auditoría. PostgreSQL no abre archivos SQLite funcionales. Validar al leer, fallar cerrado ante corrupción y no loggear cuerpos, tokens, hashes reutilizables o URLs completas de invitación. Auditoría mínima de expulsión: actor autorizado, gameId/openingId, participantId, acción, versión/fecha/resultado. No incluir alias salvo justificación de producto; ID ya identifica el objeto.

No cambiar `.ttrpgscene` v2 ni guardar estado de admisión/dados en escenas. Biblioteca del DM y almacenamiento local Electron siguen independientes. Las operaciones nuevas no reutilizan IPC/preload ni scripts privilegiados. El cliente servicio conserva sandbox/contextIsolation y mismo frontend de 011.

Preservar activación y barrera transitoria de 006–009: credenciales nuevas no autorizan mesa global; el frontend legado no entra al runtime multijuego por accidente. Ampliar la composición HTTP aislada de backend para ejecutar la API completa nueva sobre ambos motores sin `ServiceStore` legado. Mantener guard productivo de la composición antigua hasta corte integrado de 011. Un arnés de pruebas correcto no es despliegue ni interfaz terminada.

Actualizar contratos/docs de API, mesa y operación con rutas/contextos/estados, revocación, semántica de respuesta perdida, límites de bytes ya entregados, restricción de un proceso, lease/restart/restore y formato de eventos. Entregar a 011 mensajes y callback terminal, revisión de roster y respuesta de moderación para la confirmación: objetivo alias + discriminador, perderá acceso, enlace cambia, demás permanecen. Aclarar que alguien con un enlace posterior puede volver como otro participante; no afirmar identidad humana ni expulsión permanente.

No se añade panel visual en 010. Si algún ajuste toca vistas existentes, hacerlo solo por integración justificada y verificar mediante CUA teclado/foco/Escape, inputs sin atajos destructivos, partida/origen visibles, conservación del bloqueo de escala, local 820×520, servicio 1024×768/1440×900 y Player 1920×1080. La confirmación visual de expulsión y limpieza visible del jugador corresponden a 011; las pruebas del adaptador no sustituyen ese humo futuro.

## Aceptación observable

| ID | Evidencia exigida |
| --- | --- |
| A1 — Autorización/roster | Principales reales 007/009; solo owner ve/modera su apertura. Admin, DM ajeno, legado, anónimo y datos falsificados no autorizan. Lista/totales/estados correctos; alias repetidos se distinguen por ID, sin metadata privada ajena. |
| A2 — Atomicidad/idempotencia | Revocación de todas las credenciales + invitación + auditoría/revisión/resultado se confirman juntos. Fallo intermedio revierte todo. Repetición concurrente y requestId nuevo sobre revoked no rotan otra vez; contenido distinto 409. Replay perdido/restart confirma sin secreto. |
| A3 — Supervivientes | Expulsar uno de tres conserva cookies, IDs, streams, cámaras y dados de los otros. Enlace viejo falla, nuevo admite. Expulsar principal promueve solo dentro de su partida sin mover cámara ni producir tirada. |
| A4 — Revocación en vuelo | Barreras en body, DB, escritura/frame y backpressure: revocar y liberar no muta ni encola datos nuevos del objetivo. Todos sus streams cierran antes del ACK. GET/HEAD/resolve/dedup/304/Range y cookie copiada no eluden rechazo. |
| A5 — Carreras | join/kick, kick/close/reopen, dos kicks iguales/distintos, lease/heartbeat y revocación DM respetan orden transaccional. Join que ganó antes puede sobrevivir como otro ID; con enlace viejo después del kick falla. Ningún resultado antiguo muta nueva apertura. |
| A6 — Aislamiento | A1/A2 del mismo DM y B1 de otro: publicaciones, assets, cámaras, dados, cursores y dedup separados; UUID iguales en otro contexto no comparten resultado. Asset compartido sigue accesible solo donde esté publicado y autorizado. Datos privados no aparecen en bytes jugador. |
| A7 — Ciclo de vida | Fronteras 29.999/30/149.999/150 s y token a 8 h según 009; caída/resume, cierre/reapertura, disable y restore. Restart da epoch nuevo/runtime vacío, no nueva gracia ni invitación por reconexión. |
| A8 — Exclusión/cuotas | Segundo proceso contra la misma base falla antes de servir; caída/pérdida de propiedad detiene al anterior y permite recuperación sin dos emisores. Límites de runtimes/streams/buffers y limpieza reales; cuerpo lento ajeno no bloquea moderación. |
| A9 — Cliente | Terminal limpia y detiene retry solo del contexto; respuesta tardía tras abort no repuebla. Sobrevivientes no se limpian; reemplazo de stream no crea bucle entre pestañas. No atribuirlo todavía a panel visual de 011. |
| A10 — Multi-DB/entrega | Mismo contrato HTTP/DB/SSE y carreras en SQLite/PostgreSQL reales; checks/builds, migraciones y humo compilado. Escena v2/Electron local preservados; sin skips verdes, Git write o despliegue. |

## Pruebas y comandos de construcción

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`, `pnpm test:db` y `pnpm db:migrate` en destinos temporales. Ampliar el gate multi-DB a HTTP/SSE o añadir otro comando exacto documentado, siempre obligatorio. PostgreSQL real ausente es impedimento: coordinar instancia temporal sin tocar servicios ajenos; nunca sustituir por SQLite, mocks o skips. No ejecutar estos checks durante la especificación.

Por motor: dos DMs de 007, partidas A1/A2/B1, al menos tres invitados por admisión real de 009 (dos con mismo alias), credenciales independientes, una fixture válida con varias credenciales del objetivo y streams HTTP reales. A1/A2 comparten imagen; B1 usa otra. Capturar bytes completos buscando centinelas privados; comprobar permisos con tokens copiados y referencias conocidas. Usar barreras de test, no sleeps ni endpoints públicos de depuración, y releer DB desde otra conexión tras cada rollback/carrera.

Humo del artefacto compilado en ambos motores: emitir/canjear invitaciones, publicar mapa/dado público con datos privados centinela, abrir streams, expulsar, comprobar cierre/401 del objetivo, supervivientes y enlaces viejo/nuevo. Reiniciar, comprobar runtime vacío/plazos, volver a publicar y probar exclusión de segundo proceso. Clientes HTTP no son prueba visual. Tests del adaptador cubren terminal, cambios de contexto, lectura tardía, cachés y reconexión; UI final es 011.

Reutilizar evidencia 001–005 para herramientas no modificadas con atribución; CUA dirigido si se modifica una vista. Registrar en build Node/motores/drivers, comandos sanitizados, conteos sin duplicar, evidencia propia/heredada, errores y límites. Limpiar sockets/timers/pools/procesos propios; no usar `.env`, datos o perfiles personales.

## Riesgos y condiciones antes de construir

- Falta aprobación/entrega final de 009 y dependencias. Reconciliar contexto, CAS, namespaces y replay sin secreto antes de construir; esta spec no inventa implementaciones de Better Auth/repositorios.
- La transacción DB no cierra sockets y la memoria no revoca credenciales durables. La frontera commit→invalidación→ACK y autorización→envío requieren pruebas específicas.
- Cambiar URLs globales del filtro público al contexto sin alterar Electron local pertenece a 010, no se pospone al frontend.
- Restart no prueba DM presente; restaurar backup puede resucitar accesos si no se aplica invalidación previa. Exclusión de proceso no equivale a alta disponibilidad.
- Un enlace posterior o una admisión que ganó antes de rotar permite otra identidad. No ampliar expulsión a rastreo de personas/IP/dispositivo ni prometer un veto permanente.

Publicar esta spec no sustituye revisiones ni autoriza construcción anticipada, integración o despliegue.
