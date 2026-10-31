# Identidad de cuentas (007, versión 3.9.0)

Cuentas administrador/DM con Better Auth1.7.14 y Kysely0.29.7, Node24 y driversSQLite/PostgreSQL. El servicio final usa identidad obligatoria y pantallas compartidas con Electron servicio. No existe acceso por claves globales.

## Preparación y operación local

Conserva `.env` privado0600 y `TTRPG_AUTH_SECRET` aleatorio independiente. Setup genera el secreto solo en una configuración nueva; no modifica secretos existentes. `TTRPG_IDENTITY_ENABLED` ausente/true exige identidad; false aborta con instrucciones de actualización. Nunca publicar secretos en VITE/Electron/logs.

1. Detén el servicio para migrar/provisionar en SQLite y para recuperar al administrador en ambos motores.
2. Ejecuta `pnpm build:api` y `pnpm db:migrate`. La migración 2 crea identidad en `control.sqlite` o la base PostgreSQL seleccionada, sin tocar las bases legadas. Los comandos de identidad verifican la migración; no la aplican implícitamente ni crean una DB SQLite ausente.
3. Ejecuta `pnpm identity:bootstrap`. Solicita email, nombre y contraseña con confirmación oculta. Solo puede crear el primer administrador en una base sin cuentas. El control se serializa dentro del motor y hay un índice único de administrador.
4. Ejecuta `pnpm identity:password` para cambiar la contraseña temporal. Solicita email, contraseña actual y nueva con confirmación. Revoca todas las sesiones. Este comando funciona también para un DM.
5. Ejecuta `pnpm identity:provision-dm`. Autentica al administrador, solicita datos/contraseña temporal del DM y revoca su sesión de operación incluso ante un error/cancelación. No funciona con contraseña administrativa temporal: completa el paso 4. Entrega la contraseña al destinatario por un canal privado; no se envía ni verifica correo.
6. Arranca `pnpm start:api` tras migrar/provisionar. El listener compone cuentas, datos porDM, invitados y mesas contextuales sin ServiceStore legado.

Los cuatro comandos son interactivos y exigen TTY. No admiten contraseñas por argumentos, pipes ni variables de provisión. Ctrl+C, Ctrl+D o Escape cancelan y restauran la terminal. Nunca se imprime una contraseña ni su hash; el éxito de alta muestra únicamente ID e instrucciones. No pongas contraseñas en curl, URL, historial o scripts. La UI también ofrece cambio propio con revocación de sesiones.

Para una contraseña administrativa perdida, detén el servicio y ejecuta `pnpm identity:recover-admin`. Selecciona el administrador existente por email, escribe `RECUPERAR`, y define la contraseña temporal dos veces. No crea cuentas, no promueve DMs ni cambia email/rol; revoca todas las sesiones. Después ejecuta `identity:password`. Esta capacidad confía en el operador con acceso local a configuración/DB, equivalente a poder administrar esa base; no existe endpoint HTTP de recuperación.

## HTTP de identidad

Prefijo `/api/v1/identity`. JSON cerrado, máximo **8192 bytes** incluso con transferencia chunked. Todas las mutaciones requieren `Origin` exacto y el Host configurado; HTTP solo loopback, HTTPS remoto. No se confía en X-Forwarded-* ni se configura CORS. El peer para cuotas es la IP TCP; tras proxy es la IP del proxy y la cuota se comparte, sin prometer identificación del cliente por una cabecera no fiable.

| Método/ruta | Operación |
| --- | --- |
| POST `/login` | `{email,password}`; cookie y DTO de identidad. Sin rol solicitado. |
| GET `/session` | Cuenta propia, ID de sesión y vencimiento; nunca token/hash/IP. |
| POST `/logout` | `{}`; idempotente, revoca la sesión, elimina cookie, 204. |
| POST `/logout-all` | `{}`; revoca todas las sesiones propias, 204. |
| POST `/password` | `{currentPassword,newPassword}`; cambia, elimina obligación temporal y revoca todas las sesiones, 204. |
| POST `/admin/dms` | `{email,name,password}`; administrador activo crea exclusivamente DM temporal, 201 y DTO; sin cookie del DM. |
| GET `/admin/dms` | `limit` 1–100 (50 por defecto), `offset` entero >=0; orden estable por ID ascendente, total y DTOs. |
| POST `/admin/dms/:id/disable` | `{}`; deshabilita y revoca todas las sesiones, 204. |
| POST `/admin/dms/:id/enable` | `{}`; habilita sin resucitar sesiones, 204. |
| POST `/admin/dms/:id/password` | `{password}`; restablece temporal y revoca sesiones, 204. |
| POST `/admin/dms/:id/revoke-sessions` | `{}`; revoca todas las sesiones, 204. |

