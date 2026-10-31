# Build 008 — Catálogo administrado y definiciones retenidas

**Ciclo 2, corrección de ronda global 3, 2026-10-30. Versión 3.10.0, sin otro bump.** Preparada para ronda global 4, segunda del ciclo 2. Se leyeron las cuatro revisiones completas: Seguridad y Código solicitaron cambios; UX/UI aprobaron su alcance. Este informe no constituye aprobación técnica ni permiso de integración. [build-ronda-3.md](build-ronda-3.md) conserva la entrega revisada y sus evidencias. El historial anterior permanece en [build-ciclo-1.md](build-ciclo-1.md); sus permisos de editar/borrar plantillas personales no describen el servicio actual.

Checkout canónico `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama conservada `feature/factory-006-persistencia-multidb`. Sin operaciones de escritura Git, cambio de rama, despliegue, DMG o modificaciones al entorno/datos originales. Sin subagentes ni nuevas dependencias. PostgreSQL temporal compartido sigue activo.

## Correcciones de ronda 3

| Hallazgo | Corrección y regresión real |
| --- | --- |
| Seguridad/Código: presentación nueva válida impedía exportar | Se retiró la comprobación heredada por ID privado/incorporado; la integridad se valida mediante el binding y sistema/version/presentación exactos. Se mantiene la derivación explícita histórica y el rechazo de referencias ausentes. Roundtrip de una presentación con ID nuevo, Markdown/CSS propios, monstruo y vínculo de partida: habilitado en paquete v2 y deshabilitado en paquete v3, export/inspect/import/verify y lectura autorizada en ambos motores. |
| Seguridad: rechazo falsy capturado permitía commit | `IdentityService.authorized` conserva marca de rechazo irreversible y primer motivo independientemente de su valor; registra también lanzamientos síncronos. Se normaliza de forma segura al salir de la unidad. Cinco motivos (undefined/null/false/0/cadena vacía) × catch/allSettled/sin await, más ambos órdenes al mezclar un error tipado y uno falsy. Se comprueban cero partidas y cero resultados idempotentes confirmados, en ambos motores. |
| Código: catálogo admitido excedía el manifiesto | Nuevo paquete operativo v3: descriptor fijo de catálogo en manifest, `catalog.jsonl` con una cabecera por versión, una línea por presentación y enlaces. Cada línea tiene cota de 10 MiB y el archivo se verifica por bytes/conteo/SHA256; se reconstruye una versión a la vez. Así una versión mayor de 10 MiB y el crecimiento acumulado no ocupan el manifiesto. Se conservan lectores v1 y v2 anteriores. Fixture real: nueve presentaciones con Markdown de 1000000 caracteres y CSS de 200000 cada una (10,8 MB), más tres versiones de 400000 caracteres; roundtrip, hashes, symlink/línea excesiva rechazados y modificación tardía que revierte toda la importación. |

El cambio de versión corresponde exclusivamente al paquete de operación. `.ttrpgscene` permanece en v2 y la aplicación en 3.10.0. No se limita silenciosamente la publicación existente ni se incrementa el límite del manifiesto para acomodar un ejemplo. El catálogo recorre el archivo en streaming sin cota agregada de 1 MiB/1 GiB, conserva conteos/longitudes de enteros seguros y depende de capacidad de disco/tiempo; cada versión y presentación sigue validada por los límites de su esquema. Los recursos privados mantienen sus límites anteriores. La integridad del catálogo se revalida también antes de COMMIT.

Delta de esta corrección: `identity/index.ts`, `owned/transfer.ts`, nuevo `owned/transfer-catalog.ts`, nuevo `owned/revision-3.contract.ts`, fixtures y adaptación de `systems.contract.ts` para producir paquetes históricos v1/v2 reales. README, docs/owned-data.md y changelog actualizados. Sin cambios de esquema DB, UI, driver006 o módulos visuales.

## Resultado y contratos

- Catálogo compartido separado del contenido privado: admin crea sistemas y borradores, publica versiones inmutables y cambia disponibilidad con CAS/idempotencia. Fechas de creación/publicación son del servidor. No existe borrado de definiciones en el puerto de producto. DM no lee borradores; admin no adquiere capacidad sobre juegos/recursos/assets/aperturas/efectos privados.
- Registro compilado y cerrado de módulos, esquema declarativo estricto y presentaciones Markdown/CSS existentes. Perfiles genérico y D&D 5.5 reutilizan medición y plantillas actuales; no se implementa un reglamento completo ni carga dinámica. Hash/version exactos y configuración resuelta separan reglas, datos y presentación, sin cambiar cámara, escala o diagonalMode de la escena.
- Las altas de partidas requieren `systemRef` explícito e inmutable. Recursos tipados guardan bindings externos a `.ttrpgscene`; un vínculo persistido recurso–partida valida owner y versión exacta. Una fila/monstruo embebido previo puede editarse con su referencia deshabilitada; copiar, insertar otro ID, añadir/cambiar binding o crear vínculo es nuevo uso y requiere disponibilidad. Las definiciones privadas históricas se retienen por owner/ID/version/hash, nunca se publican automáticamente ni se ofrecen para nuevas altas.
- La unidad autorizada registra el método completo, captura argumentos y autoridad, drena operaciones incluso no esperadas y rechaza toda la unidad ante fallos capturados. Revalida referencias, disponibilidad, contexto y presupuesto de idempotencia contra el estado final. Se conservan exclusión entre conexiones, CAS y efectos síncronos después de COMMIT; un resultado incierto descarta el runtime afectado.
- Migración 4 conserva las migraciones 1–3 y materializa catálogo/bindings/retención/enlaces. Upgrade real desde esquema 3, lectura en lotes y aborto transaccional ante referencias corruptas. La plantilla privada prevalece ante una colisión histórica con ID incorporado, sin cambiar el lector/editor de Electron local. Partidas antiguas reciben perfil genérico sin inferencia a partir de nombres ni etiquetas libres.
- Paquete operativo v3 incluye publicaciones, disponibilidad, fechas/hashes, bindings, referencias de partidas y vínculos. Lectores explícitos v1/v2 para legado y datos ya privados. Restauración completa solo por operador, destino funcional vacío y seeds compatibles; restaura instancias deshabilitadas sin habilitarlas. Borradores administrativos no se exportan. Las referencias ausentes no se sustituyen por la última versión.

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
| A6 — Concurrencia | Barreras explícitas bajo unidad adquirida para ambos órdenes entre dos conexiones (crear/deshabilitar y editar/deshabilitar). Ambos órdenes dentro de Promise.all, habilitar→crear→deshabilitar, CAS/publicación concurrente y remove+put histórico. Catch/Promise.allSettled/unawaited, incluso con motivos falsy, y DTO mutado no permiten confirmación parcial. |
| A7 — Idempotencia/revocación | Replay tras reinicio y después de deshabilitar, contenido distinto, límites/retryAt/recuperación por reloj. Barrera de dos operaciones partiendo de 999 resultados impide confirmar 1001. Revocación durante body del administrador y controles privados anteriores conservados. |
| A8 — Runtime | Suite conservada de lease/generación/contextos y fallos tardíos/COMMIT incierto, más publicación nueva que exige recurso persistido y valida sistema sin modificar viewport. No acredita invitados/SSE. |
| A9 — Motores | Contratos idénticos sobre SQLite físico y PostgreSQL 17.10 TLS real: esquema vacío/upgrade 3→4, rollback de upgrade fallido y reparación explícita, checksums/reapertura, JSON/fechas/nulls/Unicode/BLOB/bytea/constraints. Sin skips ni simulador PG. |
| A10 — Transferencia | Fixtures completas legado→SQLite/PG y privado SQLite dos owners→PG. Formatos 1, 2 y 3, catálogo deshabilitado, seeds coincidentes/conflictivas, referencias privadas, hashes, vínculos de escena, datos incompletos/destino ocupado. Cancelación SIGINT/exit 130, fallo tardío, commit incierto/replay/verify y retorno desde respaldo conservados; CLI compilada ejecutada. |
| A11 — Compatibilidad | 1201 pruebas generales, medición/escenas v1/v2/bibliotecas y builds Electron/web. Lector especial de definiciones retenidas en servidor conserva aparte la política editable local. Sin UI 011 ni humo visual nuevo. |
| A12 — Entrega | Contratos/CLI/migración/límites documentados, changelog 3.10.0, gates siguientes y publicación atómica de este informe. Sin Git write ni datos personales. |

Los 32 contratos anteriores se mantienen/adaptan a la política actual; no se presentan como evidencia nueva de catálogo. `systems.contract.ts` añade ocho casos parametrizados (cuatro por motor) con las matrices HTTP, frontera directa, concurrencia y migración descritas. `revision-3.contract.ts` añade seis casos (tres por motor) para los tres hallazgos de ronda 3. Las inyecciones de fallo envuelven conexiones reales y verifican filas reales; no sustituyen PostgreSQL.

## Verificación

Node 24.15.0, pnpm 11.1.2, SQLite 3.51.3, pg 8.23.1; PostgreSQL 17.10 con TLS verificado por wrapper privado. El wrapper configura variables sin imprimir secretos. Todos los comandos siguientes terminaron con exit 0; los tres gates de integración ejecutaron ambos motores sin skips.

| Comando | Resultado actual (exit 0) y log |
| --- | --- |
| `pnpm typecheck` | PASS; `/tmp/008-r4-typecheck-tests.log`. Los tres builds repitieron typecheck sobre las fuentes finales. |
| `pnpm lint` | PASS; `/tmp/008-r4-lint.log`. |
| `pnpm test` | **128 archivos / 1201 PASS**, 12,98 s; `/tmp/008-r4-general.log`. |
| `pnpm build` | PASS; `/tmp/008-r4-build-electron.log`. |
| `pnpm build:web` | PASS; `/tmp/008-r4-build-web.log`. |
| `pnpm build:api` | PASS, incluida CLI compilada; `/tmp/008-r4-build-api.log`. No hubo cambios posteriores de implementación. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:owned` | **5 archivos / 46/46 PASS**, 256,33 s; `/tmp/008-r4-owned-final.log`. SQLite y PostgreSQL real, sin skips. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:identity` | **25/25 PASS**, 56,18 s; `/tmp/008-r4-identity.log`. Ambos motores. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:db` | **32/32 PASS**, 20,17 s; `/tmp/008-r4-db.log`. Ambos motores. |
| `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/owned/vitest.config.ts src/infrastructure/server/owned/revision-3.contract.ts` | **6/6 PASS**, 55,00 s; `/tmp/008-r4-regressions-first.log`. Primera pasada dedicada, sin skips. |
| Frontera de bundles | Sin símbolos privados de catálogo/identidad/DB en renderer/preload/web/main; `/tmp/008-r4-bundle-boundaries.log` vacío. |
| `git diff --check` | PASS; `/tmp/008-r4-diff-check.log` vacío. |
| `python3 /tmp/ttrpg-auth-pg-run.py exec node /tmp/008-c2-audit.mjs` | PostgreSQL **17.10**, **cero bases/cero conexiones de fixtures**; `/tmp/008-r4-cleanup.log`. Lectura real posterior a todos los gates SQL, sin detener el servidor. |

