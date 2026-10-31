VEREDICTO: CAMBIOS

Revisión independiente de código008, ciclo1, ronda1. Fecha: 2026-10-30. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Identidad: `base-archivos.json`, `ronda-1/revision.md` y `ronda-1/huellas.json`; comprobación SHA256 final sin diferencias. No se leyeron informes de otros revisores.

## Alcance

Se revisaron solicitud/spec/build, AGENTS, perfil de código, modelo común, implementación de catálogo/propiedad/HTTP, unidad autenticada, transacciones, revisiones/idempotencia, aperturas/runtime preparado, migración/transferencia, pruebas y documentación afectadas. Se mantuvo el límite008: sin exigir UI011, invitaciones009, SSE/moderación010 ni despliegue productivo. La versión3.10.0 y changelog corresponden al incremento minor; no cambia el formato portablev2.

Las rutas HTTP derivan el propietario del principal y las escrituras comparten transacción con su revalidación. Los extremos de enlaces usan revisión y las operaciones de archivo/borrado invalidan aperturas en esa unidad. La serialización global heredada de007 explica la exclusión entre conexiones; no se confunde con escalado horizontal. El guard productivo legado sigue explícito.

## Hallazgo requerido

### P2 — El borrado de una plantilla deja un estado que las propias escrituras y migraciones rechazan

**Localización:** `src/infrastructure/server/owned/repository.ts:73–76`, invocado sin comprobación de dependencias desde `src/server/owned-http.ts:89`. La contradicción se manifiesta en `repository.ts:56` y `src/infrastructure/server/owned/transfer.ts:186`.

El repositorio permite eliminar una plantilla personal que todavía figura como `templateId` en un monstruo del mismo propietario. El DELETE se confirma correctamente, pero desde ese momento editar cualquier otro campo del monstruo manteniendo su referencia devuelve `NOT_FOUND`. Además, `exportOwned` genera y da por terminado un paquete que `inspectTransfer` y por tanto `importTransfer` rechazan como `CORRUPT`, porque la plantilla referenciada ya no está. Una operación pública válida deja así datos que no pueden seguir el flujo de edición/migración prometido por008.

**Reproducción ejecutada:** mediante los módulos reales cargados con Vite SSR, SQLite físico temporal migrado y un propietario DM de fixture, en transacciones separadas:

1. Guardar plantilla personal T con revisión0.
2. Guardar monstruo M con `templateId=T.id`, revisión0.
3. Ejecutar `resources.remove("templates", T.id, 1)`; confirma.
4. Ejecutar `resources.put("monsters", {...M, name:"Renamed"}, 1)`; falla `NOT_FOUND`.
5. Ejecutar `exportOwned` y después `inspectTransfer` sobre el paquete recién creado; el primero devuelve un manifiesto con un registro y el segundo falla `CORRUPT`.

Salida observada: `delete accepted`, `edit rejected NOT_FOUND`, `export records 1`, `inspect rejected CORRUPT`. No se inyectó corrupción SQL en recursos: plantilla, monstruo y borrado usaron sus métodos públicos de repositorio, los mismos llamados por las rutas. Esta reproducción no sustituye un test HTTP autenticado; el vínculo con HTTP se verificó estáticamente. Una reproducción adicional con `ServiceStore.saveUserTemplate`, `monsters.save`, `deleteUserTemplate`, respaldo y `exportLegacy` también produjo un paquete que su inspector rechaza, mostrando que la relación ausente puede existir legítimamente en datos históricos.

**Corrección esperada:** definir y aplicar una política consistente en la transacción de borrado: rechazar con conflicto recuperable mientras haya referencias propias, o actualizar esas referencias de forma explícita y atómica con revisiones coherentes. No dejar que un DELETE exitoso convierta el catálogo en datos que el importador considera corruptos. Para legado, documentar/validar previamente la reparación necesaria o definir el tratamiento de referencias ausentes; no presentar como transferible un paquete que necesariamente falla la inspección siguiente. Añadir regresión del ciclo plantilla→monstruo→borrado→edición/exportación/importación en ambos motores y verificar que no afecta a otro owner.

Afecta integridad de bibliotecas y aceptación A9/A11; no requiere anticipar009–011.

## Verificaciones

- `python3 /tmp/ttrpg-auth-pg-run.py test:db`: **32/32 PASS**,20,72s. Evidencia propia: `/tmp/008-review-codigo-db.log`.
- `python3 /tmp/ttrpg-auth-pg-run.py test:identity`: primer intento **24/25 PASS**,54,05s; fallo al establecer conexión SSL durante `afterEach`, al abrir el pool para `DROP DATABASE` en `identity.contract.ts:38`, no en una aserción funcional. Evidencia: `/tmp/008-review-codigo-identity.log`.
- Repetición de `test:identity`, coordinada con el orquestador: **25/25 PASS**,53,85s. Evidencia: `/tmp/008-review-codigo-identity-retry.log`. Se conservó el fallo inicial; no se afirma haber identificado su causa definitiva.
- Dos reproducciones dirigidas anteriores: defecto confirmado con SQLite real y módulos de producto, sin modificaciones de código. Se cerraron las unidades/servidores Vite propios y se retiraron los directorios temporales propios.
- Huellas de producto/documentación de ronda1: **sin diferencias** después de inspección y pruebas.

## Limitaciones y cierre

No se repitió `test:owned`: el orquestador comunicó que el revisor de seguridad acababa de ejecutarlo; su resultado no se presenta como evidencia propia. Se leyeron sus contratos, que cubren aislamiento, CAS, leases y migración de fixtures completas, pero no el ciclo de borrado de plantilla referenciada. Los builds, suite general, lint y typecheck se contrastaron con el build entregado, sin volver a ejecutarlos; no se realizó CUA porque no cambió UI.

El primer intento de identidad puede haber dejado su base temporal al fallar el DROP. Se avisó al orquestador: el log no identifica su UUID y no se borraron bases por prefijo sin atribución. El reintento terminó normalmente. No se detuvo PostgreSQL ni se tocaron env/datos originales, código, Git, tablero, spec o informes ajenos. Única publicación del revisor: este informe mediante temporal y renombrado atómico.
