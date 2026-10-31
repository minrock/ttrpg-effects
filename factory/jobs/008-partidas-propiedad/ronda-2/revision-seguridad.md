VEREDICTO: APROBADO

Revisión independiente de seguridad de 008, ciclo 1, ronda 2, 2026-10-30. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama declarada `feature/factory-006-persistencia-multidb`. Se leyeron AGENTS.md, perfil seguridad, solicitud/spec/build, identidad de ronda y revisión de seguridad anterior. Se inspeccionaron las fuentes reales, incluidos archivos nuevos, contratos y diff pertinente. No se consultaron informes de otros revisores.

## Integridad y alcance

Comparación SHA256 al iniciar y antes de publicar: **586 archivos congelados, cero discrepancias**. Base de 565 archivos: 42 archivos nuevos/modificados propios de 008. Se revisaron catálogo y puertos autorizados, principal/revalidación, unidad transaccional y driver, registro de runtime, migración 3, registros/validadores, HTTP privado, escenas/enlaces, transferencia, CLI y documentación operativa. No hay cambios de esta entrega en renderer, preload o main que introduzcan APIs Electron privilegiadas.

## Cierre de los hallazgos anteriores

**Catálogo prestado con owner arbitrario: corregido.** En `src/infrastructure/server/owned/repository.ts:35–53`, owner, rol y sesión se capturan como valores al crear el puerto. Los cinco métodos del catálogo comparan el owner solicitado antes de invocar el repositorio global; el SQL utiliza el capturado. Recursos, assets, aperturas, operaciones y efectos exigen rol DM. Mutar el DTO recibido por el callback no convierte admin en DM ni cambia el dueño/patrocinador de una apertura. `authorized` conserva el preflight administrativo, pero este no obtiene capacidades funcionales. Las pruebas directas sobre ambos motores cubren create/find/list/update/delete cruzados, envoltorio, contexto falso, rol omitido/admin y DTO manipulado; B conserva sus datos.

**Publicación visible antes de commit: corregida.** `src/application/services/game-runtime.ts:18–32` clona y valida la preparación sin modificar el registro; registra revalidación de contexto y aplicación post-commit. `src/infrastructure/server/identity/index.ts:187–209` drena operaciones iniciadas, comprueba sus fallos, revalida contexto y principal y caduca el puerto. `src/infrastructure/server/identity/database.ts:54–98` ejecuta COMMIT antes de los efectos síncronos y mantiene la exclusión hasta terminarlos: cola compartida SQLite y advisory lock de sesión PostgreSQL. Fallos anteriores conservan el estado previo; un resultado de COMMIT incierto descarta el runtime afectado y la conexión PostgreSQL. Las regresiones reales cubren fallo tardío, revalidación fallida, archivo esperado y pendiente, error antes/después del COMMIT efectivo, orden publicación→archivo entre conexiones y rechazo de publicación posterior al archivo.

No quedan hallazgos de seguridad que requieran corrección dentro del alcance 008 revisado.

## Evidencia ejecutada por este revisor

`python3 /tmp/ttrpg-auth-pg-run.py test:owned`: **3 archivos, 32/32 pruebas PASS, 137,43 s, salida 0, sin skips**. Ejecutado contra el código congelado final, incluida la captura de autoridad añadida al final de la construcción. PostgreSQL real con TLS y SQLite físico, cuentas/principales reales y HTTP temporal; el runner suministró configuración privada sin imprimirla.

La suite cubre aislamiento de lectura/escritura/HEAD/resolve/export, revisión e idempotencia, revocación durante body, rollback tras await, enlaces multiescena, bytes/MIME, corrupción, lease/generación, restauración legada, migración entre motores y CLI compilada. Las inyecciones de COMMIT envuelven conexiones reales; no sustituyen el almacenamiento. También prueba cancelación SIGINT mientras espera exclusión PostgreSQL y recuperación de importación con respuesta de COMMIT perdida mediante la misma huella.

## Controles comprobados por inspección

- HTTP exige Host/Origin, principal DM vigente antes del body y dentro de la transacción, validadores estrictos y límites existentes. Owner no se acepta del body; errores ajenos no distinguen existencia. CSP, no-store y nosniff permanecen en la familia privada. Las cuentas nuevas no autorizan rutas legadas.
- Recursos y assets filtran por owner con SQL parametrizado y claves compuestas. Las aperturas verifican partida propia; FK compuesta impide patrocinador de otro owner. BLOB/bytea se comprueban por longitud y hash al leer. CAS, idempotencia y mutación comparten transacción.
- Transferencia requiere dueño explícito válido o mapa completo e inyectivo, destino funcional vacío, rutas físicas privadas y validación de archivos, tamaños, hashes, formatos y relaciones. No transporta credenciales ni ejecuta contenido. Respalda las tres bases y sidecars bajo exclusión del escritor; lee el respaldo mediante copia descartable.
- Los diagnósticos CLI no imprimen errores externos/URLs/SQL. Solo declaran rollback cuando fue confirmado antes de intentar COMMIT; la incertidumbre conserva una ruta de verificación/reintento. Exportadores inspeccionan relaciones y retiran el manifiesto de terminación cuando esa inspección falla.

## Límites y estado final

No se repitieron gates generales, DB/identidad completos, builds ni humo visual; sus resultados en build son evidencia del constructor, no de esta revisión. No se verificaron carga prolongada ni pg_dump/pg_restore productivo. El gate emitió el aviso conocido de consultas concurrentes en pg 8 y futura incompatibilidad pg 9, sin fallos.

La aceptación corresponde al backend 008 y a un proceso API por base. `allows` continúa siendo una comprobación interna, no autorización de invitados; credencial, lease, generación y streams se completan en 009/010. No se exige ni se certifica UI/corte productivo 011.

No se modificaron código, Git, tablero, specs, configuración privada ni datos originales. El gate terminó y cerró sus fixtures; PostgreSQL compartido permanece activo y la ventana de carga fue liberada. Única escritura del revisor en el checkout: este informe, publicado mediante archivo temporal y renombrado atómico.