No hubo fallos intermedios en los gates de esta corrección. Después de la ejecución dedicada se ejecutó la suite completa; los casos de ciclo 1, catálogo inicial y correcciones nuevas mantienen atribuciones separadas. No se presenta un build como prueba visual manual.

## Historial y límites

El ciclo 1 conserva su historial completo de fallos/correcciones en build-ciclo-1.md; la ronda 2 de código encontró el defecto paralelo remove+put que motivó el retrabajo. Aquí se elimina la capacidad de borrar definiciones y, además, se cierra la unidad ante cualquier fallo capturado y se revalida la integridad final.

- Primera pasada ciclo 2: **26/32**, 139,45 s (`/tmp/008-c2-owned-first.log`). Expectativas anteriores de operación admin/plantilla editable y CLI compilada desactualizada; se ajustaron a contrato vigente y recompiló.
- Primera ampliada: **37/40**, 176,12 s (`/tmp/008-c2-owned-expanded.log`). La publicación usaba placeholders fuera de orden incompatibles con la adaptación posicional SQLite 006; se ordenaron argumentos en esa query sin cambiar el driver. Se corrigieron fixtures con placeholder repetido y adquisición redundante de bloqueo.
- Pasada posterior: **40/40**, 197,90 s (`/tmp/008-c2-owned-stable.log`). Al ampliar el upgrade real apareció **38/40**, 179,52 s (`/tmp/008-c2-owned-final.log`): el lector local rechazaba una plantilla privada histórica cuyo ID coincide con uno incorporado. Se añadió un lector estricto de retención del servidor y se preservó la validación local. Repetición **40/40**, 203,43 s (`/tmp/008-c2-owned-complete.log`). El gate completo de aquella entrega incluyó además el presupuesto agregado concurrente; no se ocultaron fallos ni se aumentaron timeouts para hacerlos pasar.

