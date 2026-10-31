# 009 — Invitaciones renovables y participantes con alias

## Estado, dependencia y autorización

Especificación propuesta, ciclo 1, 2026-10-29. Define backend y contratos por construir; no acredita funcionamiento de cuentas, motores, partidas o invitaciones. Contexto leído exclusivamente en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`: perfil especificador, AGENTS.md, package.json, README, [solicitud](solicitud.md), [modelo común](../../autenticacion-partidas.md), specs [006](../006-persistencia-multidb/spec.md), [007](../007-cuentas-dm/spec.md) y [008](../008-partidas-propiedad/spec.md), además de las solicitudes 010/011 y fuentes actuales de autenticación/mesa.

006–008 son propuestas, no entregas aprobadas. 008 se publicó durante esta redacción; su contrato de apertura se coordina con las reglas de este documento. **No construir 009 hasta APROBAR de 008 y orden del orquestador**, tras reconciliar sus contratos reales de principal, transacción, revisión y composición. Los nombres HTTP nuevos aquí son propuestas propias de 009, no APIs atribuidas a una dependencia inexistente.

Solo se escribe esta spec. Rama prevista de construcción `feature/factory-009-invitaciones-jugadores`, a resolver al comenzar; no cambiar Git ahora. Sin staging, commit, push, merge, despliegue ni DMG; no tocar checkout original, datos/perfiles/servicios ajenos o `.env` privados. Bump minor único desde la versión final de 008 y changelog fechado al construir, sin fijar una cifra que ignore el cierre real de dependencias. `.ttrpgscene` conserva v2 y migración v1.

## Objetivo y fronteras

El propietario DM puede iniciar/reabrir una partida y obtener un enlace renovable. Un visitante que presenta el secreto correcto y un alias entra como participante de esa apertura, recibe una credencial propia y no necesita cuenta ni contraseña personal. Rotar el enlace dentro de la misma apertura impide entradas con el enlace anterior y conserva el acceso de los participantes ya admitidos.

Distinguir cinco identidades: cuenta DM, sesión de autenticación, partida, apertura de partida y participante invitado. La invitación autoriza **admisión**, no cada lectura posterior. La credencial de participante autoriza únicamente su partida/apertura y no equivale a un usuario Better Auth, rol global player o identidad personal demostrable.

Incluye invitación/hash/expiración/generación, operaciones transaccionales de apertura/lease/rotación/cierre, admisión y salida voluntaria, principal invitado, cookie separada, alias/discriminador, contratos HTTP, límites, auditoría y pruebas en ambos motores. Incluye un módulo cliente pequeño y testeable para capturar/sanitizar el fragmento destinado a 011, sin crear todavía formularios o una pantalla de mesa falsa.

No incluye panel visual, login o catálogo nuevos, envío de invitaciones por email/mensajería, cuentas de jugadores, cambios de alias después de entrar, expulsión/panel de moderación, registro de runtimes SSE/dados completo, ni corte de las claves legadas. La expulsión y revocación de streams pertenecen a [010](../010-moderacion-tiempo-real/solicitud.md); las pantallas y cableado final a [011](../011-experiencia-autenticacion/solicitud.md). No adelantar esas capacidades como implementadas.

## Reutilización y estado real

- 006 propone unidad de trabajo asíncrona, `control.sqlite` local, PostgreSQL real, migraciones y `pnpm test:db`; 007 propone Better Auth y principal de cuenta sin acceso al legado. Usar sus implementaciones aprobadas, sin duplicar conexiones, tablas de cuentas ni APIs administrativas.
- 008 propone catálogo y recursos privados por DM, contexto de partida/apertura, generación monotónica y CAS. Extender sus repositorios de apertura; no crear otro catálogo ni mezclar estado `ready/archived` de disponibilidad con presencia del anfitrión.
- `src/server/auth.ts` y cookie `ttrpg_session` siguen siendo autenticación global histórica en la base leída. `src/server/table-http.ts` crea una sola `TableSession`; su epoch de transporte y heartbeat SSE no son apertura persistida ni lease del DM. No reutilizarlos como prueba de autorización por partida.
- `src/application/services/public-table-projection.ts` filtra lo público y `TableSession` mantiene assets/cámaras/dados por runtime; 010 los adaptará por contexto. La admisión 009 nunca se conecta al runtime global anterior para aparentar una proyección funcional.
- Conservar validación Host/Origin, JSON estricto, timeouts, límites y errores sanitizados de `src/server/http.ts`, contratos de referencias y reglas de 008 sobre propiedad. Dominios de tokens, hash y operaciones se encapsulan detrás de aplicación/infraestructura; React no conoce DB.
- [API privada](../../../docs/private-api.md), [operación](../../../docs/service-operations.md) y [mesa sincronizada](../../../docs/synchronized-table.md) documentan la base global. Actualizar con una sección explícita de transición 009, sin convertir sus resultados históricos en pruebas de múltiples partidas.

## Modelo persistente mínimo

| Registro | Invariantes |
| --- | --- |
| Apertura | Reutiliza 008: ID opaco, gameId, generación creciente, estado `open/closed` o equivalente reconciliado, revisión de ciclo de vida, propietario/anfitrión verificado, último heartbeat y `leaseExpiresAt`. Una apertura vigente por partida. |
| Invitación vigente | gameId, openingId/generación, versión creciente, hash del secreto, fecha de creación, expiración y estado válido/revocado. Solo una vigente por apertura. No guardar secreto o URL completa en claro. |
| Participante | ID aleatorio estable, gameId, openingId/generación, alias normalizado, discriminador único de esa apertura, estado `admitted/left/revoked`, fechas. `revoked` queda preparado para 010, sin endpoint de expulsión en 009. |
| Credencial invitada | Verificador hash de token aleatorio independiente, participantId, partida/apertura, expiración absoluta y revocación. Índices y restricciones evitan reasignar una credencial a otra partida. |
| Operación/auditoría | Actor o contexto de admisión, acción, requestId, huella, versión y resultado público mínimo, fecha. Sin invitación/token/cookie/URL completa ni cuerpos de petición privados. |

Los nombres finales se reconcilian con las entregas, pero las semánticas y constraints son obligatorias. Tiempos UTC de servidor, números/versiones seguros, UUID opacos y validación al leer filas. Corrupción falla cerrada, no se interpreta como invitación libre o colección vacía. No introducir estos campos ni secretos en `.ttrpgscene` ni en exportaciones operativas de contenido de 008.

## Presencia, lease y reentrada del DM

**Parámetros de esta spec:** heartbeat recomendado cada **10 segundos**; contacto fresco durante **30 segundos**; gracia de reconexión adicional de **120 segundos**. Sea `t` el último heartbeat aceptado: `freshUntil = t + 30 s` y `leaseExpiresAt = t + 150 s`. Límites exactos: fresco si `now < freshUntil`; gracia si `freshUntil <= now < leaseExpiresAt`; vencido si `now >= leaseExpiresAt`. El reloj del cliente nunca fija esos valores.

| Situación | Nueva admisión | Participantes existentes | Acción del DM |
| --- | --- | --- | --- |
| Apertura abierta y contacto fresco comprobado | Permitida con invitación vigente | Conservan credencial | Heartbeat o recuperación ordinaria no rotan nada. |
| Red caída/contacto no fresco, dentro de gracia | Rechazada como anfitrión no disponible, solo tras validar invitación | Conservan credencial; estado reconectando, sin promesa de actualizaciones nuevas | Resume autenticado dentro del plazo conserva apertura, invitación y participantes. |
| Lease vencido o cierre explícito | Rechazada | Principal de esa apertura deja de autorizar; no se recupera por heartbeat tardío | Iniciar/reabrir explícitamente crea nueva apertura/generación e invitación. |
| Reapertura explícita mientras seguía abierta | Solo el enlace nuevo | Credenciales de apertura anterior dejan de autorizar | Acción deliberada, con revisión esperada, distinta de refrescar/reconectar. |

Solo propietario DM autenticado, habilitado y sin cambio de contraseña pendiente puede iniciar, reabrir, renovar o cerrar. Administrador de cuentas no es sustituto del propietario. Heartbeat/resume exige gameId, openingId y generación actuales; no crea aperturas implícitas ni puede ampliar una ya vencida/cerrada. La renovación se verifica con hora actual **dentro de la transacción**, no con hora capturada antes de esperar bloqueo. Heartbeats tardíos/fuera de orden no reducen el plazo ni reviven una generación vieja.

Varias pestañas/sesiones válidas del mismo propietario pueden mantener la misma apertura. Abrir una pestaña, recargar página, reconectar SSE o renovar cookie no ejecuta «reabrir». Al menos un contacto válido mantiene presencia; cerrar una pestaña por pérdida de conexión no ordena cerrar toda la partida. Un propietario que vuelve a autenticarse durante la gracia puede reanudar la misma apertura; el contrato distingue ese resume de una orden explícita de empezar otra vez, que sí produce enlace nuevo.

El registro de contacto referencia una identidad/sesión verificada sin guardar cookie en claro. Antes de admitir comprobar que el contacto patrocinador sigue autorizado y la cuenta propietaria está habilitada. Si esa sesión se revoca, no basta el timestamp anterior: otra sesión válida del propietario debe enviar un contacto nuevo. Deshabilitar la cuenta propietaria o eliminar/archivar la partida impide admisiones y autorización invitada aun si quedaba tiempo de lease. No transferir propiedad ni revivir credenciales al rehabilitar.

Reinicio del proceso no demuestra presencia: exigir un heartbeat del propietario en la nueva época de presencia del runtime antes de admitir. Se puede reanudar dentro del deadline persistido sin rotación; transcurrido el plazo requiere apertura nueva. Persistir deadline para no conceder una gracia nueva en cada restart. Esta serie puede mantener un solo proceso de runtime según 008; no anunciar coordinación horizontal de SSE. Las carreras de repositorios y autenticación entre conexiones PostgreSQL sí se prueban.

La expiración se comprueba en toda operación aunque no corra un timer. Un proceso de limpieza puede marcar cierre y revocaciones; no puede ser el único mecanismo que quite permisos. Revisión de ciclo de vida e invitación son separadas del contacto periódico: el heartbeat no provoca conflicto en cada comando DM por incrementar la misma revisión usada para rotación. 010 consumirá estos estados para detener streams y limpiar proyección sin reabrir permisos.

## Invitación y manejo del secreto

Generar **32 bytes CSPRNG independientes** y codificarlos base 64 url canónico sin padding (43 caracteres). La URL se forma exclusivamente con origen público validado y gameId canónico: `/jugar/<gameId>#invitacion=<secreto>`. El ID es público y opaco; no es una credencial. No incluir alias, ID de cuenta, email ni secretos en query/path.