Anónimo/credencial legada: 401. DM que intenta administrar: 403. Contraseña temporal: 403 `PASSWORD_CHANGE_REQUIRED` para operaciones funcionales/administrativas; permite sesión/logout/cambio propio. ID DM inexistente o ID administrador en rutas DM: 404. Entrada inválida: 400; email duplicado para admin: 409; tamaño: 413; cuota: 429 con Retry-After; fallo de almacenamiento: 503 sanitizado. Todas las respuestas son no-store. Un fallo DB no anuncia logout confirmado. Incorrecta/inexistente/deshabilitada comparten 401 y mensaje genérico.

No se monta el handler catch-all de Better Auth. Registro, recuperación pública, email/rol, impersonación, OAuth y plugins de administración están inaccesibles. El administrador solo administra cuentas, sin autoridad implícita sobre recursos de DMs. Las cookies combinadas se interpretan por familia: la cookie nueva no autoriza escenas/assets/resolve/bibliotecas/plantillas/enlaces/mesa/dados/SSE globales; la legada no autoriza identidad. Logout de una familia no altera la otra.

## Credenciales, sesiones y atomicidad

Email canónico: trim exterior y lowercase Unicode de JavaScript, seguido por validación `z.email()` de Zod; hasta 254 caracteres, sin quitar puntos ni sufijos +. La validación admite direcciones ASCII (dominios internacionales mediante su forma punycode), no SMTPUTF8. El nombre admite 1–100 puntos de código Unicode, sin controles. Ambas bases almacenan exactamente el mismo email canónico y aplican índice único.

Contraseña: 15–128 puntos de código, máximo 512 bytes UTF-8, sin recorte, normalización ni reglas de composición; surrogates aislados se rechazan. El default de Better Auth 1.7.14 usa scrypt N=16384/r=16 y NFKC; **no se utiliza**. Su interfaz soportada `emailAndPassword.password` recibe scrypt asíncrono de Node con **N=131072,r=8,p=1**, clave64 bytes, sal16 bytes aleatoria, maxmem160MiB. Formato versionado `scrypt$v1$131072$8$1$<sal hex>$<clave hex>`; verificación mediante timingSafeEqual de Node. Solo se acepta esta versión/estos parámetros, sin coste arbitrario leído desde hashes corruptos. No existían credenciales007 previas que migrar. Un hash corrupto/inexistente ejecuta KDF ficticio de igual coste y falla cerrado.

Máximo dos trabajos KDF por proceso, sin cola; memoria presupuestada por llamada160MiB, más overhead. Login limita 10/minuto/peer, 5/minuto/identificador canónico y120/minuto global por composición; mapas acotados y claves de identificador SHA-256, sin logs de email. El adaptador HTTP añade cuotas antes de las demás operaciones de hash. El despliegue previsto tiene una composición HTTP por proceso. Son cuotas locales, sin coordinación horizontal; las dos composiciones de pruebas no prueban cuotas distribuidas. Health/logout no consumen KDF y permanecen disponibles durante saturación. No hay bloqueo permanente de cuenta.

Better Auth administra usuarios, cuentas de credencial y sesiones mediante su adaptador oficial Kysely. El puente de Kysely usa la conexión/driver006 dentro de una transacción externa, sin segundo almacén ni migrador automático. La validación automática de esquema de biblioteca está desactivada porque la autoridad es verifySchema/migraciones006; no se desactivan controles de Origin/CSRF. La integración usa las operaciones tipadas de `$context.internalAdapter` de la versión fijada para provisión/creación/revocación, y `auth.api.getSession` para verificar cookies firmadas. Requiere reevaluar esos contratos antes de actualizar Better Auth.

