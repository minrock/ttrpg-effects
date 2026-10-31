# Build 008 — Catálogo administrado y definiciones retenidas

**Ciclo 2, 2026-10-30. Versión 3.10.0, sin otro bump.** Implementación de la spec final y del retrabajo autorizado; preparada para las cuatro revisiones del ciclo 2 (ronda global 3). Este informe no constituye aprobación técnica ni permiso de integración. Se leyeron las cuatro revisiones completas de ronda 2. El historial anterior permanece en [build-ciclo-1.md](build-ciclo-1.md); sus permisos de editar/borrar plantillas personales no describen el servicio actual.

Checkout canónico `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama conservada `feature/factory-006-persistencia-multidb`. Sin operaciones de escritura Git, cambio de rama, despliegue, DMG o modificaciones al entorno/datos originales. Sin subagentes ni nuevas dependencias. PostgreSQL temporal compartido sigue activo.

## Resultado y contratos

- Catálogo compartido separado del contenido privado: admin crea sistemas y borradores, publica versiones inmutables y cambia disponibilidad con CAS/idempotencia. Fechas de creación/publicación son del servidor. No existe borrado de definiciones en el puerto de producto. DM no lee borradores; admin no adquiere capacidad sobre juegos/recursos/assets/aperturas/efectos privados.
- Registro compilado y cerrado de módulos, esquema declarativo estricto y presentaciones Markdown/CSS existentes. Perfiles genérico y D&D 5.5 reutilizan medición y plantillas actuales; no se implementa un reglamento completo ni carga dinámica. Hash/version exactos y configuración resuelta separan reglas, datos y presentación, sin cambiar cámara, escala o diagonalMode de la escena.
- Las altas de partidas requieren `systemRef` explícito e inmutable. Recursos tipados guardan bindings externos a `.ttrpgscene`; un vínculo persistido recurso–partida valida owner y versión exacta. Una fila/monstruo embebido previo puede editarse con su referencia deshabilitada; copiar, insertar otro ID, añadir/cambiar binding o crear vínculo es nuevo uso y requiere disponibilidad. Las definiciones privadas históricas se retienen por owner/ID/version/hash, nunca se publican automáticamente ni se ofrecen para nuevas altas.
- La unidad autorizada registra el método completo, captura argumentos y autoridad, drena operaciones incluso no esperadas y rechaza toda la unidad ante fallos capturados. Revalida referencias, disponibilidad, contexto y presupuesto de idempotencia contra el estado final. Se conservan exclusión entre conexiones, CAS y efectos síncronos después de COMMIT; un resultado incierto descarta el runtime afectado.
- Migración 4 conserva las migraciones 1–3 y materializa catálogo/bindings/retención/enlaces. Upgrade real desde esquema 3, lectura en lotes y aborto transaccional ante referencias corruptas. La plantilla privada prevalece ante una colisión histórica con ID incorporado, sin cambiar el lector/editor de Electron local. Partidas antiguas reciben perfil genérico sin inferencia a partir de nombres ni etiquetas libres.
- Paquete operativo v2 incluye publicaciones, disponibilidad, fechas/hashes, bindings, referencias de partidas y vínculos. Lector explícito v1 para legado y datos ya privados. Restauración completa solo por operador, destino funcional vacío y seeds compatibles; restaura instancias deshabilitadas sin habilitarlas. Borradores administrativos no se exportan. Las referencias ausentes no se sustituyen por la última versión.

Rutas y DTO exactos en [docs/owned-data.md](../../../docs/owned-data.md): `/api/v1/admin/systems` y sus versiones/publicación/disponibilidad; lecturas `/api/v1/dm/systems`; configuración y vínculos bajo `/api/v1/dm/games/:id`. Se conservan Host/Origin, límites, no-store/CSP, revisión esperada e idempotencia. La fachada `/dm/monster-templates` queda de lectura; escritura y borrado devuelven `IMMUTABLE`. El guard productivo de la composición legada permanece hasta 011.

Archivos principales: `domain/systems/system-catalog.ts`; `application/services/{system-catalog,owned-store,game-runtime,game-catalog,owned-games}.ts`; `infrastructure/server/owned/{system-data,system-repository,repository,records,transfer}.ts`; migraciones/catálogo 006 y cierre de identidad 007; `server/{owned-http,owned-scene-service,db-migrate}.ts`. Contratos en `owned/{systems,owned,corrections,transfer}.contract.ts`, fixtures y ajustes de expectativas de migración en `database/catalog.contract.ts`. Documentación en README, docs/database.md, docs/owned-data.md y la entrada existente de CHANGELOG 3.10.0. No hay cambios de UI, renderer, preload, main, web, Pixi ni formato portable.

## Matriz de aceptación

| Criterio final | Evidencia de este ciclo |
| --- | --- |
| A1 — Composición/autoridad | Identidad Better Auth y transacción 006 reales; matriz HTTP y regresiones directas de owner/rol/DTO mutado/puerto escapado. Admin con rol omitido no obtiene puertos DM. Handler PG aislado sin ServiceStore/fallback. |
| A2 — Partidas | CRUD/CAS/archivo/borrado/apertura de contratos conservados; pruebas nuevas de systemRef obligatorio, referencia inmutable, resolución exacta y upgrade de partida desde esquema 3. |
| A3 — Privacidad | Casos A/B/admin/anónimo/legado, HEAD/resolve/export/list/count y enlaces; mismas IDs privadas entre owners conservadas. Plantilla retenida no aparece en catálogo compartido ni se resuelve como incorporada por una colisión. |
| A4 — Catálogo | HTTP nuevo: borrador invisible, publicación idempotente, fechas, payload estricto, módulos/esquemas desconocidos rechazados, versión 2 distinta sin alterar versión 1. CAS de versión y plantilla independientes; rehabilitación de versión no habilita plantilla. PUT/DELETE y puertos privados de plantillas rechazan. |
| A5 — Consumo | Contratos nuevos directos y HTTP: edición retenida, copia/nuevo monstruo embebido/cambio de binding/nuevo vínculo rechazados; incompatibilidad entre versiones con mismo nombre; resolvedor exacto y exportación con disponibilidad deshabilitada. |
| A6 — Concurrencia | Barreras explícitas bajo unidad adquirida para ambos órdenes entre dos conexiones (crear/deshabilitar y editar/deshabilitar). Ambos órdenes dentro de Promise.all, habilitar→crear→deshabilitar, CAS/publicación concurrente y remove+put histórico. Catch/Promise.allSettled/unawaited y DTO mutado no permiten confirmación parcial. |
| A7 — Idempotencia/revocación | Replay tras reinicio y después de deshabilitar, contenido distinto, límites/retryAt/recuperación por reloj. Barrera de dos operaciones partiendo de 999 resultados impide confirmar 1001. Revocación durante body del administrador y controles privados anteriores conservados. |
| A8 — Runtime | Suite conservada de lease/generación/contextos y fallos tardíos/COMMIT incierto, más publicación nueva que exige recurso persistido y valida sistema sin modificar viewport. No acredita invitados/SSE. |
| A9 — Motores | Contratos idénticos sobre SQLite físico y PostgreSQL 17.10 TLS real: esquema vacío/upgrade 3→4, rollback de upgrade fallido y reparación explícita, checksums/reapertura, JSON/fechas/nulls/Unicode/BLOB/bytea/constraints. Sin skips ni simulador PG. |
| A10 — Transferencia | Fixtures completas legado→SQLite/PG y privado SQLite dos owners→PG. Formatos 1 y 2, catálogo deshabilitado, seeds coincidentes/conflictivas, referencias privadas, hashes, vínculos de escena, datos incompletos/destino ocupado. Cancelación SIGINT/exit 130, fallo tardío, commit incierto/replay/verify y retorno desde respaldo conservados; CLI compilada ejecutada. |
| A11 — Compatibilidad | 1201 pruebas generales, medición/escenas v1/v2/bibliotecas y builds Electron/web. Lector especial de definiciones retenidas en servidor conserva aparte la política editable local. Sin UI 011 ni humo visual nuevo. |
| A12 — Entrega | Contratos/CLI/migración/límites documentados, changelog 3.10.0, gates siguientes y publicación atómica de este informe. Sin Git write ni datos personales. |

Los 32 contratos anteriores se mantienen/adaptan a la política actual; no se presentan como evidencia nueva de catálogo. `systems.contract.ts` añade ocho casos parametrizados (cuatro por motor) con las matrices HTTP, frontera directa, concurrencia y migración descritas. Las inyecciones de fallo envuelven conexiones reales y verifican filas reales; no sustituyen PostgreSQL.

## Verificación

Node 24.15.0, pnpm 11.1.2, SQLite 3.51.3, pg 8.23.1; PostgreSQL 17.10 con TLS verificado por wrapper privado. El wrapper configura variables sin imprimir secretos. Todos los comandos siguientes terminaron con exit 0; los tres gates de integración ejecutaron ambos motores sin skips.

| Comando | Resultado y log de este ciclo |
| --- | --- |
| `pnpm typecheck` | PASS final; `/tmp/008-c2-typecheck-close.log`. También incluido en los tres builds. |
| `pnpm lint` | PASS final; `/tmp/008-c2-lint-close.log`. |
| `pnpm test` | **128 archivos / 1201 PASS**, 18,35 s; `/tmp/008-c2-test-final.log`. |
| `pnpm build` | PASS; `/tmp/008-c2-build-electron-complete.log`. |
| `pnpm build:web` | PASS; `/tmp/008-c2-build-web.log`. |
| `pnpm build:api` | PASS final con CLI compilada; `/tmp/008-c2-build-api-close.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:db` | **32/32 PASS**, 20,30 s; `/tmp/008-c2-db-final.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:identity` | **25/25 PASS**, 57,35 s; `/tmp/008-c2-identity-final.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:owned` | **4 archivos / 40/40 PASS**, 201,85 s; `/tmp/008-c2-owned-close.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/owned/vitest.config.ts src/infrastructure/server/owned/corrections.contract.ts -t 'presupuesto tiene'` | **2/2 seleccionadas PASS**, 8,76 s; `/tmp/008-c2-budget-final.log`. Un caso por motor; diez casos no seleccionados ya pasaron en el gate completo. |
| Frontera de bundles | Sin coincidencias de símbolos privados de identidad/DB en renderer/preload/web/main; `/tmp/008-c2-bundle-boundaries.log`. |
| `git diff --check` | PASS; `/tmp/008-c2-diff-check.log`. Rama y versión verificadas sin escritura Git. |
| `python3 /tmp/ttrpg-auth-pg-run.py exec node /tmp/008-c2-audit.mjs` | **PostgreSQL 17.10; cero bases y cero conexiones de fixtures**; `/tmp/008-c2-cleanup.log`. Auditoría de solo lectura; servidor compartido activo. |

La comprobación dirigida de presupuesto añadió al final una aserción de `RESULT_TOO_LARGE` con rollback de la mutación previa, sin modificar implementación. La selección de dos casos es complementaria al gate completo de 40, no una omisión de motores. La suite general y los builds Electron/web se ejecutaron sobre las mismas superficies que entrega este cierre. Después solo cambiaron backend de retención/migración/presupuesto, contratos y documentación; se recompiló API con typecheck y se ejecutó el gate completo final. No se atribuye prueba manual visual a un build.

## Historial y límites

El ciclo 1 conserva su historial completo de fallos/correcciones en build-ciclo-1.md; la ronda 2 de código encontró el defecto paralelo remove+put que motivó el retrabajo. Aquí se elimina la capacidad de borrar definiciones y, además, se cierra la unidad ante cualquier fallo capturado y se revalida la integridad final.

- Primera pasada ciclo 2: **26/32**, 139,45 s (`/tmp/008-c2-owned-first.log`). Expectativas anteriores de operación admin/plantilla editable y CLI compilada desactualizada; se ajustaron a contrato vigente y recompiló.
- Primera ampliada: **37/40**, 176,12 s (`/tmp/008-c2-owned-expanded.log`). La publicación usaba placeholders fuera de orden incompatibles con la adaptación posicional SQLite 006; se ordenaron argumentos en esa query sin cambiar el driver. Se corrigieron fixtures con placeholder repetido y adquisición redundante de bloqueo.
- Pasada posterior: **40/40**, 197,90 s (`/tmp/008-c2-owned-stable.log`). Al ampliar el upgrade real apareció **38/40**, 179,52 s (`/tmp/008-c2-owned-final.log`): el lector local rechazaba una plantilla privada histórica cuyo ID coincide con uno incorporado. Se añadió un lector estricto de retención del servidor y se preservó la validación local. Repetición **40/40**, 203,43 s (`/tmp/008-c2-owned-complete.log`). El gate final de la tabla incluye además el presupuesto agregado concurrente; no se ocultaron fallos ni se aumentaron timeouts para hacerlos pasar.

- Gate DB de cierre inicial: **30/32**, 19,73 s (`/tmp/008-c2-db-close.log`). Las dos expectativas de texto de la CLI aún enumeraban migraciones 1–3; el comando compilado aplicaba correctamente 1–4. Se corrigió esa expectativa explícita y se repitió el gate completo, conservando la comprobación de segunda ejecución sin pendientes.

- Gate identidad inicial: **23/25**, 56,12 s (`/tmp/008-c2-identity-close.log`). La expectativa de migraciones pendientes al partir de esquema 1 seguía en `[2, 3]`; se actualizó a `[2, 3, 4]` y se repitió el gate completo, sin cambios de implementación ni relajación del rechazo de esquema pendiente.

Un proceso API por base; sin carga prolongada, escalado horizontal o proyector físico. Módulos compilados limitados a capacidades existentes; nuevas definiciones publicadas requieren nueva versión, también si evoluciona el contenido incorporado. Los borradores quedan fuera de transferencia operativa y deben republicarse explícitamente si se desean trasladar. El JSON portable no incluye por sí solo las definiciones externas.

No se ejecutó pg_dump/pg_restore de producción: el corte y respaldo integral PostgreSQL pertenecen a 011, y las herramientas temporales del ciclo 1 no están disponibles en este entorno. Sí se probaron respaldo/restauración del legado SQLite y transferencia funcional a PostgreSQL. No hay sincronización de escrituras posteriores al corte. Una respuesta de commit incierta exige verify/reintento idéntico y no autoriza borrar el destino por suposición.

Persisten avisos no fatales de canvas/jsdom, tamaño de chunks y de consultas concurrentes en pg 8; una actualización a pg 9 debe revisar su cola de consultas. Sin nueva inspección CUA porque no se cambiaron superficies visuales. No hay invitaciones, admisión de invitados, SSE, nuevas pantallas ni despliegue 011.

Código congelado para revisión. Las limpiezas de las suites terminaron y la auditoría final confirmó cero bases/conexiones PostgreSQL de fixtures; el servidor temporal compartido permanece disponible. Solo este build.md fue escrito por el constructor dentro del expediente, mediante temporal y renombrado atómico. Se espera al orquestador antes de correcciones adicionales.
