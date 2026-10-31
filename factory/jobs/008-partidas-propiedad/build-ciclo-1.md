# Build 008 — Partidas y recursos por DM

**Ciclo 1, corrección tras ronda 1, 2026-10-30. Versión 3.10.0, sin nuevo bump.** Código preparado para segunda ronda; este informe no es aprobación ni autorización de integración. Se leyeron las cuatro revisiones completas: seguridad, UX y código solicitaron cambios; UI aprobó su alcance.

Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Rama conservada: `feature/factory-006-persistencia-multidb`. Se mantienen las fuentes anteriores de 006/007 y los checksums de migraciones 1/2. Sin staging, commit, push, merge, DMG o despliegue; sin cambios al checkout, configuración o datos originales. PostgreSQL temporal compartido permanece activo.

## Correcciones de ronda 1

| Hallazgo | Cambio y evidencia nueva |
| --- | --- |
| Seguridad: catálogo autorizado aceptaba otro owner | Los cinco métodos de `tx.games` comprueban el owner contra el principal dentro del ámbito transaccional. Repositorios y efectos funcionales exigen rol DM incluso si authorized se invoca con rol admin o indefinido; el preflight administrativo vacío y la API de cuentas se conservan. Rol, owner y sesión se capturan al crear el puerto; modificar el DTO del callback no concede autoridad ni suplanta patrocinador. Se conserva la firma de 006, pero no su capacidad global en el puerto autorizado. Pruebas directas find/list/create/update/delete, envoltorio y contexto de runtime rechazan A→B; ambos motores mantienen B intacto. |
| Seguridad: publicación visible antes de commit | `publish` prepara una copia y revalida el contexto antes de confirmar. Los efectos síncronos se aplican después de COMMIT, bajo lock de sesión PostgreSQL o cola SQLite; la exclusión termina después de los efectos. Un fallo tardío o de revalidación conserva snapshot/revisión anteriores. Un COMMIT incierto descarta el runtime afectado. Se drenan las escrituras pendientes antes de comprobar el contexto; una escritura iniciada que archive impide publicar. Pruebas reales en ambos motores inyectan fallo antes de enviar COMMIT y después de ejecutarlo; prueban orden publicación→archivo mediante barrera explícita y rechazo de publicación posterior al archivo. |
| UX: revisión obsoleta decía ID duplicado | Nuevo `REVISION_CONFLICT` de catálogo, HTTP 409 con instrucción de conservar cambios pendientes y releer. Pruebas HTTP de PATCH y DELETE comprueban código y mensaje; la colisión de creación conserva `CONFLICT`. |
| UX: presupuesto agotado recomendaba recargar | `OPERATION_BUDGET` devuelve 429, mensaje comprensible y `error.retryAt` ISO tipado. La fecha es el último vencimiento de los registros actuales; después se libera ese presupuesto, salvo nuevas operaciones de la cuenta. Reutilización con contenido distinto usa `OPERATION_CONTENT_CONFLICT`; un resultado individual demasiado grande usa `RESULT_TOO_LARGE`, 413. Reloj inyectado prueba límite por cantidad y bytes, ausencia de escritura y recuperación después del vencimiento. |
| UX: CLI perdía el diagnóstico | Categorías sanitizadas, uso breve, acción siguiente, exit 1 para error y 130 para cancelación. Solo anuncia rollback confirmado cuando ROLLBACK respondió antes de intentar COMMIT; pérdida de respuesta o rollback no confirmado informa estado incierto y recuperación mediante verify/import con el mismo paquete/asignación. CLI compilada prueba sintaxis, ruta, lock, corrupción, propietario y destino ocupado; SIGINT real mientras espera exclusión PostgreSQL confirma rollback y deja destino vacío. Cancelación durante filas se prueba en ambos motores. Importación con respuesta de COMMIT perdida se recupera por huella en ambos motores, sin imprimir el error privado inyectado. |
| Código: borrar plantilla referenciada rompía edición/migración | DELETE rechaza con `TEMPLATE_REFERENCED`, 409 recuperable, mientras existan monstruos propios que la referencien. Revisión y documento permanecen intactos. Otro DM con igual ID no bloquea ni se altera. Ambos motores prueban edición posterior y exportación/importación completa. Ambos exportadores inspeccionan relaciones antes de devolver éxito; ante error retiran el manifiesto de terminación. CLI legada con plantilla ausente devuelve `TEMPLATE_MISSING` y exige reparación explícita en copia, sin declarar el paquete transferible. |

