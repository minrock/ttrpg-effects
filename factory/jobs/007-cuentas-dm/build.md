# Construcción007 — Cuentas DM administradas

Ciclo1, construcción inicial, 2026-10-29. Implementación **3.9.0**, Better Auth **1.7.14**, Kysely **0.29.7**, Node **24.15.0**, pnpm **11.1.2**. Disponible para las cuatro revisiones; este informe no es aprobación técnica.

## Identidad, autorización y conciliación006

Trabajo exclusivo en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama comprobada `feature/factory-006-persistencia-multidb`, conforme a la continuación autorizada al final de solicitud007. Se leyeron perfil constructor, AGENTS, solicitud/spec007, decisiones comunes, decisión/build006, fuentes de driver/migraciones/catálogo/HTTP/config y las guías de API/operación/mesa. La referencia histórica de spec007 a006 no entregada queda superada por su decisión APROBAR de ronda2 y la orden vigente. No se cambió rama ni se ejecutó staging, commit, push, merge, DMG o despliegue.

Se consume SqlDriver006, incluyendo protección de clientes PostgreSQL y TLS verificado. Kysely oficial de Better Auth se adapta a su conexión mediante un dialecto de infraestructura. Las operaciones de biblioteca, estado y auditoría comparten una transacción externa; no hay segunda DB de identidad, almacén casero paralelo ni migrador automático al arrancar. Se amplió la autoridad de migraciones existente con migración2 y tablas explícitas en allowlist; migración1/checksum se preservan. Se conserva el rechazo de esquemas ajenos/futuros.

El guard productivo006 permanece: el servicio VTT completo rechaza PostgreSQL/production. La identidad PostgreSQL se prueba con CLI y HTTP aislado que no instancia ServiceStore. Las cuentas007 no conceden acceso a la mesa global. No se construyen008–011.

## Resultado y archivos

- Nuevos contratos `src/shared/contracts/identity.ts` y puerto `src/application/services/identity.ts`: DTO mínimo independiente de ServiceRole, errores en español y operaciones tipadas.
- Nuevo `src/infrastructure/server/identity/`: configuración, codec de contraseña, cuotas, unidad de trabajo/Kysely, integración Better Auth, contratos reales por motor, tests de política y fixtures TTY/bootstrap por proceso.
- `src/infrastructure/server/database/{driver,migrations,catalog.contract}.ts`: parámetros SQL nullable para el adaptador, migración2 versionada y expectativas de migraciones actualizadas; no cambio del contrato de catálogo006 ni de su aislamiento por propietario.
- Nuevo `src/server/{identity-http,identity-cli,identity-commands,identity-prompts,request-body}.ts`. Se extrajo sin cambiar semántica la lectura acotada de cuerpos legados para reutilizarla.
- `src/server/{config,http,index,vite.config}.ts`: activación explícita, composición antes de crear almacenamiento legado, rutas separadas antes de su guard de sesión, cierre y entrada CLI compilada.
- `.env.example`, `package.json`, `pnpm-lock.yaml`, `CHANGELOG.md`, `docs/identity.md`, README y guías privada/operativa. Versionado minor una vez, 3.8.0→3.9.0; formato `.ttrpgscene` v2 intacto. No se modificó UI, renderer, CSS, preload ni modo Electron.

Se añadieron únicamente Better Auth1.7.14 y Kysely0.29.7 como dependencias directas fijadas, necesarias para biblioteca mantenida y el puente oficial hacia la transacción006. `pnpm add --save-exact` actualizó su resolución/peers en pnpm-lock; no se introdujo otro lockfile. Drivers `pg8.23.1` y SQLite de Node se reutilizan. Los cambios preexistentes de006/prerrequisito y los artefactos del orquestador no se atribuyen a007.

## Decisiones efectivas verificadas

