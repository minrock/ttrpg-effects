# Invitaciones y participantes — backend 009

El servicio final integra invitados por partida con cuentas/propiedad y moderación. La pantalla `/jugar/:id` es un shell neutro y usa exclusivamente autoridad invitada; la cuentaDM puede coexistir sin elevar ese namespace. Contratos probados enSQLite/PostgreSQL.

## Apertura y presencia

El propietario DM inicia una apertura y recibe un enlace `/jugar/<gameId>#invitacion=<secreto>`. La partida retiene su SystemRef exacta y su definición publicada incluso si se deshabilita para usos nuevos. Un admin de cuentas no sustituye al propietario. No se aceptan owner, rol, sistema, fechas ni participante elegidos por el cliente.

Heartbeat recomendado cada 10 s. Desde el último contacto aceptado, nueva admisión durante 30 s; entre 30 y 150 s el anfitrión está reconectando: invitados conservan identidad pero no entran nuevos. A los 150 s la apertura expira. Los límites son exclusivos: en 30 s ya hay gracia; en 150 s ya no hay autorización. Heartbeat dentro de plazo reanuda sin rotación; vencido no revive. Reabrir es deliberado: crea generación nueva e invalida acceso anterior. Recargar, una pestaña nueva, SSE o volver a iniciar sesión no deben llamar a reopen.

Se persiste el deadline; reiniciar API exige contacto nuevo antes de admitir y no regala otra gracia. Una sesión patrocinadora revocada impide nuevos ingresos hasta heartbeat de otra sesión válida del mismo propietario. Deshabilitar al propietario cierra durablemente sus aperturas; enable no las resucita. Archivo/eliminación mediante los casos de uso 008 también cierra acceso.

Se mantiene un proceso API por base. La presencia de proceso solo guarda contexto/plazos y se publica después del COMMIT; no sustituye los registros durables. El invitado obtiene un resolver transaccional estrecho (`GuestAuthority.authorized`/`GuestTransaction`), sin repositorios privados ni acceso a mesa global/assets 008.010 deberá comprobar además la pertenencia pública de cada recurso a esa partida antes de enviar bytes.

## Contratos HTTP

Origen/Host exactos. Mutaciones requieren Origin; GET puede omitirlo. JSON estricto, máximo 8192 bytes, timeout de carga vigente, no queries ni campos extra. Respuestas no-store, nosniff, CSP y Referrer-Policy no-referrer. UUID canónico en rutas e Idempotency-Key. If-Match acepta número decimal o entre comillas.

| Ruta relativa a `/api/v1/dm/games/:gameId` | Entrada y resultado |
| --- | --- |
| GET `/opening` | Última apertura (incluye cerrada), revisión, SystemRef, frescura e invitación sin secreto. No renueva presencia. |
| POST `/opening/start` | `{expectedOpening:null}` solo sin historial, o `{expectedOpening:{id,generation,revision}}` de la última apertura. If-Match de partida. Rechaza apertura vigente incluida gracia.201 inicial/200 replay. |
| POST `/opening/reopen` | Misma precondición, no null; If-Match de partida. Cierra anterior y crea nueva generación.201 inicial/200 replay. |
| POST `/opening/heartbeat` | `{openingId,generation}`;200; no requiere Idempotency-Key ni consume el presupuesto durable. |
| POST `/invitation/rotate` | `{openingId,generation,expectedInvitationVersion}`; If-Match de apertura.200. Requiere contacto fresco. |
| POST `/opening/close` | `{openingId,generation}`; If-Match de apertura.204; replay no cierra una apertura posterior. |

Invitación y credencial son secretos independientes de 256 bits. La invitación expira 8 h después de emisión; una rotación aumenta su versión conservando IDs y tokens de invitados existentes. La credencial expira 8 h después de admisión y nunca se renueva por GET. Apertura, estado, cuenta y plazos se validan en cada operación.

Primera ejecución de start/reopen/rotate entrega `secretAvailable:true` e `invitationUrl` solo tras COMMIT. Se guarda hash, jamás enlace recuperable. GET no recupera el enlace. Un replay devuelve metadatos históricos, `replayed:true,secretAvailable:false`, sin URL y sin nueva rotación. Tras perder la respuesta/enlace, consultar estado y rotar explícitamente con clave y precondiciones actuales. Un resultado histórico no implica que esa apertura siga vigente.

| Ruta relativa a `/api/v1/games/:gameId` | Entrada y resultado |
| --- | --- |
| POST `/admission` | `{secret,alias}` + Idempotency-Key.201 con identidad segura y Set-Cookie;200 si la cookie ya prueba la misma identidad. |
| GET `/guest/session` | Recupera identidad/contexto por cookie, sin invitación. Estado `fresh` o `reconnecting`;401 al expirar. |
| POST `/guest/leave` | `{}`;204 y borrado de cookie. Revoca participante y todas sus credenciales; repetición sin credencial no afecta otros invitados. |

