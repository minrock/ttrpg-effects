VEREDICTO: APROBADO

# Revisión de seguridad — 006, ciclo 1, ronda 2

Revisión independiente del constructor, 2026-10-29, en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se releyeron las instrucciones del perfil de seguridad y los requisitos aplicables de solicitud/spec; se inspeccionaron build actualizado, revision.md, huellas y fuentes reales. No se leyeron informes ajenos de ronda 2.

## Alcance y resultado

Sin hallazgos de seguridad demostrables pendientes en el cambio de esta ronda. Se aprueba la corrección del manejo de errores del cliente PostgreSQL adquirido y la orientación de setup para PostgreSQL, conservando los límites de 006.

La comparación de manifiestos identifica exactamente cinco archivos modificados y uno nuevo: `driver.ts`, `catalog.contract.ts`, `environment-setup.test.ts`, `scripts/setup-env.sh`, `docs/database.md` y el nuevo `test-fixtures/idle-timeout-probe.ts`. Se inspeccionaron estos seis archivos y su interacción con la unidad de trabajo y la implementación instalada de pg-pool. Las **548 huellas de ronda 2 coinciden** al iniciar y cerrar la revisión; no hay diferencias adicionales ni archivos eliminados frente a ronda 1.

## Corrección comprobada

- En `src/infrastructure/server/database/driver.ts:85`, cada préstamo mantiene listeners propios de error/end. Un error entre consultas marca la conexión como fallida sin registrar ni propagar el Error crudo del evento como excepción no controlada. Query comprueba esa marca antes y después del await; COMMIT usa la misma ruta y rechaza con CatalogError UNAVAILABLE.
- Release es idempotente, descarta el cliente fallido mediante `client.release(true)` y conserva el listener hasta end para cubrir errores tardíos. Para el cliente sano, retira los listeners del préstamo después de devolverlo. Se contrastó con pg-pool instalado: este repone su listener de cliente ocioso al liberar y retira del pool los clientes liberados con error. La protección de ambos estados no depende únicamente del listener global del pool.
- La unidad de trabajo mantiene una sola conexión y su camino de fallo/liberación. El timeout que cierra la sesión PostgreSQL revierte la transacción en el servidor; la corrección no afirma haber enviado con éxito un ROLLBACK sobre una conexión muerta. Una operación posterior obtiene otra conexión sin reutilizar la fallida. No se introducen reintentos de callbacks, nuevos privilegios ni cambios en SQL, propiedad, TLS, credenciales o timeouts.
- El fixture nuevo es un subproceso real: espera 11 s después de escribir dentro de una transacción, excediendo los 10 s configurados, y exige rechazo del COMMIT con código/mensaje sanitizados. Comprueba ausencia de la escritura fallida, una nueva transacción exitosa en la misma instancia, doble cierre y reapertura con un único registro recuperado. El padre exige salida 0, marcador fijo, ausencia de errores crudos y cero conexiones de la base propia. No usa mock del evento ni altera el servidor.
- Setup ahora dirige PostgreSQL a build/migraciones y explica el bloqueo transitorio. No recomienda arrancar la composición legada ni consultar claves globales en esa rama. Conserva configuración y secreto existentes, no crea almacenamiento SQLite y no añade DATABASE al archivo del cliente; las aserciones nuevas verifican estos puntos.

## Evidencia propia de esta ronda

| Ejecución | Resultado |
| --- | --- |
| `pnpm test:db`, con URL/CA temporales suministradas por el orquestador | **32 pruebas PASS**, 1 archivo, 19,45 s. Incluye timeout real del subproceso, contratos SQLite/PostgreSQL, TLS positivo/negativo, PG* adversas, comandos compilados y guard productivo. Log: `/tmp/006-seguridad-db-r2.log`. |
| `pnpm exec vitest run src/server/environment-setup.test.ts src/infrastructure/server/database/config.test.ts` | **22 pruebas PASS**, 2 archivos, 1,80 s; nueva orientación del setup y configuración/guard. |
| SHA-256 de `ronda-2/huellas.json` | **548 archivos, 0 diferencias** al inicio y cierre. |

La configuración privada temporal solo se utilizó para variables del subproceso; no se imprimieron sus valores ni se copiaron al repositorio. Los contratos crean bases UUID y directorios propios; terminaron con cleanup sin errores. La regresión comprueba además la ausencia de conexiones a su base antes de eliminarla. Se conservó activo el servidor del orquestador y no se accedió al checkout original ni a datos/env personales.

## Evidencia reutilizada y límites

Se reutiliza la inspección de seguridad de ronda 1 para los módulos sin cambios: ámbito ownerId/parametrización, validación de filas, migraciones y checksums, protección SQLite de rutas/sidecars/locks, configuración TLS, separación de secretos, guard productivo y fronteras Electron/IPC/CSP. Las diez comprobaciones adicionales de filesystem de aquella revisión no se repitieron porque ese código permanece idéntico. Su suite previa de 31 contratos no cubría el error asíncrono del cliente prestado; la nueva prueba real cierra específicamente esa carencia.

Typecheck, lint, suite general de 1198 pruebas y build API actualizado se atribuyen al constructor según build.md; no se presentan como ejecuciones propias. No se repitieron builds web/Electron ni CUA, cuyos módulos no cambiaron. No se certifican carga prolongada, despliegue remoto ni backup/restore PostgreSQL.

El callback consumidor debe terminar para que la unidad de trabajo complete limpieza; una Promise externa infinita no es cancelada por el evento de conexión. Este límite está documentado. El guard sigue impidiendo servicio completo PostgreSQL/production; ownerId no acredita identidad de cuenta. La aprobación no autoriza retirar ese guard ni implica entrega de 007–011.

Único archivo publicado: este informe mediante temporal y renombrado atómico. Sin modificaciones de implementación, Git, tablero, specs u otros informes.
