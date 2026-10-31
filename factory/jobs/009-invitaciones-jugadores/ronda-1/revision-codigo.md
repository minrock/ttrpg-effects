VEREDICTO: APROBADO

# Revisión de código009 — ciclo1, ronda1

Fecha: 2026-10-30. Revisión independiente del checkout canónico, versión3.11.0, con el producto congelado. Leídos perfil `.codex/agents/codigo.toml`, AGENTS.md, solicitud, spec vigente, coordinación, build y paquete de revisión. No se consultaron informes de otros revisores.

## Alcance y resultado

Se contrastaron los 37 archivos propios009 identificados por `base-archivos.json` y `huellas.json`, las fuentes reales nuevas/modificadas y sus dependencias de identidad, unidad de trabajo, propiedad, catálogo y transporte HTTP. Comparación SHA256 antes y al cerrar: **0 discrepancias** con las huellas congeladas. Sin cambios de producto, Git, tablero, servicios ni configuraciones originales.

No encontré hallazgos bloqueantes reproducibles dentro del alcance009. No solicito correcciones ni capacidades reservadas a010/011.

- **Contratos y CAS:** start/reopen comparan la última apertura completa dentro de la unidad, además de la revisión de partida. Rotación compara versión de invitación y revisión/contexto de apertura. El heartbeat conserva revisión/versiones y no permite revivir un lease vencido. El ámbito de replay conserva la apertura esperada original; el replay se resuelve antes de aplicar CAS de una operación nueva.
- **Secretos e idempotencia:** la generación usa32 bytes CSPRNG; los verificadores separan dominios y contexto. El resultado de `tx.operation` solo recibe metadatos. La URL efímera se añade después de que `identity.authorized` confirme; los replays no recuperan secretos. Admisión mantiene su presupuesto propio y prueba la cookie antes de recuperar identidad; sin ella no entrega token ni datos del participante anterior.
- **Autoridad y atomicidad:** la capacidad invitada comparte `identityDatabase` y su exclusión SQLite/lock PostgreSQL con identidad/propiedad. No presta OwnedTransaction ni SQL. Captura contexto, caduca puertos, drena operaciones iniciadas y recuerda rechazos incluso falsy/capturados. La admisión revalida invitación, presencia y principal antes de confirmar. La incertidumbre del COMMIT no entrega éxito ni token y descarta presencia.
- **Ciclo de vida:** disable cierra aperturas en la misma unidad; archive/delete conservan invalidación por los casos de uso008. Sesión patrocinadora revocada exige contacto nuevo; restart no crea presencia ni otra gracia. Rotación conserva credenciales admitidas y reapertura cambia generación. Las credenciales tienen vencimiento absoluto y alcance persistido por partida/apertura.
- **Persistencia y compatibilidad:** migración5 agrega FK compuestas y restricciones sin reescribir migraciones históricas. La lectura mantiene SystemRef/publicación/hash exactos, incluidos usos retenidos deshabilitados, sin habilitar nuevas instancias. La transferencia funcional excluye acceso invitado y la invalidación de una copia restaurada es explícita. `.ttrpgscene` v2/lector v1, render y fronteras Electron permanecen fuera de los cambios. No se agregaron dependencias; TypeScript sigue estricto. Versión3.11.0 y changelog feature fechado concuerdan.
- **Composición y recursos:** las rutas009 se montan junto a identidad sin conectar invitados con la mesa global. El backend aislado permite contratos PostgreSQL sin ServiceStore. Se conservan guards productivos. Servidores, pools y capacidades cuentan con cierre; el fragmento se limpia antes de peticiones y solo se conserva en memoria para011.

## Verificación propia

Entorno propio observado: Node24.15.0 y pnpm11.1.2. Se usó el wrapper autorizado únicamente para satisfacer la configuración que exige cargar las fixtures comunes; los filtros seleccionaron exclusivamente SQLite y no abrieron PostgreSQL.

1. `python3 /tmp/ttrpg-auth-pg-run.py test:invitations --testNamePattern='(Adversarial009 sqlite|Invitaciones reales sqlite|Bordes009 sqlite)'`: **14/14 seleccionados PASS**, exit0,60.07s. Abarca CAS, replay, rotación/cierre/reapertura/disable frente a admisión, cupo concurrente, deadline tras bloqueo, rechazo falsy/capturado y sin await, puerto escapado, DTO mutado, COMMIT incierto, versiones retenidas, HTTP/cookies/cuotas y cuerpo lento/chunked. Los22 casos restantes fueron excluidos deliberadamente por filtro; no constituyen prueba propia PostgreSQL.
2. `python3 /tmp/ttrpg-auth-pg-run.py test:invitations --testNamePattern='artefacto compilado009 y pnpm db:migrate sqlite'`: **1/1 seleccionado PASS**, exit0,5.59s. Ejecuta el artefacto compilado y comandos reales de migración e invalidación sobre fixture propia: emitir/canjear/rotar/rechazar enlace viejo/admitir enlace nuevo/conservar invitado previo/cerrar. Los35 casos restantes fueron excluidos deliberadamente.

Son **15 casos distintos** de verificación dirigida, sin sumar como nuevos los escenarios internos ni las pasadas del constructor. Las limpiezas afterEach terminaron y los procesos Vitest salieron correctamente. No se reejecutaron gates generales por rutina ni se modificó el código congelado para verificarlo.

## Evidencia atribuida y límites

Se inspeccionaron los contratos y se corroboraron los resúmenes de logs del constructor citados en build.md: `test:invitations`36/36 (18 por motor), `test:owned`46/46, `test:identity`25/25 y `test:db`32/32. Son resultados **del constructor**, sobre ambos motores reales y sin skips en su pasada completa; no se presentan como ejecuciones propias. Typecheck/lint/test general/builds se atribuyen igualmente a su entrega. Las fuentes de los contratos comprueban barreras y resultados persistidos reales, no emulan PostgreSQL.

No se hizo despliegue, DMG, benchmark prolongado, prueba visual ni certificación de backup PostgreSQL productivo. La advertencia de pg8 sobre consultas concurrentes es una limitación de actualización a pg9 ya documentada, no un fallo observado de este gate. UI/corte011 y proyección/moderación/SSE010 permanecen pendientes por diseño. Esta aprobación es técnica de código009 y no autoriza commit, merge ni publicación.
