VEREDICTO: APROBADO

## Alcance e identidad

Revisión independiente de código, trabajo 007, ciclo 1, ronda 1. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, versión 3.9.0. Leídos AGENTS.md, perfil codigo.toml, solicitud/spec/build007, revision.md, decisiones comunes y fuentes reales. Se contrastaron `base-archivos.json` y `ronda-1/huellas.json`: los 33 archivos del trabajo coinciden con el inventario y ninguna huella de la entrega cambió durante la revisión.

Se revisaron contratos y servicio de identidad, integración Better Auth/Kysely, unidad transaccional, migración2 y cambios del driver, hash/cuotas, HTTP, comandos/TTY, composición y cierre de API, suites/fixtures, dependencias fijadas, configuración de ejemplo y documentación/versionado. No se exigieron UI, propiedad funcional, invitaciones ni SSE de008–011.

## Resultado y evidencia

No se identificaron defectos accionables que impidan aceptar el alcance007.

- `src/infrastructure/server/identity/database.ts`: las consultas de Better Auth usan la conexión prestada por006 dentro de AsyncLocalStorage; el ámbito se invalida al terminar y las operaciones se serializan. SQLite comparte conexión/cola mediante leases dentro del proceso y conserva el lock físico; PostgreSQL usa un bloqueo transaccional común entre composiciones. Los fallos revierten y liberan la conexión.
- `src/infrastructure/server/identity/index.ts`: el KDF ocurre fuera de la transacción. Login vuelve a comprobar usuario, hash, revisión y estado antes de crear sesión; cambios administrativos vuelven a comprobar al actor después del trabajo asíncrono. Reset/deshabilitación/revocación actualizan revisión y eliminan sesiones en la misma transacción. Cambio de contraseña y auditoría se revierten juntos ante fallo posterior. El callback autorizado presta repositorios006, espera las operaciones pendientes y rechaza recursos usados fuera de su ámbito.
- `src/infrastructure/server/database/migrations.ts`: migración2 explícita para ambos motores, claves foráneas, unicidad de email y de primer administrador; migración1 preservada. No hay migrador de biblioteca ejecutado al arrancar. Los contratos ejercitan actualización006→007 con catálogo conservado, migración pendiente e idempotencia.
- `src/server/identity-http.ts` y `src/server/http.ts`: rutas explícitas, DTO cerrado, autorización previa al cuerpo administrativo y revalidación al confirmar. La identidad nueva se monta separadamente del guard legado. Se mantienen Host/Origin, límites de cuerpo, errores sanitizados y cookies independientes; no hay handler general de Better Auth expuesto.
- `src/infrastructure/server/identity/password.ts`: scrypt asíncrono con parámetros cerrados, sal aleatoria, formato versionado, comparación segura y presupuesto de dos KDF sin cola. Los tests ejercitan implementación criptográfica real, límites Unicode, corrupción, saturación y liberación de cupos.
- `src/server/identity-commands.ts`, `identity-cli.ts` e `identity-prompts.ts`: los comandos comparten el servicio, requieren TTY, ocultan contraseñas, confirman entradas y limpian la sesión temporal de provisión. La recuperación se limita al administrador existente y está documentada como capacidad local del operador.
- `package.json`, `pnpm-lock.yaml`, `CHANGELOG.md` y guías: versión3.9.0/minor y entrada fechada coherentes. Better Auth1.7.14 y Kysely0.29.7 están fijados. Se documentan integración interna versionada, secreto separado, recuperación, respaldo y bloqueo del VTT completo PostgreSQL hasta el corte posterior. No se modificaron renderer/preload ni formato de escena v2.

## Verificaciones propias

Ejecutado desde el checkout canónico:

`python3 /tmp/ttrpg-auth-pg-run.py test:identity`

Resultado: **1 archivo, 25 pruebas aprobadas**, duración **53,10s**, inicio19:44:41 local. SQLite físico y PostgreSQL temporal real con TLS; sin mocks de motor ni skips. Incluye persistencia/reapertura, expiración/rotación del secreto, dos composiciones, barreras deterministas de login y administración frente a revocación, rollback ante fallo SQL, frontera de cookies/rutas legadas, HTTP inválido, comandos compilados por PTY, bootstrap con dos procesos y migración006→007. Diagnóstico del KDF: válido246ms, incorrecto255ms, inexistente245ms; incremento RSS muestreado256MiB. Estas cifras son diagnóstico local, no garantía de rendimiento.

Verificación SHA-256 de todos los archivos incluidos en huellas.json: ninguna divergencia. Inspección del código instalado de Better Auth para consulta y caducidad de sesiones. Los tests leen el comportamiento real y comprueban resultados persistidos, no solo constantes/configuración.

## Limitaciones y preservación

No se repitieron las1201 pruebas generales,32 contratos test:db ni los builds: se conserva su atribución al constructor en build.md; no se presentan como ejecuciones de este revisor. No se hizo inspección visual nueva: esta entrega no modifica vistas. La aceptación no certifica despliegue productivo, backup/restore operativo, carga prolongada o distribución horizontal. La dependencia de `$context.internalAdapter` está fijada y documentada; actualizar Better Auth requiere repetir estos contratos.

No se leyeron informes de otros revisores ni se modificaron implementación, Git, tablero, configuración/datos originales o servicios ajenos. El gate usó los recursos temporales preparados y sus fixtures; PostgreSQL quedó activo. Único artefacto publicado por este revisor: este informe, mediante temporal y renombrado.