La nueva primitiva de efectos pertenece a aplicación; la unidad DB no depende de HttpError. Una conexión PostgreSQL incierta o con fallo al liberar el lock se descarta. No se introducen invitados, SSE por partida ni UI de 009–011. `GameRuntimeRegistry.allows` continúa siendo una comprobación contextual interna; las rutas futuras deben validar credencial, apertura y lease.

## Alcance y archivos

Se conservan CRUD de partidas, propiedad de escenas/assets/plantillas/bibliotecas, CAS, idempotencia persistida, enlaces transaccionales entre dos/tres escenas, aperturas con lease/generación, migración 3 y CLI de respaldo/adopción/verificación/retorno. Se usa SQL asíncrono real en SQLite y PostgreSQL, la conexión/transacción de 006 y `IdentityService.authorized` de 007. El guard del servidor legado sigue bloqueando postgres/production; el gate HTTP PostgreSQL usa composición real aislada de identidad/DM, sin ServiceStore.

Las correcciones afectan `application/services/{game-catalog,owned-store,game-runtime}.ts`, `infrastructure/server/database/{catalog-repository,driver}.ts`, `infrastructure/server/identity/{database,index,identity.contract}.ts`, `infrastructure/server/owned/{repository,transfer,owned.contract,transfer.contract}.ts`, `server/{owned-http,data-cli}.ts`, el campo opcional `retryAt` en `shared/contracts/http-api.ts`, `docs/owned-data.md` y la entrada existente de changelog. Nuevos en esta corrección: `server/data-command.ts`, `infrastructure/server/owned/{transfer-errors,corrections.contract}.ts`. La lista inicial de 008 comprendía 20 archivos modificados y 18 nuevos contra su base; esta corrección añade tres archivos y modifica además el contrato HTTP compartido: total actual de 21 modificados y 21 nuevos, sin eliminaciones. No hay dependencias nuevas, lockfile distinto ni cambios en renderer, preload, main, web o render. `.ttrpgscene` sigue en v2.

## Matriz A1–A12

| Criterio | Evidencia vigente |
| --- | --- |
| A1 | Catálogo/unidad 006 y principal BetterAuth 007 reutilizados; owner cerrado en puertos, composición HTTP separada, guard y frontera de bundles. |
| A2 | CRUD privado, nombres repetidos, fechas/revisión, totales y paginación. Archivar/borrar cierra apertura atómicamente; conserva biblioteca y otras partidas. |
| A3 | Matriz HTTP A/B/admin/legado/sin credencial para GET/HEAD/resolve/export/list y mutaciones; regresión directa del puerto autorizado y referencias ajenas. |
| A4 | Reutilización sin duplicar bytes y contextos de runtime independientes. Publicación preparada invisible antes de commit; rollback conserva estado anterior; commit incierto falla cerrado. |
| A5 | Contratos comunes sobre SQLite físico y PostgreSQL 17.10 TLS real: recursos, BLOB/bytea, JSON/fechas/nulls, Unicode y comodines literales, constraints, corrupción y reapertura. |
| A6 | Dos conexiones y misma revisión: una confirma; otra recibe conflicto. Enlaces de tres escenas revierten todos los extremos. Archivo obsoleto conserva apertura. Revalidación y efectos se ordenan bajo exclusión. |
| A7 | Reintentos concurrentes y reinicio conservan deduplicación; contenido distinto se distingue del presupuesto. Ventana 24 h y límites 1.000 resultados/64 MiB; recuperación por reloj. Revocación durante body y replay revocado reciben 401 sin mutación. |
| A8 | Lease de 150 s, renovación por otra sesión válida del mismo DM durante gracia, transición sin revisión extra de heartbeat, generación nueva y rechazo tardío. FK evita hostOwner ajeno; runtimes separados. |
| A9 | Legado→SQLite, legado→PostgreSQL y SQLite con dos propietarios→PostgreSQL, mapa explícito y completo. Fixtures con escenas enlazadas/dos mapas, Markdown, ruta ausente, assets compartido/huérfano, plantilla/monstruo y NPC/personaje completos. Verify/HTTP/export/reinicio prueban contenido y aislamiento. Política de plantilla conserva un dataset transferible. |
| A10 | Respaldo de tres bases/sidecars y exclusión de escritor; hashes de fuente y respaldo intactos. Fallo tras await y cancelación revierten filas y permiten reintento. Restauración temporal recupera las tres bibliotecas. Respuesta de commit perdida no se anuncia como rollback; registro idempotente permite recuperar resultado. |
| A11 | Parser v1→v2 y rechazo de futuro, regresión general y builds Electron/web. Sin nuevas superficies visuales; evidencia visual previa de 001–007 atribuida únicamente a lo intacto. |
| A12 | Migración 3 y CLI documentadas; diagnósticos, comandos y límites; versión/changelog únicos; gates y builds siguientes. Sin Git write ni despliegue. |