Guardar solo hash/verificador de dominio separado del token, con contexto de partida/apertura y versión. SHA-256 sobre un secreto aleatorio de 256 bits es válido aquí; no es un hash de contraseña ni reemplaza el esquema de 007. Usar primitivas estándar y comparación segura de digest del mismo tamaño; rechazar codificación/longitud malformada. No reutilizar `TTRPG_AUTH_SECRET`, clave DM legada, contraseña o token de participante como invitación.

Expiración absoluta de la invitación: **8 horas** desde emisión, además de validez de apertura y presencia. Rotar crea secreto nuevo, aumenta versión y fecha de expiración y revoca la anterior atómicamente. No cambia openingId ni credenciales admitidas. Un enlace caducado requiere rotación explícita por el DM; no rotar por GET/heartbeat/reconexión.

El secreto/URL completos solo se devuelven al propietario en la respuesta exitosa de creación/rotación, `Cache-Control: no-store`; no van en eventos/SSE, auditoría, logs o mensajes de error. GET de metadatos nunca puede recuperar el secreto a partir del hash. Si el cliente pierde el enlace, ofrece una rotación explícita nueva en 011; no fingir que GET lo recupera. Datos anteriores ya descargados no se pueden retirar.

Para 011, entregar módulo de entrada que lea el fragmento una vez, valide la sintaxis y ejecute `history.replaceState` para quitarlo **antes de cargar módulos/recursos opcionales o hacer peticiones**. Mantenerlo solo en memoria hasta canjear/cancelar; no localStorage/sessionStorage, cookie legible, analytics o navegación de terceros. `Referrer-Policy: no-referrer` y ningún tercero en la página de entrada. Probar el módulo con history/location/fetch instrumentados; el cableado real a la página es aceptación de 011. 009 no publica un enlace como flujo visual terminado si aún no existe esa pantalla.