La documentación oficial consultada fue [email/contraseña](https://better-auth.com/docs/authentication/email-password) y [SQLite](https://better-auth.com/docs/adapters/sqlite), contrastada con el código instalado. El default real de `@better-auth/utils` usa scrypt N16384/r16 y NFKC; no cumple esta spec y se sustituyó mediante `emailAndPassword.password`, la interfaz soportada de Better Auth.

Se usa scrypt asíncrono estándar de Node: **N131072,r8,p1**, sal aleatoria16bytes, derivado64bytes, maxmem160MiB; verificación con timingSafeEqual de Node, formato versionado y parámetros cerrados. No hay normalización/trim de contraseñas. Política15–128 puntos de código y512bytes, incluyendo passphrases; rechaza surrogates aislados. Hash inexistente/corrupto consume KDF ficticio equivalente y falla cerrado. Dos cálculos simultáneos por proceso, sin cola. La última ráfaga real mixta (válida/incorrecta/inexistente) admitió dos KDF, devolvió diez429 y dejó disponibles health/logout. Diagnóstico final: válido249ms, incorrecto247ms, inexistente245ms; incremento máximo RSS muestreado256MiB. Son mediciones locales orientativas, no garantía de latencia ni benchmark de producción.

Better Auth administra usuarios/cuentas/sesiones. Se usan operaciones tipadas de su `$context.internalAdapter` fijado, firma de cookie de la biblioteca y `auth.api.getSession`; no se expone su handler general ni plugins administrativos. Se mantiene CSRF/Origin habilitado, además del guard HTTP exacto de la aplicación. La validación de esquema automática de biblioteca se desactiva porque la autoridad explícita es verifySchema006/migraciones; no se ejecuta DDL de biblioteca.

El secreto es **TTRPG_AUTH_SECRET**, como establece spec007, sin alias. Activación `TTRPG_IDENTITY_ENABLED=false` por defecto. No se leyeron/escribieron `.env` privados ni se modificó el generador de configuración o el checkout original. El ejemplo no contiene secreto utilizable. La activación inválida falla antes de crear los datos del servicio.

Cookie propia HttpOnly/SameSite=Strict/Path=/api/v1; Secure y prefijo __Secure- con HTTPS, sin Domain. Expiración absoluta8h, sin renovación/cache/remember-me/almacenamiento secundario. Una huella privada del secreto en la DB permite revocar persistentemente todas las sesiones al rotar; instancias con configuración anterior fallan cerradas. La revisión persistente de autorización también invalida un login anterior a disable→enable. Los DTO excluyen token, hash, contraseña, IP y revisión interna.

SQLite mantiene la exclusión física006: dos composiciones dentro del mismo proceso comparten explícitamente conexión/cola con leases; el segundo proceso no elude el lock. PostgreSQL emplea pools independientes y bloqueo transaccional común. Login obtiene snapshot, hace KDF fuera del bloqueo y revalida hash/revisión/estado antes de crear sesión. Las operaciones administrativas revalidan autorización después del cuerpo/hash dentro de la misma transacción que muta datos. Rollback incluye auditoría.

`IdentityService.authorized(cookie,role,callback)` deja una frontera mínima para008: principal activo y recursos006 en la misma transacción, sin consultar tablas Better Auth desde dominio/aplicación. El callback debe derivar ownerId del principal, terminar y usar solo los recursos prestados; estos caducan al salir y sus errores pendientes se observan. No implementa aún las reglas funcionales de propiedad008.

## Criterios → evidencia real

| Criterio007 | Evidencia |
| --- | --- |
| Dependencia/composición | Decisión006 aprobada y fuentes reales consumidas. Migración2 conserva catálogo existente, exige migración pendiente antes de abrir identidad y es idempotente en ambos motores. API compilada habilitada inicia y autentica; secreto inválido falla sin crear su directorio. Modo desactivado conserva las suites legadas. |
| Bootstrap/provisión | Cuatro comandos compilados: `identity:bootstrap`, `identity:password`, `identity:provision-dm`, `identity:recover-admin`. PTY real en SQLite y PostgreSQL prueba prompts, entrada oculta, Ctrl+C, restauración de eco/modo canónico, operaciones y ausencia de contraseña en salida. Dos procesos independientes crean exactamente un administrador por motor. El lector inyectado prueba rechazo DM, confirmación y limpieza de sesión temporal. |
| Contraseñas | Hashes persistidos inspeccionados, sal diferente para igual contraseña, parámetros/versionado, límites Unicode/UTF8, no NFKC/trim, hash corrupto y credenciales correctas/incorrectas; cambio/reset/recovery y contraseñas anteriores rechazadas. El cambio propio exige contraseña actual y nueva distinta. |
| Roles/estado | Canonicalización/duplicados, nombre Unicode, emailVerified=false, alta exclusiva DM y temporal, DTO/lista paginada; DM activo no administra. Disable/reset/enable no reviven cookies. Rutas DM no modifican administrador ni ID ausente. |
| Sesiones/CSRF | Firma/rotación, fijación rechazada, atributos HTTP/HTTPS, expiración absoluta de sesiones realmente existentes, logout idempotente/all, persistencia al reiniciar, rotación persistente de secreto y cero sesiones restantes. Dos composiciones sin cache obsoleta; Host/Origin ajenos/null/vacíos rechazados. |
| Concurrencia/rollback | Barreras deterministas antes de completar KDF o cuerpo: login versus disable→enable/reset, alta versus logout y administración versus logout. Fallo SQL posterior a cambio revierte contraseña/estado/auditoría. Callback autorizado comparte rollback del catálogo006 y rechaza recursos expirados. |
| Frontera legada | Matriz anónimo/admin nuevo/DM nuevo sobre GET/HEAD/assets/resolve/escenas/bibliotecas/plantillas/enlaces/mesa/SSE/dados/mutaciones:401 sin bytes privados. Cookies DM/jugador legadas no autorizan identidad. Combinadas, cada familia usa su cookie y logout identidad no elimina la legada. Rutas estándar de registro/reset/administración/impersonación no están montadas. |
| Multi-DB | Suite común real SQLite físico y PostgreSQL17.10 TLS; sin sustitutos ni skip verde. Migración desde vacío y desde006, reapertura, transacción, revocación, CLI y bootstrap dos procesos. Gate sin variables falla exit1. |
| Coste/errores | KDF real, cuotas IP/identificador/global y dos cupos sin cola; ráfaga mixta, 429, health/logout, diagnóstico temporal/RSS. Límites JSON cerrado/chunked8192, paginación, permisos antes del cuerpo. Errores sanitizados y auditoría de confirmaciones sin secretos. |
| Compatibilidad/operación | 1201 pruebas generales,32 contratos006 y builds Electron/web/API. Guía enlazada para migración/bootstrap/cambio/provisión/recuperación y respaldo, distingue identidad persistente de sesiones legadas y corte pendiente011. Ningún gráfico/cliente visual cambió. |

## Comandos y resultados

PostgreSQL17.10 temporal del orquestador, loopback64050, SCRAM/TLS. Se consumió únicamente el recurso privado preparado por el orquestador mediante `/tmp/ttrpg-auth-pg-run.py`; la URL/CA no se imprimieron ni copiaron al repositorio. No se tocó la configuración, servicios, credenciales ni datos originales.

| Comando | Resultado final y log |
| --- | --- |
| `pnpm typecheck` | PASS, `/tmp/007-typecheck-final.log`; también ejecutado en build API final posterior al ajuste de etiqueta CLI. |
| `pnpm lint` | PASS final, `/tmp/007-lint-final.log`. |
| `pnpm test` | **128 archivos /1201 pruebas PASS**, `/tmp/007-tests-final2.log`,18,47s. La modificación posterior es etiqueta CLI cubierta por gate identidad final; no cambia ese grafo de pruebas generales. |
| `pnpm build:api` | PASS final, `/tmp/007-build-api-final.log`: API, db-migrate, identity-cli y chunks compartidos. Incluye typecheck; comandos/proceso API ejecutados realmente por los contratos. |
| `pnpm test:identity` | **1 archivo /25 pruebas PASS**, `/tmp/007-identity-final4.log`,52,79s; ambos motores reales y comandos compilados, último inicio19:17:01 local. |
| `pnpm test:db` | **1 archivo /32 pruebas PASS**, `/tmp/007-db-final2.log`,28,98s. Incluye TLS positivo/negativo, migraciones, comandos, compatibilidad y regresión real de idle timeout006. |
| `pnpm build` | PASS, `/tmp/007-build-electron.log`. Cambios posteriores solo grafo servidor/CLI/tests/docs; no alteran el build Electron. |
| `pnpm build:web` | PASS, `/tmp/007-build-web.log`. Igual delimitación de grafo; conserva avisos de chunks grandes. |
| `pnpm test:identity` sin variables | Fallo esperado exit1, `/tmp/007-identity-missing-env.log`; no tests omitidos como éxito. |
| Búsqueda de fronteras en bundles | Sin `TTRPG_AUTH_SECRET`, `identity_account`, `scrypt$v1` ni `better-auth` en out/renderer, out/preload, out/web o out/main; `/tmp/007-bundle-boundaries.log` vacío. |
| `git diff --check` | PASS final. |
| Limpieza SQL | `/tmp/007-cleanup.log`: **0 bases ttrpg_test_% /0 conexiones de fixtures**. |

Los25 contratos de identidad y32 de DB son gates separados de las1201 generales; no se suman ejecuciones repetidas. Para reproducir, compilar API primero, suministrar variables de prueba privadas de PostgreSQL TLS y ejecutar ambos gates. Python3 solo sirve al arnés PTY de pruebas. No se necesita contraseña en argv/env de provisión.

## Hallazgos corregidos durante construcción

1. Se contrastaron nombres/API reales de Better Auth1.7.14: fuente obligatoria de createUser y diferencia deleteUserSessions/deleteSessions; typecheck permitió corregir la integración antes del gate inicial.
2. El primer arnés de carrera espiaba una referencia ya capturada por la biblioteca y no alcanzaba la barrera. Se usa un wrapper del codec que conserva el KDF real; las carreras finales pasan con barreras deterministas. No se relajó la revalidación.
3. Se corrigió el nombre provisional del secreto a TTRPG_AUTH_SECRET, la revocación persistente al rotar y la revisión de autorización para disable→enable. Todos se verificaron antes de entregar; no son cambios de alcance.
4. La adición de revisión interna requirió validar explícitamente ese campo al salir de tipos base de Better Auth. Un build intermedio falló typecheck y sus pruebas TTY detectaron el artefacto anterior; se reconstruyó API y se repitieron los25 contratos finales con éxito. No se entrega un bundle viejo ni se atribuye un fallo de arnés a PostgreSQL.
5. El prompt de cambio propio se ajustó a «Email de la cuenta» para permitir también DM sin una etiqueta administrativa engañosa. El gate TTY final prueba la etiqueta compilada.

Son correcciones de construcción inicial, no revisiones independientes. Versión/changelog se aumentaron una sola vez.

## Límites, limpieza y entrega

No se hizo nueva inspección CUA ni humo visual Electron/proyección. No hay cambios visuales: se reutiliza con atribución la evidencia001–006 y se ejecutaron las regresiones/builds actuales. No se presentan capturas inexistentes ni tests DOM como revisión visual. No se verificaron despliegue remoto, carga prolongada, certificados públicos, todas las plataformas, proyector físico o backup/restore operativo de identidad.

Las cuotas son por composición/proceso; detrás de proxy se comparte la IP inmediata. No se certifica defensa horizontal. La referencia de dos composiciones SQLite comparte explícitamente unidad de trabajo, no simula dos procesos de API simultáneos. El callback autorizado debe terminar y no hacer red prolongada; PostgreSQL conserva los timeouts006. La integración tipada interna de Better Auth está fijada y debe revisarse al actualizar la biblioteca.

SMTP, verificación de correo, OAuth/MFA, UI nueva, propietarios funcionales008, invitados009 y SSE/moderación010–011 quedan fuera. Las contraseñas temporales se entregan manualmente; el operador dispone ahora de cambio seguro por CLI antes de UI011. Secretos de config y DB deben respaldarse por canales privados; la guía diferencia persistencia comprobada de backup no ensayado.

Cada fixture retiró sus bases/directorios/pools, servidores HTTP y procesos CLI/API propios. La comprobación final SQL fue cero/cero. PostgreSQL del orquestador queda activo y sin cambios, no se detuvo ni se terminaron backends ajenos. No hubo operaciones Git de escritura ni modificaciones del original, perfil Electron, env personal, tablero/cola/specs/revisiones. Único archivo escrito dentro de factory por este constructor: `factory/jobs/007-cuentas-dm/build.md`, publicado mediante temporal y renombrado. El constructor termina y espera las cuatro revisiones/orden de corrección.
