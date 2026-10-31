VEREDICTO: APROBADO

## Alcance e identidad de evidencia

Revisión independiente de seguridad de 007, ciclo 1/ronda 1, realizada el 2026-10-29 en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se leyeron AGENTS.md, el perfil seguridad, solicitud, spec, build, revision.md y decisiones comunes; se contrastaron el diff rastreado y los archivos nuevos reales. Las 565 huellas SHA-256 de `ronda-1/huellas.json` coincidieron con el checkout. No se leyeron informes de otros revisores ni se modificaron implementación, Git, tablero, configuración o datos originales.

## Hallazgos priorizados

No se identificaron vulnerabilidades demostrables ni correcciones de seguridad obligatorias dentro del alcance 007 revisado. La aprobación se limita a las huellas de esta ronda y no acredita las funcionalidades futuras 008–011.

## Evidencia de controles

- `src/infrastructure/server/identity/index.ts`: integración Better Auth 1.7.14 fijada, registro público deshabilitado y handler general sin montar. Alta exclusiva DM, administrador único por bootstrap, email no verificado, cambio obligatorio y autorización administrativa revalidada dentro de la transacción de confirmación. El principal devuelve DTO limitado sin credencial, hash ni IP.
- `password.ts`: scrypt estándar asíncrono de Node N=131072/r=8/p=1, sal de 16 bytes, derivado de 64 bytes y máximo 160 MiB; comparación timingSafeEqual y formato versionado de parámetros cerrados. Contraseña 15–128 puntos de código/512 bytes, sin normalización; registros inexistentes/corruptos consumen KDF equivalente. Dos cálculos simultáneos por proceso sin cola, cuotas por peer/identificador/global y errores genéricos.
- `identity-http.ts`, `request-body.ts` y `http.ts`: Host/Origin exactos, mutaciones con Origin obligatorio, JSON cerrado/8192 bytes y timeout, autorización antes de cuerpos administrativos, no-store y errores sanitizados. La familia de identidad se monta antes del guard legado sin convertir su principal en autoridad de las rutas globales.
- Cookie propia HttpOnly/SameSite=Strict/Path=/api/v1, Secure en HTTPS y sin Domain. Se contrastaron `getSession` y `createSession` del paquete instalado: consulta persistente, expiración, ausencia de renovación/cache y generación de token nuevo. Firma verificada por Better Auth. Rotación de secreto revoca sesiones persistidas y composiciones anteriores fallan cerradas.
- `database.ts` y migración 2: SQL parametrizado, unicidad, transacción externa común para Better Auth/estado/auditoría, serialización SQLite/PostgreSQL y rollback. El hash ocurre fuera del bloqueo; login revalida hash/revisión/estado y las mutaciones revalidan la sesión al confirmar. Sin una base implícita paralela.
- CLI y prompts: secretos sin argv/env de provisión, TTY sin eco y confirmación; recuperación local sobre administrador existente, sin promoción ni endpoint público. Se revoca la sesión de provisión al terminar. Las pruebas ejercitan cancelación y restauración de terminal.
- Electron/preload/renderer no cambian en 007. La inspección confirma contextIsolation, nodeIntegration desactivado y sandbox en ventanas existentes; no hay API IPC nueva ni importación de identidad en el cliente. CSP y validaciones legadas se conservan. Producción VTT/PostgreSQL sigue bloqueada durante la transición explícita.

## Ejecución independiente

Se ejecutó `python3 /tmp/ttrpg-auth-pg-run.py test:identity` contra SQLite físico y PostgreSQL temporal real TLS, sin imprimir secretos ni detener el servidor.

1. Primera ejecución, inicio 19:37:02: 24/25 PASS; un timeout en `identity.contract.ts:75`, contrato PostgreSQL de bootstrap/cambio/alta/persistencia. Vitest reportó 126717 ms para un límite de 30000 ms y duración total 178,61 s. No se ocultó ni modificó el fallo. El orquestador confirmó otro gate simultáneo; contención o pausa del host son hipótesis, no causas demostradas.
2. Reintento tras confirmar que ese gate había terminado, inicio 19:45:55: **25/25 PASS**, salida 0, duración 52,59 s. No se cambiaron código, límites ni selección de pruebas. Diagnóstico KDF: válido 248 ms, incorrecto 244 ms, inexistente 247 ms; incremento RSS muestreado 257 MiB. Son observaciones locales, no garantías de rendimiento.

El gate completo cubre ambos motores, migraciones, revocación entre composiciones, expiración, rotación de secreto, carreras deterministas contra disable/reset/logout, rollback, fronteras legado/nuevo, JSON/cookies/CSRF, saturación y CLI compilado con PTY. El timeout inicial no se reprodujo y no dejó una vulnerabilidad concreta pendiente; conviene conservar esta evidencia si reaparece en CI.

## Límites

No se ejecutó una auditoría de carga prolongada, despliegue remoto, backup/restore, análisis exhaustivo de dependencias ni nueva inspección visual. No se atribuyen a esta revisión los otros gates declarados por el constructor. No se exige UI 011, propiedad 008, invitados 009 o moderación/SSE 010. Las cuotas siguen siendo por proceso/composición, tal como documenta la entrega. El servidor PostgreSQL temporal permaneció activo.