Cookie `ttrpg_guest`, HttpOnly, SameSite=Strict, Secure en HTTPS, sin Domain, Path `/api/v1/games/<gameId>/`, duración absoluta 28800 s. Cada path permite otra partida; siempre se verifica su contexto durable. Token únicamente en Set-Cookie, nunca JSON ni storage. Cookies duplicadas se rechazan.

Alias: trim/NFC, 1–40 puntos Unicode, 160 bytes UTF-8, sin controles/formato invisible/bidi/surrogates inválidos. `<`, `>` y comillas permanecen texto: la interfaz los renderiza como texto. Alias repetidos reciben discriminador estable diferente. No identifican a una persona ni permiten recuperar credenciales. Para otro alias hay que salir e ingresar nuevamente.

Idempotencia DM conserva 24 h y presupuesto 008 de 1000 resultados/64 MiB por principal. Contextos incluyen acción, partida y apertura esperada, estables aunque cambie la generación. El resultado durable no guarda secretos. Idempotencia de admisión conserva 24 h, hasta 1000 resultados/1 MiB por apertura, huella del alias normalizado y digest de invitación. Misma clave con contenido diferente:409. Replay con cookie de ese participante devuelve identidad sin emitir otro token ni Set-Cookie, incluso si la invitación ya rotó. Sin cookie y enlace vigente:409 ADMISSION_ALREADY_PROCESSED sin identidad; enlace inválido:401 uniforme. Si se perdió la respuesta antes de instalar la cookie, nueva entrada explícita con clave nueva y enlace vigente crea otro participante y consume cupo; no puede recuperar el anterior por alias o requestId.

Límites: 64 participantes con credencial vigente simultáneamente, 1000 admisiones históricas por apertura; salida/expiración libera cupo activo, nunca el histórico. HTTP cuenta incluso fallos/replay: 10 intentos/minuto/IP y 60/minuto/partida. Mapa máximo 10000 claves; saturación rechaza con 429, no desaloja claves para permitir evasión. Handler acota 64 solicitudes simultáneas; servidor conserva límites globales 100 conexiones y timeout vigente. Se usa IP del socket; no se confía en X-Forwarded-For. 429 incluye Retry-After; presupuestos durables incluyen retryAt. Los parámetros están centralizados en el handler/repositorio; ajustarlos exige medir y mantener autenticación, cuota y reserva transaccional.

## Estados del cliente

- «El enlace no está disponible. Solicita uno vigente al DM»:401 uniforme para secreto incorrecto/rotado/expirado, partida inexistente/no disponible o apertura inválida.
- «El anfitrión está reconectando. Intenta entrar cuando regrese»:409 únicamente después de verificar invitación.
- «El acceso expiró o ya no está disponible. Solicita un enlace vigente al DM»:cookie sin autoridad.
- Salida confirmada:204 y cookie borrada. Un fallo de DB no anuncia salida confirmada.

`src/web/invitation-fragment.ts` captura una sola vez y limpia history sincrónicamente antes de fetch/carga opcional. Solo memoria hasta consumir/cancelar, sin storage/analytics/terceros.El cliente lo ejecuta al entrar y usa no-referrer, pegado de alias, Enter, Escape/cancelación y errores anunciados. La verificación visual se registra separada de las pruebas instrumentadas.

## Migración, restauración y verificación

Usar Node 24 y pnpm. `pnpm build:api` genera API, módulo backend aislado para pruebas y comandos. `pnpm db:migrate` aplica migración 5 posterior a 1–4 sin cambiar checksums. Una apertura 008 existente queda sin invitación; debe recibir heartbeat válido y rotate con versión esperada0 o una reapertura explícita. No se emite secretamente al leer.

Restart ordinario conserva plazos/revocaciones. Restaurar una copia integral es distinto: puede contener acceso antiguo. Mantener API detenida, configurar únicamente el destino restaurado, ejecutar `pnpm invitations:invalidate`, comprobar éxito, y solo entonces iniciar API. La operación transaccional cierra todas las aperturas y revoca participantes/credenciales del destino. No elimina contenido ni cambia identidades DM. Si falla, mantener API detenida y revisar configuración/migraciones. El gate final incluye pg_dump/pg_restore real, invalidación de invitados y rotación deliberada del secreto de identidad;009 conserva sus pruebas de copiaSQLite y clonPG. Backups y hashes siguen siendo datos privados.

La transferencia funcional 008 v3 y lectores v1/v2 excluyen apertura/invitación/credencial; importar contenido empieza sin invitados. No se cambia `.ttrpgscene` v2 ni Electron local.

Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`, `pnpm test:db`, `pnpm test:identity`, `pnpm test:owned`, `pnpm test:invitations`. Los cuatro gates de contratos requieren `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE` de PostgreSQL temporal real con TLS; ausencia de entorno falla, nunca skip verde. Test 009 usa ambos motores, fixtures sin datos personales, cuentas reales, barreras transaccionales, cuotas/HTTP y artefacto API compilado. Cerrar pools/servidores y limpiar solamente fixtures propias; no ejecutar contra datos operativos ni registrar URL/cookies/secretos.