## Admisión, alias y cookie propia

Canje exclusivo por POST JSON del mismo origen con secreto y alias. Dentro de una transacción comprobar invitación vigente/contexto/expiración, propietario habilitado, partida disponible, apertura actual y DM fresco; después crear participante, credencial y resultado/idempotencia. No confiar en owner, role, fechas, participantId o openingId arbitrarios enviados en body. La apertura autorizada se resuelve desde la invitación; cualquier precondición de apertura esperada solo puede restringir, nunca elegir otra.

Alias: trim, normalización NFC, de 1 a 40 puntos de código y máximo 160 bytes UTF-8; rechazar vacío, controles, caracteres de formato invisibles/bidi y contenido inválido. Tratar `<`, `>`, comillas y demás texto como texto escapado, nunca HTML/Markdown ejecutable. Permitir nombres Unicode y alias repetidos. Asignar discriminador estable único dentro de la apertura, por ejemplo un sufijo numérico asignado transaccionalmente; «Ana · 07» y «Ana · 08» son participantes distintos. Alias y discriminador no autorizan ni sustituyen el ID. Cambiar alias no forma parte de 009.

Generar token de participante nuevo de 256 bits CSPRNG, independiente de la invitación. Guardar solo su hash; entregar únicamente por `Set-Cookie`, no JSON/URL. Cookie propuesta `ttrpg_guest`, `HttpOnly; SameSite=Strict`, sin Domain, Secure con HTTPS y Path `/api/v1/games/<gameId>/` (barra final). Distintos paths permiten participar en varias partidas en un navegador sin sustituir las cookies de otras partidas. Verificar atributos exactos al borrar; rechazar cookies duplicadas ambiguas/longitudes absurdas, no elegir silenciosamente la primera. El Path no es un control de autorización: validar siempre el ámbito persistido.

