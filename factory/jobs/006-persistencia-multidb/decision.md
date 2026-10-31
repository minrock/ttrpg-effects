APROBAR

# Decisión técnica — 006 Persistencia común SQLite/PostgreSQL

Ciclo 1, ronda 2. Fecha: 2026-10-29. Se aprueba técnicamente la entrega 3.8.0 dentro del alcance de solicitud.md y spec.md. Las cuatro revisiones completas de la última ronda concluyen `VEREDICTO: APROBADO`; los dos hallazgos obligatorios de la primera ronda están corregidos y no queda una discrepancia técnica pendiente.

## Identidad y alcance revisado

Checkout exclusivo: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Identidad registrada y contrastada por los revisores: rama `feature/factory-006-persistencia-multidb`, base/HEAD `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`, con el prerrequisito 3.7.0 conservado. El aprobador comprobó directamente las **548 huellas SHA-256**, sin diferencias, y repitió la comprobación inmediatamente antes de publicar. Entre rondas hay exactamente cinco archivos modificados y un fixture nuevo, sin eliminaciones: driver, contrato DB, prueba de setup, script de setup, guía y subproceso de timeout. No hubo cambios posteriores de contenido en los archivos congelados.

Se leyeron AGENTS.md, perfil aprobador, solicitud/spec/build, revision.md completo y huellas de ronda 2, los cuatro informes completos de ambas rondas y las fuentes pertinentes. Se contrastaron driver, unidad de trabajo, puertos, repositorio, migraciones, configuración/guard, fixture real y mensajes/pruebas de setup. La versión de package.json es 3.8.0 y el changelog registra el cambio minor; el formato de escena continúa en v2.

La aprobación corresponde al catálogo y la infraestructura asíncrona equivalente SQLite/PostgreSQL, migraciones explícitas, configuración/TLS y protección de la transición. No atribuye autorización de cuentas a ownerId ni disponibilidad del servicio funcional completo PostgreSQL.

## Cierre de hallazgos

**C1/P1, cliente PostgreSQL adquirido: cerrado.** El préstamo mantiene listeners propios de error/end; invalida la conexión y comprueba ese estado antes/después de query. COMMIT no puede confirmar una conexión perdida. Release es idempotente y descarta el cliente fallido; la unidad de trabajo normaliza el fallo, recorre su limpieza y permite adquirir una nueva conexión. No se retiró el timeout ni se debilitó TLS.

La regresión inspeccionada ejecuta las fuentes actuales en un subproceso real, escribe dentro de una transacción y espera 11 segundos frente al límite de 10. Exige CatalogError UNAVAILABLE sanitizado, ausencia de la escritura fallida, nueva transacción exitosa en la misma instancia, doble cierre, reapertura y cero conexiones de su base al terminar. Constructor, seguridad y código ejecutaron el gate actualizado con resultado satisfactorio. Esto cierra la reproducción independiente anterior que terminaba Node antes del catch. La reversión tras perder la sesión ocurre en PostgreSQL; no se afirma que un socket cerrado haya ejecutado ROLLBACK.

**UX-006-01, siguiente paso del setup: cerrado.** Para PostgreSQL se indica construir API y ejecutar db:migrate, consultar la guía y respetar el bloqueo transitorio; desaparece la recomendación incompatible de arrancar el servicio legado o buscar claves globales. SQLite conserva su recorrido. Las pruebas ejecutan el script real y comprueban mensajes, archivos intactos, ausencia de secretos en salida y falta de almacenamiento SQLite/configuración DB en el cliente.

Seguridad mantiene la aprobación de propiedad parametrizada, migraciones, TLS, filesystem y secretos. UI acredita ausencia de cambios en superficies visuales; no sustituye una inspección visual por tests DOM ni exige pantallas excluidas de 006.

## Evidencia de aceptación

La matriz de build.md cubre los nueve criterios: fronteras, contrato común real por motor, transacciones/recursos, migraciones, configuración/TLS, guard antes de efectos, compatibilidad, operación reproducible y entrega. Las revisiones independientes no dejan criterios bloqueados.

Se corroboraron en los logs del constructor el build API corregido, **32 pruebas DB PASS**, **127 archivos/1198 pruebas generales PASS**, typecheck, lint y **22 pruebas dirigidas PASS**. Se comprobaron también los logs de builds Electron/web iniciales, reutilizados justificadamente porque la corrección no cambia sus grafos. El log propio de seguridad confirma nuevamente 32 pruebas DB PASS; código declara además su gate independiente, typecheck/lint y checks de formato correctos.

El gate cubre SQLite físico y PostgreSQL temporal 17.10 con TLS, comandos compilados, migraciones, guard y humo HTTP legado, sin skip verde. Las 22 dirigidas ya pertenecen a la suite general: no se suman para inflar la cobertura. Las ejecuciones se atribuyen a sus autores. El aprobador no repitió suites, no usó CUA, no abrió credenciales/servidor PostgreSQL y no ejecutó operaciones Git.

## Riesgos residuales y límites

El callback transaccional debe terminar: el driver no cancela una Promise externa infinita. Las operaciones raíz se serializan por instancia; no se certifica rendimiento prolongado ni transacciones distribuidas. Persisten los avisos conocidos de canvas/jsdom y bundler, sin fallos pendientes. No se ensayaron despliegue remoto, backup/restore PostgreSQL, todas las plataformas ni DMG; la guía distingue esos límites de la persistencia/rollback realmente probados.

El guard conserva la API global exclusivamente en local+sqlite. Cuentas, identidad autenticada, migración funcional de escenas/assets/bibliotecas y experiencia multiusuario son trabajo posterior. No se autoriza retirar el guard por esta decisión.

## Siguiente paso

El orquestador debe dejar 006 en **necesita-persona**, aprobado técnicamente y pendiente de autorización explícita para integrar. Esta decisión no autoriza staging, commits, push, merge, despliegue ni DMG. Los trabajos 007–011 permanecen especificados en cola; no se presentan como implementados ni se inician por esta decisión. Solo el orquestador actualiza el tablero.

Única salida del aprobador: este decision.md mediante temporal y renombrado atómico. No se modificaron código, Git, specs, otros informes, checkout original, entornos privados, datos ni procesos del usuario/orquestador.
