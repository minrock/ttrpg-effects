# 007 — Cuentas de administrador y DM con Better Auth

## Estado, objetivo y autorización

Especificación propuesta, ciclo 1, 2026-10-29. No acredita implementación, dependencias instaladas ni pruebas ejecutadas. Incorporar identidad persistente de administrador/DM, contraseñas y sesiones revocables mediante Better Auth, con SQLite local y PostgreSQL para producción. Solo el administrador da de alta DMs. La identidad nueva no concede acceso a la mesa global legada.

Rigen [solicitud](solicitud.md), [decisiones comunes](../../autenticacion-partidas.md) y [AGENTS.md](../../../AGENTS.md). Contexto obtenido exclusivamente de archivos del worktree `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; no leer ni modificar credenciales, perfiles o servicios del repositorio original. Esta entrega escribe únicamente esta spec. Construcción posterior solo tras aprobación técnica de 006 y orden del orquestador, quien resolverá rama/checkout `feature/factory-007-cuentas-dm`; no modificar Git ahora. Sin staging, commits, push, merge, despliegue ni DMG.

La base inspeccionada declara 3.7.0. [006](../006-persistencia-multidb/solicitud.md) propone 3.8.0, pero al redactar este documento solo existía su solicitud: no había spec, build, contrato de infraestructura ni decisión. El cierre previsto de 007 será 3.9.0 si 006 termina en 3.8.0; comprobar la versión real antes de construir, aplicar un único bump minor y changelog fechado en español. Formato `.ttrpgscene` v2 sin cambio.

## Base real y reutilización

- [001](../001-contrato-clientes/spec.md), [002](../002-api-privada/spec.md), [003](../003-cliente-navegador/spec.md), [004](../004-mesa-sincronizada/spec.md) y [005](../005-electron-servicio/spec.md) tienen decisiones técnicas APROBAR. Sus documentos describen el cliente común, servicio HTTP, frontend y mesa única con aislamiento Electron; no son una implementación multiusuario.
- `src/server/auth.ts` mantiene dos claves globales y sesiones en memoria. `src/shared/contracts/http-api.ts` define `ServiceRole = dm | player` sin identidad propietaria. No ampliar ese tipo ni reutilizar esa cookie para identificar cuentas.
- `src/server/http.ts` compone incondicionalmente `ServiceStore`, `Auth` y una mesa; valida Host/Origin, límites y errores, y revalida sesión tras lecturas asíncronas. Reutilizar esos controles mediante composición explícita sin convertir el rol de cuenta en autorización del router legado.
- `src/server/table-http.ts` posee una `TableSession` por API. No conectarla a Better Auth ni transformar sus streams en multipropietario aquí.
- `src/infrastructure/server/service-store.ts` usa SQLite global y bibliotecas auxiliares. `src/infrastructure/server/database` todavía no existe en la base inspeccionada: es destino propuesto por 006, no API disponible.
- `src/web/ServiceApp.tsx` y `src/infrastructure/browser/http.ts` utilizan el login legado. Permanecen hasta 011; no presentar un login de cuentas que entre al VTT global.
- Reutilizar `.env.example`, `scripts/setup-env.sh`, `src/server/config.ts`, contratos de errores y comandos existentes. Los secretos del servidor no pasan a `.env.electron`, `VITE_*`, preload o bundles web.
- Mantener las garantías y documentación de [API privada](../../../docs/private-api.md), [operación](../../../docs/service-operations.md) y [mesa sincronizada](../../../docs/synchronized-table.md), distinguiendo identidad nueva y autenticación legada.

## Alcance y exclusiones

Incluye integración Better Auth del lado servidor, frontera de aplicación para identidad, adaptadores/migraciones reales de ambos motores, login/logout/consulta de sesión, cambio de contraseña, revocación, estado deshabilitado, altas y recuperación administrativa, bootstrap local seguro y documentación operativa. Los nombres de puertos de 006 se resolverán con su entrega aprobada; esta spec no los inventa.

No incluye UI completa de login o panel de administración, registro público, SMTP, verificación de email por correo, OAuth, MFA, organizaciones, impersonación, ascenso libre de roles, creación de administradores por HTTP, eliminación de cuentas, catálogo/propiedad de partidas, invitaciones de jugador, expulsión, SSE por partida o migración automática de los datos legados. Esas capacidades corresponden a 008–011. Un administrador de cuentas tampoco recibe acceso implícito a escenas ajenas.

## Integración y contrato de identidad

Better Auth administra credenciales y sesiones. Un servicio de aplicación expone las operaciones necesarias a HTTP/CLI y entrega un principal mínimo tipado: ID de cuenta, rol `admin | dm`, estado habilitado, exigencia de cambiar contraseña y vencimiento/identidad de sesión. El dominio no importa Better Auth, drivers ni SQL; nunca recibe hashes o tokens completos. No duplicar un almacén casero de credenciales/sesiones paralelo a la biblioteca.

Confirmar y fijar versión de Better Auth al construir. El documento común registra 1.7.14 como versión consultada, no como dependencia instalada. Leer la documentación y código de la versión elegida para verificar adaptadores, API servidor, hash y opciones de sesión; registrar compatibilidad Node 24, migraciones y dependencias añadidas. No asumir que nombres de opciones o defaults son seguros porque existan en otra versión. Un plugin administrativo solo puede usarse si se restringen todas sus capacidades no autorizadas; preferir un conjunto explícito de operaciones servidor.

Las siguientes rutas son **contrato propuesto de 007**, independiente de nombres internos de Better Auth y del contrato pendiente de 006. Prefijo `/api/v1/identity`; no montar un catch-all que publique automáticamente todos los endpoints de la biblioteca.

| Operación | Acceso y resultado observable |
| --- | --- |
| POST `/login` | Email/contraseña; establece solo cookie de identidad y devuelve DTO seguro de cuenta/sesión. Sin selección de rol ni aceptación de campos de privilegios. Credencial incorrecta, cuenta inexistente o deshabilitada: mismo 401 y mensaje genérico. |
| GET `/session` | Sesión válida: DTO mínimo propio. Sin sesión, caducada o revocada: 401. No devuelve token, hash, direcciones IP de sesiones ni datos de terceros. |
| POST `/logout` | Idempotente: revoca la sesión presentada, borra cookie con atributos coherentes y devuelve 204. Fallo de almacenamiento no se anuncia como cierre confirmado. |
| POST `/logout-all` | Cuenta activa: revoca todas sus sesiones, incluida la actual; 204 y cookie eliminada. |
| POST `/password` | Cuenta activa, contraseña actual y nueva; valida y actualiza usando Better Auth, revoca todas sus sesiones y exige nuevo login. Un fallo deja credencial anterior y sesiones coherentes. |
| POST `/admin/dms` | Administrador activo: email, nombre y contraseña inicial, crea exclusivamente rol DM con cambio obligatorio de contraseña; 201 con ID y DTO público. No inicia sesión ni emite cookie del DM al administrador. |
| GET `/admin/dms` | Administrador activo: lista paginada de DMs con ID, email, nombre, estado y fechas; sin hashes/contraseñas/tokens. `limit` 1–100 y orden estable. |
| POST `/admin/dms/:id/disable` | Administrador activo: deshabilita DM y revoca todas sus sesiones antes de confirmar 204; idempotente para DM ya deshabilitado. |
| POST `/admin/dms/:id/enable` | Administrador activo: habilita DM; no resucita sesiones revocadas. |
| POST `/admin/dms/:id/password` | Administrador activo: restablece contraseña temporal, marca cambio obligatorio y revoca todas las sesiones del DM; no muestra la contraseña en respuesta. |
| POST `/admin/dms/:id/revoke-sessions` | Administrador activo: invalida todas las sesiones del DM, sin cambiar su contraseña; 204. |

Las rutas administrativas rechazan anónimo/legado con 401 y DM con 403, antes de procesar cuerpos costosos. ID inexistente devuelve 404 al administrador; un ID de administrador no puede modificarse mediante rutas DM. Rechazar campos extra, roles, flags de email verificado, estado o IDs elegidos por el solicitante. No hay endpoint de registro, invitación de cuentas, restablecimiento público ni cambio de email/rol en 007. Probar también las rutas estándar de registro y administrativas de Better Auth aunque no aparezcan en la UI: no deben crear cuentas ni elevar permisos.

El DTO compartido nuevo no reutiliza `SessionDto` legado. Errores serializables en español, status/códigos documentados y `no-store`; ninguna respuesta contiene contraseña, hash, token de sesión, configuración privada, SQL o stack. Los detalles de conflicto de email se permiten únicamente a administrador autenticado.

## Cuentas, contraseñas y administración

- ID opaco estable generado por el servidor; email canónico único mediante una política explícita e idéntica en ambos motores: trim de espacios exteriores y comparación sin distinción de mayúsculas. No aplicar reglas específicas de proveedores como quitar puntos o sufijos `+`. Validar email de hasta 254 caracteres y nombre visible de 1–100, sin controles; probar Unicode/collation, duplicados y carreras.
- Roles cerrados `admin | dm`; estado habilitado/deshabilitado y marca de cambio obligatorio persistentes. Email no verificado por defecto; no escribir `emailVerified=true` para saltar un flujo. No prometer entrega o verificación de correo.
- Política propuesta: 15–128 caracteres Unicode de contraseña y límite 512 bytes UTF-8, sin truncar, recortar espacios, normalizar silenciosamente ni exigir composición arbitraria de símbolos. Admitir passphrases y pegado. Rechazar antes de hash los valores fuera de límites; no registrar ni devolver su contenido.
- Usar hash de contraseña estándar mantenido, con sal aleatoria por credencial y parámetros/versión recuperables. Preferencia Argon2id; scrypt estándar de Node es alternativa admitida por el acuerdo común. Como presupuesto mínimo de esta entrega: Argon2id con memoria 19 MiB, 2 iteraciones y paralelismo 1, o scrypt con N=131072, r=8, p=1 y memoria permitida suficiente. Confirmar parámetros **efectivos** en la versión elegida y medir coste real. Si un default de Better Auth es inferior, configurar su mecanismo soportado de hash/verificación; no inventar primitivas o comparaciones ad hoc. Versionar/verificar credenciales anteriores si se cambian parámetros; un hash corrupto falla cerrado sin caída del servicio.
- Contraseñas iniciales/restablecidas son temporales. Login permite una sesión limitada a consulta de identidad, logout y cambio de contraseña hasta completar el cambio; no permite administrar cuentas ni obtener permisos funcionales futuros. La contraseña actual se exige para el cambio propio, también si era temporal. Revocar sesiones anteriores al reset, al cambio y al deshabilitar. Rehabilitar no restaura ninguna sesión vieja.
- Bootstrap puede crear un único primer administrador; no se crean administradores adicionales por este contrato. El propio administrador cambia su contraseña por el flujo autenticado. Recuperación de ese administrador perdido se hace mediante operación local explícita sobre su cuenta existente, con la misma política de hash/revocación; no promueve un DM ni abre registro web.

## Bootstrap y provisión operativa

Añadir comandos reales `pnpm identity:bootstrap`, `pnpm identity:provision-dm` y `pnpm identity:recover-admin`, documentados y probados. Son nombres nuevos propuestos para 007, todavía inexistentes.

- `identity:bootstrap` ejecuta localmente contra la DB configurada, sin servidor HTTP ni servicios globales de escena. Solicita email/nombre y contraseña con confirmación en TTY sin eco. Crea el primer administrador solo si no existe ninguna cuenta; una base no vacía se rechaza sin modificarla. Dos ejecuciones concurrentes no pueden crear dos administradores: comprobación y creación requieren serialización/transacción del motor, no un conteo seguido de inserción independiente.
- `identity:provision-dm` solicita credenciales de administrador sin eco y usa los mismos casos de uso/controles de las rutas administrativas; no permite dar de alta un DM solo por poseer la URL o ejecutar el CLI. La sesión temporal que cree para la operación se revoca al terminar. Solicita nueva contraseña DM sin eco; no la imprime. La entrega de esa contraseña fuera de banda es responsabilidad del administrador; no se envía correo ni se promete que el destinatario haya accedido.
- `identity:recover-admin` es una capacidad local del operador con acceso a la DB/configuración, ejecutada con el servicio detenido: selecciona la cuenta administrativa existente por identificador/email y confirma explícitamente el restablecimiento. No crea otra cuenta ni cambia roles; actualiza credencial y revoca todas sus sesiones. Documentar este límite de confianza local, equivalente a poder administrar la base. No publicar la operación por HTTP.
- No aceptar contraseñas como argumentos, URL, historial o variables de entorno de provisión. Cancelación/EOF/interrupción de terminal no deja cuenta parcial, contraseña en salida ni terminal con eco alterado. En tests se puede inyectar un lector de secretos; no publicar un modo inseguro que omita autenticación.
- CLI informa éxito/fallo y ID de cuenta sin secretos. Manejar DB ausente, migraciones pendientes, duplicado y límites con errores útiles. No ejecutar migraciones destructivas implícitas al arrancar un CLI.

## Sesiones, cookies y revocación

Cookie de identidad con nombre/prefijo propio, distinta de `ttrpg_session` y de futuras cookies de participante. `HttpOnly`, `SameSite=Strict`, sin Domain, `Secure` con HTTPS, ruta apropiada para futuros endpoints de identidad/partidas (propuesta `/api/v1`). Todas las cookies auxiliares de Better Auth deben documentarse y mantener atributos coherentes. El path no sustituye la comprobación del principal en cada endpoint.

Caducidad absoluta propuesta de 8 horas en servidor; desactivar renovación indefinida/remember-me y caches de cookie o memoria que permitan aceptar una sesión revocada. La cuenta y sesión se comprueban contra persistencia autorizativa en cada operación protegida. Login genera/rota sesión mediante Better Auth; un token impuesto previamente no se conserva. No devolver credenciales de sesión en JSON ni almacenarlas en localStorage. Si una API interna devuelve un token, el adaptador HTTP lo elimina del DTO y lo usa solo para Set-Cookie.

Las sesiones nuevas se persisten mediante Better Auth; un reinicio puede conservarlas hasta su vencimiento con secreto/configuración iguales, a diferencia de las sesiones legadas en memoria. Documentar y probar ese comportamiento. Añadir `TTRPG_AUTH_SECRET` aleatorio de al menos 32 bytes, explícito y privado, sin default conocido; derivar URL/base de auth del origen público validado, sin autodetección por cabeceras no confiables. Rotación de secreto requiere revocación de sesiones y una prueba de cookie antigua rechazada; no mantener secretos viejos como fallback silencioso.

Logout, logout-all, cambio/reset de contraseña y disable invalidan la autorización antes de devolver éxito. Otra instancia conectada a la misma DB tampoco acepta una sesión antigua. Revalidar sesión/estado al confirmar mutaciones que hayan esperado cuerpo, hash o DB: un login en vuelo no puede crear una sesión útil tras deshabilitar/resetear la cuenta; una petición administrativa en vuelo no puede confirmar después de revocarse su autorización. Usar transacciones y orden de bloqueos acordes al motor; las carreras deben tener pruebas con barreras deterministas. Los futuros SSE de 008–010 consumirán esta revocación, pero no se inventa su implementación en 007.

## Defensa HTTP y coste

Conservar Host/Origin exactos, HTTPS fuera de loopback y la política real de proxy de la API. Toda mutación de identidad, incluido login/logout, exige Origin válido; no CORS comodín ni confiar automáticamente en X-Forwarded-*. No desactivar controles CSRF de Better Auth para hacer funcionar el adaptador. Admitir solo JSON válido con DTO cerrado y tamaño máximo 8 KiB en operaciones de credenciales, contado también en chunked; conservar timeout de cuerpo y cabeceras acotadas.

Aplicar límites antes de cualquier hash: por IP del par confiable, por identificador canónico y global; admitir como máximo 2 trabajos de hash simultáneos por proceso y cola acotada (preferible rechazo 429), liberando cupos al fallar/cancelar. La cuota de identificador usa una clave derivada que no filtre email en logs y no provoca bloqueo permanente de cuenta. Límites iniciales propuestos: 10 intentos/minuto/IP y 5/minuto/identificador, con contador global/capacidad de 2 hashes. Documentar alcance por proceso y cuota compartida bajo proxy; no afirmar defensa horizontal no implementada.

Cuenta inexistente/contraseña errónea/deshabilitada deben tener respuesta genérica y recorrido criptográfico comparable bajo los mismos límites, evitando enumeración trivial. Medir tiempos como evidencia diagnóstica, no imponer una igualdad de milisegundos frágil. Pruebas de saturación comprueban cupos/memoria acotados y disponibilidad de health/logout, no solo que exista una constante. Auditoría mínima persistente de bootstrap/alta/reset/disable/enable/revocación con actor, destino, acción, fecha y resultado, sin contraseñas/tokens/cookies; auditar también los límites de privacidad de los logs.

## Persistencia y transición de despliegue

Consumir la composición, conexión/transacciones y runner de migraciones aprobados de 006, sin imponer ahora nombres de interfaces o firmas inexistentes. Adaptadores SQLite/PostgreSQL oficiales o soportados por Better Auth, encapsulados en infraestructura. Si necesitan otra dependencia (por ejemplo un driver SQLite específico), justificarla, fijar su versión/compatibilidad y no abrir una segunda DB implícita ajena al driver seleccionado.

Esquema de identidad/credenciales/sesiones y estado administrativo en tablas propias con migraciones versionadas por motor. Generar/revisar DDL correspondiente a la versión fijada y aplicarlo mediante la autoridad de migraciones de 006 (`pnpm db:migrate`, previsto allí); no ejecutar simultáneamente un migrador automático de biblioteca al iniciar la API. Rollback de transacciones reales y unicidad/normalización equivalentes; sin SQL en React/dominio. No vincular todavía cuentas con metadatos de catálogo 006 sin el contrato de 008 ni asignar propietario legado automáticamente.

Reutilizar `TTRPG_DB_DRIVER`, `TTRPG_DATABASE_URL` y `TTRPG_DEPLOYMENT` según 006. PostgreSQL real obligatorio para aceptación, sin fallback SQLite ni TLS sin verificar. Ningún dato funcional de identidad en PostgreSQL depende de archivos SQLite locales. Migraciones no alteran las tres bases legadas, documentos de escena ni perfil Electron.

Introducir activación transitoria explícita `TTRPG_IDENTITY_ENABLED=false` por defecto; habilitar exige DB migrada y secreto válido. El frontend y login legado permanecen iguales hasta 011. Configuración/env existente se preserva sin sobrescribir secretos; los ejemplos contienen placeholders y el generador puede añadir un secreto nuevo únicamente si falta, con permisos privados, nunca mostrarlo ni activarlo por sorpresa.

**Barrera obligatoria:** montar rutas de identidad antes del guard legado, con su propia autenticación; mantener disjuntos ambos principales. Cookie nueva sola, incluso admin, no autoriza ninguna ruta global de escenas/assets/bibliotecas/plantillas/enlaces/mesa/dados/SSE. Cookie legada sola no autoriza identidad. Con ambas cookies presentes, cada familia usa únicamente su credencial correspondiente; logout de una no elimina o eleva la otra. No convertir `role=dm` de Better Auth en `ServiceRole` ni crear una cookie legada como efecto del login nuevo.

El servicio completo en producción continúa rechazando el arranque mientras existan rutas legadas incompatibles con PostgreSQL conforme a 006. Probar identidad PostgreSQL con CLI y composición HTTP aislada de pruebas que no instancia ServiceStore; ese arnés no es un nuevo modo de producción ni una entrega del VTT multiusuario. 008/011 cerrarán aislamiento/almacenamiento/corte. No retirar claves legadas ni modificar permisos de sus clientes aquí.

## Aceptación y pruebas

| Criterio | Evidencia requerida |
| --- | --- |
| Dependencia y composición | Decisión APROBAR y contrato final 006 leídos antes de construir; integración usa driver/migraciones aprobados. Modo desactivado preserva servicio anterior; activación inválida falla sin crear archivos/DB inesperados. |
| Bootstrap/provisión | TTY sin eco, cancelación limpia, password ausente de argv/logs; bootstrap repetido rechazado y carrera de dos procesos crea exactamente un administrador. DM/anónimo no pueden crear usuarios ni autoelevarse, incluida invocación directa de rutas internas de biblioteca. |
| Contraseñas | Inspección de hashes persistidos, sales distintas para la misma contraseña, parámetros efectivos, límites sin truncamiento, verificación correcta/incorrecta/corrupción, cambio/reset y credencial anterior rechazada. Sin secretos en respuesta ni logs. |
| Roles/estado | DTOs mínimos, email canónico único con carrera real, admin crea solo DM; DM no lista/administra otras cuentas. Contraseña temporal limita operaciones. Disable/reset y revocaciones no dejan sesiones utilizables; enable no las restaura. |
| Sesiones y CSRF | Login rota token, cookie correcta HTTP loopback/HTTPS, fijación rechazada, expiración absoluta, logout-all, restart documentado, secreto rotado; Origin ausente/null/ajeno y Host distinto rechazados. Pruebas con dos instancias contra misma DB demuestran revocación sin cache obsoleta. |
| Concurrencia | Login detenido durante hash frente a disable/reset; mutación administrativa detenida durante cuerpo frente a logout/revocación; tras confirmación de la revocación no hay nueva sesión útil ni escritura tardía no autorizada. Rollback real no deja cuenta/credencial/estado parcial. |
| Frontera legada | Matriz anónimo, DM/admin nuevos, DM/jugador legados y cookies combinadas sobre cada familia global y de identidad. GET/HEAD/assets/resolve, SSE, dados y mutaciones incluidos; cero bytes privados con credencial nueva sola. |
| Multi-DB real | Mismo contrato de cuentas/sesiones/revocación/migración/rollback ejecutado contra SQLite temporal y PostgreSQL real temporal; migración desde vacío, segunda ejecución idempotente y reinicio conservan identidad. No mocks/SQLite como sustituto de PostgreSQL ni skips verdes. |
| Coste/errores | Ráfaga real de logins válidos/erróneos/inexistentes sobre implementación de hash: cuota, 429 y cupos medidos, health/logout responden; entradas malformadas y fallo DB no filtran SQL, secretos ni crean sesiones. |
| Compatibilidad/operación | Formato v2/migración v1 intactos, Electron local y cliente servicio legado conservados. Guía enlazada especifica provisión, recuperación, revocación, backup de identidad y secreto separado, diferencias frente a sesiones legadas y corte pendiente 011. |

Comandos comunes obligatorios: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`. Añadir scripts documentados de contrato de identidad por driver y CLI; al construir sus nombres exactos deben existir en package.json. Ejecutar ambos motores con DBs temporales exclusivas. Si falta PostgreSQL, intentar instancia local descartable sin tocar servicios ajenos; si no es posible, registrar bloqueo y no aceptar el criterio con mocks/skips. Registrar versiones, comandos, resultados, parámetros de hash y límites de lo probado en build.md. No se ejecutan estas pruebas durante la especificación.