Credencial con vencimiento absoluto de 8 horas desde admisión y además limitada a vida de apertura/estado del participante. No renovación indefinida en GET o SSE. Recarga/reconexión con cookie vigente conserva el mismo participantId, alias y discriminador; no canjea de nuevo ni exige conservar la invitación. Rotación de invitación no altera esta credencial. Una credencial expirada exige nueva admisión con enlace actual; no se recupera identidad personal por escribir el mismo alias.

Salida voluntaria revoca todas las credenciales de ese participante en esa apertura, marca `left` y borra su cookie; no rota invitación ni afecta a otros. Resultado idempotente y sin afirmar éxito si falló la DB. Se puede volver como nueva admisión con enlace actual, sin prometer expulsión permanente. 010 añadirá expulsión dirigida y utilizará la misma revocación junto con rotación en una única transacción.

## Contrato HTTP propuesto

Las rutas del propietario extienden `/api/v1/dm/games/:gameId` de 008. Todas las mutaciones llevan requestId y precondición de revisión/contexto cuando exista; campos concretos se documentan en esquemas compartidos antes de implementar. Las rutas invitadas viven bajo un namespace propio, no bajo `/dm` ni el login global.

| Método/ruta propuesta | Acceso y respuesta |
| --- | --- |
| GET `/api/v1/dm/games/:gameId/opening` | Propietario: estado/ID/generación/revisión, frescura/plazos y metadatos de invitación; sin secreto ni lista privada de otras partidas. |
| POST `.../opening/start` | Propietario: inicia si no hay una vigente, con revisión de partida/apertura esperada; 201, nueva apertura e invitación. Si ya abierta, 409; no equivale a resume. |
| POST `.../opening/reopen` | Propietario: cierre anterior y nueva generación/invitación atómicos; invalida credenciales anteriores. Respuesta con URL nueva solo en primera ejecución. |
| POST `.../opening/heartbeat` | Propietario vigente: openingId/generación; renueva contacto/plazos solo antes del vencimiento. No devuelve ni rota secreto. Resume dentro de gracia usa esta misma semántica. |
| POST `.../opening/close` | Propietario: cierre explícito con revisión; 204 y autorización de apertura terminada. Reintento no cambia otra apertura. |
| POST `.../invitation/rotate` | Propietario, apertura vigente/fresca y versiones esperadas: nueva versión/URL, misma apertura; participantes existentes intactos. |
| POST `/api/v1/games/:gameId/admission` | Visitante: secreto, alias y requestId; 201 con participantId, alias, discriminador, contexto y expiración seguros, más cookie. No devuelve token, hash, recursos privados ni identidad DM. |
| GET `/api/v1/games/:gameId/guest/session` | Cookie invitada válida: principal público propio y estado de apertura; 401 si inválida/revocada/caducada. No requiere secreto de invitación. |
| POST `/api/v1/games/:gameId/guest/leave` | Cookie de esa partida: salida voluntaria idempotente, 204 y cookie borrada; no toca otra partida ni identidad DM. |