## Verificación actual

Node 24.15.0, pnpm 11.1.2 y pg 8.23.1. PostgreSQL 17.10 con TLS real suministrado por el runner privado, sin imprimir secretos. El gate ejecuta `data-cli.mjs` compilada. Los tests usan solamente directorios, bases, HTTP y cuentas propios.

| Comando | Resultado y log |
| --- | --- |
| `pnpm typecheck` | PASS, ejecutado también por el build final de API; `/tmp/008-r2-build-api-captured.log`. |
| `pnpm lint` | PASS; `/tmp/008-r2-lint-captured.log`. |
| `pnpm test` | **128 archivos / 1.201 pruebas PASS**, 13,45 s; `/tmp/008-r2-test-role.log`. |
| `pnpm build` | PASS; `/tmp/008-r2-build-electron-role.log`. |
| `pnpm build:web` | PASS; `/tmp/008-r2-build-web-role.log`. |
| `pnpm build:api` | PASS con CLI compilada y captura final de autoridad; `/tmp/008-r2-build-api-captured.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:db` | **32/32 PASS**, 20,26 s; `/tmp/008-r2-db-final.log`. No hubo cambios posteriores en driver/catalog/migraciones de 006. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:identity` | **25/25 PASS**, 58,22 s; `/tmp/008-r2-identity-role.log`. Cuenta DM real para rollback; administración y preflight conservados. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:owned` | **3 archivos / 32 pruebas PASS**, 136,58 s; `/tmp/008-r2-owned-role.log`. Gate completo con rol cerrado, SQL pendiente antes de publicación, contratos originales y 12 nuevos; ambos motores, sin skips. |
| `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/owned/vitest.config.ts src/infrastructure/server/owned/corrections.contract.ts -t 'cierra owner'` | **2/2 seleccionadas PASS**, 9,41 s; `/tmp/008-r2-captured-role.log`. Complemento posterior para la captura final de owner/rol/sesión y manipulación del DTO, uno por motor. Vitest informa diez casos no seleccionados; no sustituye al gate completo de 32. |
| Frontera de bundles | Sin símbolos privados de identidad/DB en renderer/preload/web/main; `/tmp/008-r2-bundle-boundaries.log` vacío. |
| `git diff --check` | PASS, rama conservada; `/tmp/008-r2-diff-check.log` vacío. |
| Auditoría SQL de limpieza | **Cero bases y cero conexiones de fixtures**; `/tmp/008-r2-cleanup.log`. Solo lectura, sin detener PostgreSQL compartido. |

Las inyecciones de fallo envuelven las conexiones reales: simulan el error antes de enviar COMMIT o después de su ejecución efectiva, sin reemplazar el almacenamiento por mocks. La recuperación se verifica contra filas reales. La captura final de autoridad se aplicó después del gate completo y tiene la comprobación dirigida indicada; después se recompilaron API/typecheck y lint. No cambió los grafos Electron/web ni las superficies visuales. El gate sin variables PostgreSQL falló explícitamente en la construcción inicial (`/tmp/008-owned-missing-env.log`); no se ofrece un modo de omitir ese motor.

## Historial de construcción y corrección