No hay interfaz nueva en 007: no corresponde una matriz visual nueva de login/proyección. El flujo operativo CLI sí exige navegación de prompts, entrada cancelable, errores en español y no exponer secretos. Smoke del frontend legado y Electron local con perfiles temporales; conservar el comportamiento existente de Escape/Delete, escala/cámara y los tamaños 820×520 local, 1024×768/1440×900 servicio y 1920×1080 jugador. Reutilizar evidencia no modificada con atribución; si la integración cambia alguna vista, verificar por CUA el tamaño afectado y foco/teclado sin cubrir el mapa.

## Impedimentos y decisiones antes de construir

1. **006 aún no entregada:** esta spec no puede pasar a construcción hasta su aprobación y contrato real. Reconciliar adaptadores/runner, transacciones y bloqueo productivo con dicha entrega; si hay incompatibilidad, registrar ajuste de spec antes de implementar.
2. **Better Auth no instalada:** verificar API/opciones y versión fijada; probar compatibilidad de hash y ambos adaptadores. Si no satisface revocación inmediata, control de alta o presupuesto de hash, comunicar el impedimento, no relajar garantías ni sustituir la biblioteca sin decisión explícita.
3. **PostgreSQL real necesario:** ausencia de entorno preparado es bloqueo de validación, no motivo de declarar soporte completo. Producción del VTT seguirá bloqueada por diseño hasta las etapas siguientes.
4. La provisión usa contraseña temporal y entrega manual; no hay SMTP, correo verificado, recuperación pública ni identidad de jugador. Documentar esas limitaciones sin presentarlas como funcionalidades implementadas.

El constructor actualizará documentación/versionado y dejará contratos mínimos de identidad para 008–011, sin implementar esas specs ni atribuir permisos de mesa por el rol de cuenta. Las cuatro revisiones independientes y el aprobador deberán comprobar la barrera legada además de los recorridos positivos de autenticación.