No crear GET de validación del secreto ni pasarlo como bearer en URL. Un GET anónimo de `/jugar/<id>` es shell neutro de 011, sin nombre de partida/DM/escenas/estado privado. Para admisión con secreto incorrecto, rotado, vencido o partida inexistente, usar mismo error 401 `INVITATION_UNAVAILABLE` y mensaje «El enlace no está disponible. Solicita uno vigente al DM». Tras verificar una invitación auténtica aún vigente se puede devolver 409 `HOST_UNAVAILABLE` sin datos privados si el anfitrión está en gracia. Errores de sintaxis 400/422 y 429 son independientes de existencia del recurso.

Propietario ajeno/inexistente: 404 indistinguible; anónimo 401 y rol admin sin propiedad 403 en rutas DM según 008. Las respuestas para invitado no filtran nombres de partidas ajenas, email de DM, otros participantes o bibliotecas. Todas las mutaciones exigen Host/Origin exactos y JSON; `no-store`, `nosniff`, límites de cuerpo 8 KiB/tiempo y cabeceras vigentes. Cookies de identidad y legado nunca sustituyen cookie invitada en `/guest/*`; una cookie invitada no autoriza `/identity`, `/dm` ni recursos globales antiguos.

## Principal invitado y autorización de datos

Entregar a 010 un resolver de principal y validación dentro de la unidad de trabajo: token→credencial→participante→apertura actual→partida disponible/propietario habilitado. Validar expiración/revocación, estado y asociación de IDs en cada operación; ninguna caché debe seguir autorizando después de revocación confirmada. Una consulta válida en partida A nunca se reutiliza como contexto de B, aunque sean del mismo DM o compartan asset.

009 entrega HTTP de admisión/sesión/salida y ese contrato comprobable. Las rutas de proyección/SSE/lectura pública de assets/dados se completan en 010. Hasta entonces no montar un puente invitado hacia la mesa global o hacia `/api/v1/dm/assets`. En pruebas de 008/009, invitado debe seguir denegado en los endpoints privados; no simular una proyección pública incompleta como aceptación.

Cuando 010 exponga bytes, exigir simultáneamente principal vigente de partida/apertura y pertenencia del asset al conjunto público de esa partida, además de propiedad coherente de 008. Admisión no concede todos los recursos del propietario. La biblioteca privada compartida entre A1/A2 no convierte a sus invitados en una audiencia común. Mantener un puerto de revocación/contexto, sin introducir un singleton global de participantes.

## Concurrencia, idempotencia y respuesta perdida

Toda creación/cierre/reapertura/rotación y canje se serializa en el registro vigente de la partida/apertura utilizando la unidad de trabajo de 006/008. En PostgreSQL todas las escrituras/bloqueos ocurren en un único cliente; en SQLite respetar exclusión de transacción async. Revalidar propietario/sesión y tiempo después de esperas y antes del commit. No confirmar una credencial contra una invitación que ya perdió vigencia por una rotación confirmada antes de su punto de admisión.