Cookie única `ttrpg_identity.session_token` en HTTP loopback, `__Secure-ttrpg_identity.session_token` en HTTPS: HttpOnly, SameSite=Strict, Secure en HTTPS, Path=/api/v1, sin Domain, Max-Age28800. Firma de cookie mediante `better-auth/crypto.makeSignature`, verificada por Better Auth. No se emiten cookies auxiliares de cache, OAuth, remember-me o cuenta; ningún token va en JSON/localStorage. Expiración absoluta8 horas, sin renovación, cache ni almacenamiento secundario. Las sesiones sobreviven reinicio de proceso; cambiar el secreto revoca persistentemente todas las sesiones al abrir identidad. Una huella SHA-256 privada del secreto detecta el cambio dentro del bloqueo transaccional; composiciones aún abiertas con el secreto anterior fallan cerradas hasta reiniciarlas. No hay fallback a claves anteriores. El token impuesto nunca se conserva.

Lecturas y mutaciones de identidad usan el mismo bloqueo transaccional: BEGIN IMMEDIATE en SQLite y advisory xact lock783496102 en PostgreSQL. El KDF ocurre fuera de ese bloqueo. Antes de crear sesión o modificar datos se vuelve a leer la credencial, una revisión persistente de autorización y el principal; reset/disable/logout concurrentes invalidan el trabajo en vuelo. La revisión también impide que un disable seguido de enable vuelva útil un login que comenzó antes. Auditoría persistente transaccional de operaciones confirmadas: ID, actor, destino, acción, fecha y resultado success. No almacena contraseña, cookie, token, IP, SQL ni intentos fallidos con emails. Revocación y estado se confirman juntos o se revierten juntos.

SQLite mantiene la exclusión física006 de un único proceso. Dos composiciones en ese proceso comparten explícitamente conexión, cola y leases; la última cierra, sin abrir una DB implícita distinta. PostgreSQL usa pools independientes y bloqueo transaccional compartido. No se promete multiworker distribuido. La unidad de trabajo evita aceptar caches obsoletas.

`IdentityService.authorized(cookie, role, callback)` es la frontera para008: valida cuenta/sesión activa y contraseña cambiada dentro de la misma transacción que proporciona los repositorios006 al callback. Esos repositorios caducan al salir, se observan errores de operaciones pendientes y el fallo revierte todo. El consumidor debe derivar ownerId del principal y terminar el callback; no debe llamar otra operación raíz/abrir otra transacción dentro ni hacer trabajo de red largo. No existe aún propiedad/autorización de recursos008 en esta entrega.

## Respaldo, validación y límites

Respalda la base de control completa y su versión de migraciones junto con el secreto de identidad, por canales privados separados de datos públicos. SQLite: servicio detenido y archivo físico íntegro; PostgreSQL: procedimiento pg_dump/restore de [database.md](database.md). Preservar solo la DB sin secreto invalida cookies; restaurar una copia antigua podría restaurar sesiones revocadas: rota el secreto y recupera/cambia credenciales después de una restauración. Esta entrega prueba persistencia/reapertura y rollback, no certifica backup/restore operativo.

`pnpm build:api`, luego `pnpm test:identity` con `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE` de PostgreSQL temporal TLS. El gate exige ambos motores reales y falla si faltan variables. Crea/retira bases UUID y directorios propios; no cargar `.env` personal. Incluye CLI compilado controlado por PTY (Python3 para arnés de pruebas), sin eco y cancelación; no expone modo CLI inseguro. `pnpm test:db` conserva los contratos006 con migración2.

Las fuentes oficiales consultadas: [Email/password](https://better-auth.com/docs/authentication/email-password), [SQLite](https://better-auth.com/docs/adapters/sqlite). Los parámetros/API se verifican también contra el código instalado1.7.14 y pruebas, no solo la documentación cambiante. No hay SMTP, verificación por email, UI nueva, MFA, mesa multipropietario, invitaciones o SSE por partida en007. Las pruebas visuales previas del frontend/Electron siguen atribuidas a001–006; no se presenta un render automatizado como nueva inspección manual.