- Entrega inicial: propiedad 20/20, DB 32/32, identidad 25/25 y suite general de 128 archivos/1.201 pruebas; typecheck/lint/builds pasaron. Logs `/tmp/008-owned-final2.log`, `/tmp/008-db-final2.log`, `/tmp/008-identity-final.log`, `/tmp/008-test-general-final.log` y `/tmp/008-build-*.log`. Esto no resolvía los seis hallazgos posteriormente descubiertos: se conserva como evidencia histórica, no como sustituto de la segunda ronda.
- Primer gate de construcción inicial: 7/14, con correcciones de Content-Length en DELETE y candidatos ajenos 422→404. También hubo timeouts SQLite de causa no determinada, total 4.122,51 s; no se atribuyen exclusivamente al host. Repetición: 14/14 en 66,63 s, sin aumentar timeout. Logs `/tmp/008-owned-initial.log` y `/tmp/008-owned-second.log`.
- Otras correcciones iniciales: ID duplicado de mapa en fixture; lectura de legado en copia descartable para no crear WAL/SHM en respaldo; fixture de relación corrupta ajustada a ambas representaciones v2; hash/longitud de bytes y orden hexadecimal; expectativa del gate DB actualizada a migraciones 1/2/3 y DDL fallido de prueba a 4. La repetición DB pasó 32/32. No se relajaron validaciones ni omitieron casos.
- Primer gate ampliado tras ronda 1: **28/29 PASS**, 129,40 s, `/tmp/008-r2-owned-initial.log`. El nuevo test PostgreSQL asumía con Promise.all qué transacción adquiriría primero la exclusión. Se fijó esa precondición con una barrera dentro de la unidad ya adquirida, sin sleeps; se añadió también el orden inverso. Contratos dirigidos posteriores: **12/12 PASS**, 55,98 s, `/tmp/008-r2-corrections.log`.
- Regresión de identidad tras cerrar owner: **23/25**, 54,61 s, `/tmp/008-r2-identity-final.log`. Su prueba antigua usaba el owner literal «owner» y ahora recibía NOT_FOUND antes del fallo inyectado. Se adaptó al principal; el reintento pasó **25/25**, 54,65 s, `/tmp/008-r2-identity-retry.log`. Al cerrar además el rol funcional, esa prueba pasó a una cuenta DM real, preservando rollback y rechazo del puerto escapado; el resultado final se registra arriba.
- El revisor de código tuvo 24/25 en su primer gate de identidad por fallo TLS al limpiar una fixture, y 25/25 al repetir. Se atribuye al revisor y a sus logs; el orquestador retiró la fixture huérfana antes de esta corrección. No se afirma una causa definitiva ni se contabiliza ese reintento como prueba del constructor.

## Límites

Un proceso API por base; no se certifican escalado horizontal, carga prolongada ni proyector físico. Los callbacks deben terminar y los efectos post-commit son síncronos, sin trabajo externo. No se cancela una Promise externa infinita. La cancelación es cooperativa: una señal posterior a la última comprobación puede coincidir con un commit ya iniciado y no convierte un éxito confirmado en rollback. Un fallo de commit o rollback incierto requiere verificar/reintentar con el mismo paquete antes de cambiar el destino.

El roundtrip integral pg_dump/pg_restore de producción pertenece al corte 011 y no se ejecutó aquí. 008 prueba respaldo/restauración del legado SQLite y migración funcional a PostgreSQL. Las herramientas no sincronizan datasets divergentes después de nuevas escrituras. Directorios de exportación fallidos quedan parciales, sin manifiesto de terminación cuando falla la inspección; conservarlos para diagnóstico y usar un destino nuevo.

Persisten los avisos conocidos de canvas/jsdom, chunks grandes y consultas concurrentes en pg 8 desde contratos que usan Promise.all; una actualización a pg 9 requiere revisar ese comportamiento. No se hizo CUA nuevo ni se atribuye nueva evidencia visual: no cambiaron las superficies de UI. No se publican invitaciones, moderación, sesiones invitadas ni UI anticipadas.

Código congelado para segunda ronda. Todos los servidores HTTP, pools, bases y directorios propios de pruebas fueron cerrados; PostgreSQL compartido sigue disponible. Única escritura del constructor dentro de factory: este `build.md`, publicado mediante temporal y renombrado atómico. Se espera al orquestador y las cuatro revisiones; no se iniciaron revisores ni se realizaron operaciones de escritura Git.