- Join frente a rotate: si join confirma primero, queda admitido y la rotación conserva su credencial; si rotate confirma primero, el secreto anterior no admite. No exigir expulsar a quien entró legítimamente antes de rotar.
- Join frente a cierre/reapertura/fin de lease/eliminación/disable: o se admite antes y su autorización termina con la transición, o se rechaza; nunca queda credencial útil de generación anterior después de confirmar el cierre.
- Dos rotaciones con la misma revisión: solo una cambia versión. Dos reaperturas con la misma revisión: solo una nueva generación. CAS obsoleto devuelve 409 sin pisar la versión ganadora.
- Heartbeat concurrente al deadline no revive un lease vencido por usar un timestamp previo al bloqueo. Heartbeat de otra partida no conserva esta. Cancelación/fallo después de insertar participante pero antes de credencial revierte todo.

Reutilizar idempotencia persistida de 008 con ámbito de actor/partida/apertura/acción y huella de payload **sin guardar secretos** (incluir su digest, no el valor). Mismo requestId/contenido no repite efectos; distinto contenido 409. Revalidar autorización incluso para resultados ya confirmados. Ventana mínima 5 min, con límite de registros y limpieza documentados; replay tardío no puede volver a rotar una apertura si faltaba la revisión esperada.

**Excepción explícita para respuestas con secretos:** el registro durable guarda metadatos del resultado, nunca URL/token en claro. La primera respuesta de start/reopen/rotate contiene el enlace; un replay confirma operación/versión sin volver a entregar un secreto irrecuperable y marca `secretAvailable:false`. El cliente consulta estado y propone una rotación nueva explícita si perdió el enlace. No ejecutar una segunda rotación silenciosa ni devolver un enlace de una versión ya revocada. Esto acota la semántica de respuesta de 008 para 009: efectos exactamente una vez dentro de la ventana, no recuperación durable del secreto.

Para admission, requestId duplicado no crea otro participante. Si llega con la cookie vigente del participante de ese resultado, devuelve su misma identidad sin rotar la cookie. Sin esa cookie, el replay devuelve 409 `ADMISSION_ALREADY_PROCESSED` sin token ni datos privados, después de comprobar invitación vigente; no entrega la credencial almacenada solo como hash. Si la respuesta original se perdió antes de instalar cookie, el visitante inicia un intento nuevo explícito con requestId nuevo y enlace vigente; será otro participante, no una recuperación por alias. Documentar este caso y acotar registros/capacidad; no prometer reconocimiento de persona sin credencial. Dos pestañas con distinta petición pueden producir dos participantes; recargar con cookie válida no debe hacerlo.

Una petición de admisión que ya lleva cookie válida de esa apertura conserva la identidad si el alias coincide; si pide otra identidad devuelve 409 y solicita salir antes. No deja credenciales activas ocultas al sustituir la cookie en silencio. Una cookie inválida/vieja nunca convierte un secreto inválido en una admisión correcta.

## Límites, persistencia y operación

Límites iniciales propuestos: 64 participantes admitidos simultáneos por apertura; 1000 admisiones totales por apertura; 10 intentos de admisión/minuto/IP y 60/minuto/partida; mapa de cuotas y concurrencia acotados. Contar incluso entradas inválidas y requestId de replay; proteger contra crecimiento por IDs inexistentes. Rechazo 429 con Retry-After, sin confirmar existencia del ID. El operador puede ajustar límites documentados tras medir, sin desactivar autenticación; cuotas por proxy usan la política real de par confiable, no X-Forwarded arbitrario. La capacidad se reserva dentro de la transacción: dos últimas plazas concurrentes no exceden el máximo. Salida/expiración libera cupo activo, no reescribe el histórico ni permite crecimiento infinito.