- Gate DB de cierre inicial: **30/32**, 19,73 s (`/tmp/008-c2-db-close.log`). Las dos expectativas de texto de la CLI aún enumeraban migraciones 1–3; el comando compilado aplicaba correctamente 1–4. Se corrigió esa expectativa explícita y se repitió el gate completo, conservando la comprobación de segunda ejecución sin pendientes.

- Gate identidad inicial: **23/25**, 56,12 s (`/tmp/008-c2-identity-close.log`). La expectativa de migraciones pendientes al partir de esquema 1 seguía en `[2, 3]`; se actualizó a `[2, 3, 4]` y se repitió el gate completo, sin cambios de implementación ni relajación del rechazo de esquema pendiente.

Los gates verdes anteriores no cubrían los tres casos reproducidos por los revisores de ronda 3. Sus informes se conservan intactos; esta corrección y sus regresiones se registran separadamente arriba.

Un proceso API por base; sin carga prolongada, escalado horizontal o proyector físico. Módulos compilados limitados a capacidades existentes; nuevas definiciones publicadas requieren nueva versión, también si evoluciona el contenido incorporado. Los borradores quedan fuera de transferencia operativa y deben republicarse explícitamente si se desean trasladar. El JSON portable no incluye por sí solo las definiciones externas.

No se ejecutó pg_dump/pg_restore de producción: el corte y respaldo integral PostgreSQL pertenecen a 011, y las herramientas temporales del ciclo 1 no están disponibles en este entorno. Sí se probaron respaldo/restauración del legado SQLite y transferencia funcional a PostgreSQL. No hay sincronización de escrituras posteriores al corte. Una respuesta de commit incierta exige verify/reintento idéntico y no autoriza borrar el destino por suposición.

Persisten avisos no fatales de canvas/jsdom, tamaño de chunks y de consultas concurrentes en pg 8; una actualización a pg 9 debe revisar su cola de consultas. Sin nueva inspección CUA porque no se cambiaron superficies visuales. No hay invitaciones, admisión de invitados, SSE, nuevas pantallas ni despliegue 011.

Código congelado para revisión. Las limpiezas de las suites terminaron y la auditoría final confirmó cero bases/conexiones PostgreSQL de fixtures; el servidor temporal compartido permanece disponible. Solo este build.md fue escrito por el constructor dentro del expediente, mediante temporal y renombrado atómico. Se espera al orquestador antes de correcciones adicionales.
