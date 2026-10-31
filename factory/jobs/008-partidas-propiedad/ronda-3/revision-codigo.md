VEREDICTO: CAMBIOS

## Alcance

Revisión independiente de código del ciclo 2, ronda global 3, sobre el checkout canónico y sus fuentes reales. Se contrastaron solicitud, retrabajo autorizado, spec/build finales, perfil de código, identidad de revisión y huellas. Las 591 huellas registradas coinciden con los archivos actuales. No se leyeron informes ajenos.

Se revisaron catálogo administrado y versiones retenidas, referencias de partida/recursos, política de disponibilidad, atomicidad y operaciones pendientes, CAS/idempotencia, efectos posteriores al commit, migración 4 y compatibilidad, transferencia y CLI, contratos y errores tipados. La revisión respeta los límites de 008: no exige pantallas de 011, invitados de 009/010 ni plugins externos.

El cambio de política resuelve el caso anterior de eliminación concurrente de plantillas: los puertos rechazan put/remove de plantillas personales y el seguimiento comprende los métodos completos y sus rechazos. La retención y los controles finales son coherentes con ese nuevo alcance. Sin embargo, la transferencia conserva una validación antigua incompatible con el catálogo nuevo y sus límites no permiten exportar todos los estados admitidos por publicación.

## Hallazgos

### CÓDIGO-008-C2-01 — P1: una presentación nueva válida bloquea la exportación del dataset

**Archivo/línea:** `src/infrastructure/server/owned/transfer.ts:255–256` (recogida en 233; validación correcta de bindings en 219–228).

Después de validar el binding de catálogo y encontrar su presentación en la versión incluida en el paquete, `inspectTransfer` vuelve a comprobar el `templateId` de cada monstruo exclusivamente contra las plantillas personales y el arreglo histórico `builtInMonsterTemplates`. Una presentación publicada con un ID nuevo no pertenece a ninguno y se rechaza con `TEMPLATE_MISSING`, aunque el catálogo y el monstruo sean íntegros. `exportOwned` invoca ese inspector y elimina el manifiesto al fallar; `importTransfer` también depende de él.

**Reproducción propia, SQLite real y sesiones reales:** migrar una DB temporal vacía; bootstrap/cambio de contraseña de admin y alta/cambio de contraseña de DM. Mediante `IdentityService.authorized`, crear `custom`, guardar/publicar `custom@1` con una definición D&D válida y una presentación cuyo ID es `custom-card`; guardar un monstruo del DM con `templateId: custom-card` y binding `{scope: catalog, systemId: custom, version: 1, templateId: custom-card}`. La escritura confirma y `systems.definition` devuelve `custom-card`. Al ejecutar `exportOwned(config, nuevoDirectorio)`, resultado observado:

```text
custom catalog/monster saved; definition resolved custom-card
EXPORT FAILED Error TEMPLATE_MISSING Un monstruo referencia una plantilla ausente...
```

No se modificaron datos directamente para provocar el caso. Un ID de presentación propio es admitido expresamente por el esquema de publicación. Afecta el respaldo/movimiento completo de cualquier instalación que use ese camino normal, incluida una definición posteriormente deshabilitada, y contradice la exportabilidad de A5/A6/A9.

**Corrección esperada:** resolver la integridad por el binding y la definición exacta transportada; limitar cualquier comprobación histórica al camino de compatibilidad que realmente la necesite, manteniendo el rechazo de referencias ausentes. Agregar un roundtrip owned con una presentación cuyo ID no exista en los built-ins ni en plantillas privadas, tanto habilitada como deshabilitada. Las pruebas actuales clonan los IDs incorporados y por eso no cubren este caso.

### CÓDIGO-008-C2-02 — P2: publicación admite definiciones que el manifiesto no puede transportar

**Archivos/líneas:** `src/infrastructure/server/owned/transfer.ts:166–173,177,199`; `src/domain/systems/system-catalog.ts:16–22`.

El catálogo completo de versiones publicadas se incrusta en `manifest.json`, pero las dos lecturas del manifiesto lo limitan a 1 MiB. El esquema permite hasta 1.000.000 caracteres de Markdown más 200.000 de CSS por presentación y hasta 100 presentaciones por versión; tampoco existe un presupuesto acumulado de catálogo que preserve ese límite de transferencia. Basta una publicación permitida para superar el máximo. La acumulación de versiones pequeñas produce el mismo problema y la política de retención impide resolverlo eliminando publicaciones.

**Reproducción propia:** en la misma DB temporal, eliminar el monstruo del primer caso por el puerto permitido, de modo que el primer fallo ya no intervenga. Publicar `custom@2` con una única presentación válida que contiene `markdown: "m".repeat(1000000)` y `css: "c".repeat(100000)`. Ambos puertos confirman la publicación. La siguiente exportación, sin monstruos, falla:

```text
large published definition accepted
LARGE EXPORT FAILED Error VALIDATION Los datos o la revisión no son válidos.
```

El catálogo por sí solo supera 1 MiB; no hay corrupción ni referencias pendientes. Documentar el límite del manifiesto no basta si la aplicación acepta y conserva estados que después no puede respaldar.

**Corrección esperada:** hacer compatibles los límites de escritura y transferencia, preferiblemente transportando las definiciones en registros/piezas limitadas y verificadas sin concentrar todo el catálogo en un manifiesto de tamaño fijo. Si se eligen presupuestos de catálogo, deben ser coherentes, explícitos y comprobados antes del commit, incluyendo el crecimiento acumulado y los estados ya aceptados. Probar una definición en el borde permitido y varias versiones cuyo total cruza 1 MiB; exportación, inspección, importación y verificación deben completar o la publicación debe rechazarse antes de persistir con un error específico y recuperable.

## Verificaciones y límites

- `pnpm typecheck`: PASS, exit 0 en esta ronda.
- `pnpm lint`: PASS, exit 0 en esta ronda.
- Dos reproducciones independientes sobre el código TypeScript real cargado mediante Vite SSR, Node 24.15.0, SQLite temporal, migraciones reales, Better Auth y puertos autorizados reales: fallos descritos confirmados. Se cerraron conexiones/Vite y eliminaron exclusivamente los directorios temporales propios en `finally`.
- Comparación SHA-256 de las 591 entradas de `ronda-3/huellas.json`: sin discrepancias.
- Se inspeccionaron los contratos nuevos de catálogo/retención/concurrencia/transferencia y las evidencias atribuidas al constructor en `build.md`. No se presentan esos resultados como ejecución propia.
- No se repitieron los gates completos PostgreSQL, owned, identity ni builds en esta revisión. Los dos defectos confirmados están en validación y formato de transferencia comunes a ambos motores; no dependen de diferencias SQL. Se coordinó con el orquestador y no se ocupó PostgreSQL compartido.
- Sin cambios de código, Git, configuración privada, datos originales, tablero ni informes ajenos. Única salida: este informe, publicado por temporal y renombrado.

Ambos hallazgos requieren corrección y regresiones de transferencia antes de aprobar 008.