Migraciones versionadas de 006 extienden la unidad de almacenamiento nueva (control.sqlite/DB PostgreSQL), con restricciones e índices por partida/apertura/tokenhash. No usar mapas en memoria como autoridad de participantes/invitaciones. Tanto SQLite como PostgreSQL deben conservar metadatos, versiones, revocaciones y plazos al reiniciar; no guardar invitaciones en `.env` ni archivos sueltos. PostgreSQL no abre bases SQLite auxiliares. No se migran sesiones/secretos desde el legado ni se leen perfiles personales.

Auditoría de apertura/reapertura/rotación/admisión/salida/cierre: acción, actor o participante opaco, contexto y fecha/resultado, sin secretos/URLs completas. Redactar cuerpos y cookies en logger y errores; pruebas capturan logs y comparan centinelas sintéticos. La base y sus backups siguen siendo privados: tener hashes de tokens no los vuelve información pública. La guía debe indicar que restaurar un backup no debe resucitar accesos previos: antes de servir tras restauración operativa, invalidar aperturas/credenciales restauradas mediante procedimiento explícito probado y crear una apertura nueva. El restart ordinario durante gracia es distinto de restaurar un backup antiguo.

No levantar el guard productivo ni cambiar flags de transición definidos por 006–008 solo para probar invitaciones. Usar la composición autorizada de pruebas/backend que esas dependencias entreguen; frontend global sigue sin usar las credenciales nuevas hasta 011. Ningún endpoint de salud o guía puede anunciar la experiencia completa multijugador antes de 010/011.

## Aceptación y verificación

| ID | Resultado observable requerido |
| --- | --- |
| A1 — Contextos | Dos DMs A/B y partidas A1/A2/B1: propietario controla solo su partida; admin/anónimo/legado no inician, rotan o mantienen leases. IDs/body/roles manipulados no cambian dueño. |
| A2 — Secreto | 32 bytes CSPRNG, codificación canónica, DB contiene solo hashes; enlaces con fragmento, no query. Logs/respuestas/eventos fuera de primera entrega no contienen centinelas de secreto/token. GET no admite ni revela metadatos privados. |
| A3 — Lease | Reloj determinista prueba 29.999 s/30 s/149.999 s/150 s; admisión solo fresca, gracia conserva invitados, resume no rota, vencido no revive. Reapertura explícita sí cambia generación y enlace; heartbeat/SSE/pestaña no lo hacen. |
| A4 — DM y restart | Sesión patrocinadora revocada no conserva admisión por timestamp; otro contacto válido puede reanudar dentro de plazo. Restart exige presencia nueva y no regala otra gracia. Cuenta deshabilitada/partida eliminada corta autorización. |
| A5 — Alias | Unicode/NFC/límites/controles/bidi/HTML tratados según contrato; repetidos aceptados con IDs y discriminadores estables distintos. Alias no autoriza reentrada ni otra partida. |
| A6 — Credencial | Cookie independiente, HttpOnly/Secure/SameSite/path/salida correctos; tokens no aparecen en JSON/storage. Recarga con cookie conserva identidad; cookie A no autoriza B y cookie guest no autoriza identidad/DM/legado. |
| A7 — Rotación | Dos invitados admitidos conservan exactamente sus credenciales/IDs tras rotar; nuevo join con enlace viejo falla, nuevo funciona. Expiración de invitación no expira invitados por sí sola. Reabrir sí invalida ambos por nueva apertura. |
| A8 — Carreras | Barreras reales join/rotate, join/close, join/reopen, heartbeat/deadline, disable/join, capacidad concurrente y dos rotaciones/reaperturas CAS. Estado final válido y rollback sin participantes/credenciales huérfanos por commit parcial. |
| A9 — Idempotencia | Reintentos iguales no duplican efectos; payload distinto 409; contexto distinto no comparte resultado; replay sin secreto recuperable devuelve metadatos/estado explícito, nunca roto de nuevo. Admisión duplicada con/sin cookie según contrato. |
| A10 — Ambos motores | Misma suite de contrato contra SQLite temporal y PostgreSQL real: migraciones, constraints, clocks/fechas, atomicidad, persistencia/revocación tras reabrir conexión y restart. No skips verdes ni emulación PostgreSQL. |
| A11 — Coste y privacidad | Ráfagas HTTP con IDs/tokens inválidos: 429/capacidad/memoria acotados; errores uniformes no enumeran partidas ni anfitriones. Host/Origin ausente/null/ajeno, cuerpos sobredimensionados/chunked, cookies ambiguas y entradas malformadas rechazados. |
| A12 — Transición | Principal invitado todavía no accede a proyección global ni datos privados 008; contratos para 010 entregados sin fingir SSE ya implementado. Electron local, formato de escena y login legado mantienen pruebas existentes. |
| A13 — Cliente y operación | Módulo de fragmento limpia history antes de fetch/opcionales y no persiste secreto; guía explica perder enlace, nueva rotación, expiración, reconexión frente a reapertura, admisión incierta y restauración segura. |

Comandos de cierre: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`; reutilizar `pnpm db:migrate` y gate `pnpm test:db` de 006 cuando estén entregados. Añadir gate HTTP/invitaciones de ambos motores si el anterior no lo incluye, con nombre real en package.json y guía. No contar mocks como PostgreSQL ni ocultar ausencia de entorno con skip. Si no hay instancia temporal disponible, coordinar preparación en puerto/base exclusivos sin tocar servicios del usuario y registrar bloqueo; no aceptar hasta probarlo.

Pruebas HTTP usan cuentas reales de 007, partidas de 008, dos sesiones DM y al menos tres invitados, cookies independientes y dos conexiones DB. El dominio puro puede usar reloj/CSPRNG inyectados; integración usa primitivas y motores reales. Las carreras deben esperar barreras observables, no sleeps arbitrarios. Al menos un humo del artefacto API compilado demuestra emitir→canjear→rotar→reintentar enlace viejo/nuevo→consultar invitados previos y cierre. No hace falta UI 011 para probar los contratos.

009 no añade formularios visuales, por lo que no exige rediseñar ni repetir la matriz de proyección. Entrega mensajes/estados en español para 011: enlace no disponible, anfitrión reconectando, acceso expirado y salida. La futura entrada debe permitir pegar alias, Enter, Escape/cancelación y errores anunciados sin disparar Delete/Backspace del canvas. Si una integración toca vistas existentes, humo CUA dirigido de foco/teclado y tamaño afectado: 820×520 local, 1024×768/1440×900 servicio y 1920×1080 jugador. No presentar el test de history como prueba visual de esa pantalla pendiente.

Documentar en build versiones de Node/driver/motor, comandos sanitizados, parámetros temporales, conteos sin duplicarlos, fallos corregidos, evidencias propias/reutilizadas, límites y cierre de pools/procesos. Ningún secreto ni dataset personal se incorpora al repositorio. No se ejecutan pruebas en esta fase de especificación.

## Riesgos y condiciones de inicio

- 006–008 aún requieren implementación/revisión. Reconciliar esquema de apertura, composición, revisión e idempotencia reales antes de construir; las diferencias de respuesta con secretos deben documentarse explícitamente, no romper contratos por accidente.
- El lease no es el heartbeat SSE legado. Confundirlos puede rotar enlaces al refrescar o permitir admisión sin DM; probar ventanas exactas y reinicio.
- Una rotación ordinaria debe invalidar solo la invitación. Revocar a todos los participantes en esa operación rompería la regla central y la futura expulsión selectiva de 010.
- Los recursos pertenecen al DM, pero invitados a partida/apertura. Aplicar solo ownerId filtra assets de A2 a A1. 009 no autoriza un puente hacia el catálogo privado.
- Guardar solo hashes impide reconstruir enlaces/tokens perdidos. Se hace explícito el replay sin secreto y la recuperación mediante acción nueva, sin inventar persistencia en claro o criptografía casera.
- No hay garantía de identidad humana: otra persona con enlace vigente puede usar el mismo alias; quien consigue un enlace posterior puede volver como otro participante. 010/011 deben comunicar este límite al expulsar.
- PostgreSQL real y migraciones son requisito de aceptación. El acceso a esos recursos se coordina; su ausencia no rebaja controles ni transforma soporte propuesto en implementado.
